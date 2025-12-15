# Task: Amount Sign Consistency Across Codebase

## Status: RESOLVED - No Changes Required

## Analysis Summary

After thorough investigation and E2E testing, the issues described in this task were found to be **non-issues** based on incorrect assumptions about the system design.

### Key Findings

1. **The system design is consistent:**
   - Amounts are stored as **positive values** (using `Math.abs()`)
   - Transaction `type` field ('expense' | 'income') determines direction
   - This is the correct design pattern for financial applications

2. **ImportWizard.tsx (line 188-189) is CORRECT:**
   ```typescript
   amount: Math.abs(amount),           // Always positive - correct
   type: amount < 0 ? 'expense' : 'income'  // Correctly maps sign to type
   ```
   - Negative CSV amounts → type='expense' (money out)
   - Positive CSV amounts → type='income' (money in, including refunds)

3. **Dashboard/Goals Math.abs() is CORRECT:**
   - Used for aggregation and display purposes
   - Totals should be positive numbers for clarity

4. **Backend DTO .Abs() is CORRECT:**
   - Used for display in API responses
   - Amounts shown to users should be positive with context (expense/income)

### E2E Tests Added

Created tests in `e2e/tests/amount-sign-consistency/bank-import-refund.spec.ts`:
- ASC-E2E-001: Bank transactions imported with correct type based on CSV sign
- ASC-E2E-002: Multiple refunds/credits correctly imported as income

Both tests **PASS** confirming the system works correctly.

### Database Comment Clarification

The migration comment saying "negative for expenses, positive for income" appears to be outdated or incorrect. The actual implementation uses:
- `amount`: Always positive (absolute value)
- `type`: 'expense' or 'income' to indicate direction

### Conclusion

No code changes are required. The system correctly handles:
- Bank statement imports with mixed debits/credits
- Credit card imports with refunds (already fixed in M12)
- Dashboard and goals calculations

## Original Task (For Reference)

The original task described potential issues with `Math.abs()`/`.Abs()` usage, but these were found to be intentional design choices that work correctly.

## Actions Taken

1. Created E2E tests to verify behavior
2. Analyzed actual implementation vs assumptions
3. Confirmed system works as intended
4. Added playwright config for new test project

## Files Modified

- `e2e/playwright.config.ts` - Added amount-sign-consistency project
- `e2e/tests/amount-sign-consistency/bank-import-refund.spec.ts` - Created E2E tests (PASSING)

---

*Task analyzed and resolved on 2025-12-15*
