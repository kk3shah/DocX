import asyncio
from sqlalchemy import select, func
from ingestion.database import SalaryEntry, WaitTimeEntry, AsyncSessionLocal

async def calculate_admin_tax():
    async with AsyncSessionLocal() as session:
        # Total Clinical Spend
        result_clinical = await session.execute(
            select(func.sum(SalaryEntry.salary_paid)).where(SalaryEntry.role_category == 'Clinical')
        )
        total_clinical = result_clinical.scalar() or 0.0
        
        # Total Bureaucratic Spend
        result_bureaucratic = await session.execute(
            select(func.sum(SalaryEntry.salary_paid)).where(SalaryEntry.role_category == 'Bureaucracy')
        )
        total_bureaucratic = result_bureaucratic.scalar() or 0.0
        
        # Total Spend (approximation for demo)
        total_spend = total_clinical + total_bureaucratic # + Support
        
        if total_spend == 0:
            return 0.0
            
        admin_tax_percentage = (total_bureaucratic / total_spend) * 100
        return {
            "total_clinical": total_clinical,
            "total_bureaucratic": total_bureaucratic,
            "admin_tax_percentage": admin_tax_percentage
        }

async def calculate_waitlist_impact():
    # Placeholder for logic mapping wait days to mortality rates
    # Linear regression model (simplified for MVP)
    # Ex: each day over 30 days = 0.01% increase in mortality risk
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(WaitTimeEntry))
        wait_times = result.scalars().all()
        
        total_impact = 0
        
        for entry in wait_times:
            if entry.median_wait_days > 30:
                excess_days = entry.median_wait_days - 30
                # Pseudo-scientific formula for demo:
                # 1 life hour lost per 10 days of excess wait * "volume factor" (assumed 100 patients/day)
                lost_hours = (excess_days / 10) * 100 
                total_impact += lost_hours
        
    return {"estimated_life_hours_lost_today": total_impact}


if __name__ == "__main__":
    result = asyncio.run(calculate_admin_tax())
    print(f"Admin Tax Analysis: {result}")
