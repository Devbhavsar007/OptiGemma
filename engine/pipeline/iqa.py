"""
Module 1 — Image Quality Assessment (IQA) & Adaptive Enhancement.

Python mirror of the MATLAB stage (Image Processing Toolbox equivalents):
    FOV mask        ~ imbinarize(I(:,:,1)) + imfill + imopen
    focus metric    ~ var(laplacian(I_green(fov)))  normalized per pixel
    illumination    ~ mean / std of green channel inside FOV
    enhancement     ~ adapthisteq (CLAHE) + background-division
                      normalization (imopen with large disk) + fastNlMeans

Decision policy per problem statement:
    ACCEPT   — image adequate, pass through
    ENHANCE  — borderline: apply adaptive enhancement, re-score, accept if pass
    REJECT   — ungradeable: emit specific recapture feedback to the operator
"""

from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass, field, asdict


@dataclass
class IQAResult:
    decision: str                 # ACCEPT | ENHANCE | REJECT
    quality_score: float          # 0..1 composite
    focus: float
    brightness: float
    contrast: float
    fov_ratio: float
    feedback: list = field(default_factory=list)
    metrics: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# Thresholds for the 512px analysis scale (real fundus cameras, 8-bit)
FOCUS_ACCEPT, FOCUS_MIN = 60.0, 25.0
BRIGHT_RANGE = (40.0, 200.0)
CONTRAST_MIN = 12.0
FOV_MIN = 0.50


def estimate_fov(img_bgr: np.ndarray) -> np.ndarray:
    """Binary field-of-view mask of the retinal circle."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 12, 255, cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return np.zeros_like(mask)
    largest = max(contours, key=cv2.contourArea)
    clean = np.zeros_like(mask)
    cv2.drawContours(clean, [largest], -1, 255, -1)
    return clean


def focus_score(img_bgr: np.ndarray, fov: np.ndarray) -> float:
    """Variance of Laplacian on the contrast-normalized (CLAHE) green channel
    inside the FOV — focus measurement decoupled from exposure/contrast."""
    green = img_bgr[:, :, 1]
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    eq = clahe.apply(green).astype(np.float32)
    lap = cv2.Laplacian(eq, cv2.CV_32F, ksize=3)
    return float(lap[fov > 0].var())


def illumination_stats(img_bgr: np.ndarray, fov: np.ndarray) -> tuple[float, float]:
    green = img_bgr[:, :, 1]
    px = green[fov > 0].astype(np.float32)
    if px.size == 0:
        return 0.0, 0.0
    return float(px.mean()), float(px.std())


def enhance(img_bgr: np.ndarray) -> np.ndarray:
    """CLAHE on L-channel + illumination normalization + edge-preserving denoise."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    # Illumination normalization: divide by large-kernel background estimate
    bg = cv2.morphologyEx(l, cv2.MORPH_OPEN,
                          cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51)))
    bg = cv2.GaussianBlur(bg, (0, 0), 21)
    l_norm = cv2.divide(l, bg, scale=255)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_eq = clahe.apply(l_norm)

    out = cv2.cvtColor(cv2.merge([l_eq, a, b]), cv2.COLOR_LAB2BGR)
    return cv2.fastNlMeansDenoisingColored(out, None, 4, 4, 7, 21)


def _analysis_scale(img_bgr: np.ndarray) -> np.ndarray:
    """Normalize to a fixed analysis resolution so thresholds are
    resolution-independent (portable cameras vary from 1-12 MP)."""
    h, w = img_bgr.shape[:2]
    scale = 512.0 / max(h, w)
    if scale < 1.0:
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)),
                             interpolation=cv2.INTER_AREA)
    elif scale > 1.0:
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)),
                             interpolation=cv2.INTER_CUBIC)
    return img_bgr


def _score(img_bgr: np.ndarray) -> tuple[IQAResult, np.ndarray]:
    metric_img = _analysis_scale(img_bgr)
    fov = estimate_fov(metric_img)
    h, w = fov.shape
    fov_ratio = float((fov > 0).sum()) / float(h * w)
    focus = focus_score(metric_img, fov)
    bright, contrast = illumination_stats(metric_img, fov)

    checks = {
        "focus_ok": focus >= FOCUS_ACCEPT,
        "brightness_ok": BRIGHT_RANGE[0] <= bright <= BRIGHT_RANGE[1],
        "contrast_ok": contrast >= CONTRAST_MIN,
        "fov_ok": fov_ratio >= FOV_MIN,
    }
    score = float(np.mean([checks["focus_ok"], checks["brightness_ok"],
                           checks["contrast_ok"], checks["fov_ok"]]))
    result = IQAResult(decision="ACCEPT", quality_score=score, focus=focus,
                       brightness=bright, contrast=contrast, fov_ratio=fov_ratio,
                       metrics=checks)
    return result, fov


def _feedback_for(res: IQAResult) -> list:
    fb = []
    m = res.metrics
    if not m.get("focus_ok"):
        fb.append("Image out of focus - re-align the fundus camera and re-capture.")
    if not m.get("brightness_ok"):
        if res.brightness < BRIGHT_RANGE[0]:
            fb.append("Image too dark - increase flash intensity / media opacity.")
        else:
            fb.append("Image over-exposed - reduce flash intensity.")
    if not m.get("contrast_ok"):
        fb.append("Low contrast - check cataract/media opacity, re-capture.")
    if not m.get("fov_ok"):
        fb.append("Insufficient field of view - center the optic disc and re-capture.")
    return fb or ["Ungradeable image - re-capture."]


def run_iqa(img_bgr: np.ndarray, allow_enhance: bool = True) -> tuple[IQAResult, np.ndarray]:
    """Full Module-1 gate. Returns (result, processed_image_or_None)."""
    res, fov = _score(img_bgr)

    hard_fail = (res.focus < FOCUS_MIN or res.fov_ratio < 0.30
                 or res.brightness < 15 or res.contrast < 8)

    if res.quality_score == 1.0 and not hard_fail:
        return res, img_bgr

    if allow_enhance and not hard_fail:
        enhanced = enhance(img_bgr)
        res2, _ = _score(enhanced)
        if res2.quality_score > res.quality_score:
            res2.decision = "ENHANCE"
            res2.feedback = ["Borderline image - adaptive enhancement applied (CLAHE + "
                             "illumination normalization + denoise)."]
            return res2, enhanced

    res.decision = "REJECT"
    res.feedback = _feedback_for(res)
    return res, None
