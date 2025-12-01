# Mock Data Removal - Autonomous Execution Prompt

## How to Use This Prompt

**Copy everything below the line and paste it at the start of a new Claude conversation:**

---

## Mission
You are executing a systematic cleanup of mock data from a finance-tracker application. Your goal is to fix E2E tests first (so they correctly fail when detecting mock data), then fix the frontend to use real API data (so tests pass).

---

## Project Context

### Tech Stack
- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: Go + Chi router (port 8081)
- **E2E Tests**: Playwright
- **Database**: PostgreSQL
- **Currency**: Brazilian Real (R$) - format: `R$ 1.234,56` = 1234.56

### Directory Structure
```
/Users/gabriel.herter/Documents/Personal/finance-tracker/
├── frontend/          # React frontend
│   └── src/main/features/
│       ├── dashboard/
│       ├── transactions/
│       ├── categories/
│       ├── goals/
│       ├── settings/
│       ├── rules/
│       └── groups/
├── backend/           # Go backend
├── e2e/               # Playwright E2E tests
│   └── tests/
│       ├── m2-auth/
│       ├── m3-categories/
│       ├── m4-transactions/
│       ├── m5-import/
│       ├── m7-goals/
│       └── m8-dashboard/
└── tasks/             # Task specifications
```

### Known Mock Values (MUST be detected/rejected)
```typescript
// Dashboard mock values
totalBalance: 15270.5    // R$ 15.270,50
totalIncome: 8500        // R$ 8.500,00
totalExpenses: 6230      // R$ 6.230,00
netSavings: 2270         // R$ 2.270,00
incomeChange: 5.2        // +5.2%
expensesChange: -3.1     // -3.1%

// Goals mock values
goal1: { limit: 2000, current: 1500, category: 'Alimentacao' }  // 75%
goal2: { limit: 800, current: 450, category: 'Transporte' }     // 56%
goal3: { limit: 500, current: 650, category: 'Entretenimento' } // 130% OVER

// Groups mock values
groupName: 'Familia Silva'
totalExpenses: 2500.0    // R$ 2.500,00
members: ['Usuario Teste', 'Maria Silva', 'Joao Santos']
transactions: [
  { description: 'Supermercado Extra', amount: -350.0 },
  { description: 'Conta de Luz', amount: -180.5 },
  { description: 'Cinema', amount: -85.0 },
]
```

---

## Task Execution Protocol

### Before Starting ANY Task
1. Read the task specification file completely
2. Read referenced context files (e2e-mock.md, frontend-mock.md)
3. Verify backend is running: `curl http://localhost:8081/health`
4. Verify frontend is running: `curl http://localhost:5173`

### For E2E Test Fixes (TASK-001, TASK-002)
1. Read the specific test file mentioned
2. Locate the exact lines specified
3. Apply the fix exactly as documented
4. Run the specific test to verify it FAILS (expected - frontend still uses mocks)
5. If test passes when it should fail, the fix is incorrect - investigate
6. Move to next test in the task

### For Frontend Integration (TASK-003+)
1. Check if backend endpoints exist: `grep -r "endpoint_name" backend/`
2. Create API service file if needed
3. Update component to use API calls
4. Remove mock imports
5. Run E2E tests - they should now PASS
6. If tests fail, debug the integration

### Validation Commands
```bash
# Run specific project tests
cd e2e && npx playwright test --project=m8-dashboard --reporter=list

# Run specific test by name
cd e2e && npx playwright test -g "M8-E2E-002" --reporter=list

# Run all E2E tests
cd e2e && npx playwright test --reporter=list
```

---

## Task Queue

Execute in this exact order:

### Phase 1: E2E Test Fixes

**TASK-001**: Fix Critical E2E Tests (Cannot Fail)
- File: `tasks/TASK-001-e2e-critical-fixes.md`
- Tests: 11
- Issues: `expect(true).toBe(true)`, OR logic assertions
- Expected outcome: Tests should FAIL after fixes

**TASK-002**: Fix Dashboard E2E Tests
- File: `tasks/TASK-002-e2e-dashboard-fixes.md`
- Tests: 12
- Issues: Visibility-only assertions, no value verification
- Expected outcome: Tests should FAIL after fixes

### Phase 2: Frontend API Integration

**TASK-003**: Dashboard API Integration
- File: `tasks/TASK-003-frontend-dashboard-integration.md`
- Expected outcome: Dashboard tests PASS

**TASK-004**: Goals API Integration
- File: `tasks/TASK-004-goals-api-integration.md`
- Tests: m7-goals (13 tests)
- Expected outcome: Goals tests PASS, no mock values visible

**TASK-005**: Groups API Integration
- File: `tasks/TASK-005-groups-api-integration.md`
- Tests: m9-groups (14+ tests)
- Expected outcome: Groups tests PASS, no mock values visible

**TASK-006**: Settings API Integration (spec needed)
**TASK-007**: Rules API Integration (spec needed)

---

## Current Task Execution

### Step 1: Identify Current Task
Read `tasks/README.md` to see task statuses. Find the first task with status "Pending" or "In Progress".

### Step 2: Execute Task
1. Read the task specification file
2. For each test/component in the task:
   a. Read the source file
   b. Apply the fix
   c. Validate the fix
   d. Document completion

### Step 3: Update Status
After completing all items in a task:
1. Update `tasks/README.md` to mark task as complete
2. Run validation command to confirm
3. Proceed to next task

---

## Critical Rules

### DO NOT
- Skip reading files before editing
- Guess at fix implementations - use exact code from task specs
- Mark a task complete if any test is not working as expected
- Create new features or "improvements" beyond the task scope
- Use `expect(true)` or OR logic in any assertion

### ALWAYS
- Parse Brazilian currency correctly: `R$ 1.234,56` → 1234.56
- Verify API calls are made (not just UI visibility)
- Check for mock values and FAIL if detected
- Use tight tolerances for numeric comparisons (0.01, not 10)
- Test against actual API data, not hardcoded expectations

---

## Error Recovery

### If E2E test hangs
```bash
# Kill playwright processes
pkill -f playwright
# Restart test
cd e2e && npx playwright test -g "TEST_NAME" --reporter=list
```

### If backend not responding
```bash
# Check if running
curl http://localhost:8081/health
# If not, start it
cd backend && go run ./cmd/api/main.go &
```

### If frontend not responding
```bash
# Check if running
curl http://localhost:5173
# If not, start it
cd frontend && npm run dev &
```

### If test unexpectedly passes (should fail)
The fix didn't work correctly. Common issues:
1. Mock values changed - re-check `mock-data.ts`
2. Component not using mock anymore - verify imports
3. Assertion too loose - tighten tolerance

---

## Completion Criteria

### Task Complete When
- [ ] All specified tests/components in task are fixed
- [ ] Validation command produces expected result
- [ ] No regressions in other tests
- [ ] Task status updated in README.md

### Project Complete When
- [ ] All tasks marked complete in README.md
- [ ] All E2E tests pass: `cd e2e && npx playwright test --reporter=list`
- [ ] New user sees R$ 0,00 on dashboard
- [ ] No mock-data.ts imports in any component

---

## Quick Reference

### Parse Brazilian Currency
```typescript
const parseAmount = (text: string) => {
  const cleaned = text.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
```

### Fetch Transactions Helper
```typescript
const fetchTransactions = async (page: Page) => {
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  const response = await page.request.get('http://localhost:8081/api/v1/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.json()
}
```

### Mock Detection Pattern
```typescript
// Dashboard
const DASHBOARD_MOCKS = { income: 8500, expenses: 6230, balance: 15270.5 }
expect(actualValue).not.toBe(DASHBOARD_MOCKS.income)
expect(actualValue).not.toBe(DASHBOARD_MOCKS.expenses)
expect(actualValue).not.toBe(DASHBOARD_MOCKS.balance)

// Goals
const GOALS_MOCKS = {
  goal1: { limit: 2000, current: 1500 },
  goal2: { limit: 800, current: 450 },
  goal3: { limit: 500, current: 650 },
}
expect(goalLimit).not.toBe(GOALS_MOCKS.goal1.limit)
expect(goalLimit).not.toBe(GOALS_MOCKS.goal2.limit)
expect(goalLimit).not.toBe(GOALS_MOCKS.goal3.limit)

// Groups
const GROUPS_MOCKS = {
  groupName: 'Familia Silva',
  totalExpenses: 2500.0,
  memberNames: ['Usuario Teste', 'Maria Silva', 'Joao Santos'],
}
expect(groupName).not.toContain(GROUPS_MOCKS.groupName)
expect(totalExpenses).not.toBe(GROUPS_MOCKS.totalExpenses)
```

---

## Start Execution

Begin by reading `tasks/README.md` to identify the current task, then execute it following this protocol.

---

# Quick Start (Copy This)

For a new conversation, copy this minimal prompt:

```
Execute the next pending task from the mock data removal project.

Instructions:
1. Read tasks/README.md to find the first pending task
2. Read the task specification file (tasks/TASK-XXX-*.md)
3. Read tasks/EXECUTION-PROMPT.md for the full protocol
4. Execute each item in the task systematically
5. Update tasks/README.md when complete
6. Proceed to next task

Working directory: /Users/gabriel.herter/Documents/Personal/finance-tracker

Key context files to read:
- tasks/README.md (task tracker)
- tasks/e2e-mock.md (ineffective tests analysis)
- tasks/frontend-mock.md (mock data usage analysis)

Start now.
```

---

# Alternative: Execute Specific Task

```
Execute TASK-001 from the mock data removal project.

Read these files first:
1. tasks/TASK-001-e2e-critical-fixes.md (the task)
2. tasks/EXECUTION-PROMPT.md (protocol)
3. tasks/e2e-mock.md (context)

Working directory: /Users/gabriel.herter/Documents/Personal/finance-tracker

For each test in the task:
- Read the source file
- Apply the documented fix exactly
- Run validation command
- Verify expected outcome (tests should FAIL for Phase 1)

Start now.
```
