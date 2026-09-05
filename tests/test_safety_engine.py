import unittest
from engine.clinical.safety import evaluate_safety


class TestSafetyEngine(unittest.TestCase):
    def test_rejected_quality_demands_retake(self):
        decision = evaluate_safety(
            quality_assessment={
                "decision": "REJECT",
                "quality_score": 0.28,
                "feedback": ["Severe blur detected", "Insufficient illumination"],
            },
            primary_prediction={"stage": 1, "confidence": 75.0},
        )
        self.assertEqual(decision.status, "RETAKE_REQUIRED")
        self.assertTrue(decision.human_review_required)
        self.assertIn("QUALITY_REJECTED", decision.reasons)
        self.assertIn("Severe blur detected", decision.retake_guidance or "")

    def test_borderline_quality_sets_uncertain_with_guidance(self):
        decision = evaluate_safety(
            quality_assessment={
                "decision": "ENHANCE",
                "quality_score": 0.55,
                "feedback": [],
            },
            primary_prediction={"stage": 0, "confidence": 88.0},
        )
        self.assertEqual(decision.status, "UNCERTAIN")
        self.assertTrue(decision.human_review_required)
        self.assertIn("QUALITY_BORDERLINE", decision.reasons)

    def test_low_confidence_requires_review(self):
        decision = evaluate_safety(
            quality_assessment={"decision": "ACCEPT", "quality_score": 0.92},
            primary_prediction={"stage": 0, "confidence": 58.0},
        )
        self.assertEqual(decision.status, "UNCERTAIN")
        self.assertIn("LOW_MODEL_CONFIDENCE", decision.reasons)
        self.assertTrue(decision.human_review_required)

    def test_model_disagreement_flags_uncertainty(self):
        decision = evaluate_safety(
            quality_assessment={"decision": "ACCEPT", "quality_score": 0.95},
            primary_prediction={"stage": 1, "confidence": 92.0},
            secondary_prediction={"stage": 3, "confidence": 89.0},
        )
        self.assertEqual(decision.status, "UNCERTAIN")
        self.assertIn("MODEL_DISAGREEMENT_SIGNIFICANT", decision.reasons)

    def test_high_quality_high_confidence_proceeds(self):
        decision = evaluate_safety(
            quality_assessment={"decision": "ACCEPT", "quality_score": 0.94},
            primary_prediction={"stage": 0, "confidence": 94.5},
        )
        self.assertEqual(decision.status, "PROCEED")
        self.assertFalse(decision.human_review_required)
        self.assertIn("SCREENING_VALID", decision.reasons)


if __name__ == "__main__":
    unittest.main()
