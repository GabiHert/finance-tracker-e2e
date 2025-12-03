# Task: Fix Dark Mode Contrast & Transaction Icon Rendering

## Overview

This is a comprehensive **Test-Driven Development (TDD)** task to fix two critical UI issues visible in dark mode:

1. **Income/Expense/Net summary cards are invisible** - Light pastel backgrounds (`-50` variants) are not redefined for dark mode
2. **Category icons showing as plain text** - TransactionRow renders icon names ("wallet", "folder") instead of SVG icons

**Goal:** Fix all dark mode contrast issues and ensure category icons render properly as SVG graphics.

---

## Current State Analysis

### Issue 1: Dark Mode Contrast - Summary Cards

**Location:** `frontend/src/main/features/transactions/TransactionsScreen.tsx` (lines 530-552)

**Current Implementation:**
```tsx
<div className="p-4 bg-[var(--color-success-50)] rounded-lg">
  <p className="text-sm text-[var(--color-text-secondary)] mb-1">Income</p>
  <p className="text-xl font-bold text-[var(--color-success)]">...</p>
</div>
```

**Problem:**
- `--color-success-50` = `#f0fdf4` (light green) is NOT redefined in dark mode
- This light pastel background becomes invisible/washed out on dark surfaces
- Same issue for `--color-error-50` and `--color-primary-50`

**CSS Variables Missing in Dark Mode:** (`frontend/src/main/styles/globals.css`)
- `--color-success-50` (light green background)
- `--color-error-50` (light red background)
- `--color-primary-50` (light blue background)

### Issue 2: Category Icons Rendering as Text

**Location:** `frontend/src/main/features/transactions/components/TransactionRow.tsx` (lines 103-110)

**Current Implementation:**
```tsx
<div
  data-testid="category-icon"
  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
  style={{ backgroundColor: `${transaction.categoryColor}20` }}
>
  {transaction.categoryIcon}  {/* ← Renders "wallet" as text, not SVG */}
</div>
```

**Problem:**
- `transaction.categoryIcon` is a string like "wallet", "folder", "utensils"
- The code renders this string directly instead of looking up the SVG component
- IconPicker has `getIconComponent()` function but it's NOT exported

**Solution Required:**
1. Export `getIconComponent` from IconPicker
2. Use it in TransactionRow to render actual SVG icons

---

## Execution Plan

This task should be executed in the following phases:

### Phase 1: Create Failing E2E Tests
Create comprehensive E2E tests that validate:
- Summary card backgrounds have proper contrast in dark mode
- Category icons render as SVG elements (not text)
- All text is readable in dark mode

### Phase 2: Fix CSS Variables for Dark Mode
Update `globals.css` to define `-50` variants for dark mode

### Phase 3: Fix Icon Rendering
1. Export `getIconComponent` from IconPicker
2. Update TransactionRow to use proper icon components
3. Update any other components that render category icons

### Phase 4: Run E2E Tests
Execute `/fix-e2e` to verify all tests pass

---

## Detailed Specifications

### E2E Test File to Create

Create: `e2e/tests/m11-polish/transaction-ui-dark-mode.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import {
  seedIsolatedCategories,
  seedIsolatedTransactions,
  generateShortId,
  TEST_CATEGORIES,
} from '../fixtures/test-utils'

/**
 * Transaction UI Dark Mode Tests
 *
 * These tests validate:
 * 1. Summary cards (Income/Expense/Net) have proper contrast in dark mode
 * 2. Category icons render as SVG elements, not plain text
 * 3. All UI elements are visible and accessible in dark mode
 *
 * EXPECTED: These tests will FAIL until the fixes are implemented.
 *
 * Requirements Reference: WCAG AA 4.5:1 contrast ratio
 */
test.describe('Transaction UI - Dark Mode Fixes', () => {
  test.beforeEach(async ({ page }) => {
    // Emulate dark mode
    await page.emulateMedia({ colorScheme: 'dark' })
  })

  test.describe('Summary Cards Contrast', () => {
    test('DARKMODE-001: Income card background should have proper contrast in dark mode', async ({ page }) => {
      // Seed data
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      const testId = generateShortId()
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.salary])
      await seedIsolatedTransactions(page, testId, [{
        date: new Date().toISOString().split('T')[0],
        description: 'Test Income',
        amount: 1000,
        type: 'income',
        categoryId: categories[0]?.id,
      }])
      await page.reload()

      // Find the income card (first card in summary)
      const summary = page.getByTestId('total-summary')
      await expect(summary).toBeVisible()

      const incomeCard = summary.locator('> div').first()

      // Get background color
      const bgColor = await incomeCard.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor
      })

      // Background should NOT be a light pastel color in dark mode
      // Light colors have RGB values > 200
      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number)
        // In dark mode, card backgrounds should be dark (< 100) or semi-transparent
        // NOT the light pastel #f0fdf4 (240, 253, 244)
        const isLightBackground = r > 200 && g > 200 && b > 200
        expect(isLightBackground).toBe(false)
      }
    })

    test('DARKMODE-002: Expense card background should have proper contrast in dark mode', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')
      const testId = generateShortId()
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
      await seedIsolatedTransactions(page, testId, [{
        date: new Date().toISOString().split('T')[0],
        description: 'Test Expense',
        amount: 50,
        type: 'expense',
        categoryId: categories[0]?.id,
      }])
      await page.reload()

      const summary = page.getByTestId('total-summary')
      await expect(summary).toBeVisible()

      const expenseCard = summary.locator('> div').nth(1)

      const bgColor = await expenseCard.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor
      })

      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number)
        const isLightBackground = r > 200 && g > 200 && b > 200
        expect(isLightBackground).toBe(false)
      }
    })

    test('DARKMODE-003: Net card background should have proper contrast in dark mode', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      const summary = page.getByTestId('total-summary')
      await expect(summary).toBeVisible()

      const netCard = summary.locator('> div').nth(2)

      const bgColor = await netCard.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor
      })

      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number)
        const isLightBackground = r > 200 && g > 200 && b > 200
        expect(isLightBackground).toBe(false)
      }
    })

    test('DARKMODE-004: Summary card text values should be readable in dark mode', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Check income value is visible (green text)
      const incomeValue = page.getByTestId('income-total')
      if (await incomeValue.isVisible()) {
        const color = await incomeValue.evaluate(el => window.getComputedStyle(el).color)
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number)
          // Green success color should have high green component
          expect(g).toBeGreaterThan(150)
        }
      }

      // Check expense value is visible (red text)
      const expenseValue = page.getByTestId('expense-total')
      if (await expenseValue.isVisible()) {
        const color = await expenseValue.evaluate(el => window.getComputedStyle(el).color)
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        if (rgbMatch) {
          const [, r] = rgbMatch.map(Number)
          // Red error color should have high red component
          expect(r).toBeGreaterThan(150)
        }
      }
    })
  })

  test.describe('Category Icon Rendering', () => {
    test('ICON-001: Category icon should render as SVG, not text', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      const testId = generateShortId()
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
      await seedIsolatedTransactions(page, testId, [{
        date: new Date().toISOString().split('T')[0],
        description: 'Test Transaction for Icon',
        amount: 25,
        type: 'expense',
        categoryId: categories[0]?.id,
      }])
      await page.reload()

      // Find category icon container
      const iconContainer = page.getByTestId('category-icon').first()
      await expect(iconContainer).toBeVisible()

      // Check that it contains an SVG element, not just text
      const hasSvg = await iconContainer.locator('svg').count()

      // THIS WILL FAIL until we fix the icon rendering
      expect(hasSvg).toBeGreaterThan(0)

      // Also verify it does NOT contain plain text icon names
      const innerText = await iconContainer.evaluate(el => el.textContent?.trim())
      const iconNames = ['wallet', 'folder', 'utensils', 'car', 'home', 'coffee', 'shopping-bag']
      const containsPlainText = iconNames.some(name => innerText === name)

      expect(containsPlainText).toBe(false)
    })

    test('ICON-002: Multiple transactions should all render SVG icons', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      const testId = generateShortId()
      const categories = await seedIsolatedCategories(page, testId, [
        TEST_CATEGORIES.foodAndDining,
        TEST_CATEGORIES.transportation,
      ])

      await seedIsolatedTransactions(page, testId, [
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Food Transaction',
          amount: 25,
          type: 'expense',
          categoryId: categories[0]?.id,
        },
        {
          date: new Date().toISOString().split('T')[0],
          description: 'Transport Transaction',
          amount: 15,
          type: 'expense',
          categoryId: categories[1]?.id,
        },
      ])
      await page.reload()

      // Check all category icon containers have SVG
      const iconContainers = page.getByTestId('category-icon')
      const count = await iconContainers.count()

      expect(count).toBeGreaterThanOrEqual(2)

      for (let i = 0; i < count; i++) {
        const container = iconContainers.nth(i)
        const hasSvg = await container.locator('svg').count()
        expect(hasSvg).toBeGreaterThan(0)
      }
    })

    test('ICON-003: Icon should inherit color from category', async ({ page }) => {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      const testId = generateShortId()
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
      await seedIsolatedTransactions(page, testId, [{
        date: new Date().toISOString().split('T')[0],
        description: 'Colored Icon Test',
        amount: 30,
        type: 'expense',
        categoryId: categories[0]?.id,
      }])
      await page.reload()

      const iconContainer = page.getByTestId('category-icon').first()
      await expect(iconContainer).toBeVisible()

      // The SVG should use currentColor which inherits from parent
      const svg = iconContainer.locator('svg')
      if (await svg.count() > 0) {
        const stroke = await svg.evaluate(el => {
          return window.getComputedStyle(el).stroke || el.getAttribute('stroke')
        })
        // Should use currentColor or have an actual color value
        expect(stroke === 'currentColor' || stroke?.startsWith('rgb') || stroke?.startsWith('#')).toBe(true)
      }
    })
  })
})

/**
 * Light Mode Baseline Tests
 */
test.describe('Transaction UI - Light Mode Baseline', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('LIGHTMODE-001: Summary cards should have light pastel backgrounds in light mode', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    const summary = page.getByTestId('total-summary')
    await expect(summary).toBeVisible()

    const incomeCard = summary.locator('> div').first()
    const bgColor = await incomeCard.evaluate(el => window.getComputedStyle(el).backgroundColor)

    // In light mode, these SHOULD be light pastel colors
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number)
      // Light green pastel should have high values
      expect(r).toBeGreaterThan(200)
      expect(g).toBeGreaterThan(240)
      expect(b).toBeGreaterThan(200)
    }
  })
})
```

### CSS Changes Required

**File:** `frontend/src/main/styles/globals.css`

Add dark mode definitions for `-50` color variants:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* ... existing dark mode variables ... */

    /* Add dark mode variants for -50 colors (used as card backgrounds) */
    /* These should be dark, semi-transparent versions */
    --color-success-50: rgba(16, 185, 129, 0.1);  /* Dark green tint */
    --color-error-50: rgba(239, 68, 68, 0.1);     /* Dark red tint */
    --color-primary-50: rgba(59, 130, 246, 0.1);  /* Dark blue tint */
    --color-warning-50: rgba(245, 158, 11, 0.1);  /* Dark amber tint */
    --color-info-50: rgba(6, 182, 212, 0.1);      /* Dark cyan tint */
  }
}
```

### Icon Component Changes

**File:** `frontend/src/main/components/ui/IconPicker/IconPicker.tsx`

Export the `getIconComponent` function:

```typescript
// Change from internal function to exported function
export function getIconComponent(name: string): React.FC<{ className?: string }> {
  return IconSvgs[name] || DefaultIcon
}
```

**File:** `frontend/src/main/components/ui/IconPicker/index.ts`

Update exports:

```typescript
export { IconPicker, type IconPickerProps, getIconComponent } from './IconPicker'
export { CATEGORY_ICONS, ICON_NAMES, type IconDefinition } from './icons'
export { default } from './IconPicker'
```

### TransactionRow Component Changes

**File:** `frontend/src/main/features/transactions/components/TransactionRow.tsx`

Update to use proper icon component:

```typescript
import { getIconComponent } from '@main/components/ui/IconPicker'

// ... inside component ...

// Get the icon component
const IconComponent = getIconComponent(transaction.categoryIcon || 'folder')

// ... in JSX ...
<div
  data-testid="category-icon"
  className="w-10 h-10 rounded-full flex items-center justify-center"
  style={{
    backgroundColor: `${transaction.categoryColor}20`,
    color: transaction.categoryColor
  }}
>
  <IconComponent className="w-5 h-5" />
</div>
```

---

## Files to Modify

### New Files:
- `e2e/tests/m11-polish/transaction-ui-dark-mode.spec.ts`

### Modified Files:
1. `frontend/src/main/styles/globals.css` - Add dark mode `-50` color variants
2. `frontend/src/main/components/ui/IconPicker/IconPicker.tsx` - Export `getIconComponent`
3. `frontend/src/main/components/ui/IconPicker/index.ts` - Add export
4. `frontend/src/main/features/transactions/components/TransactionRow.tsx` - Use icon component

### Files to Audit for Similar Issues:
- `frontend/src/main/features/categories/components/CategoryCard.tsx`
- `frontend/src/main/features/dashboard/components/*.tsx`
- Any component using `categoryIcon` as a string

---

## Step-by-Step Execution Instructions

### Step 1: Create E2E Test File
Create the comprehensive E2E test file at `e2e/tests/m11-polish/transaction-ui-dark-mode.spec.ts` with all the test scenarios defined above.

Run the tests to confirm they fail:
```bash
cd e2e
npx playwright test tests/m11-polish/transaction-ui-dark-mode.spec.ts --project=m11-polish
```

### Step 2: Fix CSS Variables
Update `frontend/src/main/styles/globals.css` to add dark mode `-50` variants.

### Step 3: Export Icon Component Function
1. Update `IconPicker.tsx` to export `getIconComponent`
2. Update `index.ts` to include the export

### Step 4: Fix TransactionRow Icon Rendering
Update `TransactionRow.tsx` to:
1. Import `getIconComponent`
2. Use the component instead of raw string

### Step 5: Audit and Fix Other Components
Search for other places that might render `categoryIcon` as text:
```bash
grep -r "categoryIcon" frontend/src --include="*.tsx" | grep -v "import\|type\|interface"
```

### Step 6: Run E2E Tests
Execute `/fix-e2e` to verify all tests pass.

---

## Acceptance Criteria

- [ ] Income/Expense/Net summary cards have proper contrast in dark mode
- [ ] Cards use dark semi-transparent backgrounds (not light pastels) in dark mode
- [ ] Category icons render as SVG graphics, not plain text
- [ ] Icons inherit color from category color
- [ ] All existing theme-contrast E2E tests still pass
- [ ] New transaction UI dark mode tests pass
- [ ] No visual regression in light mode

---

## Related Documentation

- **Existing Dark Mode Task:** `context/TASK-Fix-Dark-Mode-Contrast-Issues.md`
- **Theme Contrast Tests:** `e2e/tests/m11-polish/theme-contrast.spec.ts`
- **UI Requirements:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md`
- **CSS Variables:** `frontend/src/main/styles/globals.css`

---

## Command Sequence Summary

Execute the following commands in order:

1. **Create E2E Tests:** Write `transaction-ui-dark-mode.spec.ts`
2. **Run Tests (Expect Failures):** Verify tests fail before implementation
3. **Implement CSS Fixes:** Update `globals.css`
4. **Implement Icon Export:** Update `IconPicker` exports
5. **Implement Icon Rendering:** Update `TransactionRow.tsx`
6. **Audit Other Components:** Check for similar icon rendering issues
7. **Verification:** `/fix-e2e` to ensure all tests pass

This ensures a **Test-Driven Development (TDD)** approach where tests define expected behavior before implementation.
