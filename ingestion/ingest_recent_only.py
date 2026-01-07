import asyncio
import requests
import pandas as pd
import io
from sqlalchemy import select, delete
from ingestion.database import AsyncSessionLocal, SunshineEntry, init_db
from processing.classifier import classify_role

async def ingest_recent_only():
    print("🚀 Starting Urgent Ingestion for 2021-2023 ONLY...")
    await init_db()

    FALLBACK_URLS = {
        2021: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2021/tbs-pssd-compendium-salary-disclosed-2021-en-utf-8-2023-01-05.csv",
        2022: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2022/tbs-pssd-compendium-salary-disclosed-2022-en-utf-8-2024-01-19.csv",
        2023: "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2023/tbs-pssd-compendium-salary-disclosed-2023-en-utf-8-2025-03-26.csv"
    }

    for year, url in FALLBACK_URLS.items():
        async with AsyncSessionLocal() as session:
            # Check if exists (SKIP if exists to be fast)
            exists = await session.execute(select(SunshineEntry).filter_by(year=year).limit(1))
            if exists.scalars().first():
                print(f"   ⚠️  Data for {year} already exists in DB. Skipping to save time.")
                continue
                
            print(f"   📥 Downloading {year}...")
            await process_resource_url(session, year, url)

async def process_resource_url(session, year, url):
    try:
        csv_resp = requests.get(url, stream=True, verify=False)
        content = csv_resp.content
        
        df = None
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
    asyncio.run(ingest_recent_only())
