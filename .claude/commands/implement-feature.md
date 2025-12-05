# Implement Feature

You are implementing a feature based on its specifications: **$ARGUMENTS**

This command breaks down a feature into sequential TDD tasks and executes each one.

---

## PHASE 1: LOAD FEATURE SPECIFICATION

### Step 1.1: Locate Feature

Find the feature specification in `context/features/`:

1. If argument is a feature code (e.g., `M6-rules`):
   - Look in `context/features/{feature-code}/`

2. If argument is a description:
   - Search `context/features/` for matching feature
   - If not found, suggest running `/create-feature {description}` first

### Step 1.2: Read All Specification Files

Read and understand all specification files:

```
context/features/{feature-code}/
├── README.md              # Overview, dependencies, checklist
├── ui-requirements.md     # What to build in frontend
├── integration.md         # API contracts between layers
├── backend-tdd.md         # Backend implementation specs
├── infrastructure.md      # Database migrations & infrastructure
└── e2e-scenarios.md       # E2E test scenarios
```

### Step 1.3: Analyze Current State

Investigate what already exists:

1. **Check existing code:**
   - `frontend/src/main/features/{feature}/` - Any frontend code?
   - `backend/internal/application/{feature}/` - Any backend code?
   - `e2e/tests/{feature-code}/` - Any E2E tests?

2. **Check database:**
   - Any migrations already created?
   - Tables exist?

3. **Determine starting point:**
   - Fresh implementation (nothing exists)
   - Partial implementation (some code exists)
   - Mock-to-real conversion (frontend mocks → real API)

---

## PHASE 2: GENERATE TASK BREAKDOWN

### Step 2.1: TDD Task Sequence

**ALWAYS follow this order - E2E tests are defined FIRST:**

```
┌─────────────────────────────────────────────────────────────┐
│ TASK 1: E2E TEST SCAFFOLDING                                │
│ Purpose: Define what "done" looks like                      │
│ Outcome: E2E tests exist but FAIL (no backend/frontend yet) │
│ Files: e2e/tests/{feature-code}/*.spec.ts                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 2: BACKEND - DATABASE & DOMAIN                         │
│ Purpose: Create data foundation                             │
│ Outcome: Tables exist, entity defined, repository works     │
│ Files: migrations, entity, repository                       │
│ Tests: BDD feature files for CRUD operations                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 3: BACKEND - SERVICE & API                             │
│ Purpose: Expose functionality via API                       │
│ Outcome: All API endpoints working, BDD tests pass          │
│ Files: service, handlers, routes                            │
│ Tests: BDD scenarios for all endpoints                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 4: FRONTEND - API CLIENT & STATE                       │
│ Purpose: Connect frontend to backend                        │
│ Outcome: API client works, state management ready           │
│ Files: api client, store, types                             │
│ Tests: Unit tests for transformations (optional)            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 5: FRONTEND - UI COMPONENTS                            │
│ Purpose: Build user interface                               │
│ Outcome: All screens/modals/components working              │
│ Files: components, screens, modals                          │
│ Tests: Component tests (optional)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ TASK 6: E2E VERIFICATION & FIXES                            │
│ Purpose: Ensure full integration works                      │
│ Outcome: ALL E2E tests PASS                                 │
│ Action: Run /fix-e2e until 100% pass                        │
└─────────────────────────────────────────────────────────────┘
```

### Step 2.2: Customize Tasks Based on Feature

Some features may need additional or different tasks:

**If feature has complex business logic:**
- Add task for domain services before API handlers

**If feature has real-time updates:**
- Add task for WebSocket/SSE implementation

**If feature depends on other features:**
- Add verification task that dependencies are complete

**If feature is frontend-only (no new backend):**
- Skip backend tasks, focus on frontend integration

**If feature is backend-only (no new frontend):**
- Skip frontend tasks, E2E tests may be API-only

### Step 2.3: Generate Task Details

For each task, prepare:

```markdown
## Task {N}: {Task Name}

### Goal
{One sentence describing what this task accomplishes}

### Context
{Reference to relevant specification files and sections}

### Scope
- **Create:** {list of files to create}
- **Modify:** {list of files to modify}
- **Tests:** {what tests to write/run}

### Acceptance Criteria
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Tests pass/fail as expected}

### Dependencies
- Requires: {previous tasks}
- Enables: {next tasks}
```

---

## PHASE 3: EXECUTE TASKS SEQUENTIALLY

### Step 3.1: Display Task Overview

Before starting, show the user:

```
## Feature Implementation Plan: {Feature Name}

**Feature Code:** {feature-code}
**Total Tasks:** {N}
**Estimated Scope:** {Backend + Frontend / Backend only / Frontend only}

### Task Sequence:
1. [ ] E2E Test Scaffolding - Define acceptance criteria
2. [ ] Backend Database & Domain - Data foundation
3. [ ] Backend Service & API - API endpoints
4. [ ] Frontend API & State - Connect to backend
5. [ ] Frontend UI - Build interface
6. [ ] E2E Verification - Integration validation

### Dependencies Verified:
- [x] {dependency 1} exists
- [x] {dependency 2} exists

Ready to begin implementation?
```

### Step 3.2: Execute Each Task

For each task in sequence:

#### 3.2.1: Announce Task Start

```
═══════════════════════════════════════════════════════════════
TASK {N}/{TOTAL}: {Task Name}
═══════════════════════════════════════════════════════════════

Goal: {task goal}

Starting implementation...
```

#### 3.2.2: Create Task File Directly

Create a task file at `tasks/todo/TASK-{Feature}-{TaskNumber}-{Name}.md` with this structure:

```markdown
# Task: {Feature Code} - {Task Name}

## Overview

**Feature:** {feature-code}
**Task:** {N} of {TOTAL}
**Goal:** {One sentence goal}

---

## Reference Specifications

- **Feature Specs:** `context/features/{feature-code}/`
- **Relevant File:** `{specific-spec-file}.md` (Section X)

---

## Scope

### Files to Create
- `{path/to/file}` - {description}

### Files to Modify
- `{path/to/file}` - {what to change}

---

## Implementation Steps

### Step 1: {First step}
{Brief instructions - details are in the spec files}

### Step 2: {Second step}
{Brief instructions}

---

## Acceptance Criteria

- [ ] {Criterion from spec}
- [ ] {Test requirement}

---

## Commands

```bash
# Verify implementation
{relevant test command}
```
```

**KEY PRINCIPLE:** Task files should be **concise** since all details are in `context/features/{feature-code}/`. Just reference the specs, don't duplicate them.

#### 3.2.3: Implement the Task

After creating the task file, **immediately implement it**:

1. Read the referenced spec files
2. Implement the code changes
3. Write/run the required tests
4. Verify acceptance criteria

#### 3.2.4: Move Task to Done

After successful implementation:
```bash
mv tasks/todo/TASK-{name}.md tasks/done/
```

#### 3.2.5: Announce Task Completion

```
✓ TASK {N}/{TOTAL}: {Task Name} - COMPLETE

Results:
- Files created: {list}
- Files modified: {list}
- Tests: {passing/failing as expected}

Moving to next task...
```

### Step 3.3: Handle Task Failures

If a task fails:

1. **Identify the issue:**
   - Test failures?
   - Build errors?
   - Missing dependencies?

2. **Attempt fix:**
   - Run `/fix-tests` for test failures
   - Run `/fix-e2e` for E2E failures
   - Fix compilation errors
   - Install missing dependencies

3. **If still failing:**
   - Pause implementation
   - Report issue to user
   - Ask for guidance before continuing

---

## PHASE 4: FINAL VERIFICATION

### Step 4.1: Run Full E2E Suite

After all tasks complete:

```bash
cd e2e && npx playwright test --project={feature-code}
```

### Step 4.2: Run Related Tests

Ensure no regressions:

```bash
# Backend BDD tests
cd backend && make test

# Frontend build
cd frontend && npm run build

# Full E2E suite
cd e2e && npx playwright test
```

### Step 4.3: Generate Completion Report

```
═══════════════════════════════════════════════════════════════
FEATURE IMPLEMENTATION COMPLETE: {Feature Name}
═══════════════════════════════════════════════════════════════

## Summary

**Feature Code:** {feature-code}
**Tasks Completed:** {N}/{N}
**Duration:** {time}

## Files Created
- {list of new files}

## Files Modified
- {list of modified files}

## Test Results
- E2E Tests: {X} passing
- BDD Tests: {X} passing
- Build: Success

## Feature Checklist
- [x] E2E scenarios defined and passing
- [x] Backend API implemented and tested
- [x] Frontend UI implemented
- [x] Integration verified
- [x] No regressions in other features

## What Was Implemented
{Brief description of what the feature does}

## Next Steps
- Review the implementation
- Test manually in the browser
- Consider edge cases not covered by E2E
```

---

## TASK TEMPLATES

These are reference templates for the task files created during implementation.
Task files should be **concise** - they reference the feature specs, not duplicate them.

### Task 1: E2E Test Scaffolding

**File:** `tasks/todo/TASK-{feature}-1-e2e-scaffolding.md`

```markdown
# Task: {feature-code} - E2E Test Scaffolding

## Overview
**Feature:** {feature-code} | **Task:** 1 of 6
**Goal:** Create E2E tests that will FAIL until implementation is complete

## Reference
- `context/features/{feature-code}/e2e-scenarios.md` - All test scenarios
- `context/features/{feature-code}/ui-requirements.md` - data-testid selectors

## Scope
**Create:** `e2e/tests/{feature-code}/{feature}.spec.ts`

## Acceptance Criteria
- [ ] All scenarios from e2e-scenarios.md implemented
- [ ] Tests use data-testid selectors
- [ ] Tests FAIL when run (expected)
```

### Task 2: Backend Database & Domain

**File:** `tasks/todo/TASK-{feature}-2-backend-database.md`

```markdown
# Task: {feature-code} - Backend Database & Domain

## Overview
**Feature:** {feature-code} | **Task:** 2 of 6
**Goal:** Create database schema, entity, and repository

## Reference
- `context/features/{feature-code}/infrastructure.md` - Migrations, schema, indexes
- `context/features/{feature-code}/backend-tdd.md` - Section 2-4 (entity, repository)

## Scope
**Create:**
- `backend/internal/infrastructure/db/migrations/*_{table}.sql`
- `backend/internal/domain/entity/{entity}.go`
- `backend/internal/application/{feature}/repository.go`
- `backend/internal/infrastructure/repository/postgres/{feature}_repository.go`
- `backend/test/integration/features/{feature}_repository.feature`

## Acceptance Criteria
- [ ] Migration creates correct schema (per infrastructure.md)
- [ ] Indexes created for performance
- [ ] Entity with validation
- [ ] Repository BDD tests pass
```

### Task 3: Backend Service & API

**File:** `tasks/todo/TASK-{feature}-3-backend-api.md`

```markdown
# Task: {feature-code} - Backend Service & API

## Overview
**Feature:** {feature-code} | **Task:** 3 of 6
**Goal:** Create service layer and HTTP handlers

## Reference
- `context/features/{feature-code}/backend-tdd.md` - Section 5-6
- `context/features/{feature-code}/integration.md` - Section 2

## Scope
**Create:**
- `backend/internal/application/{feature}/service.go`
- `backend/internal/integration/handler/{feature}_handler.go`
- `backend/test/integration/features/{feature}_api.feature`

**Modify:**
- `backend/internal/integration/router/router.go`

## Acceptance Criteria
- [ ] All endpoints from integration.md work
- [ ] BDD API tests pass
```

### Task 4: Frontend API & State

**File:** `tasks/todo/TASK-{feature}-4-frontend-api.md`

```markdown
# Task: {feature-code} - Frontend API & State

## Overview
**Feature:** {feature-code} | **Task:** 4 of 6
**Goal:** Create API client and state management

## Reference
- `context/features/{feature-code}/integration.md` - Section 2-5

## Scope
**Create:**
- `frontend/src/main/features/{feature}/api/{feature}.ts`
- `frontend/src/main/features/{feature}/store/{feature}Store.ts`
- `frontend/src/main/features/{feature}/types.ts`

## Acceptance Criteria
- [ ] API client with all endpoints
- [ ] Store with actions and state
- [ ] TypeScript types correct
```

### Task 5: Frontend UI Components

**File:** `tasks/todo/TASK-{feature}-5-frontend-ui.md`

```markdown
# Task: {feature-code} - Frontend UI Components

## Overview
**Feature:** {feature-code} | **Task:** 5 of 6
**Goal:** Build screens, modals, and components

## Reference
- `context/features/{feature-code}/ui-requirements.md` - Complete UI spec

## Scope
**Create/Modify:**
- `frontend/src/main/features/{feature}/{Feature}Screen.tsx`
- `frontend/src/main/features/{feature}/{Feature}Modal.tsx`
- `frontend/src/main/features/{feature}/components/*.tsx`
- `frontend/src/main/router.tsx` (add route)
- Navigation (add menu item)

## Acceptance Criteria
- [ ] All screens/modals from ui-requirements.md
- [ ] All states (loading, empty, error)
- [ ] data-testid attributes for E2E
- [ ] Responsive + dark mode
```

### Task 6: E2E Verification

**File:** `tasks/todo/TASK-{feature}-6-e2e-verification.md`

```markdown
# Task: {feature-code} - E2E Verification

## Overview
**Feature:** {feature-code} | **Task:** 6 of 6
**Goal:** All E2E tests pass

## Reference
- `e2e/tests/{feature-code}/`
- `context/features/{feature-code}/e2e-scenarios.md`

## Commands
```bash
cd e2e && npx playwright test --project={feature-code}
```

## Acceptance Criteria
- [ ] All E2E tests PASS
- [ ] No regressions
- [ ] Backend BDD tests pass
- [ ] Frontend builds
```

---

## GUIDELINES

### TDD Principles

1. **Tests First:** E2E scenarios defined before any implementation
2. **Red-Green-Refactor:** Tests fail → Implement → Tests pass → Clean up
3. **Outside-In:** Start with user-facing tests, work inward

### Task Execution Rules

1. **Sequential:** Tasks must be done in order
2. **Complete:** Each task must be finished before the next
3. **Verified:** Tests must be run after each task
4. **Documented:** Progress tracked via task files

### Error Recovery

1. **Test Failures:** Use `/fix-e2e` or `/fix-tests`
2. **Build Failures:** Fix before proceeding
3. **Blocking Issues:** Pause and ask user for guidance

### Quality Checks

After each task:
- [ ] Code compiles/builds
- [ ] Relevant tests pass (or fail as expected)
- [ ] No TypeScript errors
- [ ] No linting errors

---

## START NOW

1. Locate feature specification for: **$ARGUMENTS**
2. Read all specification files
3. Analyze current implementation state
4. Generate task breakdown
5. Execute tasks sequentially using /create-task
6. Verify with E2E tests
7. Report completion
