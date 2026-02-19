"""
BladeScope Training Script — YOLO11m on DTU Wind Turbine Blade Dataset

Usage:
    python scripts/train.py

Prerequisites:
    pip install ultralytics sahi
    Download DTU dataset to data/dtu/
    Clone DTU-annotations to data/dtu-annotations/
"""

import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DTU_IMAGES = DATA_DIR / "dtu" / "images"
DTU_LABELS = DATA_DIR / "dtu-annotations" / "labels"
MODEL_OUTPUT = PROJECT_ROOT / "models"

# Dataset YAML config
DATASET_YAML = DATA_DIR / "bladescope.yaml"

DATASET_CONFIG = """
# BladeScope Dataset Configuration
path: {data_dir}
train: dtu/images/train
val: dtu/images/val

# DTU-annotations class mapping
names:
  0: leading_edge_erosion
  1: surface_crack
  2: lightning_damage
  3: coating_damage
  4: contamination
  5: delamination

# Number of classes
nc: 6
""".strip()


def setup_dataset():
    """Create dataset YAML and verify directory structure."""
    DATASET_YAML.parent.mkdir(parents=True, exist_ok=True)
    DATASET_YAML.write_text(DATASET_CONFIG.format(data_dir=DATA_DIR.as_posix()))
    print(f"Dataset config written to {DATASET_YAML}")

    # Create expected dirs
    for split in ["train", "val"]:
        (DTU_IMAGES / split).mkdir(parents=True, exist_ok=True)
        (DTU_LABELS / split).mkdir(parents=True, exist_ok=True)

    print("Directory structure ready. Ensure images and labels are in place.")


def train():
    """Fine-tune YOLO11m on DTU blade defect dataset."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed. Run: pip install ultralytics")
        return

    setup_dataset()

    MODEL_OUTPUT.mkdir(parents=True, exist_ok=True)

    # Load YOLO11m pretrained on COCO
    model = YOLO("yolo11m.pt")

    # Train
    results = model.train(
        data=str(DATASET_YAML),
        epochs=200,
        imgsz=640,
        batch=16,
        patience=30,
        project=str(MODEL_OUTPUT),
        name="bladescope",
        # Augmentation (optimized for blade defects)
        augment=True,
        mosaic=1.0,
        mixup=0.1,
        hsv_h=0.015,
        hsv_s=0.5,
        hsv_v=0.3,
        degrees=15,
        flipud=0.5,
        fliplr=0.5,
        # Optimization
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3,
        # Device
        device="0" if os.environ.get("CUDA_VISIBLE_DEVICES") else "cpu",
    )

    print(f"\nTraining complete. Best weights at: {MODEL_OUTPUT}/bladescope/weights/best.pt")
    return results


def evaluate():
    """Run validation on the trained model."""
    from ultralytics import YOLO

    best_weights = MODEL_OUTPUT / "bladescope" / "weights" / "best.pt"
    if not best_weights.exists():
        print(f"No weights found at {best_weights}. Train first.")
        return

    model = YOLO(str(best_weights))
    metrics = model.val(data=str(DATASET_YAML))
    print(f"\nmAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")
    return metrics


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "eval":
        evaluate()
    else:
        train()
