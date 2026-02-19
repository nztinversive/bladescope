import json

coco = json.load(open(r'C:\Users\Atlas-playground\.openclaw\workspace\bladescope\data\DTU-annotations\annotations\train1024-s.json'))
print("Sample images:")
for img in coco['images'][:10]:
    print(f"  {img['file_name']:30s} {img['width']}x{img['height']}")
print(f"\nTotal images in train: {len(coco['images'])}")

# Check naming pattern
names = [f['file_name'] for f in coco['images']]
# Pattern: DJI_XXXX_row_col.JPG
bases = set('_'.join(n.split('_')[:2]) for n in names)
print(f"Unique base DJI images: {len(bases)}")
print(f"Sample: {sorted(bases)[:5]}")

# Check if all 1024x1024
sizes = set((img['width'], img['height']) for img in coco['images'])
print(f"Image sizes: {sizes}")
