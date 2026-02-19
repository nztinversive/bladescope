"""BladeScope Inference API — YOLO11m + SAHI for wind turbine blade defect detection."""

import io
import os
import time
import base64
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np

app = FastAPI(
    title="BladeScope API",
    description="Wind turbine blade defect detection using YOLO11m + SAHI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Defect class mapping (DTU trained model)
CLASS_NAMES = {
    0: "VG;MT",
    1: "LE;ER",
    2: "LR;DA",
    3: "LE;CR",
    4: "SF;PO",
}

SEVERITY_MAP = {
    "VG;MT": "minor",
    "LE;ER": "critical",
    "LR;DA": "critical",
    "LE;CR": "major",
    "SF;PO": "major",
}

CLASS_DESCRIPTIONS = {
    "VG;MT": "Vortex generator missing or damaged; monitor and repair to restore aerodynamic performance.",
    "LE;ER": "Leading edge erosion that can reduce efficiency and accelerate structural wear.",
    "LR;DA": "Lightning receptor damage that increases strike risk and requires urgent corrective action.",
    "LE;CR": "Leading edge crack with propagation risk under cyclic turbine loading.",
    "SF;PO": "Surface peel-off exposing underlying material and increasing further degradation risk.",
}

# Global model reference
_model = None
_sahi_model = None

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "best.pt"),
)


def get_model():
    """Lazy-load YOLO model."""
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Model not available: {e}")
    return _model


def get_sahi_model():
    """Lazy-load SAHI detection model."""
    global _sahi_model
    if _sahi_model is None:
        try:
            from sahi import AutoDetectionModel
            _sahi_model = AutoDetectionModel.from_pretrained(
                model_type="yolov8",
                model_path=MODEL_PATH,
                confidence_threshold=0.25,
                device="cpu",
            )
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"SAHI model not available: {e}")
    return _sahi_model


@app.get("/health")
async def health():
    model_exists = Path(MODEL_PATH).exists()
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "model_path": MODEL_PATH,
        "model_exists": model_exists,
    }


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    confidence: float = 0.25,
    iou_threshold: float = 0.45,
    use_sahi: bool = True,
    slice_width: int = 640,
    slice_height: int = 640,
    overlap_ratio: float = 0.2,
):
    """Run defect detection on an uploaded image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    img_w, img_h = image.size
    # Convert RGB→BGR for OpenCV/YOLO compatibility
    img_array = np.array(image)[:, :, ::-1].copy()

    start = time.time()

    detections = []

    if use_sahi:
        try:
            from sahi.predict import get_sliced_prediction

            model = get_sahi_model()
            result = get_sliced_prediction(
                image=img_array,
                detection_model=model,
                slice_height=slice_height,
                slice_width=slice_width,
                overlap_height_ratio=overlap_ratio,
                overlap_width_ratio=overlap_ratio,
            )

            for obj in result.object_prediction_list:
                bbox = obj.bbox
                cls_id = obj.category.id
                cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
                detections.append({
                    "class": cls_name,
                    "confidence": round(obj.score.value, 4),
                    "severity": SEVERITY_MAP.get(cls_name, "info"),
                    "description": CLASS_DESCRIPTIONS.get(
                        cls_name, "No description available."
                    ),
                    "bbox": {
                        "x": round(bbox.minx / img_w * 100, 2),
                        "y": round(bbox.miny / img_h * 100, 2),
                        "w": round((bbox.maxx - bbox.minx) / img_w * 100, 2),
                        "h": round((bbox.maxy - bbox.miny) / img_h * 100, 2),
                    },
                })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"SAHI inference failed: {e}")
    else:
        try:
            model = get_model()
            results = model.predict(
                source=img_array,
                conf=confidence,
                iou=iou_threshold,
                imgsz=640,
            )

            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    detections.append({
                        "class": cls_name,
                        "confidence": round(float(box.conf[0]), 4),
                        "severity": SEVERITY_MAP.get(cls_name, "info"),
                        "description": CLASS_DESCRIPTIONS.get(
                            cls_name, "No description available."
                        ),
                        "bbox": {
                            "x": round(x1 / img_w * 100, 2),
                            "y": round(y1 / img_h * 100, 2),
                            "w": round((x2 - x1) / img_w * 100, 2),
                            "h": round((y2 - y1) / img_h * 100, 2),
                        },
                    })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    inference_time = round((time.time() - start) * 1000)

    # Calculate tiles
    tiles_x = max(1, int(np.ceil((img_w - slice_width) / (slice_width * (1 - overlap_ratio)))) + 1) if use_sahi else 1
    tiles_y = max(1, int(np.ceil((img_h - slice_height) / (slice_height * (1 - overlap_ratio)))) + 1) if use_sahi else 1

    return {
        "filename": file.filename,
        "image_width": img_w,
        "image_height": img_h,
        "detections": detections,
        "detection_count": len(detections),
        "inference_time_ms": inference_time,
        "tiles_processed": tiles_x * tiles_y,
        "model": "YOLO11m",
        "sahi_enabled": use_sahi,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
