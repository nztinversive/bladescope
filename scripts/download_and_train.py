"""
BladeScope: Download DTU images from Mendeley, convert COCO annotations to YOLO, train YOLO11m.

DTU Dataset:
- Images: https://data.mendeley.com/datasets/hd96prn3nc/2
- Annotations: Already cloned at data/DTU-annotations/ (COCO JSON format)
- 5 classes: LE;ER (leading edge erosion), SF;PO (surface peel-off), VG;MT (vortex generator),
             LR;DA (lightning damage), LE;CR (leading edge crack)
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
ANNOTATIONS_DIR = DATA_DIR / "DTU-annotations" / "annotations"
SPLIT_DIR = DATA_DIR / "yolo_dataset"

# Mendeley dataset download URL
MENDELEY_URL = "https://data.mendeley.com/public-files/datasets/hd96prn3nc/files/7609e327-72e6-41a0-85fa-e85e tried"

def download_mendeley_images():
    """Download DTU images from Mendeley Data."""
    img_dir = DATA_DIR / "mendeley_images"
    img_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if already downloaded
    existing = list(img_dir.glob("*.JPG")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
    if len(existing) > 100:
        print(f"Found {len(existing)} images already downloaded.")
        return img_dir
    
    # Mendeley datasets can be downloaded via their API
    # The dataset hd96prn3nc/2 contains the wind turbine blade images
    print("Downloading DTU images from Mendeley...")
    print("NOTE: Mendeley may require manual download.")
    print("URL: https://data.mendeley.com/datasets/hd96prn3nc/2")
    print()
    print("Trying automated download...")
    
    # Try downloading via the Mendeley API
    try:
        import requests
        # Get dataset info
        api_url = "https://data.mendeley.com/api/datasets/hd96prn3nc/versions/2"
        resp = requests.get(api_url, timeout=30)
        if resp.status_code == 200:
            dataset = resp.json()
            print(f"Dataset: {dataset.get('name', 'Unknown')}")
            
            # Try to get files
            files_url = f"{api_url}/files"
            resp = requests.get(files_url, timeout=30)
            if resp.status_code == 200:
                files = resp.json()
                print(f"Found {len(files)} files in dataset")
                
                # Download each image file
                downloaded = 0
                for f in files:
                    fname = f.get('filename', f.get('name', ''))
                    if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                        dl_url = f.get('download_url') or f.get('content_details', {}).get('download_url', '')
                        if dl_url:
                            dest = img_dir / fname
                            if not dest.exists():
                                try:
                                    r = requests.get(dl_url, timeout=60, stream=True)
                                    if r.status_code == 200:
                                        with open(dest, 'wb') as out:
                                            for chunk in r.iter_content(8192):
                                                out.write(chunk)
                                        downloaded += 1
                                        if downloaded % 50 == 0:
                                            print(f"  Downloaded {downloaded} images...")
                                except Exception as e:
                                    print(f"  Failed: {fname}: {e}")
                
                print(f"Downloaded {downloaded} images")
                if downloaded > 0:
                    return img_dir
        
        print("API download didn't work. Trying alternative...")
    except Exception as e:
        print(f"API error: {e}")
    
    # Alternative: Use the direct zip download if available
    zip_url = "https://data.mendeley.com/datasets/hd96prn3nc/2/files/zip"
    try:
        import requests
        print(f"Trying zip download: {zip_url}")
        resp = requests.get(zip_url, timeout=300, stream=True)
        if resp.status_code == 200:
            zip_path = DATA_DIR / "dtu_images.zip"
            total = int(resp.headers.get('content-length', 0))
            downloaded = 0
            with open(zip_path, 'wb') as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total and downloaded % (10 * 1024 * 1024) == 0:
                        pct = downloaded / total * 100
                        print(f"  {pct:.0f}%")
            
            print(f"Downloaded zip: {zip_path} ({zip_path.stat().st_size / 1024 / 1024:.0f} MB)")
            
            # Extract
            import zipfile
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(img_dir)
            print("Extracted!")
            return img_dir
    except Exception as e:
        print(f"Zip download error: {e}")
    
    print("\n=== MANUAL DOWNLOAD REQUIRED ===")
    print("1. Go to: https://data.mendeley.com/datasets/hd96prn3nc/2")
    print(f"2. Download the image files")
    print(f"3. Extract to: {img_dir}")
    print("4. Re-run this script")
    sys.exit(1)

def coco_to_yolo(coco_json_path, img_dir, output_img_dir, output_lbl_dir):
    """Convert COCO JSON annotations to YOLO format."""
    output_img_dir.mkdir(parents=True, exist_ok=True)
    output_lbl_dir.mkdir(parents=True, exist_ok=True)
    
    with open(coco_json_path) as f:
        coco = json.load(f)
    
    # Build image lookup
    images = {img['id']: img for img in coco['images']}
    categories = {cat['id']: cat['name'] for cat in coco['categories']}
    
    # Remap category IDs to sequential 0-based
    cat_ids = sorted(categories.keys())
    cat_remap = {old_id: new_id for new_id, old_id in enumerate(cat_ids)}
    class_names = [categories[cid] for cid in cat_ids]
    
    # Group annotations by image
    ann_by_image = {}
    for ann in coco['annotations']:
        img_id = ann['image_id']
        if img_id not in ann_by_image:
            ann_by_image[img_id] = []
        ann_by_image[img_id].append(ann)
    
    converted = 0
    skipped = 0
    
    for img_id, img_info in images.items():
        fname = img_info['file_name']
        w, h = img_info['width'], img_info['height']
        
        # Find image file (search recursively)
        src_img = None
        for ext_dir in [img_dir] + list(img_dir.rglob("*")):
            if ext_dir.is_dir():
                candidate = ext_dir / fname
                if candidate.exists():
                    src_img = candidate
                    break
        
        if src_img is None:
            skipped += 1
            continue
        
        # Copy image
        dst_img = output_img_dir / fname
        if not dst_img.exists():
            shutil.copy2(src_img, dst_img)
        
        # Convert annotations to YOLO format
        lbl_path = output_lbl_dir / (Path(fname).stem + ".txt")
        anns = ann_by_image.get(img_id, [])
        
        with open(lbl_path, 'w') as f:
            for ann in anns:
                bbox = ann['bbox']  # COCO: [x, y, width, height] (absolute)
                cat_id = cat_remap[ann['category_id']]
                
                # Convert to YOLO: [class, x_center, y_center, width, height] (normalized)
                x_center = (bbox[0] + bbox[2] / 2) / w
                y_center = (bbox[1] + bbox[3] / 2) / h
                bw = bbox[2] / w
                bh = bbox[3] / h
                
                # Clamp to [0, 1]
                x_center = max(0, min(1, x_center))
                y_center = max(0, min(1, y_center))
                bw = max(0, min(1, bw))
                bh = max(0, min(1, bh))
                
                f.write(f"{cat_id} {x_center:.6f} {y_center:.6f} {bw:.6f} {bh:.6f}\n")
        
        converted += 1
    
    print(f"Converted {converted} images, skipped {skipped} (missing image files)")
    return class_names

def create_dataset():
    """Download images, convert annotations, create YOLO dataset."""
    # Step 1: Download images
    img_dir = download_mendeley_images()
    
    # Count available images
    all_images = []
    for ext in ['*.JPG', '*.jpg', '*.jpeg', '*.png']:
        all_images.extend(list(img_dir.rglob(ext)))
    print(f"Total images available: {len(all_images)}")
    
    # Step 2: Convert train/val/test annotations
    train_json = ANNOTATIONS_DIR / "train1024-s.json"
    val_json = ANNOTATIONS_DIR / "val1024-s.json"
    test_json = ANNOTATIONS_DIR / "test1024-s.json"
    
    print("\nConverting train annotations...")
    class_names = coco_to_yolo(
        train_json, img_dir,
        SPLIT_DIR / "train" / "images",
        SPLIT_DIR / "train" / "labels"
    )
    
    print("Converting val annotations...")
    coco_to_yolo(
        val_json, img_dir,
        SPLIT_DIR / "val" / "images",
        SPLIT_DIR / "val" / "labels"
    )
    
    print("Converting test annotations...")
    coco_to_yolo(
        test_json, img_dir,
        SPLIT_DIR / "test" / "images",
        SPLIT_DIR / "test" / "labels"
    )
    
    # Step 3: Write dataset.yaml
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
    
    # Count per split
    for split in ['train', 'val', 'test']:
        imgs = list((SPLIT_DIR / split / "images").glob("*"))
        lbls = list((SPLIT_DIR / split / "labels").glob("*"))
        print(f"  {split}: {len(imgs)} images, {len(lbls)} labels")
    
    return yaml_path

def train(yaml_path):
    """Train YOLO11m."""
    from ultralytics import YOLO
    
    print("\nLoading YOLO11m...")
    model = YOLO("yolo11m.pt")
    
    print("Starting training on RTX 3060 (12GB VRAM)...")
    print("Config: 100 epochs, batch=8, imgsz=640, patience=20\n")
    
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
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        flipud=0.5,
        mosaic=1.0,
    )
    
    print("\n=== TRAINING COMPLETE ===")
    best_weights = BASE_DIR / "runs" / "dtu_yolo11m" / "weights" / "best.pt"
    print(f"Best weights: {best_weights}")
    
    # Run validation
    print("\nRunning validation...")
    metrics = model.val()
    print(f"mAP@0.5: {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")
    
    return results

if __name__ == "__main__":
    print("=== BladeScope YOLO11m Training Pipeline ===\n")
    yaml_path = create_dataset()
    train(yaml_path)
