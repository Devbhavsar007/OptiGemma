"""
Generate DrishtiAI SIH 2025 Presentation — 8-page HTML → Print to PDF.

Usage:
    python generate_presentation.py
    Then open DrishtiAI_SIH_Presentation.html in a browser and print (Ctrl+P)
    with: A4 Landscape, Background Graphics ON, Margins: None.
"""

import os

OUT = os.path.join(os.path.dirname(__file__), "DrishtiAI_SIH_Presentation.html")

CSS = r"""
:root{--bg:#0a0e1a;--sf:#111827;--sf2:#1a2236;--bd:rgba(255,255,255,.06);--tx:#e2e8f0;--dm:#94a3b8;--ac:#60a5fa;--ac2:#818cf8;--gn:#34d399;--am:#fbbf24;--rs:#fb7185;--cy:#22d3ee}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{font-size:14px}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--tx);line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:297mm;min-height:210mm;padding:28px 36px;margin:0 auto 2px;background:var(--bg);position:relative;overflow:hidden;page-break-after:always;display:flex;flex-direction:column}
.pg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 40% at 85% 15%,rgba(96,165,250,.06),transparent),radial-gradient(ellipse 50% 50% at 10% 80%,rgba(129,140,248,.04),transparent);pointer-events:none}
.hd{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--bd);margin-bottom:18px;position:relative;z-index:1}
.la{display:flex;align-items:center;gap:8px}
.li{width:28px;height:28px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700}
.lt{font-weight:700;font-size:1.15rem;letter-spacing:-.02em}
.pt{font-size:.72rem;color:var(--dm);font-weight:500;letter-spacing:.08em;text-transform:uppercase}
h1{font-size:2.6rem;font-weight:900;letter-spacing:-.04em;line-height:1.1;background:linear-gradient(135deg,#fff 0%,var(--ac) 60%,var(--ac2) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
h2{font-size:1.55rem;font-weight:800;letter-spacing:-.03em;color:#fff;margin-bottom:10px;line-height:1.2}
h3{font-size:1.05rem;font-weight:700;color:var(--ac);margin-bottom:6px;letter-spacing:-.01em}
h4{font-size:.85rem;font-weight:600;color:var(--tx);margin-bottom:4px}
.sub{font-size:1.05rem;color:var(--dm);font-weight:400;line-height:1.5;max-width:650px}
p{font-size:.82rem;color:var(--dm);line-height:1.55}
.sr{display:flex;gap:10px;margin:14px 0 10px;flex-wrap:wrap}
.st{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:10px 16px;text-align:center;min-width:100px;flex:1}
.sv{font-size:1.5rem;font-weight:800;letter-spacing:-.03em}
.sl{font-size:.68rem;color:var(--dm);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.g21{display:grid;grid-template-columns:2fr 1fr;gap:14px}
.cd{background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px 16px;position:relative}
.cs{background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:10px 14px}
.ca{border-left:3px solid var(--ac)}.cg{border-left:3px solid var(--gn)}.cam{border-left:3px solid var(--am)}.cr{border-left:3px solid var(--rs)}.cc{border-left:3px solid var(--cy)}
.tg{display:inline-block;font-size:.65rem;font-weight:600;padding:2px 8px;border-radius:6px;letter-spacing:.04em;text-transform:uppercase}
.tb{background:rgba(96,165,250,.15);color:var(--ac)}.tgn{background:rgba(52,211,153,.15);color:var(--gn)}.ta{background:rgba(251,191,36,.15);color:var(--am)}.tr{background:rgba(251,113,133,.15);color:var(--rs)}.tc{background:rgba(34,211,238,.15);color:var(--cy)}.tp{background:rgba(129,140,248,.15);color:var(--ac2)}
.fr{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fs{background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:6px 12px;font-size:.72rem;font-weight:600;color:var(--tx);white-space:nowrap}
.fa{color:var(--ac);font-size:.9rem}
.tbl{width:100%;border-collapse:collapse;font-size:.75rem}
.tbl th{background:var(--sf2);color:var(--ac);font-weight:600;padding:6px 10px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--bd)}
.tbl td{padding:6px 10px;border-bottom:1px solid var(--bd);color:var(--dm)}
.tbl tr:last-child td{border-bottom:none}
.mb{height:6px;border-radius:3px;background:var(--sf2);margin-top:4px;overflow:hidden}
.mf{height:100%;border-radius:3px}
.ft{margin-top:auto;padding-top:10px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center;font-size:.65rem;color:var(--dm)}
.nb{display:inline-block;font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:linear-gradient(135deg,var(--gn),#059669);color:#fff;letter-spacing:.08em;text-transform:uppercase;vertical-align:middle;margin-left:4px}
.mn{font-family:'JetBrains Mono',monospace}
ul{padding-left:16px}ul li{font-size:.8rem;color:var(--dm);margin-bottom:3px}ul li strong{color:var(--tx)}
@media print{body{background:var(--bg)}.pg{margin:0;page-break-after:always;page-break-inside:avoid}}
@page{size:A4 landscape;margin:0}
"""


def hdr(tag):
    return f'''<div class="hd"><div class="la"><div class="li">👁</div><span class="lt">DrishtiAI</span></div><span class="pt">{tag}</span></div>'''


def ftr(left, page):
    return f'<div class="ft"><span>{left}</span><span>Page {page}/8</span></div>'


# ─── PAGE 1 ───
P1 = f'''<div class="pg">
{hdr("Smart India Hackathon 2025")}
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1">
<div style="margin-bottom:6px"><span class="tg tb">Problem Statement ID — SIH1234</span> <span class="tg tp">Theme — MedTech / Life Sciences</span></div>
<h1>Autonomous Retinal Diagnostic AI<br>for Diabetic Retinopathy Screening</h1>
<p class="sub" style="margin-top:4px">DrishtiAI is an end-to-end clinical platform that combines dual-model deep learning (EfficientNet-B3 + Tanwar-12 CNN), closed-loop self-optimizing training, MATLAB Simulink state-machine orchestration, and Google Gemma-4 intelligence to democratize DR screening across India.</p>
<div class="sr" style="margin-top:18px">
<div class="st"><div class="sv" style="color:var(--ac)">98.7%</div><div class="sl">Sensitivity</div></div>
<div class="st"><div class="sv" style="color:var(--gn)">86.3%</div><div class="sl">Specificity</div></div>
<div class="st"><div class="sv" style="color:var(--am)">0.884</div><div class="sl">Cohen's κ</div></div>
<div class="st"><div class="sv" style="color:var(--cy)">5</div><div class="sl">DR Stages</div></div>
<div class="st"><div class="sv" style="color:var(--rs)">3</div><div class="sl">Languages</div></div>
<div class="st"><div class="sv" style="color:var(--ac2)">AAA</div><div class="sl">WCAG 2.2</div></div>
</div>
<div class="fr" style="margin-top:16px">
<span class="fs">📷 Fundus Capture</span><span class="fa">→</span>
<span class="fs">🔬 IQA Gate</span><span class="fa">→</span>
<span class="fs">🧠 Dual-Model AI</span><span class="fa">→</span>
<span class="fs">🗺️ Grad-CAM + Vessels</span><span class="fa">→</span>
<span class="fs">💬 Gemma-4 Report</span><span class="fa">→</span>
<span class="fs">🔊 Audio</span><span class="fa">→</span>
<span class="fs">📄 PDF</span>
</div>
<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
<span class="tg tb">EfficientNet-B3</span><span class="tg tgn">PyTorch 2.x</span><span class="tg ta">TensorFlow 2.x</span><span class="tg tc">Gemma-4 31B-IT</span><span class="tg tp">MATLAB / Simulink</span><span class="tg tr">ONNX Runtime</span><span class="tg tgn">React 18 + Vite</span><span class="tg tb">Flask REST</span>
</div>
</div>
{ftr("DrishtiAI v3.0 — Powered by Gemma-4 Vision AI — Dual-Model EfficientNet-B3 + Tanwar-12 CNN", 1)}
</div>'''

# ─── PAGE 2 ───
P2 = f'''<div class="pg">
{hdr("Problem &amp; Solution")}
<div class="g2" style="flex:1;position:relative;z-index:1">
<div>
<h2>Understanding The Problem</h2>
<p style="margin-bottom:10px;color:var(--rs)">Challenges in Current Diabetic Retinopathy Screening</p>
<div class="cd cr" style="margin-bottom:8px"><h4>⏳ Delayed Detection</h4><p>Manual fundus review by ophthalmologists takes days, causing late-stage diagnosis and irreversible vision loss in 4.2% of India's diabetic population.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>🔒 Black-Box AI Distrust</h4><p>Existing AI classifiers provide no visual explanation of predictions, creating clinical adoption barriers among ophthalmologists.</p></div>
<div class="cd cc" style="margin-bottom:8px"><h4>🌍 Language &amp; Literacy Barriers</h4><p>Patients in rural India receive reports only in English with small fonts, excluding Hindi/Gujarati speakers and low-vision elderly patients.</p></div>
<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--ac2)"><h4>🔗 Fragmented Workflows</h4><p>Screening, grading, reporting, and follow-up tracking exist as disconnected manual steps with no unified digital pipeline.</p></div>
<div class="cd ca" style="margin-bottom:8px"><h4>🏕️ No Rural Camp Support</h4><p>Current tools lack offline batch processing for mobile eye camps serving thousands of patients in a single day.</p></div>
</div>
<div>
<h2>Our Solution: DrishtiAI</h2>
<p style="margin-bottom:10px;color:var(--gn)">End-to-End Autonomous Retinal Diagnostic AI</p>
<div class="cd cg" style="margin-bottom:8px"><h4>🧠 Dual-Model AI Engine</h4><p>EfficientNet-B3 (PyTorch) + Tanwar-12 CNN (TensorFlow) with automated fallback. 98.7% sensitivity, 0.884 Cohen's κ on APTOS 2019.</p></div>
<div class="cd ca" style="margin-bottom:8px"><h4>🔬 3-Tier Explainable AI</h4><p>Raw Fundus + Frangi Vessel Segmentation + Grad-CAM Attention Heatmaps eliminate black-box clinical distrust.</p></div>
<div class="cd cc" style="margin-bottom:8px"><h4>💬 Gemma-4 Intelligence</h4><p>Google's Gemma-4 31B-IT generates plain-language clinical narratives and 6/12-month progression risk forecasts.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>🔄 Closed-Loop Self-Training <span class="nb">NEW</span></h4><p>Autonomous training loop with hard-example mining, curriculum learning, temperature calibration, and ophthalmologist-in-the-loop review queues.</p></div>
<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--ac2)"><h4>🔧 MATLAB/Simulink Orchestration <span class="nb">NEW</span></h4><p>Stateflow state-machine controls the full diagnostic pipeline: IQA gating → preprocessing → grading → explainability → report generation.</p></div>
<div style="margin-top:8px"><p style="font-weight:600;color:var(--tx);margin-bottom:6px">Unique Selling Propositions</p>
<div style="display:flex;gap:6px;flex-wrap:wrap">
<span class="tg tgn">Okabe-Ito Palette</span><span class="tg tb">Gemma-4 31B LLM</span><span class="tg ta">PlanIA-Inspired UI</span><span class="tg tc">Edge-Ready</span><span class="tg tr">Self-Optimizing</span><span class="tg tp">ONNX Export</span>
</div></div>
</div>
</div>
{ftr("DrishtiAI v3.0 — Smart India Hackathon 2025", 2)}
</div>'''

# ─── PAGE 3 ───
P3 = f'''<div class="pg">
{hdr("System Architecture")}
<h2>Technical Architecture &amp; Implementation</h2>
<div class="g21" style="margin-top:8px;flex:1;position:relative;z-index:1">
<div>
<h3>🔬 5-Stage Diagnostic Pipeline</h3>
<div class="g2" style="margin-top:8px;gap:8px">
<div class="cs ca"><h4>1. Fundus Ingestion &amp; IQA <span class="nb">NEW</span></h4><p>Circular crop, background removal, Gaussian blur, Ben Graham normalization. IQA gate rejects blurry/overexposed frames.</p></div>
<div class="cs cg"><h4>2. Dual-Model Classification</h4><p>Primary: PyTorch EfficientNet-B3 with ordinal regression + referable head. Fallback: TF Tanwar-12 CNN with confidence routing.</p></div>
<div class="cs cc"><h4>3. Explainability Generation</h4><p>Frangi multi-scale vessel segmentation extracts vessel density &amp; A/V caliber ratio. Grad-CAM highlights attention hotspots.</p></div>
<div class="cs cam"><h4>4. LLM Clinical Narrative</h4><p>Gemma-4 31B-IT REST API generates: diagnosis, progression forecast, lifestyle recommendations, urgency classification.</p></div>
</div>
<div class="cs cr" style="margin-top:8px"><h4>5. Accessible Output &amp; Delivery</h4><p>WCAG 2.2 AAA dual-coded badges (color + shape), multilingual translation (EN/HI/GU), Web Speech audio, 18pt+ PDF export.</p></div>
<div style="margin-top:12px"><h3>Implementation Flow</h3>
<div style="background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--dm);line-height:1.8;text-align:center">
<span style="color:var(--ac);font-weight:600">FRONTEND</span> React 18 + TypeScript + Vite + Tailwind CSS v4<br>│<br>
<span style="color:var(--am);font-weight:600">API GATEWAY</span> Vite Dev Proxy (:3000 → :5000)<br>│<br>
<span style="color:var(--gn);font-weight:600">BACKEND</span> Flask REST API + Python 3.10+<br>│<br>
<span style="color:var(--rs);font-weight:600">AI ENGINE</span> IQA → Preprocessor → Detector → GradCAM → Segmentor → Gemma Reporter<br>│<br>
<span style="color:var(--cy);font-weight:600">MATLAB</span> Simulink Stateflow → ONNX Import → Report Gen<br>│<br>
<span style="color:var(--ac2);font-weight:600">DATABASE</span> SQLite (Patients, Scans, Consultations)
</div></div>
</div>
<div>
<h3>⚙️ Tech Stack</h3>
<div class="cd" style="margin-top:8px;margin-bottom:8px"><h4 style="color:var(--ac)">Frontend</h4><ul><li>React 18 + TypeScript</li><li>Vite 6.4 (HMR)</li><li>Tailwind CSS v4</li><li>Lucide Icons</li><li>html2canvas / FPDF</li></ul></div>
<div class="cd" style="margin-bottom:8px"><h4 style="color:var(--gn)">AI &amp; ML</h4><ul><li>PyTorch 2.x (EfficientNet-B3)</li><li>TensorFlow 2.x (Tanwar-12)</li><li>ONNX Runtime <span class="nb">NEW</span></li><li>OpenCV + NumPy</li><li>Google Generative AI</li></ul></div>
<div class="cd" style="margin-bottom:8px"><h4 style="color:var(--am)">Backend</h4><ul><li>Flask 3.1 REST API</li><li>SQLite3</li><li>python-dotenv</li><li>Gunicorn (WSGI)</li></ul></div>
<div class="cd" style="margin-bottom:8px"><h4 style="color:var(--ac2)">MATLAB/Simulink <span class="nb">NEW</span></h4><ul><li>Stateflow State Machine</li><li>Image Processing Toolbox</li><li>ONNX Model Importer</li><li>Report Generator</li></ul></div>
<div class="cd"><h4 style="color:var(--cy)">Database Schema</h4><p class="mn" style="font-size:.7rem;line-height:1.7">PATIENTS: id, name, age, gender, hba1c<br>SCANS: id, patient_id(FK), stage, confidence<br>CONSULTATIONS: id, scan_id(FK), audio_lang, pdf</p></div>
</div>
</div>
{ftr("DrishtiAI v3.0 — Smart India Hackathon 2025", 3)}
</div>'''

# ─── PAGE 4: CLOSED-LOOP TRAINING ───
P4 = f'''<div class="pg">
{hdr('Closed-Loop Training Pipeline <span class="nb">NEW</span>')}
<h2>Self-Optimizing Closed-Loop Training Pipeline</h2>
<p style="margin-bottom:12px">A fully autonomous training system that iteratively improves classification accuracy through curriculum learning, hard-example mining, temperature calibration, and human-in-the-loop review queues.</p>
<div class="g2" style="flex:1;position:relative;z-index:1">
<div>
<h3>🔄 Iterative Loop Architecture</h3>
<div class="cd" style="margin-top:8px;margin-bottom:10px">
<div class="fr" style="justify-content:center;margin-bottom:8px">
<span class="fs" style="background:rgba(96,165,250,.15);border-color:var(--ac)">Phase 1: Head Only</span><span class="fa">→</span>
<span class="fs" style="background:rgba(251,191,36,.15);border-color:var(--am)">Phase 2: Partial Unfreeze</span><span class="fa">→</span>
<span class="fs" style="background:rgba(52,211,153,.15);border-color:var(--gn)">Phase 3: Full Fine-Tune</span>
</div>
<p style="text-align:center;margin-top:4px">↓ Evaluate → Calibrate → Mine Hard Examples → Reweight → Repeat ↑</p>
</div>
<h3 style="margin-top:12px">📊 Live Training Metrics (APTOS 2019)</h3>
<table class="tbl" style="margin-top:8px">
<thead><tr><th>Iter</th><th>Loss</th><th>Accuracy</th><th>Sensitivity</th><th>Specificity</th><th>κ Score</th></tr></thead>
<tbody>
<tr><td><span class="tg tb">1</span></td><td class="mn">1.003</td><td class="mn">80.05%</td><td class="mn" style="color:var(--gn);font-weight:700">98.70%</td><td class="mn">85.38%</td><td class="mn">0.863</td></tr>
<tr><td><span class="tg tgn">2</span></td><td class="mn">0.522</td><td class="mn">81.42%</td><td class="mn" style="color:var(--gn);font-weight:700">98.70%</td><td class="mn">86.32%</td><td class="mn">0.884</td></tr>
<tr style="font-style:italic"><td><span class="tg ta">3+</span></td><td colspan="5" style="text-align:center">Training in progress — targeting ≥95% accuracy</td></tr>
</tbody></table>
<div style="margin-top:12px"><h3>🎯 Clinical Target Thresholds</h3>
<div class="g3" style="margin-top:8px">
<div class="cs" style="text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--gn)">≥90%</div><div class="sl">Sensitivity</div><div class="mb"><div class="mf" style="width:98.7%;background:var(--gn)"></div></div><div style="font-size:.7rem;margin-top:4px;color:var(--gn)">✓ 98.7% achieved</div></div>
<div class="cs" style="text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--am)">≥85%</div><div class="sl">Specificity</div><div class="mb"><div class="mf" style="width:86.3%;background:var(--am)"></div></div><div style="font-size:.7rem;margin-top:4px;color:var(--gn)">✓ 86.3% achieved</div></div>
<div class="cs" style="text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--ac)">≥95%</div><div class="sl">Accuracy</div><div class="mb"><div class="mf" style="width:81.4%;background:var(--ac)"></div></div><div style="font-size:.7rem;margin-top:4px;color:var(--am)">⟳ 81.4% — iterating</div></div>
</div></div>
</div>
<div>
<h3>🛠️ Advanced Training Techniques</h3>
<div class="cd ca" style="margin-top:8px;margin-bottom:8px"><h4>Curriculum Learning (3-Phase)</h4><p><strong>Head:</strong> 4 epochs, LR=1e-3 — train classifier heads only.<br><strong>Partial:</strong> 6 epochs, LR=[1e-4, 5e-4] — unfreeze last 3 backbone blocks.<br><strong>Full:</strong> 8 epochs, LR=[5e-6, 2e-5, 1e-4] — full network fine-tuning.</p></div>
<div class="cd cg" style="margin-bottom:8px"><h4>Hard-Example Mining</h4><p>After each iteration, analyzes per-sample losses and boosts sampling weights for difficult cases by α=0.8×. Borderline referable cases receive 1.5× bonus.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>Temperature Calibration</h4><p>Platt-scaling temperature optimized on validation set. Current T=2.193 with referable decision threshold=0.32 for maximum sensitivity.</p></div>
<div class="cd cr" style="margin-bottom:8px"><h4>Ordinal Regression + Referable Head</h4><p>Dual-head architecture: ordinal logits encode grade ordering (0→4), separate binary referable head flags stages ≥2 for urgent referral.</p></div>
<div class="cd cc" style="margin-bottom:8px"><h4>Ophthalmologist-in-the-Loop</h4><p>Each iteration exports top 100 most-uncertain validation cases to <code>review_queue.csv</code> with entropy scores for targeted expert review.</p></div>
<h3 style="margin-top:12px">📦 Training Artifacts</h3>
<div class="cd" style="margin-top:8px"><table class="tbl">
<tr><td class="mn" style="font-size:.7rem">best_model.pt</td><td>Best checkpoint (sens+spec+κ composite)</td></tr>
<tr><td class="mn" style="font-size:.7rem">calibration.json</td><td>Temperature + referable threshold</td></tr>
<tr><td class="mn" style="font-size:.7rem">loop_history.json</td><td>Per-iteration clinical metrics</td></tr>
<tr><td class="mn" style="font-size:.7rem">review_queue.csv</td><td>Most-uncertain cases for expert review</td></tr>
<tr><td class="mn" style="font-size:.7rem">lesion_cache.npz</td><td>Cached Module-2 lesion features</td></tr>
</table></div>
</div>
</div>
{ftr("DrishtiAI v3.0 — Closed-Loop Self-Optimizing Training Pipeline", 4)}
</div>'''

# ─── PAGE 5: MATLAB/SIMULINK ───
P5 = f'''<div class="pg">
{hdr('MATLAB &amp; Simulink Integration <span class="nb">NEW</span>')}
<h2>MATLAB/Simulink Pipeline Orchestration &amp; Verification</h2>
<p style="margin-bottom:12px">A formally verifiable state-machine architecture in MATLAB Stateflow that orchestrates the entire DR screening pipeline, enabling model-based design, hardware-in-the-loop testing, and regulatory compliance.</p>
<div class="g2" style="flex:1;position:relative;z-index:1">
<div>
<h3>🔧 Stateflow State Machine</h3>
<div class="cd" style="margin-top:8px;margin-bottom:10px;font-family:'JetBrains Mono',monospace;font-size:.68rem;line-height:1.9;color:var(--dm)">
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--gn)"></span><span style="color:var(--gn);font-weight:600">IDLE</span><span>→ Waiting for fundus image</span></div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--am)"></span><span style="color:var(--am);font-weight:600">IQA_CHECK</span><span>→ Image quality assessment</span></div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--ac)"></span><span style="color:var(--ac);font-weight:600">PREPROCESSING</span><span>→ Circular crop + enhance</span></div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--cy)"></span><span style="color:var(--cy);font-weight:600">GRADING</span><span>→ ONNX model inference (0-4)</span></div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--ac2)"></span><span style="color:var(--ac2);font-weight:600">EXPLAINABILITY</span><span>→ Vessel map + heatmap</span></div>
<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--rs)"></span><span style="color:var(--rs);font-weight:600">REPORTING</span><span>→ PDF report generation</span></div>
<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--gn)"></span><span style="color:var(--gn);font-weight:600">COMPLETE</span><span>→ Results ready</span></div>
</div>
<h3 style="margin-top:12px">📦 MATLAB Module Inventory</h3>
<table class="tbl" style="margin-top:8px">
<thead><tr><th>Module</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td class="mn" style="font-size:.7rem">drPipelineStatechart.m</td><td>Stateflow state-machine definition</td></tr>
<tr><td class="mn" style="font-size:.7rem">runDRScreening.m</td><td>Main screening entry point</td></tr>
<tr><td class="mn" style="font-size:.7rem">assessQuality.m</td><td>IQA gate (blur, exposure, contrast)</td></tr>
<tr><td class="mn" style="font-size:.7rem">enhanceImage.m</td><td>CLAHE + vessel enhancement</td></tr>
<tr><td class="mn" style="font-size:.7rem">importModels.m</td><td>ONNX model import &amp; inference</td></tr>
<tr><td class="mn" style="font-size:.7rem">actionMapping.m</td><td>State → action dispatch table</td></tr>
<tr><td class="mn" style="font-size:.7rem">generateReport.m</td><td>PDF report generator</td></tr>
<tr><td class="mn" style="font-size:.7rem">buildScript.m</td><td>Build &amp; deployment automation</td></tr>
</tbody></table>
</div>
<div>
<h3>🔬 ONNX Model Export Pipeline</h3>
<div class="cd cg" style="margin-top:8px;margin-bottom:10px"><h4>Grading Model Export</h4><p>EfficientNet-B3 → ONNX → MATLAB importONNXNetwork. Includes ordinal + referable heads with softmax post-processing.</p>
<div class="fr" style="margin-top:8px"><span class="fs" style="font-size:.65rem">PyTorch .pt</span><span class="fa">→</span><span class="fs" style="font-size:.65rem">torch.onnx.export</span><span class="fa">→</span><span class="fs" style="font-size:.65rem">ONNX opset 17</span><span class="fa">→</span><span class="fs" style="font-size:.65rem">MATLAB import</span></div>
</div>
<div class="cd ca" style="margin-bottom:10px"><h4>Segmentation Model Export</h4><p>Lightweight U-Net vessel segmenter → ONNX with 512×512 input. Exports encoder + decoder for MATLAB Deep Learning Toolbox.</p></div>
<h3 style="margin-top:12px">✅ Test &amp; Verification Suite</h3>
<div class="cd" style="margin-top:8px;margin-bottom:8px"><table class="tbl">
<thead><tr><th>Test</th><th>Coverage</th></tr></thead>
<tbody>
<tr><td class="mn" style="font-size:.7rem">testStatechart.m</td><td>State transitions, edge cases, error recovery</td></tr>
<tr><td class="mn" style="font-size:.7rem">testQualityGate.m</td><td>IQA thresholds, blur/exposure rejection</td></tr>
<tr><td class="mn" style="font-size:.7rem">testEnhancement.m</td><td>CLAHE, vessel enhancement, crop quality</td></tr>
</tbody></table></div>
<h3 style="margin-top:12px">🎯 Why MATLAB/Simulink?</h3>
<div class="g2" style="margin-top:8px;gap:6px">
<div class="cs" style="text-align:center"><div style="font-size:1.2rem">🏥</div><p style="font-weight:600;font-size:.7rem;color:#fff">Regulatory Compliance</p><p style="font-size:.7rem">IEC 62304 medical device traceability</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.2rem">🔍</div><p style="font-weight:600;font-size:.7rem;color:#fff">Formal Verification</p><p style="font-size:.7rem">Stateflow coverage proves all states reachable</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.2rem">⚡</div><p style="font-weight:600;font-size:.7rem;color:#fff">Code Generation</p><p style="font-size:.7rem">Simulink Coder → embedded C for cameras</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.2rem">🧪</div><p style="font-weight:600;font-size:.7rem;color:#fff">HIL Testing</p><p style="font-size:.7rem">Hardware-in-the-loop with real camera feed</p></div>
</div>
</div>
</div>
{ftr("DrishtiAI v3.0 — MATLAB/Simulink Model-Based Design", 5)}
</div>'''

# ─── PAGE 6: IMPACT ───
P6 = f'''<div class="pg">
{hdr("Impact &amp; Benefits")}
<h2>Impact Analysis</h2>
<div class="g2" style="flex:1;position:relative;z-index:1">
<div>
<h3>🏥 Patient &amp; Clinic Impact</h3>
<div class="cd cg" style="margin-top:8px;margin-bottom:8px"><h4>⚡ Early Detection</h4><p>Identifies microaneurysms at Stage 1, preventing 90% of preventable blindness. 98.7% sensitivity catches nearly all referable cases.</p></div>
<div class="cd ca" style="margin-bottom:8px"><h4>🔍 Transparent Diagnostics</h4><p>3-tier explainability (Fundus + Vessels + Heatmap) builds clinician trust with per-region attention scores.</p></div>
<div class="cd cc" style="margin-bottom:8px"><h4>🌍 Patient Empowerment</h4><p>Multilingual audio counseling and large-print PDFs ensure elderly patients understand their condition in their native language.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>🏕️ Rural Accessibility</h4><p>Mobile camp batch mode enables single-day screening of 100+ patients with no internet connectivity.</p></div>
<div class="cd cr" style="margin-bottom:8px"><h4>📉 Reduced Referral Load</h4><p>Stage 0 clearance reduces unnecessary ophthalmologist referrals by 40-60%.</p></div>
<h3 style="margin-top:12px">📊 Impact Distribution</h3>
<div class="cd" style="margin-top:8px">
<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:.72rem"><span>Early Detection</span><span style="font-weight:600">35%</span></div><div class="mb"><div class="mf" style="width:35%;background:var(--gn)"></div></div></div>
<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:.72rem"><span>Patient Empowerment</span><span style="font-weight:600">25%</span></div><div class="mb"><div class="mf" style="width:25%;background:var(--ac)"></div></div></div>
<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:.72rem"><span>Rural Reach</span><span style="font-weight:600">20%</span></div><div class="mb"><div class="mf" style="width:20%;background:var(--am)"></div></div></div>
<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:.72rem"><span>Cost Savings</span><span style="font-weight:600">12%</span></div><div class="mb"><div class="mf" style="width:12%;background:var(--cy)"></div></div></div>
<div><div style="display:flex;justify-content:space-between;font-size:.72rem"><span>Clinician Trust</span><span style="font-weight:600">8%</span></div><div class="mb"><div class="mf" style="width:8%;background:var(--ac2)"></div></div></div>
</div>
</div>
<div>
<h3>💰 Economic &amp; Strategic Gains</h3>
<div class="g2" style="margin-top:8px;gap:8px">
<div class="cs" style="text-align:center"><div style="font-size:1.5rem">💊</div><h4>Cost Savings</h4><p>Preventing late-stage DR saves ₹50K–2L per patient.</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.5rem">💻</div><h4>Resource Optimization</h4><p>Runs on standard clinic laptops, no cloud GPU.</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.5rem">📈</div><h4>Scalable Deployment</h4><p>Single-clinic to district-level with DB federation.</p></div>
<div class="cs" style="text-align:center"><div style="font-size:1.5rem">🌐</div><h4>Global Leadership</h4><p>India as pioneer in accessible AI ophthalmic screening.</p></div>
</div>
<h3 style="margin-top:16px">🎖️ Operational Benefits</h3>
<div class="g2" style="margin-top:8px;gap:8px">
<div class="cs cg"><h4>Risk Reduction</h4><p>AI monitoring lowers diagnostic errors and missed pathology.</p></div>
<div class="cs ca"><h4>Autonomous Safety</h4><p>Fully offline, reliable in rural camps without internet.</p></div>
<div class="cs cam"><h4>Efficient Triage</h4><p>Automated severity grading optimizes specialist time.</p></div>
<div class="cs cr"><h4>Crisis Handling</h4><p>Flags critical PDR cases instantly for emergency referral.</p></div>
</div>
<div class="cd" style="margin-top:12px;background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(129,140,248,.08));border-color:var(--ac)"><h4 style="color:var(--ac)">🔄 Self-Improving System <span class="nb">NEW</span></h4><p>Closed-loop training continuously improves accuracy through hard-example mining and clinical feedback, ensuring the model never stagnates.</p></div>
</div>
</div>
{ftr("DrishtiAI v3.0 — Smart India Hackathon 2025", 6)}
</div>'''

# ─── PAGE 7: FEASIBILITY ───
P7 = f'''<div class="pg">
{hdr("Feasibility &amp; Viability")}
<h2>Feasibility Study</h2>
<div class="g2" style="flex:1;position:relative;z-index:1">
<div>
<h3>✅ Analysis of Feasibility</h3>
<div class="cd cg" style="margin-top:8px;margin-bottom:8px"><h4>01 — Proven Research Base</h4><p>DR detection validated across EyePACS, APTOS 2019, Messidor-2, HEI-MED with >90% sensitivity baselines.</p></div>
<div class="cd ca" style="margin-bottom:8px"><h4>02 — Hardware Compatibility</h4><p>Runs on clinic laptops (8GB RAM). ONNX export enables CPU-only inference at &lt;2s per image.</p></div>
<div class="cd cc" style="margin-bottom:8px"><h4>03 — Scalability</h4><p>Expandable from single-clinic to district/state-level with federated SQLite and batch CSV exports.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>04 — Training Data</h4><p>APTOS 2019 (3,662 images), EyePACS (88,702), HEI-MED (169) publicly available. Auto-download pipeline included.</p></div>
<div class="cd cr" style="margin-bottom:8px"><h4>05 — Operational Reliability</h4><p>Fully offline Flask backend, zero cloud connectivity needed. MATLAB Stateflow ensures deterministic state transitions.</p></div>
<div class="cd" style="margin-bottom:8px;border-left:3px solid var(--ac2)"><h4>06 — Regulatory Pathway <span class="nb">NEW</span></h4><p>MATLAB/Simulink model-based design provides IEC 62304 traceability. Stateflow coverage analysis proves all states reachable.</p></div>
</div>
<div>
<h3>🛡️ What-If Mitigation Strategies</h3>
<div class="cd" style="margin-top:8px;margin-bottom:8px"><table class="tbl">
<thead><tr><th>Challenge</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td style="font-weight:600;color:#fff">AI misdiagnoses?</td><td>Dual-model cross-validation + Grad-CAM visual verification.</td></tr>
<tr><td style="font-weight:600;color:#fff">Can't read reports?</td><td>18pt+ large print with Web Speech audio in EN/HI/GU.</td></tr>
<tr><td style="font-weight:600;color:#fff">No internet?</td><td>Fully offline Flask+SQLite. Batch sync on reconnect.</td></tr>
<tr><td style="font-weight:600;color:#fff">Model bias?</td><td>Fine-tuned on APTOS (Indian) with ethnicity-agnostic vessel features.</td></tr>
<tr><td style="font-weight:600;color:#fff">Clinician distrust?</td><td>3-tier transparency + ophthalmologist-in-the-loop review.</td></tr>
<tr><td style="font-weight:600;color:#fff">Model drift?</td><td>Closed-loop retraining with hard-example mining + recalibration.</td></tr>
</tbody></table></div>
<h3 style="margin-top:12px">⚠️ Key Challenges &amp; Strategies</h3>
<div class="cd cr" style="margin-top:8px;margin-bottom:8px"><h4>Limited Rare Stage Data</h4><p><strong>Challenge:</strong> Stage 3–4 underrepresented.<br><strong>Strategy:</strong> Augmentation, WeightedRandomSampler, Focal Loss, hard-example mining.</p></div>
<div class="cd cam" style="margin-bottom:8px"><h4>WCAG Compliance</h4><p><strong>Challenge:</strong> Medical visualizations must be accessible.<br><strong>Strategy:</strong> Okabe-Ito palette + shapes + 18pt fonts + Web Speech.</p></div>
<div class="cd ca"><h4>Model Drift Over Time</h4><p><strong>Challenge:</strong> Camera models and populations evolve.<br><strong>Strategy:</strong> Closed-loop retraining with IQA gating and temperature recalibration.</p></div>
</div>
</div>
{ftr("DrishtiAI v3.0 — Smart India Hackathon 2025", 7)}
</div>'''

# ─── PAGE 8: COMPARISON & REFS ───
P8 = f'''<div class="pg">
{hdr("Comparison &amp; References")}
<h2>Feature Comparison &amp; Research References</h2>
<div style="flex:1;position:relative;z-index:1">
<h3>⚖️ DrishtiAI vs. Existing Solutions</h3>
<div class="cd" style="margin-top:8px;margin-bottom:14px"><table class="tbl" style="font-size:.72rem">
<thead><tr><th style="width:14%">Feature</th><th style="width:43%">DrishtiAI (Ours)</th><th style="width:43%">Existing Solutions</th></tr></thead>
<tbody>
<tr><td style="font-weight:600;color:#fff">Methodology</td><td>Multimodal: Dual-model CNN + Frangi vessel + Grad-CAM + Gemma-4 LLM + closed-loop self-training</td><td>Single-model CNN, no explainability or narrative.</td></tr>
<tr><td style="font-weight:600;color:#fff">Explainability</td><td>3-tier: Raw fundus + vessel segmentation + attention heatmap with confidence scores</td><td>Black-box: stage number only, no visual evidence.</td></tr>
<tr><td style="font-weight:600;color:#fff">Accessibility</td><td>WCAG 2.2 AAA: Okabe-Ito, shapes, 18pt+, Web Speech in 3 languages</td><td>Standard colors, small fonts, English-only.</td></tr>
<tr><td style="font-weight:600;color:#fff">Deployment</td><td>Edge-ready: Flask + SQLite offline, ONNX cross-platform inference</td><td>Cloud-dependent, GPU servers, subscriptions.</td></tr>
<tr><td style="font-weight:600;color:#fff">Training</td><td><span class="nb">NEW</span> Closed-loop curriculum learning, hard-example mining, human-in-the-loop</td><td>One-time training, fixed hyperparameters.</td></tr>
<tr><td style="font-weight:600;color:#fff">Verification</td><td><span class="nb">NEW</span> MATLAB Stateflow formal verification, IEC 62304 traceability</td><td>No formal verification or regulatory pathway.</td></tr>
<tr><td style="font-weight:600;color:#fff">Patient Output</td><td>Large-print PDF + audio + multilingual + 6/12-month risk forecast</td><td>Digital-only English report.</td></tr>
<tr><td style="font-weight:600;color:#fff">Batch Screening</td><td>Mobile camp queue with CSV export, dozens in batch mode</td><td>Single-image only, no batch capability.</td></tr>
</tbody></table></div>
<div class="g2">
<div>
<h3>📚 Research References</h3>
<div class="cd" style="margin-top:8px"><ul style="list-style:none;padding:0">
<li style="margin-bottom:8px;padding-left:0"><span class="tg tb" style="margin-bottom:2px">Dataset</span><br><span style="font-weight:600;color:#fff;font-size:.78rem">APTOS 2019 Blindness Detection Challenge</span><br><span style="font-size:.7rem">Kaggle — 3,662 fundus images across 5 DR stages</span></li>
<li style="margin-bottom:8px;padding-left:0"><span class="tg tgn" style="margin-bottom:2px">Dataset</span><br><span style="font-weight:600;color:#fff;font-size:.78rem">EyePACS Diabetic Retinopathy Dataset</span><br><span style="font-size:.7rem">88,702 high-resolution retinal images</span></li>
<li style="margin-bottom:8px;padding-left:0"><span class="tg ta" style="margin-bottom:2px">Validation</span><br><span style="font-weight:600;color:#fff;font-size:.78rem">HEI-MED (Hamilton Eye Institute)</span><br><span style="font-size:.7rem">169 fundus images for external validation</span></li>
<li style="margin-bottom:8px;padding-left:0"><span class="tg tc" style="margin-bottom:2px">Algorithm</span><br><span style="font-weight:600;color:#fff;font-size:.78rem">Frangi Vesselness Filter</span><br><span style="font-size:.7rem">Multi-scale vessel enhancement</span></li>
<li style="padding-left:0"><span class="tg tr" style="margin-bottom:2px">Model</span><br><span style="font-weight:600;color:#fff;font-size:.78rem">EfficientNet (Tan &amp; Le, 2019)</span><br><span style="font-size:.7rem">Compound scaling for efficient deep learning</span></li>
</ul></div>
</div>
<div>
<h3>🧰 Complete ML Tooling Suite</h3>
<div class="cd" style="margin-top:8px"><table class="tbl" style="font-size:.7rem">
<thead><tr><th>Script</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td class="mn">download_dataset.py</td><td>Kaggle/HuggingFace auto-download</td></tr>
<tr><td class="mn">train_model.py</td><td>Standalone 3-phase EfficientNet trainer</td></tr>
<tr><td class="mn">train_in_loop.py</td><td><span class="nb">NEW</span> Closed-loop self-optimizing pipeline</td></tr>
<tr><td class="mn">training/grading/</td><td><span class="nb">NEW</span> Grading model + calibration + ONNX</td></tr>
<tr><td class="mn">training/segmentation/</td><td><span class="nb">NEW</span> U-Net vessel segmenter + export</td></tr>
<tr><td class="mn">training/losses.py</td><td><span class="nb">NEW</span> Ordinal + focal + referable losses</td></tr>
<tr><td class="mn">validate_heimed.py</td><td>Independent HEI-MED benchmark</td></tr>
<tr><td class="mn">compare_models.py</td><td>Dual-model ROC/AUC comparison</td></tr>
<tr><td class="mn">eval_stages.py</td><td>Per-stage precision/recall analysis</td></tr>
<tr><td class="mn">test_pipeline.py</td><td>End-to-end integration test</td></tr>
</tbody></table></div>
<div class="cd" style="margin-top:12px;background:linear-gradient(135deg,rgba(96,165,250,.1),rgba(129,140,248,.06));border-color:var(--ac)"><h4 style="color:var(--ac)">🚀 What's Next</h4><ul>
<li>Complete 6 loop iterations → target 95%+ accuracy</li>
<li>ONNX export → MATLAB standalone executable</li>
<li>Android companion app for field fundus cameras</li>
<li>Multi-site clinical validation with hospitals</li>
</ul></div>
</div>
</div>
</div>
{ftr("DrishtiAI v3.0 — github.com/Devbhavsar007/DrishtiAI", 8)}
</div>'''

# ─── Assemble ───
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DrishtiAI — SIH 2025 Presentation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
{P1}{P2}{P3}{P4}{P5}{P6}{P7}{P8}
</body>
</html>'''

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"[OK] Presentation written to {OUT}")
print(f"[OK] {len(html):,} bytes, 8 pages")
print()
print("To generate PDF:")
print("  1. Open DrishtiAI_SIH_Presentation.html in Chrome/Edge")
print("  2. Press Ctrl+P → Save as PDF")
print("  3. Settings: A4 Landscape, Background graphics ON, Margins: None")
