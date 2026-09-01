"""
OptiGemma — Flask Application (v2.1 Hardened Clinical System)
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
log = logging.getLogger("optigemma")

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

from config import FLASK_SECRET, DEBUG

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = FLASK_SECRET
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit

# ---------------------------------------------------------------------------
# CORS — restrict to same-origin + localhost dev
# ---------------------------------------------------------------------------
CORS(app, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
])

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
        "service": "optigemma",
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
# STARTUP
# ========================================

if __name__ == "__main__":
    log.info("=" * 60)
    log.info("  OptiGemma v2.1 — Hardened Clinical System")
    log.info("  http://127.0.0.1:5000")
    log.info("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=DEBUG, use_reloader=False)
