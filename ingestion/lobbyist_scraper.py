import asyncio
from playwright.async_api import async_playwright
from datetime import datetime
from ingestion.database import LobbyingEntry, AsyncSessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URL = "https://lobbycanada.gc.ca/app/secure/ocl/lrs/do/advSrch"

async def scrape_lobbyist_registry():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        logger.info(f"Navigating to {URL}")
        await page.goto(URL)
        
        # Logic to fill form for "Health" and "Finance" would go here
        # await page.fill("#searchInput", "Health")
        # await page.click("#searchButton")
        
        # Mock extraction
        data_buffer = []
        mock_results = [
            {
                "date": datetime(2025, 5, 20).date(),
                "lobbyist": "John Doe",
                "client": "PharmaCorp",
                "gov_inst": "Health Canada",
                "subject": "Health",
                "category": "Meeting"
            },
           {
                "date": datetime(2025, 5, 22).date(),
                "lobbyist": "Jane Smith",
                "client": "Private Clinics Assoc.",
                "gov_inst": "Ministry of Finance",
                "subject": "Finance",
                "category": "Meeting"
            }
        ]
        
        for item in mock_results:
             entry = LobbyingEntry(
                date=item["date"],
                lobbyist_name=item["lobbyist"],
                client_org=item["client"],
                government_institution=item["gov_inst"],
                subject_matter=item["subject"],
                meeting_category=item["category"]
            )
             data_buffer.append(entry)

        await browser.close()
        
        if data_buffer:
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    session.add_all(data_buffer)
                logger.info(f"Saved {len(data_buffer)} lobbying entries.")

if __name__ == "__main__":
    asyncio.run(scrape_lobbyist_registry())
