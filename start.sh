#!/bin/bash

# MYNVOICE - Start all services
# Usage: ./start.sh

set -e

echo "========================================="
echo "  MYNVOICE - Starting all services"
echo "========================================="
echo ""

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Start PostgreSQL
echo -e "${YELLOW}[1/4] Starting PostgreSQL...${NC}"
docker-compose up db -d 2>/dev/null
echo -e "${GREEN}  ✓ PostgreSQL running on port 5432${NC}"

# Wait for DB to be ready
echo -e "${YELLOW}[2/4] Waiting for database...${NC}"
until docker exec mynvoice-db pg_isready -U mynvoice > /dev/null 2>&1; do
  sleep 1
done
echo -e "${GREEN}  ✓ Database ready${NC}"

# 2. Backend setup & start
echo -e "${YELLOW}[3/4] Starting backend...${NC}"
cd backend

if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null

pip install -q -r requirements.txt

# Run migrations if needed
if [ ! -d "alembic/versions" ] || [ -z "$(ls -A alembic/versions 2>/dev/null)" ]; then
  alembic revision --autogenerate -m "initial" 2>/dev/null
fi
alembic upgrade head 2>/dev/null

# Start backend in background
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}  ✓ Backend running on http://localhost:8000${NC}"

# 3. Frontend setup & start
echo -e "${YELLOW}[4/4] Starting frontend...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
  npm install --silent
fi

npx next dev --port 3000 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}  ✓ Frontend running on http://localhost:3000${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}  MYNVOICE is running!${NC}"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "========================================="

# Handle shutdown
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  docker-compose stop db 2>/dev/null
  echo "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait
