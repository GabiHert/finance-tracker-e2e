#!/bin/bash
# Finance Tracker E2E - Start Script
# Starts all E2E services and waits for them to be healthy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Finance Tracker E2E Environment ===${NC}"
echo ""

# Check if .env.e2e exists
if [ ! -f "$E2E_DIR/.env.e2e" ]; then
    echo -e "${RED}Error: .env.e2e not found!${NC}"
    echo "Please copy .env.e2e.example to .env.e2e and update the paths."
    exit 1
fi

# Load environment variables
set -a
source "$E2E_DIR/.env.e2e"
set +a

echo -e "${YELLOW}Starting E2E infrastructure...${NC}"
docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" up -d

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
until docker exec finance-tracker-postgres-e2e pg_isready -U e2e_user -d finance_tracker_e2e > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Redis
echo -n "Waiting for Redis..."
until docker exec finance-tracker-redis-e2e redis-cli -a e2e_redis_password ping > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for MinIO
echo -n "Waiting for MinIO..."
until curl -s http://localhost:${MINIO_E2E_API_PORT:-9002}/minio/health/live > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Backend
echo -n "Waiting for Backend..."
MAX_RETRIES=60
RETRY=0
until curl -s http://localhost:${BACKEND_E2E_PORT:-8081}/health > /dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
    echo -n "."
    sleep 2
    RETRY=$((RETRY + 1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e " ${YELLOW}Backend not responding (may still be building)${NC}"
else
    echo -e " ${GREEN}Ready!${NC}"
fi

# Wait for Frontend
echo -n "Waiting for Frontend..."
RETRY=0
until curl -s http://localhost:${FRONTEND_E2E_PORT:-3001} > /dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
    echo -n "."
    sleep 2
    RETRY=$((RETRY + 1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e " ${YELLOW}Frontend not responding (may still be building)${NC}"
else
    echo -e " ${GREEN}Ready!${NC}"
fi

echo ""
echo -e "${GREEN}=== E2E Environment Ready ===${NC}"
echo ""
echo "Services:"
echo "  PostgreSQL: localhost:${POSTGRES_E2E_PORT:-5434}"
echo "  Redis:      localhost:${REDIS_E2E_PORT:-6380}"
echo "  MinIO API:  localhost:${MINIO_E2E_API_PORT:-9002}"
echo "  MinIO UI:   localhost:${MINIO_E2E_CONSOLE_PORT:-9003}"
echo "  Backend:    localhost:${BACKEND_E2E_PORT:-8081}"
echo "  Frontend:   localhost:${FRONTEND_E2E_PORT:-3001}"
echo ""
echo "Run tests with: npm test"
echo "Stop with: ./scripts/stop-e2e.sh"
