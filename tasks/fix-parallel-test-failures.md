# Task: Fix 6 Failing E2E Tests for Parallel Execution

## Overview
Fix the 6 E2E tests that fail when running the full test suite in parallel but pass when run individually.

## Failing Tests

### M5 Import Tests (4 failures)
**File:** `/Users/gabriel.herter/Documents/Personal/finance-tracker/e2e/tests/m5-import/imported-transactions-display.spec.ts`

| Test | Line | Issue |
|------|------|-------|
| BUG-005 | 25-102 | Weak UI assertions - doesn't filter by testId |
| BUG-006 | 104-180 | Weak UI assertions - doesn't filter by testId |
| BUG-007 | 182-228 | Weak UI assertions - doesn't filter by testId |
| BUG-008 | 230-273 | Weak UI assertions - doesn't filter by testId |

### M4 Transaction Tests (2 failures)
**File:** `/Users/gabriel.herter/Documents/Personal/finance-tracker/e2e/tests/m4-transactions/transaction-crud.spec.ts`

| Test | Line | Issue |
|------|------|-------|
| M4-E2E-16a | 26 | 409 conflict - category cleanup fails |
| M4-E2E-16j | 643 | 409 conflict - category cleanup fails |

## Root Causes

### 1. M5 Import Tests - Weak UI Assertions
The tests verify imported transactions exist but don't filter by testId in the UI:

```typescript
// CURRENT (weak - finds text anywhere on page):
await expect(page.getByText(isolatedName('Imported Transaction 1', testId))).toBeVisible()

// NEEDED (strong - verifies in transaction list context):
const transactionRow = page.getByTestId('transaction-row').filter({ hasText: `[${testId}]` })
await expect(transactionRow).toHaveCount(3) // Verify count of OUR transactions
```

### 2. M4 Transaction Tests - 409 Category Conflict
Error: `"a category with this name already exists" (CAT-010005)`

The `seedIsolatedCategories()` function already uses `isolatedName()` correctly, but:
- Cleanup may fail silently (caught in try-catch)
- Categories from previous test runs may remain
- Need to handle 409 errors by finding existing category instead of failing

## Required Fixes

### Fix 1: Improve seedIsolatedCategories() to handle 409 errors
**File:** `e2e/tests/fixtures/test-utils.ts`

When a 409 conflict occurs, instead of failing:
1. Fetch existing categories
2. Find the one with matching isolated name
3. Return that category

```typescript
// In seedIsolatedCategories(), around line 540-550
// If creation fails with 409, try to find existing category with same name
if (response.status() === 409) {
  const existingCategories = await fetchCategories(page)
  const existing = existingCategories.find(c => c.name === isolatedCategoryName)
  if (existing) {
    return existing // Use existing category
  }
}
```

### Fix 2: Strengthen M5 UI assertions
**File:** `e2e/tests/m5-import/imported-transactions-display.spec.ts`

For each test, change assertions to filter by testId:

```typescript
// BUG-005 (lines 91-98): Change from getByText to filtered row check
// Instead of checking text visibility globally, verify transaction rows contain testId

// Count rows that belong to THIS test
const isolatedRows = page.getByTestId('transaction-row').filter({ hasText: `[${testId}]` })
await expect(isolatedRows).toHaveCount(3, { timeout: 10000 })

// Verify each specific transaction exists
await expect(isolatedRows.filter({ hasText: 'Imported Transaction 1' })).toHaveCount(1)
await expect(isolatedRows.filter({ hasText: 'Imported Transaction 2' })).toHaveCount(1)
await expect(isolatedRows.filter({ hasText: 'Imported Transaction 3' })).toHaveCount(1)
```

### Fix 3: Improve cleanup reliability
**File:** `e2e/tests/fixtures/test-utils.ts`

In `cleanupIsolatedTestData()`, add verification that deletion succeeded:

```typescript
// After deleting categories, verify they're gone
const remainingCategories = await fetchCategories(page)
const stillExists = remainingCategories.filter(c => c.name.includes(`[${testId}]`))
if (stillExists.length > 0) {
  console.warn(`Cleanup incomplete: ${stillExists.length} categories still exist for ${testId}`)
  // Retry deletion
  for (const cat of stillExists) {
    await deleteCategory(page, cat.id)
  }
}
```

## Implementation Steps

1. **Update test-utils.ts:**
   - Modify `seedIsolatedCategories()` to handle 409 by returning existing category
   - Improve `cleanupIsolatedTestData()` to verify and retry cleanup

2. **Update imported-transactions-display.spec.ts:**
   - BUG-005 (line 91-98): Replace text assertions with filtered row count
   - BUG-006 (line 164-170): Replace text assertions with filtered row count
   - BUG-007 (line 212-219): Replace text assertions with filtered row count
   - BUG-008 (line 261): Replace text assertion with filtered row check

3. **Test after each change:**
   ```bash
   /Users/gabriel.herter/.nvm/versions/node/v22.15.1/bin/node \
     /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e/node_modules/@playwright/test/cli.js test \
     --config=/Users/gabriel.herter/Documents/Personal/finance-tracker/e2e/playwright.config.ts
   ```

## Success Criteria
- All 348+ tests pass when running full suite
- No 409 conflict errors
- Tests remain isolated and don't interfere with each other

## Reference Files
- `e2e/tests/fixtures/test-utils.ts` - Isolation helpers
- `e2e/tests/m5-import/imported-transactions-display.spec.ts` - M5 failing tests
- `e2e/tests/m4-transactions/transaction-crud.spec.ts` - M4 failing tests
