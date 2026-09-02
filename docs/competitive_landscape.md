# DrishtiAI — Competitive Landscape (SIH 2026 · PS 26038)

## Honest Positioning

DrishtiAI is entering a market with established, regulator-cleared incumbents. This document is designed to prepare the team for direct jury questions about competitors — lead with honesty, pivot to genuine differentiators.

## Key Competitors

### Remidio (Medios AI / Medios HI) — Primary Incumbent
- **HQ**: Bengaluru, India
- **Regulatory**: CE-marked Class II SaMD; CDSCO clearance
- **Scale**: 16M+ screenings across 55+ countries
- **Customers**: Aravind Eye Care, Narayana Nethralaya, L V Prasad, Dr. Mohan's
- **Capabilities**: DR grading (offline, on-device), glaucoma, AMD detection
- **Recent**: 2026 partnership with RetinaRisk for personalized screening-interval prediction
- **Compliance**: ABDM, HIPAA, GDPR

### EyeArt (Eyenuk) — Global
- **Regulatory**: FDA-cleared (US)
- **Focus**: Autonomous DR screening (no human-in-loop for negative cases)
- **Deployment**: Primarily cloud-based

### IDx-DR (Digital Diagnostics) — US Market
- **Regulatory**: First FDA-authorized autonomous AI diagnostic (2018)
- **Deployment**: Point-of-care, autonomous screening

## Where DrishtiAI is NOT Better

| Dimension | Remidio / EyeArt | DrishtiAI |
|---|---|---|
| Regulatory status | CE/CDSCO/FDA cleared | None — hackathon prototype |
| Real-world evidence | Millions of screenings | Zero deployments |
| Camera hardware | Proprietary integrated device | No hardware — relies on third-party cameras |
| Revenue model | Commercial bundle | Open-source, no revenue model yet |

## Where DrishtiAI IS Genuinely Different

| Dimension | Incumbents | DrishtiAI |
|---|---|---|
| **3-layer explainability** | Stage + referral output; limited visual explanation | Raw scan → vessel map → Grad-CAM heatmap + plain-language narrative + lesion-level evidence |
| **Multilingual patient counseling** | Not a primary marketed feature | Hindi, Gujarati, English; audio + accessible PDF; designed for low-literacy patients |
| **Zero licensing cost** | Commercial per-scan or per-device license | Fully open-source; no licensing barrier for cash-strapped PHCs |
| **Transparency** | Proprietary models | Open weights, reproducible training, auditable pipeline |
| **Full-stack integration** | Screening output only | Patient longitudinal records + scheduling + progression tracking in one tool |

## Jury Response Framework

**Q: "Why should we back a student prototype over Remidio?"**

> "We absolutely acknowledge Remidio's scale, regulatory status, and proven track record — they've screened 16 million patients. We're not claiming to replace them. What we're building is a **lightweight, open, fully-explainable layer** that addresses three gaps the commercial incumbents structurally don't prioritize:
>
> 1. **Deep multilingual accessibility** — audio counseling in local languages for low-literacy patients, not just a referral slip
> 2. **Full visual explainability** for the reviewing clinician — three visual layers plus a narrative, not a black-box stage output
> 3. **Zero licensing cost** — no per-scan fee for district health budgets that can't afford commercial tools
>
> Our goal is to complement existing screening infrastructure, not compete with it."

## Cost Comparison (Rough Estimates)

| Component | DrishtiAI | Commercial Alternative |
|---|---|---|
| Software license | ₹0 (open-source) | ₹5,000–50,000/year per device |
| Hardware (fundus camera) | ₹20,000–80,000 (Remidio FOP adapter or similar) | ₹80,000–3,00,000 (bundled) |
| Per-screening cost (software) | ₹0 | ₹50–500 per scan |
| Cloud/API cost (if online) | ~₹0.50/scan (Gemma API) | Included in license |
| Offline operation | Yes (DRISHTIAI_OFFLINE=true) | Yes (Remidio Medios HI) |

## Regulatory Pathway

DrishtiAI would classify as **Class B/C SaMD** under India's Medical Device Rules (2017). The pathway:
1. Pre-submission meeting with CDSCO
2. Clinical validation study (multi-site, prospective)
3. Application for import/manufacture license
4. Post-market surveillance plan

This is acknowledged as a future requirement, not a current capability. The tool is explicitly positioned as **decision-support with mandatory human sign-off**, not autonomous diagnosis.
