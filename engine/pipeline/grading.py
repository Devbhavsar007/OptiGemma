"""
Module 3 — DR Severity Grading (ICDR scale 0-4).

Architecture: EfficientNet-B3 backbone -> GAP -> late-fusion with Module-2
lesion features -> two heads:
    1. ordinal head  : K-1 = 4 logits modelling P(y > k)  (CORN/CORAL style,
                       monotonic via cumulative-product at inference)
    2. referable head: binary logit for referable DR (ICDR level >= 2)

Calibrated inference: temperature scaling (fit on validation) + decision
threshold searched on validation to maximise sensitivity subject to
specificity >= 0.85 (problem-statement target).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as tvm

LESION_FEATURE_DIM = 12
NUM_CLASSES = 5


class DRGradingModel(nn.Module):
    def __init__(self, backbone: str = "efficientnet_b3", pretrained: bool = True,
                 lesion_dim: int = LESION_FEATURE_DIM, hidden: int = 512):
        super().__init__()
        weights = tvm.EfficientNet_B3_Weights.IMAGENET1K_V1 if pretrained else None
        net = tvm.efficientnet_b3(weights=weights)
        self.features = net.features
        feat_dim = net.classifier[1].in_features  # 1536

        self.fusion = nn.Sequential(
            nn.Linear(feat_dim + lesion_dim, hidden),
            nn.BatchNorm1d(hidden),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
        )
        self.ordinal_head = nn.Linear(hidden, NUM_CLASSES - 1)   # P(y > k), k=0..3
        self.referable_head = nn.Linear(hidden, 1)               # referable DR (level >= 2)

    def forward(self, x, lesion_feats=None):
        f = self.features(x)
        f = torch.nn.functional.adaptive_avg_pool2d(f, 1).flatten(1)
        if lesion_feats is None:
            lesion_feats = torch.zeros(x.size(0), self.fusion[0].in_features - f.size(1),
                                       device=x.device)
        z = self.fusion(torch.cat([f, lesion_feats], dim=1))
        return self.ordinal_head(z), self.referable_head(z).squeeze(1)


# ── Ordinal math ────────────────────────────────────────────────────────────
def ordinal_loss(logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
    """CORN-style conditional ordinal BCE. logit_k models P(y > k); task k is
    trained only on samples with y >= k (conditional training sets)."""
    Km1 = logits.shape[1]
    ar = torch.arange(Km1, device=logits.device).unsqueeze(0)
    tgt_gt = (targets.unsqueeze(1) > ar).float()
    relevance = (targets.unsqueeze(1) >= ar).float()

    bce = nn.functional.binary_cross_entropy_with_logits(logits, tgt_gt, reduction="none")
    per_sample = (bce * relevance).sum(dim=1) / relevance.sum(dim=1).clamp(min=1.0)
    return per_sample.mean()


def ordinal_probs(logits: torch.Tensor) -> torch.Tensor:
    """Monotonic class probabilities via cumulative product of P(y > k)."""
    p_gt = torch.cumprod(torch.sigmoid(logits), dim=1)          # P(y>0..K-2)
    ones = torch.ones(p_gt.size(0), 1, device=p_gt.device)
    zeros = torch.zeros(p_gt.size(0), 1, device=p_gt.device)
    cum = torch.cat([ones, p_gt, zeros], dim=1)                 # P(y>-1)=1 .. P(y>4)=0
    return cum[:, :-1] - cum[:, 1:]                              # P(y=k), k=0..4


def expected_grade(probs: torch.Tensor) -> torch.Tensor:
    """Ordinal expectation (closer to truth than argmax for adjacent grades)."""
    k = torch.arange(probs.size(1), device=probs.device, dtype=torch.float32)
    return probs @ k


# ── Calibration artifacts ───────────────────────────────────────────────────
class Calibration:
    """Temperature scaling + referable-DR decision threshold."""

    def __init__(self, temperature: float = 1.0, threshold: float = 0.5):
        self.temperature = temperature
        self.threshold = threshold

    def to_dict(self) -> dict:
        return {"temperature": self.temperature, "threshold": self.threshold}

    @classmethod
    def from_dict(cls, d: dict) -> "Calibration":
        return cls(float(d.get("temperature", 1.0)), float(d.get("threshold", 0.5)))

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def load(cls, path: str | Path) -> "Calibration":
        p = Path(path)
        if p.exists():
            return cls.from_dict(json.loads(p.read_text()))
        return cls()


# ── Inference ───────────────────────────────────────────────────────────────
@torch.no_grad()
def predict_batch(model: DRGradingModel, images: torch.Tensor,
                  lesion_feats: torch.Tensor | None, calib: Calibration,
                  device: torch.device, tta: bool = True) -> dict:
    """TTA + calibrated prediction for a batch of preprocessed images."""
    model.eval()
    inputs = [images]
    if tta:
        inputs.append(torch.flip(images, dims=[3]))
        inputs.append(torch.flip(images, dims=[2]))

    ord_logits, ref_logits = [], []
    for x in inputs:
        o, r = model(x.to(device), lesion_feats.to(device) if lesion_feats is not None else None)
        ord_logits.append(o)
        ref_logits.append(r)
    ord_logits = torch.stack(ord_logits).mean(0) / max(calib.temperature, 1e-3)
    ref_logit = torch.stack(ref_logits).mean(0) / max(calib.temperature, 1e-3)

    probs = ordinal_probs(ord_logits)
    ref_prob = torch.sigmoid(ref_logit)

    return {
        "probs": probs.cpu().numpy(),
        "grade": probs.argmax(dim=1).cpu().numpy(),
        "expected_grade": expected_grade(probs).cpu().numpy(),
        "referable_prob": ref_prob.cpu().numpy(),
        "referable": (ref_prob.cpu().numpy() >= calib.threshold),
    }


def load_grading_model(weights_path: str | Path, device: torch.device) -> DRGradingModel:
    ckpt = torch.load(weights_path, map_location=device, weights_only=False)
    model = DRGradingModel(pretrained=False)
    state = ckpt.get("model_state_dict", ckpt)
    model.load_state_dict(state)
    model.to(device).eval()
    return model
