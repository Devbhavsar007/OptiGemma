"""Medical Intelligence and RAG contracts for DrishtiAI."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass
class ClinicalCitation:
    id: str
    title: str
    organization: str
    year: int
    section: str
    citation: str
    relevance_score: float = 0.0


@dataclass
class GroundedResponse:
    answer: str
    citations: list[ClinicalCitation] = field(default_factory=list)
    confidence: float = 0.0  # 0.0 to 1.0 grounded relevance
    evidence_found: bool = True
    disclaimer: str = (
        "Medical guidance is retrieved from published clinical practice guidelines (AIOS, ICMR, WHO, ICO). "
        "It is provided for clinical decision support and does NOT constitute an independent medical prescription."
    )
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class MedicalIntelligenceProvider(Protocol):
    """Protocol for grounded clinical retrieval and summary generation."""

    def query(
        self,
        query: str,
        clinical_context: dict[str, Any] | None = None
    ) -> GroundedResponse:
        ...
