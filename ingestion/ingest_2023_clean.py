import asyncio
import requests
import pandas as pd
import io
from sqlalchemy import select, delete
from ingestion.database import AsyncSessionLocal, SunshineEntry, init_db
from processing.classifier import classify_role

async def ingest_2023_clean():
    print("🚀 Clean Ingestion of 2023 Data ONLY...")
    await init_db()

    url = "https://www.ontario.ca/public-sector-salary-disclosure/pssd-assets/files/2023/tbs-pssd-compendium-salary-disclosed-2023-en-utf-8-2025-03-26.csv"
    year = 2023
    
    async with AsyncSessionLocal() as session:
        # Delete existing 2023 data
        print(f"   Deleting existing {year} data...")
        await session.execute(delete(SunshineEntry).where(SunshineEntry.year == year))
        await session.commit()
        
        print(f"   📥 Downloading {year} from official source...")
        csv_resp = requests.get(url, stream=True, verify=False)
        content = csv_resp.content
        
        df = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin1', 'cp1252']:
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                print(f"   ✅ Successfully read CSV with {encoding} encoding")
                break
            except Exception as e:
                print(f"   ⚠️  Failed with {encoding}: {e}")
                continue
        
        if df is None:
            print(f"   ❌ Failed to read CSV for {year}")
            return

        # Normalize Columns
        df.columns = [str(c).lower().strip() for c in df.columns]
        print(f"   Columns found: {list(df.columns)}")
        
        # Map columns
        standard_cols = {
            'sector': ['sector', 'secteur'],
            'employer': ['employer', 'employeur'],
            'job_title': ['job title', 'job_title', 'position', 'poste', 'title'],
            'salary': ['salary', 'salary paid', 'paid', 'traitement'],
            'benefits': ['benefits', 'taxable benefits', 'taxable', 'avantages']
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
        print(f"   Renamed columns: {rename_map}")
        
        required = ['sector', 'employer', 'job_title', 'salary', 'benefits']
        if not all(c in df.columns for c in required):
            print(f"   ❌ Missing columns. Found: {list(df.columns)}")
            return

        # Clean currency
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
                print(f"   ✅ Committed batch of {len(entries_buffer)}")
                entries_buffer = []
        
        if entries_buffer:
            session.add_all(entries_buffer)
            await session.commit()
            print(f"   ✅ Committed final batch of {len(entries_buffer)}")
            
        print(f"   ✅ Successfully ingested {year} data ({len(df)} total records).")

if __name__ == "__main__":
    asyncio.run(ingest_2023_clean())
