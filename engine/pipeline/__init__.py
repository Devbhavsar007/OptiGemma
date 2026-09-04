"""
DrishtiAI / OptiGemma DR Screening Pipeline — Two-Tiered Architecture.

Module 1: engine.pipeline.iqa            — quality gate + adaptive enhancement
Module 2: engine.pipeline.structures     — disc/fovea, vessels, MA/exudates/hemorrhages/NV
Module 3: engine.pipeline.grading        — ICDR 0-4 ordinal grading + referable-DR decision
Module 4: engine.pipeline.explain        — Grad-CAM + HiResCAM + quantitative localization scoring
Module 5: engine.pipeline.medgemma_report— Tier 2 MedGemma multimodal vision-language narrative
Runner  : engine.pipeline.two_tier_runner— Two-tiered pipeline orchestration + CLI
"""

from engine.pipeline.iqa import run_iqa
from engine.pipeline.structures import extract_structures
from engine.pipeline.runner import run_pipeline
from engine.pipeline.hirescam import HiResCAM, DualCAM, compute_localization_score
from engine.pipeline.medgemma_report import generate_medgemma_report
from engine.pipeline.two_tier_runner import run_two_tier_pipeline

__all__ = [
    "run_iqa",
    "extract_structures",
    "run_pipeline",
    "HiResCAM",
    "DualCAM",
    "compute_localization_score",
    "generate_medgemma_report",
    "run_two_tier_pipeline",
]
