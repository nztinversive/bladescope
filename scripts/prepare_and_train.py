"""
BladeScope: Convert COCO annotations to YOLO format using sliced tiles, then train YOLO11m.
Assumes slice_images.py has already been run.
"""
import json
import shutil
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
TILE_DIR = DATA_DIR / "sliced_1024"
ANNOTATIONS_DIR = DATA_DIR / "DTU-annotations" / "annotations"
SPLIT_DIR = DATA_DIR / "yolo_dataset"


def coco_to_yolo(coco_json_path, tile_dir, output_img_dir, output_lbl_dir):
    """Convert COCO JSON annotations to YOLO format."""
    output_img_dir.mkdir(parents=True, exist_ok=True)
    output_lbl_dir.mkdir(parents=True, exist_ok=True)

    with open(coco_json_path) as f:
        coco = json.load(f)

    images = {img['id']: img for img in coco['images']}
    categories = {cat['id']: cat['name'] for cat in coco['categories']}

    # Remap to sequential 0-based
    cat_ids = sorted(categories.keys())
    cat_remap = {old_id: new_id for new_id, old_id in enumerate(cat_ids)}
    class_names = [categories[cid] for cid in cat_ids]

    # Group annotations by image
    ann_by_image = {}
    for ann in coco['annotations']:
        img_id = ann['image_id']
        ann_by_image.setdefault(img_id, []).append(ann)

    converted = 0
    skipped = 0

    for img_id, img_info in images.items():
        fname = img_info['file_name']
        w, h = img_info['width'], img_info['height']

        src = tile_dir / fname
        if not src.exists():
            skipped += 1
            continue

        # Copy image
        dst = output_img_dir / fname
        if not dst.exists():
            shutil.copy2(src, dst)

        # Write YOLO labels
        lbl_path = output_lbl_dir / (Path(fname).stem + ".txt")
        anns = ann_by_image.get(img_id, [])

        with open(lbl_path, 'w') as f:
            for ann in anns:
                bbox = ann['bbox']  # COCO: [x, y, w, h] absolute
                cat_id = cat_remap[ann['category_id']]
                x_center = max(0, min(1, (bbox[0] + bbox[2] / 2) / w))
                y_center = max(0, min(1, (bbox[1] + bbox[3] / 2) / h))
                bw = max(0, min(1, bbox[2] / w))
                bh = max(0, min(1, bbox[3] / h))
                f.write(f"{cat_id} {x_center:.6f} {y_center:.6f} {bw:.6f} {bh:.6f}\n")

        converted += 1

    print(f"  Converted {converted}, skipped {skipped} (missing tiles)")
    return class_names


def create_dataset():
    """Convert all splits and write dataset.yaml."""
    print("=== Creating YOLO Dataset ===\n")

    for split, json_name in [("train", "train1024-s.json"), ("val", "val1024-s.json"), ("test", "test1024-s.json")]:
        json_path = ANNOTATIONS_DIR / json_name
        if not json_path.exists():
            print(f"WARNING: {json_path} not found, skipping {split}")
            continue
        print(f"{split}:")
        class_names = coco_to_yolo(
            json_path, TILE_DIR,
            SPLIT_DIR / split / "images",
            SPLIT_DIR / split / "labels"
        )

    # Write dataset.yaml
    yaml_path = SPLIT_DIR / "dataset.yaml"
    with open(yaml_path, 'w') as f:
        f.write(f"path: {SPLIT_DIR}\n")
        f.write("train: train/images\n")
        f.write("val: val/images\n")
        f.write("test: test/images\n\n")
        f.write(f"nc: {len(class_names)}\n")
        f.write(f"names: {class_names}\n")

    print(f"\nDataset YAML: {yaml_path}")
    print(f"Classes ({len(class_names)}): {class_names}")

    for split in ['train', 'val', 'test']:
        imgs = list((SPLIT_DIR / split / "images").glob("*"))
        lbls = list((SPLIT_DIR / split / "labels").glob("*"))
        print(f"  {split}: {len(imgs)} images, {len(lbls)} labels")

    return yaml_path


def train(yaml_path):
    """Train YOLO11m on RTX 3060."""
    from ultralytics import YOLO

    print("\nLoading YOLO11m...")
    model = YOLO("yolo11m.pt")

    print("Starting training: 100 epochs, batch=8, imgsz=640, patience=20")
    print("GPU: RTX 3060 12GB\n")

    results = model.train(
        data=str(yaml_path),
        epochs=100,
        imgsz=640,
        batch=8,
        device=0,
        project=str(BASE_DIR / "runs"),
        name="dtu_yolo11m",
        patience=20,
        save=True,
        plots=True,
        verbose=True,
        # Augmentation
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        flipud=0.5,
        mosaic=1.0,
        workers=0,
        deterministic=False,
    )

    print("\n=== TRAINING COMPLETE ===")
    best = BASE_DIR / "runs" / "dtu_yolo11m" / "weights" / "best.pt"
    print(f"Best weights: {best}")

    print("\nRunning validation...")
    metrics = model.val()
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")

    return results


if __name__ == "__main__":
    print("=== BladeScope YOLO11m Training Pipeline ===\n")
    yaml_path = create_dataset()

    if "--no-train" in sys.argv:
        print("\n--no-train flag set, skipping training.")
    else:
        train(yaml_path)
