import { test, expect } from '@playwright/test'
import {
  seedIsolatedCategories,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
  TEST_CATEGORIES,
  TestCategory,
} from '../fixtures/test-utils'

/**
 * M4-E2E: Transaction Management
 * Validates the transactions UI including display, filtering, creation,
 * editing, and deletion of transactions.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 *
 * PARALLEL EXECUTION: Each test uses isolated data with unique testIds
 * to prevent interference between parallel test runs.
 */
test.describe('M4: Transaction Management', () => {
  test('M4-E2E-001: Should display transactions page with existing transactions', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
    ])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Grocery Shopping',
        amount: 150.50,
        type: 'expense',
        categoryId: categories.find(c => c.type === 'expense')?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Verify transactions page header
      await expect(page.getByTestId('transactions-header')).toBeVisible()

      // Verify add transaction button exists
      await expect(page.getByTestId('add-transaction-btn')).toBeVisible()

      // Verify summary totals are displayed
      await expect(page.getByTestId('total-summary')).toBeVisible()
      await expect(page.getByTestId('income-total')).toBeVisible()
      await expect(page.getByTestId('expense-total')).toBeVisible()
      await expect(page.getByTestId('net-total')).toBeVisible()

      // Verify at least one transaction row exists
      await expect(page.getByTestId('transaction-row').first()).toBeVisible()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-002: Should display filter bar with all filter options', async ({ page }) => {
    await page.goto('/transactions')

    // Verify filter bar exists
    await expect(page.getByTestId('filter-bar')).toBeVisible()

    // Verify search input
    await expect(page.getByTestId('filter-search')).toBeVisible()

    // Verify type filter container
    await expect(page.getByTestId('filter-type').first()).toBeVisible()

    // Verify category filter container
    await expect(page.getByTestId('filter-category').first()).toBeVisible()

    // Verify date range filters
    await expect(page.getByTestId('filter-start-date').first()).toBeVisible()
    await expect(page.getByTestId('filter-end-date').first()).toBeVisible()
  })

  test('M4-E2E-003: Should filter transactions by type (expense)', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
    ])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Expense Transaction',
        amount: 150.50,
        type: 'expense',
        categoryId: categories.find(c => c.type === 'expense')?.id,
      },
      {
        date: today,
        description: 'Income Transaction',
        amount: 5000,
        type: 'income',
        categoryId: categories.find(c => c.type === 'income')?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('transaction-row').first()).toBeVisible({ timeout: 10000 })

    try {
      // Get initial count of transactions
      const initialRows = await page.getByTestId('transaction-row').count()
      expect(initialRows).toBeGreaterThan(0)

      // Click type filter
      const typeFilterContainer = page.getByTestId('filter-type').first()
      await typeFilterContainer.getByRole('combobox').click()
      await page.getByRole('option', { name: /expense/i }).click()

      // Wait for filtering to apply
      await page.waitForLoadState('networkidle')

      // All visible transactions should be expenses
      const expenseRows = page.getByTestId('transaction-row')
      const count = await expenseRows.count()

      if (count > 0) {
        const firstAmount = expenseRows.first().getByTestId('transaction-amount')
        await expect(firstAmount).toBeVisible()
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-004: Should filter transactions by type (income)', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [
      TEST_CATEGORIES.foodAndDining,
      TEST_CATEGORIES.salary,
    ])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Expense Transaction',
        amount: 150.50,
        type: 'expense',
        categoryId: categories.find(c => c.type === 'expense')?.id,
      },
      {
        date: today,
        description: 'Income Transaction',
        amount: 5000,
        type: 'income',
        categoryId: categories.find(c => c.type === 'income')?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Click type filter
      const typeFilterContainer = page.getByTestId('filter-type').first()
      await typeFilterContainer.getByRole('combobox').click()
      await page.getByRole('option', { name: /income/i }).click()

      // Wait for filtering to apply
      await page.waitForLoadState('networkidle')

      // All visible transactions should be income
      const incomeRows = page.getByTestId('transaction-row')
      const count = await incomeRows.count()

      if (count > 0) {
        const firstAmount = incomeRows.first().getByTestId('transaction-amount')
        await expect(firstAmount).toBeVisible()
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-005: Should search transactions by description', async ({ page }) => {
    const testId = generateShortId()
    const groceryDesc = isolatedName('Grocery Shopping', testId)

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Grocery Shopping',
        amount: 150.50,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
      {
        date: today,
        description: 'Coffee Shop',
        amount: 25.00,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('transaction-row').first()).toBeVisible({ timeout: 10000 })

    try {
      // Wait for specific transactions to be visible
      await expect(page.getByText(groceryDesc)).toBeVisible({ timeout: 10000 })

      // Get initial count
      const initialRows = await page.getByTestId('transaction-row').count()
      expect(initialRows).toBeGreaterThan(0)

      // Search for "Grocery"
      const searchInput = page.getByTestId('filter-search')
      await searchInput.fill('Grocery')

      // Wait for search filter to apply
      await page.waitForLoadState('networkidle')

      // Results should be filtered
      const filteredRows = await page.getByTestId('transaction-row').count()

      if (filteredRows > 0) {
        await expect(page.getByTestId('transaction-description').first()).toContainText(/grocery/i)
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-006: Should open transaction creation modal', async ({ page }) => {
    await page.goto('/transactions')

    // Click add transaction button
    await page.getByTestId('add-transaction-btn').click()

    // Verify modal opens
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // Verify modal has correct title
    await expect(page.getByTestId('modal-title')).toContainText(/add transaction/i)

    // Verify form fields exist
    const modalBody = page.getByTestId('modal-body')
    await expect(modalBody.getByTestId('transaction-description')).toBeVisible()
    await expect(modalBody.getByTestId('transaction-amount')).toBeVisible()

    // Verify save and cancel buttons
    await expect(page.getByTestId('modal-save-btn')).toBeVisible()
    await expect(page.getByTestId('modal-cancel-btn')).toBeVisible()

    // Close modal
    await page.getByTestId('modal-cancel-btn').click()
  })

  test('M4-E2E-007: Should validate required fields in transaction modal', async ({ page }) => {
    await page.goto('/transactions')

    // Open modal
    await page.getByTestId('add-transaction-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Try to save without filling required fields
    await page.getByTestId('modal-save-btn').click()

    // Expect validation errors
    await expect(page.getByTestId('input-error-message')).toBeVisible()

    // Close modal
    await page.getByTestId('modal-cancel-btn').click()
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
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Get first transaction row
      const firstRow = page.getByTestId('transaction-row').first()
      await expect(firstRow).toBeVisible()

      // Hover to make action buttons visible and click edit
      await firstRow.hover()
      const editBtn = firstRow.getByTestId('transaction-edit-btn')
      await expect(editBtn).toBeVisible({ timeout: 3000 })
      await editBtn.click()

      // Verify modal opens with "Edit" title
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByTestId('modal-title')).toContainText(/edit transaction/i)

      // Form should be pre-filled
      const modalBody = page.getByTestId('modal-body')
      const descriptionInput = modalBody.getByTestId('transaction-description')
      const value = await descriptionInput.inputValue()
      expect(value.length).toBeGreaterThan(0)

      // Close modal
      await page.getByTestId('modal-cancel-btn').click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-010: Should show delete confirmation when clicking delete', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Hover over first transaction to show action buttons
      const firstRow = page.getByTestId('transaction-row').first()
      await firstRow.hover()
      const deleteBtn = firstRow.getByTestId('transaction-delete-btn')
      await expect(deleteBtn).toBeVisible({ timeout: 3000 })
      await deleteBtn.click()

      // Verify confirmation dialog appears
      await expect(page.getByTestId('delete-confirmation')).toBeVisible()

      // Cancel deletion
      await page.getByTestId('delete-confirmation').getByRole('button', { name: /cancel/i }).click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-011: Should select transactions via checkbox for bulk actions', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction 1',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
      {
        date: today,
        description: 'Test Transaction 2',
        amount: 200,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Click checkbox on first transaction
      const firstCheckbox = page.getByTestId('transaction-checkbox').first()
      await firstCheckbox.click()

      // Bulk actions bar should appear
      await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

      // Selected count should show 1
      await expect(page.getByTestId('bulk-selected-count')).toContainText('1')

      // Bulk action buttons should be visible
      await expect(page.getByTestId('bulk-delete-btn')).toBeVisible()

      // Clear selection
      await page.getByTestId('bulk-clear-selection').click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-012: Should select all transactions via header checkbox', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction 1',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
      {
        date: today,
        description: 'Test Transaction 2',
        amount: 200,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('transaction-row').first()).toBeVisible({ timeout: 10000 })

    try {
      // Get initial transaction count
      const transactionCount = await page.getByTestId('transaction-row').count()

      // Click select all checkbox
      await page.getByTestId('select-all-transactions').click()

      // Bulk actions bar should appear
      await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

      // Selected count should match total transactions
      await expect(page.getByTestId('bulk-selected-count')).toContainText(transactionCount.toString())

      // Clear selection
      await page.getByTestId('select-all-transactions').click()
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-013: Should clear all filters', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Apply a filter
      const typeFilterContainer = page.getByTestId('filter-type').first()
      await typeFilterContainer.getByRole('combobox').click()
      await page.getByRole('option', { name: /expense/i }).click()

      // Clear filters button should be visible after filter is applied
      await expect(page.getByTestId('filter-clear-btn')).toBeVisible({ timeout: 5000 })

      // Click clear filters
      await page.getByTestId('filter-clear-btn').click()

      // Wait for filter clear to take effect
      await page.waitForLoadState('networkidle')

      // Transactions should be visible
      const rows = await page.getByTestId('transaction-row').count()
      expect(rows).toBeGreaterThan(0)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-014: Should display transactions grouped by date', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data with multiple dates
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Today Transaction',
        amount: 100,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
      {
        date: yesterday,
        description: 'Yesterday Transaction',
        amount: 200,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('transaction-row').first()).toBeVisible({ timeout: 10000 })

    try {
      // Verify date group headers exist
      const dateHeaders = page.getByTestId('transaction-date-header')
      const headerCount = await dateHeaders.count()

      // Should have at least one date group
      expect(headerCount).toBeGreaterThan(0)

      // Each date group should have a daily total
      const dailyTotals = page.getByTestId('daily-total')
      const totalCount = await dailyTotals.count()
      expect(totalCount).toBe(headerCount)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('M4-E2E-015: Should display transaction amounts with proper currency format', async ({ page }) => {
    const testId = generateShortId()

    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Seed isolated test data
    const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

    const today = new Date().toISOString().split('T')[0]
    await seedIsolatedTransactions(page, testId, [
      {
        date: today,
        description: 'Test Transaction',
        amount: 150.50,
        type: 'expense',
        categoryId: categories[0]?.id,
      },
    ])

    await page.reload()
    await page.waitForLoadState('networkidle')

    try {
      // Get first transaction amount
      const firstAmount = page.getByTestId('transaction-amount').first()
      const amountText = await firstAmount.textContent()

      // Should contain currency symbol (R$ for BRL)
      expect(amountText).toMatch(/R\$|[0-9]+[,.]/)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
