import unittest

from engine.clinical.progression import assess_progression_risk
from engine.clinical.referral import decide_referral


class TestProgressionPolicy(unittest.TestCase):
    def test_progression_with_limited_history_sets_uncertainty(self):
        result = assess_progression_risk(
            current_scan={"id": "scan-a", "stage": 1, "confidence": 88.5},
            previous_scans=[],
            patient_profile={"hba1c": 7.1, "diabetes_duration": 4, "sugar_level": 140},
        )

        self.assertEqual(result["predicted_risk"]["risk_category"], "LOW")
        self.assertIn(
            "limited longitudinal history",
            result["predicted_risk"]["uncertainty_flags"],
        )

    def test_progression_worsening_profile_can_be_high_risk(self):
        result = assess_progression_risk(
            current_scan={"id": "scan-new", "stage": 3, "confidence": 82.0},
            previous_scans=[{"id": "scan-old", "stage": 1, "confidence": 90.0}],
            patient_profile={"hba1c": 9.4, "diabetes_duration": 13, "sugar_level": 210},
        )

        self.assertEqual(result["predicted_risk"]["risk_category"], "HIGH")
        self.assertGreaterEqual(result["predicted_risk"]["six_month_risk"], 0.60)
        self.assertIn(
            "worsening retinal grade",
            result["predicted_risk"]["supporting_factors"],
        )


class TestReferralPolicy(unittest.TestCase):
    def test_referral_urgent_for_stage_4(self):
        triage = decide_referral(
            screening={"stage": 4, "confidence": 91.0},
            progression=None,
            doctor_review_present=False,
        )

        self.assertEqual(triage["priority"], "URGENT")
        self.assertIn("STAGE_PROLIFERATIVE", triage["reasonCodes"])
        self.assertTrue(triage["humanReviewRequired"])

    def test_referral_escalates_from_progression_risk(self):
        triage = decide_referral(
            screening={"stage": 1, "confidence": 85.0},
            progression={
                "predicted_risk": {
                    "risk_category": "MODERATE",
                    "uncertainty_flags": [],
                }
            },
            doctor_review_present=True,
        )

        self.assertEqual(triage["priority"], "EARLY")
        self.assertIn("PROGRESSION_MODERATE_RISK", triage["reasonCodes"])

    def test_low_confidence_requires_human_review(self):
        triage = decide_referral(
            screening={"stage": 0, "confidence": 62.0},
            progression=None,
            doctor_review_present=True,
        )

        self.assertEqual(triage["priority"], "ROUTINE")
        self.assertTrue(triage["humanReviewRequired"])
        self.assertIn("LOW_MODEL_CONFIDENCE", triage["reasonCodes"])


if __name__ == "__main__":
    unittest.main()
