# Task: Group Dashboard Enhancement - Mirror Personal Dashboard

## Overview

Enhance the Group Dashboard to provide the same level of insight as the Personal Dashboard. Currently, the group dashboard only shows basic summary cards and simple lists. This task will add period selection, charts (trends + donut), member contribution visualization, and recent transactions - all reusing existing components where possible.

**Goal:** Transform the Group Dashboard into a full-featured dashboard mirroring the Personal Dashboard, with group-specific enhancements like member contribution breakdown.

---

## Current State Analysis

### What Exists

**Personal Dashboard Components** (`frontend/src/main/features/dashboard/`):
- `MetricCard.tsx` - Card with value, trend indicator, icon
- `PeriodSelector.tsx` - Dropdown for this_month/last_month/this_week/last_week
- `DonutChart.tsx` - Category breakdown visualization
- `TrendsChart.tsx` - Income vs Expenses over time
- `RecentTransactions.tsx` - List of recent transactions
- `GoalsProgress.tsx` - Spending limits progress bars
- `types.ts` - Type definitions for dashboard data

**Current Group Dashboard** (`frontend/src/main/features/groups/`):
- `GroupDashboardTab.tsx` - Basic implementation with 3 metric cards and 2 simple lists
- `GroupDetailScreen.tsx` - Parent component managing tabs and data fetching
- `types.ts` - `GroupSummary` type with basic fields

**Current GroupSummary Type:**
```typescript
interface GroupSummary {
  totalExpenses: number
  totalIncome: number
  netBalance: number
  expensesByMember: { memberId: string; memberName: string; total: number }[]
  expensesByCategory: { categoryId: string; categoryName: string; categoryColor: string; total: number }[]
}
```

### What's Missing

1. **Period Selector** - No ability to filter by time period
2. **Trends Chart** - No historical data visualization
3. **Donut Chart** - Category breakdown is just a list, not visual
4. **Member Contribution Chart** - Member breakdown is just a list
5. **Recent Transactions** - Dashboard doesn't show recent group transactions
6. **Trend Indicators** - No % change on metric cards
7. **Refresh Button** - No manual refresh capability
8. **Backend Trends Endpoint** - No `/groups/:id/trends` endpoint for historical data

---

## Execution Plan

### Phase 1: Frontend - Reuse Existing Components (No Backend Changes)

1. Add `PeriodSelector` to group dashboard header
2. Convert category list to `DonutChart` component
3. Create `MemberContributionChart` component (new, horizontal bar chart)
4. Add recent transactions section using group transactions data
5. Update `GroupDashboardTab` layout to match personal dashboard

### Phase 2: Backend - Add Trends Endpoint

1. Create `GET /api/v1/groups/:id/dashboard` endpoint with full dashboard data
2. Include trends data, category breakdown with percentages, and period filtering

### Phase 3: Frontend - Connect Enhanced Data

1. Connect period selector to API calls
2. Display trends chart with historical data
3. Add trend indicators to metric cards

### Phase 4: Verification

1. Run E2E tests for group dashboard
2. Visual verification of charts and components

---

## Detailed Specifications

### E2E Test Scenarios

Add to `e2e/tests/m9-groups/groups.spec.ts`:

```typescript
test('E2E-M9-10: Group dashboard should display charts and metrics', async ({ page }) => {
  // Step 1: Navigate to groups screen
  await page.goto('/groups')
  await expect(page.getByTestId('groups-screen')).toBeVisible()

  // Step 2: Click on a group
  const groupCard = page.getByTestId('group-card').first()
  if (!(await groupCard.isVisible())) {
    await page.getByTestId('new-group-btn').click()
    await page.getByTestId('group-name-input').fill('Dashboard Test Group')
    await page.getByTestId('save-group-btn').click()
  }
  await page.getByTestId('group-card').first().click()

  // Step 3: Verify group detail screen loads
  await expect(page.getByTestId('group-detail-screen')).toBeVisible()

  // Step 4: Verify dashboard tab is active and has components
  await expect(page.getByTestId('group-dashboard-tab')).toBeVisible()

  // Step 5: Verify period selector exists
  await expect(page.getByTestId('period-selector')).toBeVisible()

  // Step 6: Verify metric cards exist
  await expect(page.getByTestId('metric-card-expenses')).toBeVisible()
  await expect(page.getByTestId('metric-card-income')).toBeVisible()
  await expect(page.getByTestId('metric-card-balance')).toBeVisible()

  // Step 7: Verify charts or empty states exist
  const hasDonutChart = await page.getByTestId('category-donut').isVisible().catch(() => false)
  const hasTrendsChart = await page.getByTestId('trends-chart').isVisible().catch(() => false)
  const hasMemberChart = await page.getByTestId('member-contribution-chart').isVisible().catch(() => false)

  // At least the containers should exist (empty state or with data)
  expect(hasDonutChart || hasTrendsChart || hasMemberChart).toBeTruthy()
})

test('E2E-M9-11: Group dashboard period selector should work', async ({ page }) => {
  // Step 1: Navigate to a group
  await page.goto('/groups')
  await page.getByTestId('group-card').first().click()
  await expect(page.getByTestId('group-detail-screen')).toBeVisible()

  // Step 2: Click period selector
  await page.getByTestId('period-selector').click()

  // Step 3: Select a different period
  await page.getByRole('option', { name: /mes passado|last month/i }).click()

  // Step 4: Verify selection changed
  await expect(page.getByTestId('period-selector')).toContainText(/mes passado|last month/i)
})
```

### API Endpoint - Group Dashboard

#### GET /api/v1/groups/:id/dashboard

Returns comprehensive dashboard data for a group.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| period | string | No | this_month | Period filter: this_month, last_month, this_week, last_week |

**Response (200 OK):**
```json
{
  "summary": {
    "total_expenses": "5430.00",
    "total_income": "8200.00",
    "net_balance": "2770.00",
    "member_count": 4,
    "expenses_change": 12.5,
    "income_change": -5.2
  },
  "category_breakdown": [
    {
      "category_id": "uuid",
      "category_name": "Mercado",
      "category_color": "#EF4444",
      "amount": "1800.00",
      "percentage": 33.15
    }
  ],
  "member_breakdown": [
    {
      "member_id": "uuid",
      "member_name": "Joao Silva",
      "avatar_url": "https://...",
      "total": "2100.00",
      "percentage": 38.67,
      "transaction_count": 12
    }
  ],
  "trends": [
    {
      "date": "2024-11-01",
      "income": "2500.00",
      "expenses": "1800.00"
    }
  ],
  "recent_transactions": [
    {
      "id": "uuid",
      "description": "Supermercado",
      "amount": "-245.00",
      "date": "2024-11-15",
      "category_name": "Mercado",
      "category_color": "#EF4444",
      "member_name": "Joao Silva",
      "member_avatar_url": "https://..."
    }
  ]
}
```

---

## Files to Create/Modify

### New Files:

1. **`frontend/src/main/features/groups/components/MemberContributionChart.tsx`**
   - Horizontal bar chart showing member expense breakdown
   - Shows avatar, name, bar, amount, and percentage

### Modified Files:

1. **`frontend/src/main/features/groups/components/GroupDashboardTab.tsx`**
   - Complete rewrite to use dashboard components
   - Add period selector, charts, recent transactions

2. **`frontend/src/main/features/groups/GroupDetailScreen.tsx`**
   - Add period state and pass to dashboard tab
   - Handle refresh functionality

3. **`frontend/src/main/features/groups/types.ts`**
   - Extend `GroupSummary` with new fields for trends and breakdowns

4. **`frontend/src/main/features/groups/api/groups.ts`**
   - Add `fetchGroupDashboard(groupId, period)` function

5. **`backend/internal/integration/entrypoint/controller/group.go`**
   - Add `GetDashboard` handler method

6. **`backend/internal/integration/entrypoint/dto/group.go`**
   - Add dashboard response DTOs

7. **Router file**
   - Add route: `GET /groups/:id/dashboard`

---

## Step-by-Step Execution Instructions

### Step 1: Create MemberContributionChart Component

Create `frontend/src/main/features/groups/components/MemberContributionChart.tsx`:

```typescript
interface MemberContribution {
  memberId: string
  memberName: string
  avatarUrl?: string
  total: number
  percentage: number
  transactionCount: number
}

interface MemberContributionChartProps {
  data: MemberContribution[]
}

export function MemberContributionChart({ data }: MemberContributionChartProps) {
  if (data.length === 0) {
    return (
      <div
        data-testid="member-contribution-chart"
        className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4"
      >
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">
          Contribuicao por Membro
        </h3>
        <div className="text-center py-8 text-[var(--color-text-secondary)]">
          Nenhuma despesa no periodo
        </div>
      </div>
    )
  }

  const maxTotal = Math.max(...data.map((m) => m.total))

  return (
    <div
      data-testid="member-contribution-chart"
      className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4"
    >
      <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">
        Contribuicao por Membro
      </h3>
      <div className="space-y-4">
        {data.map((member) => (
          <div key={member.memberId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    member.memberName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-[var(--color-text)]">{member.memberName}</span>
              </div>
              <span className="text-[var(--color-text-secondary)]">
                {formatCurrency(member.total)} ({member.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                style={{ width: `${(member.total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Step 2: Update GroupDashboardTab Component

Rewrite `frontend/src/main/features/groups/components/GroupDashboardTab.tsx`:

```typescript
import { MetricCard } from '@main/features/dashboard/components/MetricCard'
import { DonutChart } from '@main/features/dashboard/components/DonutChart'
import { TrendsChart } from '@main/features/dashboard/components/TrendsChart'
import { MemberContributionChart } from './MemberContributionChart'
import { PeriodSelector } from '@main/features/dashboard/components/PeriodSelector'
import type { GroupDashboardData } from '../types'
import type { Period } from '@main/features/dashboard/types'

interface GroupDashboardTabProps {
  data: GroupDashboardData | null
  period: Period
  onPeriodChange: (period: Period) => void
  onRefresh: () => void
  isLoading: boolean
}

export function GroupDashboardTab({
  data,
  period,
  onPeriodChange,
  onRefresh,
  isLoading,
}: GroupDashboardTabProps) {
  if (!data) {
    return (
      <div data-testid="group-dashboard-empty" className="text-center py-12">
        {/* Empty state */}
      </div>
    )
  }

  // Transform data for dashboard components
  const categoryBreakdown = data.categoryBreakdown.map((cat) => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    categoryColor: cat.categoryColor,
    amount: cat.amount,
    percentage: cat.percentage,
  }))

  const trendsData = data.trends.map((t) => ({
    date: t.date,
    income: t.income,
    expenses: t.expenses,
  }))

  return (
    <div data-testid="group-summary" className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--color-text)]">
          Visao Geral
        </h2>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={onPeriodChange} />
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-[var(--color-background)]"
          >
            {/* Refresh icon */}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          testId="expenses"
          label="Despesas"
          value={data.summary.totalExpenses}
          change={data.summary.expensesChange}
          type="expenses"
        />
        <MetricCard
          testId="income"
          label="Receitas"
          value={data.summary.totalIncome}
          change={data.summary.incomeChange}
          type="income"
        />
        <MetricCard
          testId="balance"
          label="Saldo"
          value={data.summary.netBalance}
          type="balance"
        />
        <MetricCard
          testId="members"
          label="Membros Ativos"
          value={data.summary.memberCount}
          type="balance"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendsChart data={trendsData} />
        <DonutChart data={categoryBreakdown} />
      </div>

      {/* Member Contribution */}
      <MemberContributionChart data={data.memberBreakdown} />

      {/* Recent Transactions */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
        <h3 className="text-lg font-medium text-[var(--color-text)] mb-4">
          Transacoes Recentes do Grupo
        </h3>
        {data.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            Nenhuma transacao recente
          </div>
        ) : (
          <div className="space-y-3">
            {data.recentTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${tx.categoryColor}20` }}
                  >
                    {/* Category icon */}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {tx.description}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {tx.categoryName} - por {tx.memberName}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-red-500">
                  -{formatCurrency(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Step 3: Update Types

Update `frontend/src/main/features/groups/types.ts`:

```typescript
// Add new interfaces
export interface GroupDashboardSummary {
  totalExpenses: number
  totalIncome: number
  netBalance: number
  memberCount: number
  expensesChange?: number
  incomeChange?: number
}

export interface GroupCategoryBreakdown {
  categoryId: string
  categoryName: string
  categoryColor: string
  amount: number
  percentage: number
}

export interface GroupMemberBreakdown {
  memberId: string
  memberName: string
  avatarUrl?: string
  total: number
  percentage: number
  transactionCount: number
}

export interface GroupTrendPoint {
  date: string
  income: number
  expenses: number
}

export interface GroupDashboardData {
  summary: GroupDashboardSummary
  categoryBreakdown: GroupCategoryBreakdown[]
  memberBreakdown: GroupMemberBreakdown[]
  trends: GroupTrendPoint[]
  recentTransactions: GroupTransaction[]
}
```

### Step 4: Update API Client

Add to `frontend/src/main/features/groups/api/groups.ts`:

```typescript
export async function fetchGroupDashboard(
  groupId: string,
  period: Period = 'this_month'
): Promise<GroupDashboardData> {
  const response = await authenticatedFetch(
    `${API_BASE}/groups/${groupId}/dashboard?period=${period}`,
    { method: 'GET' }
  )

  if (!response.ok) {
    if (response.status === 404) {
      // Return empty dashboard data
      return {
        summary: { totalExpenses: 0, totalIncome: 0, netBalance: 0, memberCount: 0 },
        categoryBreakdown: [],
        memberBreakdown: [],
        trends: [],
        recentTransactions: [],
      }
    }
    throw new Error('Erro ao carregar dashboard do grupo')
  }

  const data = await response.json()
  return transformDashboardData(data)
}
```

### Step 5: Update GroupDetailScreen

Update `frontend/src/main/features/groups/GroupDetailScreen.tsx` to:
1. Add `period` state
2. Replace `fetchGroupSummary` with `fetchGroupDashboard`
3. Pass period and handlers to `GroupDashboardTab`

### Step 6: Backend - Add Dashboard Endpoint

Add `GetDashboard` handler to `backend/internal/integration/entrypoint/controller/group.go`:

```go
// GetDashboard handles GET /groups/:id/dashboard requests.
func (c *GroupController) GetDashboard(ctx *gin.Context) {
    userID, ok := middleware.GetUserIDFromContext(ctx)
    if !ok {
        ctx.JSON(http.StatusUnauthorized, dto.ErrorResponse{
            Error: "User not authenticated",
        })
        return
    }

    groupIDStr := ctx.Param("id")
    groupID, err := uuid.Parse(groupIDStr)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
            Error: "Invalid group ID format",
        })
        return
    }

    // Verify membership
    isMember, err := c.groupRepo.IsUserMemberOfGroup(ctx.Request.Context(), userID, groupID)
    if err != nil || !isMember {
        ctx.JSON(http.StatusForbidden, dto.ErrorResponse{
            Error: "You are not a member of this group",
        })
        return
    }

    // Parse period parameter
    period := ctx.DefaultQuery("period", "this_month")
    startDate, endDate := calculateDateRange(period)

    // Fetch dashboard data
    // ... aggregate summary, categories, members, trends, transactions

    response := dto.GroupDashboardResponse{
        Summary:           summaryData,
        CategoryBreakdown: categoryData,
        MemberBreakdown:   memberData,
        Trends:            trendsData,
        RecentTransactions: transactionsData,
    }

    ctx.JSON(http.StatusOK, response)
}
```

### Step 7: Register Route

Add to router:
```go
groups.GET("/:id/dashboard", groupController.GetDashboard)
```

---

## Acceptance Criteria

- [ ] Period selector is visible on group dashboard
- [ ] Changing period updates all dashboard data
- [ ] Metric cards display expenses, income, balance, and member count
- [ ] Metric cards show trend indicators (% change)
- [ ] Donut chart displays category breakdown visually
- [ ] Trends chart shows income vs expenses over time
- [ ] Member contribution chart shows horizontal bars with percentages
- [ ] Recent transactions section shows last 5 group transactions with member attribution
- [ ] Empty states display appropriately when no data
- [ ] Refresh button reloads dashboard data
- [ ] E2E tests pass: E2E-M9-10, E2E-M9-11
- [ ] All existing M9 tests continue to pass
- [ ] Frontend builds without errors
- [ ] Backend tests pass

---

## Visual Layout Reference

```
+----------------------------------------------------------+
| Visao Geral                    [Este Mes v] [Refresh]    |
+----------------------------------------------------------+
| +------------+ +------------+ +------------+ +----------+ |
| | Despesas   | | Receitas   | | Saldo      | | Membros  | |
| | R$ 5.430   | | R$ 8.200   | | R$ 2.770   | | 4        | |
| | ^12%       | | v5%        | |            | | ativos   | |
| +------------+ +------------+ +------------+ +----------+ |
+----------------------------------------------------------+
| +---------------------------+ +------------------------+ |
| | Evolucao Financeira       | | Despesas por Categoria | |
| |     [Line Chart]          | |     [Donut Chart]      | |
| |   Income vs Expenses      | |   with legend          | |
| +---------------------------+ +------------------------+ |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Contribuicao por Membro                              | |
| | Joao  [=================] R$ 2.1k (39%)              | |
| | Maria [==============]    R$ 1.8k (33%)              | |
| | Pedro [=========]         R$ 1.0k (18%)              | |
| | Ana   [=====]             R$ 530  (10%)              | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
| +------------------------------------------------------+ |
| | Transacoes Recentes do Grupo                         | |
| | Mercado Extra        -R$ 245    por Joao   15/11     | |
| | Conta de Luz         -R$ 180    por Maria  12/11     | |
| | Gasolina             -R$ 150    por Pedro  10/11     | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## Related Documentation

- **Personal Dashboard:** `frontend/src/main/features/dashboard/` - Components to reuse
- **Dashboard Types:** `frontend/src/main/features/dashboard/types.ts` - Type definitions
- **E2E Tests:** `e2e/tests/m9-groups/groups.spec.ts` - Group test patterns
- **Backend Groups:** `backend/internal/integration/entrypoint/controller/group.go`

---

## Commands to Run

```bash
# Run E2E test for group dashboard (should FAIL before implementation)
cd e2e && npx playwright test tests/m9-groups/groups.spec.ts -g "E2E-M9-10"

# Frontend development
cd frontend && npm run dev

# After implementation, verify all M9 tests pass
cd e2e && npx playwright test tests/m9-groups/

# Build checks
cd frontend && npm run build
cd backend && go build ./...
```

---

## Implementation Priority

**Phase 1 (Frontend Only - Quick Win):**
1. Add PeriodSelector component
2. Convert category list to DonutChart
3. Create MemberContributionChart
4. Update layout

This can be done without backend changes using existing `GroupSummary` data!

**Phase 2 (Backend Enhancement):**
1. Add trends endpoint
2. Add percentage calculations
3. Add period filtering

**Phase 3 (Full Integration):**
1. Connect trends chart
2. Add trend indicators
3. Recent transactions with member info
