"""
Download DTU Wind Turbine Blade Dataset + Annotations

Dataset: https://data.mendeley.com/datasets/hd96prn3nc/2
Annotations: https://github.com/imadgohar/DTU-annotations
"""

import os
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def download_dtu_annotations():
    """Clone DTU-annotations repo with YOLO format labels."""
    annotations_dir = DATA_DIR / "dtu-annotations"
    if annotations_dir.exists():
        print("DTU-annotations already exists, skipping...")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Cloning DTU-annotations...")
    subprocess.run(
        ["git", "clone", "https://github.com/imadgohar/DTU-annotations.git", str(annotations_dir)],
        check=True,
    )
    print(f"Annotations cloned to {annotations_dir}")


def download_dtu_dataset():
    """
    Download DTU dataset from Mendeley Data.

    NOTE: Mendeley Data requires manual download or API access.
    URL: https://data.mendeley.com/datasets/hd96prn3nc/2

    Steps:
    1. Visit the URL above
    2. Download the dataset ZIP
    3. Extract to data/dtu/images/
    4. Run scripts/prepare_splits.py to create train/val splits
    """
    images_dir = DATA_DIR / "dtu" / "images"
    if images_dir.exists() and any(images_dir.iterdir()):
        print("DTU images already exist, skipping...")
        return

    images_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("MANUAL DOWNLOAD REQUIRED")
    print("=" * 60)
    print()
    print("DTU dataset requires manual download from Mendeley Data:")
    print("  https://data.mendeley.com/datasets/hd96prn3nc/2")
    print()
    print(f"After downloading, extract images to:")
    print(f"  {images_dir}")
    print()
    print("Then run: python scripts/prepare_splits.py")
    print("=" * 60)


def prepare_splits():
    """Split images into train/val (85/15)."""
    import random

    images_dir = DATA_DIR / "dtu" / "images"
    all_images = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))

    if not all_images:
        print("No images found. Download the dataset first.")
        return

    random.seed(42)
    random.shuffle(all_images)

    split_idx = int(len(all_images) * 0.85)
    train_images = all_images[:split_idx]
    val_images = all_images[split_idx:]

    train_dir = images_dir / "train"
    val_dir = images_dir / "val"
    train_dir.mkdir(exist_ok=True)
    val_dir.mkdir(exist_ok=True)

    for img in train_images:
        img.rename(train_dir / img.name)
    for img in val_images:
        img.rename(val_dir / img.name)

    print(f"Split: {len(train_images)} train, {len(val_images)} val")


if __name__ == "__main__":
    download_dtu_annotations()
    download_dtu_dataset()
