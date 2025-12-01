# TASK-001: Fix Critical E2E Tests (Cannot Fail)

## Overview
- **Priority**: CRITICAL
- **Estimated Tests**: 11
- **Type**: E2E Test Fixes
- **Prerequisite**: None
- **Expected Outcome**: Tests should FAIL when frontend uses mock data

## Context Files
- Read `e2e-mock.md` for detailed analysis
- Read `frontend-mock.md` for understanding what mock data exists

## Tests to Fix

### Part A: Remove `expect(true).toBe(true)` (5 tests)

#### 1. M7-E2E-14b: Should display over-limit alert on dashboard
**File**: `e2e/tests/m7-goals/goal-alerts.spec.ts` (Lines 149-199)

**Current Problem**:
```typescript
// Lines 157, 166, 167, 179, 198 all use:
expect(true).toBe(true)
```

**Required Fix**:
```typescript
// 1. Create goal with $10 limit
// 2. Create expense > $10 in that category
// 3. Navigate to dashboard
// 4. Assert alert banner IS visible:
await expect(page.getByTestId('goal-alert-banner')).toBeVisible()
await expect(page.getByTestId('goal-alert-banner')).toContainText(/exceeded|excedido/i)
// 5. Verify alert shows correct goal name
```

---

#### 2. M7-E2E-14c: Should show warning when approaching limit (80%+)
**File**: `e2e/tests/m7-goals/goal-alerts.spec.ts` (Lines 201-266)

**Current Problem**:
```typescript
// Lines 208, 230, 265 use:
expect(true).toBe(true)
```

**Required Fix**:
```typescript
// 1. Create goal with $100 limit
// 2. Create expense of $85 (85% of limit)
// 3. Navigate to goals
// 4. Assert warning indicator is visible:
const goalCard = page.getByTestId('goal-card').filter({ hasText: categoryName })
await expect(goalCard.getByTestId('warning-indicator')).toBeVisible()
// 5. Verify percentage shown is >= 80%
const percentText = await goalCard.getByTestId('goal-progress-percent').textContent()
const percent = parseFloat(percentText.replace('%', ''))
expect(percent).toBeGreaterThanOrEqual(80)
```

---

#### 3. M4-E2E-016b: Should complete full transaction edit flow
**File**: `e2e/tests/m4-transactions/transaction-crud.spec.ts` (Lines 126-164)

**Current Problem**:
```typescript
// Line 163:
expect(true).toBeTruthy()
```

**Required Fix**:
```typescript
// After clicking save:
await expect(page.getByRole('dialog')).not.toBeVisible()

// Verify edit persisted in UI
const editedRow = page.getByTestId('transaction-row').filter({ hasText: updatedDescription })
await expect(editedRow).toBeVisible()

// Verify edit persisted to API
const transactions = await fetchTransactions(page)
const edited = transactions.find(t => t.description === updatedDescription)
expect(edited).toBeDefined()
```

---

#### 4. M4-E2E-016j: Should update summary totals after transaction changes
**File**: `e2e/tests/m4-transactions/transaction-crud.spec.ts` (Lines 412-447)

**Current Problem**:
```typescript
// Line 446:
expect(true).toBeTruthy()
```

**Required Fix**:
```typescript
// Parse initial expense total (Brazilian currency)
const parseAmount = (text: string) => {
  const cleaned = text.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

const initialTotal = parseAmount(await expenseTotal.textContent())

// Create transaction...

// After creating transaction, verify total increased:
await page.waitForLoadState('networkidle')
const newTotal = parseAmount(await expenseTotal.textContent())
expect(newTotal).toBe(initialTotal + 100) // 100 was the transaction amount
```

---

#### 5. M3-E2E-06b: Should complete full category edit flow
**File**: `e2e/tests/m3-categories/category-crud.spec.ts` (Lines 71-116)

**Current Problem**:
```typescript
// Line 115:
expect(true).toBeTruthy()
```

**Required Fix**:
```typescript
// After saving:
await expect(page.getByRole('dialog')).not.toBeVisible()

// Verify new name appears in list
await expect(page.getByTestId('category-name').filter({ hasText: updatedName })).toBeVisible()

// Verify old name no longer appears
await expect(page.getByTestId('category-name').filter({ hasText: originalName })).not.toBeVisible()

// Verify API has updated category
const categories = await fetchCategories(page)
const updated = categories.find(c => c.name === updatedName)
expect(updated).toBeDefined()
```

---

### Part B: Fix OR Logic Assertions (6 tests)

#### 6. M8-E2E-005: Should display category breakdown donut chart
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 136-161)

**Current Problem**:
```typescript
// Line 154:
expect(hasSegments || hasEmptyState).toBeTruthy()
```

**Required Fix**:
```typescript
// First check if user has transactions
const transactions = await fetchTransactions(page)

if (transactions.length > 0) {
  // User has transactions - chart MUST have segments
  const chartSegments = donutChart.locator('[data-testid="donut-segment"]')
  await expect(chartSegments.first()).toBeVisible()
  expect(await chartSegments.count()).toBeGreaterThan(0)
} else {
  // User has no transactions - empty state MUST be shown
  await expect(donutChart.getByTestId('empty-chart-state')).toBeVisible()
}
```

---

#### 7. M8-E2E-006: Should display spending trends line chart
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 163-183)

**Current Problem**:
```typescript
// Line 182:
expect(hasChart || hasEmptyState).toBeTruthy()
```

**Required Fix**:
```typescript
// Same pattern - check transactions first
const transactions = await fetchTransactions(page)

if (transactions.length > 0) {
  // Chart must render with data
  const trendLines = trendsChart.locator('path, line, [data-testid="trend-line"]')
  await expect(trendLines.first()).toBeVisible()
} else {
  // Empty state must be shown
  await expect(trendsChart.getByTestId('empty-chart-state')).toBeVisible()
}
```

---

#### 8. M3-E2E-06d: Should handle category name with many characters
**File**: `e2e/tests/m3-categories/category-crud.spec.ts` (Lines 140-169)

**Current Problem**:
```typescript
// Line 168:
expect(modalClosed || hasError || hasAlert).toBeTruthy()
```

**Required Fix**:
```typescript
// Define expected behavior: 51 chars should be rejected
const MAX_CATEGORY_NAME_LENGTH = 50

// Try to save
await page.getByTestId('modal-save-btn').click()

// Modal should remain open with error
await expect(page.getByRole('dialog')).toBeVisible()

// Error message should be shown
const errorMessage = page.getByTestId('input-error-message')
await expect(errorMessage).toBeVisible()
await expect(errorMessage).toContainText(/too long|muito longo|max|máximo/i)
```

---

#### 9. M2-E2E-005: Should persist session after login
**File**: `e2e/tests/m2-auth/login.spec.ts` (Lines 61-79)

**Current Problem**:
```typescript
// Line 78:
expect(hasAuthCookie || localStorage.length > 0).toBeTruthy()
```

**Required Fix**:
```typescript
// Get the specific auth token
const authToken = await page.evaluate(() => localStorage.getItem('access_token'))
expect(authToken).toBeTruthy()
expect(authToken.length).toBeGreaterThan(10) // Tokens are long strings

// Verify token works by making an authenticated API call
const response = await page.request.get('http://localhost:8081/api/v1/transactions', {
  headers: { Authorization: `Bearer ${authToken}` }
})
expect(response.status()).toBe(200)
```

---

#### 10. M3-E2E-06a: Should complete full category creation flow
**File**: `e2e/tests/m3-categories/category-crud.spec.ts` (Lines 30-69)

**Current Problem**:
```typescript
// Line 68:
expect(categoryVisible || newCount >= initialCount).toBeTruthy()
```

**Required Fix**:
```typescript
// After saving:
await expect(page.getByRole('dialog')).not.toBeVisible()

// Category MUST appear in list (not OR logic)
const createdCategory = page.getByTestId('category-card').filter({ hasText: categoryName })
await expect(createdCategory).toBeVisible()

// Count MUST have increased
const newCount = await page.getByTestId('category-card').count()
expect(newCount).toBe(initialCount + 1)

// API MUST have the category
const categories = await fetchCategories(page)
const found = categories.find(c => c.name === categoryName)
expect(found).toBeDefined()
```

---

#### 11. M4-E2E-016a: Should complete full transaction creation flow
**File**: `e2e/tests/m4-transactions/transaction-crud.spec.ts` (Lines 84-124)

**Current Problem**:
```typescript
// Line 123:
expect(newCount >= initialCount).toBeTruthy()
```

**Required Fix**:
```typescript
// After saving:
await expect(page.getByRole('dialog')).not.toBeVisible()

// Transaction MUST appear in list
const createdTransaction = page.getByTestId('transaction-row').filter({ hasText: description })
await expect(createdTransaction).toBeVisible()

// Count MUST have increased by exactly 1
const newCount = await page.getByTestId('transaction-row').count()
expect(newCount).toBe(initialCount + 1)

// API MUST have the transaction with correct values
const transactions = await fetchTransactions(page)
const found = transactions.find(t => t.description === description)
expect(found).toBeDefined()
expect(found.amount).toBe(150.50)
```

---

## Validation Command
After fixing, run:
```bash
cd e2e && npx playwright test --project=m7-goals -g "M7-E2E-14" --reporter=list
cd e2e && npx playwright test --project=m4-transactions -g "M4-E2E-016" --reporter=list
cd e2e && npx playwright test --project=m3-categories -g "M3-E2E-06" --reporter=list
cd e2e && npx playwright test --project=m8-dashboard -g "M8-E2E-00" --reporter=list
cd e2e && npx playwright test --project=m2-auth -g "M2-E2E-00" --reporter=list
```

**Expected Result**: All tests should FAIL (because frontend still uses mock data)

## Definition of Done
- [ ] All 11 tests updated with proper assertions
- [ ] No `expect(true).toBe(true)` or `expect(true).toBeTruthy()` remains
- [ ] No OR logic assertions that always pass
- [ ] Tests FAIL when run against current frontend (uses mocks)
- [ ] Tests have clear error messages when they fail
