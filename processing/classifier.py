import asyncio
import logging
from sqlalchemy import select
from ingestion.database import SalaryEntry, AsyncSessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BATCH_SIZE = 100

# Keyword mappings for transparent classification
KEYWORDS = {
    "Clinical": [
        "nurse", "doctor", "physician", "surgeon", "rn", "rpn", "psw", "paramedic", 
        "therapist", "psychologist", "pharmacist", "radiologist", "technologist", 
        "clinical", "patient", "care", "practitioner", "midwife"
    ],
    "Support": [
        "janitor", "custodian", "maintenance", "it", "technician", "support", 
        "clerk", "secretary", "admin assistant", "service", "driver", "porter",
        "cleaner", "cook", "dietary", "laundry"
    ],
    "Bureaucracy": [
        "director", "manager", "executive", "president", "vp", "chief", "officer",
        "supervisor", "coordinator", "consultant", "analyst", "strategy", "policy",
        "communications", "advisor", "lead", "head of", "chair", "board"
    ]
}

def classify_title(title: str) -> str:
    title_lower = title.lower()
    
    # Priority check: Clinical > Bureaucracy > Support > Default
    # We check Clinical first to ensure "Clinical Manager" might arguably still capture clinical context,
    # though "Manager" is strong bureaucracy. 
    # Let's refine: "Clinical Manager" is often Bureaucracy in this project's context ("Admin Tax").
    
    # Check Bureaucracy first to capture Management roles even if they have clinical backgrounds (e.g. Chief Nursing Officer)
    # This aligns with the "Administrative Tax" goal.
    for keyword in KEYWORDS["Bureaucracy"]:
        if keyword in title_lower:
            return "Bureaucracy"
            
    for keyword in KEYWORDS["Clinical"]:
        if keyword in title_lower:
            return "Clinical"
            
    for keyword in KEYWORDS["Support"]:
        if keyword in title_lower:
            return "Support"
            
    return "Unclassified"

async def classify_roles_keywords():
    while True:
        async with AsyncSessionLocal() as session:
            # Fetch unclassified roles in larger batches
            result = await session.execute(
                select(SalaryEntry).where(SalaryEntry.role_category == None).limit(5000)
            )
            entries = result.scalars().all()
            
            if not entries:
                logger.info("No more unclassified roles found. Classification complete.")
                break

            logger.info(f"Classifying next {len(entries)} titles...")
            
            updates = 0
            for entry in entries:
                category = classify_title(entry.job_title)
                if category:
                    entry.role_category = category
                    updates += 1
            
            if updates:
                await session.commit()
                logger.info(f"Updated {updates} entries.")
            else:
                 logger.info("No updates made in this batch.")

if __name__ == "__main__":
    asyncio.run(classify_roles_keywords())
