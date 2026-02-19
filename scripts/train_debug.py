"""Debug wrapper to catch training errors."""
import os, sys, traceback
os.environ['POLARS_SKIP_CPU_CHECK'] = '1'

from pathlib import Path
BASE_DIR = Path(__file__).parent.parent
SPLIT_DIR = BASE_DIR / "data" / "yolo_dataset"
yaml_path = SPLIT_DIR / "dataset.yaml"

try:
    print("Importing ultralytics...")
    from ultralytics import YOLO
    print("Loading YOLO11m...")
    model = YOLO("yolo11m.pt")
    print("Starting training...")
    results = model.train(
        data=str(yaml_path),
        epochs=5,
        imgsz=640,
        batch=4,
        device=0,
        project=str(BASE_DIR / "runs"),
        name="debug_run",
        patience=5,
        workers=0,
        verbose=True,
    )
    print("Training completed!")
except Exception as e:
    print(f"\n\nERROR: {type(e).__name__}: {e}")
    traceback.print_exc()
    sys.exit(1)
