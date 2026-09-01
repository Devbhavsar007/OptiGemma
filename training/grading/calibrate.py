"""
Temperature scaling calibration for the DR grading model.

Fits a single temperature parameter on a held-out calibration split to
produce well-calibrated confidence estimates (Guo et al., 2017). Also
searches for the optimal referable-DR decision threshold that maximizes
sensitivity subject to specificity >= 0.85.

Usage:
    python training/grading/calibrate.py \
        --checkpoint models/grading/best_model.pt \
        --data_dir data/aptos \
        --out models/grading/calibration.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

from engine.pipeline.grading import DRGradingModel, ordinal_probs, Calibration
from training.losses import (fit_temperature, search_threshold,
                              referable_sens_spec, quadratic_weighted_kappa,
                              expected_calibration_error)
from training.grading.train_grading import discover_dataset, MultiDatasetGrading


def calibrate_model(model: DRGradingModel, loader: DataLoader,
                     device: torch.device,
                     target_specificity: float = 0.85) -> tuple[Calibration, dict]:
    """Fit temperature + search threshold on calibration data."""
    model.eval()
    all_ord, all_ref, all_y = [], [], []

    with torch.no_grad():
        for x, y, _ in loader:
            x = x.to(device)
            lesion = torch.zeros(x.size(0), 12, device=device)
            o, r = model(x, lesion)
            all_ord.append(o.float().cpu())
            all_ref.append(r.float().cpu())
            all_y.append(y)

    ord_logits = torch.cat(all_ord).numpy()
    ref_logits = torch.cat(all_ref).numpy()
    y_true = torch.cat(all_y).numpy()

    # Fit temperature
    temperature = fit_temperature(ord_logits, ref_logits, y_true)
    print(f"  Fitted temperature: {temperature:.4f}")

    # Search threshold
    ref_prob = torch.sigmoid(torch.tensor(ref_logits / temperature)).numpy()
    threshold, best_sens, best_spec = search_threshold(
        y_true, ref_prob, target_specificity)
    print(f"  Optimal threshold: {threshold:.4f}")
    print(f"  → sensitivity={best_sens:.4f}, specificity={best_spec:.4f}")

    calib = Calibration(temperature=temperature, threshold=threshold)

    # Compute calibrated metrics
    probs = ordinal_probs(torch.tensor(ord_logits / temperature)).numpy()
    grades = probs.argmax(axis=1)
    conf = probs.max(axis=1)
    ece_before = expected_calibration_error(
        ordinal_probs(torch.tensor(ord_logits)).numpy().max(axis=1),
        (ordinal_probs(torch.tensor(ord_logits)).numpy().argmax(axis=1) == y_true).astype(np.float32))
    ece_after = expected_calibration_error(
        conf, (grades == y_true).astype(np.float32))

    report = {
        'temperature': round(temperature, 4),
        'threshold': round(threshold, 4),
        'sensitivity': round(best_sens, 4),
        'specificity': round(best_spec, 4),
        'kappa': round(quadratic_weighted_kappa(y_true, grades), 4),
        'ece_before_calibration': round(ece_before, 4),
        'ece_after_calibration': round(ece_after, 4),
        'n_calibration_samples': len(y_true),
    }

    return calib, report


def main():
    parser = argparse.ArgumentParser(description='Calibrate DR grading model')
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--data_dir', required=True,
                        help='Calibration dataset directory')
    parser.add_argument('--out', default='models/grading/calibration.json')
    parser.add_argument('--target_spec', type=float, default=0.85,
                        help='Minimum specificity for threshold search')
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--img_size', type=int, default=300)
    args = parser.parse_args()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load model
    model = DRGradingModel(pretrained=False)
    ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(ckpt.get('model_state_dict', ckpt))
    model.to(device).eval()

    # Load calibration data
    paths, labels, name = discover_dataset(args.data_dir)
    print(f"  Calibration data: {name} ({len(paths)} images)")

    ds = MultiDatasetGrading(paths, labels, [name] * len(paths),
                              img_size=args.img_size, phase='eval')
    loader = DataLoader(ds, batch_size=args.batch_size, shuffle=False)

    print(f"\n{'='*60}")
    print(f"  Temperature Scaling Calibration")
    print(f"  Target specificity >= {args.target_spec:.0%}")
    print(f"{'='*60}\n")

    calib, report = calibrate_model(model, loader, device, args.target_spec)

    # Save
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    calib.save(out_path)
    print(f"\n  Calibration saved to: {out_path}")

    # Save detailed report
    report_path = out_path.with_suffix('.report.json')
    report_path.write_text(json.dumps(report, indent=2))
    print(f"  Report saved to: {report_path}")

    print(f"\n  CALIBRATION RESULTS:")
    for k, v in report.items():
        print(f"    {k}: {v}")


if __name__ == '__main__':
    main()
