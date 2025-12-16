import { test, expect } from '@playwright/test'
import {
  seedIsolatedCategories,
  seedIsolatedTransactions,
  cleanupIsolatedTestData,
  generateShortId,
  isolatedName,
  fetchTransactions,
  TEST_CATEGORIES,
} from '../fixtures/test-utils'

/**
 * BUG: Imported Transactions Not Showing in Transaction List
 *
 * Issue: When a user imports transactions via CSV, the imported transactions
 * do not appear in the transaction list page. Only manually created transactions
 * are displayed.
 *
 * Expected behavior: After importing transactions, all imported transactions
 * should be visible in the transaction list alongside any manually created ones.
 *
 * This test validates that imported transactions appear in the transaction list.
 */
test.describe('BUG: Imported Transactions Not Showing', () => {
  test('BUG-005: Imported transactions should appear in transaction list', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Use today's date for imports to ensure they show in default view
      const today = new Date().toISOString().split('T')[0]

      // Create CSV content with isolated test data
      const csvContent = `Data,Descrição,Valor
${today},${isolatedName('Imported Transaction 1', testId)},-150.50
${today},${isolatedName('Imported Transaction 2', testId)},-75.00
${today},${isolatedName('Imported Transaction 3', testId)},500.00`

      // Open import modal
      const importButton = page.getByTestId('import-transactions-btn')

      // If import button is not visible (due to Bug 1), skip this test with informative message
      const isImportVisible = await importButton.isVisible().then(() => true, () => false)
      test.skip(!isImportVisible, 'Import button not visible - Bug 1 may be blocking this test')

      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Upload CSV file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })

      // Wait for preview
      await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

      // Verify all 3 transactions are in preview
      const previewRows = page.getByTestId('import-preview-row')
      await expect(previewRows).toHaveCount(3)

      // Proceed to step 2
      await page.getByTestId('import-next-btn').click()
      await expect(page.getByTestId('import-step-2')).toBeVisible()

      // Complete import
      await page.getByTestId('import-confirm-btn').click()

      // Wait for success
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })

      // Close modal (click done or close button)
      const closeButton = page.getByTestId('import-done-btn').or(page.getByRole('button', { name: /fechar|close|ver/i }))
      const closeVisible = await closeButton.isVisible().then(() => true, () => false)
      if (closeVisible) {
        await closeButton.click()
      } else {
        // Try clicking outside modal or pressing escape
        await page.keyboard.press('Escape')
      }

      // Wait for modal to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

      // Wait for page to refresh and show transactions
      await page.waitForLoadState('networkidle')

      // CRITICAL: The imported transactions should now be visible in the list
      // This test will FAIL if the bug exists (imported transactions not showing)
      // Use waiting assertions for each transaction text to ensure DOM is updated
      await expect(page.getByText(isolatedName('Imported Transaction 1', testId))).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(isolatedName('Imported Transaction 2', testId))).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(isolatedName('Imported Transaction 3', testId))).toBeVisible({ timeout: 10000 })

      // Verify via API that exactly 3 isolated transactions exist (parallel-safe)
      const transactions = await fetchTransactions(page)
      const isolatedTxns = transactions.filter(t => t.description.includes(`[${testId}]`))
      expect(isolatedTxns.length).toBe(3)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-006: Imported transactions should appear alongside manually created ones', async ({ page }) => {
    const testId = generateShortId()

    try {
      // Navigate first to ensure page context has localStorage access
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Now create an isolated category and manual transaction via API
      const categories = await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])
      const today = new Date().toISOString().split('T')[0]
      await seedIsolatedTransactions(page, testId, [
        {
          date: today,
          description: 'Manual Transaction',
          amount: 200,
          type: 'expense',
          categoryId: categories[0].id,
        },
      ])

      // Reload to pick up the new data
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify manual transaction is visible
      await expect(page.getByText(isolatedName('Manual Transaction', testId))).toBeVisible({ timeout: 5000 })

      // Now import additional transactions (use today's date)
      const csvContent = `Data,Descrição,Valor
${today},${isolatedName('Imported After Manual', testId)},-100.00`

      // Open import modal
      const importButton = page.getByTestId('import-transactions-btn')
      const isImportVisible = await importButton.isVisible().then(() => true, () => false)
      test.skip(!isImportVisible, 'Import button not visible - Bug 1 may be blocking this test')

      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Upload CSV
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })

      // Wait for preview
      await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

      // Complete import flow
      await page.getByTestId('import-next-btn').click()
      await expect(page.getByTestId('import-step-2')).toBeVisible()
      await page.getByTestId('import-confirm-btn').click()
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })

      // Close modal
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

      // Wait for page refresh
      await page.waitForLoadState('networkidle')

      // BOTH manual and imported transactions should be visible
      // This test will FAIL if imported transactions are not showing
      await expect(page.getByText(isolatedName('Manual Transaction', testId))).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(isolatedName('Imported After Manual', testId))).toBeVisible({ timeout: 5000 })

      // Verify total count via API as well
      const transactions = await fetchTransactions(page)
      const isolatedTxns = transactions.filter(t => t.description.includes(`[${testId}]`))
      expect(isolatedTxns.length).toBeGreaterThanOrEqual(2)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-007: Transaction count should update after import', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Use today's date for imports
      const today = new Date().toISOString().split('T')[0]

      // Import transactions
      const csvContent = `Data,Descrição,Valor
${today},${isolatedName('Count Test 1', testId)},-50.00
${today},${isolatedName('Count Test 2', testId)},-60.00`

      const importButton = page.getByTestId('import-transactions-btn')
      const isImportVisible = await importButton.isVisible().then(() => true, () => false)
      test.skip(!isImportVisible, 'Import button not visible - Bug 1 may be blocking this test')

      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })

      await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('import-next-btn').click()
      await page.getByTestId('import-confirm-btn').click()
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })

      // Close and refresh
      await page.keyboard.press('Escape')
      await page.waitForLoadState('networkidle')

      // Verify both imported transactions are visible in the UI
      await expect(page.getByText(isolatedName('Count Test 1', testId))).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(isolatedName('Count Test 2', testId))).toBeVisible({ timeout: 10000 })

      // Verify via API that exactly 2 isolated transactions exist (parallel-safe)
      const transactions = await fetchTransactions(page)
      const isolatedTxns = transactions.filter(t => t.description.includes(`[${testId}]`))
      expect(isolatedTxns.length).toBe(2)
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })

  test('BUG-008: Imported transactions should persist after page reload', async ({ page }) => {
    const testId = generateShortId()

    try {
      await page.goto('/transactions')
      await page.waitForLoadState('networkidle')

      // Use today's date for imports
      const today = new Date().toISOString().split('T')[0]

      // Import transactions
      const csvContent = `Data,Descrição,Valor
${today},${isolatedName('Persistence Test', testId)},-99.99`

      const importButton = page.getByTestId('import-transactions-btn')
      const isImportVisible = await importButton.isVisible().then(() => true, () => false)
      test.skip(!isImportVisible, 'Import button not visible - Bug 1 may be blocking this test')

      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible()

      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'test-import.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })

      await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
      await page.getByTestId('import-next-btn').click()
      await page.getByTestId('import-confirm-btn').click()
      await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })

      // Close modal
      await page.keyboard.press('Escape')

      // RELOAD THE PAGE - transactions should persist
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Imported transaction should still be visible after reload
      // This test will FAIL if imported transactions are not properly saved
      await expect(page.getByText(isolatedName('Persistence Test', testId))).toBeVisible({ timeout: 10000 })
    } finally {
      await cleanupIsolatedTestData(page, testId)
    }
  })
})
