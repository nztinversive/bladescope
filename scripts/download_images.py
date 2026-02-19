"""Download DTU dataset images from Mendeley Data."""
import requests
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
IMG_DIR = DATA_DIR / "mendeley_images"
IMG_DIR.mkdir(parents=True, exist_ok=True)

# Mendeley dataset DOI: 10.17632/hd96prn3nc.2
# The dataset has 2 zip files with drone inspection images

# Try the Mendeley public file download URLs
# Format: https://prod-dcd-datasets-cache-zipfiles.s3.eu-west-1.amazonaws.com/hd96prn3nc-2.zip
urls_to_try = [
    "https://prod-dcd-datasets-cache-zipfiles.s3.eu-west-1.amazonaws.com/hd96prn3nc-2.zip",
    "https://data.mendeley.com/public-files/datasets/hd96prn3nc/files/cfc1d29f-06b9-40bf-837b-cf1eca42966e/file_downloaded",
    "https://md-datasets-cache-zipfiles-prod.s3.eu-west-1.amazonaws.com/hd96prn3nc-2.zip",
]

for url in urls_to_try:
    print(f"Trying: {url}")
    try:
        resp = requests.head(url, timeout=15, allow_redirects=True)
        print(f"  Status: {resp.status_code}")
        cl = resp.headers.get('content-length')
        ct = resp.headers.get('content-type')
        print(f"  Content-Length: {cl}")
        print(f"  Content-Type: {ct}")
        
        if resp.status_code == 200 and cl and int(cl) > 1000000:
            # Looks good, download it
            print(f"  Downloading ({int(cl)/1024/1024:.0f} MB)...")
            zip_path = DATA_DIR / "dtu_dataset.zip"
            
            resp = requests.get(url, timeout=600, stream=True)
            total = int(resp.headers.get('content-length', 0))
            downloaded = 0
            
            with open(zip_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if downloaded % (50 * 1024 * 1024) < 65536:
                        pct = (downloaded / total * 100) if total else 0
                        print(f"  {downloaded / 1024 / 1024:.0f} MB ({pct:.0f}%)")
            
            print(f"  Downloaded: {zip_path} ({zip_path.stat().st_size / 1024 / 1024:.0f} MB)")
            
            # Extract
            import zipfile
            print("  Extracting...")
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(IMG_DIR)
            
            # Count images
            images = list(IMG_DIR.rglob("*.JPG")) + list(IMG_DIR.rglob("*.jpg")) + list(IMG_DIR.rglob("*.png"))
            print(f"  Extracted {len(images)} images")
            break
    except Exception as e:
        print(f"  Error: {e}")
    print()

# Final check
images = list(IMG_DIR.rglob("*.JPG")) + list(IMG_DIR.rglob("*.jpg")) + list(IMG_DIR.rglob("*.png"))
print(f"\nTotal images found: {len(images)}")
if images:
    print("Sample files:")
    for img in images[:5]:
        print(f"  {img.relative_to(IMG_DIR)}")
