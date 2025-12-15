# Task: Fix M12 Credit Card Refund Import Bug

## Overview

When importing credit card CSV statements, refund transactions (negative amounts like "Estorno de compra,-253.82") are incorrectly converted to positive expenses. This causes the dashboard to show inflated "Vinculado" amounts and incorrect "Não vinculado" calculations.

**Goal:** Fix the CC import to preserve negative amounts for refunds/credits, ensuring accurate dashboard calculations.

---

## Current State Analysis

### What Exists

**Frontend API Transform** (`frontend/src/main/features/credit-card/api/credit-card.ts:213-222`):
```typescript
function transformTransactionToApi(tx: CreditCardTransaction): Record<string, unknown> {
    return {
        date: tx.date,
        description: tx.title,
        amount: Math.abs(tx.amount),  // BUG: Removes negative sign from refunds
        installment_current: tx.installmentCurrent,
        installment_total: tx.installmentTotal,
        is_payment_received: tx.isPaymentReceived,
    }
}
```

**Parser** (`frontend/src/main/features/credit-card/utils/credit-card-parser.ts:53-55`):
- Correctly parses negative amounts from CSV
- `amount` field preserves sign during parsing

**E2E Fixture** (`e2e/tests/m12-cc-import/fixtures.ts:113-117`):
```typescript
export const refundCSV = `date,title,amount
2019-12-15,Estorno de compra,-253.82
2019-12-14,Bourbon Ipiranga,620.73
2019-12-04,Pagamento recebido,-366.91`
```

### What's Broken

1. **`Math.abs()` in transformTransactionToApi** removes the negative sign from refund amounts
2. Database stores `+253.82` instead of `-253.82` for "Estorno de compra"
3. Dashboard shows 119% "Vinculado" because refund adds to total instead of subtracting
4. "Não vinculado" shows R$1,605.94 which includes the refund swing

### Impact

- **Database Evidence** (billing_cycle 2025-11):
  - Bill payment original_amount: R$ 8,235.79
  - Linked CC transactions total: R$ 9,841.73 (should be ~R$ 8,235.79)
  - "Estorno de Midea Com" stored as +253.82 (should be -253.82)
  - This creates a swing of ~R$ 507.64

---

## Execution Plan

### Phase 1: Create E2E Tests (TDD)

Create tests that verify refunds are handled correctly - these tests will FAIL until implementation is complete.

### Phase 2: Frontend Fix

Fix the `transformTransactionToApi` function to preserve negative amounts for non-payment-received transactions.

### Phase 3: Backend Verification

Verify backend correctly stores and calculates with negative amounts.

### Phase 4: Verification

Run all M12 tests and verify dashboard calculations are correct.

---

## Detailed Specifications

### E2E Test Scenarios

Add to `e2e/tests/m12-cc-import/cc-import.spec.ts`:

```typescript
test('E2E-CC-010: Import CSV with refund preserves negative amount', async ({ page }) => {
  // Setup: Create bill payment that matches refundCSV total
  // refundCSV: Estorno -253.82, Bourbon +620.73, Pagamento -366.91
  // Net expenses (excluding payment): 620.73 - 253.82 = 366.91
  await createBillPayment(page, {
    date: '2019-12-04',
    amount: -366.91,
    testId,
  })
  await page.reload()

  // Open import wizard and select CC format
  await openImportWizard(page)
  await selectCCFormat(page)

  // Upload refund CSV
  await uploadCCCSV(page, refundCSV)

  // Wait for preview
  await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

  // Verify refund shows as negative in preview
  const refundRow = page.locator('tr', { hasText: 'Estorno de compra' })
  await expect(refundRow).toBeVisible()
  // Amount should show as negative (credit)
  await expect(refundRow.locator('td').nth(2)).toContainText('-')

  // Complete import
  await page.getByTestId('import-next-btn').click()
  await page.getByTestId('confirm-import-btn').click()

  // Handle confirmation dialog if present
  const confirmDialog = page.getByTestId('import-confirm-dialog')
  if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId('confirm-import-action-btn').click()
  }

  // Wait for import to complete
  await expect(page.getByTestId('import-success-message')).toBeVisible({ timeout: 15000 })

  // Navigate to transactions with date filter
  await setM12DateFilter(page)

  // Find the refund transaction
  const refundTxn = page.locator('[data-testid="transaction-row"]', { hasText: 'Estorno de compra' })
  await expect(refundTxn).toBeVisible()

  // Verify it shows as a credit (negative/green or special formatting)
  // The amount should be displayed as negative
  const amountCell = refundTxn.locator('[data-testid="transaction-amount"]')
  const amountText = await amountCell.textContent()

  // Verify the amount is negative (could be "-R$ 253,82" or "R$ -253,82" or green colored)
  expect(amountText).toMatch(/-.*253[,.]82|253[,.]82.*-/)
})

test('E2E-CC-011: Dashboard shows correct totals with refunds', async ({ page }) => {
  // Setup: Create bill payment matching refundCSV
  await createBillPayment(page, {
    date: '2019-12-04',
    amount: -366.91,
    testId,
  })
  await page.reload()

  // Import refund CSV
  await openImportWizard(page)
  await selectCCFormat(page)
  await uploadCCCSV(page, refundCSV)
  await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('import-next-btn').click()
  await page.getByTestId('confirm-import-btn').click()

  const confirmDialog = page.getByTestId('import-confirm-dialog')
  if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.getByTestId('confirm-import-action-btn').click()
  }
  await expect(page.getByTestId('import-success-message')).toBeVisible({ timeout: 15000 })

  // Go to dashboard
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // Find CC status card
  const ccCard = page.getByTestId('cc-status-card')

  // If CC card is visible, verify the calculations
  if (await ccCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Total spending should be 366.91 (the net of 620.73 - 253.82)
    const totalSpending = page.getByTestId('cc-total-spending')
    const totalText = await totalSpending.textContent()

    // Should be approximately R$ 366.91, not R$ 874.55 (620.73 + 253.82)
    expect(totalText).toMatch(/366[,.]91/)

    // Vinculado should be ~100%, not 238%
    const matchProgress = page.getByTestId('cc-match-progress')
    const widthStyle = await matchProgress.getAttribute('style')
    // Width should be around 100%, not way over
    expect(widthStyle).toMatch(/width:\s*(100|9\d)/)
  }
})
```

### Frontend Fix

**File:** `frontend/src/main/features/credit-card/api/credit-card.ts`

**Change `transformTransactionToApi` function (lines 213-222):**

```typescript
// Transform frontend transaction to API format
function transformTransactionToApi(tx: CreditCardTransaction): Record<string, unknown> {
    // For "Pagamento recebido", always use absolute value as it's just a reference
    // For all other transactions (including refunds like "Estorno"), preserve the sign
    const amount = tx.isPaymentReceived
        ? Math.abs(tx.amount)  // Payment received is a reference amount, always positive
        : tx.amount            // Preserve sign for refunds (negative) and expenses (positive)

    return {
        date: tx.date,
        description: tx.title,
        amount,
        installment_current: tx.installmentCurrent,
        installment_total: tx.installmentTotal,
        is_payment_received: tx.isPaymentReceived,
    }
}
```

### Backend Verification

The backend should already handle negative amounts correctly. Verify in:

**File:** `backend/internal/application/usecase/credit_card/import.go` or similar

- Ensure `amount` is stored as-is without `Math.Abs()`
- Ensure totals calculation uses algebraic sum (not absolute values)

### Status Card Calculation Fix (if needed)

**File:** `frontend/src/main/features/credit-card/api/credit-card.ts`

In `transformCreditCardStatus` (lines 133-183), verify the calculation:

```typescript
// Calculate total CC transactions amount from summary
// This should be algebraic sum, not absolute sum
const ccTransactionsTotal = (apiStatus.transactions_summary || []).reduce((sum, tx) => {
    // Use the actual amount (which can be negative for refunds)
    return sum + parseFloat(tx.amount || '0')
}, 0)
```

---

## Files to Create/Modify

### Modified Files:

1. **`frontend/src/main/features/credit-card/api/credit-card.ts`**
   - Fix `transformTransactionToApi` to preserve negative amounts
   - Verify `transformCreditCardStatus` uses algebraic sums

2. **`e2e/tests/m12-cc-import/cc-import.spec.ts`**
   - Add `E2E-CC-010`: Import CSV with refund preserves negative amount
   - Add `E2E-CC-011`: Dashboard shows correct totals with refunds

3. **`e2e/tests/m12-cc-import/fixtures.ts`** (if needed)
   - Update `refundCSV` to have clearer test data
   - Add helper for verifying negative amounts

---

## Step-by-Step Execution Instructions

### Step 1: Add E2E Tests

Add the two new E2E tests to `e2e/tests/m12-cc-import/cc-import.spec.ts` at the end of the test suite.

```bash
# Verify tests fail (TDD)
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts --grep "E2E-CC-010|E2E-CC-011"
```

### Step 2: Fix Frontend Transform

Edit `frontend/src/main/features/credit-card/api/credit-card.ts`:

1. Find the `transformTransactionToApi` function (around line 213)
2. Replace `Math.abs(tx.amount)` with conditional logic:
   ```typescript
   const amount = tx.isPaymentReceived
       ? Math.abs(tx.amount)
       : tx.amount
   ```

### Step 3: Verify Status Calculation

Check `transformCreditCardStatus` in the same file:

1. Find where `ccTransactionsTotal` is calculated (around line 137)
2. Ensure it sums actual values, not absolute values:
   ```typescript
   return sum + parseFloat(tx.amount || '0')  // NOT Math.abs()
   ```

### Step 4: Rebuild Frontend

```bash
cd frontend && npm run build
```

### Step 5: Restart E2E Environment

```bash
# If using Docker
docker restart finance-tracker-frontend-e2e
```

### Step 6: Run E2E Tests

```bash
cd e2e && npx playwright test tests/m12-cc-import/
```

### Step 7: Verify All Tests Pass

```bash
cd e2e && npx playwright test
```

---

## Acceptance Criteria

- [ ] Refund transactions (negative amounts in CSV) are stored with negative amounts in database
- [ ] Dashboard "Total de gastos" shows net amount (expenses - refunds)
- [ ] Dashboard "Vinculado" percentage is accurate (should be ~100% when matched)
- [ ] "Não vinculado" is 0 or minimal when all transactions are linked
- [ ] E2E-CC-010 test passes
- [ ] E2E-CC-011 test passes
- [ ] All existing M12 E2E tests continue to pass
- [ ] No regressions in other E2E test suites

---

## Related Documentation

- **Feature Spec:** `context/features/M12-cc-import/backend-tdd.md` - Backend TDD scenarios
- **E2E Scenarios:** `context/features/M12-cc-import/e2e-scenarios.md` - E2E test specifications
- **Existing Tests:** `e2e/tests/m12-cc-import/` - Current M12 tests
- **Fixtures:** `e2e/tests/m12-cc-import/fixtures.ts` - Test data including `refundCSV`

---

## Commands to Run

```bash
# Step 1: Run new E2E tests to confirm they fail (TDD)
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts --grep "E2E-CC-010|E2E-CC-011"

# Step 2: After implementing fix, rebuild frontend
cd frontend && npm run build

# Step 3: Restart frontend container (if using Docker)
docker restart finance-tracker-frontend-e2e

# Step 4: Run M12 E2E tests
cd e2e && npx playwright test tests/m12-cc-import/

# Step 5: Run all E2E tests to check for regressions
cd e2e && npx playwright test

# Step 6: Verify in database (optional)
docker exec finance-tracker-postgres psql -U app_user -d finance_tracker -c "
SELECT description, amount, type
FROM transactions
WHERE description LIKE '%Estorno%'
AND deleted_at IS NULL;"
```

---

## Database Validation Query

After fix, this query should show negative amounts for refunds:

```sql
SELECT
    description,
    amount,
    CASE
        WHEN amount < 0 THEN 'CORRECT (refund/credit)'
        ELSE 'BUG (should be negative)'
    END as status
FROM transactions
WHERE description ILIKE '%estorno%'
AND billing_cycle IS NOT NULL
AND deleted_at IS NULL;
```
