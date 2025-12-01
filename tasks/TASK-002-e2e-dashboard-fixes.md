# TASK-002: Fix Dashboard E2E Tests

## Overview
- **Priority**: HIGH
- **Estimated Tests**: 12
- **Type**: E2E Test Fixes
- **Prerequisite**: TASK-001 completed
- **Expected Outcome**: Dashboard tests verify actual data, not just UI visibility

## Context Files
- Read `e2e-mock.md` for detailed analysis
- Read `frontend-mock.md` for mock data values to detect

## Tests to Fix

### Part A: Add Value Verification (Not Just Visibility)

#### 1. M8-E2E-002: Should display metric cards with correct values
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 46-75)

**Current Problem**: Only checks visibility, not values
```typescript
await expect(incomeCard.getByTestId('metric-value')).toBeVisible()
```

**Required Fix**:
```typescript
// Helper to parse Brazilian currency
const parseAmount = (text: string) => {
  const cleaned = text.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Get actual values from UI
const incomeText = await incomeCard.getByTestId('metric-value').textContent()
const expensesText = await expensesCard.getByTestId('metric-value').textContent()
const balanceText = await balanceCard.getByTestId('metric-value').textContent()
const savingsText = await savingsCard.getByTestId('metric-value').textContent()

const income = parseAmount(incomeText)
const expenses = Math.abs(parseAmount(expensesText))
const balance = parseAmount(balanceText)
const savings = parseAmount(savingsText)

// CRITICAL: Detect mock data (mock shows R$ 15,270.50 balance, R$ 8,500 income)
// If values match mock data exactly, test should FAIL
const MOCK_INCOME = 8500
const MOCK_EXPENSES = 6230
const MOCK_BALANCE = 15270.5

expect(income).not.toBe(MOCK_INCOME) // Should not be mock value
expect(expenses).not.toBe(MOCK_EXPENSES) // Should not be mock value
expect(balance).not.toBe(MOCK_BALANCE) // Should not be mock value

// Verify calculations are correct
expect(savings).toBeCloseTo(income - expenses, 2)

// Fetch actual transaction data from API and compare
const transactions = await fetchTransactions(page)
const calculatedIncome = transactions
  .filter(t => t.type === 'income')
  .reduce((sum, t) => sum + t.amount, 0)
const calculatedExpenses = transactions
  .filter(t => t.type === 'expense')
  .reduce((sum, t) => sum + Math.abs(t.amount), 0)

expect(income).toBeCloseTo(calculatedIncome, 2)
expect(expenses).toBeCloseTo(calculatedExpenses, 2)
```

---

#### 2. M8-E2E-003: Should change data when period is selected
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 77-105)

**Current Problem**: Never compares before/after values
```typescript
await expect(page.getByTestId('dashboard-screen')).toBeVisible() // Only checks visibility
```

**Required Fix**:
```typescript
// Capture initial values
const getMetricValues = async () => ({
  income: parseAmount(await incomeCard.getByTestId('metric-value').textContent()),
  expenses: parseAmount(await expensesCard.getByTestId('metric-value').textContent()),
  balance: parseAmount(await balanceCard.getByTestId('metric-value').textContent()),
})

const initialValues = await getMetricValues()

// Change period to "last month"
await page.getByTestId('period-selector').click()
await page.getByRole('option', { name: /last month|mês anterior/i }).click()
await page.waitForLoadState('networkidle')

// Get new values
const newValues = await getMetricValues()

// Values should be different (unless both periods have identical data, which is rare)
// OR if same, verify API was called with correct date range
const networkRequests = []
page.on('request', req => {
  if (req.url().includes('/api/v1/dashboard') || req.url().includes('/api/v1/transactions')) {
    networkRequests.push(req.url())
  }
})

// Verify API was called with date parameters
expect(networkRequests.length).toBeGreaterThan(0)
```

---

#### 3. M8-E2E-004: Should display trend comparison on metric cards
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 107-134)

**Current Problem**: Only checks "%" exists, not calculation accuracy
```typescript
await expect(trendIndicator).toContainText(/%/)
```

**Required Fix**:
```typescript
// Get trend percentage
const trendText = await trendIndicator.textContent()
const trendPercent = parseFloat(trendText.replace('%', '').replace(',', '.'))

// CRITICAL: Mock data shows +5.2% income change - detect this
const MOCK_INCOME_CHANGE = 5.2
expect(trendPercent).not.toBe(MOCK_INCOME_CHANGE)

// If possible, verify calculation:
// trend = (current_period - previous_period) / previous_period * 100

// At minimum, verify trend indicator direction matches sign
const hasUpArrow = await trendIndicator.locator('.text-green-500, [class*="up"], [class*="positive"]').isVisible().catch(() => false)
const hasDownArrow = await trendIndicator.locator('.text-red-500, [class*="down"], [class*="negative"]').isVisible().catch(() => false)

if (trendPercent > 0) {
  expect(hasUpArrow).toBe(true)
} else if (trendPercent < 0) {
  expect(hasDownArrow).toBe(true)
}
```

---

#### 4. M8-E2E-013: Should display amount values in correct currency format
**File**: `e2e/tests/m8-dashboard/dashboard.spec.ts` (Lines 323-342)

**Current Problem**: Regex accepts any number
```typescript
expect(value).toMatch(/R?\$?\s*[\d.,]+/)
```

**Required Fix**:
```typescript
// Get all metric values
const metricValues = page.getByTestId('metric-value')
const count = await metricValues.count()

for (let i = 0; i < count; i++) {
  const value = await metricValues.nth(i).textContent()

  // Check format
  expect(value).toMatch(/R\$\s*-?[\d.,]+/)

  // Parse and verify it's a valid number
  const amount = parseAmount(value)
  expect(isNaN(amount)).toBe(false)

  // CRITICAL: Verify it's not a mock value
  const MOCK_VALUES = [15270.5, 8500, 6230, 2270]
  expect(MOCK_VALUES).not.toContain(amount)
}
```

---

### Part B: Fix Calculation Validation Tests

#### 5. M8-E2E-10a: Should display correct trend calculation
**File**: `e2e/tests/m8-dashboard/dashboard-calculations.spec.ts` (Lines 14-48)

**Current Problem**: Only checks format, not calculation
```typescript
expect(trendText).toMatch(/-?\d+(\.\d+)?%/)
```

**Required Fix**:
```typescript
// Get current and previous period data from API
const currentPeriod = await fetchDashboardSummary(page, 'current_month')
const previousPeriod = await fetchDashboardSummary(page, 'previous_month')

// Calculate expected trend
const expectedTrend = previousPeriod.expenses > 0
  ? ((currentPeriod.expenses - previousPeriod.expenses) / previousPeriod.expenses) * 100
  : 0

// Get displayed trend
const trendText = await expensesCard.getByTestId('trend-indicator').textContent()
const displayedTrend = parseFloat(trendText.replace('%', '').replace(',', '.'))

// Verify calculation matches (within 0.1% tolerance)
expect(displayedTrend).toBeCloseTo(expectedTrend, 1)
```

---

#### 6. M8-E2E-10b: Should display period comparison data
**File**: `e2e/tests/m8-dashboard/dashboard-calculations.spec.ts` (Lines 50-79)

**Current Problem**: Only validates month name text
```typescript
expect(periodText).toMatch(/nov|novembro|november|2025/i)
```

**Required Fix**:
```typescript
// Get initial values
const initialIncome = parseAmount(await incomeCard.getByTestId('metric-value').textContent())

// Change to previous period
await page.getByTestId('period-selector').click()
await page.getByRole('option', { name: /last month|mês anterior/i }).click()
await page.waitForLoadState('networkidle')

// Get new values
const newIncome = parseAmount(await incomeCard.getByTestId('metric-value').textContent())

// Values should reflect different time periods (likely different unless static mock)
// The key check is that an API call was made with the correct date range
// And that values changed OR stayed same based on actual data

// Verify period label updated
const periodLabel = await page.getByTestId('current-period-label').textContent()
expect(periodLabel).toMatch(/outubro|october|last month|mês anterior/i)
```

---

#### 7. M8-E2E-TXN-01: Should display dashboard metric cards correctly
**File**: `e2e/tests/m8-dashboard/dashboard-transaction-integration.spec.ts` (Lines 59-114)

**Current Problem**: Tolerance too loose, no mock detection
```typescript
expect(Math.abs(savingsAmount - expectedSavings)).toBeLessThan(10)
```

**Required Fix**:
```typescript
// Tighten tolerance
expect(Math.abs(savingsAmount - expectedSavings)).toBeLessThan(0.01)

// CRITICAL: Detect mock data
const MOCK_VALUES = {
  income: 8500,
  expenses: 6230,
  balance: 15270.5,
  savings: 2270
}

// These should NOT match mock values
expect(incomeAmount).not.toBe(MOCK_VALUES.income)
expect(expensesAmount).not.toBe(MOCK_VALUES.expenses)

// Verify against actual API data
const transactions = await fetchTransactions(page)
const actualIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
const actualExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0)

expect(incomeAmount).toBeCloseTo(actualIncome, 2)
expect(expensesAmount).toBeCloseTo(actualExpenses, 2)
```

---

### Part C: Add Data Source Verification

#### 8-12. All Dashboard Tests: Add API Call Verification

For ALL dashboard tests, add this pattern at the beginning:

```typescript
test.beforeEach(async ({ page }) => {
  // Intercept API calls to verify dashboard is fetching real data
  const apiCalls: string[] = []

  page.on('request', request => {
    if (request.url().includes('/api/v1/')) {
      apiCalls.push(request.url())
    }
  })

  // Navigate to dashboard
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // CRITICAL: Verify API calls were made
  // If no API calls, dashboard is using mock data
  const dashboardApiCalls = apiCalls.filter(url =>
    url.includes('/dashboard') ||
    url.includes('/transactions') ||
    url.includes('/goals')
  )

  expect(dashboardApiCalls.length).toBeGreaterThan(0)
})
```

---

## New Test to Add: Mock Data Detection

Add a new test that explicitly fails if mock data is detected:

```typescript
test('M8-E2E-MOCK: Should NOT display mock data values', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // Known mock data values from frontend/src/main/features/dashboard/mock-data.ts
  const MOCK_VALUES = {
    totalBalance: 15270.5,
    totalIncome: 8500,
    totalExpenses: 6230,
    netSavings: 2270,
  }

  const parseAmount = (text: string) => {
    const cleaned = text.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  // Get displayed values
  const balance = parseAmount(await page.getByTestId('metric-card-balance').getByTestId('metric-value').textContent())
  const income = parseAmount(await page.getByTestId('metric-card-income').getByTestId('metric-value').textContent())
  const expenses = Math.abs(parseAmount(await page.getByTestId('metric-card-expenses').getByTestId('metric-value').textContent()))
  const savings = parseAmount(await page.getByTestId('metric-card-savings').getByTestId('metric-value').textContent())

  // FAIL if ANY value matches mock data
  expect(balance).not.toBe(MOCK_VALUES.totalBalance)
  expect(income).not.toBe(MOCK_VALUES.totalIncome)
  expect(expenses).not.toBe(MOCK_VALUES.totalExpenses)
  expect(savings).not.toBe(MOCK_VALUES.netSavings)

  // Also check recent transactions are not mock
  const recentTransactions = page.getByTestId('recent-transactions')
  if (await recentTransactions.isVisible()) {
    // Mock transactions have these descriptions
    const mockDescriptions = ['Supermercado Extra', 'Uber', 'Aluguel', 'Salário Empresa', 'Netflix']
    const text = await recentTransactions.textContent()

    for (const desc of mockDescriptions) {
      // If ALL mock descriptions appear, it's definitely mock data
      if (text.includes(desc)) {
        console.warn(`Warning: Found mock transaction description: ${desc}`)
      }
    }
  }
})
```

---

## Validation Command
```bash
cd e2e && npx playwright test --project=m8-dashboard --reporter=list
```

**Expected Result**: Tests should FAIL (detecting mock data)

## Definition of Done
- [ ] All dashboard tests verify actual numeric values, not just visibility
- [ ] Tests detect and FAIL when mock data values are present
- [ ] Tests verify API calls are being made
- [ ] Calculations (savings = income - expenses) are validated with tight tolerances
- [ ] Period changes result in verifiable data changes or API calls
