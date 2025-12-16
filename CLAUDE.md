# Finance Tracker - Project Guidelines

## Multi-Worktree Development

This project supports running multiple git worktrees simultaneously without port conflicts. When working with worktrees, follow these guidelines.

### Creating a New Worktree

```bash
# Create worktree
git worktree add ../finance-tracker-feature-x feature-x

# Navigate to worktree
cd ../finance-tracker-feature-x

# Check your port configuration
./scripts/worktree-config.sh --info

# Check for port conflicts before starting services
./scripts/worktree-config.sh --check
```

### Running Services in a Worktree

**Always use `wt-*` commands** when running multiple worktrees:

```bash
# Infra (Development)
cd infra
make wt-check      # Check for port conflicts first
make wt-info       # See your assigned ports
make wt-up         # Start core services (postgres, redis, minio)
make wt-dev        # Start dev environment
make wt-dev-all    # Start all services with backend and frontend
make wt-down       # Stop services
make wt-clean      # Stop and remove volumes

# E2E Tests
cd e2e
./scripts/start-e2e-wt.sh    # Start E2E environment
npm test                      # Run tests
./scripts/stop-e2e-wt.sh     # Stop E2E
./scripts/stop-e2e-wt.sh --clean  # Stop and clean volumes
```

### Port Offset System

Each worktree gets unique ports based on its name:

| Worktree | Offset | Postgres | Redis | Backend | Frontend |
|----------|--------|----------|-------|---------|----------|
| main / finance-tracker | 0 | 5433 | 6380 | 8080 | 3100 |
| Other worktrees | 100-900 | +offset | +offset | +offset | +offset |

### Handling Port Conflicts

If ports conflict with another project:

1. **Check conflicts**: `./scripts/worktree-config.sh --check`
2. **Override offset permanently**: `echo 500 > .worktree-offset`
3. **Override offset temporarily**: `WORKTREE_OFFSET=500 make wt-dev`

The `.worktree-offset` file is gitignored.

### Key Files

| File | Purpose |
|------|---------|
| `scripts/worktree-config.sh` | Worktree detection and port configuration |
| `infra/Makefile` | `wt-*` commands for infra services |
| `e2e/scripts/start-e2e-wt.sh` | Worktree-aware E2E start |
| `e2e/scripts/stop-e2e-wt.sh` | Worktree-aware E2E stop |
| `docs/MULTI_WORKTREE.md` | Full documentation |

### Important Notes

- **Do NOT use regular `make up/dev` commands** when running multiple worktrees - use `make wt-*` instead
- **Always check ports first** with `make wt-check` before starting services
- **Each worktree is isolated**: separate containers, networks, and volumes
- **Submodules share code** but services run independently per worktree

## Project Structure

This is a monorepo with git submodules:

```
finance-tracker/
├── backend/     # Go backend (Clean Architecture)
├── frontend/    # React/Vite frontend
├── infra/       # Docker infrastructure
├── e2e/         # Playwright E2E tests
├── scripts/     # Shared scripts (including worktree-config.sh)
└── docs/        # Documentation
```

## Development Commands Reference

### Single Worktree (standard)
```bash
cd infra && make dev      # Start dev environment
cd e2e && ./scripts/start-e2e.sh  # Start E2E
```

### Multiple Worktrees (isolated)
```bash
cd infra && make wt-dev   # Start dev environment (isolated)
cd e2e && ./scripts/start-e2e-wt.sh  # Start E2E (isolated)
```
