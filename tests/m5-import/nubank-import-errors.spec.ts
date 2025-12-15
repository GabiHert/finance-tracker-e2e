import { test, expect } from '@playwright/test'

/**
 * M5-E2E-NUBANK: Nubank CSV Import Tests
 *
 * These tests validate the import functionality using a real Nubank bank statement CSV file.
 *
 * FIXED (2025): The date format bug has been resolved - the frontend now correctly
 * converts DD/MM/YYYY dates to YYYY-MM-DD format before sending to the backend.
 *
 * Previous Bug (now fixed):
 * - Nubank CSV date format: DD/MM/YYYY (e.g., 03/10/2025)
 * - Frontend ImportWizard.tsx now correctly parses and converts dates
 * - Frontend handleImportComplete sends date in correct API format
 * - Backend receives YYYY-MM-DD and processes successfully
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */

// Real Nubank CSV fixture content (matches e2e/tests/fixtures/nubank-statement.csv)
const NUBANK_CSV_CONTENT = `Data,Valor,Identificador,Descrição
03/10/2025,-200.00,68e003a6-b163-4405-8d21-533c9bd26195,Transferência enviada pelo Pix - DOUGLAS LACERDA CARDOSO - •••.245.870-•• - CLOUDWALK IP LTDA (0542) Agência: 1 Conta: 19009665-2
03/10/2025,7095.28,68e07b88-31ec-44aa-95c9-b6e072626622,Transferência recebida pelo Pix - Demerge Brasil Facilitadora de Pagamentos - 33.967.103/0001-84 - DLOCAL BRASIL IP S.A. Agência: 1 Conta: 2-0
05/10/2025,1601.01,68e2acb0-9972-4b2e-baf6-429854829303,Transferência recebida pelo Pix - Demerge Brasil Facilitadora de Pagamentos - 33.967.103/0001-84 - DLOCAL BRASIL IP S.A. Agência: 1 Conta: 2-0
05/10/2025,-53.43,68e2acd1-0c1b-41d8-a689-18358886c9ef,Pagamento de fatura
05/10/2025,-9327.73,68e2ad0a-9295-4cc8-835a-d9511f7e9dd7,Transferência enviada pelo Pix - Gabriel Guinter Herter - •••.041.130-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 27189392-7
05/10/2025,8200.28,68e2af4f-afe9-4fb9-9add-a47ed9114d44,Transferência Recebida - Gabriel Guinter Herter - •••.041.130-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 27189392-7
06/10/2025,-3318.39,68e07d69-73c3-4074-b1c4-04063f34e506,Pagamento de boleto efetuado - CREDITO REAL IMOV E COND SA
06/10/2025,-213.50,68e07dd0-31a0-4672-ad80-c082d02e8332,Pagamento de boleto efetuado - CEEE DISTRIBUICAO
06/10/2025,-79.81,68e07e83-ab99-49a9-b6f5-6df7947994de,Pagamento de boleto efetuado - Claro
06/10/2025,-705.12,68e07ede-feeb-4f8a-a15e-eaa2bcd1f351,Pagamento de boleto efetuado - UNIMED VTRP`

test.describe('M5-NUBANK: Nubank CSV Import', () => {

  test('M5-E2E-NUBANK-001: Should correctly parse and preview Nubank CSV file', async ({ page }) => {
    // This test verifies the frontend can correctly parse Nubank's CSV format
    // Expected: PASS - frontend parsing works correctly
    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV fixture
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview to appear
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify correct number of transactions (10 rows in fixture)
    const previewRows = page.getByTestId('import-preview-row')
    await expect(previewRows).toHaveCount(10)

    // Verify first transaction data is correctly parsed
    const firstRow = previewRows.first()

    // Check date is displayed (should show 03/10/2025 in DD/MM/YYYY format)
    await expect(firstRow).toContainText('03/10/2025')

    // Check description contains Nubank's verbose text
    await expect(firstRow).toContainText('Transferência enviada pelo Pix')

    // Verify amount is parsed (200.00 - the absolute value)
    await expect(firstRow).toContainText('200')
  })

  test('M5-E2E-NUBANK-002: Should successfully import Nubank CSV (date format bug FIXED)', async ({
    page,
  }) => {
    // This test verifies that the date format bug has been FIXED
    // Previously: Backend returned 400 due to date format mismatch
    // Now: Frontend correctly converts DD/MM/YYYY to YYYY-MM-DD before sending

    await page.goto('/transactions')

    // Set up response listener for successful 201 response
    const successResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/transactions') &&
        response.request().method() === 'POST' &&
        (response.status() === 201 || response.status() === 200),
      { timeout: 30000 }
    )

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Navigate to step 2 (categorization)
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('import-step-2')).toBeVisible()

    // Click import button to complete the import
    await page.getByTestId('import-confirm-btn').click()

    // Wait for the successful response - BUG IS NOW FIXED
    const successResponse = await successResponsePromise
    expect(successResponse.status()).toBeLessThan(400)

    // Verify success message appears (toast or inline)
    await expect(
      page.getByText(/sucesso|importada|imported|success/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  // Bug has been FIXED - test.fail() removed
  // The frontend now correctly converts DD/MM/YYYY to YYYY-MM-DD
  test(
    'M5-E2E-NUBANK-003: Should send dates in YYYY-MM-DD format to backend (BUG FIXED)',
    async ({ page }) => {
      // This test verifies the date format is now correct
      // BUG FIXED: frontend now converts DD/MM/YYYY to YYYY-MM-DD before sending

      let capturedRequestBody: { date?: string } | null = null

      // Set up request interception
      await page.route('**/api/v1/transactions', async (route) => {
        const request = route.request()
        if (request.method() === 'POST') {
          try {
            capturedRequestBody = JSON.parse(request.postData() || '{}')
          } catch {
            // Ignore parse errors
          }
        }
        await route.continue()
      })

      await page.goto('/transactions')

      // Open import modal
      await page.getByTestId('import-transactions-btn').click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Upload Nubank CSV
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'nubank-statement.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(NUBANK_CSV_CONTENT),
      })

      // Wait for preview
      await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

      // Navigate to step 2
      await page.getByTestId('import-next-btn').click()
      await expect(page.getByTestId('import-step-2')).toBeVisible()

      // Trigger import
      await page.getByTestId('import-confirm-btn').click()

      // Wait for the request to be captured
      await page.waitForLoadState('networkidle')

      // This assertion documents the CORRECT behavior:
      // Date should be converted from DD/MM/YYYY (Nubank format) to YYYY-MM-DD (API format)
      // BUG FIXED: dates are now properly converted
      expect(capturedRequestBody).not.toBeNull()
      // Verify date is in YYYY-MM-DD format (not DD/MM/YYYY)
      // The fixture has dates like 03/10/2025, 05/10/2025, 06/10/2025
      // After conversion, they should be 2025-10-03, 2025-10-05, 2025-10-06
      expect(capturedRequestBody?.date).toMatch(/^2025-10-0[356]$/)
    }
  )

  test('M5-E2E-NUBANK-004: Should ignore extra columns like Identificador', async ({ page }) => {
    // Nubank CSV has 4 columns: Data, Valor, Identificador, Descrição
    // The Identificador column (UUID) should be ignored
    // Expected: PASS

    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Get the preview table content
    const previewTable = page.getByTestId('import-preview-table')
    const tableText = await previewTable.textContent()

    // Verify UUID values from Identificador column are NOT displayed
    // These are UUIDs from the fixture file
    expect(tableText).not.toContain('68e003a6-b163-4405-8d21-533c9bd26195')
    expect(tableText).not.toContain('68e07b88-31ec-44aa-95c9-b6e072626622')

    // Verify the essential columns ARE displayed
    expect(tableText).toContain('03/10/2025') // Date
    expect(tableText).toContain('Transferência') // Description
  })

  test('M5-E2E-NUBANK-005: Should correctly detect income and expense from Nubank amounts', async ({
    page,
  }) => {
    // Nubank uses negative amounts for expenses and positive for income
    // Expected: PASS

    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    const previewRows = page.getByTestId('import-preview-row')

    // First transaction: -200.00 (expense) - "Transferência enviada pelo Pix"
    const firstRow = previewRows.first()

    // Check for expense indicator (could be red color, minus sign, or 'expense' label)
    // The exact implementation may vary, but expense should be visually distinguished
    const firstRowText = await firstRow.textContent()
    // Should show absolute value (200.00)
    expect(firstRowText).toMatch(/200[,.]?00/)

    // Second transaction: 7095.28 (income) - "Transferência recebida pelo Pix"
    const secondRow = previewRows.nth(1)
    const secondRowText = await secondRow.textContent()
    // Should show the income amount
    expect(secondRowText).toMatch(/7[.]?095[,.]?28/)

    // Verify transaction types are correctly identified
    // Look for type indicators (expense/income or Despesa/Receita)
    // At minimum, amounts should be displayed without redundant negative signs
    expect(firstRowText).not.toContain('--') // No double negatives
  })

  test('M5-E2E-NUBANK-006: Should handle long Nubank descriptions correctly', async ({ page }) => {
    // Nubank descriptions can be 100-200 characters with special characters
    // Expected: PASS

    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    const previewTable = page.getByTestId('import-preview-table')
    const tableText = await previewTable.textContent()

    // Verify long descriptions are captured (first transaction has ~150 chars)
    // Key parts that should be present:
    expect(tableText).toContain('Transferência enviada pelo Pix')
    expect(tableText).toContain('DOUGLAS LACERDA CARDOSO')

    // Verify special characters are handled (bullet character •)
    // Note: The • character is used by Nubank to mask CPF/CNPJ numbers
    // It should either be preserved or gracefully handled
    const containsBullet = tableText?.includes('•') || tableText?.includes('...')
    expect(containsBullet || tableText?.includes('245.870')).toBeTruthy()

    // Verify institutional names are preserved
    expect(tableText).toContain('CLOUDWALK')
  })

  test('M5-E2E-NUBANK-007: Should show success feedback after import (date format bug FIXED)', async ({
    page,
  }) => {
    // BUG FIXED: Now that the date format bug is fixed, import succeeds
    // and proper success feedback is shown to the user

    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Navigate to step 2
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('import-step-2')).toBeVisible()

    // Trigger import (now succeeds with the date format bug fixed)
    await page.getByTestId('import-confirm-btn').click()

    // Wait for success feedback (modal closes or success message appears)
    await page.waitForLoadState('networkidle')

    // Check for success indication - now the import works!
    const successVisible = await page
      .getByText(/sucesso|success|importada|imported/i)
      .first()
      .isVisible()
      .catch(() => false)

    const toastVisible = await page
      .locator('[class*="toast"], [role="alert"]')
      .first()
      .isVisible()
      .catch(() => false)

    // With the bug fixed, success feedback should be shown
    // OR the modal closes (indicating success)
    const modalClosed = !(await page.getByRole('dialog').isVisible().catch(() => false))

    // At least one of these should be true for good UX
    expect(successVisible || toastVisible || modalClosed).toBeTruthy()
  })

  test('M5-E2E-NUBANK-008: Should auto-detect Nubank column format', async ({ page }) => {
    // Auto-detect mode should correctly identify Nubank's Portuguese column headers
    // Expected: PASS

    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Ensure format selector is on "Auto Detect" (usually the default)
    const formatSelector = page.getByTestId('bank-format-selector')
    await expect(formatSelector).toBeVisible()

    // Verify "Auto" option is available
    await formatSelector.click()
    await expect(page.getByRole('option', { name: /auto/i })).toBeVisible()

    // Select Auto if not already selected
    await page.getByRole('option', { name: /auto/i }).click()

    // Upload Nubank CSV
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-statement.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(NUBANK_CSV_CONTENT),
    })

    // Wait for preview - auto-detect should work
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify columns were correctly mapped
    const previewRows = page.getByTestId('import-preview-row')
    await expect(previewRows).toHaveCount(10)

    // Verify data is correctly extracted:
    // - "Data" → date column (03/10/2025)
    // - "Descrição" → description column (Transferência...)
    // - "Valor" → amount column (-200.00)
    const firstRow = previewRows.first()
    await expect(firstRow).toContainText('03/10/2025')
    await expect(firstRow).toContainText('Transferência')
    await expect(firstRow).toContainText('200')

    // Verify "Identificador" column was ignored (no UUID in preview)
    const tableText = await page.getByTestId('import-preview-table').textContent()
    expect(tableText).not.toContain('68e003a6')
  })
})
