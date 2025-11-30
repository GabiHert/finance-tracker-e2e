# M7: Goals (Spending Limits) - QA Review Document

## Overview

| Property | Value |
|----------|-------|
| **Milestone** | M7 - Goals / Spending Limits |
| **Screens Covered** | GoalsScreen, GoalModal, GoalCard |
| **Priority** | High |
| **Test Files** | `e2e/tests/m7-goals/*.spec.ts` |

---

## Frontend Views Analyzed

### 1. Goals Screen (`GoalsScreen.tsx`)

**Location:** `frontend/src/main/features/goals/GoalsScreen.tsx`

**Components:**
- Page header with "Metas" or "Limites" title
- "Novo Limite" button
- Goals list with cards
- Goal card showing category, limit, current spend, progress
- Progress bar with percentage
- Over-limit warning indicators
- Edit and delete buttons per goal
- Empty state for no goals

**Features:**
- Monthly spending limits per category
- Real-time progress tracking
- Visual progress bar (color-coded)
- Over-limit alerts (red, pulsing)
- Alert notification option
- CRUD operations for goals

---

## E2E Test Scenarios

### Goals Management Tests (`goals.spec.ts`)

| Test ID | Test Name | Description | Status |
|---------|-----------|-------------|--------|
| M7-E2E-001 | Display goals screen with navigation | Tests screen load and button | Implemented |
| M7-E2E-002 | Create a monthly spending limit | Tests full creation flow | Implemented |
| M7-E2E-003 | Display goal progress correctly (under limit) | Tests progress bar and values | Implemented |
| M7-E2E-004 | Display over-limit warning (progress >= 100%) | Tests over-limit styling | Implemented |
| M7-E2E-005 | Edit a spending limit | Tests edit modal and update | Implemented |
| M7-E2E-006 | Delete a spending limit | Tests delete with confirmation | Implemented |
| M7-E2E-007 | Navigate to goals from sidebar | Tests navigation | Implemented |
| M7-E2E-008 | Display empty state when no goals exist | Tests empty state CTA | Implemented |
| M7-E2E-009 | Validate limit amount input | Tests required validation | Implemented |
| M7-E2E-010 | Cancel goal creation | Tests cancel button | Implemented |
| M7-E2E-011 | Display progress bar with correct fill percentage | Tests width style | Implemented |
| M7-E2E-012 | Show category icon and name on goal card | Tests visual elements | Implemented |
| M7-E2E-013 | Display amount in correct format | Tests currency formatting | Implemented |

---

## Coverage Analysis

### Specified vs Implemented

| Category | Specified in E2E Guide | Implemented | Coverage |
|----------|------------------------|-------------|----------|
| Goal CRUD | 4 | 5 | 125% |
| Progress Display | 3 | 4 | 133% |
| Over-Limit Alerts | 2 | 1 | 50% |
| Navigation | 1 | 1 | 100% |
| Validation | 1 | 2 | 200% |
| **Total** | **11** | **13** | **118%** |

### UI Elements Tested

| Element | Tested | Notes |
|---------|--------|-------|
| Goals list | Yes | Card layout |
| Goal creation modal | Yes | Form elements |
| Category selector | Yes | Dropdown |
| Amount input | Yes | Validation |
| Progress bar | Yes | Fill and color |
| Over-limit indicator | Yes | Red/pulsing |
| Edit button | Yes | Opens modal |
| Delete confirmation | Yes | Dialog |
| Empty state | Yes | CTA tested |
| Currency formatting | Yes | BRL format |

---

## Missing Test Scenarios

### 1. Goal Progress Update After Transaction (High Priority)
**Description:** Progress should update when transactions are added.

```gherkin
Scenario: Goal progress updates after new transaction
  Given I have a goal for "Food" category with limit R$500
  And I have spent R$200 on "Food" (40%)
  When I add a new "Food" transaction of R$100
  Then the progress should update to R$300 (60%)
```

### 2. Over-Limit Alert Banner on Dashboard (High Priority)
**Description:** Dashboard should show alert when over limit.

```gherkin
Scenario: Dashboard shows over-limit alert
  Given I have a goal that is 110% spent
  When I visit the dashboard
  Then I should see an alerts banner
  And it should mention the over-limit goal
```

### 3. Notification When Approaching Limit (Medium Priority)
**Description:** Alert when spending reaches 80% of limit.

```gherkin
Scenario: Alert when approaching limit
  Given I have a goal with limit R$500
  And I have spent R$390 (78%)
  When I add a transaction of R$20
  Then spending reaches 82%
  And I should see a warning notification
```

### 4. Multiple Goals for Same Category (Medium Priority)
**Description:** Prevent or handle duplicate category goals.

```gherkin
Scenario: Cannot create duplicate category goal
  Given I have a goal for "Food" category
  When I try to create another goal for "Food"
  Then I should see an error message
  Or I should be prompted to edit the existing goal
```

### 5. Goal Period Reset (Medium Priority)
**Description:** Goals reset at the start of each month.

```gherkin
Scenario: Goal progress resets monthly
  Given I have a goal with spending from last month
  When the month changes
  Then the progress should reset to 0%
  And previous month data should be historical
```

### 6. Goal History (Low Priority)
**Description:** View historical goal performance.

```gherkin
Scenario: View goal history
  Given I have a goal that has been tracked for 3 months
  When I view the goal details
  Then I should see historical performance data
  And I should see month-over-month comparison
```

### 7. Income Goals (Low Priority)
**Description:** Create goals for income categories.

```gherkin
Scenario: Create income goal
  Given I want to track my income target
  When I create a goal for an income category
  Then the goal should track income (not expenses)
  And progress should show positive values
```

---

## Recommendations

1. **Real-Time Updates:** Add tests for progress updates after transactions.

2. **Dashboard Integration:** Test over-limit alerts on dashboard.

3. **Notifications:** Implement and test warning notifications.

4. **Period Management:** Test monthly reset behavior.

5. **Historical Data:** Add goal performance history.

6. **Multiple Goals:** Clarify behavior for multiple goals per category.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Review | Initial review document |
