"""
Two-Tiered Architecture Pipeline Runner for OptiGemma.

Orchestrates:
    Tier 1 (Edge / Offline):
        - Image Quality Assessment (IQA) gate
        - Structure & Lesion Extraction (Frangi vessels, MA, hemorrhages, exudates)
        - DR Grading (calibrated ordinal + referable head, or legacy fallback)
        - Explainability (HiResCAM + Grad-CAM + quantitative localization metrics)
        - Offline structured report generation
    Tier 2 (Cloud / Agentic Multimodal):
        - Multimodal MedGemma 27B vision-language clinical report
        - Visual verification of pathology and heatmap grounding
        - Seamless fallback to Tier 1 when offline or timed out

Usage:
    python -m engine.pipeline.two_tier_runner sample_data/test_fundus.jpg [--out results/report.json]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch

from config import (
    DR_STAGES,
    PIPELINE_WEIGHTS,
    PIPELINE_CALIBRATION,
    OFFLINE_MODE,
    RESULTS_DIR,
)
from engine.pipeline.iqa import run_iqa, estimate_fov
from engine.pipeline.structures import extract_structures
from engine.pipeline.grading import load_grading_model, Calibration, predict_batch
from engine.pipeline.explain import GradCAM, build_explanation
from engine.pipeline.hirescam import HiResCAM, make_hirescam_overlay, compute_localization_score
from engine.pipeline.medgemma_report import generate_medgemma_report
from engine.pipeline.offline_report import generate_offline_report

log = logging.getLogger("TwoTierRunner")

BASE_DIR = Path(__file__).resolve().parents[2]
IMG_SIZE = 300
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_tensor(img_bgr: np.ndarray) -> torch.Tensor:
    """Preprocess image for PyTorch grading model."""
    img = cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    img = (img - IMAGENET_MEAN) / IMAGENET_STD
    return torch.from_numpy(img.transpose(2, 0, 1)).unsqueeze(0)


def run_tier1(
    img_bgr: np.ndarray,
    weights_path: Path | str = PIPELINE_WEIGHTS,
    calib_path: Path | str = PIPELINE_CALIBRATION,
    device_str: str | None = None,
    case_id: str = "case",
    patient_info: dict | None = None,
) -> dict[str, Any]:
    """
    Execute Tier 1 (Edge) screening pipeline. Fully offline-capable.
    """
    t0 = time.time()
    device = torch.device(device_str or ("cuda" if torch.cuda.is_available() else "cpu"))
    weights_p = Path(weights_path)
    calib_p = Path(calib_path)

    tier1_res: dict[str, Any] = {
        "case_id": case_id,
        "tier": "Tier 1 (Edge)",
        "status": "OK",
    }

    # 1. Quality Gate
    iqa, processed = run_iqa(img_bgr)
    tier1_res["iqa"] = iqa.to_dict()
    if iqa.decision == "REJECT" or processed is None:
        tier1_res["status"] = "REJECTED"
        tier1_res["message"] = " ".join(iqa.feedback)
        tier1_res["tier1_latency_ms"] = round((time.time() - t0) * 1000, 2)
        return tier1_res

    # 2. Structures & Lesions
    fov = estimate_fov(processed)
    structures = extract_structures(processed, fov)
    tier1_res["structures"] = structures.to_dict()

    # 3. DR Grading & CAMs
    detection_result: dict[str, Any]
    grading_result: dict[str, Any] | None = None
    cam_referable: np.ndarray = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)
    cam_grade: np.ndarray = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)
    cam_hires: np.ndarray = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)

    if weights_p.exists():
        try:
            model = load_grading_model(weights_p, device)
            calib = Calibration.load(calib_p)
            x = preprocess_tensor(processed).to(device)
            lesion_feats = torch.from_numpy(structures.lesion_features).unsqueeze(0).to(device)

            pred = predict_batch(model, x, lesion_feats, calib, device)
            grade = int(pred["grade"][0])
            stage_info = DR_STAGES.get(grade, DR_STAGES[0])

            grading_result = {
                "grade": grade,
                "probs": np.round(pred["probs"][0], 4).tolist(),
                "expected_grade": float(pred["expected_grade"][0]),
                "referable": bool(pred["referable"][0]),
                "referable_prob": float(pred["referable_prob"][0]),
                "threshold": calib.threshold,
            }

            detection_result = {
                "stage": grade,
                "stage_name": stage_info["name"],
                "confidence": round(float(pred["probs"][0][grade]) * 100, 1),
                "all_probabilities": {i: round(float(pred["probs"][0][i]) * 100, 1) for i in range(5)},
                "severity": stage_info["severity"],
                "color": stage_info["color"],
                "referable": bool(pred["referable"][0]),
                "referable_prob": round(float(pred["referable_prob"][0]), 4),
            }

            # 4. Explainability (DualCAM: Grad-CAM + HiResCAM)
            gradcam = GradCAM(model)
            hirescam = HiResCAM(model)

            cam_referable = gradcam.compute(x, lesion_feats, head="referable")
            cam_grade = gradcam.compute(x, lesion_feats, head="grade")
            cam_hires = hirescam.compute(x, lesion_feats, head="referable")

            explanation = build_explanation(
                processed,
                cam_referable,
                cam_grade,
                structures.to_dict() | {"maps": structures.maps},
                pred,
                case_id=case_id,
                cam_hirescam=cam_hires,
            )
            tier1_res["explanation"] = {
                k: v for k, v in explanation.items()
                if k not in ("overlay_bgr", "hires_overlay_bgr", "cam_referable", "cam_grade", "cam_hirescam")
            }
            tier1_res["localization_metrics"] = explanation.get("localization_metrics", {})
            tier1_res["overlay_bgr"] = explanation["overlay_bgr"]
            tier1_res["hires_overlay_bgr"] = explanation.get("hires_overlay_bgr")

        except Exception as e:
            log.warning("Grading model inference error: %s. Falling back to legacy detector.", e)
            detection_result = None
    else:
        detection_result = None

    if detection_result is None:
        # Legacy detector fallback
        from engine.preprocessor import preprocess_for_display
        from engine.detector import predict
        from engine.gradcam import generate_gradcam, get_heatmap_analysis

        # Save temporary image for legacy preprocessor
        tmp_dir = BASE_DIR / "uploads"
        tmp_dir.mkdir(exist_ok=True)
        tmp_path = str(tmp_dir / f"{case_id}_temp.png")
        cv2.imwrite(tmp_path, processed)

        processed_legacy = preprocess_for_display(tmp_path)
        detection_result = predict(processed_legacy["model_input_enhanced_highres"])
        heatmap_overlay, heatmap_raw = generate_gradcam(
            processed_legacy["model_input"], processed_legacy["original"]
        )
        tier1_res["overlay_bgr"] = heatmap_overlay
        tier1_res["hires_overlay_bgr"] = heatmap_overlay
        heatmap_analysis = get_heatmap_analysis(heatmap_raw)
        tier1_res["explanation"] = {
            "heatmap_analysis": heatmap_analysis,
            "grade": detection_result["stage"],
            "grade_name": detection_result["stage_name"],
            "confidence": detection_result["confidence"],
        }
        # Clean up temp
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    tier1_res["detection"] = detection_result
    tier1_res["grading"] = grading_result
    tier1_res["processed_image"] = processed

    # Generate Tier 1 template report
    offline_report_data, source_desc = generate_offline_report(
        detection_result=detection_result,
        heatmap_analysis={"most_affected_region": "central", "activity_intensity": "moderate"},
        vessel_stats=structures.to_dict(),
        patient_info=patient_info,
        structures=structures.to_dict(),
    )
    tier1_res["offline_report"] = offline_report_data
    tier1_res["tier1_latency_ms"] = round((time.time() - t0) * 1000, 2)

    return tier1_res


def run_two_tier_pipeline(
    image_input: str | Path | np.ndarray,
    force_offline: bool = False,
    patient_info: dict | None = None,
    save_overlays: bool = True,
    case_id: str | None = None,
) -> dict[str, Any]:
    """
    Run complete Two-Tiered Pipeline.

    Returns dictionary containing both Tier 1 outputs and Tier 2 MedGemma report.
    """
    total_start = time.time()
    cid = case_id or f"case_{int(time.time())}"

    # Load image if file path
    if isinstance(image_input, (str, Path)):
        img_bgr = cv2.imread(str(image_input))
        if img_bgr is None:
            raise FileNotFoundError(f"Could not read image from {image_input}")
    else:
        img_bgr = image_input

    # ── TIER 1: Edge Execution (Always runs) ──
    tier1 = run_tier1(
        img_bgr=img_bgr,
        case_id=cid,
        patient_info=patient_info,
    )

    if tier1.get("status") == "REJECTED":
        return tier1

    # ── TIER 2: Cloud / MedGemma Agentic Execution ──
    t2_start = time.time()
    tier2_report = None
    tier2_source = None
    is_offline = force_offline or OFFLINE_MODE

    if not is_offline:
        try:
            fundus_img_to_send = tier1.get("processed_image", img_bgr)
            hires_overlay = tier1.get("hires_overlay_bgr") or tier1.get("overlay_bgr")

            tier2_report, tier2_source = generate_medgemma_report(
                fundus_image=fundus_img_to_send,
                detection_result=tier1["detection"],
                structures=tier1.get("structures"),
                hirescam_overlay=hires_overlay,
                localization_metrics=tier1.get("localization_metrics"),
                patient_info=patient_info,
                offline_fallback=True,
            )
        except Exception as t2_err:
            log.warning("Tier 2 exception: %s. Using Tier 1 report.", t2_err)
            tier2_report = tier1.get("offline_report")
            tier2_source = "Tier 1 Offline Template (Exception Fallback)"
    else:
        log.info("Offline mode requested or configured. Tier 2 bypassed.")
        tier2_report = tier1.get("offline_report")
        tier2_source = "Tier 1 Deterministic Template (Offline Mode)"

    t2_latency_ms = round((time.time() - t2_start) * 1000, 2)

    # Save visualization overlays if requested
    overlay_paths = {}
    if save_overlays:
        out_dir = Path(RESULTS_DIR)
        out_dir.mkdir(parents=True, exist_ok=True)

        if "overlay_bgr" in tier1 and tier1["overlay_bgr"] is not None:
            gradcam_path = out_dir / f"{cid}_gradcam.png"
            cv2.imwrite(str(gradcam_path), tier1["overlay_bgr"])
            overlay_paths["gradcam_overlay"] = f"/results/{cid}_gradcam.png"

        if "hires_overlay_bgr" in tier1 and tier1["hires_overlay_bgr"] is not None:
            hires_path = out_dir / f"{cid}_hirescam.png"
            cv2.imwrite(str(hires_path), tier1["hires_overlay_bgr"])
            overlay_paths["hirescam_overlay"] = f"/results/{cid}_hirescam.png"

        if "processed_image" in tier1 and tier1["processed_image"] is not None:
            scan_path = out_dir / f"{cid}_scan.png"
            cv2.imwrite(str(scan_path), tier1["processed_image"])
            overlay_paths["scan"] = f"/results/{cid}_scan.png"

    # Merge final output package
    final_report: dict[str, Any] = {
        "success": True,
        "status": tier1.get("status", "OK"),
        "case_id": cid,
        "pipeline": "OptiGemma-TwoTier",
        "tier_executed": "Tier 1 + Tier 2" if not is_offline and "MedGemma" in str(tier2_source) else "Tier 1 (Edge Only)",
        "total_latency_ms": round((time.time() - total_start) * 1000, 2),
        "latencies": {
            "tier1_edge_ms": tier1.get("tier1_latency_ms", 0),
            "tier2_cloud_ms": t2_latency_ms,
        },
        "iqa": tier1.get("iqa"),
        "structures": tier1.get("structures"),
        "detection": tier1.get("detection"),
        "grading": tier1.get("grading"),
        "explanation": tier1.get("explanation"),
        "localization_metrics": tier1.get("localization_metrics"),
        "report": tier2_report,
        "report_source": tier2_source,
        "images": overlay_paths,
    }

    return final_report


def main() -> None:
    parser = argparse.ArgumentParser(description="OptiGemma Two-Tiered Architecture Runner")
    parser.add_argument("image", help="Path to retinal fundus image")
    parser.add_argument("--weights", default=str(PIPELINE_WEIGHTS), help="Path to grading weights")
    parser.add_argument("--calibration", default=str(PIPELINE_CALIBRATION), help="Path to calibration json")
    parser.add_argument("--out", default=None, help="Save final JSON report to path")
    parser.add_argument("--offline", action="store_true", help="Force offline execution (Tier 1 only)")
    args = parser.parse_args()

    result = run_two_tier_pipeline(
        image_input=args.image,
        force_offline=args.offline,
    )

    printable = {k: v for k, v in result.items() if not isinstance(v, np.ndarray)}
    print(json.dumps(printable, indent=2, default=str))

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(printable, indent=2, default=str))
        print(f"\nReport written to {args.out}")


if __name__ == "__main__":
    main()
