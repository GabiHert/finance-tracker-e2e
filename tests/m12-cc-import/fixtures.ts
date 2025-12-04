import { Page, expect } from '@playwright/test'

/**
 * M12-cc-import Test Fixtures
 * Helpers for credit card import E2E tests
 */

// ============================================================
// Real Nubank CSV Data (based on actual export)
// ============================================================

export const realNubankCSV = `date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-12-02,Coollab,10.00
2025-12-02,Espaco,6.00
2025-12-01,Bourbon Ipiranga,587.09
2025-12-01,Ifd*Parrilla Del Sur A,172.87
2025-11-30,Stb*Alpina Presentes L,25.99
2025-11-30,Adriano Antonio Schnei,164.71
2025-11-30,Amazonmktplc*Guilherme,68.00
2025-11-28,Z Cafe,44.40
2025-11-28,Comercial de Combustiv,236.83
2025-11-26,Oh Bruder - Bela Vista,88.88
2025-11-24,Ifd*Sul Calabria Pizza,89.79
2025-11-23,Estacao,90.00
2025-11-23,Bourbon Ipiranga,327.60
2025-11-22,Apple.Com/Bill,34.90
2025-11-21,Ifd*Galeteria Mm Teres,133.49
2025-11-21,Uber* Trip,10.98
2025-11-17,Amazon,100.52
2025-11-17,Locale Poa,353.69
2025-11-16,Zaffari Ipiranga,347.46
2025-11-15,Estorno de compra,-253.82
2025-11-14,Bourbon Ipiranga,620.73
2025-11-11,Bolha Azul,140.00
2025-11-10,Espaco de Cinema Sul,50.00
2025-11-10,Bourbon Country,171.38
2025-11-09,Kampeki,174.01
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-08,Bourbon Ipiranga,794.15
2025-11-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2025-11-07,Lugardepetclinica,245.00
2025-11-06,Mercado Silva,8.99
2025-11-06,Aloha Petshop,89.90
2025-11-04,Pagamento recebido,-8235.79
2025-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2025-11-04,Amazon - Parcela 2/6,47.90
2025-11-04,Midea Com - Parcela 1/12,253.82
2025-11-04,Giullia Magueta de Lim - Parcela 3/6,351.50
2025-11-04,Mp *Autoservico - Parcela 2/4,353.75`

// Sample CSV content for Nubank Credit Card format (simpler version)
export const sampleCCCSV = `date,title,amount
2025-11-08,Bourbon Ipiranga,794.15
2025-11-07,Mercado Silva,108.99
2025-11-06,Aloha Petshop,89.90
2025-11-04,Pagamento recebido,-993.04`

// CSV without matching bill (no Pagamento recebido)
export const sampleCCCSVNoPayment = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,100.00`

// CSV with amount mismatch
export const sampleCCCSVMismatch = `date,title,amount
2025-11-06,Store Purchase,1130.00
2025-11-04,Pagamento recebido,-1130.00`

// Empty CSV (headers only)
export const emptyCSV = `date,title,amount`

// Invalid CSV format
export const invalidCSV = `wrong,columns,here
data1,data2,data3`

// CSV with installments only
export const installmentCSV = `date,title,amount
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-08,Mercadolivre*Mercadol - Parcela 1/6,55.04
2025-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2025-11-04,Pagamento recebido,-331.18`

// CSV with refund
export const refundCSV = `date,title,amount
2025-11-15,Estorno de compra,-253.82
2025-11-14,Bourbon Ipiranga,620.73
2025-11-04,Pagamento recebido,-366.91`

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
  // Amount should be positive for expenses in the backend API
  const absAmount = Math.abs(data.amount)
  const response = await page.request.post('/api/v1/transactions', {
    data: {
      date: data.date,
      description: `Pagamento de fatura${data.testId ? ` [${data.testId}]` : ''}`,
      amount: absAmount,
      type: 'expense',
    },
  })
  if (!response.ok()) {
    const text = await response.text()
    throw new Error(`Failed to create bill payment: ${response.status()} - ${text}`)
  }
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
  // Look for the credit card option - the label is "Nubank Cartao de Credito"
  await page.getByRole('option', { name: /nubank.*cart[aã]o/i }).click()
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
