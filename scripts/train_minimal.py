"""Minimal training test."""
import os, signal, sys
os.environ['POLARS_SKIP_CPU_CHECK'] = '1'

# Catch segfaults
def handler(signum, frame):
    print(f"\nSignal {signum} caught!", flush=True)
    sys.exit(1)

for sig in [signal.SIGTERM, signal.SIGINT, signal.SIGABRT]:
    try:
        signal.signal(sig, handler)
    except:
        pass

from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).parent.parent
yaml_path = BASE_DIR / "data" / "yolo_dataset" / "dataset.yaml"

print("Starting minimal GPU test...", flush=True)
model = YOLO("yolo11m.pt")
print("Model loaded, starting train...", flush=True)
results = model.train(
    data=str(yaml_path),
    epochs=1,
    imgsz=320,  # smaller
    batch=2,
    device=0,
    project=str(BASE_DIR / "runs"),
    name="minimal_test",
    workers=0,
    deterministic=False,
    amp=False,
    verbose=True,
    mosaic=0.0,
    augment=False,
)
print("DONE!", flush=True)
