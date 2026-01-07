import requests
import pandas as pd
import io
import asyncio
from ingestion.database import SalaryEntry, WaitTimeEntry, LobbyingEntry, AsyncSessionLocal, init_db
from datetime import datetime

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# CKAN API Base URLs
ONTARIO_API_BASE = "https://data.ontario.ca/api/3/action"
CANADA_API_BASE = "https://open.canada.ca/data/en/api/3/action"

async def ingest_sunshine_list():
    print("Fetching Sunshine List from data.ontario.ca...")
    # Search for the dataset
    search_url = f"{ONTARIO_API_BASE}/package_search?q=public-sector-salary-disclosure-2023"
    try:
        resp = requests.get(search_url, verify=False).json()
        if resp['success'] and resp['result']['results']:
            dataset = resp['result']['results'][0]
            # Find CSV resource
            csv_resource = next((r for r in dataset['resources'] if r['format'].lower() == 'csv'), None)
            
            if csv_resource:
                csv_url = csv_resource['url']
                print(f"Downloading CSV from: {csv_url}")
                
                # Download with requests (verify=False) then load into Pandas
                r = requests.get(csv_url, verify=False)
                df = pd.read_csv(io.StringIO(r.content.decode('latin1', errors='ignore')))
                
                # Normalize columns
                df.columns = [c.lower().strip() for c in df.columns]
                
                # Map to DB
                entries = []
                for _, row in df.iterrows():
                    try:
                        entry = SalaryEntry(
                            year=2023,
                            sector=row.get('sector', ''),
                            employer=row.get('employer', ''),
                            job_title=row.get('job title', ''),
                            salary_paid=float(str(row.get('salary paid', 0)).replace('$', '').replace(',', '')),
                            taxable_benefits=float(str(row.get('taxable benefits', 0)).replace('$', '').replace(',', '')),
                            role_category=None 
                        )
                        entries.append(entry)
                    except Exception as e:
                        continue
                
                # Bulk save (batching in prod, all at once for MVP demo)
                async with AsyncSessionLocal() as session:
                    async with session.begin():
                        session.add_all(entries)
                print(f"Ingested {len(entries)} Sunshine List records.")
            else:
                print("No CSV resource found for Sunshine List.")
    except Exception as e:
        print(f"Error fetching Sunshine List: {e}")

async def ingest_wait_times():
    print("Fetching Wait Times from data.ontario.ca...")
    # Search for Wait Times
    search_url = f"{ONTARIO_API_BASE}/package_search?q=wait-times"
    try:
        resp = requests.get(search_url, verify=False).json()
        if resp['success'] and resp['result']['results']:
            # Grab first relevant result
            dataset = resp['result']['results'][0]
            csv_resource = next((r for r in dataset['resources'] if r['format'].lower() == 'csv'), None)
            
            if csv_resource:
                csv_url = csv_resource['url']
                print(f"Downloading Wait Time CSV from: {csv_url}")
                
                r = requests.get(csv_url, verify=False)
                df = pd.read_csv(io.StringIO(r.content.decode('latin1', errors='ignore')))
                # Logic depends on specific CSV schema, usually has 'Procedure', 'Hospital', 'Wait Time'
                # Simple mapping for demo
                entries = []
                for _, row in df.head(1000).iterrows(): # Limit for demo
                    entries.append(WaitTimeEntry(
                        date_recorded=datetime.now().date(),
                        procedure_type=str(row.get('Procedure', 'Unknown')),
                        hospital_name=str(row.get('Hospital', 'ON Avg')),
                        median_wait_days=int(float(str(row.get('Wait Time', 0) or 0)))
                    ))
                
                async with AsyncSessionLocal() as session:
                    async with session.begin():
                        session.add_all(entries)
                print(f"Ingested {len(entries)} Wait Time records.")
    except Exception as e:
        print(f"Error fetching Wait Times: {e}")

async def ingest_lobbyist_data():
    print("Fetching Lobbyist Registry data from open.canada.ca...")
    # Direct link to the "Lobbying Registrations" CSV (based on search)
    # URL structure for Open Canada is often stable.
    # Searching for "Lobbying Registrations - Active"
    search_url = f"{CANADA_API_BASE}/package_search?q=lobbying-registrations"
    try:
        resp = requests.get(search_url, verify=False).json()
        if resp['success'] and resp['result']['results']:
            dataset = resp['result']['results'][0]
            csv_resource = next((r for r in dataset['resources'] if r['format'].lower() == 'csv'), None)
            
            if csv_resource:
                csv_url = csv_resource['url']
                print(f"Downloading Lobbyist CSV from: {csv_url}")
                
                import zipfile
                r = requests.get(csv_url, verify=False)
                
                # Handle ZIP
                if csv_url.endswith('.zip'):
                    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
                        # Find the first CSV in the zip
                        csv_name = next((n for n in z.namelist() if n.endswith('.csv')), None)
                        if csv_name:
                            with z.open(csv_name) as f:
                                # Try latin1 if utf-8 fails, typical for older gov systems
                                try:
                                    df = pd.read_csv(f, encoding='utf-8', on_bad_lines='skip')
                                except UnicodeDecodeError:
                                    df = pd.read_csv(f, encoding='latin1', on_bad_lines='skip')
                        else:
                            print("No CSV found in Lobbyist ZIP")
                            return
                else:
                    df = pd.read_csv(io.StringIO(r.content.decode('utf-8', errors='ignore')))
                
                # Columns usually: 'Registration Number', 'Lobbyist Name', 'Client', 'Government Institution', 'Subject Matter'
                
                # Columns usually: 'Registration Number', 'Lobbyist Name', 'Client', 'Government Institution', 'Subject Matter'
                # Mapping (simplified):
                entries = []
                # Limit to recent/active for relevance
                for _, row in df.head(2000).iterrows():
                    try:
                        entry = LobbyingEntry(
                            date=datetime.now().date(), # Registration date often complex, using current for "Active" snapshot
                            lobbyist_name=str(row.get('Lobbyist Name', row.get('nm', 'Unknown'))),
                            client_org=str(row.get('Client Organization', row.get('clnt_org_nm', 'Unknown'))),
                            government_institution=str(row.get('Government Institution', 'Multiple')),
                            subject_matter=str(row.get('Subject Matter', 'Unspecified')),
                            meeting_category='Registration'
                        )
                        entries.append(entry)
                    except Exception:
                        continue
                        
                async with AsyncSessionLocal() as session:
                    async with session.begin():
                        session.add_all(entries)
                print(f"Ingested {len(entries)} Lobbyist records.")
            else:
                print("No CSV resource found for Lobbyist data.")
    except Exception as e:
        print(f"Error fetching Lobbyist data: {e}")

async def run_ingestion():
    await init_db() # Ensure tables exist
    await ingest_sunshine_list()
    await ingest_wait_times()
    await ingest_lobbyist_data()

if __name__ == "__main__":
    asyncio.run(run_ingestion())
