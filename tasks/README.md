# Tasks Directory

This directory contains task specifications for the Finance Tracker project.

## Structure

```
tasks/
├── todo/     # Pending tasks - waiting to be implemented
├── done/     # Completed tasks - moved here after implementation
└── README.md # This file
```

## How to Execute All Tasks

Run the slash command:

```
/execute-tasks
```

This will:
1. Read all tasks in `todo/`
2. Execute each one following TDD approach
3. Move completed tasks to `done/`
4. Continue until `todo/` is empty

## Task File Format

Each task file should be named: `TASK-{Description}.md`

Task files contain:
- Problem description
- Current state analysis
- E2E test specifications
- Implementation steps
- Acceptance criteria

## Current Status

**Pending:** Check `todo/` directory
**Completed:** Check `done/` directory

---

## Quick Commands

### Run All E2E Tests
```bash
cd e2e && npx playwright test --reporter=list
```

### Run Specific Feature Tests
```bash
# Dashboard
cd e2e && npx playwright test --project=m8-dashboard

# Goals
cd e2e && npx playwright test --project=m7-goals

# Rules
cd e2e && npx playwright test --project=m6-rules

# Transactions
cd e2e && npx playwright test --project=m4-transactions

# Categories
cd e2e && npx playwright test --project=m3-categories

# Theme/Polish
cd e2e && npx playwright test --project=m11-polish
```

---

## Previously Completed Work

The following tasks were completed in earlier sessions:

| Task | Description | Status |
|------|-------------|--------|
| TASK-001 | Critical E2E fixes (expect(true), OR logic) | Done |
| TASK-002 | Dashboard E2E value verification | Done |
| TASK-003 | Dashboard API integration | Done |
| TASK-004 | Goals API integration | Done |
| TASK-005 | Groups API integration | Done |
