"""
BladeScope CLI Inference — Run SAHI + YOLO11m on a single image.

Usage:
    python scripts/detect.py path/to/image.jpg [--model models/best.pt] [--no-sahi]
"""

import argparse
import time
import json
from pathlib import Path

import numpy as np
from PIL import Image


def run_detection(image_path: str, model_path: str = "models/best.pt", use_sahi: bool = True):
    from ultralytics import YOLO

    CLASS_NAMES = {
        0: "Leading Edge Erosion",
        1: "Surface Crack",
        2: "Lightning Damage",
        3: "Coating Damage",
        4: "Contamination",
        5: "Delamination",
    }

    image = Image.open(image_path).convert("RGB")
    img_w, img_h = image.size
    img_array = np.array(image)

    start = time.time()

    detections = []

    if use_sahi:
        from sahi import AutoDetectionModel
        from sahi.predict import get_sliced_prediction

        sahi_model = AutoDetectionModel.from_pretrained(
            model_type="yolov8",
            model_path=model_path,
            confidence_threshold=0.25,
            device="cpu",
        )

        result = get_sliced_prediction(
            image=img_array,
            detection_model=sahi_model,
            slice_height=640,
            slice_width=640,
            overlap_height_ratio=0.2,
            overlap_width_ratio=0.2,
        )

        for obj in result.object_prediction_list:
            bbox = obj.bbox
            cls_id = obj.category.id
            detections.append({
                "class": CLASS_NAMES.get(cls_id, f"class_{cls_id}"),
                "confidence": round(obj.score.value, 4),
                "bbox": [int(bbox.minx), int(bbox.miny), int(bbox.maxx), int(bbox.maxy)],
            })
    else:
        model = YOLO(model_path)
        results = model.predict(source=img_array, conf=0.25, imgsz=640)

        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                detections.append({
                    "class": CLASS_NAMES.get(cls_id, f"class_{cls_id}"),
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox": [x1, y1, x2, y2],
                })

    elapsed = round((time.time() - start) * 1000)

    result = {
        "image": image_path,
        "size": [img_w, img_h],
        "detections": detections,
        "count": len(detections),
        "inference_ms": elapsed,
        "sahi": use_sahi,
    }

    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BladeScope defect detection")
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("--model", default="models/best.pt", help="Model weights path")
    parser.add_argument("--no-sahi", action="store_true", help="Disable SAHI slicing")
    args = parser.parse_args()

    run_detection(args.image, args.model, use_sahi=not args.no_sahi)
