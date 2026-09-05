"""Role-Based Access Control (RBAC) and lightweight token authentication."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from enum import Enum
from functools import wraps
from typing import Any, Callable
from flask import request, jsonify, g
from config import FLASK_SECRET


class Role(str, Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    HEALTH_WORKER = "HEALTH_WORKER"
    PATIENT = "PATIENT"


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(s: str) -> bytes:
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def create_access_token(user_id: str, role: str, expires_in_seconds: int = 86400) -> str:
    """Generate a tamper-proof HMAC-SHA256 signed access token."""
    role_clean = role.upper()
    now = int(time.time())
    payload = {
        "sub": user_id,
        "role": role_clean,
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = _b64_encode(payload_bytes)

    secret = FLASK_SECRET.encode("utf-8")
    signature = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)

    return f"dr1.{payload_b64}.{sig_b64}"


def verify_token(token: str) -> dict[str, Any] | None:
    """Verify signature and expiration of an access token."""
    try:
        parts = token.split(".")
        if len(parts) != 3 or parts[0] != "dr1":
            return None

        _, payload_b64, sig_b64 = parts
        secret = FLASK_SECRET.encode("utf-8")
        expected_sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()

        actual_sig = _b64_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        if payload.get("exp", 0) < int(time.time()):
            return None  # Expired

        return payload
    except Exception:
        return None


def get_current_actor() -> dict[str, str]:
    """
    Extract actor information from request headers.
    Supports standard Bearer tokens and offline edge clinic bypass headers.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        payload = verify_token(token)
        if payload:
            return {
                "actor_id": payload.get("sub", "anonymous"),
                "actor_role": payload.get("role", Role.HEALTH_WORKER.value),
            }

    # Edge/Offline fallback: allow X-Drishti-Role if present, else default to HEALTH_WORKER
    edge_role = request.headers.get("X-Drishti-Role", "").upper()
    edge_actor = request.headers.get("X-Drishti-Actor-Id", "")

    if edge_role in {r.value for r in Role}:
        return {
            "actor_id": edge_actor or f"edge-{edge_role.lower()}",
            "actor_role": edge_role,
        }

    # Backward compatibility fallback for offline edge doctor signoffs
    try:
        if request.is_json:
            body = request.get_json(silent=True) or {}
            if body.get("doctor_id"):
                return {
                    "actor_id": body.get("doctor_id"),
                    "actor_role": Role.DOCTOR.value,
                }
    except Exception:
        pass

    return {
        "actor_id": "default-operator",
        "actor_role": Role.HEALTH_WORKER.value,
    }


def require_role(*allowed_roles: str | Role) -> Callable:
    """
    Flask route decorator enforcing role-based permissions.
    Example: @require_role(Role.DOCTOR, Role.ADMIN)
    """
    normalized_allowed = {
        r.value if isinstance(r, Role) else str(r).upper() for r in allowed_roles
    }

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            actor = get_current_actor()
            g.current_user = actor

            # Check if role matches
            if actor["actor_role"] not in normalized_allowed:
                return jsonify({
                    "success": False,
                    "error": (
                        f"Access forbidden: requires one of {sorted(list(normalized_allowed))}. "
                        f"Current role: {actor['actor_role']}."
                    )
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
