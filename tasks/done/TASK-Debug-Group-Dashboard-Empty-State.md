# Task: Debug Group Dashboard Showing Empty State Despite Having Transactions

## Problem Statement

The group dashboard shows "Nenhum dado disponivel" (No data available) even when the user has transactions. This occurs after the SQL queries were supposedly fixed to use member-based filtering instead of group-category filtering.

**Evidence:** Screenshot shows group "Teste" with Dashboard tab selected, "Este Mes" (This Month) period, displaying empty state.

---

## Investigation Summary

### What Was Already Fixed (Verified)

The SQL queries in `backend/internal/integration/persistence/group_repository.go` have been correctly updated:

| Method | Lines | Status |
|--------|-------|--------|
| `getGroupDashboardSummary` | 383-391 | ✅ Uses `WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)` |
| `getGroupCategoryBreakdown` | 417-431 | ✅ Uses member-based filtering with LEFT JOIN |
| `getGroupMemberBreakdown` | 464-475 | ✅ Uses member-based filtering |
| `getGroupTrends` | 518-530 | ✅ Uses member-based filtering |
| `getGroupRecentTransactions` | 563-576 | ✅ Uses member-based filtering (no date filter) |
| `GetGroupDashboardPreviousPeriod` | 619-630 | ✅ Uses member-based filtering |

### What Shows Empty State

The frontend shows empty state when ALL of these are true (file: `frontend/src/main/features/groups/components/GroupDashboardTab.tsx`):
```typescript
if (!data || (data.summary.totalExpenses === 0 && data.summary.totalIncome === 0 && data.memberBreakdown.length === 0)) {
    // Show "Nenhum dado disponivel"
}
```

---

## Possible Root Causes

### 1. User Not in group_members Table
Even though `CreateGroup` use case adds the creator as a member (lines 80-87 in `create_group.go`), there could be:
- A transaction error that wasn't caught
- Race condition
- Database inconsistency

**Verification Query:**
```sql
-- Check if user is member of their group
SELECT gm.*, g.name as group_name, u.email as user_email
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN users u ON u.id = gm.user_id
WHERE g.name = 'Teste';
```

### 2. No Transactions in Current Month
The dashboard filters by date range. If transactions are from November 2025 but we're viewing December 2025, they won't appear.

**Verification Query:**
```sql
-- Check transactions for the user in December 2025
SELECT t.date, t.description, t.amount, t.type, u.email
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE u.email = '<user_email>'
  AND t.date >= '2025-12-01'
  AND t.date <= '2025-12-31'
  AND t.deleted_at IS NULL;
```

### 3. Timezone Mismatch (Less Likely)
The backend calculates dates using UTC:
```go
now := time.Now().UTC()
today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
```

If the database stores dates in a different timezone, there could be off-by-one-day issues. However, `transactions.date` is `DATE` type (not `TIMESTAMP`), so this is unlikely.

---

## Execution Plan

### Phase 1: Database Verification

Run these queries to diagnose the issue:

```sql
-- 1. List all groups and their members
SELECT
    g.id as group_id,
    g.name as group_name,
    gm.user_id,
    u.email,
    gm.role,
    gm.joined_at
FROM groups g
LEFT JOIN group_members gm ON gm.group_id = g.id
LEFT JOIN users u ON u.id = gm.user_id
ORDER BY g.created_at DESC;

-- 2. Check if there are groups without members (orphaned groups)
SELECT g.id, g.name, g.created_by, g.created_at
FROM groups g
LEFT JOIN group_members gm ON gm.group_id = g.id
WHERE gm.id IS NULL;

-- 3. Count transactions per user in the current month
SELECT
    u.email,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END) as total_expenses,
    SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END) as total_income
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE t.date >= DATE_TRUNC('month', CURRENT_DATE)
  AND t.date <= CURRENT_DATE
  AND t.deleted_at IS NULL
GROUP BY u.email;

-- 4. Simulate the dashboard query for a specific group
SELECT
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0) as total_income
FROM transactions t
WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = '<GROUP_ID>')
  AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
  AND t.date <= CURRENT_DATE
  AND t.deleted_at IS NULL;
```

### Phase 2: Fix Identified Issue

Based on verification results:

#### If group_members is empty for the group:
Fix: Add the user back to the group_members table
```sql
INSERT INTO group_members (id, group_id, user_id, role, joined_at)
SELECT gen_random_uuid(), g.id, g.created_by, 'admin', g.created_at
FROM groups g
WHERE g.id = '<GROUP_ID>'
  AND NOT EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = g.created_by);
```

#### If no transactions in current month:
This is expected behavior - the dashboard correctly shows "No data" when there are no transactions in the selected period. User should:
- Import/add transactions for December 2025
- Or change the period filter to "Last Month" if they have November transactions

### Phase 3: BDD Test for This Scenario

Create a BDD test that specifically verifies:
1. User creates a group
2. User imports transactions
3. Group dashboard shows those transactions

**File:** `backend/test/integration/features/group-dashboard-member-transactions.feature`

```gherkin
Feature: Group Dashboard Displays Member Transactions
  As a group member
  I want to see my transactions on the group dashboard
  So that I can track our shared financial activity

  Background:
    Given I am authenticated as "dashboard-test@example.com"
    And I have no existing transactions
    And I have no existing groups

  Scenario: Dashboard shows transactions after creating group and adding transactions
    # Create group first
    When I create a group with name "My Test Group"
    Then the response status should be 201
    And I should be a member of group "My Test Group" with role "admin"

    # Add transaction in current month
    When I create a transaction with:
      | date        | <CURRENT_DATE>  |
      | description | Test Purchase   |
      | amount      | -100.00         |
      | type        | expense         |
    Then the response status should be 201

    # Verify dashboard shows the transaction
    When I request the group "My Test Group" dashboard for period "this_month"
    Then the response status should be 200
    And the dashboard summary should show total_expenses as 100.00
    And the member breakdown should include user "dashboard-test@example.com"

  Scenario: Dashboard shows empty state when no transactions in period
    When I create a group with name "Empty Dashboard Group"
    Then the response status should be 201

    When I request the group "Empty Dashboard Group" dashboard for period "this_month"
    Then the response status should be 200
    And the dashboard summary should show total_expenses as 0.00
    And the dashboard summary should show total_income as 0.00
```

---

## Files Involved

| File | Purpose |
|------|---------|
| `backend/internal/integration/persistence/group_repository.go` | SQL queries (already fixed) |
| `backend/internal/application/usecase/group/create_group.go` | Group creation with member |
| `backend/internal/application/usecase/group/get_group_dashboard.go` | Date range calculation |
| `frontend/src/main/features/groups/components/GroupDashboardTab.tsx` | Empty state condition |

---

## Quick Debug Commands

```bash
# Start backend and check logs
cd backend && make run

# Check database directly
docker exec -it postgres psql -U postgres -d finance_tracker

# Run specific BDD test
cd backend && make test-integration TAGS=@group-dashboard
```

---

## Expected Outcome

After investigation:
1. Identify why the specific group shows empty dashboard
2. Either fix database inconsistency OR confirm expected behavior (no transactions in period)
3. Add BDD test to prevent regression
4. User can see their transactions on group dashboard

---

## Notes

- The SQL queries in `group_repository.go` are CORRECT and already use member-based filtering
- The `transactions.date` column is `DATE` type (no timezone issues)
- The `CreateGroup` use case does add creator as admin member
- Most likely cause: no transactions in current month OR group_members table inconsistency
