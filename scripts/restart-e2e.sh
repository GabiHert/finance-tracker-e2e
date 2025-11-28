#!/bin/bash
# Finance Tracker E2E - Restart Script
# Restarts E2E services (all or specific containers)
# Usage: ./restart-e2e.sh [service]
# Examples:
#   ./restart-e2e.sh           # Restart all services
#   ./restart-e2e.sh frontend  # Restart only frontend
#   ./restart-e2e.sh backend   # Restart only backend
#   ./restart-e2e.sh db        # Restart only database (postgres)
#   ./restart-e2e.sh redis     # Restart only redis
#   ./restart-e2e.sh minio     # Restart only minio

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Container name prefix
PREFIX="finance-tracker"

# Service mappings
declare -A CONTAINERS
CONTAINERS["frontend"]="${PREFIX}-frontend-e2e"
CONTAINERS["backend"]="${PREFIX}-backend-e2e"
CONTAINERS["db"]="${PREFIX}-postgres-e2e"
CONTAINERS["postgres"]="${PREFIX}-postgres-e2e"
CONTAINERS["redis"]="${PREFIX}-redis-e2e"
CONTAINERS["minio"]="${PREFIX}-minio-e2e"

# Load environment variables
if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    source "$E2E_DIR/.env.e2e"
    set +a
fi

show_help() {
    echo -e "${BLUE}Finance Tracker E2E - Restart Script${NC}"
    echo ""
    echo "Usage: $0 [service]"
    echo ""
    echo "Services:"
    echo "  frontend  - Restart frontend container"
    echo "  backend   - Restart backend container"
    echo "  db        - Restart PostgreSQL container"
    echo "  redis     - Restart Redis container"
    echo "  minio     - Restart MinIO container"
    echo "  all       - Restart all containers (default)"
    echo ""
    echo "Examples:"
    echo "  $0              # Restart all services"
    echo "  $0 frontend     # Restart only frontend"
    echo "  $0 backend      # Restart only backend"
}

wait_for_service() {
    local service=$1
    local max_retries=30
    local retry=0

    case $service in
        "frontend")
            echo -n "Waiting for Frontend..."
            until curl -s http://localhost:${FRONTEND_E2E_PORT:-3001} > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
        "backend")
            echo -n "Waiting for Backend..."
            until curl -s http://localhost:${BACKEND_E2E_PORT:-8081}/health > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
        "db"|"postgres")
            echo -n "Waiting for PostgreSQL..."
            until docker exec ${PREFIX}-postgres-e2e pg_isready -U e2e_user -d finance_tracker_e2e > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
        "redis")
            echo -n "Waiting for Redis..."
            until docker exec ${PREFIX}-redis-e2e redis-cli -a e2e_redis_password ping > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
        "minio")
            echo -n "Waiting for MinIO..."
            until curl -s http://localhost:${MINIO_E2E_API_PORT:-9002}/minio/health/live > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
    esac

    if [ $retry -eq $max_retries ]; then
        echo -e " ${YELLOW}Timeout (may still be starting)${NC}"
        return 1
    else
        echo -e " ${GREEN}Ready!${NC}"
        return 0
    fi
}

restart_service() {
    local service=$1
    local container=${CONTAINERS[$service]}

    if [ -z "$container" ]; then
        echo -e "${RED}Unknown service: $service${NC}"
        show_help
        exit 1
    fi

    echo -e "${YELLOW}Restarting $service ($container)...${NC}"

    if docker ps -q -f name="$container" | grep -q .; then
        docker restart "$container"
        wait_for_service "$service"
    else
        echo -e "${RED}Container $container is not running!${NC}"
        echo "Starting environment with: ./scripts/start-e2e.sh"
        exit 1
    fi
}

restart_all() {
    echo -e "${YELLOW}=== Restarting All E2E Services ===${NC}"
    echo ""

    # Restart in dependency order
    for service in postgres redis minio backend frontend; do
        restart_service "$service"
    done

    echo ""
    echo -e "${GREEN}=== All Services Restarted ===${NC}"
}

# Main
case "${1:-all}" in
    "-h"|"--help"|"help")
        show_help
        ;;
    "all")
        restart_all
        ;;
    *)
        restart_service "$1"
        ;;
esac

echo ""
echo "Services status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "e2e|NAME"
