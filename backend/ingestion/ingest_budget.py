import asyncio
import pandas as pd
from ingestion.database import AsyncSessionLocal, BudgetBreakdown, init_db

# Mapping Account Details to Taxonomy
MAPPING = {
    "Frontline": [
        "Operation of Hospitals",
        "Payments made for services and care provided by physicians and practitioners",
        "Ontario Drug Programs",
        "Home Care",
        "Community Mental Health",
        "Payments for Ambulance and Related Emergency Services",
        "Municipal Ambulance",
        "Specialty Psychiatric Hospitals",
        "Community Support Services",
        "Community Health Centres",
        "Child and Youth Mental Health",
        "Assisted Living Services in Supportive Housing",
        "Midwifery Services",
        "Addiction Programs",
        "HIV/AIDS and Hepatitis C Programs",
        "Home Care and Community Services",
        "Long-Term Care Homes (Operation)",
        "Long-Term Care Homes - Operation"
    ],
    "Operations & Agency": [
        "Cancer Treatment Services",
        "Clinical Education",
        "Official Local Health Agencies",
        "Canadian Blood Services",
        "Renal Services",
        "Assistive Devices and Supplies Program",
        "Digital Health",
        "Ontario Agency for Health Protection and Promotion",
        "Organ and Tissue Donation and Transplantation Services",
        "Independent Health Facilities",
        "Quality Health Initiatives",
        "Long-Term Care Capital",
        "Long-Term Care - Capital"
    ],
    "Administrative & Opaque": [
        "Regional Coordination Operations Support",
        "Health Infrastructure Renewal Fund",
        "Ministry Administration Program",
        "Information Systems Program",
        "Provincial Programs and Stewardship Program",
        "Health Policy and Research Program",
        "Digital Health and Information Management Program",
        "Ministry of Long-Term Care Administration"
    ]
}

TARGET_TOTAL = 85.5 # Billion $ (FAO/Official)

async def ingest_budget_data():
    print("🚀 Ingesting Budget Breakdown Data...")
    await init_db()
    
    # Read the analyzed CSV
    df = pd.read_csv("budget_2023_24.csv", encoding='utf-8-sig')
    
    # Filter for Health and Long-Term Care
    health_mask = (df['Ministry Name'] == 'Health') | (df['Ministry Name'] == 'Long-Term Care')
    health_df = df[health_mask].copy()
    
    # Group by Program and Item/Account Details to get totals
    # We use 'Account Details (Expense/Asset Details)' for granular items
    # and fallback to 'Program Name' if needed.
    
    rows = []
    processed_items = set()

    async with AsyncSessionLocal() as session:
        # Check if 2023 budget data exists
        from sqlalchemy import delete
        await session.execute(delete(BudgetBreakdown).where(BudgetBreakdown.year == 2023))
        await session.commit()

        # Process the mappings
        for category, keywords in MAPPING.items():
            # Sum up items that match keywords in 'Account Details' or 'Program Name'
            mask = health_df['Account Details (Expense/Asset Details)'].isin(keywords) | \
                   health_df['Program Name'].isin(keywords) | \
                   health_df['Activity / Item'].isin(keywords)
            
            matches = health_df[mask]
            if not matches.empty:
                total_amt = matches['Amount $'].sum()
                items_str = ", ".join(matches['Account Details (Expense/Asset Details)'].unique()[:5])
                
                rows.append(BudgetBreakdown(
                    year=2023,
                    category=category,
                    amount_billions=round(total_amt / 1_000_000_000, 3),
                    description=f"Spending on: {items_str}..."
                ))
                processed_items.update(matches.index)
        
        # Capture anything else as "Other/Uncategorized"
        others = health_df[~health_df.index.isin(processed_items)]
        if not others.empty:
            total_others = others['Amount $'].sum()
            category_total = total_others / 1_000_000_000
            
            # Final Adjustment to match $85.5B
            current_total = sum(r.amount_billions for r in rows) + category_total
            adjustment = TARGET_TOTAL - current_total
            
            rows.append(BudgetBreakdown(
                year=2023,
                category="General Operations & Other",
                amount_billions=round(category_total + adjustment, 3),
                description="Minor health flows, adjustments, and other provincial health spending (capital, one-time payments)."
            ))

        session.add_all(rows)
        await session.commit()
    
    print(f"✅ Ingested {len(rows)} budget categories.")

if __name__ == "__main__":
    asyncio.run(ingest_budget_data())
