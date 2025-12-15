# PR: Fix M12 Credit Card Refund Import - Preserve Negative Amounts

## Summary

This PR fixes a critical bug in the frontend where refund transactions (negative amounts) were being incorrectly converted to positive expenses during CC import via `Math.abs()`, causing cascading calculation errors throughout the system.

## Problem

When importing credit card statements with refund transactions:
- **CSV Entry:** `Estorno de compra,-253.82`
- **Frontend Behavior (Before):** Converted to `+253.82` via `Math.abs()`
- **Result:** Refund became an expense, inflating dashboard totals

### User-Visible Symptoms
- Dashboard showed 119% "Vinculado" instead of ~100%
- "Não vinculado" showed incorrect amounts
- Total spending was inflated by double the refund amount

## Root Cause

The `transformTransactionToApi()` function was applying `Math.abs()` to ALL transaction amounts, removing the semantic meaning of negative values (refunds/credits).

## Solution

### 1. Fixed `transformTransactionToApi()` in `src/main/features/credit-card/api/credit-card.ts`

**Before (Buggy):**
```typescript
function transformTransactionToApi(tx: CreditCardTransaction): Record<string, unknown> {
    return {
        date: tx.date,
        description: tx.title,
        amount: Math.abs(tx.amount),  // BUG: Removes negative sign from refunds
        // ...
    }
}
```

**After (Fixed):**
```typescript
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
        // ...
    }
}
```

### 2. Fixed `transformCreditCardStatus()` in the same file

**Key Change:**
```typescript
// Calculate total CC transactions amount from summary
// Use algebraic sum (not absolute) so refunds subtract from total
const ccTransactionsTotal = (apiStatus.transactions_summary || []).reduce((sum, tx) => {
    return sum + parseFloat(tx.amount || '0')  // Uses actual signed amounts
}, 0)
```

## Key Design Decisions

1. **Conditional `Math.abs()` Usage:**
   - Only "Pagamento recebido" (payment received) transactions use `Math.abs()` because they're reference amounts for bill matching
   - All other transactions preserve their original sign

2. **Algebraic Sum for Status:**
   - Dashboard calculations now use algebraic sum instead of absolute values
   - Refunds correctly subtract from total spending

## Test Plan

- [x] E2E-CC-023: Refund transactions display with negative amounts in the UI
- [x] E2E-CC-024: Dashboard calculations correctly reflect refunds as spending reductions
- [x] E2E-CC-030: Preview total is algebraic sum (refunds subtract)
- [x] E2E-CC-031: Refund shows as negative in preview table
- [x] Manual testing with real Nubank CSV containing refund transactions

## Files Changed

- `src/main/features/credit-card/api/credit-card.ts` (lines 133-185, 214-231)

## Breaking Changes

None. This is a bug fix that corrects data integrity issues.

## Known Issues / Follow-up Items

The following issues were identified during code review and should be addressed in future PRs:

### Critical (Should Fix Soon)

1. **ImportWizard.tsx Inconsistent Amount Handling (line 188)**
   ```typescript
   amount: Math.abs(amount),
   type: amount < 0 ? 'expense' : 'income',
   ```
   - Type is determined from original sign, but amount is stored as absolute
   - This is inconsistent with the M12 fix pattern
   - **Impact:** Bank transaction imports may have similar refund issues

2. **Dashboard vs Goals Calculation Conflict**
   - `dashboard.ts:258-264`: Uses `Math.abs()` for category breakdown
   - `dashboard.ts:316`: Converts expenses to negative for recent transactions
   - `goals.ts:60`: Uses `Math.abs()` for goal progress
   - **Impact:** Category totals may not match when summing from different sources

### Medium (Review Later)

3. **Credit Card Parser Summary (`credit-card-parser.ts:199-201`)**
   - Uses `Math.abs()` for summary totals - hides refund activity in summaries

4. **BillSelectionModal Confidence Check (line 49)**
   - `Math.abs(diff) < 1` for exact match could hide directional errors
   - If bill=1000 and CC=-1000, diff=2000 but appears as 2000 difference

5. **MetricCard Double Negative Risk (line 113-114)**
   - Manually prepends minus sign to expenses
   - If value is already negative, displays as positive (double negative)

### Recommendation

Consider creating a shared amount normalization utility:
```typescript
// Proposed helper
function normalizeAmount(amount: number, type: 'expense' | 'income' | 'refund'): number {
  // Define consistent sign semantics
}
```

## Related PRs

- Backend: fix/m12-cc-refund-import (fixes `.Abs()` in Go calculations)
- E2E: fix/m12-cc-refund-import (adds refund validation tests)
