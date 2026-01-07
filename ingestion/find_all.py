import requests
import json

def find_all_disclosures():
    url = "https://data.ontario.ca/api/3/action/package_search?fq=organization:treasury-board-secretariat&rows=1000"
    print("Fetching all salary related datasets...")
    try:
        resp = requests.get(url, verify=False)
        results = resp.json()['result']['results']
        
        found = []
        for ds in results:
            if "public sector salary disclosure" in ds['title'].lower():
                found.append(ds)
                
        # Sort by title to see years
        found.sort(key=lambda x: x['title'])
        
        for ds in found:
            print(f"✅ {ds['title']} (ID: {ds['name']})")
            for res in ds['resources']:
                if res['format'].lower() == 'csv' and 'compendium' in res['name'].lower():
                    print(f"   CSV: {res['url']}")
            
    except Exception as e:
        print(e)

if __name__ == "__main__":
    find_all_disclosures()
