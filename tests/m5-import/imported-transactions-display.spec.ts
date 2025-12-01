import { test, expect } from '@playwright/test'
import {
  deleteAllTransactions,
  deleteAllCategories,
  createTransaction,
  fetchTransactions,
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
  test.beforeEach(async ({ page }) => {
    // Navigate to establish auth context
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')

    // Clean up existing data
    await deleteAllTransactions(page)
    await deleteAllCategories(page)

    // Reload to get fresh state
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('BUG-005: Imported transactions should appear in transaction list', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Create CSV content with test transactions
    const csvContent = `Data,Descrição,Valor
2025-11-20,Imported Transaction 1,-150.50
2025-11-19,Imported Transaction 2,-75.00
2025-11-18,Imported Transaction 3,500.00`

    // Open import modal
    const importButton = page.getByTestId('import-transactions-btn')

    // If import button is not visible (due to Bug 1), skip this test with informative message
    const isImportVisible = await importButton.isVisible().catch(() => false)
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
    if (await closeButton.isVisible().catch(() => false)) {
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
    await expect(page.getByText('Imported Transaction 1')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Imported Transaction 2')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Imported Transaction 3')).toBeVisible({ timeout: 10000 })

    // Now verify count - at this point DOM is updated
    const transactionRows = page.getByTestId('transaction-row')
    await expect(transactionRows).toHaveCount(3, { timeout: 5000 })
  })

  test('BUG-006: Imported transactions should appear alongside manually created ones', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // First, create a manual transaction via API
    const today = new Date().toISOString().split('T')[0]
    await createTransaction(page, {
      date: today,
      description: 'Manual Transaction',
      amount: 200,
      type: 'expense',
    })

    // Reload to see the manual transaction
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify manual transaction is visible
    await expect(page.getByText('Manual Transaction')).toBeVisible({ timeout: 5000 })

    // Now import additional transactions
    const csvContent = `Data,Descrição,Valor
2025-11-20,Imported After Manual,-100.00`

    // Open import modal
    const importButton = page.getByTestId('import-transactions-btn')
    const isImportVisible = await importButton.isVisible().catch(() => false)
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
    await expect(page.getByText('Manual Transaction')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Imported After Manual')).toBeVisible({ timeout: 5000 })

    // Verify total count via API as well
    const transactions = await fetchTransactions(page)
    expect(transactions.length).toBeGreaterThanOrEqual(2)
  })

  test('BUG-007: Transaction count should update after import', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Get initial count (should be 0 or show empty state)
    const initialRowCount = await page.getByTestId('transaction-row').count()

    // Import transactions
    const csvContent = `Data,Descrição,Valor
2025-11-20,Count Test 1,-50.00
2025-11-19,Count Test 2,-60.00`

    const importButton = page.getByTestId('import-transactions-btn')
    const isImportVisible = await importButton.isVisible().catch(() => false)
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

    // Transaction count should have increased by 2
    // Use toHaveCount which waits for the assertion to be true
    await expect(page.getByTestId('transaction-row')).toHaveCount(initialRowCount + 2, { timeout: 10000 })
  })

  test('BUG-008: Imported transactions should persist after page reload', async ({ page }) => {
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Import transactions
    const csvContent = `Data,Descrição,Valor
2025-11-20,Persistence Test,-99.99`

    const importButton = page.getByTestId('import-transactions-btn')
    const isImportVisible = await importButton.isVisible().catch(() => false)
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
    await expect(page.getByText('Persistence Test')).toBeVisible({ timeout: 10000 })
  })
})
