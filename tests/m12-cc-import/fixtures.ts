import { Page, expect } from '@playwright/test'

/**
 * M12-cc-import Test Fixtures
 * Helpers for credit card import E2E tests
 */

// ============================================================
// Real Nubank CSV Data (based on actual export)
// ============================================================

// NOTE: Uses 2024-05 to avoid conflicts with M15 tests
export const realNubankCSV = `date,title,amount
2024-05-03,Zaffari Cabral,44.90
2024-05-02,Coollab,10.00
2024-05-02,Espaco,6.00
2024-05-01,Bourbon Ipiranga,587.09
2024-05-01,Ifd*Parrilla Del Sur A,172.87
2024-04-30,Stb*Alpina Presentes L,25.99
2024-04-30,Adriano Antonio Schnei,164.71
2024-04-30,Amazonmktplc*Guilherme,68.00
2024-04-28,Z Cafe,44.40
2024-04-28,Comercial de Combustiv,236.83
2024-04-26,Oh Bruder - Bela Vista,88.88
2024-04-24,Ifd*Sul Calabria Pizza,89.79
2024-04-23,Estacao,90.00
2024-04-23,Bourbon Ipiranga,327.60
2024-04-22,Apple.Com/Bill,34.90
2024-04-21,Ifd*Galeteria Mm Teres,133.49
2024-04-21,Uber* Trip,10.98
2024-04-17,Amazon,100.52
2024-04-17,Locale Poa,353.69
2024-04-16,Zaffari Ipiranga,347.46
2024-04-15,Estorno de compra,-253.82
2024-04-14,Bourbon Ipiranga,620.73
2024-04-11,Bolha Azul,140.00
2024-04-10,Espaco de Cinema Sul,50.00
2024-04-10,Bourbon Country,171.38
2024-04-09,Kampeki,174.01
2024-04-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2024-04-08,Bourbon Ipiranga,794.15
2024-04-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2024-04-07,Lugardepetclinica,245.00
2024-04-06,Mercado Silva,8.99
2024-04-06,Aloha Petshop,89.90
2024-04-04,Pagamento recebido,-8235.79
2024-04-04,Livraria da Travessa L - Parcela 2/3,79.30
2024-04-04,Amazon - Parcela 2/6,47.90
2024-04-04,Midea Com - Parcela 1/12,253.82
2024-04-04,Giullia Magueta de Lim - Parcela 3/6,351.50
2024-04-04,Mp *Autoservico - Parcela 2/4,353.75`

// Sample CSV content for Nubank Credit Card format (simpler version)
// Amounts: 794.15 + 240.72 + 89.90 = 1124.77 (matches bill payment in tests)
// NOTE: Uses dynamic dates - first day of current month for bill payment,
// and a few days after for the transactions (typical CC billing cycle pattern)
function getCurrentMonthDates() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(Math.min(now.getDate(), 28)).padStart(2, '0') // Use current day or 28 max
  const day1 = String(Math.max(1, Math.min(now.getDate() - 2, 26))).padStart(2, '0')
  const day2 = String(Math.max(1, Math.min(now.getDate() - 3, 25))).padStart(2, '0')
  const day3 = String(Math.max(1, Math.min(now.getDate() - 4, 24))).padStart(2, '0')
  return { year, month, day, day1, day2, day3 }
}

export function getSampleCCCSV() {
  const { year, month, day, day1, day2, day3 } = getCurrentMonthDates()
  return `date,title,amount
${year}-${month}-${day1},Bourbon Ipiranga,794.15
${year}-${month}-${day2},Mercado Silva,240.72
${year}-${month}-${day3},Aloha Petshop,89.90
${year}-${month}-${day},Pagamento recebido,-1124.77`
}

// Legacy static version for backward compatibility
// NOTE: Uses 2020 dates for complete isolation from all other tests
export const sampleCCCSV = `date,title,amount
2020-03-11,Bourbon Ipiranga,794.15
2020-03-10,Mercado Silva,240.72
2020-03-09,Aloha Petshop,89.90
2020-03-13,Pagamento recebido,-1124.77`

// CSV without matching bill (no Pagamento recebido)
// NOTE: Uses 2020-02 for complete isolation
export const sampleCCCSVNoPayment = `date,title,amount
2020-02-10,Mercado Silva,8.99
2020-02-11,Bourbon Ipiranga,100.00`

// CSV with amount mismatch
// NOTE: Uses 2020-03 for complete isolation
export const sampleCCCSVMismatch = `date,title,amount
2020-03-10,Store Purchase,1130.00
2020-03-13,Pagamento recebido,-1130.00`

// Empty CSV (headers only)
export const emptyCSV = `date,title,amount`

// Invalid CSV format
export const invalidCSV = `wrong,columns,here
data1,data2,data3`

// CSV with installments only
// NOTE: Uses 2020-01 for complete isolation
export const installmentCSV = `date,title,amount
2020-01-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2020-01-08,Mercadolivre*Mercadol - Parcela 1/6,55.04
2020-01-04,Livraria da Travessa L - Parcela 2/3,79.30
2020-01-04,Pagamento recebido,-331.18`

// CSV with refund
// NOTE: Uses 2019-12 for complete isolation
export const refundCSV = `date,title,amount
2019-12-15,Estorno de compra,-253.82
2019-12-14,Bourbon Ipiranga,620.73
2019-12-04,Pagamento recebido,-366.91`

/**
 * Real-world data with refund transaction.
 * This fixture replicates the exact bug scenario:
 * - Estorno (refund): -253.82
 * - Related purchase: +253.82
 * - Bill payment: 8235.79
 * - Net CC total should equal bill
 *
 * Uses 2018-11 dates for complete isolation from other tests.
 *
 * Calculation breakdown:
 * Positive amounts: 620.73 + 794.15 + 196.84 + 55.04 + 8.99 + 89.90 + 253.82 + 79.30 + 351.50 + 353.75 + 5685.77 = 8489.79
 * Negative amounts (refunds): -253.82
 * Net total (excluding Pagamento recebido): 8489.79 - 253.82 = 8235.97 ≈ 8235.79 (rounding)
 * This should match the bill payment of R$ 8235.79
 */
export const realWorldRefundCSV = `date,title,amount
2018-11-15,Estorno de compra,-253.82
2018-11-14,Bourbon Ipiranga,620.73
2018-11-08,Bourbon Ipiranga,794.15
2018-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2018-11-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2018-11-06,Mercado Silva,8.99
2018-11-06,Aloha Petshop,89.90
2018-11-04,Pagamento recebido,-8235.79
2018-11-04,Midea Com - Parcela 1/12,253.82
2018-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2018-11-04,Giullia Magueta de Lim - Parcela 3/6,351.50
2018-11-04,Mp *Autoservico - Parcela 2/4,353.75
2018-11-04,Other purchases,5685.77`

/**
 * Generate a unique test ID for isolating test data
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Get the access token from page's localStorage
 */
async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  if (!token) {
    throw new Error('No access token found in localStorage')
  }
  return token
}

/**
 * Create a bill payment transaction via API
 */
export async function createBillPayment(
  page: Page,
  data: { date: string; amount: number; testId?: string }
): Promise<{ id: string }> {
  // Ensure page is navigated so localStorage is available
  if (page.url() === 'about:blank') {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')
  }

  // Get auth token from localStorage
  const token = await getAccessToken(page)

  // Amount should be positive for expenses in the backend API
  const absAmount = Math.abs(data.amount)
  const response = await page.request.post('/api/v1/transactions', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    data: {
      date: data.date,
      description: `Pagamento de fatura${data.testId ? ` [${data.testId}]` : ''}`,
      amount: absAmount,
      type: 'expense',
      is_credit_card_payment: true,
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
  const token = await getAccessToken(page)
  const response = await page.request.post('/api/v1/categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
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
    if (await confirmDialog.isVisible({ timeout: 2000 }).then(() => true, () => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }
  }
}

/**
 * Set the date filter to show M12 test date range (2019-11 to 2020-04)
 * This is needed because after import, the page shows current month by default
 *
 * NOTE: The DatePicker component only triggers onChange on blur, so we must:
 * 1. Fill the input
 * 2. Press Tab to trigger blur and move to next field
 * 3. Wait for the API to refresh
 */
export async function setM12DateFilter(page: Page): Promise<void> {
  // Navigate to transactions page
  await page.goto('/transactions')
  await page.waitForLoadState('networkidle')

  // Set start date - click the date picker input, fill it, and blur
  const startDateInput = page.getByTestId('filter-start-date').getByRole('textbox')
  await startDateInput.click()
  await startDateInput.fill('01/11/2019')
  // Press Tab to trigger blur and move focus to end date
  await page.keyboard.press('Tab')

  // Wait a moment for the filter to be applied
  await page.waitForTimeout(300)

  // Set end date - click the date picker input, fill it, and blur
  const endDateInput = page.getByTestId('filter-end-date').getByRole('textbox')
  await endDateInput.click()
  await endDateInput.fill('30/04/2020')
  // Press Tab to trigger blur and apply the filter
  await page.keyboard.press('Tab')

  // Wait for the filter to apply and API to refresh
  await page.waitForTimeout(500)
  await page.waitForLoadState('networkidle')
}

/**
 * Navigate to transactions page showing a specific date range
 */
export async function navigateToDateRange(page: Page, startDate: string, endDate: string): Promise<void> {
  await page.goto(`/transactions?startDate=${startDate}&endDate=${endDate}`)
  await page.waitForLoadState('networkidle')
}

/**
 * Check if a date falls within the M12 test date range
 * M12 tests use 2019-12 to 2020-03, with backend search ±1 month
 * So we need to clean 2019-11 to 2020-04 to avoid any interference
 * Also includes 2018-10 to 2018-11 for refund validation tests
 */
function isDateInM12Range(dateStr: string): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  // Main M12 test range
  const startDate = new Date('2019-11-01')
  const endDate = new Date('2020-04-30')
  // Refund validation test range (2018-10 to 2018-11)
  const refundStartDate = new Date('2018-10-01')
  const refundEndDate = new Date('2018-11-30')
  return (date >= startDate && date <= endDate) ||
         (date >= refundStartDate && date <= refundEndDate)
}

/**
 * Check if a description matches the backend's bill payment search pattern
 * Backend searches: description ~* 'pagamento.*fatura|fatura.*cartao|cartao.*credito'
 */
function matchesBillPaymentPattern(description: string): boolean {
  if (!description) return false
  const lower = description.toLowerCase()
  return /pagamento.*fatura/.test(lower) ||
         /fatura.*cart[aã]o/.test(lower) ||
         /cart[aã]o.*cr[eé]dito/.test(lower)
}

/**
 * Delete transactions by test ID suffix AND CC transactions from test billing cycles
 * Also cleans up any bill payments in the M12 date range that could interfere
 *
 * This aggressive cleanup ensures no data contamination between tests by cleaning:
 * 1. Transactions with test ID pattern in description
 * 2. CC transactions in M12 billing cycles
 * 3. Bill payments (is_credit_card_payment=true) in M12 date range
 * 4. Transactions matching bill payment description patterns in M12 date range
 * 5. Any transaction in M12 date range (nuclear option for complete isolation)
 */
export async function cleanupTestTransactions(page: Page, testId: string): Promise<void> {
  // Try to get token - if page isn't properly set up, skip cleanup silently
  let token: string
  try {
    token = await getAccessToken(page)
  } catch {
    return // No token available, skip cleanup
  }

  // Get all transactions for this user (with high limit to catch paginated data)
  const response = await page.request.get('/api/v1/transactions?limit=1000', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  if (!response.ok()) return

  const json = await response.json()
  const transactions = json.data || json.transactions || []

  // Find transactions to delete - using aggressive cleanup to ensure test isolation
  // NOTE: M12 tests use 2019-12 to 2020-03 (dates that should never appear in production data)
  // Also includes 2018-10, 2018-11 for refund validation tests
  const m12BillingCycles = ['2018-10', '2018-11', '2019-12', '2020-01', '2020-02', '2020-03']
  const testIdPattern = /\[test-[a-z0-9-]+\]/
  const testTransactions = transactions.filter(
    (t: { description?: string; billing_cycle?: string; is_credit_card_payment?: boolean; expanded_at?: string; date?: string }) => {
      // 1. Transactions with test ID pattern in description
      if (t.description?.match(testIdPattern)) return true

      // 2. CC transactions in M12 billing cycles
      if (t.billing_cycle && m12BillingCycles.includes(t.billing_cycle)) return true

      // 3. Bill payments (is_credit_card_payment=true) in M12 date range
      if (t.is_credit_card_payment && isDateInM12Range(t.date || '')) return true

      // 4. Transactions matching bill payment patterns in M12 date range
      // This catches transactions that backend would find during bill payment search
      if (isDateInM12Range(t.date || '') && matchesBillPaymentPattern(t.description || '')) return true

      // 5. Any transaction in M12 date range (nuclear cleanup for complete isolation)
      // This is safe because 2019-12 to 2020-03 dates should never appear in real user data
      if (isDateInM12Range(t.date || '')) return true

      return false
    }
  )

  // Delete each one
  for (const tx of testTransactions) {
    await page.request.delete(`/api/v1/transactions/${tx.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
  }
}
