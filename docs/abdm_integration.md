# DrishtiAI — ABDM Integration Sketch

## Overview

The Ayushman Bharat Digital Mission (ABDM) provides a national health data exchange layer via FHIR-based APIs. DrishtiAI's current SQLite database serves as the **offline buffer**; when connectivity is available, records sync to the patient's ABHA (Ayushman Bharat Health Account) record.

## Architecture

```
┌──────────────────────────────────────┐
│       PHC / Camp (Offline)            │
│                                       │
│  DrishtiAI App                        │
│  ┌──────────┐    ┌──────────────┐    │
│  │ Fundus    │───▶│  AI Pipeline  │    │
│  │ Camera    │    │  (IQA→Grade)  │    │
│  └──────────┘    └──────┬───────┘    │
│                          │            │
│                   ┌──────▼───────┐    │
│                   │  SQLite DB    │    │
│                   │  (offline     │    │
│                   │   buffer)     │    │
│                   └──────┬───────┘    │
│                          │            │
└──────────────────────────┼────────────┘
                           │ When online
                   ┌───────▼──────────┐
                   │   ABDM Gateway    │
                   │   (FHIR APIs)     │
                   └───────┬──────────┘
                           │
              ┌────────────▼────────────┐
              │  Patient's ABHA Record   │
              │  (Health Locker)          │
              └─────────────────────────┘
```

## FHIR Resource Mapping

| DrishtiAI Entity | FHIR Resource | Notes |
|---|---|---|
| Patient record | `Patient` | Map to ABHA ID via `Patient.identifier` |
| Fundus scan | `ImagingStudy` + `Media` | Store the fundus image as a DICOM-wrapped attachment |
| AI grading result | `Observation` | Code: LOINC `71491-5` (Retinal image study), value: ICDR grade |
| Referable flag | `Observation` | Boolean flag for Level 2+ routing |
| Clinical report | `DiagnosticReport` | Wraps all observations + PDF attachment |
| Consultation | `Encounter` | Links patient, practitioner, and diagnostic results |

## Sync Protocol

1. **Offline operation** (default):
   - All data stored in local SQLite (`drishtiai.db`)
   - Patient consent captured at intake with timestamp
   - Data encrypted at rest using SQLCipher (roadmap)

2. **Connectivity detected**:
   - Background sync service checks for unsynced records
   - Creates/updates FHIR `DiagnosticReport` bundle via ABDM HIP APIs
   - Attaches PDF report as a `DocumentReference`
   - Marks records as synced in SQLite

3. **Conflict resolution**:
   - SQLite is the source of truth for recent data
   - ABDM record is append-only (no edits to synced reports)
   - Last-write-wins for patient demographic updates

## Data Protection (DPDP Act Compliance)

| Requirement | Implementation |
|---|---|
| Consent | Explicit consent captured before first scan, stored with timestamp |
| Purpose limitation | Data used only for DR screening and follow-up |
| Data minimization | Only clinically necessary fields collected |
| Retention | Configurable retention period; auto-archive after 5 years |
| Right to erasure | `DELETE /api/patients/<id>` cascades to all scans and reports |
| Encryption at rest | SQLCipher for SQLite (roadmap); HTTPS for transit |
| Access control | Role-based: ASHA worker (capture only), nurse (view), doctor (full) |
| Breach notification | Audit trail in database; anomaly detection on access patterns |

## Implementation Roadmap

| Phase | Scope | Timeline |
|---|---|---|
| Phase 1 (Current) | SQLite offline buffer, consent capture | ✅ Done |
| Phase 2 | ABDM HIP registration, FHIR bundle creation | Post-hackathon |
| Phase 3 | Background sync service, conflict resolution | 3-6 months |
| Phase 4 | SQLCipher encryption, role-based access | 6-12 months |
