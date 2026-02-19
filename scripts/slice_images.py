"""
Slice original DTU drone images into 1024x1024 tiles to match annotation file naming.
Pattern: DJI_XXXX.JPG -> DJI_XXXX_row_col.JPG (0-indexed)
"""
import json
import os
import sys
from pathlib import Path
from PIL import Image

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
ORIG_DIR = DATA_DIR / "mendeley_images"  # Will search recursively
TILE_DIR = DATA_DIR / "sliced_1024"
ANNOTATIONS_DIR = DATA_DIR / "DTU-annotations" / "annotations"

TILE_SIZE = 1024

def get_needed_tiles():
    """Get all tile filenames referenced in annotations."""
    needed = set()
    for jf in ["train1024-s.json", "val1024-s.json", "test1024-s.json"]:
        path = ANNOTATIONS_DIR / jf
        if path.exists():
            coco = json.load(open(path))
            for img in coco['images']:
                needed.add(img['file_name'])
    return needed

def slice_image(img_path, tile_size=TILE_SIZE):
    """Slice an image into tile_size x tile_size patches. Returns dict of name->tile."""
    img = Image.open(img_path)
    w, h = img.size
    base = img_path.stem  # e.g. DJI_0058
    
    tiles = {}
    rows = (h + tile_size - 1) // tile_size
    cols = (w + tile_size - 1) // tile_size
    
    for r in range(rows):
        for c in range(cols):
            x = c * tile_size
            y = r * tile_size
            # Crop (may be smaller at edges)
            box = (x, y, min(x + tile_size, w), min(y + tile_size, h))
            tile = img.crop(box)
            
            # Pad to full tile_size if needed
            if tile.size != (tile_size, tile_size):
                padded = Image.new('RGB', (tile_size, tile_size), (0, 0, 0))
                padded.paste(tile, (0, 0))
                tile = padded
            
            name = f"{base}_{r}_{c}.JPG"
            tiles[name] = tile
    
    return tiles

def main():
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    
    needed = get_needed_tiles()
    print(f"Annotation files reference {len(needed)} tiles")
    
    # Check how many already exist
    existing = set(f.name for f in TILE_DIR.glob("*.JPG"))
    remaining = needed - existing
    print(f"Already sliced: {len(existing)}, remaining: {len(remaining)}")
    
    if not remaining:
        print("All tiles exist!")
        return
    
    # Get unique base images needed
    bases_needed = set()
    for name in remaining:
        parts = name.replace('.JPG', '').split('_')
        base = '_'.join(parts[:2])  # DJI_XXXX
        bases_needed.add(base)
    
    print(f"Need to slice {len(bases_needed)} original images")
    
    # Find and slice originals (search recursively, skip (1) duplicates)
    originals = {}
    for f in ORIG_DIR.rglob("*.JPG"):
        stem = f.stem
        if '(' in stem:
            continue  # skip duplicates like DJI_0578(1)
        originals[stem] = f
    print(f"Found {len(originals)} original images")
    
    sliced = 0
    matched = 0
    missing_originals = []
    
    for base in sorted(bases_needed):
        if base not in originals:
            missing_originals.append(base)
            continue
        
        img_path = originals[base]
        tiles = slice_image(img_path)
        
        for name, tile in tiles.items():
            if name in needed:
                tile.save(TILE_DIR / name, quality=95)
                matched += 1
        
        sliced += 1
        if sliced % 20 == 0:
            print(f"  Sliced {sliced}/{len(bases_needed)} images, {matched} tiles saved")
    
    print(f"\nDone! Sliced {sliced} images, saved {matched} tiles")
    if missing_originals:
        print(f"Missing {len(missing_originals)} originals: {missing_originals[:10]}...")
    
    # Final check
    final = set(f.name for f in TILE_DIR.glob("*.JPG"))
    still_missing = needed - final
    if still_missing:
        print(f"\nWARNING: Still missing {len(still_missing)} tiles: {list(still_missing)[:10]}...")
    else:
        print(f"\nSUCCESS: All {len(needed)} annotation tiles are present!")

if __name__ == "__main__":
    main()
