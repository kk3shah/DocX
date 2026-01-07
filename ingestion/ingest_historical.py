import asyncio
import requests
import pandas as pd
import io
from sqlalchemy import select, delete
from ingestion.database import AsyncSessionLocal, SunshineEntry, init_db
from processing.classifier import classify_role

# CKAN API Endpoint for Ontario Data
CKAN_URL = "https://data.ontario.ca/api/3/action/package_search?q=Public+Sector+Salary+Disclosure&rows=50"

async def fetch_and_ingest_historical_data():
    print("🚀 Starting Historical Data Ingestion (2014-2023)...")
    await init_db()

    # 1. Fetch Dataset Metadata from CKAN
    try:
        response = requests.get(CKAN_URL)
        response.raise_for_status()
        data = response.json()
        results = data['result']['results']
    except Exception as e:
        print(f"❌ Failed to fetch from CKAN API: {e}")
        return

    # 2. Process Resources
    async with AsyncSessionLocal() as session:
        for dataset in results:
            for resource in dataset['resources']:
                # Filter for Main Compendium CSVs (English)
                name_lower = resource['name'].lower()
                url_lower = resource['url'].lower()
                
                is_csv = resource['format'].lower() == 'csv'
                is_english = 'en' in name_lower or 'en-' in url_lower
                # 'compendium' usually denotes the full list
                is_compendium = 'compendium' in name_lower or 'all sectors' in name_lower
                is_excluded = 'addendum' in name_lower or 'no salaries' in name_lower or 'no-salaries' in name_lower
                
                if is_csv and is_english and is_compendium and not is_excluded:
                    
                    # Extract Year
                    year = None
                    for y in range(2014, 2024):
                        if str(y) in resource['name'] or str(y) in resource['url']:
                            year = y
                            break
                    
                    if not year:
                        continue 
                    
                    print(f"📥 Found MAIN Dataset for {year}: {resource['name']}")
                    print(f"   URL: {resource['url']}")

                    # Check if year already exists 
                    # For Phase 2, we force re-ingestion to overwrite potential "addendum-only" partial data
                    result = await session.execute(select(SunshineEntry).filter_by(year=year).limit(1))
                    if result.scalars().first():
                       print(f"   ⚠️  Data for {year} already exists. Deleting older records to re-ingest full dataset...")
                       await session.execute(delete(SunshineEntry).where(SunshineEntry.year == year))
                       await session.commit()
                       print(f"      Deleted old records for {year}.")

                    # 3. Stream Download & Process
                    await process_resource_url(session, year, resource['url'])

    # DIRECT FALLBACK FOR RECENT YEARS (API SEARCH IS UNRELIABLE)
    # URLs found via manual web inspection of data.ontario.ca
    FALLBACK_URLS = {
        2021: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2021/tbs-pssd-compendium-salary-disclosed-2021-en-utf-8-2023-01-05.csv",
        2022: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2022/tbs-pssd-compendium-salary-disclosed-2022-en-utf-8-2024-01-19.csv",
        2023: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2023/tbs-pssd-compendium-salary-disclosed-2023-en-utf-8-2025-03-26.csv"
    }

    print("\n🔍 Checking Fallback URLs for 2021-2023...")
    for year, url in FALLBACK_URLS.items():
        async with AsyncSessionLocal() as session:
            # Check if exists
            exists = await session.execute(select(SunshineEntry).filter_by(year=year).limit(1))
            if exists.scalars().first():
                print(f"   ⚠️  Data for {year} already exists. Skipping fallback.")
                continue
                
            print(f"   📥 Ingesting {year} from Fallback URL...")
            await process_resource_url(session, year, url)

async def process_resource_url(session, year, url):
    try:
        csv_resp = requests.get(url, stream=True, verify=False)
        content = csv_resp.content
        
        df = None
        # Try encodings
        for encoding in ['utf-8-sig', 'latin1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                break
            except Exception:
                continue
        
        if df is None:
            print(f"   ❌ Failed to read CSV for {year}")
            return

        # Normalize Columns
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        standard_cols = {
            'sector': ['sector', 'secteur'],
            'employer': ['employer', 'employeur'],
            'job_title': ['job title', 'job_title', 'position', 'poste', 'title'],
            'salary': ['salary', 'paid', 'traitement'],
            'benefits': ['benefits', 'taxable', 'avantages']
        }
        
        rename_map = {}
        for std, patterns in standard_cols.items():
            found = False
            for col in df.columns:
                if col in patterns:
                    rename_map[col] = std
                    found = True
                    break
            if not found:
                for col in df.columns:
                    if any(p in col for p in patterns):
                        rename_map[col] = std
                        found = True
                        break
        
        df = df.rename(columns=rename_map)
        
        required = ['sector', 'employer', 'job_title', 'salary', 'benefits']
        if not all(c in df.columns for c in required):
            print(f"   ❌ Missing columns in {year}. Found: {list(df.columns)}")
            return

        # Cleaning
        def clean_currency(val):
            if pd.isna(val): return 0.0
            val_str = str(val).strip()
            if val_str in ['-', '–', '']: return 0.0
            clean = val_str.replace('$', '').replace(',', '').replace(' ', '')
            try: return float(clean)
            except: return 0.0

        df['salary'] = df['salary'].apply(clean_currency)
        df['benefits'] = df['benefits'].apply(clean_currency)

        print(f"   Processing {len(df)} records for {year}...")

        batch_size = 5000
        entries_buffer = []
        
        for _, row in df.iterrows():
            classification = classify_role(str(row['job_title']))
            entries_buffer.append(SunshineEntry(
                year=year,
                sector=str(row['sector']),
                employer=str(row['employer']),
                job_title=str(row['job_title']),
                salary=row['salary'],
                benefits=row['benefits'],
                classification=classification
            ))
            
            if len(entries_buffer) >= batch_size:
                session.add_all(entries_buffer)
                await session.commit()
                entries_buffer = []
        
        if entries_buffer:
            session.add_all(entries_buffer)
            await session.commit()
            
        print(f"   ✅ Successfully ingested {year} data.")

    except Exception as e:
        print(f"   ❌ Error processing {year}: {e}")

if __name__ == "__main__":
    asyncio.run(fetch_and_ingest_historical_data())
