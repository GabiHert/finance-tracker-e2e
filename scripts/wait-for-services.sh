#!/bin/bash
# Finance Tracker E2E - Wait for Services Script
# Waits until all services are healthy before returning

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    source "$E2E_DIR/.env.e2e"
    set +a
fi

TIMEOUT=${1:-120}  # Default 120 seconds timeout
INTERVAL=2

echo "Waiting for E2E services (timeout: ${TIMEOUT}s)..."

wait_for_service() {
    local name=$1
    local check_cmd=$2
    local elapsed=0

    while ! eval "$check_cmd" > /dev/null 2>&1; do
        if [ $elapsed -ge $TIMEOUT ]; then
            echo "Timeout waiting for $name"
            return 1
        fi
        sleep $INTERVAL
        elapsed=$((elapsed + INTERVAL))
    done
    echo "$name is ready"
    return 0
}

# Wait for all services
wait_for_service "PostgreSQL" "docker exec finance-tracker-postgres-e2e pg_isready -U e2e_user" || exit 1
wait_for_service "Redis" "docker exec finance-tracker-redis-e2e redis-cli -a e2e_redis_password ping" || exit 1
wait_for_service "MinIO" "curl -s http://localhost:${MINIO_E2E_API_PORT:-9002}/minio/health/live" || exit 1
wait_for_service "Backend" "curl -s http://localhost:${BACKEND_E2E_PORT:-8081}/health" || exit 1
wait_for_service "Frontend" "curl -s http://localhost:${FRONTEND_E2E_PORT:-3001}" || exit 1

echo "All services are ready!"
