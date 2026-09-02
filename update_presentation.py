"""
Update the existing DrishtiAI SIH Presentation PDF in-place.

Uses reportlab to create transparent overlays with updated metrics,
new features, and additional info, then merges them onto the original
pages with PyPDF2.
"""
import os
from io import BytesIO
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color, white, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

W, H = landscape(A4)  # 842 x 595

# Colors matching the SIH dark theme
BLUE   = HexColor("#60a5fa")
GREEN  = HexColor("#34d399")
AMBER  = HexColor("#fbbf24")
ROSE   = HexColor("#fb7185")
CYAN   = HexColor("#22d3ee")
PURPLE = HexColor("#818cf8")
DIM    = HexColor("#94a3b8")
TXT    = HexColor("#e2e8f0")
BG     = HexColor("#111827")
BG2    = HexColor("#0f1629")
BADGE_BG = HexColor("#059669")

SRC = os.path.join(os.path.dirname(__file__), "DrishtiAI_SIH_Presentation.pdf")
DST = os.path.join(os.path.dirname(__file__), "DrishtiAI_SIH_Presentation_Updated.pdf")


def new_badge(c, x, y):
    """Draw a small green [NEW] badge."""
    c.setFillColor(BADGE_BG)
    c.roundRect(x, y - 2, 28, 10, 3, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 5.5)
    c.drawString(x + 4, y, "NEW")


def draw_info_box(c, x, y, w, h, title, body, accent=BLUE):
    """Draw a small info card with accent left border."""
    # Background
    c.setFillColor(Color(0.067, 0.094, 0.153, alpha=0.95))  # #111827
    c.roundRect(x, y, w, h, 4, fill=1, stroke=0)
    # Accent bar
    c.setFillColor(accent)
    c.rect(x, y, 2.5, h, fill=1, stroke=0)
    # Title
    c.setFillColor(TXT)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(x + 8, y + h - 11, title)
    # Body text (wrap manually)
    c.setFillColor(DIM)
    c.setFont("Helvetica", 6)
    words = body.split()
    line = ""
    ty = y + h - 22
    max_w = w - 14
    for word in words:
        test = line + (" " if line else "") + word
        if c.stringWidth(test, "Helvetica", 6) > max_w:
            c.drawString(x + 8, ty, line)
            ty -= 8
            line = word
        else:
            line = test
    if line:
        c.drawString(x + 8, ty, line)


def make_overlay_page1():
    """Page 1: Update metrics and add pipeline tags."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Cover the old "98.4% AUROC Diagnostic Accuracy" stat area and replace
    # The stats are roughly in the right half, mid-page area
    # Add updated metrics overlay near bottom of stats area
    # Position: below the main stats, above the footer
    y_base = 62

    # Add a subtle info strip at the bottom with live training metrics
    c.setFillColor(Color(0.04, 0.055, 0.1, alpha=0.92))
    c.roundRect(30, y_base - 5, W - 60, 38, 5, fill=1, stroke=0)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(40, y_base + 18, "LIVE TRAINING RESULTS (APTOS 2019)")

    metrics = [
        ("Sensitivity: 98.7%", GREEN, 40),
        ("Specificity: 86.3%", AMBER, 155),
        ("Cohen's k: 0.884", CYAN, 270),
        ("Accuracy: 81.4% (iterating)", BLUE, 375),
        ("Closed-Loop Iterations: 2/6", PURPLE, 540),
        ("MATLAB Stateflow: Active", ROSE, 700),
    ]
    c.setFont("Helvetica-Bold", 6.5)
    for label, color, mx in metrics:
        c.setFillColor(color)
        c.drawString(mx, y_base + 4, label)

    c.save()
    buf.seek(0)
    return buf


def make_overlay_page2():
    """Page 2: Add Closed-Loop Training and MATLAB cards to Solution column."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Solution column is roughly x=430 to x=810
    # Add two new feature cards below the existing ones
    # Existing cards end around y=130-ish, let's put new cards at y=95 and y=45

    draw_info_box(c, 432, 100, 375, 42,
                  "Closed-Loop Self-Optimizing Training",
                  "Autonomous loop with hard-example mining, curriculum learning (head/partial/full), "
                  "temperature calibration T=2.19, and ophthalmologist-in-the-loop review queues. "
                  "98.7% sensitivity achieved after 2 iterations on APTOS 2019.",
                  accent=AMBER)
    new_badge(c, 668, 131)

    draw_info_box(c, 432, 50, 375, 42,
                  "MATLAB/Simulink Pipeline Orchestration",
                  "Stateflow state-machine (7 states: IDLE->IQA->Preprocess->Grade->Explain->Report->Complete). "
                  "ONNX model export for cross-platform inference. IEC 62304 regulatory traceability. "
                  "11 MATLAB modules with formal verification test suite.",
                  accent=PURPLE)
    new_badge(c, 692, 81)

    c.save()
    buf.seek(0)
    return buf


def make_overlay_page3():
    """Page 3: Add ONNX Runtime and MATLAB to tech stack, update pipeline."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Tech stack is on the right side. Add new entries.
    # Add MATLAB/Simulink section and ONNX to AI & ML
    # Right column is roughly x=590-810

    # Add ONNX badge near the AI & ML section
    # The AI & ML box is roughly at y=330-380 area
    new_badge(c, 763, 354)
    c.setFillColor(TXT)
    c.setFont("Helvetica", 6.5)
    c.drawString(700, 354, "ONNX Runtime")

    # Add a MATLAB tech stack card at bottom of right column
    draw_info_box(c, 595, 50, 215, 55,
                  "MATLAB/Simulink",
                  "Stateflow State Machine | Image Processing Toolbox | "
                  "ONNX Model Importer | Report Generator | "
                  "3 test scripts (statechart, IQA, enhancement)",
                  accent=PURPLE)
    new_badge(c, 720, 94)

    # Add IQA mention to pipeline step 1
    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 5.5)
    c.drawString(50, 385, "+ IQA Quality Gate")
    new_badge(c, 128, 385)

    # Add MATLAB to the implementation flow
    c.setFillColor(PURPLE)
    c.setFont("Helvetica-Bold", 6)
    c.drawString(50, 162, "MATLAB  Simulink Stateflow Orchestrator -> ONNX Model Import -> Report Generation")
    new_badge(c, 410, 162)

    c.save()
    buf.seek(0)
    return buf


def make_overlay_page4():
    """Page 4: Impact — add self-improving system note."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Add a "Self-Improving System" card at bottom of right column
    draw_info_box(c, 432, 50, 375, 38,
                  "Self-Improving System via Closed-Loop Training",
                  "Unlike static models, DrishtiAI continuously improves through hard-example mining "
                  "and clinical feedback integration. Each iteration boosts difficult-case sampling "
                  "weights by 0.8x and exports review queues for ophthalmologist verification.",
                  accent=GREEN)
    new_badge(c, 722, 77)

    c.save()
    buf.seek(0)
    return buf


def make_overlay_page5():
    """Page 5: Feasibility — add regulatory pathway."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Add regulatory pathway feasibility point
    draw_info_box(c, 30, 50, 380, 38,
                  "06 - Regulatory Pathway (IEC 62304)",
                  "MATLAB/Simulink model-based design provides medical device traceability. "
                  "Stateflow coverage analysis proves all 7 pipeline states are reachable. "
                  "Enables formal verification for medical device certification pathway.",
                  accent=PURPLE)
    new_badge(c, 280, 77)

    # Add model drift answer to What-If section
    draw_info_box(c, 432, 50, 375, 38,
                  "Model Drift Over Time - Mitigation",
                  "Closed-loop retraining with hard-example mining and temperature recalibration "
                  "(current T=2.193, threshold=0.32). IQA gating rejects low-quality inputs. "
                  "Ophthalmologist review queue integrates expert feedback each iteration.",
                  accent=AMBER)
    new_badge(c, 678, 77)

    c.save()
    buf.seek(0)
    return buf


def make_overlay_page6():
    """Page 6: Comparison & Refs — add training and MATLAB rows, new scripts."""
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # Add new comparison rows below the table
    # Table ends around y=280. Add new rows.
    y = 268

    # Training row
    c.setFillColor(Color(0.067, 0.094, 0.153, alpha=0.92))
    c.rect(35, y, W - 70, 18, fill=1, stroke=0)
    c.setFillColor(TXT)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(40, y + 5, "Training")
    new_badge(c, 80, y + 5)
    c.setFillColor(GREEN)
    c.setFont("Helvetica", 6)
    c.drawString(118, y + 5, "Closed-loop curriculum learning, hard-example mining, temperature calibration, human-in-the-loop")
    c.setFillColor(DIM)
    c.drawString(560, y + 5, "One-time training with fixed hyperparameters, no iterative improvement.")

    y -= 20
    # Verification row
    c.setFillColor(Color(0.067, 0.094, 0.153, alpha=0.92))
    c.rect(35, y, W - 70, 18, fill=1, stroke=0)
    c.setFillColor(TXT)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(40, y + 5, "Verification")
    new_badge(c, 100, y + 5)
    c.setFillColor(GREEN)
    c.setFont("Helvetica", 6)
    c.drawString(138, y + 5, "MATLAB Stateflow formal verification, coverage analysis, IEC 62304 traceability")
    c.setFillColor(DIM)
    c.drawString(560, y + 5, "No formal verification or regulatory pathway for certification.")

    # Add new ML scripts to the references section
    y = 80
    c.setFillColor(Color(0.067, 0.094, 0.153, alpha=0.92))
    c.roundRect(35, y - 5, 400, 55, 4, fill=1, stroke=0)

    c.setFillColor(BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(42, y + 38, "New ML Tooling")
    new_badge(c, 122, y + 38)

    scripts = [
        ("train_in_loop.py", "Closed-loop self-optimizing training pipeline", GREEN),
        ("training/grading/", "Grading model + calibration + ONNX export", AMBER),
        ("training/segmentation/", "U-Net vessel segmenter + ONNX export", CYAN),
        ("training/losses.py", "Ordinal + focal + referable loss functions", PURPLE),
    ]
    c.setFont("Helvetica", 6)
    for i, (script, desc, color) in enumerate(scripts):
        sy = y + 25 - i * 10
        c.setFillColor(color)
        c.drawString(45, sy, script)
        c.setFillColor(DIM)
        c.drawString(175, sy, desc)

    c.save()
    buf.seek(0)
    return buf


def main():
    reader = PdfReader(SRC)
    writer = PdfWriter()

    overlays = [
        make_overlay_page1,
        make_overlay_page2,
        make_overlay_page3,
        make_overlay_page4,
        make_overlay_page5,
        make_overlay_page6,
    ]

    for i, page in enumerate(reader.pages):
        if i < len(overlays):
            overlay_buf = overlays[i]()
            overlay_reader = PdfReader(overlay_buf)
            overlay_page = overlay_reader.pages[0]
            page.merge_page(overlay_page)
        writer.add_page(page)

    with open(DST, "wb") as f:
        writer.write(f)

    size_kb = os.path.getsize(DST) / 1024
    print(f"[OK] Updated PDF saved to: {DST}")
    print(f"[OK] Size: {size_kb:.0f} KB, {len(reader.pages)} pages (unchanged)")
    print()
    print("Updates applied:")
    print("  Page 1: Live training metrics bar (sens 98.7%, spec 86.3%, kappa 0.884)")
    print("  Page 2: +Closed-Loop Training card, +MATLAB/Simulink card")
    print("  Page 3: +ONNX Runtime, +MATLAB tech stack, +IQA Gate, +MATLAB pipeline step")
    print("  Page 4: +Self-Improving System card")
    print("  Page 5: +Regulatory Pathway (IEC 62304), +Model Drift mitigation")
    print("  Page 6: +Training & Verification comparison rows, +New ML scripts")


if __name__ == "__main__":
    main()
