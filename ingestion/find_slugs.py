import requests
import json

def find_slugs():
    url = "https://data.ontario.ca/api/3/action/package_search?q=disclosure&rows=200"
    try:
        resp = requests.get(url, verify=False)
        results = resp.json()['result']['results']
        for ds in results:
            print(ds['name'])
    except Exception as e:
        print(e)

if __name__ == "__main__":
    find_slugs()
