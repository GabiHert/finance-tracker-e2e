#!/bin/bash
# Finance Tracker - Worktree Configuration Script
# Auto-detects worktree and assigns unique port offsets and resource names
#
# Usage: source scripts/worktree-config.sh
#        Or: eval "$(./scripts/worktree-config.sh --export)"
#
# Options:
#   --info    Show configuration summary (default)
#   --export  Print variables for eval
#   --check   Check for port conflicts
#   --help    Show help message

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the script's directory to find the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get the repository root (parent of scripts directory)
get_repo_root() {
    # The script is in PROJECT_ROOT/scripts/, so go up one level
    dirname "$SCRIPT_DIR"
}

# Detect worktree name from path
# Returns "main" for the main worktree, or the worktree directory name
detect_worktree_name() {
    local repo_root
    repo_root=$(get_repo_root)

    # Check if we're in a git worktree by examining the .git file/directory
    local git_path="$repo_root/.git"

    if [ -f "$git_path" ]; then
        # .git is a file, which means this might be a worktree
        # Read the gitdir path from the file
        local gitdir
        gitdir=$(cat "$git_path" | sed 's/gitdir: //')

        if [[ "$gitdir" == *"/worktrees/"* ]]; then
            # Extract worktree name from path
            echo "$gitdir" | sed 's/.*\/worktrees\///' | sed 's/\/.*//'
            return
        fi
    fi

    # Main worktree - use the repository root directory name
    basename "$repo_root"
}

# Generate a consistent offset from worktree name (0-9 range, multiplied by 100)
# Uses a simple hash to map names to offsets
generate_offset() {
    local name="$1"

    # Special cases for common names
    case "$name" in
        "main"|"master"|"finance-tracker")
            echo 0
            return
            ;;
    esac

    # Generate a hash-based offset (1-9) for other worktrees
    local hash
    hash=$(echo -n "$name" | md5sum | cut -c1-2)
    local num=$((16#$hash % 9 + 1))
    echo $((num * 100))
}

# Check if a port is in use
# Returns 0 if port is free, 1 if in use
check_port() {
    local port="$1"
    if nc -z localhost "$port" 2>/dev/null; then
        return 1  # Port is in use
    else
        return 0  # Port is free
    fi
}

# Get process using a port (for diagnostics)
get_port_process() {
    local port="$1"
    lsof -i ":$port" -sTCP:LISTEN 2>/dev/null | tail -n +2 | head -1 | awk '{print $1 " (PID: " $2 ")"}'
}

# Main configuration
REPO_ROOT=$(get_repo_root)
WORKTREE_NAME=$(detect_worktree_name)

# Check for manual offset override in .worktree-offset file
OFFSET_FILE="$REPO_ROOT/.worktree-offset"
if [ -f "$OFFSET_FILE" ]; then
    WORKTREE_OFFSET=$(cat "$OFFSET_FILE" | tr -d '[:space:]')
    OFFSET_SOURCE="file"
    # Validate it's a number
    if ! [[ "$WORKTREE_OFFSET" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Error: Invalid offset in .worktree-offset (must be a number)${NC}" >&2
        exit 1
    fi
# Check for environment variable override
elif [ -n "$WORKTREE_OFFSET" ]; then
    OFFSET_SOURCE="env"
else
    WORKTREE_OFFSET=$(generate_offset "$WORKTREE_NAME")
    OFFSET_SOURCE="auto"
fi

# Resource naming suffix (empty for main, "-{name}" for worktrees)
if [ "$WORKTREE_OFFSET" -eq 0 ]; then
    WORKTREE_SUFFIX=""
else
    WORKTREE_SUFFIX="-${WORKTREE_NAME}"
fi

# ============================================================================
# INFRA (Development) Port Configuration
# ============================================================================
export INFRA_POSTGRES_PORT=$((5433 + WORKTREE_OFFSET))
export INFRA_REDIS_PORT=$((6380 + WORKTREE_OFFSET))
export INFRA_MINIO_API_PORT=$((9002 + WORKTREE_OFFSET))
export INFRA_MINIO_CONSOLE_PORT=$((9003 + WORKTREE_OFFSET))
export INFRA_BACKEND_PORT=$((8080 + WORKTREE_OFFSET))
export INFRA_FRONTEND_PORT=$((3100 + WORKTREE_OFFSET))

# Infra resource names
export INFRA_CONTAINER_PREFIX="finance-tracker${WORKTREE_SUFFIX}"
export INFRA_NETWORK_NAME="finance-tracker-network${WORKTREE_SUFFIX}"
export INFRA_VOLUME_PREFIX="finance-tracker${WORKTREE_SUFFIX}"

# ============================================================================
# E2E Port Configuration (offset by additional 1000 from infra)
# ============================================================================
export E2E_POSTGRES_PORT=$((5434 + WORKTREE_OFFSET))
export E2E_REDIS_PORT=$((6381 + WORKTREE_OFFSET))
export E2E_MINIO_API_PORT=$((9102 + WORKTREE_OFFSET))
export E2E_MINIO_CONSOLE_PORT=$((9103 + WORKTREE_OFFSET))
export E2E_BACKEND_PORT=$((9081 + WORKTREE_OFFSET))
export E2E_FRONTEND_PORT=$((4001 + WORKTREE_OFFSET))

# E2E resource names
export E2E_CONTAINER_PREFIX="finance-tracker-e2e${WORKTREE_SUFFIX}"
export E2E_NETWORK_NAME="finance-tracker-e2e-network${WORKTREE_SUFFIX}"
export E2E_VOLUME_PREFIX="finance-tracker-e2e${WORKTREE_SUFFIX}"

# ============================================================================
# Path Configuration
# ============================================================================
export WORKTREE_ROOT="$REPO_ROOT"
export BACKEND_PATH="$REPO_ROOT/backend"
export FRONTEND_PATH="$REPO_ROOT/frontend"
export INFRA_PATH="$REPO_ROOT/infra"
export E2E_PATH="$REPO_ROOT/e2e"

# ============================================================================
# Export mode - prints all variables for eval
# ============================================================================
if [ "$1" == "--export" ]; then
    cat <<EOF
export WORKTREE_NAME="$WORKTREE_NAME"
export WORKTREE_OFFSET=$WORKTREE_OFFSET
export WORKTREE_SUFFIX="$WORKTREE_SUFFIX"
export WORKTREE_ROOT="$WORKTREE_ROOT"

# Infra ports
export INFRA_POSTGRES_PORT=$INFRA_POSTGRES_PORT
export INFRA_REDIS_PORT=$INFRA_REDIS_PORT
export INFRA_MINIO_API_PORT=$INFRA_MINIO_API_PORT
export INFRA_MINIO_CONSOLE_PORT=$INFRA_MINIO_CONSOLE_PORT
export INFRA_BACKEND_PORT=$INFRA_BACKEND_PORT
export INFRA_FRONTEND_PORT=$INFRA_FRONTEND_PORT

# Infra resources
export INFRA_CONTAINER_PREFIX="$INFRA_CONTAINER_PREFIX"
export INFRA_NETWORK_NAME="$INFRA_NETWORK_NAME"
export INFRA_VOLUME_PREFIX="$INFRA_VOLUME_PREFIX"

# E2E ports
export E2E_POSTGRES_PORT=$E2E_POSTGRES_PORT
export E2E_REDIS_PORT=$E2E_REDIS_PORT
export E2E_MINIO_API_PORT=$E2E_MINIO_API_PORT
export E2E_MINIO_CONSOLE_PORT=$E2E_MINIO_CONSOLE_PORT
export E2E_BACKEND_PORT=$E2E_BACKEND_PORT
export E2E_FRONTEND_PORT=$E2E_FRONTEND_PORT

# E2E resources
export E2E_CONTAINER_PREFIX="$E2E_CONTAINER_PREFIX"
export E2E_NETWORK_NAME="$E2E_NETWORK_NAME"
export E2E_VOLUME_PREFIX="$E2E_VOLUME_PREFIX"

# Paths
export BACKEND_PATH="$BACKEND_PATH"
export FRONTEND_PATH="$FRONTEND_PATH"
export INFRA_PATH="$INFRA_PATH"
export E2E_PATH="$E2E_PATH"
EOF
    exit 0
fi

# ============================================================================
# Help mode
# ============================================================================
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Finance Tracker - Worktree Configuration"
    echo ""
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --info     Show configuration summary (default)"
    echo "  --export   Print variables for eval in shell"
    echo "  --check    Check for port conflicts before starting"
    echo "  --help     Show this help message"
    echo ""
    echo "Override offset:"
    echo "  1. Create .worktree-offset file with a number (e.g., echo 400 > .worktree-offset)"
    echo "  2. Set WORKTREE_OFFSET env var (e.g., WORKTREE_OFFSET=400 make wt-dev)"
    echo ""
    exit 0
fi

# ============================================================================
# Check mode - detect port conflicts
# ============================================================================
if [ "$1" == "--check" ]; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          Finance Tracker - Port Conflict Check                 ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ Worktree: $WORKTREE_NAME (offset: $WORKTREE_OFFSET, source: $OFFSET_SOURCE)"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    CONFLICTS=0

    check_and_report() {
        local name="$1"
        local port="$2"

        if check_port "$port"; then
            echo -e "  ${GREEN}✓${NC} $name (port $port) - available"
        else
            local proc=$(get_port_process "$port")
            echo -e "  ${RED}✗${NC} $name (port $port) - ${RED}IN USE${NC} by $proc"
            CONFLICTS=$((CONFLICTS + 1))
        fi
    }

    echo "INFRA (Development) Ports:"
    check_and_report "PostgreSQL" "$INFRA_POSTGRES_PORT"
    check_and_report "Redis" "$INFRA_REDIS_PORT"
    check_and_report "MinIO API" "$INFRA_MINIO_API_PORT"
    check_and_report "MinIO Console" "$INFRA_MINIO_CONSOLE_PORT"
    check_and_report "Backend" "$INFRA_BACKEND_PORT"
    check_and_report "Frontend" "$INFRA_FRONTEND_PORT"

    echo ""
    echo "E2E Ports:"
    check_and_report "PostgreSQL" "$E2E_POSTGRES_PORT"
    check_and_report "Redis" "$E2E_REDIS_PORT"
    check_and_report "MinIO API" "$E2E_MINIO_API_PORT"
    check_and_report "MinIO Console" "$E2E_MINIO_CONSOLE_PORT"
    check_and_report "Backend" "$E2E_BACKEND_PORT"
    check_and_report "Frontend" "$E2E_FRONTEND_PORT"

    echo ""
    if [ $CONFLICTS -gt 0 ]; then
        echo -e "${RED}Found $CONFLICTS port conflict(s)!${NC}"
        echo ""
        echo "To resolve:"
        echo "  1. Stop the conflicting service(s)"
        echo "  2. Or set a different offset: echo 500 > .worktree-offset"
        echo "  3. Or use env override: WORKTREE_OFFSET=500 make wt-dev"
        exit 1
    else
        echo -e "${GREEN}All ports are available!${NC}"
        exit 0
    fi
fi

# ============================================================================
# Info mode - prints configuration summary (default)
# ============================================================================
if [ "$1" == "--info" ] || [ "$1" == "" ]; then
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          Finance Tracker - Worktree Configuration              ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ Worktree: $WORKTREE_NAME"
    echo "║ Offset:   $WORKTREE_OFFSET ($OFFSET_SOURCE)"
    echo "║ Root:     $REPO_ROOT"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ INFRA (Development) Services:                                  ║"
    echo "║   PostgreSQL : localhost:$INFRA_POSTGRES_PORT"
    echo "║   Redis      : localhost:$INFRA_REDIS_PORT"
    echo "║   MinIO API  : localhost:$INFRA_MINIO_API_PORT"
    echo "║   MinIO UI   : localhost:$INFRA_MINIO_CONSOLE_PORT"
    echo "║   Backend    : localhost:$INFRA_BACKEND_PORT"
    echo "║   Frontend   : localhost:$INFRA_FRONTEND_PORT"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ E2E Services:                                                  ║"
    echo "║   PostgreSQL : localhost:$E2E_POSTGRES_PORT"
    echo "║   Redis      : localhost:$E2E_REDIS_PORT"
    echo "║   MinIO API  : localhost:$E2E_MINIO_API_PORT"
    echo "║   MinIO UI   : localhost:$E2E_MINIO_CONSOLE_PORT"
    echo "║   Backend    : localhost:$E2E_BACKEND_PORT"
    echo "║   Frontend   : localhost:$E2E_FRONTEND_PORT"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Run './scripts/worktree-config.sh --check' to verify ports are available"
fi
