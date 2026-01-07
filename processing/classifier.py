import os
import asyncio
import logging
from sqlalchemy import select, update
from openai import AsyncOpenAI
from ingestion.database import SalaryEntry, AsyncSessionLocal
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI Client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

BATCH_SIZE = 50

async def classify_roles():
    async with AsyncSessionLocal() as session:
        # Fetch unclassified roles
        result = await session.execute(
            select(SalaryEntry).where(SalaryEntry.role_category == None).limit(BATCH_SIZE)
        )
        entries = result.scalars().all()
        
        if not entries:
            logger.info("No unclassified roles found.")
            return

        job_titles = [e.job_title for e in entries]
        ids = [e.id for e in entries]
        
        logger.info(f"Classifying {len(job_titles)} titles...")

        prompt = (
            "Classify the following job titles into one of three categories: "
            "'Clinical' (Direct patient care, e.g., Nurse, Doctor, PSW), "
            "'Support' (Janitorial, IT, Admin Support, Maintenance), "
            "'Bureaucracy' (Management, Policy, Diversity, Communications, Executive). "
            "Return a JSON object where keys are the job titles and values are the categories. "
            f"Job Titles: {json.dumps(job_titles)}"
        )

        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that classifies healthcare job titles."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            classification_map = json.loads(content)
            
            # Use 'keys' from the map if present, else try to match raw titles. 
            # Ideally the LLM returns the exact strings as keys.
            # Handle potential mismatch gracefully.
            
            # In a robust system, we would iterate the map. 
            # Here we expect the map to cover the requested titles.
            results_to_update = []
            
            for entry in entries:
                category = classification_map.get(entry.job_title)
                if category:
                    # Normalize category if necessary
                   entry.role_category = category
                   results_to_update.append(entry)
            
            if results_to_update:
                await session.commit()
                logger.info(f"Updated {len(results_to_update)} entries.")
            else:
                 logger.warning("No entries updated from LLM response.")

        except Exception as e:
            logger.error(f"Error during classification: {e}")

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable not set.")
    else:
        asyncio.run(classify_roles())
