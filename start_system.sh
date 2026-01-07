#!/bin/bash

# 1. Wait for Ingestion (Simple check if DB exists, if not wait)
echo "Checking database..."
while [ ! -f ./healthcare.db ]; do
  sleep 2
  echo "Waiting for database file..."
done

# 2. Run Classification (Fast, keyword based)
echo "Running Keyword Classification..."
export DATABASE_URL="sqlite+aiosqlite:///./healthcare.db"
export PYTHONPATH=$PWD
python processing/classifier.py

# 3. Start Backend (Background)
echo "Starting Backend API..."
uvicorn analytics.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 4. Start Frontend
echo "Starting Frontend..."
export PATH=$PWD/.node_local/bin:$PATH
cd frontend
npm run dev
