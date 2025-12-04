import { test, expect } from '@playwright/test'
import {
  sampleCCCSV,
  sampleCCCSVNoPayment,
  sampleCCCSVMismatch,
  emptyCSV,
  invalidCSV,
  realNubankCSV,
  installmentCSV,
  refundCSV,
  generateTestId,
  createBillPayment,
  uploadCCCSV,
  selectCCFormat,
  openImportWizard,
  cleanupTestTransactions,
} from './fixtures'

/**
 * M12-E2E: Credit Card Statement Import
 *
 * Tests the credit card import feature including:
 * - Format selection in import wizard
 * - Matching preview with existing bill payments
 * - Credit card badges on transactions
 * - Dashboard status card
 * - Collapse functionality
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M12: Credit Card Statement Import', () => {
  let testId: string

  test.beforeEach(() => {
    testId = generateTestId()
  })

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    await cleanupTestTransactions(page, testId)
  })

  // ============================================================
  // 3.1 Import Wizard - Format Selection
  // ============================================================

  test('E2E-CC-001: Select Nubank Credit Card format in import wizard', async ({ page }) => {
    await page.goto('/transactions')

    // Open import wizard
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Open format dropdown
    await page.getByTestId('bank-format-selector').click()

    // Verify CC option exists - the label is "Nubank Cartao de Credito"
    const ccOption = page.getByRole('option', { name: /nubank.*cart[aã]o/i })
    await expect(ccOption).toBeVisible()

    // Select CC format
    await ccOption.click()

    // Verify info text appears explaining the feature
    await expect(page.getByTestId('cc-info-text')).toBeVisible()
    await expect(page.getByTestId('cc-info-text')).toContainText(/credit|cartão|fatura/i)
  })

  // ============================================================
  // 3.2 Import Flow - Happy Path
  // ============================================================

  test('E2E-CC-002: Complete import with matching bill payment', async ({ page }) => {
    // Setup: Create bill payment that matches our CSV
    await createBillPayment(page, {
      date: '2025-10-31',
      amount: -1124.77,
      testId,
    })
    await page.reload()

    // Open import wizard and select CC format
    await openImportWizard(page)
    await selectCCFormat(page)

    // Upload CSV
    await uploadCCCSV(page, sampleCCCSV)

    // Wait for parsing
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Click Next to go to matching/category step
    await page.getByTestId('import-next-btn').click()

    // Verify matching preview shows
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible()
    await expect(page.getByTestId('match-count')).toContainText('1')

    // Click Import
    await page.getByTestId('confirm-import-btn').click()

    // Confirm in dialog
    await expect(page.getByTestId('import-confirm-dialog')).toBeVisible()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify success toast
    await expect(page.getByTestId('toast-success')).toContainText(/importa/i)

    // Verify CC badges visible on transactions
    await expect(page.getByTestId('cc-badge').first()).toBeVisible()

    // Verify original bill is grayed/expanded
    await expect(page.getByTestId('expanded-bill')).toBeVisible()
    await expect(page.getByTestId('expanded-bill')).toContainText('R$ 0')
  })

  test('E2E-CC-003: Import with amount mismatch shows warning', async ({ page }) => {
    // Setup: Create bill payment with different amount
    await createBillPayment(page, {
      date: '2025-10-31',
      amount: -1124.77,
      testId,
    })
    await page.reload()

    // Import CSV with different total
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVMismatch)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()

    // Verify warning about difference
    await expect(page.getByTestId('match-difference-warning')).toBeVisible()
    await expect(page.getByTestId('match-difference')).toBeVisible()

    // Proceed with import
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify mismatch banner appears
    await expect(page.getByTestId('cc-mismatch-banner')).toBeVisible()
  })

  test('E2E-CC-004: Import without matching bill payment', async ({ page }) => {
    // No bill payment created - import should still work

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVNoPayment)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()

    // Verify no match message
    await expect(page.getByTestId('no-matches-message')).toBeVisible()

    // Proceed
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify success
    await expect(page.getByTestId('toast-success')).toBeVisible()

    // Navigate to dashboard and check status
    await page.goto('/dashboard')
    await expect(page.getByTestId('cc-status-card')).toBeVisible()
    await expect(page.getByTestId('cc-unmatched-amount')).not.toContainText('R$ 0')
  })

  // ============================================================
  // 3.3 Transaction Display
  // ============================================================

  test('E2E-CC-005: Credit card transactions display badge', async ({ page }) => {
    // Setup and import
    await createBillPayment(page, { date: '2025-10-31', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import to complete
    await page.waitForSelector('[data-testid="cc-badge"]')

    // Verify badge is visible
    const badge = page.getByTestId('cc-badge').first()
    await expect(badge).toBeVisible()
  })

  test('E2E-CC-006: Installment transactions show installment badge', async ({ page }) => {
    // Setup with bill payment
    await createBillPayment(page, { date: '2025-10-31', amount: -500, testId })
    await page.reload()

    const installmentCSV = `date,title,amount
2025-11-08,Hospital - Parcela 1/3,200.00
2025-11-04,Pagamento recebido,-500.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, installmentCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify installment badge
    await expect(page.getByTestId('installment-badge')).toContainText('1/3')
  })

  test('E2E-CC-007: Expanded bill payment shows grayed out', async ({ page }) => {
    // Setup and import
    await createBillPayment(page, { date: '2025-10-31', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify expanded bill display
    const expandedBill = page.getByTestId('expanded-bill')
    await expect(expandedBill).toBeVisible()
    await expect(expandedBill).toContainText('R$ 0')
    await expect(expandedBill).toContainText(/was|era|original/i)
    await expect(expandedBill.getByTestId('collapse-btn')).toBeVisible()
  })

  // ============================================================
  // 3.4 Dashboard Status Card
  // ============================================================

  test('E2E-CC-008: Dashboard displays CC status card', async ({ page }) => {
    // Setup: Import CC transactions
    await createBillPayment(page, { date: '2025-10-31', amount: -1000, testId })
    await page.reload()

    const csv = `date,title,amount
2025-11-06,Store 1,500.00
2025-11-06,Store 2,300.00
2025-11-04,Pagamento recebido,-1000.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Verify CC status card
    const statusCard = page.getByTestId('cc-status-card')
    await expect(statusCard).toBeVisible()
    await expect(statusCard.getByTestId('cc-total-spending')).toBeVisible()
    await expect(statusCard.getByTestId('cc-matched-amount')).toBeVisible()
  })

  test('E2E-CC-009: Dashboard status card shows warning for mismatches', async ({ page }) => {
    // Import without matching bill
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVNoPayment)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Navigate to dashboard
    await page.goto('/dashboard')

    // Verify warning state
    const statusCard = page.getByTestId('cc-status-card')
    await expect(statusCard.getByTestId('cc-warning-indicator')).toBeVisible()
  })

  // ============================================================
  // 3.5 Mismatch Banner
  // ============================================================

  test('E2E-CC-010: Mismatch banner appears on transactions page', async ({ page }) => {
    // Import without matching bill
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVNoPayment)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Verify banner
    const banner = page.getByTestId('cc-mismatch-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(/unmatched|não vinculado/i)
    await expect(banner.getByTestId('dismiss-banner-btn')).toBeVisible()
  })

  test('E2E-CC-011: Dismiss mismatch banner', async ({ page }) => {
    // Setup: Create unmatched scenario
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVNoPayment)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Dismiss banner
    await page.getByTestId('dismiss-banner-btn').click()

    // Verify hidden
    await expect(page.getByTestId('cc-mismatch-banner')).not.toBeVisible()

    // Navigate away and back
    await page.goto('/dashboard')
    await page.goto('/transactions')

    // Should stay hidden
    await expect(page.getByTestId('cc-mismatch-banner')).not.toBeVisible()
  })

  // ============================================================
  // 3.6 Collapse Functionality
  // ============================================================

  test('E2E-CC-012: Collapse expanded bill payment', async ({ page }) => {
    // Setup: Create and expand bill
    await createBillPayment(page, { date: '2025-10-31', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Count CC transactions before collapse
    const ccTransactionsBefore = await page.getByTestId('cc-badge').count()
    expect(ccTransactionsBefore).toBeGreaterThan(0)

    // Click collapse
    await page.getByTestId('collapse-btn').click()

    // Verify confirmation dialog
    await expect(page.getByTestId('collapse-confirm-dialog')).toBeVisible()
    await expect(page.getByTestId('collapse-confirm-dialog')).toContainText(/delete|excluir/i)

    // Confirm
    await page.getByTestId('confirm-collapse-btn').click()

    // Verify success
    await expect(page.getByTestId('toast-success')).toContainText(/collapse|recolhido/i)

    // Verify CC transactions gone
    await expect(page.getByTestId('cc-badge')).not.toBeVisible()

    // Verify bill restored
    const billRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: /pagamento de fatura/i })
    await expect(billRow).toContainText(/1.*124|1,124/i) // Amount restored
  })

  test('E2E-CC-013: Cancel collapse confirmation', async ({ page }) => {
    // Setup expanded bill
    await createBillPayment(page, { date: '2025-10-31', amount: -500, testId })
    await page.reload()

    const csv = `date,title,amount
2025-11-06,Store,500.00
2025-11-04,Pagamento recebido,-500.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Click collapse then cancel
    await page.getByTestId('collapse-btn').click()
    await page.getByTestId('cancel-collapse-btn').click()

    // Verify dialog closed
    await expect(page.getByTestId('collapse-confirm-dialog')).not.toBeVisible()

    // Verify CC transactions still exist
    await expect(page.getByTestId('cc-badge')).toBeVisible()
  })

  // ============================================================
  // 3.7 Edge Cases
  // ============================================================

  test('E2E-CC-014: Import empty CSV shows error', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, emptyCSV)

    await expect(page.getByTestId('parse-error')).toContainText(/no transaction|nenhuma transação|vazio/i)
  })

  test('E2E-CC-015: Import invalid CSV format shows error', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, invalidCSV)

    await expect(page.getByTestId('parse-error')).toContainText(/invalid|inválido|format|formato/i)
  })

  test('E2E-CC-016: Multiple bill payments matches correct one', async ({ page }) => {
    // Create two bills
    await createBillPayment(page, { date: '2025-10-15', amount: -500, testId })
    await createBillPayment(page, { date: '2025-10-31', amount: -1000, testId })
    await page.reload()

    const csv = `date,title,amount
2025-11-06,Store,1000.00
2025-11-04,Pagamento recebido,-1000.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()

    // Verify correct match (R$ 1000 bill, not R$ 500)
    await expect(page.getByTestId('match-bill-amount')).toContainText(/1.*000|1,000/i)
    await expect(page.getByTestId('match-bill-date')).toContainText('31/10')
  })

  // ============================================================
  // 3.8 Real Nubank CSV Tests
  // ============================================================

  test('E2E-CC-017: Parse real Nubank CSV with 38 transactions', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realNubankCSV)

    // Wait for parsing - should show all 38 transactions
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify transaction count (38 lines in realNubankCSV)
    await expect(page.getByTestId('transaction-count')).toContainText('38')

    // Verify "Pagamento recebido" is identified
    await expect(page.getByTestId('payment-received-row')).toBeVisible()
    await expect(page.getByTestId('payment-received-row')).toContainText('-8235.79')
  })

  test('E2E-CC-018: Real CSV shows billing cycle as 2025-11', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realNubankCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify billing cycle is extracted from "Pagamento recebido" date (2025-11-04)
    await expect(page.getByTestId('billing-cycle-display')).toContainText('2025-11')
  })

  test('E2E-CC-019: Real CSV detects multiple installments', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realNubankCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify installment detection (multiple "Parcela X/Y" in realNubankCSV)
    const installmentRows = page.locator('[data-testid="installment-indicator"]')
    const count = await installmentRows.count()
    expect(count).toBeGreaterThanOrEqual(6) // At least 6 installments in the CSV
  })

  test('E2E-CC-020: Real CSV detects refund (negative amount)', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realNubankCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify refund "Estorno de compra" is detected
    const refundRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundRow).toBeVisible()
    await expect(refundRow).toContainText('-253.82')
  })

  // ============================================================
  // 3.9 Installment-Specific Tests
  // ============================================================

  test('E2E-CC-021: Import CSV with only installments', async ({ page }) => {
    // Setup: Create bill payment matching installment total
    await createBillPayment(page, { date: '2025-10-31', amount: -331.18, testId })
    await page.reload()

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, installmentCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // All non-payment transactions should have installment indicators
    const installmentRows = page.locator('[data-testid="installment-indicator"]')
    const count = await installmentRows.count()
    expect(count).toBe(3) // 3 installment transactions

    // Proceed with import
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    await expect(page.getByTestId('toast-success')).toBeVisible()
  })

  // ============================================================
  // 3.10 Refund Tests
  // ============================================================

  test('E2E-CC-022: Import CSV with refund transaction', async ({ page }) => {
    // Setup: Create bill payment
    await createBillPayment(page, { date: '2025-10-31', amount: -366.91, testId })
    await page.reload()

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, refundCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Refund should appear as a negative amount (credit)
    const refundRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundRow).toBeVisible()
    await expect(refundRow).toContainText('-253.82')

    // Proceed with import
    await page.getByTestId('import-next-btn').click()
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    await expect(page.getByTestId('toast-success')).toBeVisible()
  })
})
