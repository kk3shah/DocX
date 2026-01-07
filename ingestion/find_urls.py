import requests
import json

def find_correct_urls():
    # Fetch a large number of datasets
    url = "https://data.ontario.ca/api/3/action/package_search?q=compendium&rows=200"
    print(f"Fetching from {url}...")
    
    try:
        resp = requests.get(url, verify=False)
        data = resp.json()
        results = data['result']['results']
        
        found_years = {}
        
        for ds in results:
            title = ds['title']
            # excessive printing to debug
            # print(f"Checking dataset: {title}")
            
            for target_year in [2021, 2022, 2023]:
                if str(target_year) in title:
                    print(f"✅ MATCH FOUND for {target_year}: {title}")
                    # Find the CSV resource
                    for res in ds['resources']:
                        if 'compendium' in res['name'].lower() and res['format'].lower() == 'csv':
                            print(f"   Resource: {res['name']}")
                            print(f"   URL: {res['url']}")
                            found_years[target_year] = res['url']
                            
        print("\n--- RESULTS ---")
        print(json.dumps(found_years, indent=2))
        
    except Exception as e:
        print(e)

if __name__ == "__main__":
    find_correct_urls()
