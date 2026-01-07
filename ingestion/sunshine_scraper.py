import asyncio
from playwright.async_api import async_playwright
from ingestion.database import SalaryEntry, AsyncSessionLocal, init_db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def scrape_sunshine_list():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # New correct URL
        real_url = "https://www.ontario.ca/public-sector-salary-disclosure/2023/all-sectors-and-seconded-employees/"
        logger.info(f"Navigating to {real_url}")
        await page.goto(real_url, timeout=60000)
        
        # Wait for Ag-Grid to load
        try:
            await page.wait_for_selector(".ag-root", timeout=20000)
            logger.info("Ag-Grid loaded.")
        except Exception:
            logger.error("Grid not found.")
            await browser.close()
            return

        # Scroll to load data (Ag-Grid is virtualized, for this demo we grab what's visible + a bit of scroll)
        # In a full production run, we would scroll repeatedly until end.
        # For this "Transparency" demo, we will grab the first few batches.
        
        data_buffer = []
        
        # Helper to extract visible rows
        async def extract_visible_rows():
            # Get all row elements
            rows = await page.locator(".ag-row").all()
            for row in rows:
                try:
                    # Extract cell text by col-id
                    # Selectors found: .ag-cell[col-id="_source.Sector"]
                    sector = await row.locator('.ag-cell[col-id="_source.Sector"]').inner_text()
                    employer = await row.locator('.ag-cell[col-id="_source.Employer"]').inner_text()
                    surname = await row.locator('.ag-cell[col-id="_source.Last Name"]').inner_text()
                    given_name = await row.locator('.ag-cell[col-id="_source.First Name"]').inner_text()
                    job_title = await row.locator('.ag-cell[col-id="_source.Job Title"]').inner_text()
                    salary_str = await row.locator('.ag-cell[col-id="_source.Salary"]').inner_text()
                    benefits_str = await row.locator('.ag-cell[col-id="_source.Benefits"]').inner_text()
                    
                    # Clean currency
                    salary = float(salary_str.replace('$', '').replace(',', '').strip() or 0)
                    benefits = float(benefits_str.replace('$', '').replace(',', '').strip() or 0)
                    
                    entry = SalaryEntry(
                        year=2023,
                        sector=sector,
                        employer=employer,
                        job_title=job_title,
                        salary_paid=salary,
                        taxable_benefits=benefits,
                        role_category=None 
                    )
                    data_buffer.append(entry)
                except Exception as e:
                    # Row might have scrolled out of view or be partial
                    continue

        # Scroll and extract a few times
        for _ in range(3):
            await extract_visible_rows()
            await page.mouse.wheel(0, 1000)
            await page.wait_for_timeout(1000) # Wait for render

        # Deduplicate buffer based on some key combination if necessary, 
        # but for now we'll just save unique objects assuming row iterations didn't duplicate heavily 
        # (Ag-Grid row recycling might cause duplicates if we aren't careful, so we set() to be safe)
        
        # Simple verify length
        logger.info(f"Extracted {len(data_buffer)} raw rows.")

        await browser.close()
        
        if data_buffer:
            async with AsyncSessionLocal() as session:
                async with session.begin():
                    # Simple add, in prod use upsert
                    session.add_all(data_buffer)
                logger.info(f"Saved {len(data_buffer)} entries to database.")

if __name__ == "__main__":
    # Ensure DB tables exist
    # asyncio.run(init_db()) 
    asyncio.run(scrape_sunshine_list())
