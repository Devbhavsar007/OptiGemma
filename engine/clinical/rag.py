"""Grounded Medical RAG (Retrieval-Augmented Guidance) Engine for DrishtiAI."""

from __future__ import annotations

import os
import re
import json
from typing import Any
from engine.contracts.intelligence import (
    ClinicalCitation,
    GroundedResponse,
    MedicalIntelligenceProvider,
)

GUIDELINES_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "guidelines",
    "retinal_guidelines.json",
)


class MedicalRAGRetriever(MedicalIntelligenceProvider):
    """
    Offline-capable, grounded clinical guideline retrieval engine.
    Matches queries and patient screening contexts against authoritative peer-reviewed
    retinal practice guidelines (AIOS, ICMR, WHO, ICO).
    Never manufactures clinical certainty; returns explicit insufficient-evidence fallback.
    """

    def __init__(self, corpus_path: str = GUIDELINES_PATH) -> None:
        self.corpus_path = corpus_path
        self._corpus: list[dict[str, Any]] = []
        self._load_corpus()

    def _load_corpus(self) -> None:
        if os.path.exists(self.corpus_path):
            try:
                with open(self.corpus_path, "r", encoding="utf-8") as f:
                    self._corpus = json.load(f)
            except Exception:
                self._corpus = []
        else:
            self._corpus = []

    def _tokenize(self, text: str) -> set[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower())
        # Filter basic stopwords
        stopwords = {
            "a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or",
            "is", "are", "was", "were", "what", "how", "when", "with", "patient",
            "clinical", "can", "be", "this", "that"
        }
        return {w for w in words if len(w) > 1 and w not in stopwords}

    def query(
        self,
        query: str,
        clinical_context: dict[str, Any] | None = None
    ) -> GroundedResponse:
        """
        Execute grounded clinical retrieval using user/clinician query and optional patient context.
        """
        if not self._corpus:
            return GroundedResponse(
                answer="No clinical guidelines database available in local storage.",
                citations=[],
                confidence=0.0,
                evidence_found=False,
            )

        query_tokens = self._tokenize(query)
        ctx = clinical_context or {}
        context_stage = ctx.get("stage")
        hba1c = float(ctx.get("hba1c") or 0.0)

        scored_docs: list[tuple[float, dict[str, Any]]] = []

        for doc in self._corpus:
            score = 0.0
            doc_keywords = set(k.lower() for k in doc.get("keywords", []))
            title_tokens = self._tokenize(doc.get("title", ""))
            summary_tokens = self._tokenize(doc.get("summary", ""))
            evidence_tokens = self._tokenize(doc.get("evidence_text", ""))

            # Token overlap scoring
            for t in query_tokens:
                if t in doc_keywords:
                    score += 0.35
                if t in title_tokens:
                    score += 0.25
                if t in summary_tokens:
                    score += 0.15
                if t in evidence_tokens:
                    score += 0.10

            # Stage applicability boosting
            if context_stage is not None:
                applicable_stages = doc.get("stage_applicability", [])
                if int(context_stage) in applicable_stages:
                    score += 0.40

            # Glycemic risk boosting
            if hba1c >= 8.0 and any(k in doc_keywords for k in ["hba1c", "glycemic control"]):
                score += 0.30

            if score > 0.15:
                scored_docs.append((score, doc))

        # Sort by relevance descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        # Fallback if no relevant clinical evidence found
        if not scored_docs or scored_docs[0][0] < 0.25:
            return GroundedResponse(
                answer=(
                    "Insufficient evidence in the curated clinical guidelines for this specific query. "
                    "Please refer directly to an ophthalmologist or official clinical protocols."
                ),
                citations=[],
                confidence=0.0,
                evidence_found=False,
            )

        # Build grounded synthesis from top matches (up to 3)
        top_matches = scored_docs[:3]
        citations: list[ClinicalCitation] = []
        synthesized_points: list[str] = []

        for score, doc in top_matches:
            citations.append(
                ClinicalCitation(
                    id=doc["id"],
                    title=doc["title"],
                    organization=doc["organization"],
                    year=doc["year"],
                    section=doc["section"],
                    citation=doc["citation"],
                    relevance_score=round(min(1.0, score), 2),
                )
            )
            synthesized_points.append(
                f"[{doc['organization']} - {doc['section']}]: {doc['summary']}"
            )

        grounded_answer = (
            "Grounded Clinical Evidence Summary:\n\n"
            + "\n\n".join(synthesized_points)
        )

        return GroundedResponse(
            answer=grounded_answer,
            citations=citations,
            confidence=round(min(1.0, top_matches[0][0] / 1.5), 2),
            evidence_found=True,
            metadata={"top_score": round(top_matches[0][0], 2), "total_sources": len(citations)},
        )
