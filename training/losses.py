"""
Losses, clinical metrics and calibration utilities for the DR grading loop.

- OrdinalReferableLoss : CORN-style ordinal BCE + referable BCE (+ optional focal)
- quadratic_weighted_kappa : ICDR benchmark metric (no sklearn dependency)
- sensitivity / specificity for referable DR (level >= 2)
- fit_temperature : temperature scaling on validation logits (Guo et al. 2017)
- search_threshold : maximise sensitivity subject to specificity >= min_spec
- expected_calibration_error : reliability of the calibrated confidence
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

from engine.pipeline.grading import ordinal_loss


class OrdinalReferableLoss(nn.Module):
    """Joint loss: ordinal (CORN-style) + referable-DR binary (+ optional focal)."""

    def __init__(self, w_ordinal: float = 1.0, w_referable: float = 0.7,
                 focal_gamma: float = 2.0, pos_weight: float | None = None):
        super().__init__()
        self.w_ordinal = w_ordinal
        self.w_referable = w_referable
        self.focal_gamma = focal_gamma
        self.register_buffer("pos_weight", torch.tensor(pos_weight if pos_weight else 1.0))

    def forward(self, ord_logits: torch.Tensor, ref_logits: torch.Tensor,
                targets: torch.Tensor) -> dict:
        loss_ord = ordinal_loss(ord_logits, targets)

        ref_target = (targets >= 2).float()
        bce = F.binary_cross_entropy_with_logits(
            ref_logits, ref_target,
            pos_weight=self.pos_weight.to(ref_logits.device), reduction="none")
        pt = torch.exp(-bce)
        loss_ref = ((1 - pt) ** self.focal_gamma * bce).mean()

        total = self.w_ordinal * loss_ord + self.w_referable * loss_ref
        return {"total": total, "ordinal": loss_ord.detach(),
                "referable": loss_ref.detach()}


# ── Clinical metrics ────────────────────────────────────────────────────────
def referable_sens_spec(y_true: np.ndarray, ref_prob: np.ndarray,
                        threshold: float) -> tuple[float, float]:
    """Sensitivity/specificity for referable DR (true level >= 2)."""
    ref_true = (y_true >= 2)
    pred = ref_prob >= threshold
    tp = float((pred & ref_true).sum())
    fn = float((~pred & ref_true).sum())
    tn = float((~pred & ~ref_true).sum())
    fp = float((pred & ~ref_true).sum())
    sens = tp / max(tp + fn, 1.0)
    spec = tn / max(tn + fp, 1.0)
    return sens, spec


def quadratic_weighted_kappa(y_true: np.ndarray, y_pred: np.ndarray,
                             num_classes: int = 5) -> float:
    y_true, y_pred = np.asarray(y_true, int), np.asarray(y_pred, int)
    o = np.zeros((num_classes, num_classes), dtype=np.float64)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            o[t, p] += 1
    o /= max(o.sum(), 1.0)
    w = np.zeros_like(o)
    for i in range(num_classes):
        for j in range(num_classes):
            w[i, j] = (i - j) ** 2 / (num_classes - 1) ** 2
    t_true = o.sum(axis=1, keepdims=True)
    t_pred = o.sum(axis=0, keepdims=True)
    e = np.outer(t_true, t_pred)
    denom = max(float((w * e).sum()), 1e-9)
    return float(1.0 - (w * o).sum() / denom)


def expected_calibration_error(conf: np.ndarray, correct: np.ndarray,
                               n_bins: int = 15) -> float:
    bins = np.clip((conf * n_bins).astype(int), 0, n_bins - 1)
    ece = 0.0
    for b in range(n_bins):
        m = bins == b
        if m.sum() == 0:
            continue
        ece += (m.mean()) * abs(conf[m].mean() - correct[m].mean())
    return float(ece)


# ── Calibration ─────────────────────────────────────────────────────────────
def fit_temperature(ord_logits: np.ndarray, ref_logits: np.ndarray,
                    y_true: np.ndarray, max_iter: int = 100) -> float:
    """Fit a single temperature on validation NLL (grade + referable)."""
    t = torch.nn.Parameter(torch.ones(1))
    ol = torch.tensor(ord_logits, dtype=torch.float32)
    rl = torch.tensor(ref_logits, dtype=torch.float32)
    yt = torch.tensor(y_true, dtype=torch.long)
    opt = torch.optim.LBFGS([t], lr=0.1, max_iter=max_iter)

    def closure():
        opt.zero_grad()
        p_gt = torch.cumprod(torch.sigmoid(ol / t), dim=1)
        ones = torch.ones_like(p_gt[:, :1])
        zeros = torch.zeros_like(p_gt[:, :1])
        cum = torch.cat([ones, p_gt, zeros], dim=1)
        probs = (cum[:, :-1] - cum[:, 1:]).clamp_min(1e-9)
        nll_o = -torch.log(probs.gather(1, yt.unsqueeze(1))).mean()

        ref_t = (yt >= 2).float()
        nll_r = F.binary_cross_entropy_with_logits(rl / t, ref_t)
        loss = nll_o + 0.7 * nll_r
        loss.backward()
        return loss

    opt.step(closure)
    return float(t.clamp(0.05, 10.0).item())


def search_threshold(y_true: np.ndarray, ref_prob: np.ndarray,
                     min_specificity: float = 0.85) -> tuple[float, float, float]:
    """Maximise sensitivity subject to specificity >= min_specificity."""
    best = (0.5, 0.0, 0.0)
    for thr in np.arange(0.05, 0.96, 0.01):
        sens, spec = referable_sens_spec(y_true, ref_prob, float(thr))
        if spec >= min_specificity and sens > best[1]:
            best = (float(thr), sens, spec)
    return best
