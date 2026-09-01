"""
Lightweight segmentation and localization models for the DR screening pipeline.

All models use MobileNetV3-Small as the encoder backbone:
  - ~2.5M params, ONNX-exportable, GPU Coder-compatible
  - Justified over MobileNetV3-Large: vessel/lesion segmentation at 512px
    doesn't need the extra capacity, and the Small variant keeps the
    compiled binary under 15MB for edge deployment on Jetson Nano.

Models:
  1. VesselUNet       — Binary vessel segmentation (DRIVE/STARE/CHASE-DB1)
  2. DiscFoveaNet     — Heatmap regression for optic disc + fovea (IDRiD)
  3. LesionUNet       — 5-class segmentation (BG/MA/exudate/hemorrhage/NV)

All architectures share the same encoder-decoder structure, differing only
in the output head (# channels, activation).
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as tvm


# ── Shared MobileNetV3 Encoder ──────────────────────────────────────────────

class MobileNetV3Encoder(nn.Module):
    """Extract multi-scale features from MobileNetV3-Small for U-Net skip connections.

    Extracts features at 5 scales (1/2, 1/4, 1/8, 1/16, 1/32 of input).
    Channel counts at each scale: [16, 16, 24, 48, 576].
    """

    # Feature indices in MobileNetV3-Small's Sequential features block
    # that correspond to each spatial downsampling stage.
    STAGE_INDICES = [0, 1, 3, 8, 12]
    STAGE_CHANNELS = [16, 16, 24, 48, 576]

    def __init__(self, pretrained: bool = True):
        super().__init__()
        weights = tvm.MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = tvm.mobilenet_v3_small(weights=weights)
        self.features = backbone.features

    def forward(self, x: torch.Tensor) -> list[torch.Tensor]:
        """Returns list of feature maps at decreasing spatial resolutions."""
        skips = []
        for i, layer in enumerate(self.features):
            x = layer(x)
            if i in self.STAGE_INDICES:
                skips.append(x)
        return skips


# ── U-Net Decoder Block ────────────────────────────────────────────────────

class DecoderBlock(nn.Module):
    """Upsample + concatenate skip + 2× conv with BN and ReLU."""

    def __init__(self, in_ch: int, skip_ch: int, out_ch: int):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_ch, in_ch, kernel_size=2, stride=2)
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch + skip_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)
        # Handle size mismatch from odd input dimensions
        if x.shape[2:] != skip.shape[2:]:
            x = F.interpolate(x, size=skip.shape[2:], mode='bilinear',
                              align_corners=False)
        x = torch.cat([x, skip], dim=1)
        return self.conv(x)


# ── VesselUNet: Binary Vessel Segmentation ─────────────────────────────────

class VesselUNet(nn.Module):
    """U-Net with MobileNetV3-Small encoder for binary vessel segmentation.

    Input:  (B, 3, 512, 512) RGB fundus image, ImageNet-normalized
    Output: (B, 1, 512, 512) sigmoid probability map (vessel=1, background=0)

    Trained on: DRIVE + STARE + CHASE-DB1
    Expected performance: Dice ~0.78-0.82 (comparable to published U-Net baselines)
    """

    def __init__(self, pretrained: bool = True):
        super().__init__()
        self.encoder = MobileNetV3Encoder(pretrained=pretrained)
        ch = MobileNetV3Encoder.STAGE_CHANNELS  # [16, 16, 24, 48, 576]

        # Decoder: mirror the encoder with skip connections
        self.dec4 = DecoderBlock(ch[4], ch[3], 128)   # 1/32 → 1/16
        self.dec3 = DecoderBlock(128,   ch[2], 64)    # 1/16 → 1/8
        self.dec2 = DecoderBlock(64,    ch[1], 32)    # 1/8  → 1/4
        self.dec1 = DecoderBlock(32,    ch[0], 16)    # 1/4  → 1/2

        # Final upsampling + 1×1 conv to input resolution
        self.final = nn.Sequential(
            nn.ConvTranspose2d(16, 16, kernel_size=2, stride=2),
            nn.Conv2d(16, 1, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        skips = self.encoder(x)
        # skips: [s0(1/2), s1(1/4), s2(1/8), s3(1/16), s4(1/32)]

        d = self.dec4(skips[4], skips[3])
        d = self.dec3(d, skips[2])
        d = self.dec2(d, skips[1])
        d = self.dec1(d, skips[0])
        out = self.final(d)

        # Ensure output matches input spatial dimensions
        if out.shape[2:] != x.shape[2:]:
            out = F.interpolate(out, size=x.shape[2:], mode='bilinear',
                                align_corners=False)
        return torch.sigmoid(out)


# ── DiscFoveaNet: Heatmap Regression ───────────────────────────────────────

class DiscFoveaNet(nn.Module):
    """Heatmap regression for optic disc and fovea localization.

    Input:  (B, 3, 256, 256) RGB fundus image, ImageNet-normalized
    Output: (B, 2, 256, 256) heatmaps — channel 0 = disc, channel 1 = fovea
            Each heatmap is a 2D Gaussian centered on the predicted location.

    Trained on: IDRiD optic disc / fovea center annotations
    At inference: take argmax of each heatmap channel for (x, y) coordinates.
    """

    def __init__(self, pretrained: bool = True):
        super().__init__()
        self.encoder = MobileNetV3Encoder(pretrained=pretrained)
        ch = MobileNetV3Encoder.STAGE_CHANNELS

        self.dec4 = DecoderBlock(ch[4], ch[3], 64)
        self.dec3 = DecoderBlock(64,   ch[2], 32)
        self.dec2 = DecoderBlock(32,   ch[1], 16)
        self.dec1 = DecoderBlock(16,   ch[0], 16)

        self.final = nn.Sequential(
            nn.ConvTranspose2d(16, 16, kernel_size=2, stride=2),
            nn.Conv2d(16, 2, kernel_size=1),  # 2 channels: disc + fovea
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        skips = self.encoder(x)
        d = self.dec4(skips[4], skips[3])
        d = self.dec3(d, skips[2])
        d = self.dec2(d, skips[1])
        d = self.dec1(d, skips[0])
        out = self.final(d)

        if out.shape[2:] != x.shape[2:]:
            out = F.interpolate(out, size=x.shape[2:], mode='bilinear',
                                align_corners=False)
        # No activation: raw heatmap values, trained with MSE loss
        # against ground-truth Gaussian targets
        return out


# ── LesionUNet: Multi-class Lesion Segmentation ───────────────────────────

class LesionUNet(nn.Module):
    """Multi-class segmentation for DR lesion types.

    Input:  (B, 3, 512, 512) RGB fundus image, ImageNet-normalized
    Output: (B, 5, 512, 512) class logits per pixel

    Label schema (unified across IDRiD, DDR, FGADR):
        0 = background
        1 = microaneurysms (MA)
        2 = hard exudates (EX)
        3 = hemorrhages (HE)
        4 = neovascularization (NV) / soft exudates / cotton-wool spots

    At inference: argmax across dim=1 for class predictions, or apply
    softmax for per-class probability maps.

    Note: MA segmentation is notoriously difficult (Dice ~0.15-0.30 is
    typical even for state-of-the-art). This is reported honestly in
    per-class metrics, not hidden in an aggregate score.
    """

    NUM_CLASSES = 5  # BG + 4 lesion types

    def __init__(self, pretrained: bool = True):
        super().__init__()
        self.encoder = MobileNetV3Encoder(pretrained=pretrained)
        ch = MobileNetV3Encoder.STAGE_CHANNELS

        self.dec4 = DecoderBlock(ch[4], ch[3], 128)
        self.dec3 = DecoderBlock(128,   ch[2], 64)
        self.dec2 = DecoderBlock(64,    ch[1], 32)
        self.dec1 = DecoderBlock(32,    ch[0], 16)

        self.final = nn.Sequential(
            nn.ConvTranspose2d(16, 16, kernel_size=2, stride=2),
            nn.Conv2d(16, self.NUM_CLASSES, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        skips = self.encoder(x)
        d = self.dec4(skips[4], skips[3])
        d = self.dec3(d, skips[2])
        d = self.dec2(d, skips[1])
        d = self.dec1(d, skips[0])
        out = self.final(d)

        if out.shape[2:] != x.shape[2:]:
            out = F.interpolate(out, size=x.shape[2:], mode='bilinear',
                                align_corners=False)
        return out  # Raw logits; apply softmax at inference


# ── Factory + model info ───────────────────────────────────────────────────

MODEL_REGISTRY = {
    'vessel': {
        'class': VesselUNet,
        'input_size': (512, 512),
        'num_classes': 1,
        'description': 'Binary vessel segmentation',
    },
    'disc': {
        'class': DiscFoveaNet,
        'input_size': (256, 256),
        'num_classes': 2,
        'description': 'Disc/fovea heatmap regression',
    },
    'lesion': {
        'class': LesionUNet,
        'input_size': (512, 512),
        'num_classes': 5,
        'description': '5-class lesion segmentation (BG/MA/EX/HE/NV)',
    },
}


def build_model(task: str, pretrained: bool = True) -> nn.Module:
    """Factory function to build a model by task name."""
    if task not in MODEL_REGISTRY:
        raise ValueError(f"Unknown task '{task}'. Choose from: {list(MODEL_REGISTRY.keys())}")
    return MODEL_REGISTRY[task]['class'](pretrained=pretrained)


def get_input_size(task: str) -> tuple[int, int]:
    """Return the expected (H, W) input size for a task."""
    return MODEL_REGISTRY[task]['input_size']
