"""
ONNX export for segmentation models with numerical parity verification.

Usage:
    python training/segmentation/export_onnx.py \
        --task=vessel \
        --checkpoint=models/segmentation/vessel/best_model.pt \
        --output=models/onnx/vessel_seg.onnx

Parity check:
    Runs inference on a synthetic test batch through both PyTorch and ONNX
    Runtime, reports max absolute difference. Passes if diff < 1e-4.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch

from training.segmentation.models import build_model, get_input_size, MODEL_REGISTRY


def export_to_onnx(model: torch.nn.Module, input_shape: tuple[int, ...],
                    output_path: str, opset_version: int = 13) -> None:
    """Export PyTorch model to ONNX with fixed input shape."""
    model.eval()
    dummy = torch.randn(*input_shape)

    torch.onnx.export(
        model,
        dummy,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes=None,  # Fixed shape for MATLAB Coder compatibility
    )
    print(f"  [EXPORT] ONNX saved to: {output_path}")


def verify_parity(model: torch.nn.Module, onnx_path: str,
                   input_shape: tuple[int, ...],
                   tolerance: float = 1e-4, n_batches: int = 3) -> dict:
    """Verify numerical parity between PyTorch and ONNX Runtime outputs.

    This is NOT just 'it exports without error' — we compare actual numerical
    outputs on random test data to catch silent import/export conversion bugs.
    """
    try:
        import onnxruntime as ort
    except ImportError:
        print("  [WARN] onnxruntime not installed. Install with: pip install onnxruntime")
        return {'status': 'SKIPPED', 'reason': 'onnxruntime not installed'}

    model.eval()
    session = ort.InferenceSession(onnx_path)
    input_name = session.get_inputs()[0].name

    max_diffs = []
    mean_diffs = []

    for i in range(n_batches):
        # Use a fixed seed for reproducibility
        torch.manual_seed(42 + i)
        test_input = torch.randn(*input_shape)

        # PyTorch inference
        with torch.no_grad():
            pt_output = model(test_input).numpy()

        # ONNX Runtime inference
        ort_output = session.run(None, {input_name: test_input.numpy()})[0]

        # Compare
        diff = np.abs(pt_output - ort_output)
        max_diffs.append(float(diff.max()))
        mean_diffs.append(float(diff.mean()))

    overall_max_diff = max(max_diffs)
    overall_mean_diff = float(np.mean(mean_diffs))
    passed = overall_max_diff < tolerance

    result = {
        'status': 'PASS' if passed else 'FAIL',
        'max_abs_diff': round(overall_max_diff, 8),
        'mean_abs_diff': round(overall_mean_diff, 8),
        'tolerance': tolerance,
        'n_test_batches': n_batches,
        'input_shape': list(input_shape),
    }

    status_icon = '✅' if passed else '❌'
    print(f"  {status_icon} Parity check: max_diff={overall_max_diff:.2e}, "
          f"mean_diff={overall_mean_diff:.2e}, tolerance={tolerance:.0e} "
          f"→ {'PASS' if passed else 'FAIL'}")

    return result


def main():
    parser = argparse.ArgumentParser(description='Export segmentation model to ONNX')
    parser.add_argument('--task', required=True, choices=['vessel', 'disc', 'lesion'])
    parser.add_argument('--checkpoint', required=True, help='Path to .pt checkpoint')
    parser.add_argument('--output', default=None, help='Output ONNX path')
    parser.add_argument('--tolerance', type=float, default=1e-4,
                        help='Max abs diff tolerance for parity check')
    parser.add_argument('--opset', type=int, default=13, help='ONNX opset version')
    args = parser.parse_args()

    # Output path
    if args.output is None:
        out_dir = Path('models/onnx')
        out_dir.mkdir(parents=True, exist_ok=True)
        args.output = str(out_dir / f'{args.task}_seg.onnx')
    else:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    # Load model
    model = build_model(args.task, pretrained=False)
    checkpoint = torch.load(args.checkpoint, map_location='cpu', weights_only=False)
    state_dict = checkpoint.get('model_state_dict', checkpoint)
    model.load_state_dict(state_dict)
    model.eval()

    # Input shape
    img_h, img_w = get_input_size(args.task)
    input_shape = (1, 3, img_h, img_w)

    print(f"\n{'='*60}")
    print(f"  ONNX Export — {args.task}")
    print(f"  Checkpoint: {args.checkpoint}")
    print(f"  Input shape: {input_shape}")
    print(f"  Output: {args.output}")
    print(f"{'='*60}\n")

    # Export
    export_to_onnx(model, input_shape, args.output, opset_version=args.opset)

    # Verify file exists and has reasonable size
    onnx_path = Path(args.output)
    size_mb = onnx_path.stat().st_size / 1e6
    print(f"  [INFO] ONNX file size: {size_mb:.1f} MB")

    # Parity check
    print(f"\n  Running numerical parity check...")
    parity = verify_parity(model, args.output, input_shape, tolerance=args.tolerance)

    # Save parity report alongside the ONNX file
    import json
    report_path = onnx_path.with_suffix('.parity.json')
    report = {
        'task': args.task,
        'checkpoint': args.checkpoint,
        'onnx_path': args.output,
        'file_size_mb': round(size_mb, 2),
        'opset_version': args.opset,
        'parity': parity,
    }
    report_path.write_text(json.dumps(report, indent=2))
    print(f"  [INFO] Parity report saved to: {report_path}\n")

    if parity['status'] == 'FAIL':
        print(f"  ⚠️  PARITY CHECK FAILED — max diff {parity['max_abs_diff']:.2e} "
              f"exceeds tolerance {args.tolerance:.0e}")
        print(f"  Possible causes: quantization, fused ops, or layer incompatibility.")
        exit(1)


if __name__ == '__main__':
    main()
