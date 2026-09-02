"""
DrishtiAI DR Screening Pipeline — 5-module architecture per SIH problem statement.

Module 1: engine.pipeline.iqa        — quality gate + adaptive enhancement
Module 2: engine.pipeline.structures — disc/fovea, vessels, MA/exudates/hemorrhages/NV
Module 3: engine.pipeline.grading    — ICDR 0-4 ordinal grading + referable-DR decision
Module 4: engine.pipeline.explain    — Grad-CAM + lesion evidence + calibrated report
Runner  : engine.pipeline.runner     — full-pipeline orchestration + CLI
"""

from engine.pipeline.iqa import run_iqa
from engine.pipeline.structures import extract_structures
from engine.pipeline.runner import run_pipeline

__all__ = ["run_iqa", "extract_structures", "run_pipeline"]
