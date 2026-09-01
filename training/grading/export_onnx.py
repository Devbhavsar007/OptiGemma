"""
ONNX export for the DR grading model with numerical parity verification.

Usage:
    python training/grading/export_onnx.py \
        --checkpoint models/grading/best_model.pt \
        --output models/onnx/dr_grading.onnx
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from engine.pipeline.grading import DRGradingModel, LESION_FEATURE_DIM


class GradingModelONNXWrapper(torch.nn.Module):
    """Wrapper that combines ordinal + referable outputs into a single tensor
    for clean ONNX export (MATLAB importONNXNetwork handles single-output
    models more reliably than multi-output).

    Output tensor: (B, 5) where:
        [:, 0:4] = ordinal logits (K-1 = 4 values)
        [:, 4]   = referable logit (single value)
    """

    def __init__(self, model: DRGradingModel):
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor, lesion_feats: torch.Tensor) -> torch.Tensor:
        ord_logits, ref_logit = self.model(x, lesion_feats)
        return torch.cat([ord_logits, ref_logit.unsqueeze(1)], dim=1)


def export_grading_onnx(checkpoint_path: str, output_path: str,
                         img_size: int = 300, opset: int = 13) -> None:
    """Export grading model to ONNX."""
    device = torch.device('cpu')
    model = DRGradingModel(pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt.get('model_state_dict', ckpt))
    model.eval()

    wrapper = GradingModelONNXWrapper(model)
    wrapper.eval()

    dummy_img = torch.randn(1, 3, img_size, img_size)
    dummy_lesion = torch.zeros(1, LESION_FEATURE_DIM)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        wrapper,
        (dummy_img, dummy_lesion),
        output_path,
        export_params=True,
        opset_version=opset,
        do_constant_folding=True,
        input_names=['fundus_image', 'lesion_features'],
        output_names=['logits'],  # [ordinal(4) | referable(1)]
        dynamic_axes=None,
    )
    print(f"  [EXPORT] ONNX saved to: {output_path}")


def verify_parity(checkpoint_path: str, onnx_path: str,
                   img_size: int = 300, tolerance: float = 1e-4) -> dict:
    """Verify numerical parity between PyTorch and ONNX Runtime."""
    try:
        import onnxruntime as ort
    except ImportError:
        return {'status': 'SKIPPED', 'reason': 'onnxruntime not installed'}

    # Load PyTorch model
    model = DRGradingModel(pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
    model.load_state_dict(ckpt.get('model_state_dict', ckpt))
    wrapper = GradingModelONNXWrapper(model)
    wrapper.eval()

    # Load ONNX session
    session = ort.InferenceSession(onnx_path)

    max_diffs = []
    for seed in range(5):
        torch.manual_seed(seed)
        test_img = torch.randn(1, 3, img_size, img_size)
        test_lesion = torch.randn(1, LESION_FEATURE_DIM)

        # PyTorch
        with torch.no_grad():
            pt_out = wrapper(test_img, test_lesion).numpy()

        # ONNX Runtime
        ort_out = session.run(None, {
            'fundus_image': test_img.numpy(),
            'lesion_features': test_lesion.numpy(),
        })[0]

        max_diffs.append(float(np.abs(pt_out - ort_out).max()))

    overall_max = max(max_diffs)
    passed = overall_max < tolerance

    result = {
        'status': 'PASS' if passed else 'FAIL',
        'max_abs_diff': round(overall_max, 8),
        'tolerance': tolerance,
        'n_tests': len(max_diffs),
    }

    icon = '✅' if passed else '❌'
    print(f"  {icon} Parity: max_diff={overall_max:.2e} (tol={tolerance:.0e}) → "
          f"{'PASS' if passed else 'FAIL'}")

    return result


def main():
    parser = argparse.ArgumentParser(description='Export DR grading model to ONNX')
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--output', default='models/onnx/dr_grading.onnx')
    parser.add_argument('--img_size', type=int, default=300)
    parser.add_argument('--opset', type=int, default=13)
    parser.add_argument('--tolerance', type=float, default=1e-4)
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  DR Grading Model — ONNX Export")
    print(f"{'='*60}\n")

    export_grading_onnx(args.checkpoint, args.output, args.img_size, args.opset)

    size_mb = Path(args.output).stat().st_size / 1e6
    print(f"  [INFO] File size: {size_mb:.1f} MB")

    print(f"\n  Running parity check...")
    parity = verify_parity(args.checkpoint, args.output, args.img_size, args.tolerance)

    # Save report
    report_path = Path(args.output).with_suffix('.parity.json')
    report_path.write_text(json.dumps({
        'checkpoint': args.checkpoint,
        'onnx_path': args.output,
        'file_size_mb': round(size_mb, 2),
        'parity': parity,
    }, indent=2))
    print(f"  [INFO] Report: {report_path}")


if __name__ == '__main__':
    main()
