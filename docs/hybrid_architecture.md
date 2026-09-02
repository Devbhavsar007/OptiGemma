# DrishtiAI — Hybrid Architecture: MATLAB Core + Web Delivery Layer

## Architecture Overview

DrishtiAI uses a **hybrid architecture** that combines MATLAB/Simulink for the clinical pipeline core with Python/React for the patient-facing delivery layer. This design balances the PS 26038 sponsor requirement (MathWorks toolchain) with practical deployability in resource-constrained PHCs.

```
┌─────────────────────────────────────────────────────────────┐
│                   MATLAB CLINICAL CORE                       │
│  (Image Processing Toolbox + Deep Learning Toolbox +         │
│   Computer Vision Toolbox + Simulink)                        │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │  Module 1 │  │   Module 2    │  │    Module 3      │       │
│  │  IQA Gate │→│ Segmentation  │→│ Ordinal Grading   │       │
│  │(assessQua-│  │(disc, fovea,  │  │(ONNX-imported     │      │
│  │ lity.m)   │  │ vessels, MA,  │  │ EfficientNet-B3   │      │
│  │           │  │ exudates, NV) │  │ + calibration)    │      │
│  └──────────┘  └──────────────┘  └─────────────────┘        │
│                                                              │
│  ┌──────────────────────┐  ┌────────────────────────┐        │
│  │    Module 4           │  │    Module 5             │       │
│  │  Explainability       │  │  Simulink Throughput    │       │
│  │  (gradCAM + overlay)  │  │  (build_telemed_model)  │       │
│  └──────────────────────┘  └────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                          ↕ ONNX bridge
┌─────────────────────────────────────────────────────────────┐
│               WEB DELIVERY LAYER (Python/React)              │
│                                                              │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │ Flask API     │  │ React SPA   │  │ SQLite DB     │       │
│  │ (app.py)      │  │ (src/)      │  │ (patients,    │       │
│  │ analyze-v2    │  │ multilingual│  │  scans, audit) │      │
│  └──────────────┘  │ audio, PDF  │  └──────────────┘        │
│                     └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Why Hybrid?

1. **Sponsor alignment**: MATLAB/Simulink are the PS-mandated tools. Our clinical core uses Image Processing Toolbox (CLAHE, morphology, FOV detection), Deep Learning Toolbox (ONNX import, gradCAM), and Simulink (throughput modeling).

2. **Practical deployability**: MATLAB Runtime is free to distribute but has a large footprint (~2 GB). For single-laptop PHC deployment, the Python delivery layer provides a lightweight alternative that can run the same algorithms via OpenCV/PyTorch equivalents.

3. **ONNX as the bridge**: Models are trained in Python (PyTorch), exported to ONNX, and imported into MATLAB via `importONNXNetwork` / `importNetworkFromONNX`. This gives us the best of both worlds — Python's training ecosystem and MATLAB's deployment/code-generation toolchain.

## File Mapping

| MATLAB Module | File | Python Equivalent | Toolbox Used |
|---|---|---|---|
| IQA Quality Gate | `matlab/assessQuality.m` | `engine/pipeline/iqa.py` | Image Processing Toolbox |
| Image Enhancement | `matlab/enhanceImage.m` | `engine/pipeline/iqa.py:enhance()` | Image Processing Toolbox |
| ONNX Model Import | `matlab/importModels.m` | N/A (native PyTorch) | Deep Learning Toolbox |
| Full DR Screening | `matlab/runDRScreening.m` | `engine/pipeline/runner.py` | Deep Learning + Image Processing |
| Grad-CAM Explainability | `matlab/runDRScreening.m` (L166-180) | `engine/pipeline/explain.py` | Deep Learning Toolbox |
| Report Generation | `matlab/generateReport.m` | `engine/gemma_report.py` | — |
| Throughput Model | `simulink/build_telemed_model.m` | `simulink/telemed_sim.py` | **Simulink** |
| Build/Deploy Script | `matlab/buildScript.m` | — | MATLAB Coder / GPU Coder |

## ONNX Export → MATLAB Import Workflow

```bash
# Step 1: Train in Python (PyTorch)
python train_model.py --data data/aptos

# Step 2: Export to ONNX
python -c "
import torch, timm
model = timm.create_model('efficientnet_b3', num_classes=5)
model.load_state_dict(torch.load('best_model_final.pt', map_location='cpu')['model_state_dict'])
model.eval()
torch.onnx.export(model, torch.randn(1,3,300,300), 'models/onnx/dr_grading.onnx',
                  input_names=['image'], output_names=['logits'], opset_version=13)
"

# Step 3: Import in MATLAB
# >> importModels('models/onnx/')
```

## Simulink Throughput Model

The `simulink/build_telemed_model.m` creates a discrete-event simulation of a district screening program serving 100,000+ patients/year:

- **Acquisition rate**: 1 image per 5 seconds per operator
- **IQA reject loop**: 12% reject rate → recapture feedback
- **Inference throughput**: 0.8s/image GPU processing
- **Bandwidth constraint**: 512 kbps rural uplink, 180 KB compressed JPEG
- **Review queue**: 3 ophthalmologists at <30s per validation (brief SLA)
- **Horizon**: 220 camp days × 12 hours/day

## Deployment Targets

| Target | Toolchain | Notes |
|---|---|---|
| Embedded (Jetson) | MATLAB GPU Coder → CUDA | `buildScript.m` generates standalone CUDA code |
| Standalone desktop | MATLAB Coder → C++ | No MATLAB Runtime needed at deployment |
| Cloud/PHC laptop | Python/Flask | Lightweight, free, zero licensing |
| Mobile (Android) | TFLite/ONNX Runtime | `android/` directory contains the wrapper |
