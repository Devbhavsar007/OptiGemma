"""
Full-pipeline runner: IQA gate -> structures -> grading -> explainability.

Usage:
    python -m engine.pipeline.runner sample_data/test_fundus.jpg \
        [--weights models/dr_pipeline/best_model.pt] [--out results/]
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import cv2
import numpy as np
import torch

from engine.pipeline.iqa import run_iqa
from engine.pipeline.structures import extract_structures
from engine.pipeline.grading import load_grading_model, Calibration, predict_batch
from engine.pipeline.explain import GradCAM, build_explanation

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_WEIGHTS = BASE_DIR / "models" / "dr_pipeline" / "best_model.pt"
DEFAULT_CALIB = BASE_DIR / "models" / "dr_pipeline" / "calibration.json"
IMG_SIZE = 300

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess(img_bgr: np.ndarray) -> torch.Tensor:
    img = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    img = (img - IMAGENET_MEAN) / IMAGENET_STD
    return torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0)


def run_pipeline(image_path: str, weights_path: str | Path | None = None,
                 calib_path: str | Path | None = None,
                 device: str | None = None) -> dict:
    t0 = time.time()
    device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
    weights_path = Path(weights_path or DEFAULT_WEIGHTS)
    calib = Calibration.load(calib_path or DEFAULT_CALIB)

    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise FileNotFoundError(image_path)

    report: dict = {"case_id": Path(image_path).stem, "pipeline": "optigemma-v2"}

    # ── Module 1: quality gate ──
    iqa, processed = run_iqa(img_bgr)
    report["iqa"] = iqa.to_dict()
    if iqa.decision == "REJECT" or processed is None:
        report["status"] = "REJECTED"
        report["message"] = " ".join(iqa.feedback)
        report["latency_s"] = round(time.time() - t0, 3)
        return report
    report["status"] = "OK"

    # ── Module 2: structures & lesions ──
    structures = extract_structures(processed)
    report["structures"] = structures.to_dict()

    # ── Module 3: grading (if trained weights exist) ──
    cam_ref = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)
    cam_grade = cam_ref.copy()

    if weights_path.exists():
        model = load_grading_model(weights_path, device)
        gradcam = GradCAM(model)

        x = preprocess(processed)
        lesion = torch.from_numpy(structures.lesion_features).unsqueeze(0)

        pred = predict_batch(model, x, lesion, calib, device)
        report["grading"] = {
            "grade": int(pred["grade"][0]),
            "probs": np.round(pred["probs"][0], 4).tolist(),
            "expected_grade": float(pred["expected_grade"][0]),
            "referable": bool(pred["referable"][0]),
            "referable_prob": float(pred["referable_prob"][0]),
            "threshold": calib.threshold,
        }

        # ── Module 4: explainability ──
        cam_ref = gradcam.compute(x, lesion, head="referable")
        cam_grade = gradcam.compute(x, lesion, head="grade")
        explanation = build_explanation(processed, cam_ref, cam_grade,
                                        structures.to_dict() | {"maps": structures.maps},
                                        pred, case_id=report["case_id"])
        report["explanation"] = {k: v for k, v in explanation.items()
                                 if k not in ("overlay_bgr", "cam_referable", "cam_grade")}

        out_dir = BASE_DIR / "results"
        out_dir.mkdir(exist_ok=True)
        cv2.imwrite(str(out_dir / f"{report['case_id']}_overlay.jpg"), explanation["overlay_bgr"])
        report["overlay_path"] = str(out_dir / f"{report['case_id']}_overlay.jpg")
    else:
        report["grading"] = None
        report["message"] = (f"Weights not found at {weights_path}. "
                             "Run `python train_in_loop.py --data <aptos_dir>` first.")

    report["latency_s"] = round(time.time() - t0, 3)
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description="OptiGemma full DR screening pipeline")
    ap.add_argument("image", help="Path to fundus image")
    ap.add_argument("--weights", default=str(DEFAULT_WEIGHTS))
    ap.add_argument("--calibration", default=str(DEFAULT_CALIB))
    ap.add_argument("--out", default=None, help="Optional path to write JSON report")
    args = ap.parse_args()

    report = run_pipeline(args.image, args.weights, args.calibration)
    printable = {k: v for k, v in report.items() if k not in ("cam_referable",)}
    print(json.dumps(printable, indent=2, default=str))

    if args.out:
        Path(args.out).write_text(json.dumps(report, indent=2, default=str))


if __name__ == "__main__":
    main()
