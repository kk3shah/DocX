import asyncio
import logging
from sqlalchemy import select
from ingestion.database import SunshineEntry, AsyncSessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Heuristic Keyword Maps (Phase 2 - User Preferred)
CLINICAL_KEYWORDS = [
    "nurse", "doctor", "physician", "surgeon", "rn", "rpn", "psw", "paramedic", 
    "therapist", "psychologist", "pharmacist", "radiologist", "technologist", 
    "clinical", "patient", "care", "practitioner", "midwife"
]

BUREAUCRATIC_KEYWORDS = [
    "director", "manager", "executive", "president", "vp", "chief", "officer",
    "supervisor", "coordinator", "consultant", "analyst", "strategy", "policy",
    "communications", "advisor", "lead", "head of", "chair", "board",
    "worker", "assistant"  # User requested: treat these as bureaucratic
]

def classify_role(job_title: str) -> str:
    """
    Classifies a job title as 'clinical', 'bureaucratic', or 'unknown'
    based on keyword matching.
    User-preferred logic: Check Bureaucracy FIRST, with worker/assistant as bureaucratic.
    """
    if not job_title:
        return "unknown"
        
    title_lower = job_title.lower()

    # Check bureaucratic FIRST (user preference)
    if any(keyword in title_lower for keyword in BUREAUCRATIC_KEYWORDS):
        return "bureaucratic"

    # Then check clinical
    if any(keyword in title_lower for keyword in CLINICAL_KEYWORDS):
        return "clinical"

    return "unknown"

async def process_classifications():
    """
    Scans the database for 'unknown' entries and classifies them.
    (Used for batch processing after ingestion)
    """
    logger.info("Starting Classification Agent...")
    
    async with AsyncSessionLocal() as session:
        # Fetch unclassified entries
        batch_size = 1000
        result = await session.execute(
            select(SunshineEntry).where(SunshineEntry.classification == "unknown").limit(batch_size)
        )
        batch = result.scalars().all()
        
        if not batch:
            logger.info("No unclassified entries found.")
            return 0

        logger.info(f"Processing batch of {len(batch)} entries...")
        
        count_updated = 0
        for entry in batch:
            new_class = classify_role(entry.job_title)
            if new_class != "unknown":
                entry.classification = new_class
                count_updated += 1
        
        await session.commit()
        await session.commit()
        logger.info(f"Classified {count_updated} entries in this batch.")
        return len(batch)

if __name__ == "__main__":
    # Allow running this script directly to process backlog
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    while True:
        # Run in loops until no more to process
        # For simplicity in this script, just run once or a few times
        processed = loop.run_until_complete(process_classifications())
        if processed == 0:
            break
