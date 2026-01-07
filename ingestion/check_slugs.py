import requests

def check_variations():
    base = "https://data.ontario.ca/api/3/action/package_show?id="
    years = [2021, 2022, 2023]
    variations = [
        "public-sector-salary-disclosure-{year}", 
        "{year}-public-sector-salary-disclosure",
        "public-sector-salary-disclosure-{year}-1",
        "public-sector-salary-disclosure-{year}-en"
    ]
    
    for year in years:
        for v in variations:
            slug = v.format(year=year)
            url = base + slug
            try:
                r = requests.get(url, verify=False)
                if r.status_code == 200:
                    print(f"✅ FOUND: {slug}")
                    print(r.json()['result']['id'])
                    return
                else:
                    print(f"❌ {slug} -> {r.status_code}")
            except: pass

if __name__ == "__main__":
    check_variations()
