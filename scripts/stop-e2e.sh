#!/bin/bash
# Finance Tracker E2E - Stop Script
# Stops all E2E services and optionally removes volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Stopping E2E Environment ===${NC}"
echo ""

# Check for -v flag to remove volumes
REMOVE_VOLUMES=""
if [ "$1" == "-v" ] || [ "$1" == "--volumes" ]; then
    REMOVE_VOLUMES="-v"
    echo -e "${YELLOW}Will also remove volumes${NC}"
fi

# Load environment variables if available
if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    source "$E2E_DIR/.env.e2e"
    set +a
fi

# Stop containers
docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" --env-file "$E2E_DIR/.env.e2e" down $REMOVE_VOLUMES 2>/dev/null || true

echo ""
echo -e "${GREEN}=== E2E Environment Stopped ===${NC}"

if [ -n "$REMOVE_VOLUMES" ]; then
    echo "Volumes have been removed. Data has been cleared."
else
    echo "Volumes preserved. Run with -v to remove data."
fi
