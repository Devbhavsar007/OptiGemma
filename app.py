"""
DrishtiAI — Flask Application (v2.1 Hardened Clinical System)
Multi-patient support, scan history, batch processing.
Security: rate limiting, CORS, security headers, input validation, audit trail.
"""
import os
import re
import time
import uuid
import json
import logging
import cv2
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Load environment
load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Logging — structured with timestamps (replaces bare print statements)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("DrishtiAI")

# Import engine (UNCHANGED)
from engine.preprocessor import preprocess_for_display
from engine.detector import predict
from engine.gradcam import generate_gradcam, get_heatmap_analysis
from engine.segmentor import segment_vessels
from engine.gemma_report import generate_report

# Import database
from database import (
    create_patient, get_patient, get_all_patients, update_patient,
    delete_patient, save_scan, get_patient_scans, get_scan,
    get_dashboard_stats
)

import re
from config import FLASK_SECRET, DEBUG

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = FLASK_SECRET
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit

# ---------------------------------------------------------------------------
# CORS — allow localhost, Vercel deployments, and production frontends
# ---------------------------------------------------------------------------
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    re.compile(r"^https:\/\/.*\.vercel\.app$"),
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cors_origins.append(frontend_url)

CORS(app, origins=cors_origins, supports_credentials=True)

# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
@app.after_request
def inject_security_headers(response):
    """Inject strict security headers into every HTTP response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if not DEBUG:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self'"
        )
    return response

# ---------------------------------------------------------------------------
# Input validation helpers
# ---------------------------------------------------------------------------
_PATIENT_ID_RE = re.compile(r"^P-\d{4}$")

def _validate_pid(pid: str) -> str:
    """Validate patient ID format or raise 400."""
    if not _PATIENT_ID_RE.match(pid):
        raise ValueError(f"Invalid patient ID: {pid}")
    return pid

# Directories
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ========================================
# HEALTH CHECK
# ========================================

@app.route("/api/health", methods=["GET"])
@limiter.exempt
def api_health():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "DrishtiAI",
        "version": "2.1.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })


# ========================================
# PAGE ROUTES
# ========================================

@app.route("/")
def index():
    """Serve the main SPA."""
    return render_template("index.html")


@app.route("/results/<path:filename>")
def serve_result(filename):
    """Serve generated result images."""
    return send_from_directory(RESULTS_DIR, filename)


# ========================================
# DASHBOARD API
# ========================================

@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    """Get dashboard statistics."""
    try:
        stats = get_dashboard_stats()
        return jsonify({"success": True, **stats})
    except Exception as e:
        log.exception("Dashboard stats error")
        return jsonify({"success": False, "error": str(e)}), 500


# ========================================
# PATIENT API
# ========================================

@app.route("/api/patients", methods=["GET"])
def api_patients_list():
    """List all patients with optional search."""
    try:
        search = request.args.get('search', '')
        patients = get_all_patients(search)
        return jsonify({"success": True, "patients": patients})
    except Exception as e:
        log.exception("Patient list error")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/patients", methods=["POST"])
def api_patients_create():
    """Create a new patient."""
    try:
        data = request.get_json()
        if not data or not data.get('name', '').strip():
            return jsonify({"success": False, "error": "Patient name is required."}), 400

        patient = create_patient(
            name=data['name'],
            age=data.get('age'),
            gender=data.get('gender', ''),
            diabetes_duration=data.get('diabetes_duration'),
            sugar_level=data.get('sugar_level'),
            hba1c=data.get('hba1c'),
            notes=data.get('notes', '')
        )
        return jsonify({"success": True, "patient": patient})
    except Exception as e:
        log.exception("Patient create error")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/patients/<patient_id>", methods=["GET"])
def api_patient_detail(patient_id):
    """Get patient details with scan history."""
    try:
        _validate_pid(patient_id)
        patient = get_patient(patient_id)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found."}), 404
        return jsonify({"success": True, "patient": patient})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        log.exception("Patient detail error")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/patients/<patient_id>", methods=["PUT"])
def api_patient_update(patient_id):
    """Update patient info."""
    try:
        _validate_pid(patient_id)
        data = request.get_json()
        patient = update_patient(patient_id, **data)
        if not patient:
            return jsonify({"success": False, "error": "Patient not found."}), 404
        return jsonify({"success": True, "patient": patient})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        log.exception("Patient update error")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/patients/<patient_id>", methods=["DELETE"])
def api_patient_delete(patient_id):
    """Delete a patient and all their scans."""
    try:
        _validate_pid(patient_id)
        delete_patient(patient_id)
        return jsonify({"success": True})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        log.exception("Patient delete error")
        return jsonify({"success": False, "error": str(e)}), 500


# ========================================
# SCAN API (core pipeline — UNCHANGED logic)
# ========================================

@app.route("/api/scans/<scan_id>", methods=["GET"])
def api_scan_detail(scan_id):
    """Get a single scan's full details."""
    try:
        scan = get_scan(scan_id)
        if not scan:
            return jsonify({"success": False, "error": "Scan not found."}), 404
        return jsonify({"success": True, "scan": scan})
    except Exception as e:
        log.exception("Scan detail error")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/analyze", methods=["POST"])
@limiter.limit("10 per minute")
def analyze():
    """
    Run the FULL analysis pipeline on an uploaded fundus image.
    NOW saves to database if patient_id is provided.
    Core engine logic is UNCHANGED from v1.0.
    Rate limited to 10 inferences per minute.
    """
    start_time = time.time()

    # Validate file
    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400

    file = request.files["image"]
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use PNG, JPG, JPEG, BMP, or TIFF."}), 400

    # Save uploaded file
    analysis_id = str(uuid.uuid4())[:12]
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_DIR, f"{analysis_id}_{filename}")
    file.save(filepath)

    # Get patient info (optional for backward compatibility)
    patient_id = request.form.get("patient_id", "")
    patient_info = {}
    if request.form.get("age"):
        patient_info["age"] = request.form.get("age")
    if request.form.get("diabetes_duration"):
        patient_info["diabetes_duration"] = request.form.get("diabetes_duration")
    if request.form.get("sugar_level"):
        patient_info["sugar_level"] = request.form.get("sugar_level")
    if request.form.get("hba1c"):
        patient_info["hba1c"] = request.form.get("hba1c")

    try:
        # --- 2. Preprocess Image --- (UNCHANGED)
        processed = preprocess_for_display(filepath)
        model_input = processed["model_input"]
        model_input_raw = processed["model_input_raw"]
        model_input_enhanced_highres = processed["model_input_enhanced_highres"]
        original = processed["original"]

        # Save original resized for display
        original_path = os.path.join(RESULTS_DIR, f"{analysis_id}_scan.png")
        cv2.imwrite(original_path, original)

        # --- 3. Run Detection --- (UNCHANGED)
        detection_result = predict(model_input_enhanced_highres)

        # --- 4. Generate Heatmap --- (UNCHANGED)
        heatmap_path = os.path.join(RESULTS_DIR, f"{analysis_id}_heatmap.png")
        heatmap_overlay, heatmap_raw = generate_gradcam(model_input, original, save_path=heatmap_path)
        heatmap_analysis = get_heatmap_analysis(heatmap_raw)

        # --- 5. Vessel Segmentation --- (UNCHANGED)
        vessel_path = os.path.join(RESULTS_DIR, f"{analysis_id}_vessels.png")
        vessel_map, vessel_stats = segment_vessels(original, save_path=vessel_path)

        # --- 6. Gemma Report --- (UNCHANGED)
        report, _raw_gemma = generate_report(
            detection_result, heatmap_analysis, vessel_stats, patient_info
        )

        elapsed = round(time.time() - start_time, 2)
        log.info("Analysis %s completed in %.2fs — stage %s",
                 analysis_id, elapsed, detection_result.get('stage', '?'))

        # --- 7. Save to Database (NEW) ---
        image_paths = {
            "original": f"/results/{analysis_id}_scan.png",
            "heatmap": f"/results/{analysis_id}_heatmap.png",
            "vessels": f"/results/{analysis_id}_vessels.png",
        }

        if patient_id:
            try:
                save_scan(
                    scan_id=analysis_id,
                    patient_id=patient_id,
                    detection_result=detection_result,
                    heatmap_analysis=heatmap_analysis,
                    vessel_stats=vessel_stats,
                    report=report,
                    image_paths=image_paths,
                    processing_time=elapsed
                )
                log.info("Scan %s saved for patient %s", analysis_id, patient_id)
            except Exception as db_err:
                log.warning("Failed to save scan to DB: %s", db_err)

        # --- 8. Compile Response --- (UNCHANGED format)
        result = {
            "success": True,
            "analysis_id": analysis_id,
            "patient_id": patient_id,
            "processing_time": elapsed,
            "detection": detection_result,
            "heatmap_analysis": heatmap_analysis,
            "vessel_stats": vessel_stats,
            "report": report,
            "images": image_paths,
        }

        return jsonify(result)

    except Exception as e:
        log.exception("Analysis pipeline error for %s", analysis_id)
        error_response = {"error": str(e)}
        if DEBUG:
            import traceback
            error_response["traceback"] = traceback.format_exc()
        return jsonify(error_response), 500


@app.route("/translate", methods=["POST"])
def translate():
    """Translate an existing report to another language."""
    data = request.get_json()
    report = data.get("report")
    language = data.get("language", "hindi")

    if not report:
        return jsonify({"error": "No report provided"}), 400

    try:
        from engine.gemma_report import translate_report
        translated = translate_report(report, language)
        return jsonify({"success": True, "report": translated})
    except Exception as e:
        log.exception("Translation error")
        return jsonify({"error": str(e)}), 500


# ========================================
# V2 PIPELINE — Full Clinical Pipeline
# (IQA Gate → Structures → Grading → Explain → Report)
# ========================================

@app.route("/api/analyze-v2", methods=["POST"])
@limiter.limit("10 per minute")
def analyze_v2():
    """
    DrishtiAI v2 Full Pipeline:
      1. Image Quality Assessment (accept / enhance / reject with feedback)
      2. Retinal structure segmentation (disc, fovea, vessels, lesions)
      3. Calibrated DR grading (ordinal + referable binary head)
      4. Explainability (Grad-CAM overlay + lesion evidence map)
      5. Report generation (online via Gemma API or offline template)

    Returns all brief-mandated deliverables in a single response.
    """
    start_time = time.time()

    # ── Validate file upload ──
    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400

    file = request.files["image"]
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use PNG, JPG, JPEG, BMP, or TIFF."}), 400

    # Save uploaded file
    analysis_id = str(uuid.uuid4())[:12]
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_DIR, f"{analysis_id}_{filename}")
    file.save(filepath)

    # Patient info
    patient_id = request.form.get("patient_id", "")
    patient_info = {}
    for field_name in ("age", "diabetes_duration", "sugar_level", "hba1c"):
        val = request.form.get(field_name)
        if val:
            patient_info[field_name] = val

    try:
        # ── MODULE 1: Image Quality Assessment ──
        from engine.pipeline.iqa import run_iqa
        img_bgr = cv2.imread(filepath)
        if img_bgr is None:
            return jsonify({"error": "Could not read image file."}), 400

        iqa_result, processed_img = run_iqa(img_bgr)

        if iqa_result.decision == "REJECT" or processed_img is None:
            elapsed = round(time.time() - start_time, 2)
            log.info("Analysis %s REJECTED by IQA gate: %s",
                     analysis_id, iqa_result.feedback)
            return jsonify({
                "success": True,
                "analysis_id": analysis_id,
                "status": "REJECTED",
                "iqa": iqa_result.to_dict(),
                "message": " ".join(iqa_result.feedback),
                "processing_time": elapsed,
            })

        # Save processed image for display
        original_path = os.path.join(RESULTS_DIR, f"{analysis_id}_scan.png")
        cv2.imwrite(original_path, processed_img)

        # ── MODULE 2: Structure Segmentation ──
        from engine.pipeline.structures import extract_structures
        from engine.pipeline.iqa import estimate_fov

        fov = estimate_fov(processed_img)
        structures = extract_structures(processed_img, fov)
        structures_dict = structures.to_dict()

        # Save vessel map for display
        vessel_path = os.path.join(RESULTS_DIR, f"{analysis_id}_vessels.png")
        if structures.vessel_mask is not None:
            vessel_display = cv2.cvtColor(structures.vessel_mask, cv2.COLOR_GRAY2BGR)
            vessel_display = cv2.resize(vessel_display, (224, 224))
            cv2.imwrite(vessel_path, vessel_display)

        # ── MODULE 3: DR Grading ──
        # Try the new ordinal grading model first, fall back to legacy detector
        from config import PIPELINE_WEIGHTS, PIPELINE_CALIBRATION
        import os as _os

        grading_result = None
        detection_result = None

        if _os.path.exists(PIPELINE_WEIGHTS):
            # New calibrated ordinal model
            try:
                import torch
                from engine.pipeline.grading import load_grading_model, Calibration, predict_batch

                device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                model = load_grading_model(PIPELINE_WEIGHTS, device)
                calib = Calibration.load(PIPELINE_CALIBRATION)

                # Preprocess for grading
                img_resized = cv2.resize(processed_img, (300, 300))
                img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB).astype('float32') / 255.0
                import numpy as np
                mean = np.array([0.485, 0.456, 0.406], dtype='float32')
                std = np.array([0.229, 0.224, 0.225], dtype='float32')
                img_norm = (img_rgb - mean) / std
                x = torch.from_numpy(img_norm.transpose(2, 0, 1)).unsqueeze(0)
                lesion_feats = torch.from_numpy(structures.lesion_features).unsqueeze(0)

                pred = predict_batch(model, x, lesion_feats, calib, device)
                grade = int(pred["grade"][0])

                from config import DR_STAGES
                stage_info = DR_STAGES.get(grade, DR_STAGES[0])

                grading_result = {
                    "grade": grade,
                    "probs": [round(float(p), 4) for p in pred["probs"][0]],
                    "expected_grade": round(float(pred["expected_grade"][0]), 2),
                    "referable": bool(pred["referable"][0]),
                    "referable_prob": round(float(pred["referable_prob"][0]), 4),
                    "calibration_temperature": calib.temperature,
                    "calibration_threshold": calib.threshold,
                }

                # Build compatible detection_result for report generation
                detection_result = {
                    "stage": grade,
                    "stage_name": stage_info["name"],
                    "confidence": round(float(pred["probs"][0][grade]) * 100, 1),
                    "all_probabilities": {i: round(float(pred["probs"][0][i]) * 100, 1) for i in range(5)},
                    "severity": stage_info["severity"],
                    "color": stage_info["color"],
                    "_model": "DrishtiAI-Pipeline (ordinal+referable, calibrated)",
                    "_calibrated": True,
                }
                log.info("Analysis %s: pipeline grading — Grade %d, referable=%s",
                         analysis_id, grade, pred["referable"][0])

            except Exception as e:
                log.warning("Pipeline grading failed, falling back to legacy: %s", e)
                grading_result = None

        # Fallback to legacy EfficientNet-B3 detector
        if detection_result is None:
            processed = preprocess_for_display(filepath)
            model_input_enhanced = processed["model_input_enhanced_highres"]
            detection_result = predict(model_input_enhanced)
            detection_result["_calibrated"] = False

        # ── MODULE 4: Explainability ──
        processed_data = preprocess_for_display(filepath)
        model_input = processed_data["model_input"]
        original_display = processed_data["original"]

        heatmap_path = os.path.join(RESULTS_DIR, f"{analysis_id}_heatmap.png")
        heatmap_overlay, heatmap_raw = generate_gradcam(model_input, original_display, save_path=heatmap_path)
        heatmap_analysis = get_heatmap_analysis(heatmap_raw)

        # ── MODULE 5: Report Generation ──
        report, _raw_source = generate_report(
            detection_result, heatmap_analysis,
            {"vessel_density_percent": round(structures.vessel_density * 100, 2),
             "vessel_health_text": f"Vessel density: {structures.vessel_density * 100:.1f}%"},
            patient_info,
            structures=structures_dict,
        )

        elapsed = round(time.time() - start_time, 2)
        log.info("Analysis %s (v2) completed in %.2fs — Grade %s, referable=%s",
                 analysis_id, elapsed, detection_result.get('stage', '?'),
                 grading_result.get('referable', 'N/A') if grading_result else 'N/A')

        # Image paths for response
        image_paths = {
            "original": f"/results/{analysis_id}_scan.png",
            "heatmap": f"/results/{analysis_id}_heatmap.png",
            "vessels": f"/results/{analysis_id}_vessels.png",
        }

        # Save to database if patient_id provided
        if patient_id:
            try:
                save_scan(
                    scan_id=analysis_id,
                    patient_id=patient_id,
                    detection_result=detection_result,
                    heatmap_analysis=heatmap_analysis,
                    vessel_stats=structures_dict,
                    report=report,
                    image_paths=image_paths,
                    processing_time=elapsed
                )
            except Exception as db_err:
                log.warning("Failed to save scan to DB: %s", db_err)

        # ── Compile v2 response ──
        result = {
            "success": True,
            "pipeline_version": "v2",
            "analysis_id": analysis_id,
            "patient_id": patient_id,
            "processing_time": elapsed,
            "status": "OK",

            # Module 1: IQA
            "iqa": iqa_result.to_dict(),

            # Module 2: Structures
            "structures": structures_dict,

            # Module 3: Detection / Grading
            "detection": detection_result,
            "grading": grading_result,

            # Module 4: Explainability
            "heatmap_analysis": heatmap_analysis,

            # Module 5: Report
            "report": report,

            # Images
            "images": image_paths,
        }

        return jsonify(result)

    except Exception as e:
        log.exception("v2 pipeline error for %s", analysis_id)
        error_response = {"error": str(e)}
        if DEBUG:
            import traceback
            error_response["traceback"] = traceback.format_exc()
        return jsonify(error_response), 500


# ========================================
# V3 PIPELINE — Two-Tiered Architecture
# (Tier 1: Edge HiResCAM/Grading + Tier 2: MedGemma Multimodal VLM)
# ========================================

@app.route("/api/analyze-v3", methods=["POST"])
@limiter.limit("10 per minute")
def analyze_v3():
    """
    OptiGemma Two-Tiered Architecture Endpoint:
      Tier 1 (Edge): IQA -> Structures -> DR Grading -> HiResCAM + Grad-CAM -> Quantitative Localization Metrics
      Tier 2 (Cloud): MedGemma 27B multimodal vision-language verification + grounded clinical narrative
      (Graceful offline fallback if disconnected or timed out)
    """
    start_time = time.time()

    if "image" not in request.files:
        return jsonify({"error": "No image file uploaded."}), 400

    file = request.files["image"]
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use PNG, JPG, JPEG, BMP, or TIFF."}), 400

    analysis_id = str(uuid.uuid4())[:12]
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_DIR, f"{analysis_id}_{filename}")
    file.save(filepath)

    patient_id = request.form.get("patient_id", "")
    patient_info = {}
    for field_name in ("age", "diabetes_duration", "sugar_level", "hba1c"):
        val = request.form.get(field_name)
        if val:
            patient_info[field_name] = val

    force_offline = (
        request.form.get("offline", "").lower() in ("true", "1", "yes")
        or request.headers.get("X-Force-Offline", "").lower() == "true"
    )

    try:
        from engine.pipeline.two_tier_runner import run_two_tier_pipeline

        result = run_two_tier_pipeline(
            image_input=filepath,
            force_offline=force_offline,
            patient_info=patient_info,
            save_overlays=True,
            case_id=analysis_id,
        )

        result["analysis_id"] = analysis_id
        result["patient_id"] = patient_id

        # Save to DB if patient_id provided
        if patient_id and result.get("status") != "REJECTED":
            try:
                save_scan(
                    scan_id=analysis_id,
                    patient_id=patient_id,
                    detection_result=result.get("detection") or {},
                    heatmap_analysis=result.get("explanation") or {},
                    vessel_stats=result.get("structures") or {},
                    report=result.get("report") or {},
                    image_paths=result.get("images") or {},
                    processing_time=round(result.get("total_latency_ms", 0) / 1000.0, 2),
                )
                log.info("Scan %s saved for patient %s (v3 two-tiered)", analysis_id, patient_id)
            except Exception as db_err:
                log.warning("Failed to save v3 scan to DB: %s", db_err)

        return jsonify(result)

    except Exception as e:
        log.exception("v3 two-tier pipeline error for %s", analysis_id)
        error_response = {"error": str(e)}
        if DEBUG:
            import traceback
            error_response["traceback"] = traceback.format_exc()
        return jsonify(error_response), 500


# ========================================
# STARTUP
# ========================================

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  DrishtiAI v2.1 — Hardened Clinical System")
    log.info("  http://127.0.0.1:5000")
    log.info("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=DEBUG, use_reloader=False)
