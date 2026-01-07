import asyncio
import logging
from sqlalchemy import select, func, desc
from ingestion.database import SunshineEntry, AsyncSessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def calculate_admin_tax(year: int = None):
    """
    Args:
        year (Optional[int]): The specific year to analyze. If None, uses the latest available year.
    """
    async with AsyncSessionLocal() as session:
        # Determine target year
        if year is None:
            stmt_latest_year = select(func.max(SunshineEntry.year))
            result_year = await session.execute(stmt_latest_year)
            target_year = result_year.scalar() or 2023
        else:
            target_year = year

        # Health Sector Filters (English and French)
        health_filters = [
            SunshineEntry.sector.ilike('%Hospital%'),
            SunshineEntry.sector.ilike('%Hôpitaux%'),
            SunshineEntry.sector.ilike('%Public Health%'),
            SunshineEntry.sector.ilike('%Santé%'),
            SunshineEntry.sector.ilike('%Seconded%Health%')
        ]
        # Combine with OR logic for sector match
        from sqlalchemy import or_
        sector_condition = or_(*health_filters)

        # Total Clinical Spend
        result_clinical = await session.execute(
            select(func.sum(SunshineEntry.salary))
            .where(SunshineEntry.classification == 'clinical')
            .where(SunshineEntry.year == target_year)
            .where(sector_condition)
        )
        total_clinical = result_clinical.scalar() or 0.0
        
        # Total Bureaucratic Spend
        result_bureaucratic = await session.execute(
            select(func.sum(SunshineEntry.salary))
            .where(or_(SunshineEntry.classification == 'bureaucratic', SunshineEntry.classification == 'unknown'))
            .where(SunshineEntry.year == target_year)
            .where(sector_condition)
        )
        total_bureaucratic = result_bureaucratic.scalar() or 0.0
        
        # Total Analyzed Spend (Health Only)
        total_spend = total_clinical + total_bureaucratic
        
        if total_spend == 0:
            return {
                "year": target_year,
                "admin_tax_percentage": 0, 
                "total_clinical": 0, 
                "total_bureaucratic": 0,
                "total_budget": 0,
                "note": "No data found for this year or sector filter."
            }
            
        admin_tax_percentage = (total_bureaucratic / total_spend) * 100
        
        # Approximate Ontario Health Budget History (Billion $) - Source: FAO/Public Accounts
        BUDGET_HISTORY = {
            2014: 50.8, 2015: 51.9, 2016: 53.0, 2017: 55.2, 
            2018: 59.3, 2019: 63.7, 2020: 71.5, 2021: 76.9, 
            2022: 75.2, 2023: 85.5
        }
        # Approximate Ontario Total Revenue History (Billion $) - Source: FAO/Public Accounts
        REVENUE_HISTORY = {
            2014: 118.0, 2015: 128.0, 2016: 140.7, 2017: 150.6,
            2018: 153.7, 2019: 156.1, 2020: 164.9, 2021: 185.1,
            2022: 192.9, 2023: 204.4
        }
        
        total_budget = BUDGET_HISTORY.get(target_year, 85.5) * 1_000_000_000
        total_revenue = REVENUE_HISTORY.get(target_year, 204.4) * 1_000_000_000
        
        healthcare_portion_percentage = (total_budget / total_revenue)

        return {
            "year": target_year,
            "total_clinical": total_clinical,
            "total_bureaucratic": total_bureaucratic,
            "admin_tax_percentage": admin_tax_percentage,
            "total_budget": total_budget,
            "healthcare_portion_percentage": healthcare_portion_percentage
        }

async def calculate_historical_admin_tax():
    """
    Calculates the Administrative Tax % for each year available in the database (Health Sectors Only).
    """
    logger.info("Calculating historical trends (Health Only)...")
    async with AsyncSessionLocal() as session:
        # Health Sector Filters
        health_filters = [
            SunshineEntry.sector.ilike('%Hospital%'),
            SunshineEntry.sector.ilike('%Hôpitaux%'),
            SunshineEntry.sector.ilike('%Public Health%'),
            SunshineEntry.sector.ilike('%Santé%'),
            SunshineEntry.sector.ilike('%Seconded%Health%')
        ]
        from sqlalchemy import or_
        sector_condition = or_(*health_filters)

        # Group by Year and Classification
        stmt = (
            select(
                SunshineEntry.year,
                SunshineEntry.classification,
                func.sum(SunshineEntry.salary).label("total_salary")
            )
            .where(sector_condition)
            .group_by(SunshineEntry.year, SunshineEntry.classification)
            .order_by(SunshineEntry.year)
        )
        
        result = await session.execute(stmt)

        rows = result.all()
        
        # Process into Dictionary: {year: {clinical: 0, bureaucratic: 0}}
        yearly_data = {}
        
        for row in rows:
            year = row.year
            # Use 'unknown' as bureaucratic if desired, matching current logic or strictly separate?
            # Current logic: classification is strictly clinical or bureaucratic or unknown.
            classification = row.classification
            amount = row.total_salary
            
            if year not in yearly_data:
                yearly_data[year] = {"clinical": 0, "bureaucratic": 0}
                
            if classification == "clinical":
                yearly_data[year]["clinical"] += amount
            elif classification == "bureaucratic" or classification == "unknown":
                yearly_data[year]["bureaucratic"] += amount

        # Format output with growth metrics
        history = []
        baseline_year = None
        baseline_bureaucratic = None
        baseline_clinical = None
        
        for year in sorted(yearly_data.keys()):
            clinical = yearly_data[year]["clinical"]
            bureaucratic = yearly_data[year]["bureaucratic"]
            total = clinical + bureaucratic
            
            if total > 0:
                admin_tax_pct = (bureaucratic / total) * 100
                
                # Calculate growth from baseline (first year)
                if baseline_year is None:
                    baseline_year = year
                    baseline_bureaucratic = bureaucratic
                    baseline_clinical = clinical
                    bureaucratic_growth_pct = 0
                    clinical_growth_pct = 0
                else:
                    bureaucratic_growth_pct = ((bureaucratic - baseline_bureaucratic) / baseline_bureaucratic) * 100 if baseline_bureaucratic > 0 else 0
                    clinical_growth_pct = ((clinical - baseline_clinical) / baseline_clinical) * 100 if baseline_clinical > 0 else 0
                
                history.append({
                    "year": year,
                    "admin_tax_percentage": round(admin_tax_pct, 2),
                    "total_clinical": clinical,
                    "total_bureaucratic": bureaucratic,
                    "bureaucratic_growth_pct": round(bureaucratic_growth_pct, 1),
                    "clinical_growth_pct": round(clinical_growth_pct, 1)
                })
        
        return history

async def get_budget_breakdown(year: int = 2023):
    """
    Retrieves the granular budget breakdown for a specific year.
    """
    from ingestion.database import BudgetBreakdown
    async with AsyncSessionLocal() as session:
        stmt = select(BudgetBreakdown).where(BudgetBreakdown.year == year)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        
        if not rows:
            return None
            
        categories = {}
        total = 0
        for row in rows:
            categories[row.category] = {
                "amount": row.amount_billions,
                "description": row.description
            }
            total += row.amount_billions
            
        return {
            "year": year,
            "total_budget_billions": round(total, 2),
            "categories": categories
        }

async def get_historical_budget_trends():
    """
    Returns the trend of Frontline vs Bureaucratic spending using BudgetBreakdown data.
    """
    from ingestion.database import BudgetBreakdown
    async with AsyncSessionLocal() as session:
        stmt = select(BudgetBreakdown).order_by(BudgetBreakdown.year)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        
        yearly_map = {} # {year: {frontline: 0, total: 0}}
        for r in rows:
            if r.year not in yearly_map:
                yearly_map[r.year] = {"frontline": 0, "total": 0}
            
            yearly_map[r.year]["total"] += r.amount_billions
            if r.category == "Frontline":
                yearly_map[r.year]["frontline"] += r.amount_billions

        history = []
        for year in sorted(yearly_map.keys()):
            data = yearly_map[year]
            history.append({
                "year": year,
                "total_budget": round(data["total"], 2),
                "frontline_care": round(data["frontline"], 2),
                "bureaucratic_expense": round(data["total"] - data["frontline"], 2),
                "ratio": round(((data["total"] - data["frontline"]) / data["total"] * 100), 1) if data["total"] > 0 else 0
            })
            
        return history

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(calculate_historical_admin_tax())
    print(f"Historical Trends: {result}")
