# Task: Fix Metric Card Color Logic for Expenses Trend and Negative Balance

## Overview

The MetricCard component has multiple color logic issues:

1. **Expenses Trend Indicator Bug:** When expenses have 0% change (or increase), it shows an UP arrow in GREEN with "+0.0%". This is wrong because increased expenses are BAD and should show red.

2. **Negative Balance Color Bug:** When "Saldo Total" (Balance) is negative, it displays in the default text color (gray/dark) instead of RED to indicate a negative financial state.

3. **Negative Savings Color Bug (related):** When savings is negative, it should be red (already tracked in separate task but can be combined).

**Goal:** Fix the MetricCard color logic so that:
- Expense increases (including 0% with UP arrow) show in RED
- Negative balance values display in RED
- Negative savings values display in RED

---

## Current State Analysis

### What Exists

**File:** `frontend/src/main/features/dashboard/components/MetricCard.tsx`

**Current Issues:**

1. **TrendArrow component (line 11-25):** Always shows UP arrow in green and DOWN arrow in red, regardless of metric type.
   ```typescript
   function TrendArrow({ direction }: { direction: 'up' | 'down' }) {
       return (
           <span data-testid="trend-direction" className={direction === 'up' ? 'text-green-500' : 'text-red-500'}>
   ```

2. **getValueColor function (line 28-32):** Doesn't consider the actual value for balance type:
   ```typescript
   const getValueColor = () => {
       if (type === 'income' || type === 'savings') return 'text-green-500'
       if (type === 'expenses') return 'text-red-500'
       return 'text-[var(--color-text)]'  // Balance always uses default color
   }
   ```

3. **isPositiveChange function (line 76-81):** Correctly identifies that expenses decreasing is positive, BUT the TrendArrow component ignores this context and only uses direction.

### What's Missing/Broken

**Issue 1: Expenses Trend Arrow Color**
- When `change = 0` for expenses, `isPositiveChange(0, 'expenses')` returns `false` (correct!)
- But TrendArrow shows GREEN because direction is 'up'
- The color from `isPositiveChange` is applied to the container but the arrow itself has its own color logic

**Issue 2: Negative Balance Color**
- Balance type falls through to default `text-[var(--color-text)]`
- Should be red when `value < 0`

**Issue 3: Negative Savings Color**
- Savings always returns green
- Should be red when `value < 0`

---

## Execution Plan

### Phase 1: Create E2E Tests (TDD)
Create tests that verify the correct color behavior.

### Phase 2: Frontend Implementation
Fix the MetricCard component:
1. Update TrendArrow to accept a `positive` prop for color
2. Update getValueColor to check value for balance and savings
3. Pass the correct color context to TrendArrow

### Phase 3: Verification
Run E2E tests and visual verification.

---

## Detailed Specifications

### E2E Test Scenarios

Add to `e2e/tests/m8-dashboard/dashboard.spec.ts`:

```typescript
test.describe('M8: Metric Card Color Logic', () => {
    test('M8-E2E-COLOR-001: Expenses 0% change should show red indicator (not green)', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const expensesCard = page.getByTestId('metric-card-expenses')
        await expect(expensesCard).toBeVisible()

        const trendIndicator = expensesCard.getByTestId('trend-indicator')

        // If there's a trend indicator showing (has change data)
        if (await trendIndicator.isVisible()) {
            const indicatorText = await trendIndicator.textContent()

            // If change is 0% or positive (expenses increased or unchanged)
            // it should show red, not green
            if (indicatorText?.includes('+')) {
                // Positive change in expenses is BAD - should be red
                await expect(trendIndicator).toHaveClass(/text-red-500/)
            }
        }
    })

    test('M8-E2E-COLOR-002: Negative balance should display in red', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const balanceCard = page.getByTestId('metric-card-balance')
        await expect(balanceCard).toBeVisible()

        const metricValue = balanceCard.getByTestId('metric-value')
        const valueText = await metricValue.textContent()

        // If balance is negative
        if (valueText?.includes('-')) {
            await expect(metricValue).toHaveClass(/text-red-500/)
        }
    })

    test('M8-E2E-COLOR-003: Negative savings should display in red', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const savingsCard = page.getByTestId('metric-card-savings')
        await expect(savingsCard).toBeVisible()

        const metricValue = savingsCard.getByTestId('metric-value')
        const valueText = await metricValue.textContent()

        // If savings is negative
        if (valueText?.includes('-')) {
            await expect(metricValue).toHaveClass(/text-red-500/)
        } else {
            // Positive savings should be green
            await expect(metricValue).toHaveClass(/text-green-500/)
        }
    })

    test('M8-E2E-COLOR-004: Positive balance should display in default color', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const balanceCard = page.getByTestId('metric-card-balance')
        const metricValue = balanceCard.getByTestId('metric-value')
        const valueText = await metricValue.textContent()

        // If balance is positive (no minus sign)
        if (valueText && !valueText.includes('-')) {
            // Should NOT have red class
            await expect(metricValue).not.toHaveClass(/text-red-500/)
        }
    })

    test('M8-E2E-COLOR-005: Expenses decrease should show green indicator', async ({ page }) => {
        await page.goto('/dashboard')
        await expect(page.getByTestId('dashboard-screen')).toBeVisible()

        const expensesCard = page.getByTestId('metric-card-expenses')
        const trendIndicator = expensesCard.getByTestId('trend-indicator')

        if (await trendIndicator.isVisible()) {
            const indicatorText = await trendIndicator.textContent()

            // If change is negative (expenses decreased) - this is GOOD
            if (indicatorText && !indicatorText.includes('+') && indicatorText.includes('-')) {
                await expect(trendIndicator).toHaveClass(/text-green-500/)
            }
        }
    })
})
```

### Component Changes

**File:** `frontend/src/main/features/dashboard/components/MetricCard.tsx`

**Change 1: Update TrendArrow to use positive/negative context**

```typescript
// BEFORE (line 11-25):
function TrendArrow({ direction }: { direction: 'up' | 'down' }) {
    return (
        <span data-testid="trend-direction" className={direction === 'up' ? 'text-green-500' : 'text-red-500'}>
            ...
        </span>
    )
}

// AFTER:
function TrendArrow({ direction, isPositive }: { direction: 'up' | 'down'; isPositive: boolean }) {
    return (
        <span data-testid="trend-direction" className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {direction === 'up' ? (
                <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-8 8h6v8h4v-8h6z" />
                </svg>
            ) : (
                <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20l8-8h-6V4h-4v8H4z" />
                </svg>
            )}
        </span>
    )
}
```

**Change 2: Update getValueColor to check value for balance and savings**

```typescript
// BEFORE (line 28-32):
const getValueColor = () => {
    if (type === 'income' || type === 'savings') return 'text-green-500'
    if (type === 'expenses') return 'text-red-500'
    return 'text-[var(--color-text)]'
}

// AFTER:
const getValueColor = () => {
    if (type === 'income') return 'text-green-500'
    if (type === 'expenses') return 'text-red-500'
    if (type === 'savings') {
        return value >= 0 ? 'text-green-500' : 'text-red-500'
    }
    if (type === 'balance') {
        return value >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'
    }
    return 'text-[var(--color-text)]'
}
```

**Change 3: Pass isPositive to TrendArrow**

```typescript
// BEFORE (line 94-96):
<TrendArrow direction={getTrendDirection(change, type)} />

// AFTER:
<TrendArrow
    direction={getTrendDirection(change, type)}
    isPositive={isPositiveChange(change, type)}
/>
```

---

## Files to Create/Modify

### New Files:
- None

### Modified Files:
- `frontend/src/main/features/dashboard/components/MetricCard.tsx` - Fix color logic for TrendArrow and getValueColor

---

## Step-by-Step Execution Instructions

### Step 1: Add E2E Tests
Add the test cases to `e2e/tests/m8-dashboard/dashboard.spec.ts`

### Step 2: Run Tests (Should Fail)
```bash
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e
npx playwright test tests/m8-dashboard/dashboard.spec.ts -g "COLOR"
```

### Step 3: Update MetricCard Component
Edit `frontend/src/main/features/dashboard/components/MetricCard.tsx`:

**3a. Update TrendArrow function (around line 11):**
```typescript
function TrendArrow({ direction, isPositive }: { direction: 'up' | 'down'; isPositive: boolean }) {
    return (
        <span data-testid="trend-direction" className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {direction === 'up' ? (
                <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-8 8h6v8h4v-8h6z" />
                </svg>
            ) : (
                <svg className="w-4 h-4 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20l8-8h-6V4h-4v8H4z" />
                </svg>
            )}
        </span>
    )
}
```

**3b. Update getValueColor function (around line 28):**
```typescript
const getValueColor = () => {
    if (type === 'income') return 'text-green-500'
    if (type === 'expenses') return 'text-red-500'
    if (type === 'savings') {
        return value >= 0 ? 'text-green-500' : 'text-red-500'
    }
    if (type === 'balance') {
        return value >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'
    }
    return 'text-[var(--color-text)]'
}
```

**3c. Update TrendArrow usage (around line 95):**
```typescript
<TrendArrow
    direction={getTrendDirection(change, type)}
    isPositive={isPositiveChange(change, type)}
/>
```

### Step 4: Restart E2E Frontend
```bash
docker restart finance-tracker-frontend-e2e
```

### Step 5: Run E2E Tests (Should Pass)
```bash
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e
npx playwright test tests/m8-dashboard/dashboard.spec.ts -g "COLOR"
```

### Step 6: Run Full E2E Suite
```bash
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e
npx playwright test
```

---

## Acceptance Criteria

- [ ] Expenses with 0% change (or increase) show RED trend indicator with UP arrow
- [ ] Expenses with decrease show GREEN trend indicator with DOWN arrow
- [ ] Negative balance (`value < 0`) displays in RED
- [ ] Positive balance displays in default text color
- [ ] Negative savings displays in RED
- [ ] Positive savings displays in GREEN
- [ ] Income always displays in GREEN (unchanged)
- [ ] All E2E tests pass
- [ ] No regressions in existing tests

---

## Related Documentation

- **Component:** `frontend/src/main/features/dashboard/components/MetricCard.tsx` - Contains all the color logic
- **Screen:** `frontend/src/main/features/dashboard/DashboardScreen.tsx` - Uses MetricCard
- **Tests:** `e2e/tests/m8-dashboard/dashboard.spec.ts` - Dashboard E2E tests

---

## Commands to Run

```bash
# Run specific color tests (after creating them)
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e && npx playwright test tests/m8-dashboard/dashboard.spec.ts -g "COLOR"

# Run all dashboard tests
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e && npx playwright test tests/m8-dashboard/

# Run full E2E suite
cd /Users/gabriel.herter/Documents/Personal/finance-tracker/e2e && npx playwright test

# Restart E2E frontend after changes
docker restart finance-tracker-frontend-e2e
```

---

## Visual Reference

### Before (Bugs):
1. **Despesas (Expenses):** UP arrow with "+0.0%" in GREEN (wrong - should be red for increased/unchanged expenses)
2. **Saldo Total (Balance):** `-R$ 666,18` in gray (wrong - should be red for negative balance)

### After (Fixed):
1. **Despesas (Expenses):** UP arrow with "+0.0%" in RED (expenses increased = bad)
2. **Despesas (Expenses):** DOWN arrow with "-5.0%" in GREEN (expenses decreased = good)
3. **Saldo Total (Balance):** `-R$ 666,18` in RED (negative = warning)
4. **Saldo Total (Balance):** `R$ 1.000,00` in default color (positive = normal)
5. **Economia (Savings):** `-R$ 500,00` in RED (negative = bad)
6. **Economia (Savings):** `R$ 500,00` in GREEN (positive = good)

---

## Notes

This task supersedes the separate `TASK-Fix-Negative-Savings-Color.md` as it addresses all related color issues in the MetricCard component comprehensively.
