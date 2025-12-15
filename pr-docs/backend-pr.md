# PR: Fix M12 Credit Card Refund Import - Preserve Negative Amounts

## Summary

This PR fixes a critical bug where refund transactions in credit card imports were being incorrectly converted to positive values, causing dashboard calculations to show inflated totals and incorrect percentages.

## Problem

When users import credit card CSV statements containing refund transactions:
- **CSV Entry Example:** `Estorno de compra,-253.82`
- **Expected Behavior:** Amount stored as -253.82 (a credit/reduction in spending)
- **Actual Behavior (Before Fix):** Amount stored as +253.82 (incorrectly added to spending)

### Impact on Dashboard
- "Vinculado" percentage showed 119% instead of ~100%
- Total spending calculations were inflated by the refund amount
- Example: R$253.82 refund doubled the impact (R$507.64 swing) by both losing the negative sign AND adding as positive

### Real-world Example (2025-11 billing cycle)

| Item | Amount | Issue |
|------|--------|-------|
| Bill payment | R$ 8,235.79 | - |
| Bourbon Ipiranga | +R$ 620.73 | - |
| Hospital São Lucas | +R$ 196.84 | - |
| Midea Com | +R$ 253.82 | - |
| **Estorno de compra (refund)** | **-R$ 253.82** | **Was converted to +R$ 253.82** |

**With the bug:** Total = R$ 9,841.73 (WRONG - 119% Vinculado)
**After fix:** Total = R$ 8,235.79 (CORRECT - ~100% Vinculado)

## Root Cause

Three backend files were using `.Abs()` to convert all transaction amounts to absolute values, which removed the semantic meaning of negative amounts (refunds/credits).

## Solution

Modified three key backend files to preserve the algebraic sign of transactions:

### 1. `internal/application/usecase/credit_card/preview_import.go`

**Change:** Preserve algebraic sum for refunds during preview (line ~138)

```go
// BEFORE: Using .Abs() for all transactions
totalAmount = totalAmount.Add(txn.Amount.Abs())

// AFTER: Preserve sign for algebraic sum
// Refunds (negative amounts like "Estorno de compra") should subtract from total
totalAmount = totalAmount.Add(txn.Amount)
```

### 2. `internal/application/usecase/credit_card/import_transactions.go`

**Change:** Keep negative amounts for refunds during actual import (line ~168)

```go
// Track total amount for standalone imports - preserve sign for algebraic sum
// Refunds (negative amounts) should subtract from total
if !isPaymentReceived {
    totalAmount = totalAmount.Add(txnInput.Amount)
}
```

### 3. `internal/integration/persistence/transaction_repository.go`

**Change:** Maintain sign in GetCreditCardStatus for standalone transactions (line ~603)

```go
// Calculate total spending from standalone transactions - preserve sign
// Refunds (negative amounts) should subtract from total
for _, txn := range standaloneTxns {
    totalSpending = totalSpending.Add(txn.Amount)  // Not .Abs()
}
```

## Key Design Decisions

1. **Algebraic Sum Principle:** By preserving the sign of all transactions:
   - Expenses (positive amounts) add to total
   - Refunds/Credits (negative amounts) subtract from total
   - Dashboard shows accurate net spending

2. **Payment Received Handling:** Bill payments ("Pagamento recebido") still use absolute values for amount matching (to find which bill this CC import relates to), but the actual transaction amounts in storage preserve their intended sign.

## Test Plan

- [x] E2E-CC-023: Refund transactions display with negative amounts in the UI
- [x] E2E-CC-024: Dashboard calculations correctly reflect refunds as spending reductions
- [x] E2E-CC-030: Preview total is algebraic sum (refunds subtract)
- [x] E2E-CC-031: Refund shows as negative in preview table
- [x] E2E-CC-032: Bill match shows minimal difference when totals align
- [x] E2E-CC-033: Refund stored as negative amount after import
- [x] E2E-CC-034: Dashboard shows ~100% Vinculado when bill matches
- [x] E2E-CC-035: Multiple refunds all preserved as negative

## Files Changed

- `internal/application/usecase/credit_card/preview_import.go`
- `internal/application/usecase/credit_card/import_transactions.go`
- `internal/integration/persistence/transaction_repository.go`

## Breaking Changes

None. This is a bug fix that corrects data integrity issues.

## Known Issues / Follow-up Items

The following issues were identified during code review and should be addressed in future PRs:

### Critical (Should Fix Soon)

1. **DTO Conversion Still Uses `.Abs()` (`credit_card.go:152,164-165`)**
   - `ccPaymentAmount.Abs()` in DTO conversion loses sign information for display
   - `amountDiff.Abs()` obscures whether CC total was higher or lower than bill
   - **Impact:** UI may show incorrect amount differences for refunds

2. **Inconsistent Tolerance Constants**
   - `preview_import.go`: R$ 10.00 tolerance (`AmountToleranceAbsolute = 10.0`)
   - `matching_config.go`: R$ 20.00 tolerance (`AmountToleranceAbsolute = 2000` cents)
   - **Impact:** Different matching behavior depending on code path

### Medium (Review Later)

3. **Reconciliation Uses `.Abs()` on Bill Amounts (`import_transactions.go:176,280`)**
   - Could incorrectly match opposite-sign transactions
   - Example: CC Total: -500 (refund) vs Bill: 500 (payment) = 1000 difference

4. **Sign Convention Documentation Needed**
   - Entity comment says "Negative for expenses, positive for income"
   - But CC import flow stores refunds as negative
   - Need to clarify sign semantics across the codebase

## Related PRs

- Frontend: fix/m12-cc-refund-import (fixes `Math.abs()` in transforms)
- E2E: fix/m12-cc-refund-import (adds refund validation tests)
