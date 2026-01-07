from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from processing.analytics_logic import calculate_admin_tax, calculate_waitlist_impact
from ingestion.database import AsyncSessionLocal, LobbyingEntry
from sqlalchemy import select
import logging

app = FastAPI(title="Healthcare Accountability Project API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/admin-tax")
async def get_admin_tax():
    return await calculate_admin_tax()

@app.get("/api/waitlist-impact")
async def get_waitlist_impact():
    return await calculate_waitlist_impact()

@app.get("/api/lobbying-network")
async def get_lobbying_network():
    # Return raw data for frontend graph construction
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(LobbyingEntry).limit(100))
        entries = result.scalars().all()
        return [
            {
                "lobbyist": e.lobbyist_name,
                "client": e.client_org,
                "target": e.government_institution,
                "subject": e.subject_matter
            }
            for e in entries
        ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
