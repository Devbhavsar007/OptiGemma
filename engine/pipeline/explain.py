"""
Module 4 — Explainability: Grad-CAM, lesion-level evidence, calibrated reports.

Produces everything an ophthalmologist needs to validate a case in <30 s:
    - Grad-CAM heatmap for the referable-DR logit (and ordinal grade logit)
    - lesion-level evidence table correlated with the CAM (coverage %)
    - calibrated confidence + decision + human-readable rationale
    - annotated overlay image for the takeaway report
"""

from __future__ import annotations

import cv2
import numpy as np
import torch
import torch.nn.functional as F

from engine.pipeline.grading import DRGradingModel

DR_STAGE_NAMES = {0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR",
                  3: "Severe NPDR", 4: "Proliferative DR"}


class GradCAM:
    """Grad-CAM on the last EfficientNet feature block."""

    def __init__(self, model: DRGradingModel, target_layer_index: int = -1):
        self.model = model
        self.activations: torch.Tensor | None = None
        self.gradients: torch.Tensor | None = None
        layer = model.features[target_layer_index]
        layer.register_forward_hook(self._fwd_hook)
        layer.register_full_backward_hook(self._bwd_hook)

    def _fwd_hook(self, _m, _i, output):
        self.activations = output.detach()

    def _bwd_hook(self, _m, _gi, grad_output):
        self.gradients = grad_output[0].detach()

    @torch.no_grad()
    def _noop(self):
        pass

    def compute(self, x: torch.Tensor, lesion_feats: torch.Tensor | None,
                head: str = "referable") -> np.ndarray:
        """Returns a [0,1] CAM resized to the input resolution."""
        self.model.eval()
        x = x.clone().requires_grad_(True)
        ord_logits, ref_logits = self.model(x, lesion_feats)
        score = ref_logits.sum() if head == "referable" else ord_logits.sum()
        self.model.zero_grad(set_to_none=True)
        score.backward()

        weights = self.gradients.mean(dim=(2, 3), keepdim=True)          # GAP over spatial
        cam = F.relu((weights * self.activations).sum(dim=1)).squeeze(0)
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-9)
        cam = cam.cpu().numpy()
        return cv2.resize(cam, (x.shape[3], x.shape[2]), interpolation=cv2.INTER_LINEAR)


def lesion_evidence(maps: dict, cam: np.ndarray, threshold: float = 0.4) -> list:
    """Correlate lesion maps with the CAM: coverage = % of lesion pixels in
    high-attention regions (clinical validation cue)."""
    high = cam >= threshold
    evidence = []
    for name, label in [("microaneurysms", "Microaneurysms"),
                        ("hemorrhages", "Hemorrhages"),
                        ("exudates", "Hard exudates"),
                        ("vessels", "Vascular tree")]:
        m = maps.get(name)
        if m is None or (m > 0).sum() == 0:
            continue
        if m.shape[:2] != cam.shape[:2]:
            m = cv2.resize(m, (cam.shape[1], cam.shape[0]),
                           interpolation=cv2.INTER_NEAREST)
        lesion_px = (m > 0) & high
        coverage = float(lesion_px.sum()) / float((m > 0).sum())
        evidence.append({"lesion": label, "cam_coverage": round(coverage, 3),
                         "pixels": int((m > 0).sum()),
                         "supports_decision": bool(coverage >= 0.3)})
    return evidence


def make_overlay(img_bgr: np.ndarray, cam: np.ndarray, alpha: float = 0.45) -> np.ndarray:
    heat = cv2.applyColorMap((cam * 255).astype(np.uint8), cv2.COLORMAP_JET)
    return cv2.addWeighted(img_bgr, 1 - alpha, heat, alpha, 0)


def build_explanation(img_bgr: np.ndarray, cam_referable: np.ndarray,
                      cam_grade: np.ndarray, structures: dict,
                      prediction: dict, case_id: str = "case") -> dict:
    """Assemble the human-in-the-loop validation package (<30 s review)."""
    grade = int(prediction["grade"][0])
    ref_prob = float(prediction["referable_prob"][0])
    evidence = lesion_evidence(structures["maps"], cam_referable)

    supporting = [e for e in evidence if e["supports_decision"]]
    rationale = [
        f"Model grade: {grade} ({DR_STAGE_NAMES[grade]}) with referable-DR "
        f"probability {ref_prob:.2f} (calibrated).",
        f"Lesion counts: {structures['microaneurysms']} microaneurysms, "
        f"{structures['hemorrhages']} hemorrhages, "
        f"exudate area {structures['exudate_area_px']} px.",
    ]
    if structures.get("nv_suspicion"):
        rationale.append("Neovascularization suspicion: elevated peripapillary "
                         "vessel density + tortuosity.")
    if supporting:
        rationale.append("Grad-CAM attention co-localizes with "
                         + ", ".join(e["lesion"] for e in supporting) + ".")
    else:
        rationale.append("Warning: weak co-localization between attention and "
                         "lesion maps - recommend human review.")

    overlay = make_overlay(img_bgr, cam_referable)
    return {
        "case_id": case_id,
        "grade": grade,
        "grade_name": DR_STAGE_NAMES[grade],
        "grade_probs": np.round(prediction["probs"][0], 4).tolist(),
        "referable": bool(prediction["referable"][0]),
        "referable_prob": round(ref_prob, 4),
        "evidence": evidence,
        "rationale": rationale,
        "overlay_bgr": overlay,
        "cam_referable": cam_referable,
        "cam_grade": cam_grade,
    }
