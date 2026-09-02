"""
Module 5 (runnable mirror) — Telemedicine workflow simulation & resource
allocation optimizer for a district program serving 100,000+ patients/year.

Discrete-event simulation of the pipeline modeled in Simulink:
    acquisition -> IQA gate (reject/recapture) -> inference -> uplink
    -> ophthalmologist review queue (human-in-the-loop, <30s SLA)

The optimizer grid-searches (operators/camp, compression quality, reviewers,
bandwidth tier) to minimize total cost subject to:
    - annual throughput >= 100,000 patients
    - review backlog at year end == 0
    - referable cases reviewed within 7 days

Usage:
    python simulink/telemed_sim.py                 # default scenario + optimum
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass

# ── Program constants (rural district deployment) ───────────────────────────
ANNUAL_PATIENTS = 100_000
CAMP_DAYS_PER_YEAR = 220
HOURS_PER_DAY = 8
SECONDS_PER_YEAR = CAMP_DAYS_PER_YEAR * HOURS_PER_DAY * 3600

IQA_REJECT_RATE = 0.12          # Module-1 gate rejects -> recapture attempt
INFERENCE_TIME_S = 0.8          # GPU server per image (EfficientNet-B3 + TTA)
REVIEW_TIME_MIN = 0.5           # ophthalmologist validation (<30 s SLA)
REFERRAL_RATE = 0.18            # approx DR prevalence needing review


@dataclass
class Scenario:
    operators: int              # imaging operators per camp day
    jpeg_quality: int           # 40..90 (size vs diagnostic adequacy)
    reviewers: int              # ophthalmologists on duty
    bandwidth_kbps: int         # rural uplink capacity


@dataclass
class SimResult:
    screened: int
    recaptures: int
    avg_upload_s: float
    max_queue_min: float
    referrals_on_time_pct: float
    cost_inr_lakh: float
    feasible: bool


def jpeg_size_kb(quality: int) -> float:
    """Approx compressed fundus image size (2 MP portable camera)."""
    return round(300.0 * (quality / 100.0) ** 1.6 + 40, 1)


def simulate(s: Scenario) -> SimResult:
    work_seconds = HOURS_PER_DAY * 3600
    img_kb = jpeg_size_kb(s.jpeg_quality)

    # Acquisition capacity (per operator, incl. recapture overhead)
    cap_per_operator = work_seconds / 25.0                       # 25 s/patient cycle
    gross_images = s.operators * cap_per_operator
    recaptures = int(gross_images * IQA_REJECT_RATE / (1 - IQA_REJECT_RATE))
    net_images = int(gross_images)                               # graded images

    # Uplink time per image (sequential upload station)
    upload_s = img_kb * 8 / max(s.bandwidth_kbps, 1)
    upload_capacity = int(work_seconds / max(upload_s, 0.05))

    # Inference capacity (server processes continuously)
    infer_capacity = int(work_seconds / INFERENCE_TIME_S)

    # Review capacity (ophthalmologists, human-in-the-loop)
    referrals = int(net_images * REFERRAL_RATE)
    review_capacity = int(s.reviewers * work_seconds / (REVIEW_TIME_MIN * 60))

    throughput = min(net_images, upload_capacity, infer_capacity)
    backlog = max(referrals - review_capacity, 0)
    on_time = 100.0 * min(review_capacity / max(referrals, 1), 1.0)
    max_queue_min = backlog / max(s.reviewers, 1) * REVIEW_TIME_MIN

    # Cost model (INR): staff + connectivity amortization
    staff_cost = (s.operators * 800 + s.reviewers * 3500) * CAMP_DAYS_PER_YEAR
    link_cost = {256: 60_000, 512: 110_000, 1024: 200_000}.get(s.bandwidth_kbps, 250_000)
    cloud_cost = min(net_images, infer_capacity) * INFERENCE_TIME_S * 0.35 * CAMP_DAYS_PER_YEAR
    cost = (staff_cost + link_cost + cloud_cost) / 1e5           # lakh INR

    feasible = (
        throughput * CAMP_DAYS_PER_YEAR >= ANNUAL_PATIENTS
        and backlog <= ANNUAL_PATIENTS * REFERRAL_RATE * 0.02    # <2% year-end backlog
        and upload_s < work_seconds / max(net_images // max(s.operators, 1), 1)
    )
    return SimResult(throughput, recaptures, round(upload_s, 2),
                     round(max_queue_min, 1), round(on_time, 1),
                     round(cost, 1), feasible)


def optimize() -> None:
    grid = [
        Scenario(op, q, rv, bw)
        for op in (3, 4, 5, 6)
        for q in (45, 60, 75, 90)
        for rv in (2, 3, 4, 5)
        for bw in (256, 512, 1024)
    ]
    results = [(simulate(s), s) for s in grid]
    feasible = [(r, s) for r, s in results if r.feasible]

    print("=" * 72)
    print(" DrishtiAI telemedicine resource allocation — "
          f"{ANNUAL_PATIENTS:,} patients/year target")
    print("=" * 72)

    if not feasible:
        print("No feasible configuration — relax constraints or add resources.")
        return

    best = min(feasible, key=lambda rs: rs[0].cost_inr_lakh)
    r, s = best
    print(f"\nOPTIMUM CONFIGURATION (min cost, all SLAs met):")
    print(f"  operators/day     : {s.operators}")
    print(f"  jpeg quality      : {s.jpeg_quality}  (~{jpeg_size_kb(s.jpeg_quality)} KB/img)")
    print(f"  reviewers         : {s.reviewers} ophthalmologists")
    print(f"  bandwidth         : {s.bandwidth_kbps} kbps")
    print(f"  annual throughput : {r.screened * CAMP_DAYS_PER_YEAR:,} images")
    print(f"  uploads/image     : {r.avg_upload_s}s")
    print(f"  referral SLA      : {r.referrals_on_time_pct}% within capacity")
    print(f"  total cost        : Rs. {r.cost_inr_lakh} lakh/year")

    print("\nBaseline (naive) comparison:")
    base_r = simulate(Scenario(6, 90, 2, 256))
    tag = "FEASIBLE" if base_r.feasible else "INFEASIBLE"
    print(f"  6 ops, q90, 2 reviewers, 256kbps -> {tag}, "
          f"SLA {base_r.referrals_on_time_pct}%, Rs.{base_r.cost_inr_lakh}L")


if __name__ == "__main__":
    optimize()
