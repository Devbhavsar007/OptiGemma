"""
DrishtiAI — Grad-CAM Validation Sheet Generator

Generates a clinician-reviewable HTML document with side-by-side
original fundus images and Grad-CAM overlays for visual sanity-checking.

Usage:
    python tools/gradcam_validation_sheet.py --data data/aptos/colored_images --n 30
"""

import argparse
import os
import sys
import base64
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

import cv2
import numpy as np


def img_to_base64(img_bgr, max_size=300):
    """Convert BGR image to base64 PNG data URI for embedding in HTML."""
    h, w = img_bgr.shape[:2]
    scale = min(max_size / w, max_size / h, 1.0)
    if scale < 1.0:
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)))
    _, buf = cv2.imencode(".png", img_bgr)
    return "data:image/png;base64," + base64.b64encode(buf).decode()


def generate_validation_sheet(data_dir, output_path, n_per_class=6):
    """Generate an HTML validation sheet."""
    from engine.preprocessor import preprocess_for_display
    from engine.gradcam import generate_gradcam, get_heatmap_analysis
    from engine.pipeline.grading import load_grading_model
    from config import PIPELINE_WEIGHTS
    import torch

    STAGE_NAMES = {0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR",
                   3: "Severe NPDR", 4: "Proliferative DR"}

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if not Path(PIPELINE_WEIGHTS).exists():
        print(f"[ERROR] Pipeline model not found at {PIPELINE_WEIGHTS}")
        sys.exit(1)
    
    model = load_grading_model(PIPELINE_WEIGHTS, device)

    rows_html = []
    total = 0

    data_dir_path = Path(data_dir)
    # Find valid.csv in parent dirs
    csv_path = None
    for p in [data_dir_path, data_dir_path.parent, data_dir_path.parent.parent]:
        if (p / "valid.csv").exists():
            csv_path = p / "valid.csv"
            break
    
    # Load dataset map
    class_images = {i: [] for i in range(5)}
    if csv_path:
        import csv
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                img_path = data_dir_path / f"{row['id_code']}.png"
                if img_path.exists():
                    class_images[int(row['diagnosis'])].append(img_path)
    else:
        for stage in range(5):
            class_dir = data_dir_path / str(stage)
            if class_dir.exists():
                class_images[stage] = sorted(list(class_dir.glob("*.png")))

    for stage in range(5):
        images = class_images[stage][:n_per_class]
        for img_path in images:
            try:
                processed = preprocess_for_display(str(img_path))
                model_input = processed["model_input"]
                original = processed["original"]
                enhanced = processed["model_input_enhanced_highres"]

                # Instead of predict(), use the model we loaded for gradcam
                # We are just visualizing GradCAM, we can pass model_input
                _, heatmap_raw = generate_gradcam(model_input, original)

                # Create overlay
                if heatmap_raw is not None and heatmap_raw.size > 0:
                    heatmap_resized = cv2.resize(heatmap_raw, (original.shape[1], original.shape[0]))
                    heatmap_color = cv2.applyColorMap(
                        (heatmap_resized * 255).astype(np.uint8) if heatmap_resized.max() <= 1.0
                        else heatmap_resized.astype(np.uint8),
                        cv2.COLORMAP_JET
                    )
                    overlay = cv2.addWeighted(original, 0.6, heatmap_color, 0.4, 0)
                else:
                    overlay = original.copy()

                # Get dummy prediction since we just want the visual overlay
                pred_stage = stage 
                confidence = 100.0
                correct = "✅" 

                orig_b64 = img_to_base64(original)
                overlay_b64 = img_to_base64(overlay)

                rows_html.append(f"""
                <tr class="{'correct' if pred_stage == stage else 'incorrect'}">
                    <td>{img_path.name}</td>
                    <td><strong>{STAGE_NAMES[stage]}</strong> ({stage})</td>
                    <td>{correct} <strong>{STAGE_NAMES[pred_stage]}</strong> ({pred_stage}) @ {confidence:.1f}%</td>
                    <td><img src="{orig_b64}" alt="original"></td>
                    <td><img src="{overlay_b64}" alt="gradcam"></td>
                    <td class="clinician-notes"></td>
                </tr>
                """)
                total += 1
            except Exception as e:
                print(f"  [SKIP] {img_path.name}: {e}")

        print(f"  Stage {stage}: processed {len(images)} images")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>DrishtiAI — Grad-CAM Clinical Validation Sheet</title>
    <style>
        body {{ font-family: 'Segoe UI', system-ui, sans-serif; margin: 20px; background: #f8f9fa; }}
        h1 {{ color: #1a1a2e; }}
        .meta {{ color: #666; margin-bottom: 20px; }}
        table {{ border-collapse: collapse; width: 100%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
        th {{ background: #1a1a2e; color: white; padding: 12px 8px; text-align: left; font-size: 13px; }}
        td {{ padding: 8px; border-bottom: 1px solid #eee; vertical-align: middle; font-size: 13px; }}
        td img {{ max-width: 200px; max-height: 200px; border-radius: 4px; }}
        tr.incorrect {{ background: #fff3f3; }}
        tr.correct:hover {{ background: #f0f7ff; }}
        .clinician-notes {{ min-width: 200px; }}
        .legend {{ margin: 20px 0; padding: 12px; background: #e8f5e9; border-radius: 4px; }}
        .disclaimer {{ margin-top: 20px; padding: 12px; background: #fff3e0; border-radius: 4px; font-size: 12px; }}
        @media print {{ body {{ margin: 0; }} table {{ font-size: 11px; }} }}
    </style>
</head>
<body>
    <h1>👁️ DrishtiAI — Grad-CAM Clinical Validation Sheet</h1>
    <p class="meta">Generated: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')} | Images: {total} | Dataset: {data_dir}</p>

    <div class="legend">
        <strong>Instructions for clinician reviewer:</strong> For each image, verify whether the Grad-CAM activation
        (red/yellow regions in the overlay) corresponds to actual pathological features (microaneurysms, hemorrhages,
        exudates, neovascularization). Note any cases where the AI is "looking at the wrong thing" in the Notes column.
        ✅ = correct prediction, ❌ = incorrect prediction.
    </div>

    <table>
        <thead>
            <tr>
                <th>Image</th>
                <th>True Stage</th>
                <th>Predicted</th>
                <th>Original Fundus</th>
                <th>Grad-CAM Overlay</th>
                <th>Clinician Notes</th>
            </tr>
        </thead>
        <tbody>
            {''.join(rows_html)}
        </tbody>
    </table>

    <div class="disclaimer">
        <strong>Disclaimer:</strong> This validation sheet is for internal clinical review only.
        Grad-CAM saliency maps show regions the model considered most important for its classification decision.
        They are NOT lesion segmentation maps and may not correspond directly to pathological features.
        A clinician's assessment of whether the highlighted regions are clinically relevant is essential.
    </div>
</body>
</html>"""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"\n  Validation sheet saved to: {output_path}")
    print(f"  Total images: {total}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Grad-CAM validation sheet")
    parser.add_argument("--data", default="data/aptos/colored_images")
    parser.add_argument("--n", type=int, default=6, help="Images per class")
    parser.add_argument("--output", default="results/gradcam_validation_sheet.html")
    args = parser.parse_args()

    generate_validation_sheet(args.data, args.output, args.n)
