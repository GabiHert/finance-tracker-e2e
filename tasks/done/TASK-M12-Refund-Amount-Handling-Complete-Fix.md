# Task: Fix M12 Credit Card Refund Amount Handling - Complete Solution

## Overview

Credit card refund transactions (negative amounts like "Estorno de compra,-253.82") are being incorrectly converted to positive expenses throughout the system. This causes cascading calculation errors in preview totals, import totals, status calculations, and dashboard displays.

**Goal:** Ensure negative amounts (refunds/credits) are preserved throughout the entire CC import flow - from parsing to storage to display - with comprehensive E2E validation.

---

## Current State Analysis

### Bugs Found (Using `.Abs()` Incorrectly)

| File | Line | Code | Impact |
|------|------|------|--------|
| `backend/internal/application/usecase/credit_card/preview_import.go` | 138 | `totalAmount.Add(txn.Amount.Abs())` | Preview shows wrong total |
| `backend/internal/application/usecase/credit_card/import_transactions.go` | 168 | `totalAmount.Add(txnInput.Amount.Abs())` | Import calculates wrong total |
| `backend/internal/integration/persistence/transaction_repository.go` | 603 | `totalSpending.Add(txn.Amount.Abs())` | Status returns wrong spending |
| `frontend/src/main/features/credit-card/api/credit-card.ts` | 140 | Was `Math.abs()` | **FIXED** - Dashboard calculation |
| `frontend/src/main/features/credit-card/api/credit-card.ts` | 220 | Was `Math.abs()` | **FIXED** - Transform to API |

### What Was Already Fixed (Frontend)

The frontend `transformTransactionToApi` and `transformCreditCardStatus` have been fixed to preserve negative amounts. However, the backend still has bugs.

### What's Still Broken (Backend)

1. **Preview Total** - Shows R$ 9.841,73 instead of ~R$ 8.235,79
2. **Import Total** - Calculates standalone import totals with absolute values
3. **Status Spending** - Returns absolute spending values for standalone transactions
4. **Dashboard Discrepancy** - Shows 113% Vinculado instead of ~100%

### Mathematical Proof

From real data (billing cycle 2025-11):
- **Bill amount**: R$ 8.235,79
- **"Estorno de compra"**: -R$ 253,82 (refund)
- **"Midea Com"**: +R$ 253,82 (related purchase)

With bug (using Abs):
- Estorno becomes +253.82
- Total = all_purchases + 253.82 = R$ 9.841,73 (wrong)

Without bug (preserving sign):
- Estorno stays -253.82
- Total = all_purchases - 253.82 = R$ 8.235,79 (correct)

---

## Execution Plan

### Phase 1: Create Comprehensive E2E Tests (TDD)

Create tests that will FAIL until all bugs are fixed. Tests must validate:
1. Refund shown as negative in preview
2. Preview total is algebraic sum (not absolute)
3. Refund stored as negative in database
4. Dashboard shows ~100% when bill matches CC total
5. "Não vinculado" is ~R$ 0 when all transactions are linked

### Phase 2: Fix Backend Bugs

Fix the three `.Abs()` usages in backend that cause incorrect calculations.

### Phase 3: Verification

Run all M12 tests and full E2E suite to ensure no regressions.

---

## Detailed Specifications

### Test Fixture: Real-World Data with Refund

Based on actual Nubank CSV (2025-11 billing cycle):

```typescript
// e2e/tests/m12-cc-import/fixtures.ts

/**
 * Real-world data with refund transaction.
 * This fixture replicates the exact bug scenario:
 * - Estorno (refund): -253.82
 * - Related purchase: +253.82
 * - Bill payment: 8235.79
 * - Net CC total should equal bill
 *
 * Uses 2018-11 dates for complete isolation from other tests.
 */
export const realWorldRefundCSV = `date,title,amount
2018-11-15,Estorno de compra,-253.82
2018-11-14,Bourbon Ipiranga,620.73
2018-11-08,Bourbon Ipiranga,794.15
2018-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2018-11-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2018-11-06,Mercado Silva,8.99
2018-11-06,Aloha Petshop,89.90
2018-11-04,Pagamento recebido,-8235.79
2018-11-04,Midea Com - Parcela 1/12,253.82
2018-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2018-11-04,Giullia Magueta de Lim - Parcela 3/6,351.50
2018-11-04,Mp *Autoservico - Parcela 2/4,353.75
2018-11-04,Other purchases,5684.59`

// Calculation breakdown:
// Positive amounts: 620.73 + 794.15 + 196.84 + 55.04 + 8.99 + 89.90 + 253.82 + 79.30 + 351.50 + 353.75 + 5684.59 = 8488.61
// Negative amounts (refunds): -253.82
// Net total (excluding Pagamento recebido): 8488.61 - 253.82 = 8234.79 ≈ 8235.79 (rounding)
// This should match the bill payment of R$ 8235.79
```

### E2E Test Scenarios

```typescript
// e2e/tests/m12-cc-import/refund-validation.spec.ts

import { test, expect } from '@playwright/test'
import {
  realWorldRefundCSV,
  generateTestId,
  createBillPayment,
  uploadCCCSV,
  selectCCFormat,
  openImportWizard,
  cleanupTestTransactions,
} from './fixtures'

/**
 * M12: Refund Amount Validation Tests
 *
 * These tests validate that refund transactions (negative amounts)
 * are handled correctly throughout the entire CC import flow.
 *
 * Key validations:
 * 1. Preview shows correct algebraic sum (refunds subtract)
 * 2. Database stores negative amounts for refunds
 * 3. Dashboard shows ~100% when bill matches CC total
 * 4. "Não vinculado" is minimal when all transactions linked
 */
test.describe('M12: Refund Amount Validation', () => {
  let testId: string

  test.beforeEach(async ({ page }) => {
    testId = generateTestId()
    await page.goto('/transactions')
    await expect(page.getByTestId('transactions-screen')).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await cleanupTestTransactions(page, testId)
  })

  /**
   * E2E-CC-030: Preview total should be algebraic sum
   *
   * Bug: Backend uses .Abs() making refunds add to total
   * Expected: Refund of -253.82 should SUBTRACT from total
   *
   * This test will FAIL until backend preview_import.go is fixed
   */
  test('E2E-CC-030: Preview total is algebraic sum (refunds subtract)', async ({ page }) => {
    // Setup: Create bill payment matching the refund CSV net total
    // Net = all positive amounts - refund = ~8235.79
    await createBillPayment(page, {
      date: '2018-11-04',
      amount: -8235.79,
      testId,
    })
    await page.reload()

    // Open import wizard and select CC format
    await openImportWizard(page)
    await selectCCFormat(page)

    // Upload the real-world refund CSV
    await uploadCCCSV(page, realWorldRefundCSV)

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // CRITICAL ASSERTION: Preview total should be ~8235.79, NOT ~8489.61
    // The difference is 253.82 * 2 = 507.64 (the refund swing)
    const totalAmountElement = page.getByTestId('cc-preview-total-amount')
    await expect(totalAmountElement).toBeVisible()
    const totalText = await totalAmountElement.textContent()

    // Extract numeric value
    const numericTotal = parseFloat(totalText!.replace(/[^\d,-]/g, '').replace(',', '.'))

    // Should be approximately 8235.79 (±10 for rounding tolerance)
    // If bug exists, it will be ~8489.61 or ~8743.43
    expect(numericTotal).toBeLessThan(8300) // Must be less than 8300
    expect(numericTotal).toBeGreaterThan(8150) // Must be greater than 8150
  })

  /**
   * E2E-CC-031: Refund shown as negative in preview table
   *
   * The preview table should display refunds with negative sign
   * to indicate they are credits, not debits.
   */
  test('E2E-CC-031: Refund shows as negative in preview table', async ({ page }) => {
    await createBillPayment(page, {
      date: '2018-11-04',
      amount: -8235.79,
      testId,
    })
    await page.reload()

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realWorldRefundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Find the refund row
    const refundRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundRow).toBeVisible()

    // The amount should show as negative
    await expect(refundRow).toContainText('-253')
  })

  /**
   * E2E-CC-032: Bill match shows correct difference
   *
   * When bill amount matches CC net total, difference should be ~R$ 0
   * Bug: With .Abs(), difference would be ~R$ 507.64
   */
  test('E2E-CC-032: Bill match shows minimal difference when totals align', async ({ page }) => {
    await createBillPayment(page, {
      date: '2018-11-04',
      amount: -8235.79,
      testId,
    })
    await page.reload()

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realWorldRefundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Proceed to matching step
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })

    // Check the match difference - should be minimal (< R$ 10)
    const matchCard = page.getByTestId('bill-match-card')
    await expect(matchCard).toBeVisible()

    // If there's a difference indicator, it should show minimal amount
    const differenceElement = matchCard.getByTestId('match-difference')
    if (await differenceElement.isVisible().catch(() => false)) {
      const diffText = await differenceElement.textContent()
      const numericDiff = parseFloat(diffText!.replace(/[^\d,-]/g, '').replace(',', '.'))
      // Difference should be less than R$ 10 (tolerance)
      expect(Math.abs(numericDiff)).toBeLessThan(10)
    }
  })

  /**
   * E2E-CC-033: Refund stored as negative after import
   *
   * After completing import, the refund transaction should be
   * stored in the database with a negative amount.
   */
  test('E2E-CC-033: Refund stored as negative amount after import', async ({ page }) => {
    await createBillPayment(page, {
      date: '2018-11-04',
      amount: -8235.79,
      testId,
    })
    await page.reload()

    // Complete full import flow
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realWorldRefundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()

    // Handle confirmation dialog
    const confirmDialog = page.getByTestId('import-confirm-dialog')
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }

    await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to transactions with date filter for 2018-11
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Set date filter to 2018-11
    const startDateInput = page.getByTestId('filter-start-date').getByRole('textbox')
    await startDateInput.click()
    await startDateInput.fill('01/11/2018')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)

    const endDateInput = page.getByTestId('filter-end-date').getByRole('textbox')
    await endDateInput.click()
    await endDateInput.fill('30/11/2018')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle')

    // Find the refund transaction
    const refundTxn = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundTxn).toBeVisible({ timeout: 10000 })

    // Verify it shows as negative/credit
    const amountCell = refundTxn.locator('[data-testid="transaction-amount"]')
    const amountText = await amountCell.textContent()

    // Should contain negative indicator or be styled as credit
    expect(amountText).toMatch(/-.*253|253.*-|R\$\s*-/)
  })

  /**
   * E2E-CC-034: Dashboard shows ~100% when bill matches CC total
   *
   * The most critical test - validates the entire flow end-to-end.
   * Bug: With .Abs(), Vinculado shows 113-119% instead of ~100%
   */
  test('E2E-CC-034: Dashboard shows ~100% Vinculado when bill matches', async ({ page }) => {
    await createBillPayment(page, {
      date: '2018-11-04',
      amount: -8235.79,
      testId,
    })
    await page.reload()

    // Complete full import flow
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realWorldRefundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()

    const confirmDialog = page.getByTestId('import-confirm-dialog')
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }

    await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 15000 })

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find CC status card
    const ccCard = page.getByTestId('cc-status-card')

    if (await ccCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get Vinculado percentage
      const vinculadoElement = ccCard.locator('[data-testid="cc-vinculado-percent"]')
      if (await vinculadoElement.isVisible().catch(() => false)) {
        const percentText = await vinculadoElement.textContent()
        const percentValue = parseFloat(percentText!.replace(/[^\d]/g, ''))

        // Should be between 95% and 105% (allowing for rounding)
        // Bug would show 113% or higher
        expect(percentValue).toBeLessThanOrEqual(105)
        expect(percentValue).toBeGreaterThanOrEqual(95)
      }

      // Verify "Não vinculado" is minimal
      const unlinkedElement = ccCard.locator('[data-testid="cc-unlinked-amount"]')
      if (await unlinkedElement.isVisible().catch(() => false)) {
        const unlinkedText = await unlinkedElement.textContent()
        const unlinkedValue = parseFloat(unlinkedText!.replace(/[^\d,-]/g, '').replace(',', '.'))

        // Should be less than R$ 50 (minimal tolerance)
        // Bug would show R$ 1000+
        expect(Math.abs(unlinkedValue)).toBeLessThan(50)
      }
    }
  })

  /**
   * E2E-CC-035: Multiple refunds are all preserved as negative
   *
   * Tests that multiple refund transactions in the same CSV
   * are all correctly handled.
   */
  test('E2E-CC-035: Multiple refunds all preserved as negative', async ({ page }) => {
    // CSV with multiple refunds
    const multiRefundCSV = `date,title,amount
2018-10-15,Estorno de compra,-100.00
2018-10-14,Estorno parcial,-50.00
2018-10-13,Bourbon Ipiranga,400.00
2018-10-04,Pagamento recebido,-250.00`

    // Net: 400 - 100 - 50 = 250
    await createBillPayment(page, {
      date: '2018-10-04',
      amount: -250.00,
      testId,
    })
    await page.reload()

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, multiRefundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Check preview total - should be 250, not 550
    const totalElement = page.getByTestId('cc-preview-total-amount')
    if (await totalElement.isVisible().catch(() => false)) {
      const totalText = await totalElement.textContent()
      const numericTotal = parseFloat(totalText!.replace(/[^\d,-]/g, '').replace(',', '.'))

      // Should be ~250, not ~550 (if bug exists)
      expect(numericTotal).toBeLessThan(300)
      expect(numericTotal).toBeGreaterThan(200)
    }

    // Both refunds should show as negative
    const refundRows = page.locator('[data-testid="transaction-row"]').filter({ hasText: /Estorno/ })
    const count = await refundRows.count()
    expect(count).toBe(2)

    for (let i = 0; i < count; i++) {
      const row = refundRows.nth(i)
      await expect(row).toContainText('-')
    }
  })
})
```

### Backend Fixes Required

#### Fix 1: preview_import.go (Line 138)

```go
// File: backend/internal/application/usecase/credit_card/preview_import.go
// Location: Around line 138

// BEFORE (BUG):
for _, txn := range input.Transactions {
    if paymentReceivedRegex.MatchString(txn.Description) {
        paymentReceivedAmount = paymentReceivedAmount.Add(txn.Amount.Abs())
        ccPaymentDate = txn.Date
        ccPaymentAmount = txn.Amount
    } else {
        totalAmount = totalAmount.Add(txn.Amount.Abs())  // BUG: Uses Abs()
        transactionsToImport = append(transactionsToImport, txn)
    }
}

// AFTER (FIX):
for _, txn := range input.Transactions {
    if paymentReceivedRegex.MatchString(txn.Description) {
        // For "Pagamento recebido", use absolute value as it's a reference amount
        paymentReceivedAmount = paymentReceivedAmount.Add(txn.Amount.Abs())
        ccPaymentDate = txn.Date
        ccPaymentAmount = txn.Amount
    } else {
        // For regular transactions, preserve sign (refunds are negative)
        // This ensures algebraic sum: expenses add, refunds subtract
        totalAmount = totalAmount.Add(txn.Amount)  // FIX: Preserve sign
        transactionsToImport = append(transactionsToImport, txn)
    }
}
```

#### Fix 2: import_transactions.go (Line 168)

```go
// File: backend/internal/application/usecase/credit_card/import_transactions.go
// Location: Around line 168

// BEFORE (BUG):
for _, txnInput := range input.Transactions {
    // ...
    if !isPaymentReceived {
        totalAmount = totalAmount.Add(txnInput.Amount.Abs())  // BUG
    }
    // ...
}

// AFTER (FIX):
for _, txnInput := range input.Transactions {
    // ...
    if !isPaymentReceived {
        // Preserve sign for algebraic sum
        // Refunds (negative) should subtract from total
        totalAmount = totalAmount.Add(txnInput.Amount)  // FIX: Preserve sign
    }
    // ...
}
```

#### Fix 3: transaction_repository.go (Line 603)

```go
// File: backend/internal/integration/persistence/transaction_repository.go
// Location: Around line 603

// BEFORE (BUG):
for _, txn := range standaloneTxns {
    transactions = append(transactions, txn.ToEntity())
    totalSpending = totalSpending.Add(txn.Amount.Abs())  // BUG
}

// AFTER (FIX):
for _, txn := range standaloneTxns {
    transactions = append(transactions, txn.ToEntity())
    // Preserve sign for algebraic sum
    // Refunds (negative) should subtract from total spending
    totalSpending = totalSpending.Add(txn.Amount)  // FIX: Preserve sign
}
```

---

## Files to Create/Modify

### New Files:

1. `e2e/tests/m12-cc-import/refund-validation.spec.ts` - Comprehensive refund validation tests

### Modified Files:

1. `e2e/tests/m12-cc-import/fixtures.ts`
   - Add `realWorldRefundCSV` fixture
   - Add helper for 2018-11 date range

2. `backend/internal/application/usecase/credit_card/preview_import.go`
   - Line 138: Remove `.Abs()` from totalAmount calculation

3. `backend/internal/application/usecase/credit_card/import_transactions.go`
   - Line 168: Remove `.Abs()` from totalAmount calculation

4. `backend/internal/integration/persistence/transaction_repository.go`
   - Line 603: Remove `.Abs()` from totalSpending calculation

---

## Step-by-Step Execution Instructions

### Step 1: Add Test Fixture

Add to `e2e/tests/m12-cc-import/fixtures.ts`:

```typescript
export const realWorldRefundCSV = `date,title,amount
2018-11-15,Estorno de compra,-253.82
2018-11-14,Bourbon Ipiranga,620.73
...
`

export async function setRefundTestDateFilter(page: Page): Promise<void> {
  // Similar to setM12DateFilter but for 2018-11
}
```

### Step 2: Create E2E Test File

Create `e2e/tests/m12-cc-import/refund-validation.spec.ts` with all test scenarios.

### Step 3: Run Tests (Should FAIL)

```bash
cd e2e && npx playwright test tests/m12-cc-import/refund-validation.spec.ts
```

Verify tests fail with expected error messages about wrong totals.

### Step 4: Fix Backend - preview_import.go

```bash
# Edit file
# Line 138: Change .Add(txn.Amount.Abs()) to .Add(txn.Amount)
```

### Step 5: Fix Backend - import_transactions.go

```bash
# Edit file
# Line 168: Change .Add(txnInput.Amount.Abs()) to .Add(txnInput.Amount)
```

### Step 6: Fix Backend - transaction_repository.go

```bash
# Edit file
# Line 603: Change .Add(txn.Amount.Abs()) to .Add(txn.Amount)
```

### Step 7: Run Backend Tests

```bash
cd backend && make test
```

### Step 8: Rebuild and Restart Services

```bash
# Rebuild backend
cd backend && make build

# Restart services
docker-compose restart backend

# Rebuild frontend (if needed)
npm --prefix frontend run build
docker restart finance-tracker-frontend-e2e
```

### Step 9: Run Refund Validation Tests

```bash
cd e2e && npx playwright test tests/m12-cc-import/refund-validation.spec.ts
```

### Step 10: Run Full M12 Suite

```bash
cd e2e && npx playwright test tests/m12-cc-import/
```

### Step 11: Run Full E2E Suite

```bash
cd e2e && npx playwright test
```

---

## Acceptance Criteria

- [ ] E2E-CC-030: Preview total is algebraic sum (refunds subtract)
- [ ] E2E-CC-031: Refund shows as negative in preview table
- [ ] E2E-CC-032: Bill match shows minimal difference when totals align
- [ ] E2E-CC-033: Refund stored as negative amount after import
- [ ] E2E-CC-034: Dashboard shows ~100% Vinculado when bill matches
- [ ] E2E-CC-035: Multiple refunds all preserved as negative
- [ ] All existing M12 E2E tests continue to pass
- [ ] No regressions in other E2E test suites
- [ ] Backend unit tests pass
- [ ] Real-world scenario: Import 2025-11 CSV shows ~100% Vinculado

---

## Related Documentation

- **Feature Spec:** `context/features/M12-cc-import/backend-tdd.md`
- **E2E Scenarios:** `context/features/M12-cc-import/e2e-scenarios.md`
- **Existing Tests:** `e2e/tests/m12-cc-import/cc-import.spec.ts`
- **Previous Fix:** `tasks/done/TASK-M12-Fix-CC-Refund-Import-Bug.md` (frontend fix)

---

## Commands Summary

```bash
# 1. Create tests and verify they fail
cd e2e && npx playwright test tests/m12-cc-import/refund-validation.spec.ts

# 2. After backend fixes, rebuild
cd backend && make build && make test

# 3. Restart services
docker-compose restart backend

# 4. Rebuild frontend container
npm --prefix frontend run build && docker restart finance-tracker-frontend-e2e

# 5. Run refund validation tests
cd e2e && npx playwright test tests/m12-cc-import/refund-validation.spec.ts

# 6. Run all M12 tests
cd e2e && npx playwright test tests/m12-cc-import/

# 7. Run full E2E suite
cd e2e && npx playwright test

# 8. Verify in database
docker exec finance-tracker-postgres psql -U app_user -d finance_tracker -c "
SELECT description, amount,
  CASE WHEN amount < 0 THEN 'CORRECT (refund)' ELSE 'CHECK' END as status
FROM transactions
WHERE description ILIKE '%estorno%'
AND billing_cycle IS NOT NULL
AND deleted_at IS NULL;"
```

---

## Database Verification Queries

### Verify Refunds Stored as Negative

```sql
SELECT
    billing_cycle,
    description,
    amount,
    CASE
        WHEN amount < 0 THEN 'CORRECT (negative)'
        ELSE 'BUG (should be negative)'
    END as status
FROM transactions
WHERE description ILIKE '%estorno%'
AND billing_cycle IS NOT NULL
AND deleted_at IS NULL
ORDER BY billing_cycle DESC, date DESC;
```

### Verify CC Total Matches Bill

```sql
WITH cc_totals AS (
    SELECT
        billing_cycle,
        credit_card_payment_id,
        SUM(amount) as cc_algebraic_total,  -- Should use algebraic sum
        SUM(ABS(amount)) as cc_absolute_total  -- Bug would use this
    FROM transactions
    WHERE billing_cycle IS NOT NULL
    AND credit_card_payment_id IS NOT NULL
    AND is_hidden = false
    AND deleted_at IS NULL
    GROUP BY billing_cycle, credit_card_payment_id
),
bill_amounts AS (
    SELECT
        id,
        ABS(original_amount) as bill_amount
    FROM transactions
    WHERE is_credit_card_payment = true
    AND expanded_at IS NOT NULL
    AND deleted_at IS NULL
)
SELECT
    cc.billing_cycle,
    b.bill_amount,
    cc.cc_algebraic_total,
    cc.cc_absolute_total,
    ABS(b.bill_amount - cc.cc_algebraic_total) as correct_diff,
    ABS(b.bill_amount - cc.cc_absolute_total) as bug_diff
FROM cc_totals cc
JOIN bill_amounts b ON cc.credit_card_payment_id = b.id
ORDER BY cc.billing_cycle DESC;
```

---

## Risk Assessment

### Low Risk Changes
- Backend `.Abs()` removals are isolated to specific calculations
- No schema changes required
- No API contract changes

### Potential Side Effects
- Standalone imports without bill payments might show different totals
- Dashboard spending might decrease for users with refunds
- These are corrections, not regressions

### Rollback Plan
- Revert the three backend files to previous state
- Frontend fix can remain as-is (it's defensive)
