# Infrastructure: Credit Card Statement Import

**Feature Code:** M12-cc-import
**Last Updated:** 2025-12-04

---

## 1. Overview

### 1.1 Infrastructure Summary

This feature extends the existing `transactions` table with credit card-specific fields. No new tables are required, but several columns and indexes must be added to support bill payment matching, installment tracking, and the expand/collapse functionality.

### 1.2 Dependencies

- **Database:** PostgreSQL 15+
- **External Services:** None
- **Existing Tables:** `transactions`, `users`, `categories`

---

## 2. Database Migrations

### 2.1 Migration: Add Credit Card Fields to Transactions

**File:** `backend/internal/infrastructure/db/migrations/20251204_add_credit_card_fields.sql`

**Up Migration:**
```sql
-- Migration: Add credit card import fields to transactions
-- Feature: M12-cc-import
-- Description: Adds fields to support credit card statement import and bill matching

-- Add columns for credit card tracking
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS credit_card_payment_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(7),
    ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS is_credit_card_payment BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS expanded_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS installment_current INTEGER,
    ADD COLUMN IF NOT EXISTS installment_total INTEGER,
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Indexes for credit card queries
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card_payment_id
    ON transactions(credit_card_payment_id)
    WHERE credit_card_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_billing_cycle
    ON transactions(billing_cycle)
    WHERE billing_cycle IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_is_credit_card_payment
    ON transactions(is_credit_card_payment)
    WHERE is_credit_card_payment = true;

CREATE INDEX IF NOT EXISTS idx_transactions_is_hidden
    ON transactions(is_hidden)
    WHERE is_hidden = true;

-- Composite index for finding expandable bill payments
CREATE INDEX IF NOT EXISTS idx_transactions_user_cc_payment
    ON transactions(user_id, is_credit_card_payment, expanded_at)
    WHERE is_credit_card_payment = true;

-- Composite index for credit card status queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_billing_cycle
    ON transactions(user_id, billing_cycle, credit_card_payment_id)
    WHERE billing_cycle IS NOT NULL;

-- Constraint: installment_current must be <= installment_total and > 0
ALTER TABLE transactions
    ADD CONSTRAINT chk_installment_valid
    CHECK (
        installment_current IS NULL
        OR (installment_current > 0 AND installment_total IS NOT NULL AND installment_current <= installment_total)
    );

-- Constraint: original_amount only set when is_credit_card_payment is true
ALTER TABLE transactions
    ADD CONSTRAINT chk_original_amount_valid
    CHECK (
        original_amount IS NULL
        OR is_credit_card_payment = true
    );

-- Constraint: expanded_at only set when is_credit_card_payment is true
ALTER TABLE transactions
    ADD CONSTRAINT chk_expanded_at_valid
    CHECK (
        expanded_at IS NULL
        OR is_credit_card_payment = true
    );

-- Add comments for documentation
COMMENT ON COLUMN transactions.credit_card_payment_id IS 'Reference to the bill payment transaction this CC transaction belongs to';
COMMENT ON COLUMN transactions.billing_cycle IS 'Billing cycle in YYYY-MM format (e.g., 2025-10)';
COMMENT ON COLUMN transactions.original_amount IS 'Original amount before zeroing (for expanded bill payments)';
COMMENT ON COLUMN transactions.is_credit_card_payment IS 'True if this is a "Pagamento de fatura" transaction';
COMMENT ON COLUMN transactions.expanded_at IS 'Timestamp when bill was expanded with CC details';
COMMENT ON COLUMN transactions.installment_current IS 'Current installment number (1-based)';
COMMENT ON COLUMN transactions.installment_total IS 'Total number of installments';
COMMENT ON COLUMN transactions.is_hidden IS 'Hidden transactions (e.g., Pagamento recebido for audit)';
```

**Down Migration:**
```sql
-- Rollback: Remove credit card import fields from transactions
-- Feature: M12-cc-import

-- Drop constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_installment_valid;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_original_amount_valid;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_expanded_at_valid;

-- Drop indexes
DROP INDEX IF EXISTS idx_transactions_user_billing_cycle;
DROP INDEX IF EXISTS idx_transactions_user_cc_payment;
DROP INDEX IF EXISTS idx_transactions_is_hidden;
DROP INDEX IF EXISTS idx_transactions_is_credit_card_payment;
DROP INDEX IF EXISTS idx_transactions_billing_cycle;
DROP INDEX IF EXISTS idx_transactions_credit_card_payment_id;

-- Drop columns
ALTER TABLE transactions
    DROP COLUMN IF EXISTS credit_card_payment_id,
    DROP COLUMN IF EXISTS billing_cycle,
    DROP COLUMN IF EXISTS original_amount,
    DROP COLUMN IF EXISTS is_credit_card_payment,
    DROP COLUMN IF EXISTS expanded_at,
    DROP COLUMN IF EXISTS installment_current,
    DROP COLUMN IF EXISTS installment_total,
    DROP COLUMN IF EXISTS is_hidden;
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         users                                │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ email                                                        │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      transactions                            │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ user_id (FK → users.id)                                      │
│ category_id (FK → categories.id)                             │
│ date                                                         │
│ description                                                  │
│ amount                                                       │
│ type                                                         │
│ notes                                                        │
│ is_recurring                                                 │
│ uploaded_at                                                  │
│                                                              │
│ -- Credit Card Fields (NEW) --                               │
│ credit_card_payment_id (FK → transactions.id) ◄──────┐      │
│ billing_cycle                                         │      │
│ original_amount                                       │      │
│ is_credit_card_payment                               │      │
│ expanded_at                                          │      │
│ installment_current                                  │      │
│ installment_total                                    │      │
│ is_hidden                                            │      │
│                                                       │      │
│ created_at                                           │      │
│ updated_at                                           │      │
│ deleted_at                                           │      │
└───────────────────────────────────────────────────────┼──────┘
         │                                              │
         │ Self-referential (CC → Bill)                │
         └──────────────────────────────────────────────┘

Example Data Flow:

Bill Payment (is_credit_card_payment=true):
┌────────────────────────────────────────────────┐
│ id: "bill-123"                                 │
│ description: "Pagamento de fatura"             │
│ amount: 0.00  (zeroed)                         │
│ original_amount: -1124.77                      │
│ is_credit_card_payment: true                   │
│ expanded_at: "2025-12-04T10:00:00Z"           │
└────────────────────────────────────────────────┘
         ▲
         │ credit_card_payment_id
         │
┌────────┴───────────────────────────────────────┐
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ id: "cc-456"                             │ │
│  │ description: "Bourbon Ipiranga"          │ │
│  │ amount: -794.15                          │ │
│  │ credit_card_payment_id: "bill-123"       │ │
│  │ billing_cycle: "2025-10"                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ id: "cc-789"                             │ │
│  │ description: "Hospital - Parcela 1/3"    │ │
│  │ amount: -196.84                          │ │
│  │ credit_card_payment_id: "bill-123"       │ │
│  │ billing_cycle: "2025-10"                 │ │
│  │ installment_current: 1                   │ │
│  │ installment_total: 3                     │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### 3.2 Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| credit_card_payment_id | UUID | YES | NULL | FK to bill payment this CC transaction belongs to |
| billing_cycle | VARCHAR(7) | YES | NULL | Billing cycle "YYYY-MM" format |
| original_amount | DECIMAL(12,2) | YES | NULL | Original amount before zeroing |
| is_credit_card_payment | BOOLEAN | NO | false | True for "Pagamento de fatura" transactions |
| expanded_at | TIMESTAMPTZ | YES | NULL | When CC details were imported |
| installment_current | INTEGER | YES | NULL | Current installment (1-based) |
| installment_total | INTEGER | YES | NULL | Total installments |
| is_hidden | BOOLEAN | NO | false | Hidden from normal views |

### 3.3 Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| idx_transactions_credit_card_payment_id | credit_card_payment_id | B-tree (partial) | Find CC transactions for a bill |
| idx_transactions_billing_cycle | billing_cycle | B-tree (partial) | Filter by billing cycle |
| idx_transactions_is_credit_card_payment | is_credit_card_payment | B-tree (partial) | Find bill payments |
| idx_transactions_is_hidden | is_hidden | B-tree (partial) | Exclude hidden transactions |
| idx_transactions_user_cc_payment | user_id, is_credit_card_payment, expanded_at | B-tree (partial) | Find expandable bills |
| idx_transactions_user_billing_cycle | user_id, billing_cycle, credit_card_payment_id | B-tree (partial) | CC status queries |

### 3.4 Constraints

| Constraint | Type | Definition | Purpose |
|------------|------|------------|---------|
| transactions_credit_card_payment_fkey | FOREIGN KEY | credit_card_payment_id → transactions(id) | Self-referential integrity |
| chk_installment_valid | CHECK | installment_current > 0 AND <= installment_total | Valid installment range |
| chk_original_amount_valid | CHECK | original_amount NULL OR is_credit_card_payment | Only bills have original_amount |
| chk_expanded_at_valid | CHECK | expanded_at NULL OR is_credit_card_payment | Only bills can be expanded |

---

## 4. Environment Variables

### 4.1 Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection string | postgres://user:pass@localhost:5432/finance | Yes |

### 4.2 Feature Configuration (Optional)

```env
# Feature: M12-cc-import
# Optional tuning parameters

# Matching tolerance (cents) - amounts within this range are considered matching
CC_MATCH_AMOUNT_TOLERANCE=1000  # R$ 10.00 default

# Date proximity for matching (days)
CC_MATCH_DATE_PROXIMITY=5  # ±5 days default

# Maximum transactions per import
CC_IMPORT_MAX_TRANSACTIONS=500
```

---

## 5. Performance Considerations

### 5.1 Expected Data Volume

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| CC transactions per bill | 30-100 | Typical monthly CC usage |
| Bills per user per month | 1-3 | Most users have 1-2 credit cards |
| Total CC rows per user/year | 360-1200 | 12 months × 30-100 transactions |
| Row size increase | ~50 bytes/row | New columns are nullable |

### 5.2 Query Patterns

| Query | Frequency | Index Used | Expected Time |
|-------|-----------|------------|---------------|
| List transactions (excluding hidden) | High | idx_transactions_is_hidden | < 10ms |
| Get CC transactions for bill | Medium | idx_transactions_credit_card_payment_id | < 5ms |
| Find matching bills | Low (import only) | idx_transactions_user_cc_payment | < 20ms |
| CC status aggregate | Medium | idx_transactions_user_billing_cycle | < 30ms |
| Find expandable bills | Low | idx_transactions_user_cc_payment | < 10ms |

### 5.3 Query Examples

**Find bill payments ready for expansion:**
```sql
SELECT *
FROM transactions
WHERE user_id = $1
  AND is_credit_card_payment = true
  AND expanded_at IS NULL
  AND description ILIKE '%pagamento de fatura%'
  AND date BETWEEN $2 AND $3
ORDER BY date DESC;
```

**Get CC transactions for a specific bill:**
```sql
SELECT *
FROM transactions
WHERE credit_card_payment_id = $1
  AND deleted_at IS NULL
ORDER BY date DESC;
```

**Calculate CC status for a month:**
```sql
SELECT
    SUM(ABS(amount)) FILTER (WHERE credit_card_payment_id IS NOT NULL) AS matched_amount,
    SUM(ABS(amount)) FILTER (WHERE credit_card_payment_id IS NULL AND billing_cycle = $2) AS unmatched_amount,
    COUNT(*) FILTER (WHERE is_credit_card_payment = true AND expanded_at IS NOT NULL) AS expanded_bills
FROM transactions
WHERE user_id = $1
  AND (billing_cycle = $2 OR (is_credit_card_payment = true AND date >= $3 AND date <= $4))
  AND is_hidden = false
  AND deleted_at IS NULL;
```

### 5.4 Optimization Notes

- **Partial indexes**: All new indexes use WHERE clauses to minimize size
- **Self-referential FK**: Uses ON DELETE SET NULL to handle bill deletion gracefully
- **Nullable columns**: All CC-specific columns are nullable to avoid bloating non-CC transactions
- **Hidden flag**: Used instead of filtering by description for performance

---

## 6. Data Integrity

### 6.1 Cascade Rules

| Relationship | On Delete | Rationale |
|--------------|-----------|-----------|
| credit_card_payment_id → transactions | SET NULL | CC transactions become orphaned but preserved |
| user_id → users | CASCADE | All user data deleted together |

### 6.2 Transaction Integrity

**Import operation** (must be atomic):
```sql
BEGIN;
  -- 1. Create CC transactions with links
  INSERT INTO transactions (..., credit_card_payment_id, billing_cycle)
  VALUES (...);

  -- 2. Zero out the bill payment
  UPDATE transactions
  SET amount = 0,
      original_amount = amount,
      expanded_at = NOW()
  WHERE id = $bill_id;

COMMIT;
```

**Collapse operation** (must be atomic):
```sql
BEGIN;
  -- 1. Delete linked CC transactions
  DELETE FROM transactions
  WHERE credit_card_payment_id = $bill_id;

  -- 2. Restore bill payment
  UPDATE transactions
  SET amount = original_amount,
      original_amount = NULL,
      expanded_at = NULL
  WHERE id = $bill_id;

COMMIT;
```

---

## 7. Data Migration

### 7.1 Identifying Existing Bill Payments

After migration, identify existing "Pagamento de fatura" transactions:

```sql
-- Identify potential bill payments for future CC imports
UPDATE transactions
SET is_credit_card_payment = true
WHERE description ILIKE '%pagamento de fatura%'
  AND type = 'expense'
  AND is_credit_card_payment = false;
```

### 7.2 Rollback Plan

1. Run down migration to remove columns
2. Data is not lost - only CC-specific metadata removed
3. Original transactions remain intact

---

## 8. Deployment Checklist

### 8.1 Pre-Deployment

- [ ] Migration tested in local/staging environment
- [ ] Down migration tested (rollback capability)
- [ ] Query performance validated with production-like data
- [ ] Index creation time estimated (should be fast, partial indexes)
- [ ] Application code ready (handles new nullable fields)

### 8.2 Deployment Steps

1. **Backup** - Take database snapshot
2. **Apply migration** - Run up migration
   ```bash
   go run cmd/migrate/main.go up
   ```
3. **Deploy backend** - New code handles CC fields
4. **Deploy frontend** - Import wizard with CC format
5. **Verify** - Test import flow in production
6. **Monitor** - Check query performance, error rates

### 8.3 Post-Deployment

- [ ] Verify migration applied correctly
- [ ] Check index creation completed
- [ ] Monitor query performance (no degradation)
- [ ] Test CC import flow end-to-end
- [ ] Verify dashboard shows CC status correctly

---

## 9. Backup & Recovery

### 9.1 Backup Considerations

- CC fields included in standard transaction backups
- Point-in-time recovery supported
- No special backup procedures needed

### 9.2 Recovery Scenarios

| Scenario | Recovery Action |
|----------|-----------------|
| Accidental collapse | Restore from backup or re-import CC statement |
| Corrupted CC links | Re-run matching on affected bills |
| Migration failure | Run down migration, investigate, retry |

---

## 10. Monitoring

### 10.1 Key Metrics

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| CC import duration | > 30s | Import taking too long |
| CC match rate | < 80% | Most imports should match |
| Orphaned CC transactions | > 0 growth | CC transactions losing bill links |

### 10.2 Useful Queries

**Check CC import health:**
```sql
SELECT
    COUNT(*) AS total_cc_transactions,
    COUNT(credit_card_payment_id) AS linked,
    COUNT(*) - COUNT(credit_card_payment_id) AS orphaned
FROM transactions
WHERE billing_cycle IS NOT NULL
  AND deleted_at IS NULL;
```

**Find expanded bills:**
```sql
SELECT
    id,
    description,
    original_amount,
    expanded_at,
    (SELECT COUNT(*) FROM transactions t2 WHERE t2.credit_card_payment_id = t.id) AS linked_count
FROM transactions t
WHERE is_credit_card_payment = true
  AND expanded_at IS NOT NULL
ORDER BY expanded_at DESC
LIMIT 20;
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
