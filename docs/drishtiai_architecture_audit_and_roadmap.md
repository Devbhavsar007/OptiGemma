# DrishtiAI Architecture Audit, Target Design, and Phase Plan

> Version: 2026-09-05  
> Scope: Existing `OptiGemma/DrishtiAI` repository audit + pragmatic transformation plan to preventive, offline-first retinal-health platform.

---

## A. Current Architecture Audit

### 1) Current architecture (as implemented)

- **Frontend**: React + TypeScript + Vite (`src/`), component-driven UI with context state (`MedicalDataContext`), mixed live-backend and offline-simulated behavior.
- **Backend**: Flask monolith (`app.py`) with route-level orchestration.
- **AI pipeline**:
  - Legacy flow: `preprocessor -> detector -> gradcam -> segmentor -> gemma_report`
  - v2 flow: `IQA -> structures -> grading -> explainability -> report`
  - v3 flow: Two-tier (`tier1 edge + tier2 MedGemma multimodal`) with offline fallback.
- **Database**: SQLite (`DrishtiAI.db`) via `database.py` with tables: `patients`, `scans`, `audit_log`.
- **Deployment**:
  - Backend: Gunicorn (Procfile / Render)
  - Frontend: Vercel static Vite build.
- **Auxiliary**: MATLAB/Simulink pipeline artifacts, training scripts, model export scripts, docs.

### 2) Current data flow

1. Frontend uploads fundus image to Flask (`/analyze`, `/api/analyze-v2`, `/api/analyze-v3`).
2. Backend processes image, performs inference/explainability/report generation.
3. Optional patient context from form is injected into report generation.
4. Scan artifacts saved to `/results/*` and scan metadata saved into SQLite.
5. Frontend consumes JSON payload and renders dashboard/patient views.

### 3) Current ML pipeline

- **IQA gate** exists in `engine/pipeline/iqa.py` (accept/enhance/reject decision + feedback).
- **Feature extraction** exists in `engine/pipeline/structures.py` (disc/fovea, lesions, vesselness, tortuosity).
- **Grading** exists in `engine/pipeline/grading.py` (ordinal + referable head with calibration).
- **Explainability** exists in `engine/pipeline/explain.py`, `hirescam.py`.
- **Tier-2 MedGemma VLM report** exists in `engine/pipeline/medgemma_report.py` with offline fallback.

### 4) Current DB schema

- `patients(id, name, age, gender, diabetes_duration, sugar_level, hba1c, notes, created_at, updated_at)`
- `scans(id, patient_id, stage, stage_name, confidence, severity, color, all_probabilities, model_used, heatmap_analysis, vessel_stats, report, image_original, image_heatmap, image_vessels, processing_time, created_at)`
- `audit_log(id, action, entity_type, entity_id, details, created_at)`

### 5) Current API structure

- Health/dashboard: `/api/health`, `/api/dashboard`
- Patients CRUD: `/api/patients`, `/api/patients/{id}`
- Scan detail: `/api/scans/{scan_id}`
- Inference: `/analyze`, `/api/analyze-v2`, `/api/analyze-v3`
- Translation: `/translate`

### 6) Current deployment model

- Single Flask service, in-memory rate limiter storage, local filesystem for artifacts.
- Static frontend deployment via Vercel.
- No containerized inference worker separation yet.

### 7) Technical debt / fragility

- **God-route issue**: `app.py` owns orchestration, policy, and response formatting for multiple versions.
- **Coupling**: Inference and policy/reporting logic mixed within route handlers.
- **State duality in frontend**: simulated local “AI mode” and backend live mode can diverge from persisted data model.
- **Versioning**: model metadata only partially persisted (`_model`) and not fully standardized.
- **Test gap**: no formal unit/integration/e2e test suite detected.
- **Storage gap**: image artifacts remain on local disk; no object storage abstraction.

### 8) Security risks and limitations

- No role-based access control yet (admin/health worker/doctor/patient).
- No authentication middleware; sensitive endpoints are open in current form.
- Limited audit context (no actor identity recorded in audit rows).
- Potential PHI leakage risk in generic logs and report text storage.
- Rate limiter uses in-memory storage (not robust in distributed deployment).

### 9) Scalability bottlenecks

- CPU/GPU inference in request-response path (sync route) without queue isolation.
- SQLite and local files limit horizontal scale and multi-device sync.
- No explicit offline sync ledger/version conflict model.

### 10) What should be preserved

- Existing **IQA -> structures -> grading -> explainability** code (strong foundation).
- Offline template reporting fallback behavior.
- v3 two-tier orchestration pattern.
- Security headers + request size limits + basic rate limiting.
- Existing patient/scan CRUD semantics and backward-compatible API behavior.

### 11) Claimed vs. currently missing/partial

Partially implemented or missing:

- True **longitudinal progression model** (currently heuristic text/rules, not first-class engine API).
- Deterministic **triage/referral policy module** as explicit domain component.
- Full **doctor review workflow** entity separation.
- Offline sync queue/version conflict framework.
- RBAC/auth/authz and per-role data access.
- Grounded RAG with document retrieval/citations as a dedicated service.
- Formal observability + metrics pipeline.

---

## B. Target Architecture

### Architecture style

- Keep **modular monolith** (avoid premature microservices).
- Introduce domain modules with clear interfaces:

```text
auth/
patients/
screenings/
images/
image_quality/
inference/
explainability/
progression/
medical_intelligence/
referrals/
doctor_review/
reports/
audit/
sync/
analytics/
```

### Core pipeline (single flow)

`Capture -> Validate -> Screen -> Explain -> Predict -> Guide -> Refer -> Communicate -> Monitor`

Each stage emits structured outputs with model/policy metadata and uncertainty.

---

## C. Gap Analysis (Current → Target)

1. **Capture abstraction**: currently file upload only; needs provider interface.
2. **Quality gate**: exists; needs contract and policy coupling to triage.
3. **Multi-disease plugin system**: currently DR-centric; needs model adapter registry.
4. **Safety/confidence engine**: partial; needs explicit decision module.
5. **Explainability**: exists; needs standard output contract and persistence.
6. **Longitudinal model**: weak; needs immutable screening event model and progression engine.
7. **Referral policy**: currently implicit in report urgency; needs deterministic policy layer.
8. **Doctor workflow**: missing dedicated entities/APIs.
9. **RAG**: currently LLM generation; needs retriever + curated sources + citations.
10. **Offline sync**: no queue/conflict/version architecture.
11. **Security/RBAC**: no identity-driven access controls.
12. **MLOps**: scripts exist, but no structured registry + validation gates.

---

## D. Proposed Folder Structure (incremental migration)

```text
app.py
database.py
engine/
  pipeline/                   # existing core (preserve + refactor behind interfaces)
  clinical/                   # NEW deterministic clinical policy modules
    progression.py
    referral.py
  contracts/                  # NEW adapters/interfaces
    capture.py
    inference.py
    intelligence.py
backend/
  api/
    routes/
  services/
  repositories/
  models/
tests/
docs/
```

---

## E. Database Schema (target normalized model)

Core entities to introduce while preserving existing tables:

- `users` (role-based)
- `patients`
- `patient_medical_profiles`
- `screenings`
- `fundus_images`
- `image_quality_results`
- `disease_predictions`
- `model_versions`
- `explanations`
- `progression_assessments`
- `referrals`
- `doctor_reviews`
- `follow_ups`
- `sync_events`
- `audit_logs`

Schema principles:

- Immutable IDs (UUID/ULID), created/updated/version fields.
- Screening event immutability after finalization.
- Model metadata stored per prediction record.
- Separate AI output from clinician final decision.

---

## F. API Design (target contracts)

Recommended route evolution (backward compatible):

- `POST /api/screenings`
- `POST /api/screenings/{id}/quality-check`
- `POST /api/screenings/{id}/screen`
- `POST /api/screenings/{id}/explanation`
- `POST /api/screenings/{id}/progression`
- `POST /api/screenings/{id}/triage`
- `POST /api/screenings/{id}/doctor-review`
- `GET /api/patients/{id}/history`
- `POST /api/reports`
- `POST /api/sync`
- `POST /api/medical/query`

Cross-cutting conventions:

- Request schema validation
- structured error envelope
- request_id + trace metadata
- authn/authz middleware

---

## G. AI/ML Architecture

### Core principles

- Keep inference code behind service/adapter boundaries.
- Model plugin contract per disease.
- Persist model/preprocessing/threshold versions per prediction.

### Suggested abstractions

```python
class DiseaseScreeningModel(Protocol):
    disease: str
    version: str
    def predict(self, image: Any) -> dict: ...

class SafetyEngine(Protocol):
    def evaluate(self, *, quality: dict, predictions: list[dict]) -> dict: ...
```

---

## H. RAG Architecture

Pipeline:

`Intent -> Retriever -> Filtered clinical docs -> Context builder -> LLM -> Grounded answer + citations`

Requirements:

- curated guideline corpus
- source metadata filters (disease/population/region/version)
- no unsupported advice; explicit insufficient-evidence response

---

## I. Offline/Sync Architecture

- Local SQLite queue on edge device.
- Sync events include:
  - `entity_id`, `entity_type`, `version`, `created_at`, `updated_at`, `sync_state`, `device_id`.
- Conflict policy: no silent overwrite, explicit resolution path.

---

## J. Security Architecture

- JWT/session auth with role-scoped authorization.
- Role model: `ADMIN`, `HEALTH_WORKER`, `DOCTOR`, `PATIENT`.
- Signed URL strategy for image access (when object storage added).
- Expanded audit log fields: actor, action, patient, before/after hashes.
- Input validation + throttling + secure secret handling.

---

## K. MLOps Architecture

Planned progression:

`dataset versioning -> training -> eval -> experiment tracking -> registry -> validation -> deploy -> monitoring`

Metrics to track:

- sensitivity/specificity for referable DR
- precision/recall/F1/ROC-AUC
- calibration/ECE
- inference latency and drift signals

---

## L. Implementation Roadmap

### Phase 1 — Stabilization

1. Add architecture spec + deterministic domain modules (progression/triage).
2. Add unit tests for policy logic.
3. Add minimal API endpoints for progression + triage using existing scan records.

### Phase 2 — Core pipeline hardening

1. Capture abstraction.
2. Formal quality gate contract.
3. Safety/confidence decision module.

### Phase 3 — Longitudinal intelligence

1. Persist progression assessments.
2. Patient timeline API and UI.

### Phase 4 — Medical intelligence (RAG)

1. Curated corpus ingestion.
2. Retrieval + citation-backed response APIs.

### Phase 5 — Referral + doctor workflow

1. Doctor review entities/endpoints.
2. Deterministic referral governance.

### Phase 6 — Accessibility/offline polish

1. Language-safe message pipeline.
2. Offline queue/sync with conflict handling.

### Phase 7 — Production engineering

1. RBAC/auth.
2. observability/metrics.
3. MLOps and CI quality gates.

---

## M. Risk Register (initial)

| Risk | Impact | Likelihood | Mitigation |
|---|---:|---:|---|
| Over-coupled route logic in `app.py` | High | High | Move logic into services incrementally |
| Missing auth/RBAC | High | High | Introduce auth middleware before broad deployment |
| Offline/live data divergence in frontend | High | Medium | Single source-of-truth sync state model |
| Medical overstatement in generated text | High | Medium | deterministic policy + guarded prompt + disclaimers |
| Model drift/domain shift | High | Medium | registry + calibration checks + monitoring |
| SQLite scaling limits | Medium | Medium | repository abstraction and PostgreSQL migration path |
| No formal tests | High | High | add unit/integration tests in each phase |
| Local file artifact sprawl | Medium | Medium | storage abstraction + retention policy |

---

## Immediate Phase-1 Deliverables Added in This Iteration

1. Architecture A–M audit document (this file).
2. Deterministic progression risk engine (new module).
3. Deterministic referral policy engine (new module).
4. New API endpoints for progression and triage on existing scans.
5. Unit tests for progression and referral logic.
