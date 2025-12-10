# Integration Specification: Category Expense Trends Chart

**Feature Code:** M13-category-trends
**Last Updated:** 2025-12-05

---

## 1. Overview

### 1.1 Integration Summary
The CategoryTrendsChart component fetches aggregated expense data grouped by category and time period from the backend API. The chart supports three granularities (daily, weekly, monthly) and responds to the dashboard's period selector.

### 1.2 API Base URL
```
/api/v1/dashboard/category-trends
```

---

## 2. API Endpoints

### 2.1 GET /api/v1/dashboard/category-trends

**Purpose:** Retrieve expense trends grouped by category over a time range

**Authentication:** Required (Bearer token)

**Request:**
```typescript
// Headers
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Query Parameters
{
  start_date: string;      // Required: YYYY-MM-DD
  end_date: string;        // Required: YYYY-MM-DD
  granularity: 'daily' | 'weekly' | 'monthly'; // Required
  top_categories?: number; // Optional: default 8
}
```

**Example Request:**
```
GET /api/v1/dashboard/category-trends?start_date=2024-11-01&end_date=2024-11-30&granularity=daily&top_categories=8
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    period: {
      start_date: string;  // YYYY-MM-DD
      end_date: string;    // YYYY-MM-DD
      granularity: 'daily' | 'weekly' | 'monthly';
    };
    categories: CategoryInfo[];
    trends: TrendDataPoint[];
  }
}

interface CategoryInfo {
  id: string;           // UUID
  name: string;
  color: string;        // Hex color
  total_amount: number; // Total for the entire period (for ranking)
  is_others: boolean;   // True if this is the "Others" aggregate
}

interface TrendDataPoint {
  date: string;         // YYYY-MM-DD (start of period for weekly/monthly)
  period_label: string; // Human-readable label ("15 Nov", "Sem 3", "Nov")
  amounts: {
    category_id: string;
    amount: number;     // Absolute value (positive)
  }[];
}
```

**Response Example:**
```json
{
  "data": {
    "period": {
      "start_date": "2024-11-01",
      "end_date": "2024-11-30",
      "granularity": "weekly"
    },
    "categories": [
      {
        "id": "cat-1",
        "name": "Alimentacao",
        "color": "#EF4444",
        "total_amount": 1500.00,
        "is_others": false
      },
      {
        "id": "cat-2",
        "name": "Transporte",
        "color": "#3B82F6",
        "total_amount": 800.00,
        "is_others": false
      },
      {
        "id": "others",
        "name": "Outros",
        "color": "#9CA3AF",
        "total_amount": 350.00,
        "is_others": true
      }
    ],
    "trends": [
      {
        "date": "2024-11-01",
        "period_label": "1-7 Nov",
        "amounts": [
          { "category_id": "cat-1", "amount": 350.00 },
          { "category_id": "cat-2", "amount": 200.00 },
          { "category_id": "others", "amount": 85.00 }
        ]
      },
      {
        "date": "2024-11-08",
        "period_label": "8-14 Nov",
        "amounts": [
          { "category_id": "cat-1", "amount": 420.00 },
          { "category_id": "cat-2", "amount": 180.00 },
          { "category_id": "others", "amount": 90.00 }
        ]
      }
    ]
  }
}
```

**Response (Error):**
```typescript
// Status: 400 | 401 | 500
{
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      message: string;
    }[];
  }
}
```

**Error Codes:**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid date format or range |
| 400 | INVALID_GRANULARITY | Granularity not one of: daily, weekly, monthly |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 500 | INTERNAL_ERROR | Server error |

**Frontend Usage:**
```typescript
// Location: frontend/src/main/features/dashboard/api/categoryTrends.ts

import { apiClient } from '@main/lib/api';

export interface CategoryTrendsParams {
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  granularity: 'daily' | 'weekly' | 'monthly';
  topCategories?: number;
}

export interface CategoryTrendsResponse {
  period: {
    startDate: string;
    endDate: string;
    granularity: 'daily' | 'weekly' | 'monthly';
  };
  categories: CategoryInfo[];
  trends: TrendDataPoint[];
}

export async function fetchCategoryTrends(
  params: CategoryTrendsParams
): Promise<CategoryTrendsResponse> {
  const response = await apiClient.get('/dashboard/category-trends', {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
      granularity: params.granularity,
      top_categories: params.topCategories ?? 8,
    },
  });
  return transformCategoryTrendsResponse(response.data.data);
}
```

---

## 3. State Management

### 3.1 Component State (Local)

The CategoryTrendsChart uses local component state since the data is specific to this visualization and doesn't need global sharing.

```typescript
// Location: frontend/src/main/features/dashboard/components/CategoryTrendsChart.tsx

interface CategoryTrendsState {
  // Data state
  data: CategoryTrendsResponse | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  granularity: 'daily' | 'weekly' | 'monthly';
  visibleCategories: Set<string>;  // Category IDs currently visible
  hoveredPoint: HoveredPoint | null;
}

interface HoveredPoint {
  date: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
  x: number;  // Screen position for tooltip
  y: number;
}
```

### 3.2 Props from Parent (Dashboard)

```typescript
interface CategoryTrendsChartProps {
  // Period comes from dashboard's period selector
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD

  // Callback for drill-down navigation
  onDrillDown?: (categoryId: string, date: string) => void;
}
```

### 3.3 State Updates

| Action | Trigger | State Update |
|--------|---------|--------------|
| fetchData | Mount, period change, granularity change | Set isLoading, then data or error |
| changeGranularity | Toggle click | Set granularity, trigger fetchData |
| toggleCategory | Legend click | Add/remove from visibleCategories |
| hoverPoint | Mouse over data point | Set hoveredPoint |
| unhoverPoint | Mouse leave | Set hoveredPoint to null |
| drillDown | Click data point | Call onDrillDown callback |

---

## 4. Error Handling

### 4.1 API Error Mapping

| Error Code | UI Response |
|------------|-------------|
| VALIDATION_ERROR | Show inline error message |
| UNAUTHORIZED | Redirect to login |
| INTERNAL_ERROR | Show error with retry button |

### 4.2 Network Errors

| Scenario | UI Response |
|----------|-------------|
| No connection | Show offline message, disable granularity toggle |
| Timeout | Show timeout error with retry button |

---

## 5. Data Transformations

### 5.1 API -> Frontend

```typescript
// Transform API response (snake_case) to frontend model (camelCase)
function transformCategoryTrendsResponse(
  apiResponse: ApiCategoryTrendsResponse
): CategoryTrendsResponse {
  return {
    period: {
      startDate: apiResponse.period.start_date,
      endDate: apiResponse.period.end_date,
      granularity: apiResponse.period.granularity,
    },
    categories: apiResponse.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      totalAmount: cat.total_amount,
      isOthers: cat.is_others,
    })),
    trends: apiResponse.trends.map((point) => ({
      date: point.date,
      periodLabel: point.period_label,
      amounts: point.amounts.map((a) => ({
        categoryId: a.category_id,
        amount: a.amount,
      })),
    })),
  };
}
```

### 5.2 Frontend -> Chart Data

```typescript
// Transform response to chart-ready format
function prepareChartData(
  data: CategoryTrendsResponse,
  visibleCategories: Set<string>
): ChartLine[] {
  const visibleCats = data.categories.filter(
    (cat) => visibleCategories.has(cat.id)
  );

  return visibleCats.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    points: data.trends.map((trend) => {
      const amount = trend.amounts.find(
        (a) => a.categoryId === category.id
      );
      return {
        date: trend.date,
        label: trend.periodLabel,
        value: amount?.amount ?? 0,
      };
    }),
  }));
}
```

---

## 6. Caching Strategy

### 6.1 Cache Rules

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| Category trends | 5 minutes | On transaction create/update/delete |
| N/A | N/A | When period changes, re-fetch |

### 6.2 Implementation

```typescript
// Simple cache key based on request params
function getCacheKey(params: CategoryTrendsParams): string {
  return `category-trends:${params.startDate}:${params.endDate}:${params.granularity}`;
}

// Cache in memory with timestamp
const cache = new Map<string, { data: CategoryTrendsResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache(params: CategoryTrendsParams): Promise<CategoryTrendsResponse> {
  const key = getCacheKey(params);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchCategoryTrends(params);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

---

## 7. Drill-Down Navigation

### 7.1 URL Construction

When user clicks a data point, navigate to transactions filtered by category and date range:

```typescript
function handleDrillDown(categoryId: string, date: string, granularity: 'daily' | 'weekly' | 'monthly') {
  let startDate: string;
  let endDate: string;

  switch (granularity) {
    case 'daily':
      startDate = date;
      endDate = date;
      break;
    case 'weekly':
      startDate = date; // Already start of week from API
      endDate = addDays(date, 6);
      break;
    case 'monthly':
      startDate = date; // Already start of month from API
      endDate = getEndOfMonth(date);
      break;
  }

  // Navigate to transactions with filters
  const params = new URLSearchParams({
    categoryId,
    startDate,
    endDate,
    type: 'expense',
  });

  navigate(`/transactions?${params.toString()}`);
}
```

---

## 8. Testing Contracts

### 8.1 Mock Data

```typescript
// Location: frontend/src/test/mocks/categoryTrends.ts

export const mockCategoryTrendsResponse: CategoryTrendsResponse = {
  period: {
    startDate: '2024-11-01',
    endDate: '2024-11-30',
    granularity: 'weekly',
  },
  categories: [
    { id: 'cat-1', name: 'Alimentacao', color: '#EF4444', totalAmount: 1500, isOthers: false },
    { id: 'cat-2', name: 'Transporte', color: '#3B82F6', totalAmount: 800, isOthers: false },
    { id: 'cat-3', name: 'Lazer', color: '#10B981', totalAmount: 600, isOthers: false },
    { id: 'others', name: 'Outros', color: '#9CA3AF', totalAmount: 350, isOthers: true },
  ],
  trends: [
    {
      date: '2024-11-01',
      periodLabel: '1-7 Nov',
      amounts: [
        { categoryId: 'cat-1', amount: 350 },
        { categoryId: 'cat-2', amount: 200 },
        { categoryId: 'cat-3', amount: 150 },
        { categoryId: 'others', amount: 85 },
      ],
    },
    {
      date: '2024-11-08',
      periodLabel: '8-14 Nov',
      amounts: [
        { categoryId: 'cat-1', amount: 420 },
        { categoryId: 'cat-2', amount: 180 },
        { categoryId: 'cat-3', amount: 160 },
        { categoryId: 'others', amount: 90 },
      ],
    },
    {
      date: '2024-11-15',
      periodLabel: '15-21 Nov',
      amounts: [
        { categoryId: 'cat-1', amount: 380 },
        { categoryId: 'cat-2', amount: 220 },
        { categoryId: 'cat-3', amount: 140 },
        { categoryId: 'others', amount: 95 },
      ],
    },
    {
      date: '2024-11-22',
      periodLabel: '22-28 Nov',
      amounts: [
        { categoryId: 'cat-1', amount: 350 },
        { categoryId: 'cat-2', amount: 200 },
        { categoryId: 'cat-3', amount: 150 },
        { categoryId: 'others', amount: 80 },
      ],
    },
  ],
};

export const mockEmptyTrendsResponse: CategoryTrendsResponse = {
  period: {
    startDate: '2024-11-01',
    endDate: '2024-11-30',
    granularity: 'weekly',
  },
  categories: [],
  trends: [],
};
```

### 8.2 API Mocks for E2E

```typescript
// Location: e2e/mocks/categoryTrends.ts

import { Page } from '@playwright/test';
import { mockCategoryTrendsResponse } from './data/categoryTrends';

export async function mockCategoryTrendsApi(page: Page, response = mockCategoryTrendsResponse) {
  await page.route('**/api/v1/dashboard/category-trends*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: response }),
    });
  });
}

export async function mockCategoryTrendsError(page: Page, statusCode = 500) {
  await page.route('**/api/v1/dashboard/category-trends*', (route) => {
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch category trends',
        },
      }),
    });
  });
}
```

---

## 9. Integration with Dashboard

### 9.1 Dashboard Data Flow

```
DashboardScreen
  |
  |-- period (from PeriodSelector)
  |-- customDateRange (from PeriodSelector)
  |
  +-- loadDashboardData()
        |
        +-- fetchDashboardData()     // Existing
        +-- fetchCategoryTrends()    // NEW
        +-- getCreditCardStatus()    // Existing
        |
        v
  setDashboardData({ ..., categoryTrends })
        |
        v
  <CategoryTrendsChart
    startDate={...}
    endDate={...}
    onDrillDown={handleDrillDown}
  />
```

### 9.2 Period Conversion

The dashboard uses period labels ('this_month', 'last_month', etc.) that need to be converted to date ranges:

```typescript
// Already exists in dashboard, reuse for category trends
function convertPeriodToDateRange(period: Period, customRange?: CustomDateRange): {
  startDate: string;
  endDate: string;
} {
  // ... existing implementation
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Existing Dashboard API:** `frontend/src/main/features/dashboard/api/dashboard.ts`
