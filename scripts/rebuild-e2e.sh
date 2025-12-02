#!/bin/bash
# Finance Tracker E2E - Rebuild Script
# Stops containers, removes them, rebuilds images with latest code, and starts fresh
# Usage: ./rebuild-e2e.sh [service]
# Examples:
#   ./rebuild-e2e.sh           # Rebuild all services
#   ./rebuild-e2e.sh frontend  # Rebuild only frontend
#   ./rebuild-e2e.sh backend   # Rebuild only backend
#   ./rebuild-e2e.sh all       # Rebuild all services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Container/service name mappings
PREFIX="finance-tracker"
FRONTEND_CONTAINER="${PREFIX}-frontend-e2e"
BACKEND_CONTAINER="${PREFIX}-backend-e2e"

# Load environment variables
if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    source "$E2E_DIR/.env.e2e"
    set +a
fi

show_help() {
    echo -e "${BLUE}Finance Tracker E2E - Rebuild Script${NC}"
    echo ""
    echo "Stops containers, removes images, rebuilds with latest code, and restarts."
    echo "Use this when you've made code changes that need to be applied."
    echo ""
    echo "Usage: $0 [service]"
    echo ""
    echo "Services:"
    echo "  frontend  - Rebuild frontend only (fastest for UI changes)"
    echo "  backend   - Rebuild backend only (for API changes)"
    echo "  all       - Rebuild frontend and backend (default)"
    echo ""
    echo "Options:"
    echo "  -h, --help    Show this help message"
    echo "  -v, --verbose Show detailed build output"
    echo ""
    echo "Examples:"
    echo "  $0                    # Rebuild all services"
    echo "  $0 frontend           # Rebuild only frontend"
    echo "  $0 backend            # Rebuild only backend"
    echo "  $0 frontend -v        # Rebuild frontend with verbose output"
}

wait_for_service() {
    local service=$1
    local max_retries=60
    local retry=0

    case $service in
        "frontend")
            echo -n "  Waiting for Frontend to be ready..."
            until curl -s http://localhost:${FRONTEND_E2E_PORT:-3001} > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
        "backend")
            echo -n "  Waiting for Backend to be ready..."
            until curl -s http://localhost:${BACKEND_E2E_PORT:-8081}/health > /dev/null 2>&1 || [ $retry -eq $max_retries ]; do
                echo -n "."
                sleep 2
                retry=$((retry + 1))
            done
            ;;
    esac

    if [ $retry -eq $max_retries ]; then
        echo -e " ${RED}Timeout!${NC}"
        return 1
    else
        echo -e " ${GREEN}Ready!${NC}"
        return 0
    fi
}

rebuild_frontend() {
    echo -e "${CYAN}=== Rebuilding Frontend ===${NC}"

    # Stop the frontend container
    echo -e "${YELLOW}Stopping frontend container...${NC}"
    docker stop "$FRONTEND_CONTAINER" 2>/dev/null || true

    # Remove the container
    echo -e "${YELLOW}Removing frontend container...${NC}"
    docker rm "$FRONTEND_CONTAINER" 2>/dev/null || true

    # Rebuild the image (no cache to ensure fresh code)
    echo -e "${YELLOW}Rebuilding frontend image with latest code...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        build --no-cache frontend-e2e

    # Start the container
    echo -e "${YELLOW}Starting frontend container...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        up -d frontend-e2e

    # Wait for it to be ready
    wait_for_service "frontend"

    echo -e "${GREEN}Frontend rebuilt successfully!${NC}"
}

rebuild_backend() {
    echo -e "${CYAN}=== Rebuilding Backend ===${NC}"

    # Stop the backend container
    echo -e "${YELLOW}Stopping backend container...${NC}"
    docker stop "$BACKEND_CONTAINER" 2>/dev/null || true

    # Remove the container
    echo -e "${YELLOW}Removing backend container...${NC}"
    docker rm "$BACKEND_CONTAINER" 2>/dev/null || true

    # Rebuild the image (no cache to ensure fresh code)
    echo -e "${YELLOW}Rebuilding backend image with latest code...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        build --no-cache backend-e2e

    # Start the container
    echo -e "${YELLOW}Starting backend container...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        up -d backend-e2e

    # Wait for it to be ready
    wait_for_service "backend"

    echo -e "${GREEN}Backend rebuilt successfully!${NC}"
}

rebuild_all() {
    echo -e "${BLUE}=== Rebuilding All Services with Latest Code ===${NC}"
    echo ""

    # Stop both containers
    echo -e "${YELLOW}Stopping containers...${NC}"
    docker stop "$FRONTEND_CONTAINER" "$BACKEND_CONTAINER" 2>/dev/null || true

    # Remove containers
    echo -e "${YELLOW}Removing containers...${NC}"
    docker rm "$FRONTEND_CONTAINER" "$BACKEND_CONTAINER" 2>/dev/null || true

    # Rebuild both images
    echo -e "${YELLOW}Rebuilding images with latest code (this may take a minute)...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        build --no-cache frontend-e2e backend-e2e

    # Start containers
    echo -e "${YELLOW}Starting containers...${NC}"
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" \
        up -d frontend-e2e backend-e2e

    # Wait for services
    echo ""
    wait_for_service "backend"
    wait_for_service "frontend"

    echo ""
    echo -e "${GREEN}=== All Services Rebuilt Successfully ===${NC}"
}

# Parse arguments
VERBOSE=false
SERVICE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help|help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        frontend|backend|all)
            SERVICE=$1
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}docker-compose is not installed!${NC}"
    exit 1
fi

# Check if E2E environment is running
if ! docker ps --format '{{.Names}}' | grep -q "finance-tracker.*-e2e"; then
    echo -e "${RED}E2E environment is not running!${NC}"
    echo "Start it first with: npm run start"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Finance Tracker E2E - Rebuild        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Execute based on service
case $SERVICE in
    "frontend")
        rebuild_frontend
        ;;
    "backend")
        rebuild_backend
        ;;
    "all")
        rebuild_all
        ;;
esac

echo ""
echo -e "${CYAN}Services status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "e2e|NAME"
echo ""
echo -e "${GREEN}Done! You can now run tests with: npm test${NC}"
