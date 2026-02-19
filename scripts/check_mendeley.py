import requests, json

resp = requests.get('https://data.mendeley.com/api/datasets/hd96prn3nc?version=2', timeout=30)
data = resp.json()
print('Name:', data.get('name'))
print()

for f in data.get('files', []):
    name = f.get('filename', f.get('name', 'unknown'))
    size = f.get('size', 0) / 1024 / 1024
    fid = f.get('id', '')
    print(f"File: {name} ({size:.1f}MB)")
    print(f"  ID: {fid}")
    for key in ['download_url', 'content_details']:
        if key in f:
            print(f"  {key}: {f[key]}")
    
    # Try constructing download URL
    dl = f"https://data.mendeley.com/public-files/datasets/hd96prn3nc/files/{fid}/file_downloaded"
    print(f"  Constructed URL: {dl}")
    
    # Test HEAD request
    try:
        hr = requests.head(dl, timeout=10, allow_redirects=True)
        print(f"  HEAD status: {hr.status_code}, content-length: {hr.headers.get('content-length', 'N/A')}")
    except Exception as e:
        print(f"  HEAD error: {e}")
    print()
