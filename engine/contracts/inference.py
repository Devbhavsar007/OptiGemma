"""Multi-disease screening model contracts and registry."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol, runtime_checkable


@dataclass
class ScreeningPrediction:
    disease: str  # e.g., "diabetic_retinopathy", "glaucoma", "hypertensive_retinopathy"
    stage: int  # 0 to 4 (or binary/categorical severity)
    stage_name: str
    confidence: float  # 0.0 to 100.0
    probabilities: dict[str, float] = field(default_factory=dict)
    severity: str = "none"  # "none", "mild", "moderate", "severe", "proliferative"
    model_name: str = "unknown"
    model_version: str = "1.0.0"
    needs_review: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class DiseaseScreeningModel(Protocol):
    """
    Common inference contract for all disease screening models.
    Supports pluggable disease classifiers without modifying application logic.
    """

    @property
    def disease(self) -> str:
        """Name of the targeted disease (e.g. diabetic_retinopathy)."""
        ...

    @property
    def version(self) -> str:
        """Version string of the weights/architecture."""
        ...

    def predict(self, image: Any) -> ScreeningPrediction:
        """Run inference on the preprocessed image frame or tensor."""
        ...


class ScreeningRegistry:
    """Pluggable registry for multi-disease screening models."""

    def __init__(self) -> None:
        self._models: dict[str, DiseaseScreeningModel] = {}

    def register(self, model: DiseaseScreeningModel) -> None:
        self._models[model.disease.lower()] = model

    def get(self, disease: str) -> DiseaseScreeningModel | None:
        return self._models.get(disease.lower())

    def list_supported_diseases(self) -> list[str]:
        return sorted(list(self._models.keys()))

    def screen_all(self, image: Any) -> list[ScreeningPrediction]:
        """Execute all registered disease models sequentially on the image."""
        results = []
        for _, model in sorted(self._models.items()):
            results.append(model.predict(image))
        return results
