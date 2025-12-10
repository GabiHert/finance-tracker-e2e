# Finance Tracker

A personal finance tracking application with a Go backend, React frontend, and comprehensive testing.

## Project Structure

This is the main repository that orchestrates multiple sub-repositories:

```
finance-tracker/
├── backend/     # Go backend API (finance-tracker-backend)
├── frontend/    # React frontend (finance-tracker-frontend)
├── infra/       # Infrastructure configs (finance-tracker-infra)
├── e2e/         # End-to-end tests (finance-tracker-e2e)
├── context/     # Project documentation and specs
├── tasks/       # Task tracking
└── scripts/     # Utility scripts
```

## Prerequisites

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- Git

## Quick Start

1. **Clone and setup all repositories:**

   ```bash
   git clone git@github.com:GabiHert/finance-tracker.git
   cd finance-tracker
   ./scripts/setup.sh
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure:**

   ```bash
   cd infra
   make up
   ```

4. **Start backend:**

   ```bash
   cd backend
   make run
   ```

5. **Start frontend:**

   ```bash
   cd frontend
   npm run dev
   ```

## Repositories

| Repository | Description |
|------------|-------------|
| [finance-tracker-backend](https://github.com/GabiHert/finance-tracker-backend) | Go API with Clean Architecture |
| [finance-tracker-frontend](https://github.com/GabiHert/finance-tracker-frontend) | React + TypeScript UI |
| [finance-tracker-infra](https://github.com/GabiHert/finance-tracker-infra) | Docker Compose and infrastructure |
| [finance-tracker-e2e](https://github.com/GabiHert/finance-tracker-e2e) | Playwright E2E tests |

## Development

### Running Tests

**Backend integration tests:**
```bash
cd backend
make test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**E2E tests:**
```bash
cd e2e
npm test
```
