# M4: Transactions - Missing E2E Tests

## Missing Test Scenarios

### 1. Complete Transaction Creation Flow
**Priority:** High
**File:** `e2e/tests/m4-transactions/transaction-crud.spec.ts`

```typescript
test.describe('M4: Transaction CRUD', () => {
  test('M4-NEW-001: Complete transaction creation flow', async ({ page }) => {
    // Step 1: Navigate to transactions screen
    await page.goto('/transactions')
    const initialCount = await page.getByTestId('transaction-row').count()

    // Step 2: Click "Add Transaction" button
    await page.getByTestId('add-transaction-btn').click()

    // Step 3: Verify modal opens
    await expect(page.getByRole('dialog')).toBeVisible()

    // Step 4: Fill in description
    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('Test Transaction')

    // Step 5: Enter amount
    await modalBody.getByTestId('transaction-amount').fill('150.00')

    // Step 6: Select date
    await modalBody.getByTestId('transaction-date').fill('2025-11-20')

    // Step 7: Select category
    await modalBody.getByTestId('transaction-category').click()
    await page.getByRole('option').first().click()

    // Step 8: Select type
    await modalBody.getByTestId('transaction-type').click()
    await page.getByRole('option', { name: /expense/i }).click()

    // Step 9: Click "Save"
    await page.getByTestId('modal-save-btn').click()

    // Step 10: Verify modal closes
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Step 11: Verify success toast
    await expect(page.getByTestId('toast-success')).toBeVisible()

    // Step 12: Verify new transaction in list
    await expect(page.getByTestId('transaction-row')).toHaveCount(initialCount + 1)
    await expect(page.getByText('Test Transaction')).toBeVisible()
  })

  test('M4-NEW-002: Complete transaction edit flow', async ({ page }) => {
    await page.goto('/transactions')

    // Get first transaction
    const firstRow = page.getByTestId('transaction-row').first()
    await firstRow.hover()
    await firstRow.getByTestId('transaction-edit-btn').click({ force: true })

    // Verify modal opens with data
    await expect(page.getByRole('dialog')).toBeVisible()
    const modalBody = page.getByTestId('modal-body')
    const descInput = modalBody.getByTestId('transaction-description')
    const originalValue = await descInput.inputValue()
    expect(originalValue.length).toBeGreaterThan(0)

    // Update description
    await descInput.clear()
    await descInput.fill('Updated Transaction')

    // Save changes
    await page.getByTestId('modal-save-btn').click()

    // Verify modal closes and update appears
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Updated Transaction')).toBeVisible()
  })
})
```

### 2. Transaction Deletion Flow
**Priority:** Medium
**File:** `e2e/tests/m4-transactions/transaction-crud.spec.ts` (add to above)

```typescript
test('M4-NEW-003: Delete transaction with confirmation', async ({ page }) => {
  await page.goto('/transactions')

  const initialCount = await page.getByTestId('transaction-row').count()
  expect(initialCount).toBeGreaterThan(0)

  // Hover and click delete
  const firstRow = page.getByTestId('transaction-row').first()
  await firstRow.hover()
  await firstRow.getByTestId('transaction-delete-btn').click({ force: true })

  // Verify confirmation dialog
  await expect(page.getByTestId('delete-confirmation')).toBeVisible()

  // Confirm deletion
  await page.getByTestId('confirm-delete-btn').click()

  // Verify transaction removed
  await expect(page.getByTestId('transaction-row')).toHaveCount(initialCount - 1)

  // Verify success toast
  await expect(page.getByTestId('toast-success')).toBeVisible()
})
```

### 3. Bulk Delete Transactions
**Priority:** Medium
**File:** `e2e/tests/m4-transactions/bulk-actions.spec.ts`

```typescript
test.describe('M4: Bulk Actions', () => {
  test('M4-NEW-004: Bulk delete selected transactions', async ({ page }) => {
    await page.goto('/transactions')

    const initialCount = await page.getByTestId('transaction-row').count()
    expect(initialCount).toBeGreaterThanOrEqual(3)

    // Select first 3 transactions
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('transaction-checkbox').nth(i).click()
    }

    // Verify bulk bar shows count
    await expect(page.getByTestId('bulk-selected-count')).toContainText('3')

    // Click bulk delete
    await page.getByTestId('bulk-delete-btn').click()

    // Verify confirmation shows count
    await expect(page.getByTestId('bulk-delete-confirmation')).toContainText('3')

    // Confirm
    await page.getByTestId('confirm-bulk-delete-btn').click()

    // Verify transactions removed
    await expect(page.getByTestId('transaction-row')).toHaveCount(initialCount - 3)
  })
})
```

### 4. Date Range Filtering
**Priority:** Medium
**File:** `e2e/tests/m4-transactions/transaction-filters.spec.ts`

```typescript
test.describe('M4: Transaction Filters', () => {
  test('M4-NEW-005: Filter transactions by date range', async ({ page }) => {
    await page.goto('/transactions')

    // Set start date
    await page.getByTestId('filter-start-date').fill('2025-11-01')

    // Set end date
    await page.getByTestId('filter-end-date').fill('2025-11-15')

    // Wait for filtering
    await page.waitForTimeout(300)

    // Verify all visible transactions are within range
    const dateHeaders = page.getByTestId('transaction-date-header')
    const count = await dateHeaders.count()

    for (let i = 0; i < count; i++) {
      const dateText = await dateHeaders.nth(i).textContent()
      // Parse and verify date is within range
      expect(dateText).toMatch(/202[0-9]-11-(0[1-9]|1[0-5])/)
    }
  })

  test('M4-NEW-006: Category filter', async ({ page }) => {
    await page.goto('/transactions')

    // Select category filter
    await page.getByTestId('filter-category').first().getByRole('combobox').click()
    const categoryOption = page.getByRole('option').first()
    const categoryName = await categoryOption.textContent()
    await categoryOption.click()

    await page.waitForTimeout(300)

    // Verify all transactions have selected category
    const categoryBadges = page.getByTestId('transaction-category')
    const count = await categoryBadges.count()

    for (let i = 0; i < count; i++) {
      await expect(categoryBadges.nth(i)).toContainText(categoryName || '')
    }
  })
})
```

### 5. Bulk Export
**Priority:** Low
**File:** `e2e/tests/m4-transactions/bulk-actions.spec.ts` (add to existing)

```typescript
test('M4-NEW-007: Export selected transactions', async ({ page }) => {
  await page.goto('/transactions')

  // Select transactions
  await page.getByTestId('transaction-checkbox').first().click()
  await page.getByTestId('transaction-checkbox').nth(1).click()

  // Verify export button visible
  await expect(page.getByTestId('bulk-export-btn')).toBeVisible()

  // Setup download listener
  const downloadPromise = page.waitForEvent('download')

  // Click export
  await page.getByTestId('bulk-export-btn').click()

  // Verify download starts
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('.csv')
})
```

---

## Implementation Notes

- CRUD tests should use unique identifiers to avoid conflicts
- Consider API seeding for consistent test data
- Date filtering tests need transactions with known dates
- Export tests may need download handling configuration

## Related Review Document

See `review/M4-Transactions-QA-Review.md` for full context.
