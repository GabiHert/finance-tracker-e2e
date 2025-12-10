# E2E Scenarios: Category Expense Trends Chart

**Feature Code:** M13-category-trends
**Last Updated:** 2025-12-05

---

## 1. Overview

### 1.1 Test Scope
End-to-end tests validating the Category Trends Chart functionality on the dashboard, including:
- Chart rendering with expense data
- Granularity toggle (daily/weekly/monthly)
- Legend interactions (show/hide categories)
- Tooltip display on hover
- Drill-down navigation to transactions
- Empty and error states
- Period selector integration

### 1.2 Test File Location
```
e2e/tests/M13-category-trends/category-trends.spec.ts
```

### 1.3 Prerequisites
- User authenticated
- At least one expense transaction with category

---

## 2. Test Configuration

### 2.1 Playwright Project Config

```typescript
// In playwright.config.ts, add:
{
  name: 'M13-category-trends',
  testDir: './tests/M13-category-trends',
  testMatch: '**/*.spec.ts',
  use: {
    ...devices['Desktop Chrome'],
  },
}
```

### 2.2 Test Fixtures

```typescript
// e2e/tests/M13-category-trends/fixtures.ts

import { test as base, expect } from '@playwright/test';
import { loginAsTestUser, createTestTransactions, clearTestData } from '../helpers/auth';

interface CategoryTrendsFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<CategoryTrendsFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsTestUser(page);
    await use(page);
  },
});

export { expect };
```

---

## 3. E2E Test Scenarios

### 3.1 Chart Display

#### E2E-CAT-TRENDS-001: Display Category Trends Chart on Dashboard

```gherkin
Scenario: User sees category trends chart on dashboard
  Given I am logged in
  And I have expense transactions in multiple categories
  When I navigate to the dashboard
  Then I should see the Category Trends Chart section
  And the section title should be "Despesas por Categoria"
  And I should see the granularity toggle with "Diario", "Semanal", "Mensal"
  And I should see the chart with category lines
  And I should see the legend with category names and colors
```

```typescript
test('E2E-CAT-TRENDS-001: Display category trends chart', async ({ authenticatedPage: page }) => {
  // Setup: Create test transactions
  await createTestTransactions(page, [
    { date: '2024-11-01', amount: -150, category: 'Alimentacao' },
    { date: '2024-11-02', amount: -80, category: 'Transporte' },
    { date: '2024-11-03', amount: -200, category: 'Alimentacao' },
  ]);

  await page.goto('/dashboard');

  // Verify chart section exists
  const chartSection = page.locator('[data-testid="category-trends-section"]');
  await expect(chartSection).toBeVisible();

  // Verify title
  await expect(chartSection.locator('h2, h3')).toContainText('Despesas por Categoria');

  // Verify granularity toggle
  await expect(page.locator('[data-testid="granularity-toggle"]')).toBeVisible();
  await expect(page.locator('[data-testid="granularity-daily"]')).toBeVisible();
  await expect(page.locator('[data-testid="granularity-weekly"]')).toBeVisible();
  await expect(page.locator('[data-testid="granularity-monthly"]')).toBeVisible();

  // Verify chart is rendered
  await expect(page.locator('[data-testid="category-trends-chart"] svg')).toBeVisible();

  // Verify legend
  await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible();
  await expect(page.locator('[data-testid="legend-item-Alimentacao"]')).toBeVisible();
  await expect(page.locator('[data-testid="legend-item-Transporte"]')).toBeVisible();
});
```

#### E2E-CAT-TRENDS-002: Chart Respects Dashboard Period Selector

```gherkin
Scenario: Chart data updates when period changes
  Given I am logged in
  And I have expenses in November and December
  When I am on the dashboard with "this_month" selected
  Then the chart should show only current month data
  When I change the period to "last_month"
  Then the chart should update to show last month data
```

```typescript
test('E2E-CAT-TRENDS-002: Chart respects period selector', async ({ authenticatedPage: page }) => {
  // Setup transactions in different months
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const lastMonth = new Date(now.setMonth(now.getMonth() - 1)).toISOString().slice(0, 7);

  await createTestTransactions(page, [
    { date: `${thisMonth}-15`, amount: -100, category: 'Alimentacao' },
    { date: `${lastMonth}-15`, amount: -200, category: 'Transporte' },
  ]);

  await page.goto('/dashboard');

  // Default is this_month - should see Alimentacao
  await expect(page.locator('[data-testid="legend-item-Alimentacao"]')).toBeVisible();

  // Change to last_month
  await page.click('[data-testid="period-selector"]');
  await page.click('[data-testid="period-last_month"]');

  // Wait for chart to update
  await page.waitForResponse(resp => resp.url().includes('/category-trends'));

  // Should now see Transporte
  await expect(page.locator('[data-testid="legend-item-Transporte"]')).toBeVisible();
});
```

### 3.2 Granularity Toggle

#### E2E-CAT-TRENDS-003: Switch Between Granularities

```gherkin
Scenario: User switches between daily, weekly, and monthly views
  Given I am logged in with expenses across multiple days
  When I am on the dashboard
  Then the daily view should be selected by default

  When I click "Semanal" (weekly)
  Then the chart should re-render with weekly aggregation
  And the x-axis labels should show week ranges

  When I click "Mensal" (monthly)
  Then the chart should re-render with monthly aggregation
  And the x-axis labels should show month names
```

```typescript
test('E2E-CAT-TRENDS-003: Switch between granularities', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-01', amount: -100, category: 'Alimentacao' },
    { date: '2024-11-08', amount: -150, category: 'Alimentacao' },
    { date: '2024-11-15', amount: -200, category: 'Alimentacao' },
  ]);

  await page.goto('/dashboard');

  // Verify daily is default
  await expect(page.locator('[data-testid="granularity-daily"]')).toHaveClass(/active|selected/);

  // Switch to weekly
  await page.click('[data-testid="granularity-weekly"]');
  await page.waitForResponse(resp => resp.url().includes('granularity=weekly'));
  await expect(page.locator('[data-testid="granularity-weekly"]')).toHaveClass(/active|selected/);

  // Switch to monthly
  await page.click('[data-testid="granularity-monthly"]');
  await page.waitForResponse(resp => resp.url().includes('granularity=monthly'));
  await expect(page.locator('[data-testid="granularity-monthly"]')).toHaveClass(/active|selected/);
});
```

### 3.3 Legend Interactions

#### E2E-CAT-TRENDS-004: Toggle Category Visibility via Legend

```gherkin
Scenario: User hides and shows categories using legend
  Given I am logged in with expenses in 3 categories
  When I am on the dashboard
  Then all 3 category lines should be visible

  When I click on "Alimentacao" in the legend
  Then the "Alimentacao" line should fade out
  And the legend item should appear dimmed/crossed

  When I click on "Alimentacao" again
  Then the "Alimentacao" line should reappear
```

```typescript
test('E2E-CAT-TRENDS-004: Toggle category visibility', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-01', amount: -100, category: 'Alimentacao' },
    { date: '2024-11-01', amount: -80, category: 'Transporte' },
    { date: '2024-11-01', amount: -60, category: 'Lazer' },
  ]);

  await page.goto('/dashboard');

  // All lines visible initially
  await expect(page.locator('[data-testid="chart-line-Alimentacao"]')).toBeVisible();
  await expect(page.locator('[data-testid="chart-line-Transporte"]')).toBeVisible();
  await expect(page.locator('[data-testid="chart-line-Lazer"]')).toBeVisible();

  // Click to hide Alimentacao
  await page.click('[data-testid="legend-item-Alimentacao"]');

  // Line should be hidden (or have reduced opacity)
  await expect(page.locator('[data-testid="chart-line-Alimentacao"]')).toHaveCSS('opacity', '0');

  // Legend item should show hidden state
  await expect(page.locator('[data-testid="legend-item-Alimentacao"]')).toHaveClass(/hidden|inactive/);

  // Click again to show
  await page.click('[data-testid="legend-item-Alimentacao"]');
  await expect(page.locator('[data-testid="chart-line-Alimentacao"]')).toHaveCSS('opacity', '1');
});
```

### 3.4 Tooltip Display

#### E2E-CAT-TRENDS-005: Show Tooltip on Hover

```gherkin
Scenario: User hovers over data point to see tooltip
  Given I am logged in with expenses
  When I am on the dashboard
  And I hover over a data point on the chart
  Then I should see a tooltip
  And the tooltip should show the date
  And the tooltip should show the category name
  And the tooltip should show the amount formatted as currency
```

```typescript
test('E2E-CAT-TRENDS-005: Show tooltip on hover', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-15', amount: -450, category: 'Alimentacao' },
  ]);

  await page.goto('/dashboard');

  // Find and hover over the data point
  const dataPoint = page.locator('[data-testid="data-point-Alimentacao-2024-11-15"]');
  await dataPoint.hover();

  // Tooltip should appear
  const tooltip = page.locator('[data-testid="chart-tooltip"]');
  await expect(tooltip).toBeVisible();

  // Check tooltip content
  await expect(tooltip).toContainText('15 Nov');
  await expect(tooltip).toContainText('Alimentacao');
  await expect(tooltip).toContainText('R$ 450,00');
});
```

### 3.5 Drill-Down Navigation

#### E2E-CAT-TRENDS-006: Click Data Point to View Transactions

```gherkin
Scenario: User clicks on data point to see transactions
  Given I am logged in with expenses
  When I am on the dashboard
  And I click on a data point for "Alimentacao" on "2024-11-15"
  Then I should be navigated to the transactions page
  And the transactions should be filtered by category "Alimentacao"
  And the transactions should be filtered by date "2024-11-15"
```

```typescript
test('E2E-CAT-TRENDS-006: Drill-down to transactions', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-15', amount: -450, category: 'Alimentacao', description: 'Groceries' },
    { date: '2024-11-15', amount: -30, category: 'Alimentacao', description: 'Coffee' },
  ]);

  await page.goto('/dashboard');

  // Click on the data point
  await page.click('[data-testid="data-point-Alimentacao-2024-11-15"]');

  // Should navigate to transactions
  await expect(page).toHaveURL(/\/transactions/);

  // Should have category filter applied
  await expect(page).toHaveURL(/categoryId=/);

  // Should have date filter applied
  await expect(page).toHaveURL(/startDate=2024-11-15/);

  // Should show the filtered transactions
  await expect(page.locator('[data-testid="transaction-card"]')).toHaveCount(2);
  await expect(page.locator('[data-testid="transaction-card"]').first()).toContainText('Groceries');
});
```

### 3.6 Empty State

#### E2E-CAT-TRENDS-007: Display Empty State When No Expenses

```gherkin
Scenario: User sees empty state when no expenses exist
  Given I am logged in
  And I have no expense transactions
  When I navigate to the dashboard
  Then I should see the category trends empty state
  And the empty state should show a message about no expenses
```

```typescript
test('E2E-CAT-TRENDS-007: Empty state display', async ({ authenticatedPage: page }) => {
  // Ensure no transactions exist
  await clearTestData(page);

  await page.goto('/dashboard');

  // Empty state should be visible
  const emptyState = page.locator('[data-testid="category-trends-empty"]');
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText('Sem despesas');
});
```

#### E2E-CAT-TRENDS-008: Empty State for Period with No Expenses

```gherkin
Scenario: User sees empty state for period without expenses
  Given I am logged in
  And I have expenses only in last month
  When I view the dashboard for this month
  Then I should see the empty state for category trends
```

```typescript
test('E2E-CAT-TRENDS-008: Empty state for empty period', async ({ authenticatedPage: page }) => {
  // Create transactions in last month only
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  await createTestTransactions(page, [
    { date: `${lastMonthStr}-15`, amount: -100, category: 'Alimentacao' },
  ]);

  await page.goto('/dashboard'); // Default is this_month

  // Empty state should show for current period
  await expect(page.locator('[data-testid="category-trends-empty"]')).toBeVisible();
});
```

### 3.7 Loading State

#### E2E-CAT-TRENDS-009: Display Loading State

```gherkin
Scenario: User sees loading state while data loads
  Given I am logged in
  And the API is slow to respond
  When I navigate to the dashboard
  Then I should see a loading skeleton for the category trends chart
  When the data loads
  Then I should see the chart
```

```typescript
test('E2E-CAT-TRENDS-009: Loading state display', async ({ authenticatedPage: page }) => {
  // Delay the API response
  await page.route('**/api/v1/dashboard/category-trends*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    route.continue();
  });

  await page.goto('/dashboard');

  // Loading skeleton should be visible initially
  await expect(page.locator('[data-testid="category-trends-loading"]')).toBeVisible();

  // Wait for chart to load
  await expect(page.locator('[data-testid="category-trends-chart"]')).toBeVisible({ timeout: 5000 });

  // Loading should be hidden
  await expect(page.locator('[data-testid="category-trends-loading"]')).not.toBeVisible();
});
```

### 3.8 Error Handling

#### E2E-CAT-TRENDS-010: Handle API Error

```gherkin
Scenario: User sees error when API fails
  Given I am logged in
  And the category trends API returns an error
  When I navigate to the dashboard
  Then I should see an error message for the chart
  And I should see a retry button
  When I click retry
  Then the chart should attempt to load again
```

```typescript
test('E2E-CAT-TRENDS-010: API error handling', async ({ authenticatedPage: page }) => {
  let requestCount = 0;

  // Mock API failure on first request, success on retry
  await page.route('**/api/v1/dashboard/category-trends*', async (route) => {
    requestCount++;
    if (requestCount === 1) {
      route.fulfill({ status: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR' } }) });
    } else {
      route.continue();
    }
  });

  await page.goto('/dashboard');

  // Error state should be visible
  await expect(page.locator('[data-testid="category-trends-error"]')).toBeVisible();
  await expect(page.locator('[data-testid="category-trends-error"]')).toContainText('Erro');

  // Click retry
  await page.click('[data-testid="category-trends-retry"]');

  // Chart should load on retry
  await expect(page.locator('[data-testid="category-trends-chart"]')).toBeVisible();
});
```

### 3.9 "Others" Category

#### E2E-CAT-TRENDS-011: Group Excess Categories as Others

```gherkin
Scenario: Categories beyond top 8 are grouped as "Others"
  Given I am logged in
  And I have expenses in 12 different categories
  When I navigate to the dashboard
  Then I should see 9 items in the legend (8 categories + Others)
  And the "Outros" category should aggregate the remaining 4 categories
```

```typescript
test('E2E-CAT-TRENDS-011: Others category grouping', async ({ authenticatedPage: page }) => {
  // Create transactions in 12 categories
  const categories = [
    'Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5',
    'Cat6', 'Cat7', 'Cat8', 'Cat9', 'Cat10',
    'Cat11', 'Cat12'
  ];

  const transactions = categories.map((cat, i) => ({
    date: '2024-11-15',
    amount: -(100 + i * 10), // Different amounts to ensure ranking
    category: cat,
  }));

  await createTestTransactions(page, transactions);

  await page.goto('/dashboard');

  // Should have 9 legend items (8 top + Others)
  const legendItems = page.locator('[data-testid^="legend-item-"]');
  await expect(legendItems).toHaveCount(9);

  // "Outros" should be present
  await expect(page.locator('[data-testid="legend-item-Outros"]')).toBeVisible();
});
```

### 3.10 Responsive Behavior

#### E2E-CAT-TRENDS-012: Mobile Layout

```gherkin
Scenario: Chart adapts to mobile viewport
  Given I am logged in with expenses
  When I view the dashboard on a mobile device (375px width)
  Then the chart should be full width
  And the legend should be below the chart
  And the granularity toggle should be accessible
```

```typescript
test('E2E-CAT-TRENDS-012: Mobile responsive layout', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-15', amount: -100, category: 'Alimentacao' },
  ]);

  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/dashboard');

  // Chart should be visible and accessible
  await expect(page.locator('[data-testid="category-trends-chart"]')).toBeVisible();

  // Legend should be below chart (check vertical layout)
  const chart = page.locator('[data-testid="category-trends-chart"]');
  const legend = page.locator('[data-testid="chart-legend"]');

  const chartBox = await chart.boundingBox();
  const legendBox = await legend.boundingBox();

  // Legend should be below chart
  expect(legendBox!.y).toBeGreaterThan(chartBox!.y + chartBox!.height);

  // Toggle should be accessible
  await expect(page.locator('[data-testid="granularity-toggle"]')).toBeVisible();
});
```

---

## 4. Test Data Helpers

```typescript
// e2e/tests/M13-category-trends/helpers.ts

import { Page } from '@playwright/test';

interface TestTransaction {
  date: string;        // YYYY-MM-DD
  amount: number;      // Negative for expenses
  category: string;
  description?: string;
}

export async function createTestTransactions(page: Page, transactions: TestTransaction[]) {
  for (const tx of transactions) {
    // First ensure category exists
    await ensureCategoryExists(page, tx.category);

    // Then create transaction
    await page.request.post('/api/v1/transactions', {
      data: {
        date: tx.date,
        amount: tx.amount,
        description: tx.description || `Test ${tx.category}`,
        type: tx.amount < 0 ? 'expense' : 'income',
        categoryId: await getCategoryId(page, tx.category),
      },
    });
  }
}

export async function ensureCategoryExists(page: Page, categoryName: string) {
  // Check if category exists, create if not
  const response = await page.request.get('/api/v1/categories');
  const data = await response.json();

  const exists = data.data.some((c: any) => c.name === categoryName);

  if (!exists) {
    await page.request.post('/api/v1/categories', {
      data: {
        name: categoryName,
        color: getRandomColor(),
        icon: 'tag',
        type: 'expense',
      },
    });
  }
}

export async function getCategoryId(page: Page, categoryName: string): Promise<string> {
  const response = await page.request.get('/api/v1/categories');
  const data = await response.json();
  const category = data.data.find((c: any) => c.name === categoryName);
  return category?.id || '';
}

export async function clearTestData(page: Page) {
  // Delete all transactions for test user
  await page.request.delete('/api/v1/transactions/all');
}

function getRandomColor(): string {
  const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

---

## 5. Visual Regression Tests

```typescript
test('E2E-CAT-TRENDS-VR-001: Chart visual snapshot', async ({ authenticatedPage: page }) => {
  await createTestTransactions(page, [
    { date: '2024-11-01', amount: -100, category: 'Alimentacao' },
    { date: '2024-11-08', amount: -150, category: 'Alimentacao' },
    { date: '2024-11-01', amount: -80, category: 'Transporte' },
    { date: '2024-11-08', amount: -60, category: 'Transporte' },
  ]);

  await page.goto('/dashboard');

  // Wait for chart to fully render
  await page.waitForSelector('[data-testid="category-trends-chart"] svg path');

  const chartSection = page.locator('[data-testid="category-trends-section"]');
  await expect(chartSection).toHaveScreenshot('category-trends-chart.png');
});
```

---

## 6. Test Execution

### Run All Category Trends Tests
```bash
cd e2e && npx playwright test --project=M13-category-trends
```

### Run Specific Test
```bash
cd e2e && npx playwright test tests/M13-category-trends/category-trends.spec.ts -g "E2E-CAT-TRENDS-001"
```

### Debug Mode
```bash
cd e2e && npx playwright test --project=M13-category-trends --debug
```

### Run with UI
```bash
cd e2e && npx playwright test --project=M13-category-trends --ui
```

---

## 7. Test Data Requirements

### Minimum Test Data for Full Coverage:
1. User with 12+ expense categories (for "Others" testing)
2. Transactions spanning multiple days/weeks/months
3. Transactions with and without categories
4. Income transactions (to verify they're excluded)

### Seed Data Script:
```typescript
// e2e/seeds/category-trends-seed.ts

export const categoryTrendsSeedData = {
  categories: [
    { name: 'Alimentacao', color: '#EF4444' },
    { name: 'Transporte', color: '#3B82F6' },
    { name: 'Lazer', color: '#10B981' },
    { name: 'Saude', color: '#F59E0B' },
    { name: 'Educacao', color: '#8B5CF6' },
    { name: 'Moradia', color: '#EC4899' },
    { name: 'Roupas', color: '#14B8A6' },
    { name: 'Tecnologia', color: '#6366F1' },
    { name: 'Viagem', color: '#F97316' },
    { name: 'Presentes', color: '#84CC16' },
    { name: 'Pets', color: '#06B6D4' },
    { name: 'Outros', color: '#9CA3AF' },
  ],
  transactions: [
    // November 2024 - Week 1
    { date: '2024-11-01', amount: -150, category: 'Alimentacao' },
    { date: '2024-11-02', amount: -80, category: 'Transporte' },
    { date: '2024-11-03', amount: -60, category: 'Lazer' },
    // November 2024 - Week 2
    { date: '2024-11-08', amount: -200, category: 'Alimentacao' },
    { date: '2024-11-09', amount: -100, category: 'Transporte' },
    { date: '2024-11-10', amount: -40, category: 'Saude' },
    // ... more data
  ],
};
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
- **E2E Testing Guide:** `context/Finance-Tracker-E2E-Testing-Guide-v1.md`
