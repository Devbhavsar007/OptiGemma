"""Safety and Confidence Engine protocol and contracts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass
class SafetyDecision:
    status: str  # "PROCEED" | "UNCERTAIN" | "RETAKE_REQUIRED"
    overall_quality_score: float  # 0.0 to 1.0
    model_confidence: float  # 0.0 to 100.0
    reasons: list[str] = field(default_factory=list)
    human_review_required: bool = False
    retake_guidance: str | None = None
    disclaimer: str = (
        "DrishtiAI is an assistive screening platform and clinical decision support system. "
        "It does NOT provide a definitive diagnosis. Clinical oversight by an ophthalmologist is required."
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class SafetyEngine(Protocol):
    """Protocol evaluating image quality, model agreement, and prediction confidence."""

    def evaluate(
        self,
        *,
        quality_assessment: dict[str, Any],
        primary_prediction: dict[str, Any],
        secondary_prediction: dict[str, Any] | None = None,
    ) -> SafetyDecision:
        ...
