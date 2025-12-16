#!/bin/bash
# Finance Tracker E2E - Worktree-Aware Start Script
# Starts E2E services with worktree isolation for multi-worktree support

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$E2E_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Finance Tracker E2E - Worktree-Aware Environment          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Source worktree configuration
WORKTREE_CONFIG="$REPO_ROOT/scripts/worktree-config.sh"
if [ ! -f "$WORKTREE_CONFIG" ]; then
    echo -e "${RED}Error: worktree-config.sh not found!${NC}"
    echo "Expected at: $WORKTREE_CONFIG"
    exit 1
fi

# Load worktree configuration
eval "$($WORKTREE_CONFIG --export)"

echo -e "${YELLOW}Worktree Configuration:${NC}"
echo "  Name:   $WORKTREE_NAME"
echo "  Offset: $WORKTREE_OFFSET"
echo ""

# Set up E2E-specific environment variables
export POSTGRES_E2E_PORT=$E2E_POSTGRES_PORT
export REDIS_E2E_PORT=$E2E_REDIS_PORT
export MINIO_E2E_API_PORT=$E2E_MINIO_API_PORT
export MINIO_E2E_CONSOLE_PORT=$E2E_MINIO_CONSOLE_PORT
export BACKEND_E2E_PORT=$E2E_BACKEND_PORT
export FRONTEND_E2E_PORT=$E2E_FRONTEND_PORT

# Container naming
export COMPOSE_PROJECT_NAME="$E2E_CONTAINER_PREFIX"

# Paths
export BACKEND_PATH="$REPO_ROOT/backend"
export FRONTEND_PATH="$REPO_ROOT/frontend"
export INFRA_PATH="$REPO_ROOT/infra"
export E2E_PATH="$E2E_DIR"

# Playwright URLs
export PLAYWRIGHT_BASE_URL="http://localhost:$E2E_FRONTEND_PORT"
export PLAYWRIGHT_API_URL="http://localhost:$E2E_BACKEND_PORT/api/v1"

echo -e "${YELLOW}E2E Service Ports:${NC}"
echo "  PostgreSQL : localhost:$POSTGRES_E2E_PORT"
echo "  Redis      : localhost:$REDIS_E2E_PORT"
echo "  MinIO API  : localhost:$MINIO_E2E_API_PORT"
echo "  MinIO UI   : localhost:$MINIO_E2E_CONSOLE_PORT"
echo "  Backend    : localhost:$BACKEND_E2E_PORT"
echo "  Frontend   : localhost:$FRONTEND_E2E_PORT"
echo ""

echo -e "${YELLOW}Starting E2E infrastructure...${NC}"
# Use worktree overlay to remove hardcoded container names
docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" -f "$E2E_DIR/docker-compose.e2e.worktree.yml" up -d

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

# Container naming: {project}-{service}-1
PG_CONTAINER="${COMPOSE_PROJECT_NAME}-postgres-e2e-1"
REDIS_CONTAINER="${COMPOSE_PROJECT_NAME}-redis-e2e-1"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
MAX_WAIT=60
WAITED=0
until docker exec "$PG_CONTAINER" pg_isready -U e2e_user -d finance_tracker_e2e > /dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e " ${YELLOW}Timeout${NC}"
else
    echo -e " ${GREEN}Ready!${NC}"
fi

# Wait for Redis
echo -n "Waiting for Redis..."
WAITED=0
until docker exec "$REDIS_CONTAINER" redis-cli -a e2e_redis_password ping > /dev/null 2>&1 || [ $WAITED -ge $MAX_WAIT ]; do
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done
if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e " ${YELLOW}Timeout${NC}"
else
    echo -e " ${GREEN}Ready!${NC}"
fi

# Wait for MinIO
echo -n "Waiting for MinIO..."
until curl -s http://localhost:${MINIO_E2E_API_PORT}/minio/health/live > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}Ready!${NC}"

# Wait for Backend
echo -n "Waiting for Backend..."
MAX_RETRIES=60
RETRY=0
until curl -s http://localhost:${BACKEND_E2E_PORT}/health > /dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
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
until curl -s http://localhost:${FRONTEND_E2E_PORT} > /dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
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
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              E2E Environment Ready                             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Playwright Config:"
echo "  Base URL: $PLAYWRIGHT_BASE_URL"
echo "  API URL:  $PLAYWRIGHT_API_URL"
echo ""
echo "Run tests with: npm test"
echo "Stop with: ./scripts/stop-e2e-wt.sh"
