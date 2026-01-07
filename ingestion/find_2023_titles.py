import requests
import json

def find_titles():
    url = "https://data.ontario.ca/api/3/action/package_search?q=2023&rows=100"
    try:
        resp = requests.get(url, verify=False)
        results = resp.json()['result']['results']
        for ds in results:
            print(ds['title'])
            if 'salary' in ds['title'].lower():
                print(f"!!! FOUND SALARY: {ds['name']} !!!")
                for res in ds['resources']:
                    print(f"   Resource: {res['name']} -> {res['url']}")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    find_titles()
