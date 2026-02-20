"""BladeScope YOLO11m — Wind turbine blade defect detection for Replicate."""

from typing import Optional

from cog import BaseModel, BasePredictor, Input, Path
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

    def predict(
        self,
        image: Path = Input(description="Drone image of wind turbine blade"),
        conf: float = Input(description="Confidence threshold", default=0.25, ge=0.0, le=1.0),
        iou: float = Input(description="IoU threshold for NMS", default=0.45, ge=0.0, le=1.0),
        imgsz: int = Input(
            description="Image size", default=640, choices=[320, 416, 512, 640, 832, 1024, 1280]
        ),
        return_json: bool = Input(description="Return detection results as JSON", default=True),
    ) -> Output:
        """Run defect detection and return annotated image with optional JSON results."""
        result = self.model(str(image), conf=conf, iou=iou, imgsz=imgsz)[0]
        image_path = "output.png"
        result.save(image_path)

        if return_json:
            return Output(image=Path(image_path), json_str=result.to_json())
        else:
            return Output(image=Path(image_path))
