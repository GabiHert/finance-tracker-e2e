import { Page, expect } from '@playwright/test'

/**
 * M15-smart-reconciliation Test Fixtures
 * Helpers for smart CC reconciliation E2E tests
 */

// ============================================================
// Sample CSV Data
// ============================================================

// Sample CC CSV for current month billing cycle - total: R$ 220.80
// Using 2025-12 dates for current month testing
export const sampleCCCSVNov2024 = `date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-12-08,Netflix,55.90
2025-12-10,Amazon,120.00
2025-12-13,Pagamento recebido,-220.80`

// Sample CC CSV without payment received line
export const sampleCCCSVNoPayment = `date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-12-08,Netflix,55.90
2025-12-10,Amazon,120.00`

// Sample CC CSV with different amount for mismatch testing
export const sampleCCCSVMismatch = `date,title,amount
2025-12-03,Zaffari Cabral,500.00
2025-12-08,Netflix,300.00
2025-12-10,Amazon,200.00
2025-12-13,Pagamento recebido,-1000.00`

/**
 * Generate a unique test ID for isolating test data
 */
export function generateTestId(): string {
  return `m15-test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

/**
 * Ensure page is navigated to the app so localStorage is accessible
 */
async function ensurePageNavigated(page: Page): Promise<void> {
  if (page.url() === 'about:blank') {
    await page.goto('/transactions')
    await page.waitForLoadState('domcontentloaded')
  }
}

/**
 * Get the access token from page's localStorage
 */
async function getAccessToken(page: Page): Promise<string> {
  await ensurePageNavigated(page)
  const token = await page.evaluate(() => localStorage.getItem('access_token'))
  if (!token) {
    throw new Error('No access token found in localStorage')
  }
  return token
}

/**
 * Create pending CC transactions (unlinked) for a billing cycle
 * @param totalAmount - Total amount in currency units (e.g., 500 for R$ 500.00)
 */
export async function createPendingCCTransactions(
  page: Page,
  billingCycle: string,
  count: number,
  totalAmount?: number,
  testId?: string
): Promise<string[]> {
  const token = await getAccessToken(page)

  // Calculate amounts to ensure total matches exactly
  const total = totalAmount ?? 50 * count
  const baseAmount = Math.floor(total / count)
  const remainder = total - (baseAmount * count)

  const ids: string[] = []
  const [year, month] = billingCycle.split('-')

  for (let i = 0; i < count; i++) {
    const day = String(i + 1).padStart(2, '0')
    const description = testId
      ? `[${testId}] CC Transaction ${i + 1}`
      : `CC Transaction ${i + 1}`

    // Add remainder to the last transaction to match total exactly
    const amount = i === count - 1 ? baseAmount + remainder : baseAmount

    const response = await page.request.post('/api/v1/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: `${year}-${month}-${day}`,
        description,
        amount: -amount,
        type: 'expense',
        billing_cycle: billingCycle,
        // Note: No credit_card_payment_id means pending (unlinked)
      },
    })

    if (response.ok()) {
      const data = await response.json()
      ids.push(data.data?.id || data.id)
    }
  }

  return ids
}

/**
 * Create linked CC transactions (with bill) for a billing cycle
 */
export async function createLinkedCCTransactions(
  page: Page,
  billingCycle: string,
  testId?: string
): Promise<{ billId: string; transactionIds: string[] }> {
  const token = await getAccessToken(page)
  const [year, month] = billingCycle.split('-')
  const description = testId
    ? `[${testId}] Pagamento de fatura`
    : 'Pagamento de fatura'

  // First create a bill payment
  const billResponse = await page.request.post('/api/v1/transactions', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      date: `${year}-${month}-05`,
      description,
      amount: -450, // R$ 450.00 (matches 3 x R$150)
      type: 'expense',
      is_credit_card_payment: true,
    },
  })

  const billData = await billResponse.json()
  const billId = billData.data?.id || billData.id

  // Create CC transactions (without linking - API doesn't accept credit_card_payment_id on create)
  const transactionIds: string[] = []
  for (let i = 0; i < 3; i++) {
    const day = String(i + 10).padStart(2, '0')
    const txDescription = testId
      ? `[${testId}] CC Transaction ${i + 1}`
      : `CC Transaction ${i + 1}`

    const response = await page.request.post('/api/v1/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        date: `${year}-${month}-${day}`,
        description: txDescription,
        amount: -150, // R$ 150.00
        type: 'expense',
        billing_cycle: billingCycle,
      },
    })

    if (response.ok()) {
      const data = await response.json()
      transactionIds.push(data.data?.id || data.id)
    }
  }

  // Wait a moment for the transactions to be fully committed
  await page.waitForTimeout(500)

  // Now link the CC transactions to the bill using the reconciliation endpoint
  // Using force: true to handle any minor amount discrepancies in test data
  const linkResponse = await page.request.post('/api/v1/transactions/credit-card/reconciliation/link', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      billing_cycle: billingCycle,
      bill_payment_id: billId,
      force: true,
    },
  })

  if (!linkResponse.ok()) {
    const errorText = await linkResponse.text()
    console.error('Failed to link CC transactions:', linkResponse.status(), errorText)
    throw new Error(`Failed to link CC transactions: ${errorText}`)
  }

  return { billId, transactionIds }
}

/**
 * Create a transaction (bill payment or regular)
 */
export async function createTransaction(
  page: Page,
  data: {
    date: string
    description: string
    amount: number
    type: string
    is_credit_card_payment?: boolean
    testId?: string
  }
): Promise<string> {
  const token = await getAccessToken(page)
  const description = data.testId
    ? `[${data.testId}] ${data.description}`
    : data.description

  const response = await page.request.post('/api/v1/transactions', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      date: data.date,
      description,
      amount: data.amount, // API expects actual amount, not cents
      type: data.type,
      is_credit_card_payment: data.is_credit_card_payment,
    },
  })

  const responseData = await response.json()
  return responseData.data?.id || responseData.id
}

/**
 * Upload a CC CSV file
 */
export async function uploadCCCSV(page: Page, csvContent: string): Promise<void> {
  const buffer = Buffer.from(csvContent)

  // Find the file input - it might be hidden
  const fileInput = page.locator('[data-testid="csv-file-input"], input[type="file"]').first()
  await fileInput.setInputFiles({
    name: 'nubank.csv',
    mimeType: 'text/csv',
    buffer,
  })
}

/**
 * Open the import wizard
 */
export async function openImportWizard(page: Page): Promise<void> {
  await page.goto('/transactions')
  await page.getByTestId('import-transactions-btn').click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * Select CC format in import wizard
 */
export async function selectCCFormat(page: Page): Promise<void> {
  await page.getByTestId('bank-format-selector').click()
  const ccOption = page.getByRole('option', { name: /nubank.*cart[aã]o/i })
  await ccOption.click()
}

/**
 * Clean up test transactions by test ID
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

  // Find transactions to delete:
  // 1. Transactions with M15 test ID pattern in description
  // 2. CC transactions from M15 billing cycles ONLY (2025-11, 2025-12)
  // NOTE: M12 tests use 2023-12 to 2024-09, so we don't touch those billing cycles
  const m15BillingCycles = ['2025-12', '2025-11']
  const testIdPattern = /\[m15-test-[a-z0-9-]+\]/
  const testTransactions = transactions.filter(
    (t: { description?: string; billing_cycle?: string; is_credit_card_payment?: boolean; expanded_at?: string; date?: string }) =>
      t.description?.includes(testId) ||
      t.description?.match(testIdPattern) ||
      // Only delete CC transactions in M15 billing cycles
      (t.billing_cycle && m15BillingCycles.includes(t.billing_cycle)) ||
      // For pre-cleanup, also delete transactions from 2025-11 and 2025-12 date ranges
      // This catches bill payments (which don't have billing_cycle) from these months
      (testId === 'pre-cleanup-m15' && t.date && (t.date.startsWith('2025-11') || t.date.startsWith('2025-12')))
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

/**
 * Navigate to reconciliation screen
 */
export async function navigateToReconciliation(page: Page): Promise<void> {
  await page.goto('/transacoes/reconciliacao')
  await page.waitForLoadState('networkidle')
}

/**
 * Format billing cycle for display (e.g., "2024-11" -> "Nov/2024")
 */
export function formatBillingCycleDisplay(billingCycle: string): string {
  const [year, month] = billingCycle.split('-')
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${monthNames[parseInt(month) - 1]}/${year}`
}
