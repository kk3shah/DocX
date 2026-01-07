import requests
import json

def find_tbs_datasets():
    url = "https://data.ontario.ca/api/3/action/organization_show?id=treasury-board-secretariat&include_datasets=True"
    print(f"Fetching TBS datasets from {url}...")
    try:
        resp = requests.get(url, verify=False)
        data = resp.json()
        packages = data['result']['packages']
        
        found = []
        for p in packages:
            print(f"📦 {p['title']} (ID: {p['name']})")
                
    except Exception as e:
        print(e)

if __name__ == "__main__":
    find_tbs_datasets()
