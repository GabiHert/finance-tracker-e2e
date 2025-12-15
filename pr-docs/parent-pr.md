# PR: M12 CC Refund Fix + M15 Smart Reconciliation Specs

## Summary

This PR contains:
1. **M12 Bug Fix:** Submodule updates that fix credit card refund import preserving negative amounts
2. **M15 Feature Specs:** Complete documentation for the Smart CC Reconciliation feature
3. **Task Documentation:** Detailed execution plans and acceptance criteria

## Changes Overview

### Submodule Updates

| Submodule | From | To | Purpose |
|-----------|------|----|---------|
| `backend` | 049d879 | 9b1cc23 | M12 refund fixes (preserve negative amounts in calculations) |
| `frontend` | 306954d | 2d0fe2c | M12 refund fixes (preserve signs in transforms) |
| `e2e` | bacbcbc | a8517dc | M12 refund E2E tests + M9 stability fixes |
| `infra` | d1ff709 | d08df92 | Infrastructure updates |

### M12 Bug Fix Summary

**Problem:** Refund transactions (negative amounts like "Estorno de compra,-253.82") were being converted to positive values, causing:
- Dashboard showing 119% "Vinculado" instead of ~100%
- Inflated total spending calculations
- Incorrect "Não vinculado" amounts

**Solution:** Fixed in both backend (`.Abs()` removal) and frontend (`Math.abs()` conditional usage) to preserve the algebraic sign of all transactions except payment references.

### M15 Feature Specifications (New Documentation)

Added complete specifications for the Smart CC Reconciliation feature:

| File | Lines | Purpose |
|------|-------|---------|
| `context/features/M15-smart-reconciliation/README.md` | 106 | Feature overview and user stories |
| `context/features/M15-smart-reconciliation/backend-tdd.md` | 680 | Backend TDD scenarios, service layer design, API endpoints |
| `context/features/M15-smart-reconciliation/e2e-scenarios.md` | 777 | E2E test specifications |
| `context/features/M15-smart-reconciliation/infrastructure.md` | 451 | Database migrations and infrastructure |
| `context/features/M15-smart-reconciliation/integration.md` | 620 | API contracts and state management |
| `context/features/M15-smart-reconciliation/ui-requirements.md` | 484 | Frontend UI specifications |

**M15 Feature Summary:**

The Smart Reconciliation feature enables **order-independent credit card import**:

**Current Problem:** Users must import bank bill payment BEFORE CC statement. If reversed, CC transactions become "orphaned".

**Solution:** System that:
1. Allows import in any order
2. Automatically detects and links CC transactions to bills
3. Uses confidence-based matching:
   - Billing cycle matching (YYYY-MM format)
   - Amount tolerance: ±2% or R$20 (whichever is greater)
   - Date range: ±15 days from billing cycle month

### Task Documentation

| File | Purpose |
|------|---------|
| `tasks/done/TASK-M12-Fix-CC-Refund-Import-Bug.md` | Frontend fix specification |
| `tasks/done/TASK-M12-Refund-Amount-Handling-Complete-Fix.md` | Complete solution documentation |

## Commit History

1. `6146778` - wip: Update submodules for M15 reconciliation and M12 fixes
2. `21d80e8` - fix: M12 CC refund import bug - preserve negative amounts
3. `de132a6` - chore: Move completed task to done folder
4. `5ea512a` - fix: M12 CC refund amount handling - preserve negative values
5. `4deda82` - chore: Update e2e submodule with M9 test fixes

## Test Plan

- [x] All M12 CC refund E2E tests pass
- [x] All M9 group tests pass (35/35, 0 skipped)
- [x] All M8 custom date range tests pass (8/8, 0 skipped)
- [x] Existing test suites remain green

## Files Changed

```
4 files changed, 4282 insertions(+), 4 deletions(-)

Breakdown:
- M15 Documentation: 3,122 lines (complete feature specs)
- Task files: 1,160 lines (execution plans)
- Submodule updates: 4 (backend, frontend, e2e, infra)
```

## Breaking Changes

None. This PR contains:
- Bug fixes (backward compatible)
- Documentation (no code impact)
- Test improvements (no production impact)

## Related PRs

- [Backend PR](https://github.com/GabiHert/finance-tracker-backend/pull/new/fix/m12-cc-refund-import)
- [Frontend PR](https://github.com/GabiHert/finance-tracker-frontend/pull/new/fix/m12-cc-refund-import)
- [E2E PR](https://github.com/GabiHert/finance-tracker-e2e/pull/new/fix/m12-cc-refund-import)
