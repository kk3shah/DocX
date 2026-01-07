import requests
import json

def find_2023():
    # Search for just "2023" to get anything from that year
    url = "https://data.ontario.ca/api/3/action/package_search?q=2023&rows=100"
    print(f"Fetching from {url}...")
    
    try:
        resp = requests.get(url, verify=False)
        data = resp.json()
        results = data['result']['results']
        
        for ds in results:
            title = ds['title']
            if "salary disclosure" in title.lower():
                print(f"\n✅ FOUND DATASET: {title}")
                print(f"   ID: {ds['id']}")
                for res in ds['resources']:
                     print(f"   Resource: {res['name']} -> {res['url']}")

    except Exception as e:
        print(e)
        
    print("-" * 30)
    # Search for "2022"
    url = "https://data.ontario.ca/api/3/action/package_search?q=2022&rows=100"
    try:
        resp = requests.get(url, verify=False)
        results = resp.json()['result']['results']
        for ds in results:
            title = ds['title']
            if "salary disclosure" in title.lower():
                print(f"\n✅ FOUND DATASET (2022): {title}")
                for res in ds['resources']:
                     print(f"   Resource: {res['name']} -> {res['url']}")
    except: pass

    print("-" * 30)
    # Search for "2021"
    url = "https://data.ontario.ca/api/3/action/package_search?q=2021&rows=100"
    try:
        resp = requests.get(url, verify=False)
        results = resp.json()['result']['results']
        for ds in results:
            title = ds['title']
            if "salary disclosure" in title.lower():
                print(f"\n✅ FOUND DATASET (2021): {title}")
                for res in ds['resources']:
                     print(f"   Resource: {res['name']} -> {res['url']}")
    except: pass

if __name__ == "__main__":
    find_2023()
