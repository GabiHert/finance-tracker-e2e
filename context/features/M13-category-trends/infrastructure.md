# Infrastructure: Category Expense Trends Chart

**Feature Code:** M13-category-trends
**Last Updated:** 2025-12-05

---

## 1. Overview

### 1.1 Infrastructure Summary
This feature does not require new database tables. It leverages existing `transactions` and `categories` tables with optimized queries for time-series aggregation.

### 1.2 Dependencies
- **Database:** PostgreSQL (production) / SQLite (development/testing)
- **Existing Tables:** `transactions`, `categories`
- **External Services:** None

---

## 2. Database Schema (Existing)

### 2.1 Transactions Table (Reference)

```sql
-- Existing table - no changes required
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,  -- Negative for expenses
    type VARCHAR(20) NOT NULL,       -- 'expense' or 'income'
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,  -- Soft delete
    -- Credit card fields omitted for brevity
);

-- Existing indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_type ON transactions(type);
```

### 2.2 Categories Table (Reference)

```sql
-- Existing table - no changes required
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,       -- Hex color
    icon VARCHAR(50) NOT NULL,
    owner_type VARCHAR(20) NOT NULL, -- 'user' or 'group'
    owner_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,       -- 'expense' or 'income'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
);

CREATE INDEX idx_categories_owner ON categories(owner_type, owner_id);
```

---

## 3. Optimized Queries

### 3.1 Get Expense Transactions with Category (PostgreSQL)

```sql
-- Query: Fetch expense transactions with category info for a date range
-- Used by: GetExpensesByDateRange repository method

SELECT
    t.id,
    t.user_id,
    t.date,
    t.description,
    ABS(t.amount) as amount,  -- Ensure positive for display
    t.type,
    t.category_id,
    c.name as category_name,
    c.color as category_color
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.date >= $2
  AND t.date <= $3
  AND t.deleted_at IS NULL
  AND t.category_id IS NOT NULL  -- Exclude uncategorized
ORDER BY t.date ASC;
```

### 3.2 Aggregated Query (Alternative - Database-Side Aggregation)

For better performance with large datasets, aggregation can be done in SQL:

```sql
-- Query: Get category totals for ranking
-- Returns top N categories by total amount

WITH category_totals AS (
    SELECT
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        SUM(ABS(t.amount)) as total_amount
    FROM transactions t
    INNER JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND t.type = 'expense'
      AND t.date >= $2
      AND t.date <= $3
      AND t.deleted_at IS NULL
      AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.color
    ORDER BY total_amount DESC
)
SELECT
    category_id,
    category_name,
    category_color,
    total_amount,
    ROW_NUMBER() OVER (ORDER BY total_amount DESC) as rank
FROM category_totals;
```

### 3.3 Daily Aggregation Query

```sql
-- Query: Aggregate expenses by day and category
-- For daily granularity

SELECT
    DATE(t.date) as period_date,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(ABS(t.amount)) as total_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.date >= $2
  AND t.date <= $3
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY DATE(t.date), t.category_id, c.name, c.color
ORDER BY period_date ASC, total_amount DESC;
```

### 3.4 Weekly Aggregation Query (PostgreSQL)

```sql
-- Query: Aggregate expenses by ISO week and category
-- Uses Monday as week start

SELECT
    DATE_TRUNC('week', t.date)::DATE as week_start,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(ABS(t.amount)) as total_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.date >= $2
  AND t.date <= $3
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY DATE_TRUNC('week', t.date), t.category_id, c.name, c.color
ORDER BY week_start ASC, total_amount DESC;
```

### 3.5 Monthly Aggregation Query

```sql
-- Query: Aggregate expenses by month and category

SELECT
    DATE_TRUNC('month', t.date)::DATE as month_start,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(ABS(t.amount)) as total_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.date >= $2
  AND t.date <= $3
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', t.date), t.category_id, c.name, c.color
ORDER BY month_start ASC, total_amount DESC;
```

---

## 4. SQLite Compatibility

For development/testing with SQLite, date functions differ:

### 4.1 Weekly Aggregation (SQLite)

```sql
-- SQLite version: Group by week (approximate - starts Sunday)
SELECT
    DATE(t.date, 'weekday 0', '-6 days') as week_start,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(ABS(t.amount)) as total_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
  AND t.type = 'expense'
  AND t.date >= ?
  AND t.date <= ?
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY week_start, t.category_id, c.name, c.color
ORDER BY week_start ASC, total_amount DESC;
```

### 4.2 Monthly Aggregation (SQLite)

```sql
-- SQLite version: Group by month
SELECT
    DATE(t.date, 'start of month') as month_start,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(ABS(t.amount)) as total_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.user_id = ?
  AND t.type = 'expense'
  AND t.date >= ?
  AND t.date <= ?
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
GROUP BY month_start, t.category_id, c.name, c.color
ORDER BY month_start ASC, total_amount DESC;
```

---

## 5. Repository Implementation

### 5.1 PostgreSQL Repository

```go
// Location: backend/internal/integration/persistence/transaction_repository.go

func (r *TransactionRepository) GetExpensesByDateRange(
    ctx context.Context,
    userID uuid.UUID,
    startDate, endDate time.Time,
) ([]*entity.TransactionWithCategory, error) {
    query := `
        SELECT
            t.id,
            t.user_id,
            t.date,
            t.description,
            ABS(t.amount) as amount,
            t.type,
            t.category_id,
            c.name as category_name,
            c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL
        WHERE t.user_id = $1
          AND t.type = 'expense'
          AND t.date >= $2
          AND t.date <= $3
          AND t.deleted_at IS NULL
          AND t.category_id IS NOT NULL
        ORDER BY t.date ASC
    `

    rows, err := r.db.QueryContext(ctx, query, userID, startDate, endDate)
    if err != nil {
        return nil, fmt.Errorf("failed to query expenses: %w", err)
    }
    defer rows.Close()

    var transactions []*entity.TransactionWithCategory
    for rows.Next() {
        var tx entity.TransactionWithCategory
        err := rows.Scan(
            &tx.ID,
            &tx.UserID,
            &tx.Date,
            &tx.Description,
            &tx.Amount,
            &tx.Type,
            &tx.CategoryID,
            &tx.CategoryName,
            &tx.CategoryColor,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan transaction: %w", err)
        }
        transactions = append(transactions, &tx)
    }

    return transactions, nil
}

// GetCategoryTrendsAggregated performs aggregation at database level
func (r *TransactionRepository) GetCategoryTrendsAggregated(
    ctx context.Context,
    userID uuid.UUID,
    startDate, endDate time.Time,
    granularity string,
) ([]*entity.CategoryTrendAggregate, error) {
    var dateFunc string
    switch granularity {
    case "daily":
        dateFunc = "DATE(t.date)"
    case "weekly":
        dateFunc = "DATE_TRUNC('week', t.date)::DATE"
    case "monthly":
        dateFunc = "DATE_TRUNC('month', t.date)::DATE"
    default:
        return nil, errors.ErrInvalidGranularity
    }

    query := fmt.Sprintf(`
        SELECT
            %s as period_date,
            t.category_id,
            c.name as category_name,
            c.color as category_color,
            SUM(ABS(t.amount)) as total_amount
        FROM transactions t
        INNER JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
          AND t.type = 'expense'
          AND t.date >= $2
          AND t.date <= $3
          AND t.deleted_at IS NULL
          AND c.deleted_at IS NULL
        GROUP BY %s, t.category_id, c.name, c.color
        ORDER BY period_date ASC, total_amount DESC
    `, dateFunc, dateFunc)

    // Execute and scan...
}
```

---

## 6. Performance Considerations

### 6.1 Expected Data Volume

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| Transactions per user/month | ~100-500 | Average usage |
| Categories per user | 10-20 | Typical count |
| Query result size | ~500-2000 rows | For 6-month range |
| Response time target | < 200ms | With proper indexes |

### 6.2 Query Optimization

| Query | Index Used | Expected Time |
|-------|------------|---------------|
| Expense filter by user+date | idx_transactions_user_id, idx_transactions_date | < 50ms |
| Category join | idx_transactions_category_id | < 20ms |
| Date aggregation | Computed | < 100ms |

### 6.3 Existing Indexes (Sufficient)

The existing indexes are sufficient for this feature:
- `idx_transactions_user_id` - User filtering
- `idx_transactions_date` - Date range filtering
- `idx_transactions_type` - Expense filtering
- `idx_transactions_category_id` - Category join

### 6.4 Potential Optimization (If Needed)

If performance becomes an issue with large datasets, consider a composite index:

```sql
-- Only add if query performance degrades
CREATE INDEX idx_transactions_trends ON transactions(
    user_id,
    type,
    date,
    category_id
) WHERE deleted_at IS NULL;
```

---

## 7. Caching Considerations

### 7.1 Application-Level Cache

Since dashboard data changes infrequently within a session:

```go
// Cache key structure
func getCacheKey(userID uuid.UUID, startDate, endDate time.Time, granularity string) string {
    return fmt.Sprintf("category-trends:%s:%s:%s:%s",
        userID,
        startDate.Format("2006-01-02"),
        endDate.Format("2006-01-02"),
        granularity,
    )
}

// TTL: 5 minutes or until transaction modification
```

### 7.2 Cache Invalidation Triggers

| Event | Action |
|-------|--------|
| Transaction created | Invalidate user's cache |
| Transaction updated | Invalidate user's cache |
| Transaction deleted | Invalidate user's cache |
| Category updated | Invalidate user's cache |

---

## 8. Error Handling

### 8.1 Database Errors

| Error Type | Handling |
|------------|----------|
| Connection timeout | Retry once, then fail with 503 |
| Query timeout | Return partial results or fail gracefully |
| No results | Return empty arrays (not error) |

### 8.2 Data Integrity

- Transactions without category_id are excluded (not counted)
- Deleted transactions (deleted_at IS NOT NULL) are excluded
- Deleted categories result in NULL join (handled)

---

## 9. Migration (None Required)

This feature uses existing tables and indexes. No database migrations are required.

If the optional composite index is needed:

```sql
-- File: backend/internal/infrastructure/db/migrations/YYYYMMDD_add_trends_index.sql

-- Up
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_trends
ON transactions(user_id, type, date, category_id)
WHERE deleted_at IS NULL;

-- Down
DROP INDEX IF EXISTS idx_transactions_trends;
```

---

## 10. Monitoring

### 10.1 Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Query duration | Time to execute trends query | > 500ms |
| Cache hit rate | Percentage of cached responses | < 70% |
| Result set size | Number of rows returned | > 5000 |

### 10.2 Logging

```go
// Log slow queries
if queryDuration > 200*time.Millisecond {
    log.Warn("Slow category trends query",
        "user_id", userID,
        "duration_ms", queryDuration.Milliseconds(),
        "start_date", startDate,
        "end_date", endDate,
        "granularity", granularity,
    )
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
