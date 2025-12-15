# Infrastructure: Smart Credit Card Reconciliation

**Feature Code:** M15-smart-reconciliation
**Last Updated:** 2025-12-12

---

## 1. Overview

### 1.1 Infrastructure Summary
This feature primarily extends existing infrastructure from M12-cc-import. It adds a new index for efficient pending cycle queries and introduces a configuration table for matching tolerances. No new tables are required as the existing transaction schema supports all needed functionality.

### 1.2 Dependencies
- **Database:** PostgreSQL (existing)
- **Existing Tables:** transactions (with M12 credit card fields)
- **External Services:** None

### 1.3 Database Changes Summary

| Change Type | Description |
|-------------|-------------|
| New Index | Optimized query for pending CC transactions by billing cycle |
| New Index | Composite index for bill matching queries |
| New Table (Optional) | reconciliation_config for per-user tolerance settings |

---

## 2. Database Migrations

### 2.1 Migration: Add Reconciliation Indexes

**File:** `backend/scripts/migrations/000020_add_reconciliation_indexes.up.sql`

**Up Migration:**
```sql
-- Migration: Add reconciliation indexes for M15-smart-reconciliation
-- Purpose: Optimize queries for pending CC transactions and bill matching

-- Index for finding pending (unlinked) CC transactions grouped by billing cycle
-- Used by: GetPendingBillingCycles query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending_cc
ON transactions (user_id, billing_cycle)
WHERE billing_cycle IS NOT NULL
  AND credit_card_payment_id IS NULL
  AND deleted_at IS NULL
  AND is_hidden = false;

-- Index for finding potential bill payments in date range
-- Used by: FindPotentialBills query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_potential_bills
ON transactions (user_id, date, amount)
WHERE type = 'expense'
  AND expanded_at IS NULL
  AND deleted_at IS NULL
  AND (
    description ~* 'pagamento.*fatura|fatura.*cartao|cartao.*credito'
    OR is_credit_card_payment = true
  );

-- Index for checking if a bill is already linked
-- Used by: IsBillLinked query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_cc_payment_ref
ON transactions (credit_card_payment_id)
WHERE credit_card_payment_id IS NOT NULL
  AND deleted_at IS NULL;

-- Composite index for efficient billing cycle aggregation
-- Used by: Dashboard pending indicator query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_pending_summary
ON transactions (user_id, billing_cycle, amount)
WHERE billing_cycle IS NOT NULL
  AND credit_card_payment_id IS NULL
  AND deleted_at IS NULL
  AND is_hidden = false;

COMMENT ON INDEX idx_transactions_pending_cc IS 'M15: Find pending CC transactions by billing cycle';
COMMENT ON INDEX idx_transactions_potential_bills IS 'M15: Find potential bill payments for matching';
COMMENT ON INDEX idx_transactions_cc_payment_ref IS 'M15: Check if bill is already linked';
COMMENT ON INDEX idx_transactions_pending_summary IS 'M15: Dashboard pending reconciliation summary';
```

**Down Migration:**
```sql
-- Rollback: Remove reconciliation indexes

DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_pending_summary;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_cc_payment_ref;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_potential_bills;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_pending_cc;
```

---

### 2.2 Migration: Add Reconciliation Config (Optional)

**File:** `backend/scripts/migrations/000021_add_reconciliation_config.up.sql`

**Purpose:** Allow per-user customization of matching tolerances (future enhancement).

**Up Migration:**
```sql
-- Migration: Add reconciliation configuration table
-- Purpose: Store per-user matching tolerance settings

CREATE TABLE IF NOT EXISTS reconciliation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Amount tolerance settings
    amount_tolerance_percent DECIMAL(5, 4) NOT NULL DEFAULT 0.02,    -- 2%
    amount_tolerance_absolute INTEGER NOT NULL DEFAULT 2000,          -- R$ 20.00 in cents

    -- Date tolerance
    date_tolerance_days INTEGER NOT NULL DEFAULT 15,

    -- Confidence thresholds
    high_confidence_percent DECIMAL(5, 4) NOT NULL DEFAULT 0.005,    -- 0.5%
    high_confidence_absolute INTEGER NOT NULL DEFAULT 500,            -- R$ 5.00
    med_confidence_percent DECIMAL(5, 4) NOT NULL DEFAULT 0.02,      -- 2%
    med_confidence_absolute INTEGER NOT NULL DEFAULT 2000,            -- R$ 20.00

    -- Auto-link behavior
    auto_link_high_confidence BOOLEAN NOT NULL DEFAULT true,
    auto_link_medium_confidence BOOLEAN NOT NULL DEFAULT true,
    notify_on_auto_link BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT reconciliation_config_unique_user UNIQUE (user_id),
    CONSTRAINT reconciliation_config_percent_range
        CHECK (amount_tolerance_percent >= 0 AND amount_tolerance_percent <= 1),
    CONSTRAINT reconciliation_config_absolute_positive
        CHECK (amount_tolerance_absolute >= 0),
    CONSTRAINT reconciliation_config_days_positive
        CHECK (date_tolerance_days >= 0)
);

-- Trigger for updated_at
CREATE TRIGGER update_reconciliation_config_updated_at
    BEFORE UPDATE ON reconciliation_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reconciliation_config IS 'M15: Per-user reconciliation matching configuration';
COMMENT ON COLUMN reconciliation_config.amount_tolerance_percent IS 'Maximum allowed % difference for matching (0.02 = 2%)';
COMMENT ON COLUMN reconciliation_config.amount_tolerance_absolute IS 'Maximum allowed absolute difference in cents';
COMMENT ON COLUMN reconciliation_config.auto_link_high_confidence IS 'Automatically link high-confidence matches';
```

**Down Migration:**
```sql
-- Rollback: Remove reconciliation configuration table

DROP TRIGGER IF EXISTS update_reconciliation_config_updated_at ON reconciliation_config;
DROP TABLE IF EXISTS reconciliation_config;
```

---

## 3. Existing Schema Reference

### 3.1 Transaction Fields Used (from M12)

These fields already exist and are used by the reconciliation feature:

| Column | Type | Description |
|--------|------|-------------|
| `credit_card_payment_id` | UUID (FK) | Links CC transaction to bill payment |
| `billing_cycle` | VARCHAR(7) | Format: "YYYY-MM" |
| `original_amount` | DECIMAL(12,2) | Original bill amount before zeroing |
| `is_credit_card_payment` | BOOLEAN | Marks "Pagamento de fatura" transactions |
| `expanded_at` | TIMESTAMPTZ | When CC details were linked |
| `is_hidden` | BOOLEAN | Hides "Pagamento recebido" entries |

### 3.2 Key Existing Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_transactions_user_cc_payment` | (user_id, is_credit_card_payment, expanded_at) | Find expandable bills |
| `idx_transactions_user_billing_cycle` | (user_id, billing_cycle) | Query by billing cycle |
| `idx_transactions_credit_card_payment_id` | (credit_card_payment_id) | Find linked transactions |

---

## 4. Query Patterns

### 4.1 Get Pending Billing Cycles

```sql
-- Find all billing cycles with pending (unlinked) CC transactions
SELECT
    billing_cycle,
    COUNT(*) as transaction_count,
    SUM(ABS(amount)) as total_amount,
    MIN(date) as oldest_date,
    MAX(date) as newest_date
FROM transactions
WHERE user_id = $1
  AND billing_cycle IS NOT NULL
  AND credit_card_payment_id IS NULL
  AND deleted_at IS NULL
  AND is_hidden = false
GROUP BY billing_cycle
ORDER BY billing_cycle DESC;
```

**Expected Performance:** < 10ms with idx_transactions_pending_cc index

### 4.2 Find Potential Bills for a Billing Cycle

```sql
-- Find bill payments that could match a billing cycle
-- Date range: billing_cycle month ± 15 days
SELECT
    t.id,
    t.date,
    t.description,
    ABS(t.amount) as amount,
    c.name as category_name
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.date BETWEEN $2 AND $3  -- date range from billing_cycle
  AND t.expanded_at IS NULL
  AND t.deleted_at IS NULL
  AND (
    t.description ~* 'pagamento.*fatura|fatura.*cartao|cartao.*credito'
    OR t.is_credit_card_payment = true
  )
ORDER BY t.date DESC;
```

**Expected Performance:** < 20ms with idx_transactions_potential_bills index

### 4.3 Get Linked Billing Cycles

```sql
-- Get billing cycles that are already linked to bills
SELECT
    t.billing_cycle,
    COUNT(cc.id) as transaction_count,
    SUM(ABS(cc.amount)) as cc_total_amount,
    t.id as bill_id,
    t.date as bill_date,
    t.description as bill_description,
    t.original_amount as bill_original_amount,
    c.name as category_name
FROM transactions t
INNER JOIN transactions cc ON cc.credit_card_payment_id = t.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.is_credit_card_payment = true
  AND t.expanded_at IS NOT NULL
  AND t.deleted_at IS NULL
  AND cc.deleted_at IS NULL
  AND cc.is_hidden = false
GROUP BY t.id, t.billing_cycle, t.date, t.description, t.original_amount, c.name
ORDER BY t.billing_cycle DESC
LIMIT $2;
```

**Expected Performance:** < 30ms

### 4.4 Dashboard Pending Summary

```sql
-- Quick count of pending billing cycles for dashboard
SELECT
    COUNT(DISTINCT billing_cycle) as pending_months,
    array_agg(DISTINCT billing_cycle ORDER BY billing_cycle DESC) as cycles
FROM transactions
WHERE user_id = $1
  AND billing_cycle IS NOT NULL
  AND credit_card_payment_id IS NULL
  AND deleted_at IS NULL
  AND is_hidden = false
LIMIT 6;  -- Show at most 6 months
```

**Expected Performance:** < 5ms with idx_transactions_pending_summary index

---

## 5. Performance Considerations

### 5.1 Index Strategy

| Query Pattern | Index Used | Estimated Time |
|---------------|------------|----------------|
| Pending cycles list | idx_transactions_pending_cc | < 10ms |
| Potential bills search | idx_transactions_potential_bills | < 20ms |
| Bill link check | idx_transactions_cc_payment_ref | < 5ms |
| Dashboard summary | idx_transactions_pending_summary | < 5ms |

### 5.2 Data Volume Estimates

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| CC transactions per month | ~50-200 | Typical user |
| Billing cycles per user | ~12-24 | 1-2 years history |
| Potential bills per search | 1-3 | Usually single match |
| Pending cycles at any time | 0-3 | Depends on import habits |

### 5.3 Query Optimization Notes

1. **Partial indexes**: All new indexes use WHERE clauses to limit scope
2. **CONCURRENTLY**: Indexes created without locking the table
3. **Composite indexes**: Combined columns for common query patterns
4. **Covering indexes**: Include frequently selected columns

---

## 6. Environment Variables

### 6.1 Feature Configuration (Optional)

```env
# M15 Smart Reconciliation Settings (optional overrides)
RECONCILIATION_AMOUNT_TOLERANCE_PERCENT=0.02
RECONCILIATION_AMOUNT_TOLERANCE_ABSOLUTE=2000
RECONCILIATION_DATE_TOLERANCE_DAYS=15
RECONCILIATION_AUTO_LINK_ENABLED=true
```

These are optional; defaults are hardcoded in the application.

---

## 7. Deployment Checklist

### 7.1 Pre-Deployment

- [ ] Migration files created and tested locally
- [ ] Indexes verified with EXPLAIN ANALYZE
- [ ] Rollback scripts tested
- [ ] No schema conflicts with existing migrations
- [ ] Performance impact assessed (index builds)

### 7.2 Deployment Steps

1. **Database migration** (during low-traffic period)
   ```bash
   # Apply migration
   make db-migrate
   ```

2. **Verify indexes created**
   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'transactions'
   AND indexname LIKE 'idx_transactions_%';
   ```

3. **Deploy backend** with new reconciliation endpoints

4. **Deploy frontend** with UI changes

5. **Smoke test** reconciliation endpoints

### 7.3 Post-Deployment

- [ ] Verify index usage with `pg_stat_user_indexes`
- [ ] Check query performance in production
- [ ] Monitor error rates
- [ ] Validate auto-linking works correctly

---

## 8. Index Creation Time Estimates

| Index | Estimated Rows Scanned | Estimated Time |
|-------|------------------------|----------------|
| idx_transactions_pending_cc | ~1% of transactions | < 30s |
| idx_transactions_potential_bills | ~0.5% of transactions | < 20s |
| idx_transactions_cc_payment_ref | ~5% of transactions | < 30s |
| idx_transactions_pending_summary | ~1% of transactions | < 30s |

**Total estimated migration time:** < 2 minutes

**Note:** CONCURRENTLY creates indexes without blocking writes.

---

## 9. Monitoring Queries

### 9.1 Check Index Usage

```sql
-- Verify new indexes are being used
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_transactions_%'
ORDER BY idx_scan DESC;
```

### 9.2 Identify Slow Queries

```sql
-- Find slow reconciliation queries
SELECT
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
WHERE query LIKE '%billing_cycle%'
   OR query LIKE '%credit_card_payment_id%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 10. Backup & Recovery

### 10.1 Backup Considerations

- No new tables with critical data (config table is optional)
- Existing transaction data remains critical
- Index recreation is fast and can be done from existing data

### 10.2 Recovery Procedures

If indexes become corrupted:
```sql
-- Rebuild a specific index
REINDEX INDEX CONCURRENTLY idx_transactions_pending_cc;

-- Or rebuild all transaction indexes
REINDEX TABLE CONCURRENTLY transactions;
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Base Infrastructure:** `context/features/M12-cc-import/infrastructure.md`
