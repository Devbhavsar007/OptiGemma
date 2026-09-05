"""
DrishtiAI — SIH Golden Demo Clinical Seeder Script
Populates 4 curated clinical presentation archetypes showcasing the complete pipeline:
  1. Rajiv Sharma: Early Stage DR (Routine follow-up)
  2. Sunita Devi: Rapid Progression & Clinician Sign-off
  3. Ramesh Bhai: Offline Edge Camp Screening & Sync Ledger Backlog
  4. Fatima Begum: Proliferative DR Emergency Referral & Trilingual Voice
"""

import os
import sys
import uuid
from datetime import datetime, timedelta

# Add repository root to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import (
    init_db,
    create_patient,
    save_scan,
    save_progression_assessment,
    save_referral,
    save_doctor_review,
    record_sync_event,
    get_db,
)


def seed_sih_demo_patients():
    init_db()
    print("=" * 65)
    print("  DrishtiAI — Seeding SIH Jury Presentation Patients")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. Rajiv Sharma (Early Stage, Routine Monitoring)
    # -------------------------------------------------------------
    p1 = create_patient(
        name="Rajiv Sharma",
        age=35,
        gender="Male",
        diabetes_duration=2,
        sugar_level=138.0,
        hba1c=6.9,
        notes="Newly diagnosed Type 2 diabetes. Baseline preventive screening.",
    )
    p1_id = p1["id"]
    scan1_id = f"sih-scan-{uuid.uuid4().hex[:8]}"

    save_scan(
        scan_id=scan1_id,
        patient_id=p1_id,
        detection_result={
            "stage": 1,
            "stage_name": "Mild NPDR",
            "confidence": 88.5,
            "severity": "mild",
            "color": "#F59E0B",
        },
        heatmap_analysis={"activation_coverage": 12.4, "status": "Focal"},
        vessel_stats={"vessel_density_percent": 9.4},
        report={
            "current_diagnosis": {
                "technical_summary": "Mild NPDR detected with isolated microaneurysms in temporal periphery.",
                "plain_language": "Early signs of diabetic eye changes detected. Your retina is mostly healthy but needs regular tracking.",
            },
            "urgency": "ROUTINE",
            "recommended_follow_up": "Routine retinal screening in 6 to 12 months",
            "action_plan": ["Maintain HbA1c below 7.0%", "Annual dilated eye exam", "Daily 30-minute walk"],
        },
        image_paths={"original": "sample_fundus_mild.png"},
        processing_time=0.28,
    )

    save_progression_assessment(
        scan_id=scan1_id,
        patient_id=p1_id,
        progression_data={
            "predicted_risk": {
                "risk_category": "LOW",
                "six_month_risk": 0.08,
                "twelve_month_risk": 0.14,
                "uncertainty_flags": ["limited longitudinal history (single baseline scan)"],
                "supporting_factors": ["focal microaneurysms only", "HbA1c < 7.0%"],
            }
        },
    )

    save_referral(
        scan_id=scan1_id,
        patient_id=p1_id,
        triage_data={
            "priority": "ROUTINE",
            "reasonCodes": ["STAGE_MILD_MONITOR"],
            "humanReviewRequired": False,
        },
    )
    print(f"  [1/4] Seeded: Rajiv Sharma ({p1_id}) -> Stage 1 (Mild NPDR, Routine)")

    # -------------------------------------------------------------
    # 2. Sunita Devi (Rapid Progression & Doctor Review Sign-off)
    # -------------------------------------------------------------
    p2 = create_patient(
        name="Sunita Devi",
        age=58,
        gender="Female",
        diabetes_duration=14,
        sugar_level=195.0,
        hba1c=9.8,
        notes="Known diabetic for 14 years. Patient reports mild visual blurring in right eye.",
    )
    p2_id = p2["id"]
    scan2_past_id = f"sih-scan-{uuid.uuid4().hex[:8]}"
    scan2_curr_id = f"sih-scan-{uuid.uuid4().hex[:8]}"

    # Prior scan (6 months ago) - Stage 1
    save_scan(
        scan_id=scan2_past_id,
        patient_id=p2_id,
        detection_result={
            "stage": 1,
            "stage_name": "Mild NPDR",
            "confidence": 85.0,
            "severity": "mild",
            "color": "#F59E0B",
        },
        heatmap_analysis={"activation_coverage": 14.0},
        vessel_stats={"vessel_density_percent": 8.8},
        report={"urgency": "ROUTINE"},
        image_paths={"original": "sample_fundus_mild.png"},
        processing_time=0.31,
    )

    # Current scan - Stage 3
    save_scan(
        scan_id=scan2_curr_id,
        patient_id=p2_id,
        detection_result={
            "stage": 3,
            "stage_name": "Severe NPDR",
            "confidence": 92.4,
            "severity": "severe",
            "color": "#DC2626",
        },
        heatmap_analysis={"activation_coverage": 48.6},
        vessel_stats={"vessel_density_percent": 5.2},
        report={
            "current_diagnosis": {
                "technical_summary": "Extensive intraretinal hemorrhages in 4 quadrants, venous beading, IRMA.",
                "plain_language": "Severe diabetic damage observed in the retina. Immediate specialist treatment is required to protect vision.",
            },
            "urgency": "URGENT",
            "recommended_follow_up": "Specialist ophthalmologist consultation within 2 weeks",
            "action_plan": ["Urgent vitreoretinal consultation", "Glycemic control reinforcement", "OCT scan for maculopathy"],
        },
        image_paths={"original": "sample_fundus_severe.png"},
        processing_time=0.39,
    )

    save_progression_assessment(
        scan_id=scan2_curr_id,
        patient_id=p2_id,
        progression_data={
            "predicted_risk": {
                "risk_category": "HIGH",
                "six_month_risk": 0.74,
                "twelve_month_risk": 0.88,
                "uncertainty_flags": [],
                "supporting_factors": [
                    "worsening retinal grade (Stage 1 -> Stage 3)",
                    "elevated HbA1c (9.8%)",
                    "rapid 6-month delta",
                ],
            }
        },
    )

    save_referral(
        scan_id=scan2_curr_id,
        patient_id=p2_id,
        triage_data={
            "priority": "URGENT",
            "reasonCodes": ["STAGE_SEVERE_NONPROLIFERATIVE", "HIGH_PROGRESSION_RISK"],
            "humanReviewRequired": True,
        },
        doctor_review_status="APPROVED",
    )

    save_doctor_review(
        scan_id=scan2_curr_id,
        patient_id=p2_id,
        doctor_id="DR-SEN-09",
        doctor_name="Dr. Vikram Sen, MD (Retina)",
        decision="APPROVED",
        original_stage=3,
        adjusted_stage=3,
        approved_priority="URGENT",
        clinical_notes="AI detection confirmed. Venous beading and multi-quadrant blot hemorrhages. Laser photocoagulation consult scheduled within 14 days.",
        recommended_intervention="Panretinal photocoagulation & anti-VEGF consult",
    )
    print(f"  [2/4] Seeded: Sunita Devi ({p2_id}) -> Stage 3 (Rapid Progression, Doctor Approved)")

    # -------------------------------------------------------------
    # 3. Ramesh Bhai (Rural Edge Camp & Offline Sync Queue)
    # -------------------------------------------------------------
    p3 = create_patient(
        name="Ramesh Bhai",
        age=51,
        gender="Male",
        diabetes_duration=8,
        sugar_level=172.0,
        hba1c=8.1,
        notes="Screened at Kutch Mobile Screening Van (Offline Edge Node).",
    )
    p3_id = p3["id"]
    scan3_id = f"sih-scan-{uuid.uuid4().hex[:8]}"

    save_scan(
        scan_id=scan3_id,
        patient_id=p3_id,
        detection_result={
            "stage": 2,
            "stage_name": "Moderate NPDR",
            "confidence": 84.2,
            "severity": "moderate",
            "color": "#EA580C",
        },
        heatmap_analysis={"activation_coverage": 28.5},
        vessel_stats={"vessel_density_percent": 7.1},
        report={
            "current_diagnosis": {
                "technical_summary": "Moderate NPDR with multiple microaneurysms and hard exudates.",
                "plain_language": "Moderate diabetic eye damage found. Scheduled for early specialist review.",
            },
            "urgency": "EARLY",
            "recommended_follow_up": "Comprehensive retinal evaluation within 1 month",
            "action_plan": ["Ophthalmology clinic visit within 30 days", "Dietary glycemic management"],
        },
        image_paths={"original": "sample_fundus_moderate.png"},
        processing_time=0.33,
    )

    save_referral(
        scan_id=scan3_id,
        patient_id=p3_id,
        triage_data={
            "priority": "EARLY",
            "reasonCodes": ["STAGE_REFERABLE"],
            "humanReviewRequired": True,
        },
    )

    # Add 2 pending offline sync events for this edge camp patient
    record_sync_event(
        device_id="kutch-camp-edge-01",
        entity_type="PATIENT",
        entity_id=p3_id,
        action="CREATE",
        payload={"name": "Ramesh Bhai", "age": 51, "camp_location": "Kutch Van 1"},
        version=1,
    )
    record_sync_event(
        device_id="kutch-camp-edge-01",
        entity_type="SCAN",
        entity_id=scan3_id,
        action="CREATE",
        payload={"stage": 2, "urgency": "EARLY", "camp_location": "Kutch Van 1"},
        version=1,
    )
    print(f"  [3/4] Seeded: Ramesh Bhai ({p3_id}) -> Stage 2 (Edge Camp, 2 Pending Sync Events)")

    # -------------------------------------------------------------
    # 4. Fatima Begum (Proliferative DR, Emergency & Trilingual Audio)
    # -------------------------------------------------------------
    p4 = create_patient(
        name="Fatima Begum",
        age=64,
        gender="Female",
        diabetes_duration=20,
        sugar_level=235.0,
        hba1c=10.4,
        notes="High risk patient. Severe sudden floaters in left eye.",
    )
    p4_id = p4["id"]
    scan4_id = f"sih-scan-{uuid.uuid4().hex[:8]}"

    save_scan(
        scan_id=scan4_id,
        patient_id=p4_id,
        detection_result={
            "stage": 4,
            "stage_name": "PDR",
            "confidence": 94.6,
            "severity": "critical",
            "color": "#7F1D1D",
        },
        heatmap_analysis={"activation_coverage": 65.2},
        vessel_stats={"vessel_density_percent": 3.8},
        report={
            "current_diagnosis": {
                "technical_summary": "Proliferative Diabetic Retinopathy. Extensive neovascularization at optic disc (NVD), pre-retinal hemorrhage.",
                "plain_language": "Critical eye condition requiring immediate hospital treatment. High risk of serious vision loss if untreated.",
            },
            "urgency": "URGENT",
            "recommended_follow_up": "Emergency vitreoretinal consultation within 48 to 72 hours",
            "action_plan": [
                "Emergency tertiary eye hospital referral",
                "Vitrectomy surgical evaluation",
                "Avoid strenuous activity or heavy lifting",
            ],
        },
        image_paths={"original": "sample_fundus_pdr.png"},
        processing_time=0.45,
    )

    save_referral(
        scan_id=scan4_id,
        patient_id=p4_id,
        triage_data={
            "priority": "URGENT",
            "reasonCodes": ["STAGE_PROLIFERATIVE", "MACULAR_THREAT", "CRITICAL_VESSEL_ISCHEMIA"],
            "humanReviewRequired": True,
        },
    )
    print(f"  [4/4] Seeded: Fatima Begum ({p4_id}) -> Stage 4 (PDR, Emergency Referral, Trilingual Audio)")

    print("=" * 65)
    print("  All 4 SIH presentation archetypes successfully seeded!")
    print("=" * 65)


if __name__ == "__main__":
    seed_sih_demo_patients()
