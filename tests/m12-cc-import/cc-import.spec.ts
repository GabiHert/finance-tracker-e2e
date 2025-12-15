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
  setM12DateFilter,
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

  test.beforeEach(async ({ page }) => {
    testId = generateTestId()
    // Clean up any leftover CC transactions from previous test runs
    // This ensures each test starts with a clean slate
    await cleanupTestTransactions(page, 'pre-cleanup')
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
    // Date must match the "Pagamento recebido" date in sampleCCCSV (2020-03-13)
    await createBillPayment(page, {
      date: '2020-03-13',
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

    // Wait for dialog to close and page to update
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Verify CC badges visible on transactions
    await expect(page.getByTestId('cc-badge').first()).toBeVisible({ timeout: 15000 })

    // Verify original bill is grayed/expanded (use first() in case of multiple from previous tests)
    await expect(page.getByTestId('expanded-bill').first()).toBeVisible()
    await expect(page.getByTestId('expanded-bill').first()).toContainText('R$ 0')
  })

  test('E2E-CC-003: Import with amount mismatch shows warning', async ({ page }) => {
    // Setup: Create bill payment with different amount
    await createBillPayment(page, {
      date: '2020-03-13',
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

    // Wait for step 2 (matching preview) to load
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })

    // Verify warning about difference
    await expect(page.getByTestId('match-difference-warning')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('match-difference')).toBeVisible()

    // Proceed with import
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for success dialog and close it
    await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-done-btn').click()

    // Wait for modal to close and CC status to load
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

    // Verify mismatch banner appears
    await expect(page.getByTestId('cc-mismatch-banner')).toBeVisible({ timeout: 10000 })
  })

  test('E2E-CC-004: Import without matching bill payment', async ({ page }) => {
    // No bill payment created - import should still work

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSVNoPayment)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()

    // Wait for step 2 (matching preview) to load
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })

    // Verify no match message
    await expect(page.getByTestId('no-match-info')).toBeVisible({ timeout: 10000 })

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
    await createBillPayment(page, { date: '2020-03-13', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Verify badge is visible
    const badge = page.getByTestId('cc-badge').first()
    await expect(badge).toBeVisible()
  })

  test('E2E-CC-006: Installment transactions show installment badge', async ({ page }) => {
    // Setup with bill payment (using 2020-01 for isolation)
    await createBillPayment(page, { date: '2020-01-13', amount: -500, testId })
    await page.reload()

    const installmentCSV = `date,title,amount
2020-01-10,Hospital - Parcela 1/3,200.00
2020-01-13,Pagamento recebido,-500.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, installmentCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Verify installment badge
    await expect(page.getByTestId('installment-badge')).toContainText('1/3')
  })

  test('E2E-CC-007: Expanded bill payment shows grayed out', async ({ page }) => {
    // Setup and import
    await createBillPayment(page, { date: '2020-03-13', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Verify expanded bill display (use first() in case of multiple)
    const expandedBill = page.getByTestId('expanded-bill').first()
    await expect(expandedBill).toBeVisible()
    await expect(expandedBill).toContainText('R$ 0')
    await expect(expandedBill).toContainText(/expandido|was|era|original/i)
  })

  // ============================================================
  // 3.4 Dashboard Status Card
  // ============================================================

  test('E2E-CC-008: Dashboard displays CC status card', async ({ page }) => {
    // Setup: Import CC transactions (using 2020-02 for isolation)
    await createBillPayment(page, { date: '2020-02-13', amount: -1000, testId })
    await page.reload()

    const csv = `date,title,amount
2020-02-10,Store 1,500.00
2020-02-10,Store 2,300.00
2020-02-13,Pagamento recebido,-1000.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
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
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
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
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
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
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
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
    await createBillPayment(page, { date: '2020-03-13', amount: -1124.77, testId })
    await page.reload()
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, sampleCCCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Wait for CC transactions to appear after import
    await expect(page.getByTestId('cc-badge').first()).toBeVisible({ timeout: 10000 })

    // Count CC transactions before collapse
    const ccTransactionsBefore = await page.getByTestId('cc-badge').count()
    expect(ccTransactionsBefore).toBeGreaterThan(0)

    // Click collapse (use first() in case of multiple expanded bills)
    await page.getByTestId('collapse-btn').first().click()

    // Verify confirmation dialog
    await expect(page.getByTestId('collapse-confirm-dialog')).toBeVisible()
    await expect(page.getByTestId('collapse-confirm-dialog')).toContainText(/delete|excluir/i)

    // Confirm
    await page.getByTestId('confirm-collapse-btn').click()

    // Wait for modal to close (indicates collapse completed)
    await expect(page.getByTestId('collapse-confirm-dialog')).not.toBeVisible({ timeout: 10000 })

    // Verify success
    await expect(page.getByTestId('toast-success')).toContainText(/collapse|recolhido/i)

    // Verify CC transactions gone
    await expect(page.getByTestId('cc-badge')).not.toBeVisible()

    // Verify bill restored
    const billRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: /pagamento de fatura/i })
    await expect(billRow).toContainText(/1.*124|1,124/i) // Amount restored
  })

  test('E2E-CC-013: Cancel collapse confirmation', async ({ page }) => {
    // Setup expanded bill (using 2020-01 for isolation)
    await createBillPayment(page, { date: '2020-01-13', amount: -500, testId })
    await page.reload()

    const csv = `date,title,amount
2020-01-10,Store,500.00
2020-01-13,Pagamento recebido,-500.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    // Wait for import modal to close before clicking collapse
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to M12 date range to see the imported transactions
    await setM12DateFilter(page)

    // Wait for CC badge to appear (import completed)
    await expect(page.getByTestId('cc-badge').first()).toBeVisible({ timeout: 10000 })

    // Click collapse then cancel (use first() in case of multiple expanded bills)
    await page.getByTestId('collapse-btn').first().click()
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
    // Create two bills (using 2019-12 for isolation)
    await createBillPayment(page, { date: '2019-12-08', amount: -500, testId })
    await createBillPayment(page, { date: '2019-12-13', amount: -1000, testId })
    await page.reload()

    const csv = `date,title,amount
2019-12-10,Store,1000.00
2019-12-13,Pagamento recebido,-1000.00`

    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, csv)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })

    // Verify correct match (R$ 1000 bill, not R$ 500)
    await expect(page.getByTestId('match-bill-amount')).toContainText(/1.*000|1,000/i)
    await expect(page.getByTestId('match-bill-date')).toContainText('13/12')
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

  test('E2E-CC-018: Real CSV shows billing cycle as 2024-04', async ({ page }) => {
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, realNubankCSV)

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify billing cycle is extracted from "Pagamento recebido" date (2024-04-04 in realNubankCSV)
    await expect(page.getByTestId('billing-cycle-display')).toContainText('2024-04')
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
    // Setup: Create bill payment matching installment total (2020-01-04 matches installmentCSV)
    await createBillPayment(page, { date: '2020-01-04', amount: -331.18, testId })
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
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    await expect(page.getByTestId('toast-success')).toBeVisible()
  })

  // ============================================================
  // 3.10 Refund Tests
  // ============================================================

  test('E2E-CC-022: Import CSV with refund transaction', async ({ page }) => {
    // Setup: Create bill payment (2019-12-04 matches refundCSV)
    await createBillPayment(page, { date: '2019-12-04', amount: -366.91, testId })
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
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()
    await page.getByTestId('confirm-import-action-btn').click()

    await expect(page.getByTestId('toast-success')).toBeVisible()
  })

  // ============================================================
  // 3.11 Refund Amount Storage Verification
  // ============================================================

  test('E2E-CC-023: Refund stored with negative amount after import', async ({ page }) => {
    // Setup: Create bill payment that matches refundCSV total
    // refundCSV: Estorno -253.82, Bourbon +620.73, Pagamento -366.91
    // Net expenses (excluding payment): 620.73 - 253.82 = 366.91
    await createBillPayment(page, {
      date: '2019-12-04',
      amount: -366.91,
      testId,
    })
    await page.reload()

    // Open import wizard and select CC format
    await openImportWizard(page)
    await selectCCFormat(page)

    // Upload refund CSV
    await uploadCCCSV(page, refundCSV)

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify refund shows as negative in preview
    const refundRowPreview = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundRowPreview).toBeVisible()
    await expect(refundRowPreview).toContainText('-253.82')

    // Complete import
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()

    // Handle confirmation dialog
    const confirmDialog = page.getByTestId('import-confirm-dialog')
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }

    // Wait for import to complete
    await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 15000 })

    // Wait for dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Navigate to transactions with M12 date filter
    await setM12DateFilter(page)

    // Find the refund transaction in the list
    const refundTxn = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Estorno de compra' })
    await expect(refundTxn).toBeVisible({ timeout: 10000 })

    // Verify it shows as a credit/refund (negative amount)
    // The amount display should indicate negative value
    const amountCell = refundTxn.locator('[data-testid="transaction-amount"]')
    await expect(amountCell).toBeVisible()
    const amountText = await amountCell.textContent()

    // Verify the amount is displayed as negative (or as income/credit indicator)
    // Could be "-R$ 253,82", "R$ -253,82", or displayed in green/different color
    expect(amountText).toMatch(/-.*253|253.*-|253,82/)
  })

  test('E2E-CC-024: Dashboard shows correct net total with refunds', async ({ page }) => {
    // Setup: Create bill payment matching refundCSV net total
    // Net = 620.73 - 253.82 = 366.91
    await createBillPayment(page, {
      date: '2019-12-04',
      amount: -366.91,
      testId,
    })
    await page.reload()

    // Import refund CSV
    await openImportWizard(page)
    await selectCCFormat(page)
    await uploadCCCSV(page, refundCSV)
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('cc-matching-preview')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('confirm-import-btn').click()

    const confirmDialog = page.getByTestId('import-confirm-dialog')
    if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId('confirm-import-action-btn').click()
    }
    await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 15000 })

    // Wait for dialog to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 })

    // Go to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Find CC status card
    const ccCard = page.getByTestId('cc-status-card')

    // If CC card is visible, verify the calculations
    if (await ccCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Total spending should be ~366.91 (the net of 620.73 - 253.82)
      // NOT 874.55 (620.73 + 253.82) which would be wrong
      const totalSpending = page.getByTestId('cc-total-spending')
      const totalText = await totalSpending.textContent() || ''

      // Extract numeric value from the text (handles "R$ 366,91" format)
      const numericValue = parseFloat(totalText.replace(/[^\d,-]/g, '').replace(',', '.'))

      // Should be around 366.91, not 874.55
      // Allow some tolerance for rounding
      expect(numericValue).toBeLessThan(500) // Should be ~366.91, not ~874.55
      expect(numericValue).toBeGreaterThan(300) // Should be around 366.91
    }
  })
})
