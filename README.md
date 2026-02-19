# BladeScope 🔍💨

AI-powered wind turbine blade defect detection using **YOLO11m + SAHI** (Slicing Aided Hyper Inference).

![Stack](https://img.shields.io/badge/Next.js_14-black?logo=next.js)
![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)
![YOLO](https://img.shields.io/badge/YOLO11m-ultralytics-purple)

## Overview

BladeScope detects surface defects in high-resolution drone imagery of wind turbine blades. It uses SAHI to slice 4000×3000+ images into overlapping 640×640 tiles, runs YOLO11m detection on each tile, and merges results with NMS.

### Defect Classes
- 🔴 **Leading Edge Erosion** — Critical
- 🟠 **Surface Crack** — Major
- 🔴 **Lightning Damage** — Critical
- 🟡 **Coating Damage** — Minor
- 🔵 **Contamination** — Info
- 🔴 **Delamination** — Critical

## Architecture

```
Drone Image (4000×3000) → SAHI Slicing → YOLO11m Detection → NMS Merge → Results
```

## Quick Start

### Frontend
```bash
npm install
npm run dev    # http://localhost:3000
```

### Backend (API)
```bash
pip install -r api/requirements.txt
python api/main.py    # http://localhost:8000
```

### Training
```bash
# 1. Download dataset
python scripts/download_dataset.py

# 2. Train YOLO11m
python scripts/train.py

# 3. Run inference on an image
python scripts/detect.py path/to/image.jpg
```

## Project Structure
```
├── src/            # Next.js frontend (TypeScript + Tailwind)
├── api/            # FastAPI inference backend
├── scripts/        # Training & dataset scripts
├── models/         # Trained weights (gitignored)
├── data/           # Dataset (gitignored)
└── docs/           # Research & documentation
```

## Dataset

**DTU Drone Inspection Dataset** — 606 labeled high-resolution drone images of wind turbine blades.
- Source: [Mendeley Data](https://data.mendeley.com/datasets/hd96prn3nc/2)
- Annotations: [DTU-annotations](https://github.com/imadgohar/DTU-annotations) (YOLO format)
- License: CC BY 4.0

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Ultralytics YOLO11m, SAHI
- **Model:** YOLO11m fine-tuned on DTU dataset
- **Target:** ≥80% mAP@0.5, <500ms inference per image

## License
MIT
