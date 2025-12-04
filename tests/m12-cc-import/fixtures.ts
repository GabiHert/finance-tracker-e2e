import { Page, expect } from '@playwright/test'

/**
 * M12-cc-import Test Fixtures
 * Helpers for credit card import E2E tests
 */

// Sample CSV content for Nubank Credit Card format
export const sampleCCCSV = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,794.15
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2025-11-04,Pagamento recebido,-1124.77`

// CSV without matching bill (no Pagamento recebido)
export const sampleCCCSVNoPayment = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,100.00`

// CSV with amount mismatch
export const sampleCCCSVMismatch = `date,title,amount
2025-11-06,Purchase 1,1130.00
2025-11-04,Pagamento recebido,-1130.00`

// Empty CSV (headers only)
export const emptyCSV = `date,title,amount`

// Invalid CSV format
export const invalidCSV = `wrong,columns,here
data1,data2,data3`

/**
 * Generate a unique test ID for isolating test data
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Create a bill payment transaction via API
 */
export async function createBillPayment(
  page: Page,
  data: { date: string; amount: number; testId?: string }
): Promise<{ id: string }> {
  const response = await page.request.post('/api/v1/transactions', {
    data: {
      date: data.date,
      description: `Pagamento de fatura${data.testId ? ` [${data.testId}]` : ''}`,
      amount: data.amount,
      type: 'expense',
    },
  })
  expect(response.ok()).toBeTruthy()
  const json = await response.json()
  return { id: json.data?.id || json.id }
}

/**
 * Create a category for testing
 */
export async function createCategory(
  page: Page,
  data: { name: string; type: 'expense' | 'income'; testId?: string }
): Promise<{ id: string }> {
  const response = await page.request.post('/api/v1/categories', {
    data: {
      name: `${data.name}${data.testId ? ` [${data.testId}]` : ''}`,
      type: data.type,
      icon: 'shopping-cart',
      color: '#3B82F6',
    },
  })
  expect(response.ok()).toBeTruthy()
  const json = await response.json()
  return { id: json.data?.id || json.id }
}

/**
 * Upload a CSV file to the import wizard
 */
export async function uploadCCCSV(page: Page, csvContent: string): Promise<void> {
  const buffer = Buffer.from(csvContent)
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'credit-card.csv',
    mimeType: 'text/csv',
    buffer,
  })
}

/**
 * Select Nubank Credit Card format in import wizard
 */
export async function selectCCFormat(page: Page): Promise<void> {
  await page.getByTestId('bank-format-selector').click()
  // Look for the credit card option
  await page.getByRole('option', { name: /nubank.*credit|cartão.*crédito/i }).click()
}

/**
 * Open the import wizard modal
 */
export async function openImportWizard(page: Page): Promise<void> {
  await page.goto('/transactions')
  await page.getByTestId('import-transactions-btn').click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * Complete the import flow (select format, upload, proceed)
 */
export async function completeImportFlow(
  page: Page,
  csvContent: string,
  options: { confirmImport?: boolean } = {}
): Promise<void> {
  await openImportWizard(page)
  await selectCCFormat(page)
  await uploadCCCSV(page, csvContent)

  // Wait for preview
  await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

  // Click next to go to step 2
  await page.getByTestId('import-next-btn').click()

  if (options.confirmImport !== false) {
    // Click import button
    await page.getByTestId('confirm-import-btn').click()

    // Confirm in dialog if present
    const confirmDialog = page.getByTestId('import-confirm-dialog')
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }
  }
}

/**
 * Delete transactions by test ID suffix
 */
export async function cleanupTestTransactions(page: Page, testId: string): Promise<void> {
  // Get all transactions for this user
  const response = await page.request.get('/api/v1/transactions')
  if (!response.ok()) return

  const json = await response.json()
  const transactions = json.data || json.transactions || []

  // Find transactions with our test ID
  const testTransactions = transactions.filter(
    (t: { description?: string }) =>
      t.description?.includes(`[${testId}]`)
  )

  // Delete each one
  for (const tx of testTransactions) {
    await page.request.delete(`/api/v1/transactions/${tx.id}`)
  }
}
