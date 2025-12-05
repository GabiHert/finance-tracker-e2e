# Task: Fix Group Dashboard to Display All Member Transactions

## Overview

When a user uploads transactions (e.g., NUBANK CSV) and belongs to a group, their transactions should automatically appear on the group dashboard. Currently, the group dashboard only shows transactions linked to "group categories" (`category.owner_type = 'group'`), not all transactions from group members.

**Goal:** Group dashboard should aggregate and display ALL transactions from ALL group members, regardless of category ownership.

---

## Current State Analysis

### What Exists

The group dashboard is implemented in:
- **Backend Repository:** `backend/internal/integration/persistence/group_repository.go`
- **Dashboard Methods (lines 320-653):**
  - `GetGroupDashboard()` - Main orchestrator
  - `getGroupDashboardSummary()` - Totals calculation
  - `getGroupCategoryBreakdown()` - Category expense breakdown
  - `getGroupMemberBreakdown()` - Member contribution breakdown
  - `getGroupTrends()` - Daily trends data
  - `getGroupRecentTransactions()` - Recent transactions list
  - `GetGroupDashboardPreviousPeriod()` - Comparison period

**Current Query Pattern (WRONG):**
```sql
FROM transactions t
INNER JOIN categories c ON c.id = t.category_id
WHERE c.owner_type = 'group'
  AND c.owner_id = ?
  AND t.date >= ?
  AND t.date <= ?
  AND t.deleted_at IS NULL
  AND c.deleted_at IS NULL
```

This filters transactions by:
1. Having a category assigned (INNER JOIN fails for NULL category_id)
2. That category being owned by the group

### What's Missing/Broken

**Expected Behavior:** When a user belongs to a group, ALL their transactions should be visible on the group dashboard.

**Required Query Pattern (CORRECT):**
```sql
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
  AND t.date >= ?
  AND t.date <= ?
  AND t.deleted_at IS NULL
```

This filters transactions by:
1. Transaction owner being a member of the group
2. Allows transactions without categories (LEFT JOIN)

---

## Execution Plan

### Phase 1: Create BDD Integration Tests (TDD)

Create failing BDD tests that verify group dashboard shows member transactions.

### Phase 2: Backend Implementation

Fix all 6 SQL queries in `group_repository.go` to filter by group members instead of group categories.

### Phase 3: E2E Tests

Create/update E2E tests that verify:
1. Upload transactions as a user
2. Create/join a group
3. Group dashboard shows the uploaded transactions

### Phase 4: Verification

Run all tests to ensure:
- New BDD tests pass
- Existing group tests still pass
- E2E tests pass

---

## Detailed Specifications

### BDD Test Scenarios

**File:** `backend/test/integration/features/group-dashboard-member-transactions.feature`

```gherkin
Feature: Group Dashboard Displays Member Transactions
  As a group member
  I want to see all transactions from group members on the dashboard
  So that I can track our shared financial activity

  Background:
    Given I am authenticated as "user1@example.com"
    And a group "Family" exists with me as admin
    And user "user2@example.com" is a member of group "Family"

  Scenario: Dashboard shows my transactions after joining a group
    Given I have the following transactions:
      | date       | description      | amount   | type    |
      | 2025-11-01 | Grocery Store    | -150.00  | expense |
      | 2025-11-02 | Salary           | 5000.00  | income  |
      | 2025-11-03 | Restaurant       | -75.50   | expense |
    When I request the group "Family" dashboard for period "2025-11-01" to "2025-11-30"
    Then the response status should be 200
    And the dashboard summary should show:
      | total_income  | 5000.00 |
      | total_expenses| 225.50  |
      | net_balance   | 4774.50 |
    And the recent transactions should include "Grocery Store"
    And the recent transactions should include "Salary"

  Scenario: Dashboard aggregates transactions from all members
    Given I have transaction "My Expense" for -100.00 on "2025-11-05"
    And user "user2@example.com" has transaction "Their Expense" for -200.00 on "2025-11-05"
    When I request the group "Family" dashboard for period "2025-11-01" to "2025-11-30"
    Then the dashboard summary should show total_expenses as 300.00
    And the member breakdown should include:
      | member              | total  |
      | user1@example.com   | 100.00 |
      | user2@example.com   | 200.00 |

  Scenario: Dashboard shows uncategorized transactions
    Given I have a transaction without category:
      | date       | description      | amount  | type    |
      | 2025-11-10 | Cash Withdrawal  | -500.00 | expense |
    When I request the group "Family" dashboard for period "2025-11-01" to "2025-11-30"
    Then the dashboard summary should include total_expenses of at least 500.00
    And the recent transactions should include "Cash Withdrawal"

  Scenario: Dashboard trends show daily aggregates from all members
    Given I have transaction "My Monday" for -50.00 on "2025-11-04"
    And user "user2@example.com" has transaction "Their Monday" for -75.00 on "2025-11-04"
    When I request the group "Family" dashboard for period "2025-11-01" to "2025-11-30"
    Then the trends should show date "2025-11-04" with expenses 125.00
```

### SQL Query Changes

#### 1. getGroupDashboardSummary (line 376-409)

**Current:**
```go
query := `
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0) as total_income
    FROM transactions t
    INNER JOIN categories c ON c.id = t.category_id
    WHERE c.owner_type = 'group'
      AND c.owner_id = ?
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
      AND c.deleted_at IS NULL
`
```

**Fixed:**
```go
query := `
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0) as total_income
    FROM transactions t
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
`
```

#### 2. getGroupCategoryBreakdown (line 411-459)

**Fixed:**
```go
query := `
    SELECT
        c.id as category_id,
        COALESCE(c.name, 'Sem categoria') as category_name,
        COALESCE(c.color, '#9CA3AF') as category_color,
        COALESCE(SUM(ABS(t.amount)), 0) as amount
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.type = 'expense'
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
    GROUP BY c.id, c.name, c.color
    ORDER BY amount DESC
`
```

#### 3. getGroupMemberBreakdown (line 461-516)

**Fixed:**
```go
query := `
    SELECT
        t.user_id,
        COALESCE(SUM(ABS(t.amount)), 0) as total,
        COUNT(*) as transaction_count
    FROM transactions t
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.type = 'expense'
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
    GROUP BY t.user_id
    ORDER BY total DESC
`
```

#### 4. getGroupTrends (line 518-557)

**Fixed:**
```go
query := `
    SELECT
        t.date,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as expenses
    FROM transactions t
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
    GROUP BY t.date
    ORDER BY t.date ASC
`
```

#### 5. getGroupRecentTransactions (line 559-625)

**Fixed:**
```go
query := `
    SELECT
        t.id,
        t.description,
        t.amount,
        t.date,
        t.type,
        COALESCE(c.name, 'Sem categoria') as category_name,
        COALESCE(c.color, '#9CA3AF') as category_color,
        t.user_id
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.deleted_at IS NULL
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ?
`
```

#### 6. GetGroupDashboardPreviousPeriod (line 627-653)

**Fixed:**
```go
query := `
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0) as total_income
    FROM transactions t
    WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)
      AND t.date >= ?
      AND t.date <= ?
      AND t.deleted_at IS NULL
`
```

---

## E2E Test Scenarios

**File:** `e2e/tests/m9-groups/group-dashboard-member-transactions.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { generateShortId } from '../fixtures/test-utils'

/**
 * M9-E2E: Group Dashboard Member Transactions
 *
 * Critical Fix Test: Verifies that when a user uploads transactions
 * and belongs to a group, those transactions appear on the group dashboard.
 */

const NUBANK_CSV_CONTENT = `Data,Valor,Identificador,Descrição
03/11/2025,-200.00,test-id-1,Test Expense 1
03/11/2025,1000.00,test-id-2,Test Income 1
04/11/2025,-150.50,test-id-3,Test Expense 2`

test.describe('M9: Group Dashboard Shows Member Transactions', () => {
    let testId: string
    let groupName: string

    test.beforeEach(async () => {
        testId = generateShortId()
        groupName = `Test Group ${testId}`
    })

    test('M9-DASH-001: Uploaded transactions should appear on group dashboard', async ({ page }) => {
        // Step 1: Create a group
        await page.goto('/groups')
        await expect(page.getByTestId('groups-screen')).toBeVisible()

        await page.getByTestId('new-group-btn').click()
        await page.getByTestId('group-name-input').fill(groupName)
        await page.getByTestId('save-group-btn').click()
        await expect(page.getByRole('dialog')).not.toBeVisible()

        // Step 2: Import transactions
        await page.goto('/transactions')
        await page.getByTestId('import-transactions-btn').click()

        const fileInput = page.locator('input[type="file"]')
        await fileInput.setInputFiles({
            name: `test-${testId}.csv`,
            mimeType: 'text/csv',
            buffer: Buffer.from(NUBANK_CSV_CONTENT),
        })

        await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 15000 })
        await page.getByTestId('import-next-btn').click()
        await page.getByTestId('import-confirm-btn').click()
        await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 30000 })

        // Close import modal
        const doneBtn = page.getByTestId('import-done-btn')
        if (await doneBtn.isVisible()) await doneBtn.click()

        // Step 3: Navigate to group dashboard
        await page.goto('/groups')
        await page.getByText(groupName).click()
        await expect(page.getByTestId('group-detail-screen')).toBeVisible()

        // Step 4: Go to dashboard tab
        await page.getByTestId('group-tabs').getByText(/dashboard/i).click()
        await expect(page.getByTestId('group-dashboard-tab')).toBeVisible()

        // Step 5: Verify transactions appear
        // Check summary shows our transactions
        const summary = page.getByTestId('group-summary')
        await expect(summary).toBeVisible()

        // Verify expenses include our 350.50 (200 + 150.50)
        const expensesText = await summary.getByTestId('total-expenses').textContent()
        expect(expensesText).toContain('350')

        // Verify income includes our 1000
        const incomeText = await summary.getByTestId('total-income').textContent()
        expect(incomeText).toContain('1.000')

        // Verify recent transactions show our descriptions
        const recentTransactions = page.getByTestId('group-recent-transactions')
        if (await recentTransactions.isVisible()) {
            const content = await recentTransactions.textContent()
            expect(content).toContain('Test')
        }
    })

    test('M9-DASH-002: Group dashboard should not be empty when user has transactions', async ({ page }) => {
        // This test verifies the bug fix - group dashboard was empty despite user having transactions

        // Step 1: Verify user has transactions on personal dashboard
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const personalExpenses = page.getByTestId('metric-card-expenses')
        const hasPersonalExpenses = await personalExpenses.isVisible()

        if (hasPersonalExpenses) {
            const expenseValue = await personalExpenses.getByTestId('metric-value').textContent()
            const hasExpenses = expenseValue && !expenseValue.includes('0,00')

            if (hasExpenses) {
                // Step 2: Check if user belongs to a group
                await page.goto('/groups')
                const groupCard = page.getByTestId('group-card').first()

                if (await groupCard.isVisible()) {
                    // Step 3: Go to group dashboard
                    await groupCard.click()
                    await page.getByTestId('group-tabs').getByText(/dashboard/i).click()

                    // Step 4: Group dashboard should NOT be empty
                    const groupSummary = page.getByTestId('group-summary')
                    const groupEmpty = page.getByTestId('group-dashboard-empty')

                    const hasSummary = await groupSummary.isVisible().catch(() => false)
                    const hasEmpty = await groupEmpty.isVisible().catch(() => false)

                    // If user has personal transactions and is in a group,
                    // group dashboard should show those transactions
                    if (hasPersonalExpenses) {
                        expect(hasSummary).toBe(true)
                        // Expenses should be > 0
                        const groupExpenses = await groupSummary.getByTestId('total-expenses').textContent()
                        expect(groupExpenses).not.toBe('R$ 0,00')
                    }
                }
            }
        }
    })
})
```

---

## Files to Create/Modify

### New Files:
- `backend/test/integration/features/group-dashboard-member-transactions.feature` - BDD test scenarios
- `e2e/tests/m9-groups/group-dashboard-member-transactions.spec.ts` - E2E tests

### Modified Files:
- `backend/internal/integration/persistence/group_repository.go` - Fix 6 SQL queries (lines 376-653)

---

## Step-by-Step Execution Instructions

### Step 1: Create BDD Feature File

Create the BDD feature file at `backend/test/integration/features/group-dashboard-member-transactions.feature` with the scenarios defined above.

### Step 2: Run BDD Tests (Should FAIL)

```bash
cd backend && make test-integration
```

Tests should fail because the current queries filter by group categories, not member transactions.

### Step 3: Fix Backend Queries

Edit `backend/internal/integration/persistence/group_repository.go`:

1. **Line 383-395:** Update `getGroupDashboardSummary` query
2. **Line 420-437:** Update `getGroupCategoryBreakdown` query
3. **Line 469-486:** Update `getGroupMemberBreakdown` query
4. **Line 526-540:** Update `getGroupTrends` query
5. **Line 572-589:** Update `getGroupRecentTransactions` query
6. **Line 634-646:** Update `GetGroupDashboardPreviousPeriod` query

For each query:
- Change `INNER JOIN categories c ON c.id = t.category_id` to `LEFT JOIN categories c ON c.id = t.category_id`
- Replace `WHERE c.owner_type = 'group' AND c.owner_id = ?` with `WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)`
- Remove `AND c.deleted_at IS NULL` (no longer needed)
- Add `COALESCE()` for category name/color to handle NULL categories

### Step 4: Run BDD Tests Again (Should PASS)

```bash
cd backend && make test-integration
```

### Step 5: Create E2E Test File

Create `e2e/tests/m9-groups/group-dashboard-member-transactions.spec.ts` with the test code above.

### Step 6: Run E2E Tests

```bash
cd e2e && npx playwright test tests/m9-groups/group-dashboard-member-transactions.spec.ts
```

### Step 7: Run All Tests

```bash
# Backend tests
cd backend && make test

# E2E tests
cd e2e && npx playwright test

# Frontend build
cd frontend && npm run build
```

---

## Acceptance Criteria

- [ ] Group dashboard summary shows aggregated totals from ALL member transactions
- [ ] Group dashboard works with transactions that have NO category assigned
- [ ] Member breakdown correctly shows each member's contribution
- [ ] Category breakdown groups transactions by category (including "Sem categoria" for NULL)
- [ ] Trends chart shows daily aggregates from all members
- [ ] Recent transactions list shows transactions from all members
- [ ] Uploading transactions as a group member immediately reflects on group dashboard
- [ ] All existing group E2E tests still pass
- [ ] All BDD integration tests pass
- [ ] No regressions in personal dashboard functionality

---

## Related Documentation

- **File:** `context/Finance-Tracker-Implementation-Guide-Complete-v1.md` - Milestone 9 specs
- **File:** `backend/CLAUDE.md` - Clean Architecture patterns for backend
- **Tests:** `e2e/tests/m9-groups/` - Existing group E2E tests
- **Tests:** `e2e/tests/m5-import/import-to-dashboard-flow.spec.ts` - Import flow tests

---

## Commands to Run

```bash
# Run backend BDD tests (should fail initially, pass after fix)
cd backend && make test-integration

# Run all backend tests
cd backend && make test

# Run specific E2E test file
cd e2e && npx playwright test tests/m9-groups/group-dashboard-member-transactions.spec.ts

# Run all E2E tests
cd e2e && npx playwright test

# Verify frontend builds
cd frontend && npm run build
```

---

## Technical Notes

### Why This Fix Works

1. **Member-based filtering:** `WHERE t.user_id IN (SELECT user_id FROM group_members WHERE group_id = ?)` includes ALL transactions from users who are members of the group.

2. **LEFT JOIN for categories:** Using `LEFT JOIN` instead of `INNER JOIN` ensures transactions without categories are still included.

3. **COALESCE for NULL handling:** Categories may be NULL, so we use `COALESCE(c.name, 'Sem categoria')` to provide defaults.

### Performance Consideration

The subquery `SELECT user_id FROM group_members WHERE group_id = ?` is efficient because:
- `group_members` table has an index on `group_id`
- The result set is typically small (groups have few members)
- PostgreSQL optimizes this pattern well

For very large groups, consider caching member IDs or using a materialized view.
