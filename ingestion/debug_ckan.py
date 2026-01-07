import requests
import json

CKAN_URL = "https://data.ontario.ca/api/3/action/package_search?q=Public+Sector+Salary+Disclosure&rows=100&sort=metadata_created+desc"

def list_resources():
    resp = requests.get(CKAN_URL)
    data = resp.json()
    
    print(f"Found {data['result']['count']} datasets.")
    
    for ds in data['result']['results']:
        print(f"\n📦 Dataset: {ds['title']}")
        for res in ds['resources']:
            print(f"   - {res['name']} ({res['format']}) - {res['url']}")

if __name__ == "__main__":
    list_resources()
