"""
DrishtiAI — Database Layer (SQLite)
Stores patient records and scan history permanently.
Hardened: audit logging, N+1 fix, input validation, context-managed connections.
"""
import sqlite3
import os
import re
import json
import logging
from contextlib import contextmanager
from datetime import datetime

log = logging.getLogger("DrishtiAI.db")

DB_PATH = os.path.join(os.path.dirname(__file__), 'DrishtiAI.db')

# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------
_PATIENT_ID_RE = re.compile(r"^P-\d{4}$")
_ALLOWED_PATIENT_COLS = frozenset(
    ['name', 'age', 'gender', 'diabetes_duration', 'sugar_level', 'hba1c', 'notes']
)


def _validate_patient_id(pid: str) -> str:
    """Validate patient ID format (P-0001 .. P-9999)."""
    if not _PATIENT_ID_RE.match(pid):
        raise ValueError(f"Invalid patient ID format: {pid!r}. Expected P-NNNN.")
    return pid


def _sanitize_string(value: str, max_len: int = 1000) -> str:
    """Strip HTML tags and truncate to max_len to prevent XSS / overflow."""
    if not isinstance(value, str):
        return value
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', '', value)
    return clean[:max_len].strip()


# ---------------------------------------------------------------------------
# Connection management — context manager for safe lifecycle
# ---------------------------------------------------------------------------
@contextmanager
def get_db():
    """Get a database connection as a context manager."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize the database tables."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS patients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age INTEGER,
                gender TEXT DEFAULT '',
                diabetes_duration INTEGER,
                sugar_level REAL,
                hba1c REAL,
                notes TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                stage INTEGER NOT NULL,
                stage_name TEXT NOT NULL,
                confidence REAL NOT NULL,
                severity TEXT DEFAULT '',
                color TEXT DEFAULT '',
                all_probabilities TEXT DEFAULT '{}',
                model_used TEXT DEFAULT '',
                heatmap_analysis TEXT DEFAULT '{}',
                vessel_stats TEXT DEFAULT '{}',
                report TEXT DEFAULT '{}',
                image_original TEXT DEFAULT '',
                image_heatmap TEXT DEFAULT '',
                image_vessels TEXT DEFAULT '',
                processing_time REAL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (patient_id) REFERENCES patients(id)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                details TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_scans_patient ON scans(patient_id);
            CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at);
            CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
        """)
        conn.commit()
    log.info("Database initialized at %s", DB_PATH)


def _audit(conn, action: str, entity_type: str, entity_id: str, details: str = ""):
    """Record an audit trail entry."""
    conn.execute(
        "INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)",
        (action, entity_type, entity_id, _sanitize_string(details, 2000))
    )


def generate_patient_id():
    """Generate a unique patient ID like P-0001."""
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM patients").fetchone()
    return f"P-{row['cnt'] + 1:04d}"


# === Patient CRUD ===

def create_patient(name, age=None, gender='', diabetes_duration=None,
                   sugar_level=None, hba1c=None, notes=''):
    """Create a new patient record."""
    pid = generate_patient_id()
    with get_db() as conn:
        try:
            conn.execute(
                """INSERT INTO patients (id, name, age, gender, diabetes_duration,
                   sugar_level, hba1c, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (pid, _sanitize_string(name), age, _sanitize_string(gender, 50),
                 diabetes_duration, sugar_level, hba1c, _sanitize_string(notes))
            )
            _audit(conn, "CREATE", "patient", pid, f"name={name}")
            conn.commit()
            patient = conn.execute("SELECT * FROM patients WHERE id = ?", (pid,)).fetchone()
            return dict(patient)
        except Exception as e:
            conn.rollback()
            raise e


def get_patient(patient_id):
    """Get a single patient by ID."""
    _validate_patient_id(patient_id)
    with get_db() as conn:
        row = conn.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if row:
        patient = dict(row)
        patient['scans'] = get_patient_scans(patient_id)
        return patient
    return None


def get_all_patients(search='', limit=100, offset=0):
    """Get all patients with latest scan info in a single optimized query (N+1 fix)."""
    with get_db() as conn:
        base_query = """
            SELECT
                p.*,
                COUNT(s.id) as scan_count,
                ls.stage as latest_stage,
                ls.stage_name as latest_stage_name,
                ls.confidence as latest_confidence,
                ls.created_at as latest_scan_date
            FROM patients p
            LEFT JOIN scans s ON s.patient_id = p.id
            LEFT JOIN (
                SELECT patient_id, stage, stage_name, confidence, created_at,
                       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) as rn
                FROM scans
            ) ls ON ls.patient_id = p.id AND ls.rn = 1
        """

        if search:
            search_param = f'%{_sanitize_string(search, 100)}%'
            rows = conn.execute(
                base_query + " WHERE p.name LIKE ? OR p.id LIKE ? GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
                (search_param, search_param, limit, offset)
            ).fetchall()
        else:
            rows = conn.execute(
                base_query + " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
                (limit, offset)
            ).fetchall()

    patients = []
    for row in rows:
        p = dict(row)
        # Build latest_scan dict from the JOIN columns
        if p.get('latest_stage') is not None:
            p['latest_scan'] = {
                'stage': p['latest_stage'],
                'stage_name': p['latest_stage_name'],
                'confidence': p['latest_confidence'],
                'created_at': p['latest_scan_date'],
            }
        else:
            p['latest_scan'] = None
        # Clean up the extra columns
        for k in ('latest_stage', 'latest_stage_name', 'latest_confidence', 'latest_scan_date'):
            p.pop(k, None)
        patients.append(p)

    return patients


def update_patient(patient_id, **kwargs):
    """Update patient fields. Only allowlisted columns can be modified."""
    _validate_patient_id(patient_id)
    # Strict allowlist check to prevent SQL injection via dynamic column names
    updates = {k: v for k, v in kwargs.items() if k in _ALLOWED_PATIENT_COLS and v is not None}
    disallowed = set(kwargs.keys()) - _ALLOWED_PATIENT_COLS
    if disallowed:
        log.warning("Blocked disallowed update columns: %s", disallowed)

    if not updates:
        return get_patient(patient_id)

    # Sanitize string values
    for k, v in updates.items():
        if isinstance(v, str):
            updates[k] = _sanitize_string(v)

    set_clause = ', '.join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [patient_id]

    with get_db() as conn:
        conn.execute(f"UPDATE patients SET {set_clause}, updated_at = datetime('now') WHERE id = ?", values)
        _audit(conn, "UPDATE", "patient", patient_id, json.dumps(list(updates.keys())))
        conn.commit()
    return get_patient(patient_id)


def delete_patient(patient_id):
    """Delete a patient and all their scans."""
    _validate_patient_id(patient_id)
    with get_db() as conn:
        conn.execute("DELETE FROM scans WHERE patient_id = ?", (patient_id,))
        conn.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        _audit(conn, "DELETE", "patient", patient_id)
        conn.commit()


# === Scan CRUD ===

def save_scan(scan_id, patient_id, detection_result, heatmap_analysis,
              vessel_stats, report, image_paths, processing_time):
    """Save a completed scan to the database."""
    with get_db() as conn:
        try:
            conn.execute(
                """INSERT INTO scans (id, patient_id, stage, stage_name, confidence,
                   severity, color, all_probabilities, model_used, heatmap_analysis,
                   vessel_stats, report, image_original, image_heatmap, image_vessels,
                   processing_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    scan_id, patient_id,
                    detection_result.get('stage', 0),
                    detection_result.get('stage_name', 'Unknown'),
                    detection_result.get('confidence', 0),
                    detection_result.get('severity', ''),
                    detection_result.get('color', ''),
                    json.dumps(detection_result.get('all_probabilities', {})),
                    detection_result.get('_model', 'unknown'),
                    json.dumps(heatmap_analysis),
                    json.dumps(vessel_stats),
                    json.dumps(report),
                    image_paths.get('original', ''),
                    image_paths.get('heatmap', ''),
                    image_paths.get('vessels', ''),
                    processing_time
                )
            )
            _audit(conn, "CREATE", "scan", scan_id,
                   f"patient={patient_id} stage={detection_result.get('stage', '?')}")
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e


def get_patient_scans(patient_id):
    """Get all scans for a patient, newest first."""
    _validate_patient_id(patient_id)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM scans WHERE patient_id = ? ORDER BY created_at DESC",
            (patient_id,)
        ).fetchall()

    scans = []
    for row in rows:
        s = dict(row)
        # Parse JSON fields
        for field in ['all_probabilities', 'heatmap_analysis', 'vessel_stats', 'report']:
            try:
                s[field] = json.loads(s[field]) if s[field] else {}
            except (json.JSONDecodeError, TypeError):
                s[field] = {}
        scans.append(s)
    return scans


def get_scan(scan_id):
    """Get a single scan by ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if row:
        s = dict(row)
        for field in ['all_probabilities', 'heatmap_analysis', 'vessel_stats', 'report']:
            try:
                s[field] = json.loads(s[field]) if s[field] else {}
            except (json.JSONDecodeError, TypeError):
                s[field] = {}
        return s
    return None


# === Dashboard Stats ===

def get_dashboard_stats():
    """Get overview statistics for the dashboard."""
    with get_db() as conn:
        total_patients = conn.execute("SELECT COUNT(*) as cnt FROM patients").fetchone()['cnt']
        total_scans = conn.execute("SELECT COUNT(*) as cnt FROM scans").fetchone()['cnt']

        # Stage distribution
        stage_dist = {}
        rows = conn.execute(
            "SELECT stage, stage_name, COUNT(*) as cnt FROM scans GROUP BY stage ORDER BY stage"
        ).fetchall()
        for row in rows:
            stage_dist[row['stage']] = {'name': row['stage_name'], 'count': row['cnt']}

        # Recent scans (single query with JOIN)
        recent = conn.execute("""
            SELECT s.*, p.name as patient_name
            FROM scans s JOIN patients p ON s.patient_id = p.id
            ORDER BY s.created_at DESC LIMIT 5
        """).fetchall()

    recent_scans = []
    for row in recent:
        r = dict(row)
        try:
            r['report'] = json.loads(r['report']) if r['report'] else {}
        except (json.JSONDecodeError, TypeError):
            r['report'] = {}
        recent_scans.append(r)

    return {
        'total_patients': total_patients,
        'total_scans': total_scans,
        'stage_distribution': stage_dist,
        'recent_scans': recent_scans,
    }


# Initialize on import
init_db()
