from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from processing.analytics_logic import calculate_admin_tax, calculate_historical_admin_tax, get_budget_breakdown
from ingestion.database import AsyncSessionLocal, LobbyingEntry
from sqlalchemy import select
import logging

app = FastAPI(title="Healthcare Accountability Project API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    # Allow both localhost forms to be safe
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/admin-tax")
async def get_admin_tax(year: int = None):
    return await calculate_admin_tax(year)

@app.get("/api/trends/admin-tax")
async def get_historical_admin_tax():
    return await calculate_historical_admin_tax()

@app.get("/api/trends/budget")
async def get_budget_trends():
    from processing.analytics_logic import get_historical_budget_trends
    return await get_historical_budget_trends()

@app.get("/api/budget/breakdown")
async def get_budget_data(year: int = 2023):
    return await get_budget_breakdown(year)

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
