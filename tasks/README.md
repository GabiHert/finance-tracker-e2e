# Mock Data Removal - Task Tracker

## Overview
This directory contains task specifications for removing mock data from the finance-tracker application and fixing ineffective E2E tests.

## Strategy
**Test-Driven Approach**: Fix E2E tests first to fail correctly, then fix frontend to pass tests.

---

## Phase 1: E2E Test Fixes

| Task | Description | Tests | Status |
|------|-------------|-------|--------|
| TASK-001 | Critical E2E fixes (expect(true), OR logic) | 11 | ✅ Complete |
| TASK-002 | Dashboard E2E value verification | 12 | ✅ Complete |

**Total Phase 1**: ~23 test fixes

### Expected Outcome
After Phase 1, running E2E tests should FAIL because frontend still uses mock data.

---

## Phase 2: Frontend API Integration

| Task | Description | Feature | Status |
|------|-------------|---------|--------|
| TASK-003 | Dashboard API integration | Dashboard | ✅ Complete |
| TASK-004 | Goals API integration | Goals | ✅ Complete |
| TASK-005 | Groups API integration | Groups | ⬜ Pending |
| TASK-006 | Settings API integration | Settings | ⬜ Not Created |
| TASK-007 | Rules API integration | Rules | ⬜ Not Created |

### Expected Outcome
After Phase 2, all E2E tests should PASS with real data.

---

## Execution Order

```
1. TASK-001 → Fix critical E2E tests (cannot fail)
      ↓
2. TASK-002 → Fix dashboard E2E tests (value verification)
      ↓
3. Run all tests → Should FAIL (mock data detected)
      ↓
4. TASK-003 → Integrate dashboard with API
      ↓
5. Run dashboard tests → Should PASS
      ↓
6. TASK-004-007 → Integrate remaining features
      ↓
7. Run all tests → All PASS
```

---

## Quick Commands

### Run All E2E Tests
```bash
cd e2e && npx playwright test --reporter=list
```

### Run Specific Feature Tests
```bash
# Dashboard
cd e2e && npx playwright test --project=m8-dashboard --reporter=list

# Goals
cd e2e && npx playwright test --project=m7-goals --reporter=list

# Groups
cd e2e && npx playwright test --project=m9-groups --reporter=list

# Transactions
cd e2e && npx playwright test --project=m4-transactions --reporter=list

# Categories
cd e2e && npx playwright test --project=m3-categories --reporter=list
```

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Frontend Mock Analysis | `frontend-mock.md` | Details all mock data in frontend |
| E2E Test Analysis | `e2e-mock.md` | Details all ineffective E2E tests |

---

## Definition of Done (Entire Project)

- [x] No `expect(true).toBe(true)` in any E2E test
- [x] No OR logic assertions that always pass
- [x] All E2E tests verify actual data values
- [x] Dashboard fetches real data from API
- [x] Goals fetches real data from API (TASK-004)
- [ ] Groups fetches real data from API (TASK-005)
- [ ] Settings persists to API
- [ ] Rules persists to API
- [x] New user sees R$ 0,00 on dashboard
- [ ] All mock-data.ts files deleted or unused
- [ ] All E2E tests pass with real backend
