# Finance Tracker E2E Tests

End-to-end tests for the Finance Tracker application using Playwright.

## Overview

This E2E test suite validates the complete user journey through the Finance Tracker application, testing the integration between:
- Frontend (React/Vite)
- Backend (Go)
- Database (PostgreSQL)
- Cache (Redis)
- Storage (MinIO)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm

## Setup

1. **Clone and configure:**
   ```bash
   cd e2e
   cp .env.e2e.example .env.e2e
   ```

2. **Update paths in `.env.e2e`:**
   ```bash
   BACKEND_PATH=/path/to/finance-tracker/backend
   FRONTEND_PATH=/path/to/finance-tracker/frontend
   INFRA_PATH=/path/to/finance-tracker/infra
   E2E_PATH=/path/to/finance-tracker/e2e
   ```

3. **Install dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

## Running Tests

### Start E2E Environment

```bash
# Start all services (PostgreSQL, Redis, MinIO, Backend, Frontend)
npm run start

# Or manually
./scripts/start-e2e.sh
```

This will start services on isolated ports:
| Service | Port |
|---------|------|
| PostgreSQL | 5434 |
| Redis | 6380 |
| MinIO API | 9002 |
| MinIO Console | 9003 |
| Backend | 8081 |
| Frontend | 3001 |

### Run Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run specific milestone tests
npm run test:m2  # Authentication tests
npm run test:m3  # Category tests
npm run test:m4  # Transaction tests

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug
```

### Stop E2E Environment

```bash
# Stop services (preserve data)
npm run stop

# Stop and remove all data
npm run stop:clean
```

### Reset Database

```bash
# Clear all test data without restarting containers
npm run reset-db
```

## Test Structure

```
e2e/
├── docker-compose.e2e.yml   # E2E infrastructure config
├── .env.e2e                 # Environment variables
├── playwright.config.ts     # Playwright configuration
├── scripts/                 # Shell scripts
│   ├── start-e2e.sh        # Start E2E environment
│   ├── stop-e2e.sh         # Stop E2E environment
│   ├── reset-db.sh         # Reset database
│   └── wait-for-services.sh
├── tests/
│   ├── fixtures/           # Test utilities and setup
│   │   ├── global-setup.ts
│   │   ├── global-teardown.ts
│   │   └── test-utils.ts
│   ├── m2-auth/            # Milestone 2: Authentication
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── m3-categories/      # Milestone 3: Categories
│   │   └── categories.spec.ts
│   └── m4-transactions/    # Milestone 4: Transactions
│       └── (to be implemented)
└── docker/
    └── Dockerfile.frontend # Frontend Docker config for E2E
```

## Test Naming Convention

Tests follow this naming pattern:
- `M{milestone}-E2E-{number}: Description`
- Example: `M2-E2E-001: Should display login form elements`

## Environment Ports

E2E uses different ports from development to allow both environments to run simultaneously:

| Service | Dev Port | E2E Port |
|---------|----------|----------|
| PostgreSQL | 5432/5433 | 5434 |
| Redis | 6379 | 6380 |
| MinIO API | 9000 | 9002 |
| MinIO Console | 9001 | 9003 |
| Backend | 8080 | 8081 |
| Frontend | 3000 | 3001 |

## Troubleshooting

### Services not starting
```bash
# Check Docker logs
docker logs finance-tracker-backend-e2e
docker logs finance-tracker-frontend-e2e

# Check if ports are in use
lsof -i :5434
lsof -i :8081
lsof -i :3001
```

### Database connection issues
```bash
# Connect to E2E database directly
docker exec -it finance-tracker-postgres-e2e psql -U e2e_user -d finance_tracker_e2e
```

### Reset everything
```bash
npm run stop:clean
npm run start
```

## CI/CD Integration

For CI/CD pipelines, use:

```bash
# Start services
npm run start

# Wait for services
npm run wait

# Run tests
npm test

# Stop services
npm run stop:clean
```

## Related Documentation

- [E2E Testing Guide](../context/Finance-Tracker-E2E-Testing-Guide-v1.md) - Comprehensive test scenarios per milestone
- [Implementation Guide](../context/Finance-Tracker-Implementation-Guide-Complete-v1.md) - Feature requirements
