"""Download wind turbine blade defect dataset from Roboflow Universe."""
import requests
import os
import zipfile
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# Roboflow datasets can be downloaded via their API
# Let's try the turbine blade defect detection dataset
datasets = [
    {
        "name": "Turbine Blade Defect Detection",
        "url": "https://universe.roboflow.com/turbine-blade-defect-detection/turbine-blade-defect-detection",
        "api_url": "https://universe.roboflow.com/api/turbine-blade-defect-detection/turbine-blade-defect-detection/dataset/yolov8",
    },
    {
        "name": "Wind Turbine Damage Detection",
        "url": "https://universe.roboflow.com/wind-turbine-blade-damage-detection-z7neu/wind-turbine-damage-detection/dataset/2",
    }
]

# Check what's available
for ds in datasets:
    print(f"\n=== {ds['name']} ===")
    print(f"URL: {ds['url']}")
    
    # Try to get dataset info
    try:
        resp = requests.get(ds['url'], timeout=15)
        print(f"Status: {resp.status_code}")
    except Exception as e:
        print(f"Error: {e}")

# Alternative: Try downloading from the Roboflow public download
# Roboflow allows direct YOLO export for public datasets
print("\n\n=== Trying Roboflow direct export ===")
# Public datasets on Roboflow Universe use this pattern:
# https://app.roboflow.com/ds/DATASET_ID?key=API_KEY
# But we need the dataset version ID

# Let's try the API endpoint
try:
    resp = requests.get(
        "https://universe.roboflow.com/turbine-blade-defect-detection/turbine-blade-defect-detection/dataset/1",
        headers={"Accept": "application/json"},
        timeout=15
    )
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('content-type')}")
    if 'json' in resp.headers.get('content-type', ''):
        import json
        print(json.dumps(resp.json(), indent=2)[:1000])
except Exception as e:
    print(f"Error: {e}")

# Try pip install roboflow for easier download
print("\n\n=== Alternative: Use roboflow pip package ===")
print("pip install roboflow")
print("Then use roboflow.Workspace().project().version().download('yolov8')")
print("\nOR just manually download from:")
print("1. https://universe.roboflow.com/turbine-blade-defect-detection/turbine-blade-defect-detection")
print("2. Click 'Download Dataset' -> YOLOv8 format")
print("3. Extract to data/ directory")
