#!/bin/bash

# Finance Tracker Setup Script
# This script clones all required repositories and installs dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Finance Tracker Setup ===${NC}"
echo ""

cd "$PROJECT_ROOT"

# Repository URLs
BACKEND_REPO="git@github.com:GabiHert/finance-tracker-backend.git"
FRONTEND_REPO="git@github.com:GabiHert/finance-tracker-frontend.git"
INFRA_REPO="git@github.com:GabiHert/finance-tracker-infra.git"
E2E_REPO="git@github.com:GabiHert/finance-tracker-e2e.git"

# Function to clone or update a repository
clone_or_update() {
    local repo_url=$1
    local target_dir=$2
    local repo_name=$(basename "$target_dir")

    if [ -d "$target_dir/.git" ]; then
        echo -e "${YELLOW}[$repo_name]${NC} Repository already exists, pulling latest changes..."
        cd "$target_dir"
        git pull --rebase || echo -e "${YELLOW}Warning: Could not pull latest changes for $repo_name${NC}"
        cd "$PROJECT_ROOT"
    else
        echo -e "${GREEN}[$repo_name]${NC} Cloning repository..."
        rm -rf "$target_dir" 2>/dev/null || true
        git clone "$repo_url" "$target_dir"
    fi
}

# Clone all repositories
echo -e "${GREEN}Step 1: Cloning repositories${NC}"
echo "-----------------------------------"

clone_or_update "$BACKEND_REPO" "$PROJECT_ROOT/backend"
clone_or_update "$FRONTEND_REPO" "$PROJECT_ROOT/frontend"
clone_or_update "$INFRA_REPO" "$PROJECT_ROOT/infra"
clone_or_update "$E2E_REPO" "$PROJECT_ROOT/e2e"

echo ""
echo -e "${GREEN}Step 2: Installing dependencies${NC}"
echo "-----------------------------------"

# Install backend dependencies (Go)
if [ -d "$PROJECT_ROOT/backend" ]; then
    echo -e "${YELLOW}[backend]${NC} Installing Go dependencies..."
    cd "$PROJECT_ROOT/backend"
    if command -v go &> /dev/null; then
        go mod download
        echo -e "${GREEN}[backend]${NC} Go dependencies installed"
    else
        echo -e "${RED}[backend]${NC} Go not found. Please install Go and run 'go mod download' in the backend directory"
    fi
    cd "$PROJECT_ROOT"
fi

# Install frontend dependencies (Node.js)
if [ -d "$PROJECT_ROOT/frontend" ]; then
    echo -e "${YELLOW}[frontend]${NC} Installing Node.js dependencies..."
    cd "$PROJECT_ROOT/frontend"
    if command -v npm &> /dev/null; then
        npm install
        echo -e "${GREEN}[frontend]${NC} Node.js dependencies installed"
    else
        echo -e "${RED}[frontend]${NC} npm not found. Please install Node.js and run 'npm install' in the frontend directory"
    fi
    cd "$PROJECT_ROOT"
fi

# Install e2e dependencies (Node.js)
if [ -d "$PROJECT_ROOT/e2e" ]; then
    echo -e "${YELLOW}[e2e]${NC} Installing E2E test dependencies..."
    cd "$PROJECT_ROOT/e2e"
    if command -v npm &> /dev/null; then
        npm install
        echo -e "${GREEN}[e2e]${NC} E2E dependencies installed"
    else
        echo -e "${RED}[e2e]${NC} npm not found. Please install Node.js and run 'npm install' in the e2e directory"
    fi
    cd "$PROJECT_ROOT"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and configure your environment variables"
echo "  2. Start the infrastructure: cd infra && make up"
echo "  3. Start the backend: cd backend && make run"
echo "  4. Start the frontend: cd frontend && npm run dev"
echo ""
