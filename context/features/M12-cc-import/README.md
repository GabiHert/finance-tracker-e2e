# Feature: Credit Card Statement Import

**Code:** M12-cc-import
**Milestone:** M12
**Status:** Specification Complete

## Overview

Import detailed credit card statements (Nubank) and link them to existing "Pagamento de fatura" transactions, providing granular visibility into spending patterns. The system automatically matches credit card transactions with bill payments, handling partial payments and mismatches gracefully.

## Problem Statement

When importing a Nubank bank statement, credit card payments appear as a single aggregated transaction:

```
31/10/2025  |  Pagamento de fatura  |  -R$ 1.124,77
```

This hides the actual purchases. Users cannot see:
- Which merchants they spent money at
- Category breakdown (food, entertainment, etc.)
- Individual purchase amounts
- Installment details (Parcela X/Y)

## Solution

Allow users to import credit card detailed statements containing individual transactions:

```csv
date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-04,Pagamento recebido,-8235.79
```

The system will:
1. Parse the credit card statement (new "Nubank Credit Card" format in import wizard)
2. Automatically match "Pagamento recebido" entries with existing "Pagamento de fatura" transactions
3. Link detailed transactions to the original bill payment
4. Zero out the original (preserving original_amount) to avoid double-counting
5. Show match status warnings when amounts don't match exactly

## User Stories

- As a user, I want to import my Nubank credit card statement so that I can see individual purchases instead of just the total bill payment
- As a user, I want to see which category my credit card spending falls into so that I can track my expenses accurately
- As a user, I want to see installment information (Parcela X/Y) so that I know how many payments remain
- As a user, I want to import credit card statements in any order (before or after bank statement) so that I have flexibility
- As a user, I want to see warnings when credit card totals don't match bill payments so that I can identify missing transactions
- As a user, I want to collapse expanded credit card transactions back to the original single payment if needed

## Key Features

### Data Model (Hybrid Approach)

- **No double counting**: Original bill payment is zeroed; detailed transactions contain real amounts
- **Audit trail**: Original transaction preserved with `original_amount` for reference
- **Grouping**: Can filter/view all expenses from a specific billing cycle
- **Reversible**: Can "collapse" back to single transaction if needed

### Matching Logic

1. **Amount match**: Sum of CC transactions ≈ "Pagamento de fatura" amount (with tolerance)
2. **Date proximity**: "Pagamento recebido" date within ±3 days of "Pagamento de fatura" date
3. **Multiple bills**: Match by closest amount when multiple exist

### Match Status Display

- Dashboard card showing match status
- Transactions page banner for mismatches
- Flexible import - allows partial payments and resolves when updated statements imported

### Installments

Parse "Parcela X/Y" from transaction titles to extract:
- `installment_current`: Current installment number (1)
- `installment_total`: Total installments (3)

## Dependencies

- **Requires:**
  - M5-import (Existing import infrastructure)
  - M6-rules (Category auto-categorization)
- **Enables:**
  - Better spending insights on dashboard
  - Accurate category tracking for credit card purchases

## Specification Files

| File | Description |
|------|-------------|
| [ui-requirements.md](./ui-requirements.md) | Frontend UI specifications |
| [integration.md](./integration.md) | API contracts & state management |
| [backend-tdd.md](./backend-tdd.md) | Backend implementation specs |
| [infrastructure.md](./infrastructure.md) | Database migrations & infrastructure |
| [e2e-scenarios.md](./e2e-scenarios.md) | End-to-end test scenarios |

## Quick Links

- **Frontend Code:** `frontend/src/main/features/transactions/`
- **Backend Code:** `backend/internal/application/creditcard/`
- **E2E Tests:** `e2e/tests/m12-cc-import/`

## Database Changes

```sql
ALTER TABLE transactions ADD COLUMN credit_card_payment_id UUID REFERENCES transactions(id);
ALTER TABLE transactions ADD COLUMN billing_cycle VARCHAR(7);        -- e.g., "2025-10"
ALTER TABLE transactions ADD COLUMN original_amount DECIMAL(12,2);   -- preserved before zeroing
ALTER TABLE transactions ADD COLUMN is_credit_card_payment BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN expanded_at TIMESTAMP;           -- when CC details imported
ALTER TABLE transactions ADD COLUMN installment_current INT;         -- e.g., 1
ALTER TABLE transactions ADD COLUMN installment_total INT;           -- e.g., 3
ALTER TABLE transactions ADD COLUMN is_hidden BOOLEAN DEFAULT false; -- for internal transactions
```

## File Formats

### Nubank Credit Card Statement
```csv
date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-04,Pagamento recebido,-8235.79
```

### Nubank Bank Statement (existing)
```csv
Data,Valor,Identificador,Descricao
31/10/2025,-1124.77,uuid,Pagamento de fatura
```

## Implementation Checklist

- [ ] UI Requirements reviewed
- [ ] Integration contracts defined
- [ ] Backend TDD scenarios written
- [ ] Infrastructure migrations defined
- [ ] E2E scenarios defined
- [ ] Ready for implementation
