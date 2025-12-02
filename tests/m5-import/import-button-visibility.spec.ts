import { test, expect } from '@playwright/test'
import {
  seedIsolatedCategories,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
  TEST_CATEGORIES,
} from '../fixtures/test-utils'

/**
 * BUG: Import Button Visibility for New Accounts
 *
 * Issue: When a user first creates an account and enters the transactions section,
 * the import button is not visible. The user can only add a single transaction manually,
 * and only after that does the import button show up.
 *
 * Expected behavior: The import button should be visible immediately when a user
 * navigates to the transactions page, even if they have no transactions yet.
 *
 * This test validates that the import button is visible on an empty transactions page.
 */
test.describe('BUG: Import Button Visibility for New Accounts', () => {
  test('BUG-001: Import button should be visible on empty transactions page', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Wait for page to fully load
      await expect(page.getByTestId('transactions-header')).toBeVisible({ timeout: 10000 })

      // The import button SHOULD be visible even with no transactions
      // This test will FAIL if the bug exists (import button is hidden for empty state)
      const importButton = page.getByTestId('import-transactions-btn')
      await expect(importButton).toBeVisible({ timeout: 5000 })
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-002: Import button should be clickable and open modal on empty page', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Wait for page to load
      await expect(page.getByTestId('transactions-header')).toBeVisible({ timeout: 10000 })

      // Verify import button exists and is clickable
      const importButton = page.getByTestId('import-transactions-btn')
      await expect(importButton).toBeVisible({ timeout: 5000 })
      await expect(importButton).toBeEnabled()

      // Click the import button
      await importButton.click()

      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-003: Empty state should show both import and add transaction options', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Wait for page to load
      await expect(page.getByTestId('transactions-header')).toBeVisible({ timeout: 10000 })

      // Both buttons should be visible in header or empty state
      const importButton = page.getByTestId('import-transactions-btn')
      const addButton = page.getByTestId('add-transaction-btn')

      await expect(importButton).toBeVisible({ timeout: 5000 })
      await expect(addButton).toBeVisible({ timeout: 5000 })

      // If there's an empty state, verify it's visible (import is in header now)
      const emptyState = page.getByTestId('empty-state')
      if (await emptyState.isVisible().catch(() => false)) {
        // Empty state should mention import option in description
        const importDescription = emptyState.getByText(/import/i)
        await expect(importDescription).toBeVisible()
      }
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-004: Import button should remain visible after adding first manual transaction', async ({ page }) => {
    const testId = generateShortId()

    try {
      // Go to transactions first so we have a page context for API calls
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Now create an isolated category (required for transactions)
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

      // Reload to ensure the category is picked up by the frontend
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify import button is visible BEFORE any transaction
      const importButton = page.getByTestId('import-transactions-btn')
      await expect(importButton).toBeVisible({ timeout: 5000 })

      // Add a manual transaction
      await page.getByTestId('add-transaction-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Fill transaction form with isolated name
      const modalBody = page.getByTestId('modal-body')
      await modalBody.getByTestId('transaction-description').fill(isolatedName('Test Transaction', testId))
      await modalBody.getByTestId('transaction-amount').fill('100')

      // Select category - wait for the option to be available (categories load async)
      await modalBody.getByTestId('transaction-category').click()
      await expect(page.getByRole('option', { name: categories[0].name })).toBeVisible({ timeout: 5000 })
      await page.getByRole('option', { name: categories[0].name }).click()

      // Save transaction
      await page.getByTestId('modal-save-btn').click()
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

      // Wait for transaction list to update
      await page.waitForLoadState('networkidle')

      // Import button should STILL be visible after adding transaction
      await expect(importButton).toBeVisible({ timeout: 5000 })
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
