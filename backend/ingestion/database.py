from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Float, ForeignKey

# Database Configuration
DATABASE_URL = "sqlite+aiosqlite:///./healthcare.db"

Base = declarative_base()

class SunshineEntry(Base):
    __tablename__ = "sunshine_list"
    
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True, default=2023)  # Added for historical analysis
    sector = Column(String, index=True)
    employer = Column(String, index=True)
    job_title = Column(String)
    salary = Column(Float)
    benefits = Column(Float)
    classification = Column(String, index=True) # 'clinical', 'bureaucratic', 'unknown'

class LobbyingEntry(Base):
    __tablename__ = "lobbying_registry"
    
    id = Column(Integer, primary_key=True, index=True)
    lobbyist_name = Column(String, index=True)
    client_org = Column(String, index=True)
    government_institution = Column(String, index=True)
    subject_matter = Column(String)
    date = Column(String)

class WorkforceDemographics(Base):
    __tablename__ = "workforce_demographics"
    
    id = Column(Integer, primary_key=True, index=True)
    profession = Column(String, index=True) # e.g. "Registered Nurse", "Physician"
    year = Column(Integer, index=True)
    average_age = Column(Float)
    percent_over_55 = Column(Float)
    source = Column(String)

class BudgetBreakdown(Base):
    __tablename__ = "budget_breakdown"
    
    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, index=True)
    category = Column(String, index=True) # e.g. "Hospitals", "OHIP", "Opaque/Other"
    amount_billions = Column(Float)
    description = Column(String)

# Database Setup
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
