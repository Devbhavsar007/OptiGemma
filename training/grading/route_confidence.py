"""
Confidence-threshold routing: AUTO_GRADE vs REFER_TO_HUMAN.

Reports the deferral-rate vs accuracy tradeoff as a CURVE, not a single
number — this is the critical output for demonstrating that the confidence
routing actually works (reduces error rate on auto-graded cases at the
cost of some deferrals).

Usage:
    python training/grading/route_confidence.py \
        --checkpoint models/grading/best_model.pt \
        --data_dir data/aptos \
        --calibration models/grading/calibration.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

from engine.pipeline.grading import (DRGradingModel, ordinal_probs, Calibration,
                                      expected_grade)
from training.losses import (quadratic_weighted_kappa, referable_sens_spec)
from training.grading.train_grading import discover_dataset, MultiDatasetGrading


def route_prediction(grade: int, referable: bool, confidence: float,
                      confidence_threshold: float = 0.70) -> str:
    """Deterministic routing decision.

    Returns 'AUTO_GRADE' or 'REFER_TO_HUMAN' based on confidence and clinical risk.

    Logic:
      1. PDR (grade 4) always deferred — too high-stakes for auto-grading
      2. Low confidence (below threshold) → defer
      3. Referable DR with moderate confidence → defer (err on caution)
      4. Otherwise → auto-grade
    """
    # Grade 4 (PDR) always requires specialist confirmation
    if grade == 4:
        return 'REFER_TO_HUMAN'

    # Low overall confidence
    if confidence < confidence_threshold:
        return 'REFER_TO_HUMAN'

    # Referable DR with borderline confidence: err on caution
    if referable and confidence < 0.85:
        return 'REFER_TO_HUMAN'

    return 'AUTO_GRADE'


def compute_deferral_curve(y_true: np.ndarray, grades: np.ndarray,
                            confidences: np.ndarray,
                            ref_probs: np.ndarray, ref_threshold: float,
                            n_points: int = 20) -> list[dict]:
    """Sweep confidence thresholds and report the tradeoff curve.

    At each confidence threshold:
      - deferral_rate: fraction of cases sent to human review
      - auto_accuracy: accuracy on the remaining auto-graded cases
      - auto_kappa: QWK on auto-graded cases
      - auto_ref_sensitivity: referable-DR sensitivity on auto-graded cases
      - auto_ref_specificity: referable-DR specificity on auto-graded cases
    """
    curve = []
    thresholds = np.linspace(0.3, 0.99, n_points)

    for thr in thresholds:
        # Route each case
        auto_mask = np.array([
            route_prediction(int(g), float(rp) >= ref_threshold, float(c), float(thr))
            == 'AUTO_GRADE'
            for g, rp, c in zip(grades, ref_probs, confidences)
        ])

        n_auto = auto_mask.sum()
        n_total = len(y_true)
        deferral_rate = 1.0 - n_auto / n_total

        if n_auto < 10:
            continue

        auto_y = y_true[auto_mask]
        auto_g = grades[auto_mask]
        auto_rp = ref_probs[auto_mask]

        auto_acc = float((auto_g == auto_y).mean())
        auto_kappa = quadratic_weighted_kappa(auto_y, auto_g)
        auto_sens, auto_spec = referable_sens_spec(auto_y, auto_rp, ref_threshold)

        curve.append({
            'confidence_threshold': round(float(thr), 3),
            'deferral_rate': round(deferral_rate, 4),
            'n_auto': int(n_auto),
            'n_deferred': int(n_total - n_auto),
            'auto_accuracy': round(auto_acc, 4),
            'auto_kappa': round(auto_kappa, 4),
            'auto_ref_sensitivity': round(auto_sens, 4),
            'auto_ref_specificity': round(auto_spec, 4),
        })

    return curve


def main():
    parser = argparse.ArgumentParser(
        description='Confidence routing analysis — deferral vs accuracy tradeoff')
    parser.add_argument('--checkpoint', required=True)
    parser.add_argument('--data_dir', required=True)
    parser.add_argument('--calibration', default='models/grading/calibration.json')
    parser.add_argument('--out', default='models/grading/routing_curve.json')
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--img_size', type=int, default=300)
    args = parser.parse_args()

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Load model + calibration
    model = DRGradingModel(pretrained=False)
    ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(ckpt.get('model_state_dict', ckpt))
    model.to(device).eval()

    calib = Calibration.load(args.calibration)
    print(f"  Calibration: temperature={calib.temperature:.4f}, "
          f"threshold={calib.threshold:.4f}")

    # Load data
    paths, labels, name = discover_dataset(args.data_dir)
    print(f"  Data: {name} ({len(paths)} images)")

    ds = MultiDatasetGrading(paths, labels, [name] * len(paths),
                              img_size=args.img_size, phase='eval')
    loader = DataLoader(ds, batch_size=args.batch_size, shuffle=False)

    # Collect predictions
    all_y, all_ord, all_ref = [], [], []
    with torch.no_grad():
        for x, y, _ in loader:
            x = x.to(device)
            lesion = torch.zeros(x.size(0), 12, device=device)
            o, r = model(x, lesion)
            all_ord.append(o.float().cpu())
            all_ref.append(r.float().cpu())
            all_y.append(y)

    ord_logits = torch.cat(all_ord)
    ref_logits = torch.cat(all_ref)
    y_true = torch.cat(all_y).numpy()

    probs = ordinal_probs(ord_logits / calib.temperature).numpy()
    grades = probs.argmax(axis=1)
    confidences = probs.max(axis=1)
    ref_probs = torch.sigmoid(ref_logits / calib.temperature).numpy()

    print(f"\n{'='*60}")
    print(f"  Confidence Routing — Deferral vs. Accuracy Tradeoff")
    print(f"{'='*60}\n")

    # Compute curve
    curve = compute_deferral_curve(y_true, grades, confidences,
                                    ref_probs, calib.threshold)

    # Print table
    print(f"  {'Conf_Thr':>10s}  {'Defer%':>8s}  {'N_auto':>8s}  "
          f"{'Acc':>8s}  {'κ':>8s}  {'Sens':>8s}  {'Spec':>8s}")
    print(f"  {'-'*10}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*8}")
    for pt in curve:
        print(f"  {pt['confidence_threshold']:10.3f}  "
              f"{pt['deferral_rate']:8.1%}  "
              f"{pt['n_auto']:8d}  "
              f"{pt['auto_accuracy']:8.4f}  "
              f"{pt['auto_kappa']:8.4f}  "
              f"{pt['auto_ref_sensitivity']:8.4f}  "
              f"{pt['auto_ref_specificity']:8.4f}")

    # Find operating point: highest accuracy with deferral < 30%
    feasible = [pt for pt in curve if pt['deferral_rate'] <= 0.30]
    if feasible:
        best = max(feasible, key=lambda p: p['auto_accuracy'])
        print(f"\n  RECOMMENDED OPERATING POINT (deferral ≤ 30%):")
        print(f"    Confidence threshold: {best['confidence_threshold']}")
        print(f"    Deferral rate: {best['deferral_rate']:.1%}")
        print(f"    Auto-graded accuracy: {best['auto_accuracy']:.4f}")
        print(f"    Auto-graded κ: {best['auto_kappa']:.4f}")
        print(f"    Auto-graded ref-DR sensitivity: {best['auto_ref_sensitivity']:.4f}")

    # Save
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        'dataset': name,
        'n_samples': len(y_true),
        'calibration': calib.to_dict(),
        'curve': curve,
        'recommended_operating_point': best if feasible else None,
    }
    out_path.write_text(json.dumps(report, indent=2))
    print(f"\n  Routing curve saved to: {out_path}")


if __name__ == '__main__':
    main()
