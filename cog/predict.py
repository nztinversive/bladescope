"""BladeScope YOLO11m — Wind turbine blade defect detection for Replicate."""

import json
from typing import Optional

import numpy as np
from cog import BaseModel, BasePredictor, Input, Path
from PIL import Image
from ultralytics import YOLO


CLASS_INFO = {
    0: {"code": "VG;MT", "name": "Vortex Generator Missing/Damaged", "severity": "minor"},
    1: {"code": "LE;ER", "name": "Leading Edge Erosion", "severity": "critical"},
    2: {"code": "LR;DA", "name": "Lightning Receptor Damage", "severity": "critical"},
    3: {"code": "LE;CR", "name": "Leading Edge Crack", "severity": "major"},
    4: {"code": "SF;PO", "name": "Surface Peel-Off", "severity": "major"},
}


class Output(BaseModel):
    """Output model for predictions."""

    image: Optional[Path] = None
    json_str: Optional[str] = None


class Predictor(BasePredictor):
    """YOLO11m blade defect detection predictor."""

    def setup(self) -> None:
        """Load YOLO11m model trained on DTU dataset."""
        self.model = YOLO("best.pt")
        self.sahi_model = None

    def _get_sahi_model(self):
        if self.sahi_model is None:
            from sahi import AutoDetectionModel
            self.sahi_model = AutoDetectionModel.from_pretrained(
                model_type="yolov8",
                model_path="best.pt",
                confidence_threshold=0.25,
                device="cpu",
            )
        return self.sahi_model

    def predict(
        self,
        image: Path = Input(description="Drone image of wind turbine blade"),
        conf: float = Input(description="Confidence threshold", default=0.25, ge=0.0, le=1.0),
        iou: float = Input(description="IoU threshold for NMS", default=0.45, ge=0.0, le=1.0),
        imgsz: int = Input(
            description="Image size", default=640, choices=[320, 416, 512, 640, 832, 1024, 1280]
        ),
        use_sahi: bool = Input(description="Use SAHI sliced inference for large images", default=True),
        slice_size: int = Input(description="SAHI slice size in pixels", default=640),
        overlap_ratio: float = Input(description="SAHI overlap ratio between slices", default=0.2, ge=0.0, le=0.5),
        return_json: bool = Input(description="Return detection results as JSON", default=True),
    ) -> Output:
        """Run defect detection with optional SAHI tiling."""

        if use_sahi:
            from sahi.predict import get_sliced_prediction

            img = np.array(Image.open(str(image)).convert("RGB"))[:, :, ::-1].copy()
            sahi_model = self._get_sahi_model()
            sahi_model.confidence_threshold = conf

            result = get_sliced_prediction(
                image=img,
                detection_model=sahi_model,
                slice_height=slice_size,
                slice_width=slice_size,
                overlap_height_ratio=overlap_ratio,
                overlap_width_ratio=overlap_ratio,
            )

            # Build JSON output matching YOLO format
            detections = []
            for obj in result.object_prediction_list:
                bbox = obj.bbox
                cls_id = obj.category.id
                info = CLASS_INFO.get(cls_id, {"code": f"class_{cls_id}", "name": "Unknown", "severity": "info"})
                detections.append({
                    "class": info["code"],
                    "name": info["name"],
                    "confidence": round(obj.score.value, 4),
                    "severity": info["severity"],
                    "bbox": [round(bbox.minx, 1), round(bbox.miny, 1), round(bbox.maxx, 1), round(bbox.maxy, 1)],
                })

            # Save annotated image
            image_path = "output.png"
            result.export_visuals(export_dir=".", file_name="output")

            if return_json:
                return Output(image=Path(image_path), json_str=json.dumps(detections))
            return Output(image=Path(image_path))

        else:
            # Standard single-pass inference
            result = self.model(str(image), conf=conf, iou=iou, imgsz=imgsz)[0]
            image_path = "output.png"
            result.save(image_path)

            if return_json:
                try:
                    json_out = result.to_json()
                except Exception:
                    json_out = "[]"
                return Output(image=Path(image_path), json_str=json_out)
            return Output(image=Path(image_path))
