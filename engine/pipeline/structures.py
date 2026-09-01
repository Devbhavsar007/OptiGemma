"""
Module 2 — Retinal Structure Segmentation & Lesion Detection.

Extracts clinically relevant structures per the problem statement:
    - optic disc / fovea localization
    - vessel segmentation (multi-scale Frangi vesselness, MATLAB: imfrangi)
    - microaneurysm detection      (top-hat + size/shape gating, sub-pixel upsampled)
    - exudate segmentation         (yellow-white threshold + disc exclusion)
    - hemorrhage classification    (dark-red blobs larger than MA)
    - neovascularization suspicion (peripapillary vessel density + tortuosity)

Outputs a structured dict consumed by grading (late-fusion features) and the
explainability module (lesion-level evidence).
"""

from __future__ import annotations

import cv2
import numpy as np
from dataclasses import dataclass, field, asdict


@dataclass
class StructureResult:
    disc_center: tuple | None = None
    disc_radius: int = 0
    fovea_center: tuple | None = None
    vessel_mask: np.ndarray | None = None
    vessel_density: float = 0.0
    tortuosity: float = 0.0
    microaneurysms: int = 0
    hemorrhages: int = 0
    exudate_area_px: int = 0
    nv_suspicion: bool = False
    lesion_features: np.ndarray | None = None   # fixed-length vector for late fusion
    maps: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("vessel_mask", None)
        d.pop("maps", None)
        d.pop("lesion_features", None)
        if d.get("disc_center") is not None:
            d["disc_center"] = list(map(float, d["disc_center"]))
        if d.get("fovea_center") is not None:
            d["fovea_center"] = list(map(float, d["fovea_center"]))
        return d


# ── Vessels: multi-scale Frangi vesselness (Hessian eigenvalue based) ──────
def _hessian_eigenvalues(img_f: np.ndarray, sigma: float) -> tuple[np.ndarray, np.ndarray]:
    ksize = int(np.ceil(sigma * 3) * 2 + 1)
    smoothed = cv2.GaussianBlur(img_f, (ksize, ksize), sigma)
    gxx = cv2.Sobel(smoothed, cv2.CV_32F, 2, 0, ksize=3) * (sigma ** 2)
    gyy = cv2.Sobel(smoothed, cv2.CV_32F, 0, 2, ksize=3) * (sigma ** 2)
    gxy = cv2.Sobel(smoothed, cv2.CV_32F, 1, 1, ksize=3) * (sigma ** 2)

    tr = gxx + gyy
    disc = np.sqrt(np.maximum((gxx - gyy) ** 2 / 4 + gxy ** 2, 0))
    l1 = tr / 2 + disc      # larger |eigenvalue|
    l2 = tr / 2 - disc
    return l1, l2


def frangi_vesselness(img_bgr: np.ndarray, sigmas=(1.0, 1.6, 2.5, 4.0)) -> np.ndarray:
    """Standard Frangi filter for BRIGHT ridges on the inverted green channel
    (vessels are darker than background -> bright after inversion).
    Returns vesselness in [0, 255]."""
    green = cv2.GaussianBlur(img_bgr[:, :, 1].astype(np.float32), (5, 5), 1.0)
    inv = 255.0 - green
    inv /= max(inv.max(), 1e-6)

    beta = 0.5                       # second-order structure sensitivity
    out = np.zeros_like(inv)

    for sigma in sigmas:
        l1, l2 = _hessian_eigenvalues(inv, sigma)
        s = np.sqrt(l1 ** 2 + l2 ** 2)
        c = 0.5 * float(s.max()) + 1e-9          # adaptive blob sensitivity
        rb = np.divide(np.abs(l1), np.maximum(np.abs(l2), 1e-9))
        vessel = np.exp(-(rb ** 2) / (2 * beta ** 2)) * (1 - np.exp(-(s ** 2) / (2 * c ** 2)))
        vessel[l2 > 0] = 0            # bright ridges require both eigenvalues < 0
        out = np.maximum(out, vessel)

    out = out / max(out.max(), 1e-9)
    return (out * 255).astype(np.uint8)


def _tortuosity(vessel_mask: np.ndarray) -> float:
    """Mean chord-to-arc ratio of skeleton branches (higher = more tortuous)."""
    thin = cv2.ximgproc.thinning(vessel_mask) if hasattr(cv2, "ximgproc") else \
        cv2.erode(vessel_mask, np.ones((3, 3), np.uint8))
    num, labels, stats, _ = cv2.connectedComponentsWithStats(thin)
    ratios = []
    for i in range(1, min(num, 30)):
        x, y, w, h, area = stats[i]
        if area < 30:
            continue
        crop = (labels[y:y + h, x:x + w] == i)
        arc = int(crop.sum())
        chord = float(np.hypot(h, w)) + 1e-6
        ratios.append(arc / chord)
    return float(np.mean(ratios)) if ratios else 0.0


def localize_disc_fovea(img_bgr: np.ndarray) -> tuple[tuple, int, tuple | None]:
    """Optic disc = brightest elliptical blob (red channel, large sigma).
    Fovea = darkest local minimum ~2.5 DD temporal to the disc."""
    h, w = img_bgr.shape[:2]
    red = cv2.GaussianBlur(img_bgr[:, :, 2].astype(np.float32), (0, 0), 9)
    dd = int(0.09 * np.hypot(h, w))     # approx disc diameter in px

    # Disc: convolve with disc-sized box, take maximum
    kernel = np.ones((dd, dd), np.float32) / (dd * dd)
    resp = cv2.filter2D(red, -1, kernel)
    _, _, _, max_loc = cv2.minMaxLoc(resp)
    disc_center = (max_loc[0] + dd // 2, max_loc[1] + dd // 2)
    disc_radius = dd // 2

    # Fovea: search window temporal to disc (mirror if disc on right side)
    cx, cy = disc_center
    sign = -1 if cx < w // 2 else 1
    fx = int(np.clip(cx + sign * 2.4 * dd, 0, w - 1))
    green = cv2.GaussianBlur(img_bgr[:, :, 1].astype(np.float32), (0, 0), 5)
    y0, y1 = max(0, cy - dd), min(h, cy + dd)
    x0, x1 = max(0, fx - dd), min(w, fx + dd)
    roi = green[y0:y1, x0:x1]
    fovea = None
    if roi.size:
        dy, dx = np.unravel_index(np.argmin(roi), roi.shape)
        fovea = (x0 + int(dx), y0 + int(dy))
    return disc_center, disc_radius, fovea


def detect_microaneurysms(img_bgr: np.ndarray, fov: np.ndarray,
                          disc_center: tuple, disc_radius: int) -> tuple[int, np.ndarray]:
    """Top-hat on green channel at 2x upsample -> sub-pixel MA candidates."""
    up = cv2.resize(img_bgr, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    green = up[:, :, 1]

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    tophat = cv2.morphologyEx(green, cv2.MORPH_TOPHAT, kernel)
    _, bw = cv2.threshold(tophat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    fov_up = cv2.resize(fov, (up.shape[1], up.shape[0]), interpolation=cv2.INTER_NEAREST)
    bw = cv2.bitwise_and(bw, fov_up)

    # Exclude optic disc neighbourhood
    if disc_center:
        cv2.circle(bw, (disc_center[0] * 2, disc_center[1] * 2),
                   int(disc_radius * 2.4), 0, -1)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(bw)
    count_map = np.zeros_like(bw)
    for i in range(1, num):
        area = stats[i, cv2.CC_STAT_AREA]
        bw_, bh_ = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        aspect = max(bw_, bh_) / max(1, min(bw_, bh_))
        # MAs: tiny, roughly round dots (3-30 px @2x, aspect < 2.2)
        if 3 <= area <= 30 and aspect < 2.2:
            x, y = stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_TOP]
            sub = labels[y:y + bh_, x:x + bw_]
            count_map[y:y + bh_, x:x + bw_][sub == i] = 255
    ma_count = int(len(np.unique(cv2.connectedComponents(count_map)[1])) - 1)
    down = cv2.resize(count_map, (img_bgr.shape[1], img_bgr.shape[0]),
                      interpolation=cv2.INTER_NEAREST)
    return ma_count, down


def detect_hemorrhages(img_bgr: np.ndarray, fov: np.ndarray,
                       disc_center: tuple, disc_radius: int) -> tuple[int, np.ndarray]:
    """Dark-red blobs larger and less round than microaneurysms."""
    b, g, r = cv2.split(img_bgr.astype(np.int16))
    dark_red = ((r > 40) & (r < 160) & (r - g > 18) & (g - b > -10)).astype(np.uint8) * 255
    dark_red = cv2.bitwise_and(dark_red, fov)
    dark_red = cv2.morphologyEx(dark_red, cv2.MORPH_OPEN,
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))

    if disc_center:
        cv2.circle(dark_red, disc_center, int(disc_radius * 1.6), 0, -1)

    num, labels, stats, _ = cv2.connectedComponentsWithStats(dark_red)
    hm_map = np.zeros_like(dark_red)
    for i in range(1, num):
        area = stats[i, cv2.CC_STAT_AREA]
        if 30 <= area <= 2500:      # bigger than MA, smaller than large bleeds
            hm_map[labels == i] = 255
    return int(len(np.unique(cv2.connectedComponents(hm_map)[1])) - 1), hm_map


def segment_exudates(img_bgr: np.ndarray, fov: np.ndarray,
                     disc_center: tuple, disc_radius: int) -> tuple[int, np.ndarray]:
    """Yellow-white lipid deposits: high (R+G)/2 relative to B, after closing."""
    b, g, r = cv2.split(img_bgr.astype(np.float32))
    ex = np.clip(((r + g) / 2) - b, 0, 255).astype(np.uint8)
    ex = cv2.morphologyEx(ex, cv2.MORPH_CLOSE,
                          cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    _, bw = cv2.threshold(ex, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    bw = cv2.bitwise_and(bw, fov)
    bw = cv2.morphologyEx(bw, cv2.MORPH_OPEN,
                          cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    if disc_center:
        cv2.circle(bw, disc_center, int(disc_radius * 1.7), 0, -1)
    area = int((bw > 0).sum())
    return area, bw


def detect_neovascularization(vessel_mask: np.ndarray, disc_center: tuple,
                              disc_radius: int, base_density: float,
                              base_tortuosity: float) -> bool:
    """NV suspicion: vessel density + tortuosity spike on the disc rim."""
    if disc_center is None:
        return False
    rim = np.zeros_like(vessel_mask)
    cv2.circle(rim, disc_center, int(disc_radius * 1.8), 255, int(max(4, disc_radius * 0.5)))
    rim_px = vessel_mask[(rim > 0) & (vessel_mask > 0)]
    rim_density = float(rim_px.size) / max(float((rim > 0).sum()), 1.0)
    return bool(rim_density > 1.6 * max(base_density, 1e-6)
                and base_tortuosity > 1.3)


def extract_structures(img_bgr: np.ndarray, fov: np.ndarray | None = None) -> StructureResult:
    """Run the full Module-2 stack on an (already quality-gated) BGR image.
    Analysis is capped at 512px max side for clinical latency budgets."""
    if max(img_bgr.shape[:2]) > 512:
        scale = 512.0 / max(img_bgr.shape[:2])
        img_bgr = cv2.resize(img_bgr, None, fx=scale, fy=scale,
                             interpolation=cv2.INTER_AREA)
        if fov is not None:
            fov = cv2.resize(fov, (img_bgr.shape[1], img_bgr.shape[0]),
                             interpolation=cv2.INTER_NEAREST)
    if fov is None:
        fov = cv2.threshold(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY), 12,
                            255, cv2.THRESH_BINARY)[1]

    res = StructureResult()
    res.disc_center, res.disc_radius, res.fovea_center = localize_disc_fovea(img_bgr)

    vesselness = frangi_vesselness(img_bgr)
    _, vessel_mask = cv2.threshold(vesselness, 45, 255, cv2.THRESH_BINARY)
    vessel_mask = cv2.bitwise_and(vessel_mask, fov)
    res.vessel_mask = vessel_mask
    res.vessel_density = float((vessel_mask > 0).sum()) / max(float((fov > 0).sum()), 1.0)
    res.tortuosity = _tortuosity(vessel_mask)

    res.microaneurysms, ma_map = detect_microaneurysms(img_bgr, fov, res.disc_center, res.disc_radius)
    res.hemorrhages, hm_map = detect_hemorrhages(img_bgr, fov, res.disc_center, res.disc_radius)
    res.exudate_area_px, ex_map = segment_exudates(img_bgr, fov, res.disc_center, res.disc_radius)
    res.nv_suspicion = detect_neovascularization(vessel_mask, res.disc_center,
                                                 res.disc_radius, res.vessel_density,
                                                 res.tortuosity)
    res.maps = {"vessels": vessel_mask, "microaneurysms": ma_map,
                "hemorrhages": hm_map, "exudates": ex_map}

    # Fixed-length lesion-feature vector for late fusion in the grading model
    h, w = img_bgr.shape[:2]
    cx, cy = w / 2, h / 2

    def quad_counts(m: np.ndarray) -> list:
        out = [0, 0, 0, 0]  # upper-left, upper-right, lower-left, lower-right
        num, _, stats, centroids = cv2.connectedComponentsWithStats(m)
        for i in range(1, num):
            cxx, cyy = centroids[i]
            out[(1 if cyy >= cy else 0) * 2 + (1 if cxx >= cx else 0)] += 1
        return out

    res.lesion_features = np.array(
        [res.microaneurysms, res.hemorrhages,
         res.exudate_area_px / 1000.0, res.vessel_density * 100.0,
         res.tortuosity, float(res.nv_suspicion),
         *quad_counts(ma_map), *quad_counts(ex_map)],
        dtype=np.float32,
    )
    return res
