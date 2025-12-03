# TASK-003: Frontend Dashboard API Integration

## Overview

- **Priority**: CRITICAL
- **Type**: Frontend Implementation
- **Prerequisite**: TASK-001 and TASK-002 completed (E2E tests fixed)
- **Expected Outcome**: Dashboard fetches real data from API, E2E tests pass

## Context Files

- Read `frontend-mock.md` for understanding current mock implementation
- Read `e2e-mock.md` for understanding what tests will verify

## Current State

**File**: `frontend/src/main/features/dashboard/DashboardScreen.tsx`

```typescript
// Lines 10-17: Imports mock data
import {
  mockSummary,
  mockCategoryBreakdown,
  mockTrendsData,
  mockRecentTransactions,
  mockGoalsProgress,
  mockAlerts,
} from "./mock-data";

// Lines 36-42: Uses hardcoded mock data
const summary = mockSummary;
const categoryBreakdown = mockCategoryBreakdown;
const trendsData = mockTrendsData;
const recentTransactions = mockRecentTransactions;
const goalsProgress = mockGoalsProgress;
const alerts = mockAlerts;
```

## Required Changes

### Step 1: Create Dashboard API Service

**Create File**: `frontend/src/main/features/dashboard/api/dashboard.ts`

```typescript
import { API_URL } from "@/config";

export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  incomeChange?: number;
  expensesChange?: number;
  savingsChange?: number;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface TrendDataPoint {
  date: string;
  income: number;
  expenses: number;
}

export interface DashboardAlert {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  goalId?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export async function fetchDashboardSummary(
  period:
    | "current_month"
    | "last_month"
    | "last_3_months"
    | "year" = "current_month"
): Promise<DashboardSummary> {
  const response = await fetch(
    `${API_URL}/dashboard/summary?period=${period}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard summary");
  }

  return response.json();
}

export async function fetchCategoryBreakdown(
  period:
    | "current_month"
    | "last_month"
    | "last_3_months"
    | "year" = "current_month"
): Promise<CategoryBreakdown[]> {
  const response = await fetch(
    `${API_URL}/dashboard/category-breakdown?period=${period}`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch category breakdown");
  }

  return response.json();
}

export async function fetchTrendsData(
  period:
    | "current_month"
    | "last_month"
    | "last_3_months"
    | "year" = "current_month"
): Promise<TrendDataPoint[]> {
  const response = await fetch(`${API_URL}/dashboard/trends?period=${period}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch trends data");
  }

  return response.json();
}

export async function fetchDashboardAlerts(): Promise<DashboardAlert[]> {
  const response = await fetch(`${API_URL}/dashboard/alerts`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return response.json();
}
```

### Step 2: Update DashboardScreen Component

**Update File**: `frontend/src/main/features/dashboard/DashboardScreen.tsx`

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  fetchDashboardSummary,
  fetchCategoryBreakdown,
  fetchTrendsData,
  fetchDashboardAlerts,
  DashboardSummary,
  CategoryBreakdown,
  TrendDataPoint,
  DashboardAlert,
} from "./api/dashboard";
import { fetchTransactions } from "../transactions/api/transactions";
import { fetchGoals } from "../goals/api/goals"; // Will need to create this

// Remove ALL mock data imports!
// DELETE: import { mockSummary, ... } from './mock-data'

export function DashboardScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current_month");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Real data state
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<
    CategoryBreakdown[]
  >([]);
  const [trendsData, setTrendsData] = useState<TrendDataPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [goalsProgress, setGoalsProgress] = useState<Goal[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

  // Fetch all dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        summaryData,
        breakdownData,
        trendsData,
        transactionsData,
        // goalsData, // Uncomment when goals API exists
        alertsData,
      ] = await Promise.all([
        fetchDashboardSummary(selectedPeriod as any),
        fetchCategoryBreakdown(selectedPeriod as any),
        fetchTrendsData(selectedPeriod as any),
        fetchTransactions({ limit: 5, sort: "-date" }),
        // fetchGoals(), // Uncomment when goals API exists
        fetchDashboardAlerts(),
      ]);

      setSummary(summaryData);
      setCategoryBreakdown(breakdownData);
      setTrendsData(trendsData);
      setRecentTransactions(transactionsData);
      // setGoalsProgress(goalsData) // Uncomment when goals API exists
      setAlerts(alertsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      console.error("Dashboard load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  // Load data on mount and when period changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle refresh button
  const handleRefresh = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle period change
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
  }, []);

  // Show loading state
  if (isLoading && !summary) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error && !summary) {
    return <DashboardError message={error} onRetry={loadDashboardData} />;
  }

  // Render with real data
  return (
    <div data-testid="dashboard-screen">
      {/* ... rest of component using real data from state ... */}
    </div>
  );
}
```

### Step 3: Delete Mock Data File

**Delete File**: `frontend/src/main/features/dashboard/mock-data.ts`

Or rename to `mock-data.ts.bak` to preserve for reference.

### Step 4: Backend API Endpoints Required

The following backend endpoints need to exist (or be created):

| Endpoint                               | Method | Response                                                        |
| -------------------------------------- | ------ | --------------------------------------------------------------- |
| `/api/v1/dashboard/summary`            | GET    | `{ totalBalance, totalIncome, totalExpenses, netSavings, ... }` |
| `/api/v1/dashboard/category-breakdown` | GET    | `[{ id, name, amount, percentage, color }, ...]`                |
| `/api/v1/dashboard/trends`             | GET    | `[{ date, income, expenses }, ...]`                             |
| `/api/v1/dashboard/alerts`             | GET    | `[{ id, type, title, message, goalId }, ...]`                   |

**Check if backend has these endpoints**:

```bash
# In backend directory
grep -r "dashboard" --include="*.go" cmd/ internal/
```

If endpoints don't exist, they need to be created in the backend first.

### Step 5: Alternative - Calculate from Existing Data

If backend dashboard endpoints don't exist, calculate from transactions:

```typescript
// In DashboardScreen.tsx
const loadDashboardData = useCallback(async () => {
  try {
    // Fetch transactions for the period
    const transactions = await fetchTransactions({
      startDate: getStartDate(selectedPeriod),
      endDate: getEndDate(selectedPeriod),
    });

    // Calculate summary from transactions
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netSavings = totalIncome - totalExpenses;

    // For balance, we might need to fetch all-time transactions or use a separate endpoint
    const allTransactions = await fetchTransactions();
    const totalBalance = allTransactions.reduce(
      (sum, t) =>
        t.type === "income" ? sum + t.amount : sum - Math.abs(t.amount),
      0
    );

    setSummary({
      totalBalance,
      totalIncome,
      totalExpenses,
      netSavings,
    });

    // Calculate category breakdown
    const expensesByCategory = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => {
        const categoryId = t.categoryId || "uncategorized";
        acc[categoryId] = (acc[categoryId] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const breakdown = Object.entries(expensesByCategory).map(
      ([id, amount]) => ({
        id,
        name: getCategoryName(id), // Need category lookup
        amount,
        percentage: (amount / totalExpenses) * 100,
        color: getCategoryColor(id),
      })
    );

    setCategoryBreakdown(breakdown);

    // Recent transactions (already have)
    setRecentTransactions(transactions.slice(0, 5));
  } catch (err) {
    setError(err.message);
  }
}, [selectedPeriod]);
```

---

## Validation

After implementation, run:

```bash
cd e2e && npx playwright test --project=m8-dashboard --reporter=list
```

**Expected Result**: All dashboard E2E tests should PASS

## Definition of Done

- [ ] Dashboard fetches data from API on mount
- [ ] Dashboard refreshes data when period selector changes
- [ ] Dashboard shows loading state while fetching
- [ ] Dashboard shows error state if API fails
- [ ] No mock data imports remain in DashboardScreen
- [ ] run /fix-tests
- [ ] All M8 E2E tests pass
- [ ] Dashboard shows R$ 0,00 for new users with no transactions
