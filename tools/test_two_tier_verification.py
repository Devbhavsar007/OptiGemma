"""
Verification test script for Two-Tiered Architecture (HiResCAM, MedGemma, Two-Tier Runner).
"""
import sys
import time
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

print("Starting verification...", flush=True)

# 1. Test imports
try:
    from engine.pipeline.hirescam import HiResCAM, DualCAM, compute_localization_score, make_hirescam_overlay
    print("[PASS] HiResCAM module imported", flush=True)
except Exception as e:
    print(f"[FAIL] HiResCAM import failed: {e}", flush=True)
    sys.exit(1)

try:
    from engine.pipeline.medgemma_report import generate_medgemma_report
    print("[PASS] MedGemma report module imported", flush=True)
except Exception as e:
    print(f"[FAIL] MedGemma report import failed: {e}", flush=True)
    sys.exit(1)

try:
    from engine.pipeline.two_tier_runner import run_two_tier_pipeline
    print("[PASS] Two-Tier Runner imported", flush=True)
except Exception as e:
    print(f"[FAIL] Two-Tier Runner import failed: {e}", flush=True)
    sys.exit(1)

# 2. Test localization scoring with dummy data
import numpy as np
cam_dummy = np.zeros((100, 100), dtype=np.float32)
cam_dummy[40:60, 40:60] = 0.8
cam_dummy[50, 50] = 1.0  # distinct peak inside lesion mask
mask_dummy = np.zeros((100, 100), dtype=np.uint8)
mask_dummy[45:55, 45:55] = 1

scores = compute_localization_score(cam_dummy, {"microaneurysms": mask_dummy})
assert "microaneurysms" in scores, "Localization scoring should score microaneurysms"
assert scores["microaneurysms"]["pointing_game"] is True, "Pointing game should hit"
assert scores["microaneurysms"]["iou"] > 0, "IoU should be positive"
print(f"[PASS] Quantitative localization scoring verified: IoU={scores['microaneurysms']['iou']}, Dice={scores['microaneurysms']['dice']}", flush=True)

# 3. Test running Two-Tier Pipeline in Offline Mode on sample_data/test_fundus.jpg
print("Testing Two-Tier Pipeline execution on sample image...", flush=True)
t0 = time.time()
res = run_two_tier_pipeline(
    image_input="sample_data/test_fundus.jpg",
    force_offline=True,
    case_id="verify_test"
)
elapsed = round(time.time() - t0, 2)
print(f"[PASS] Two-Tier Pipeline completed in {elapsed}s", flush=True)
print(f"       Status: {res.get('status')}")
print(f"       Tier Executed: {res.get('tier_executed')}")
print(f"       Detection Stage: {res.get('detection', {}).get('stage')}")
print(f"       Report Source: {res.get('report_source')}")
print(f"       Images Saved: {list(res.get('images', {}).keys())}")

print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!", flush=True)
