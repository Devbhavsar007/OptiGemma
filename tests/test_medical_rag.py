import unittest
from engine.clinical.rag import MedicalRAGRetriever


class TestMedicalRAG(unittest.TestCase):
    def setUp(self):
        self.rag = MedicalRAGRetriever()

    def test_moderate_npdr_query_returns_referral_guidance(self):
        resp = self.rag.query("When should moderate NPDR be referred to a specialist?", clinical_context={"stage": 2})
        self.assertTrue(resp.evidence_found)
        self.assertGreater(len(resp.citations), 0)
        self.assertTrue(any("AIOS" in c.organization for c in resp.citations))
        self.assertIn("Grounded Clinical Evidence", resp.answer)

    def test_hba1c_risk_modifier_query(self):
        resp = self.rag.query("How does high HbA1c affect screening interval?", clinical_context={"hba1c": 9.2})
        self.assertTrue(resp.evidence_found)
        self.assertGreater(len(resp.citations), 0)
        self.assertTrue(any("ICMR" in c.organization or "AIOS" in c.organization for c in resp.citations))

    def test_emergency_pdr_query(self):
        resp = self.rag.query("Proliferative retinopathy neovascularization emergency protocol", clinical_context={"stage": 4})
        self.assertTrue(resp.evidence_found)
        self.assertTrue(any("AIOS" in c.organization for c in resp.citations))
        self.assertIn("photocoagulation", resp.answer.lower())

    def test_unrelated_query_returns_insufficient_evidence(self):
        # Must NOT hallucinate answers for unrelated queries
        resp = self.rag.query("How to bake chocolate cake with strawberries?")
        self.assertFalse(resp.evidence_found)
        self.assertEqual(len(resp.citations), 0)
        self.assertIn("Insufficient evidence", resp.answer)


if __name__ == "__main__":
    unittest.main()
