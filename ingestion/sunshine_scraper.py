import asyncio
from playwright.async_api import async_playwright
from ingestion.database import SalaryEntry, AsyncSessionLocal, init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URL = "https://www.ontario.ca/page/public-sector-salary-disclosure-2023-all-sectors-and-seconded-employees"

async def scrape_sunshine_list():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        logger.info(f"Navigating to {URL}")
        await page.goto(URL, timeout=60000)
        
        # NOTE: This is a placeholder selector logic based on standard tabular data.
        # Real scraping requires inspecting the specific DOM of the target year's page.
        # Often these are DataTables or simple HTML tables.
        
        # Wait for table to load
        try:
            await page.wait_for_selector("table", timeout=10000)
        except Exception:
            logger.error("Table not found on page.")
            await browser.close()
            return

        rows = await page.locator("table tbody tr").all()
        logger.info(f"Found {len(rows)} rows of data.")
        
        data_buffer = []
        
        for i, row in enumerate(rows):
            # Limiting for demo purposes if list is huge
            if i > 100: 
                break
                
            cols = await row.locator("td").all_inner_texts()
            # Expected columns: Sector, Employer, Surname, Given Name, Position, Salary, Benefits
            # Adjust index based on actual table structure
            if len(cols) >= 6:
                entry = SalaryEntry(
                    year=2023,
                    sector=cols[0],
                    employer=cols[1],
                    job_title=cols[4],
                    salary_paid=float(cols[5].replace('$', '').replace(',', '')),
                    taxable_benefits=float(cols[6].replace('$', '').replace(',', '')) if len(cols) > 6 else 0.0,
                    role_category=None # To be filled by AI
                )
                data_buffer.append(entry)
        
        await browser.close()
        
        if data_buffer:
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    session.add_all(data_buffer)
                logger.info(f"Saved {len(data_buffer)} entries to database.")
        else:
            logger.warning("No data extracted.")

if __name__ == "__main__":
    # Ensure DB tables exist
    # asyncio.run(init_db()) 
    asyncio.run(scrape_sunshine_list())
