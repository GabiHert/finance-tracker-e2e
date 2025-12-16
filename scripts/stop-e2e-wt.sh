#!/bin/bash
# Finance Tracker E2E - Worktree-Aware Stop Script
# Stops E2E services for this worktree

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$E2E_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Source worktree configuration
WORKTREE_CONFIG="$REPO_ROOT/scripts/worktree-config.sh"
if [ ! -f "$WORKTREE_CONFIG" ]; then
    echo -e "${RED}Error: worktree-config.sh not found!${NC}"
    exit 1
fi

eval "$($WORKTREE_CONFIG --export)"

echo -e "${YELLOW}Stopping E2E services for worktree: $WORKTREE_NAME${NC}"

# Set up environment
export POSTGRES_E2E_PORT=$E2E_POSTGRES_PORT
export REDIS_E2E_PORT=$E2E_REDIS_PORT
export MINIO_E2E_API_PORT=$E2E_MINIO_API_PORT
export MINIO_E2E_CONSOLE_PORT=$E2E_MINIO_CONSOLE_PORT
export BACKEND_E2E_PORT=$E2E_BACKEND_PORT
export FRONTEND_E2E_PORT=$E2E_FRONTEND_PORT
export COMPOSE_PROJECT_NAME="$E2E_CONTAINER_PREFIX"
export BACKEND_PATH="$REPO_ROOT/backend"
export FRONTEND_PATH="$REPO_ROOT/frontend"
export INFRA_PATH="$REPO_ROOT/infra"
export E2E_PATH="$E2E_DIR"

# Check for --clean flag
if [ "$1" == "--clean" ]; then
    echo "Removing volumes..."
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" -f "$E2E_DIR/docker-compose.e2e.worktree.yml" down -v --remove-orphans
else
    docker-compose -f "$E2E_DIR/docker-compose.e2e.yml" -f "$E2E_DIR/docker-compose.e2e.worktree.yml" down
fi

echo -e "${GREEN}E2E services stopped.${NC}"
