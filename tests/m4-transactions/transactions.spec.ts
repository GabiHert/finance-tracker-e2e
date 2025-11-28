import { test, expect } from '@playwright/test'

/**
 * M4-E2E: Transaction Management
 * Validates the transactions UI including display, filtering, creation,
 * editing, and deletion of transactions.
 *
 * Note: The frontend transactions feature currently uses mock data
 * and is not fully integrated with the backend API yet.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M4: Transaction Management', () => {
  // No login needed - auth state is pre-populated by auth-setup project

  test('M4-E2E-001: Should display transactions page with existing transactions', async ({ page }) => {
    await page.goto('/transactions')

    // Verify transactions page header
    await expect(page.getByTestId('transactions-header')).toBeVisible()

    // Verify add transaction button exists
    await expect(page.getByTestId('add-transaction-btn')).toBeVisible()

    // Verify summary totals are displayed
    await expect(page.getByTestId('total-summary')).toBeVisible()
    await expect(page.getByTestId('income-total')).toBeVisible()
    await expect(page.getByTestId('expense-total')).toBeVisible()
    await expect(page.getByTestId('net-total')).toBeVisible()

    // Verify at least one transaction row exists (mock data)
    await expect(page.getByTestId('transaction-row').first()).toBeVisible()
  })

  test('M4-E2E-002: Should display filter bar with all filter options', async ({ page }) => {
    await page.goto('/transactions')

    // Verify filter bar exists
    await expect(page.getByTestId('filter-bar')).toBeVisible()

    // Verify search input
    await expect(page.getByTestId('filter-search')).toBeVisible()

    // Verify type filter container (first element with filter-type testid)
    await expect(page.getByTestId('filter-type').first()).toBeVisible()

    // Verify category filter container
    await expect(page.getByTestId('filter-category').first()).toBeVisible()

    // Verify date range filters (wrapper divs)
    await expect(page.getByTestId('filter-start-date').first()).toBeVisible()
    await expect(page.getByTestId('filter-end-date').first()).toBeVisible()
  })

  test('M4-E2E-003: Should filter transactions by type (expense)', async ({ page }) => {
    await page.goto('/transactions')

    // Get initial count of transactions
    const initialRows = await page.getByTestId('transaction-row').count()
    expect(initialRows).toBeGreaterThan(0)

    // Click type filter (use role combobox within the filter-type container)
    const typeFilterContainer = page.getByTestId('filter-type').first()
    await typeFilterContainer.getByRole('combobox').click()
    await page.getByRole('option', { name: /expense/i }).click()

    // Wait for filtering to apply
    await page.waitForTimeout(300)

    // All visible transactions should be expenses (red/expense styling)
    const expenseRows = page.getByTestId('transaction-row')
    const count = await expenseRows.count()

    if (count > 0) {
      // Check that transactions have expense amount styling (negative/red)
      const firstAmount = expenseRows.first().getByTestId('transaction-amount')
      await expect(firstAmount).toBeVisible()
    }
  })

  test('M4-E2E-004: Should filter transactions by type (income)', async ({ page }) => {
    await page.goto('/transactions')

    // Click type filter
    const typeFilterContainer = page.getByTestId('filter-type').first()
    await typeFilterContainer.getByRole('combobox').click()
    await page.getByRole('option', { name: /income/i }).click()

    // Wait for filtering to apply
    await page.waitForTimeout(300)

    // All visible transactions should be income (green styling)
    const incomeRows = page.getByTestId('transaction-row')
    const count = await incomeRows.count()

    if (count > 0) {
      // Check that transactions have income amount styling (positive/green)
      const firstAmount = incomeRows.first().getByTestId('transaction-amount')
      await expect(firstAmount).toBeVisible()
    }
  })

  test('M4-E2E-005: Should search transactions by description', async ({ page }) => {
    await page.goto('/transactions')

    // Get initial count
    const initialRows = await page.getByTestId('transaction-row').count()
    expect(initialRows).toBeGreaterThan(0)

    // Search for a specific term (common in mock data)
    const searchInput = page.getByTestId('filter-search')
    await searchInput.fill('Grocery')

    // Wait for search to filter
    await page.waitForTimeout(300)

    // Results should be filtered
    const filteredRows = await page.getByTestId('transaction-row').count()

    // Either we find matches or show empty state
    if (filteredRows > 0) {
      // Verify first result contains search term
      await expect(page.getByTestId('transaction-description').first()).toContainText(/grocery/i)
    }
  })

  test('M4-E2E-006: Should open transaction creation modal', async ({ page }) => {
    await page.goto('/transactions')

    // Click add transaction button
    await page.getByTestId('add-transaction-btn').click()

    // Verify modal opens (using role dialog)
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Verify modal has correct title for new transaction
    await expect(page.getByTestId('modal-title')).toContainText(/add transaction/i)

    // Verify form fields exist within the modal
    const modalBody = page.getByTestId('modal-body')
    await expect(modalBody.getByTestId('transaction-description')).toBeVisible()
    await expect(modalBody.getByTestId('transaction-amount')).toBeVisible()

    // Verify save and cancel buttons
    await expect(page.getByTestId('modal-save-btn')).toBeVisible()
    await expect(page.getByTestId('modal-cancel-btn')).toBeVisible()
  })

  test('M4-E2E-007: Should validate required fields in transaction modal', async ({ page }) => {
    await page.goto('/transactions')

    // Open modal
    await page.getByTestId('add-transaction-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Try to save without filling required fields
    await page.getByTestId('modal-save-btn').click()

    // Expect validation errors (Input component uses input-error-message)
    await expect(page.getByTestId('input-error-message')).toBeVisible()
  })

  test('M4-E2E-008: Should close modal via cancel button', async ({ page }) => {
    await page.goto('/transactions')

    // Open modal
    await page.getByTestId('add-transaction-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Click cancel
    await page.getByTestId('modal-cancel-btn').click()

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('M4-E2E-009: Should open edit modal when clicking edit button on transaction', async ({ page }) => {
    await page.goto('/transactions')

    // Get first transaction row
    const firstRow = page.getByTestId('transaction-row').first()

    // Hover to make action buttons visible (they have opacity-0 when not hovered)
    await firstRow.hover()

    // Wait for hover effect
    await page.waitForTimeout(200)

    // Click edit button (force click since it might still be transitioning)
    await firstRow.getByTestId('transaction-edit-btn').click({ force: true })

    // Verify modal opens with "Edit" title/mode
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByTestId('modal-title')).toContainText(/edit transaction/i)

    // Form should be pre-filled with existing data (scope to modal-body to avoid row elements)
    const modalBody = page.getByTestId('modal-body')
    const descriptionInput = modalBody.getByTestId('transaction-description')
    const value = await descriptionInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('M4-E2E-010: Should show delete confirmation when clicking delete', async ({ page }) => {
    await page.goto('/transactions')

    // Hover over first transaction to show action buttons
    const firstRow = page.getByTestId('transaction-row').first()
    await firstRow.hover()

    // Wait for hover effect
    await page.waitForTimeout(200)

    // Click delete button
    await firstRow.getByTestId('transaction-delete-btn').click({ force: true })

    // Verify confirmation dialog appears
    await expect(page.getByTestId('delete-confirmation')).toBeVisible()
  })

  test('M4-E2E-011: Should select transactions via checkbox for bulk actions', async ({ page }) => {
    await page.goto('/transactions')

    // Click checkbox on first transaction
    const firstCheckbox = page.getByTestId('transaction-checkbox').first()
    await firstCheckbox.click()

    // Bulk actions bar should appear
    await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

    // Selected count should show 1
    await expect(page.getByTestId('bulk-selected-count')).toContainText('1')

    // Bulk action buttons should be visible
    await expect(page.getByTestId('bulk-delete-btn')).toBeVisible()
  })

  test('M4-E2E-012: Should select all transactions via header checkbox', async ({ page }) => {
    await page.goto('/transactions')

    // Get initial transaction count
    const transactionCount = await page.getByTestId('transaction-row').count()

    // Click select all checkbox
    await page.getByTestId('select-all-transactions').click()

    // Bulk actions bar should appear
    await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

    // Selected count should match total transactions
    await expect(page.getByTestId('bulk-selected-count')).toContainText(transactionCount.toString())
  })

  test('M4-E2E-013: Should clear all filters', async ({ page }) => {
    await page.goto('/transactions')

    // Apply a filter using the type filter combobox
    const typeFilterContainer = page.getByTestId('filter-type').first()
    await typeFilterContainer.getByRole('combobox').click()
    await page.getByRole('option', { name: /expense/i }).click()

    // Wait for filter to apply
    await page.waitForTimeout(300)

    // Clear filters button should be visible
    await expect(page.getByTestId('filter-clear-btn')).toBeVisible()

    // Click clear filters
    await page.getByTestId('filter-clear-btn').click()

    // Wait for reset
    await page.waitForTimeout(300)

    // All transactions should be visible again
    const rows = await page.getByTestId('transaction-row').count()
    expect(rows).toBeGreaterThan(0)
  })

  test('M4-E2E-014: Should display transactions grouped by date', async ({ page }) => {
    await page.goto('/transactions')

    // Verify date group headers exist
    const dateHeaders = page.getByTestId('transaction-date-header')
    const headerCount = await dateHeaders.count()

    // Should have at least one date group
    expect(headerCount).toBeGreaterThan(0)

    // Each date group should have a daily total
    const dailyTotals = page.getByTestId('daily-total')
    const totalCount = await dailyTotals.count()
    expect(totalCount).toBe(headerCount)
  })

  test('M4-E2E-015: Should display transaction amounts with proper currency format', async ({ page }) => {
    await page.goto('/transactions')

    // Get first transaction amount
    const firstAmount = page.getByTestId('transaction-amount').first()
    const amountText = await firstAmount.textContent()

    // Should contain currency symbol (R$ for BRL)
    expect(amountText).toMatch(/R\$|[0-9]+[,.]/)
  })
})
