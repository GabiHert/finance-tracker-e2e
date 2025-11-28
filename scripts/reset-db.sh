#!/bin/bash
# Finance Tracker E2E - Database Reset Script
# Clears all data from the E2E database without restarting containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Resetting E2E Database ===${NC}"
echo ""

# Load environment variables
if [ -f "$E2E_DIR/.env.e2e" ]; then
    set -a
    source "$E2E_DIR/.env.e2e"
    set +a
fi

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "finance-tracker-postgres-e2e"; then
    echo -e "${RED}Error: PostgreSQL container is not running!${NC}"
    echo "Start E2E environment first: ./scripts/start-e2e.sh"
    exit 1
fi

# Drop and recreate all tables
echo "Dropping all tables..."
docker exec finance-tracker-postgres-e2e psql -U e2e_user -d finance_tracker_e2e -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
"

echo "Running migrations..."
# Note: Backend should handle migrations on startup
# If you have a specific migration command, add it here

# Also clear Redis
echo "Clearing Redis cache..."
docker exec finance-tracker-redis-e2e redis-cli -a e2e_redis_password FLUSHALL > /dev/null 2>&1

echo ""
echo -e "${GREEN}=== Database Reset Complete ===${NC}"
echo "Restart the backend to run migrations: docker restart finance-tracker-backend-e2e"
