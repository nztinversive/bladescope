"""Try multiple sources for wind turbine blade defect images."""
import requests
import os
import subprocess
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
IMG_DIR = DATA_DIR / "mendeley_images"
IMG_DIR.mkdir(parents=True, exist_ok=True)

# Method 1: Follow the S3 redirect properly
print("=== Method 1: S3 redirect ===")
url = "https://md-datasets-cache-zipfiles-prod.s3.eu-west-1.amazonaws.com/hd96prn3nc-2.zip"
try:
    resp = requests.get(url, timeout=30, allow_redirects=True, stream=True)
    print(f"Final URL: {resp.url}")
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('content-type')}")
    cl = resp.headers.get('content-length')
    print(f"Content-Length: {cl}")
    
    if resp.status_code == 200 and cl and int(cl) > 1000000:
        print(f"Downloading {int(cl)/1024/1024:.0f} MB...")
        zip_path = DATA_DIR / "dtu_dataset.zip"
        total = int(cl)
        downloaded = 0
        with open(zip_path, 'wb') as f:
            for chunk in resp.iter_content(65536):
                f.write(chunk)
                downloaded += len(chunk)
                if downloaded % (20 * 1024 * 1024) < 65536:
                    print(f"  {downloaded/1024/1024:.0f}/{total/1024/1024:.0f} MB")
        
        print(f"Done! Size: {zip_path.stat().st_size/1024/1024:.0f} MB")
        
        import zipfile
        print("Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(IMG_DIR)
        
        images = list(IMG_DIR.rglob("*.JPG")) + list(IMG_DIR.rglob("*.jpg"))
        print(f"Extracted {len(images)} images!")
        if images:
            for i in images[:3]:
                print(f"  {i.name}")
            exit(0)
except Exception as e:
    print(f"Error: {e}")

# Method 2: Try Kaggle dataset (already has YOLO annotations)
print("\n=== Method 2: Kaggle YOLO-annotated dataset ===")
kaggle_url = "https://www.kaggle.com/datasets/ajifoster3/yolo-annotated-wind-turbines-586x371"
print(f"Dataset: {kaggle_url}")
print("This dataset already has YOLO format annotations!")
print("To download: pip install kaggle && kaggle datasets download -d ajifoster3/yolo-annotated-wind-turbines-586x371")

# Method 3: Use BITS transfer for Mendeley (PowerShell, more reliable)
print("\n=== Method 3: BITS transfer ===")
# The actual Mendeley download link format
mendeley_dl = "https://data.mendeley.com/datasets/hd96prn3nc/2/files/download"
print(f"Trying: {mendeley_dl}")
try:
    resp = requests.get(mendeley_dl, timeout=30, allow_redirects=True, stream=True)
    print(f"Final URL: {resp.url}")
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('content-type')}")
    cl = resp.headers.get('content-length')
    print(f"Content-Length: {cl}")
    
    if resp.status_code == 200 and cl and int(cl) > 1000000:
        print(f"Downloading {int(cl)/1024/1024:.0f} MB...")
        zip_path = DATA_DIR / "dtu_dataset.zip"
        total = int(cl)
        downloaded = 0
        with open(zip_path, 'wb') as f:
            for chunk in resp.iter_content(65536):
                f.write(chunk)
                downloaded += len(chunk)
                if downloaded % (20 * 1024 * 1024) < 65536:
                    print(f"  {downloaded/1024/1024:.0f}/{total/1024/1024:.0f} MB")
        print(f"Done! {zip_path.stat().st_size/1024/1024:.0f} MB")
except Exception as e:
    print(f"Error: {e}")
