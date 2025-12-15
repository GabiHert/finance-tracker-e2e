# PR: E2E Test Improvements - M12 Refund Tests & M9 Group Test Fixes

## Summary

This PR contains two sets of changes:
1. **M12 Refund Tests:** New E2E tests validating that refund transactions preserve negative amounts throughout the CC import flow
2. **M9 Group Tests:** Fixed tests that were being silently skipped due to missing test data setup

## Changes

### 1. M12 Credit Card Refund Tests

Added comprehensive E2E tests for refund transaction handling:

**New Test Fixtures (`tests/fixtures/fixtures.ts`):**
- Added `realWorldRefundCSV` fixture based on real Nubank 2018-11 billing cycle data
- Contains actual refund transaction: `Estorno de compra,-253.82`
- Uses 2018 dates for test isolation (won't conflict with other test data)

**New Test Scenarios:**
- E2E-CC-023: Refund transactions display with negative amounts in the UI
- E2E-CC-024: Dashboard calculations correctly reflect refunds as spending reductions
- E2E-CC-030: Preview total is algebraic sum (refunds subtract)
- E2E-CC-031: Refund shows as negative in preview table
- E2E-CC-032: Bill match shows minimal difference when totals align
- E2E-CC-033: Refund stored as negative amount after import
- E2E-CC-034: Dashboard shows ~100% Vinculado when bill matches
- E2E-CC-035: Multiple refunds all preserved as negative

**Extended Cleanup Fixtures:**
- M12 cleanup now includes 2018 date range for comprehensive test isolation

### 2. M9 Group Test Fixes

Fixed tests in `tests/m9-groups/group-invite-validation.spec.ts` and `tests/m8-dashboard/custom-date-range.spec.ts` that were being silently skipped.

**Problem:**
Tests were using conditional skip patterns that silently skipped when no groups existed:
```typescript
// PROBLEMATIC PATTERN:
const groupCard = page.getByTestId('group-card').first()
if (!(await groupCard.isVisible())) {
    test.skip()  // Silent skip - no clear failure
    return
}
```

**Solution:**
1. Added `beforeEach`/`afterEach` hooks with `createGroup`/`deleteAllGroups` helpers
2. Replaced conditional skips with proper Playwright assertions:
```typescript
// CORRECT PATTERN:
const groupCard = page.getByTestId('group-card').first()
await expect(groupCard).toBeVisible({ timeout: 5000 })  // Fails clearly if missing
```

**Tests Fixed:**
- M9-E2E-11a: Should show confirmation dialog when inviting non-registered user
- M9-E2E-11b: Should proceed directly when inviting existing registered user
- M9-E2E-11c: Should send invite after confirming non-user invitation
- M9-E2E-11d: Should cancel non-user confirmation and return to modal
- M9-E2E-11e: API check endpoint returns user status correctly
- M9-E2E-CUSTOM-001: Should support custom date range on group dashboard

**Additional Fixes:**
- Fixed selector from `getByRole('tab')` to `getByRole('button')` for dashboard button
- Added retry logic for dropdown visibility issues

### 3. Test Utilities Enhancement

Added `createGroup` helper function to `tests/fixtures/test-utils.ts`:
```typescript
export async function createGroup(
  page: Page,
  group: { name: string; description?: string }
): Promise<TestGroup> {
  const token = await getAuthToken(page)
  const response = await page.request.post(`${API_URL}/groups`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name: group.name,
      description: group.description || '',
    },
  })
  // ...
}
```

## Test Results

**Before:**
- M9 tests: Multiple tests skipped silently
- M8 custom date range: 1 test skipped

**After:**
- M9 tests: 35/35 passing (0 skipped)
- M8 custom date range: 8/8 passing (0 skipped)
- M12 refund tests: All passing

## Files Changed

- `tests/fixtures/fixtures.ts` - Added realWorldRefundCSV fixture
- `tests/fixtures/test-utils.ts` - Added createGroup helper
- `tests/m9-groups/group-invite-validation.spec.ts` - Fixed all skip conditions
- `tests/m8-dashboard/custom-date-range.spec.ts` - Fixed M9-E2E-CUSTOM-001 test
- `tests/m12-cc-import/*.spec.ts` - Added refund validation tests

## Breaking Changes

None. All changes are test improvements and additions.

## Known Issues / Follow-up Items

The following issues were identified during code review and should be addressed in future PRs:

### High Priority

1. **Excessive `.catch(() => false)` Patterns (187 instances in 56 files)**
   - Tests silently fail without actually failing
   - Should use `locator().or(fallback)` pattern instead
   - Example problematic pattern:
     ```typescript
     const hasSuccess = await successToast.isVisible().catch(() => false)
     ```

2. **Always-Pass Tests in `groups.spec.ts` (lines 285, 337)**
   ```typescript
   expect(true).toBe(true)  // Always passes regardless of actual functionality
   ```
   - Tests E2E-M9-06 through E2E-M9-09 have no real assertions

3. **Serial Execution Bottleneck**
   - M9 runs with `workers: 1` (serial mode)
   - M12 runs with `workers: 1` + 6 dependencies (waits for 5 other suites)
   - Significantly slows down test execution

### Medium Priority

4. **Excessive `waitForTimeout()` Calls (56 instances)**
   - Should use proper `waitFor({ state: 'visible' })` conditions
   - High-risk files: `custom-date-range.spec.ts` (11), `theme-toggle.spec.ts` (9)

5. **Silent Cleanup Failures**
   - `beforeEach` blocks catch and ignore cleanup errors
   - Can cause test pollution if cleanup actually fails

6. **Over-Aggressive M12 Cleanup (Level 5 Nuclear Option)**
   - Deletes ANY transaction in M12 date range (2019-11 to 2020-04)
   - Could interfere with legitimate test data

### Recommendations

1. Replace `.catch(() => false)` with explicit locator fallbacks
2. Add actual assertions to always-pass tests
3. Enable parallel execution for M9 and M12 with proper isolation
4. Replace `waitForTimeout()` with proper wait conditions
5. Make cleanup failures blocking (fail test if setup fails)

## Related PRs

- Backend: fix/m12-cc-refund-import (fixes `.Abs()` in Go calculations)
- Frontend: fix/m12-cc-refund-import (fixes `Math.abs()` in transforms)
