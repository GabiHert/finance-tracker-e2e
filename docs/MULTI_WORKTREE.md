# Multi-Worktree Development Guide

This guide explains how to run multiple git worktrees simultaneously without port or resource conflicts.

## Overview

The finance-tracker project supports running multiple worktrees at the same time. Each worktree automatically gets unique:

- **Ports** - Different port ranges for each service
- **Container names** - Isolated Docker containers
- **Volumes** - Separate data volumes
- **Networks** - Isolated Docker networks

## How It Works

The system uses a **worktree detection script** (`scripts/worktree-config.sh`) that:

1. Detects which worktree you're in based on the git directory structure
2. Generates a consistent port offset (0-900 in steps of 100) from the worktree name
3. Sets environment variables for all services

### Port Allocation

| Worktree    | Offset | Postgres | Redis | MinIO API | Backend | Frontend |
|-------------|--------|----------|-------|-----------|---------|----------|
| main        | 0      | 5433     | 6380  | 9002      | 8080    | 3100     |
| worktree-1  | 100    | 5533     | 6480  | 9102      | 8180    | 3200     |
| worktree-2  | 200    | 5633     | 6580  | 9202      | 8280    | 3300     |

E2E services use a different base port range to avoid conflicts with development services.

## Quick Start

### Check Your Configuration

```bash
# From any worktree, see your port assignments
./scripts/worktree-config.sh --info
```

### Infra (Development)

Use the `wt-*` (worktree) commands in the infra Makefile:

```bash
cd infra

# See your worktree configuration
make wt-info

# Start core services (postgres, redis, minio)
make wt-up

# Start full dev environment
make wt-dev

# Start all services including backend and frontend
make wt-dev-all

# View logs
make wt-logs

# Check service status
make wt-ps

# Check health
make wt-health

# Stop services
make wt-down

# Clean up (removes volumes)
make wt-clean
```

### E2E Tests

Use the worktree-aware E2E scripts:

```bash
cd e2e

# Start E2E environment
./scripts/start-e2e-wt.sh

# Run tests
npm test

# Stop E2E environment
./scripts/stop-e2e-wt.sh

# Stop and clean volumes
./scripts/stop-e2e-wt.sh --clean
```

## Example: Two Worktrees

```bash
# Terminal 1: Main worktree
cd ~/projects/finance-tracker
cd infra && make wt-dev
# Frontend at http://localhost:3100

# Terminal 2: Feature worktree
cd ~/projects/finance-tracker-feature-x
cd infra && make wt-dev
# Frontend at http://localhost:3200 (or similar based on worktree name)
```

## Configuration Details

### Environment Variables

The `scripts/worktree-config.sh` script exports these variables:

**Infra (Dev) Services:**
- `INFRA_POSTGRES_PORT` - PostgreSQL port
- `INFRA_REDIS_PORT` - Redis port
- `INFRA_MINIO_API_PORT` - MinIO API port
- `INFRA_MINIO_CONSOLE_PORT` - MinIO console port
- `INFRA_BACKEND_PORT` - Backend API port
- `INFRA_FRONTEND_PORT` - Frontend port

**E2E Services:**
- `E2E_POSTGRES_PORT` - E2E PostgreSQL port
- `E2E_REDIS_PORT` - E2E Redis port
- `E2E_MINIO_API_PORT` - E2E MinIO API port
- `E2E_MINIO_CONSOLE_PORT` - E2E MinIO console port
- `E2E_BACKEND_PORT` - E2E Backend port
- `E2E_FRONTEND_PORT` - E2E Frontend port

**Resource Names:**
- `INFRA_CONTAINER_PREFIX` - Container name prefix
- `INFRA_NETWORK_NAME` - Docker network name
- `E2E_CONTAINER_PREFIX` - E2E container name prefix
- `E2E_NETWORK_NAME` - E2E Docker network name

### Using in Scripts

```bash
# Source the configuration
source ./scripts/worktree-config.sh

# Or export for subprocesses
eval "$(./scripts/worktree-config.sh --export)"

# Now use the variables
echo "Backend is at http://localhost:$INFRA_BACKEND_PORT"
```

## Backward Compatibility

The original commands still work for single-worktree development:

```bash
# These work as before (no worktree isolation)
cd infra
make up
make dev
make down

cd e2e
./scripts/start-e2e.sh
./scripts/stop-e2e.sh
```

Use the `wt-*` commands only when you need to run multiple worktrees simultaneously.

## Handling Port Conflicts

### Check for Conflicts Before Starting

```bash
# Check if any ports are already in use
./scripts/worktree-config.sh --check

# Or via make
cd infra && make wt-check
```

This shows which ports are available and which are in use (with the process name).

### Override the Port Offset

If another project is using your ports, you can override the offset:

**Option 1: Create a `.worktree-offset` file (persistent)**
```bash
# Set offset to 500 (persists across sessions)
echo 500 > .worktree-offset

# Verify
./scripts/worktree-config.sh --info
# Shows: Offset: 500 (file)
```

**Option 2: Environment variable (temporary)**
```bash
# One-time override
WORKTREE_OFFSET=500 make wt-dev
```

The offset file is gitignored, so each developer can have their own.

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

1. Run `./scripts/worktree-config.sh --check` to see what's conflicting
2. Stop the conflicting service, OR
3. Set a different offset: `echo 500 > .worktree-offset`

### Container Name Conflicts

If you get container name conflicts:

1. Use the `wt-*` commands which include `COMPOSE_PROJECT_NAME`
2. Stop all containers: `docker-compose down` in each worktree
3. Clean up: `make wt-clean`

### Checking Running Services

```bash
# List all finance-tracker containers
docker ps --filter "name=finance-tracker"

# List containers for this worktree
cd infra && make wt-ps
```
