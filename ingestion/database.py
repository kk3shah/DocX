import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Text
import asyncio

# Database URL from environment variable or default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./healthcare.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

class SalaryEntry(Base):
    __tablename__ = "salaries"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    sector = Column(String, nullable=False)
    employer = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    salary_paid = Column(Float, nullable=False)
    taxable_benefits = Column(Float)
    role_category = Column(String, nullable=True) # To be filled by AI: Clinical, Support, Bureaucracy

class WaitTimeEntry(Base):
    __tablename__ = "wait_times"

    id = Column(Integer, primary_key=True, index=True)
    date_recorded = Column(Date, nullable=False)
    procedure_type = Column(String, nullable=False) # e.g., MRI, CT, Hip Replacement
    hospital_name = Column(String, nullable=True)
    median_wait_days = Column(Integer, nullable=False)
    province = Column(String, default="Ontario")

class LobbyingEntry(Base):
    __tablename__ = "lobbying"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    lobbyist_name = Column(String, nullable=False)
    client_org = Column(String, nullable=False)
    government_institution = Column(String, nullable=False)
    subject_matter = Column(String, nullable=False)
    meeting_category = Column(String, nullable=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
