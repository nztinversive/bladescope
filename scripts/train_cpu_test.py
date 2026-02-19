"""Quick CPU test — just 1 epoch, batch=2 to verify the pipeline works."""
import os
os.environ['POLARS_SKIP_CPU_CHECK'] = '1'
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).parent.parent
yaml_path = BASE_DIR / "data" / "yolo_dataset" / "dataset.yaml"

print("Testing on CPU (1 epoch, batch=2)...")
model = YOLO("yolo11m.pt")
results = model.train(
    data=str(yaml_path),
    epochs=1,
    imgsz=640,
    batch=2,
    device="cpu",
    project=str(BASE_DIR / "runs"),
    name="cpu_test",
    workers=0,
    verbose=True,
)
print("CPU test passed!")
