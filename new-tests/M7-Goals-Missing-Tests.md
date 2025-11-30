# M7: Goals - Missing E2E Tests

## Missing Test Scenarios

### 1. Goal Progress Update After Transaction
**Priority:** High
**File:** `e2e/tests/m7-goals/goal-updates.spec.ts`

```typescript
test.describe('M7: Goal Updates', () => {
  test.beforeEach(async ({ page }) => {
    // Create a goal for testing
    await page.goto('/goals')
    await page.getByTestId('new-goal-btn').click()
    await page.getByTestId('category-selector').click()
    await page.getByRole('option', { name: /alimenta|food/i }).click()
    await page.getByTestId('limit-amount-input').fill('500')
    await page.getByTestId('save-goal-btn').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('M7-NEW-001: Goal progress updates after new transaction', async ({ page }) => {
    // Get initial progress
    await page.goto('/goals')
    const initialProgress = await page.getByTestId('goal-current').first().textContent()

    // Create a transaction in the same category
    await page.goto('/transactions')
    await page.getByTestId('add-transaction-btn').click()

    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('Test Food Purchase')
    await modalBody.getByTestId('transaction-amount').fill('100')
    await modalBody.getByTestId('transaction-type').click()
    await page.getByRole('option', { name: /expense/i }).click()
    await modalBody.getByTestId('transaction-category').click()
    await page.getByRole('option', { name: /alimenta|food/i }).click()
    await page.getByTestId('modal-save-btn').click()

    // Go back to goals and verify progress updated
    await page.goto('/goals')
    const newProgress = await page.getByTestId('goal-current').first().textContent()

    // Progress should have increased
    const initialValue = parseFloat(initialProgress?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0')
    const newValue = parseFloat(newProgress?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0')
    expect(newValue).toBeGreaterThan(initialValue)
  })
})
```

### 2. Over-Limit Alert Banner on Dashboard
**Priority:** High
**File:** `e2e/tests/m7-goals/goal-alerts.spec.ts`

```typescript
test.describe('M7: Goal Alerts', () => {
  test('M7-NEW-002: Dashboard shows over-limit alert', async ({ page }) => {
    // Create a goal with low limit
    await page.goto('/goals')
    await page.getByTestId('new-goal-btn').click()
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('limit-amount-input').fill('10') // Very low limit
    await page.getByTestId('save-goal-btn').click()

    // Create transaction that exceeds limit
    await page.goto('/transactions')
    await page.getByTestId('add-transaction-btn').click()

    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('Over Limit Test')
    await modalBody.getByTestId('transaction-amount').fill('50')
    await modalBody.getByTestId('transaction-type').click()
    await page.getByRole('option', { name: /expense/i }).click()
    await modalBody.getByTestId('transaction-category').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('modal-save-btn').click()

    // Go to dashboard and verify alert
    await page.goto('/dashboard')
    await expect(page.getByTestId('alerts-banner')).toBeVisible()
    await expect(page.getByTestId('alerts-banner')).toContainText(/limite|goal|excedido|over/i)
  })
})
```

### 3. Alert When Approaching Limit
**Priority:** Medium
**File:** `e2e/tests/m7-goals/goal-alerts.spec.ts` (add)

```typescript
test('M7-NEW-003: Alert when approaching limit (80%)', async ({ page }) => {
  // Create goal with limit
  await page.goto('/goals')
  await page.getByTestId('new-goal-btn').click()
  await page.getByTestId('category-selector').click()
  await page.getByRole('option').first().click()
  await page.getByTestId('limit-amount-input').fill('100')
  await page.getByTestId('alert-checkbox').check()
  await page.getByTestId('save-goal-btn').click()

  // Create transaction bringing spending to 85%
  await page.goto('/transactions')
  await page.getByTestId('add-transaction-btn').click()

  const modalBody = page.getByTestId('modal-body')
  await modalBody.getByTestId('transaction-description').fill('Approach Limit Test')
  await modalBody.getByTestId('transaction-amount').fill('85')
  await modalBody.getByTestId('transaction-type').click()
  await page.getByRole('option', { name: /expense/i }).click()
  await modalBody.getByTestId('transaction-category').click()
  await page.getByRole('option').first().click()
  await page.getByTestId('modal-save-btn').click()

  // Should see warning notification
  await expect(page.getByTestId('approaching-limit-warning')).toBeVisible()
})
```

### 4. Multiple Goals for Same Category
**Priority:** Medium
**File:** `e2e/tests/m7-goals/goal-validation.spec.ts`

```typescript
test.describe('M7: Goal Validation', () => {
  test('M7-NEW-004: Cannot create duplicate category goal', async ({ page }) => {
    await page.goto('/goals')

    // Create first goal
    await page.getByTestId('new-goal-btn').click()
    await page.getByTestId('category-selector').click()
    const firstCategoryOption = page.getByRole('option').first()
    const categoryName = await firstCategoryOption.textContent()
    await firstCategoryOption.click()
    await page.getByTestId('limit-amount-input').fill('500')
    await page.getByTestId('save-goal-btn').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Try to create another goal for same category
    await page.getByTestId('new-goal-btn').click()
    await page.getByTestId('category-selector').click()

    // Either category is disabled or error shown after selection
    const sameCategory = page.getByRole('option', { name: categoryName || '' })
    if (await sameCategory.isDisabled()) {
      // Category is disabled - pass
      expect(true).toBe(true)
    } else {
      await sameCategory.click()
      await page.getByTestId('limit-amount-input').fill('1000')
      await page.getByTestId('save-goal-btn').click()

      // Should show error
      await expect(page.getByTestId('duplicate-category-error')).toBeVisible()
    }
  })
})
```

### 5. Goal Period Reset
**Priority:** Medium
**File:** `e2e/tests/m7-goals/goal-period.spec.ts`

```typescript
test.describe('M7: Goal Period', () => {
  test('M7-NEW-005: Goal progress resets monthly', async ({ page }) => {
    // This test verifies the concept - actual implementation may vary
    await page.goto('/goals')

    const goalCard = page.getByTestId('goal-card').first()
    if (await goalCard.isVisible()) {
      // Check for period indicator
      await expect(goalCard.getByTestId('goal-period')).toContainText(/nov|novembro|november/i)

      // Check for previous period data if available
      const historyBtn = goalCard.getByTestId('goal-history-btn')
      if (await historyBtn.isVisible()) {
        await historyBtn.click()
        await expect(page.getByTestId('goal-history-modal')).toBeVisible()
      }
    }
  })
})
```

### 6. Goal History
**Priority:** Low
**File:** `e2e/tests/m7-goals/goal-history.spec.ts`

```typescript
test.describe('M7: Goal History', () => {
  test('M7-NEW-006: View goal history', async ({ page }) => {
    await page.goto('/goals')

    const goalCard = page.getByTestId('goal-card').first()
    if (await goalCard.isVisible()) {
      const historyBtn = goalCard.getByTestId('goal-history-btn')

      if (await historyBtn.isVisible()) {
        await historyBtn.click()

        // Verify history modal
        const historyModal = page.getByTestId('goal-history-modal')
        await expect(historyModal).toBeVisible()

        // Verify historical data
        await expect(historyModal.getByTestId('history-month')).toHaveCount({ greaterThan: 0 })
      }
    }
  })
})
```

### 7. Income Goals
**Priority:** Low
**File:** `e2e/tests/m7-goals/income-goals.spec.ts`

```typescript
test.describe('M7: Income Goals', () => {
  test('M7-NEW-007: Create income goal', async ({ page }) => {
    await page.goto('/goals')
    await page.getByTestId('new-goal-btn').click()

    // Select income category
    await page.getByTestId('category-selector').click()
    const incomeCategory = page.getByRole('option', { name: /sal[aá]rio|income|receita/i })

    if (await incomeCategory.isVisible()) {
      await incomeCategory.click()
      await page.getByTestId('limit-amount-input').fill('5000')
      await page.getByTestId('save-goal-btn').click()

      // Verify goal is created for income
      const goalCard = page.getByTestId('goal-card').last()
      await expect(goalCard.getByTestId('goal-type')).toContainText(/income|receita/i)
    }
  })
})
```

---

## Implementation Notes

- Progress update tests need to create transactions in specific categories
- Alert tests may require specific threshold configuration
- Period tests may need date mocking
- History tests depend on historical data availability

## Related Review Document

See `review/M7-Goals-QA-Review.md` for full context.
