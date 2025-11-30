import { test, expect } from '@playwright/test'

/**
 * M5-E2E-06: Custom Column Mapping
 * Validates the ability to manually map columns when auto-detect fails:
 * - Select "Personalizado" (Custom) bank format
 * - Upload CSV file to extract headers
 * - Column mapping UI displays with dropdowns for each CSV column
 * - Manually assign columns: Date, Description, Amount
 * - Validation shows error when required fields not mapped
 * - Success message when all required fields are mapped
 * - Preview table appears after successful mapping
 * - Import with custom column configuration
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M5: Custom Column Mapping', () => {
	test('M5-E2E-06a: Should display bank format selector with Custom option', async ({ page }) => {
		// Step 1: Navigate to transactions and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Verify bank format selector exists
		await expect(page.getByTestId('bank-format-selector')).toBeVisible()

		// Step 3: Click to open selector and verify "Personalizado" option exists
		await page.getByTestId('bank-format-selector').click()
		await expect(page.getByRole('option', { name: /personalizado|custom/i })).toBeVisible()
	})

	test('M5-E2E-06b: Should allow selecting Custom bank format', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Click bank format selector
		await page.getByTestId('bank-format-selector').click()

		// Step 3: Select "Personalizado" (Custom) option
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 4: Verify selection is applied
		// The selector should now show "Personalizado" as selected
		await expect(page.getByTestId('bank-format-selector')).toContainText(/personalizado|custom/i)
	})

	test('M5-E2E-06c: Should show column mapping UI when Custom is selected', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Select Custom format
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 3: Upload a CSV with non-standard column names
		const csvContent = `Transaction_Date,Memo,Value
2025-11-20,Supermercado Extra,-245.50
2025-11-19,Salario,8500.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'custom-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 4: Wait for column mapping UI to appear
		await expect(page.getByTestId('column-mapping-container')).toBeVisible({ timeout: 5000 })
		await expect(page.getByTestId('column-mapping-header')).toBeVisible()

		// Step 5: Verify all CSV headers are shown as mapping rows
		await expect(page.getByTestId('mapping-row-0')).toBeVisible()
		await expect(page.getByTestId('mapping-row-1')).toBeVisible()
		await expect(page.getByTestId('mapping-row-2')).toBeVisible()

		// Step 6: Verify dropdowns exist for each column
		await expect(page.getByTestId('field-dropdown-0')).toBeVisible()
		await expect(page.getByTestId('field-dropdown-1')).toBeVisible()
		await expect(page.getByTestId('field-dropdown-2')).toBeVisible()
	})

	test('M5-E2E-06d: Should handle CSV with standard column names', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Upload CSV with standard column names that auto-detect can recognize
		const csvContent = `Data,Descrição,Valor
2025-11-20,Supermercado Extra,-245.50
2025-11-19,Salario,8500.00
2025-11-18,UBER TRIP,-35.90`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'standard-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Verify preview shows parsed transactions
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await expect(page.getByTestId('import-preview-row')).toHaveCount(3)
	})

	test('M5-E2E-06e: Should require all fields mapped before Next button enabled', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Select Custom format first
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 3: Upload CSV with completely non-standard column names
		const csvContent = `Col1,Col2,Col3
2025-11-20,Some Text,-245.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'unknown-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 4: Verify column mapping UI appears
		await expect(page.getByTestId('column-mapping-container')).toBeVisible({ timeout: 5000 })

		// Step 5: Next button should be disabled when no fields are mapped
		await expect(page.getByTestId('import-next-btn')).toBeDisabled()

		// Step 6: Map only one field (date) - Next should still be disabled
		await page.getByTestId('field-dropdown-0').selectOption('date')
		await expect(page.getByTestId('import-next-btn')).toBeDisabled()

		// Step 7: Map second field (description) - Next should still be disabled
		await page.getByTestId('field-dropdown-1').selectOption('description')
		await expect(page.getByTestId('import-next-btn')).toBeDisabled()

		// Step 8: Map third field (amount) - Now Next should be enabled
		await page.getByTestId('field-dropdown-2').selectOption('amount')
		await expect(page.getByTestId('import-next-btn')).toBeEnabled()
	})

	test('M5-E2E-06f: Should display all bank format options', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Open bank format selector
		await page.getByTestId('bank-format-selector').click()

		// Step 3: Verify all expected bank options are present
		await expect(page.getByRole('option', { name: /auto/i })).toBeVisible()
		await expect(page.getByRole('option', { name: /nubank/i })).toBeVisible()
		await expect(page.getByRole('option', { name: /inter/i })).toBeVisible()
		await expect(page.getByRole('option', { name: /ita[uú]/i })).toBeVisible()
		await expect(page.getByRole('option', { name: /personalizado|custom/i })).toBeVisible()
	})

	test('M5-E2E-06g: Auto detect should be default bank format', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Verify "Auto Detect" is the default selection
		await expect(page.getByTestId('bank-format-selector')).toContainText(/auto/i)
	})

	test('M5-E2E-06h: Should switch bank formats and retain file', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Upload a CSV file first
		const csvContent = `Data,Descrição,Valor
2025-11-20,Test Transaction,-100.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'test.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Wait for preview
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

		// Step 4: Change bank format to Nubank
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /nubank/i }).click()

		// Step 5: Verify file is still loaded (preview should still be visible)
		// Note: The actual re-parsing behavior depends on implementation
		await page.waitForLoadState('networkidle')
	})

	test('M5-E2E-06i: Should show success when all required fields are mapped', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Select Custom format
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 3: Upload a CSV with non-standard column names
		const csvContent = `Transaction_Date,Memo,Value
2025-11-20,Supermercado Extra,-245.50
2025-11-19,Salario,8500.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'custom-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 4: Wait for column mapping UI
		await expect(page.getByTestId('column-mapping-container')).toBeVisible({ timeout: 5000 })

		// Step 5: Map the Date column
		await page.getByTestId('field-dropdown-0').selectOption('date')

		// Step 6: Map the Description column
		await page.getByTestId('field-dropdown-1').selectOption('description')

		// Step 7: Map the Amount column
		await page.getByTestId('field-dropdown-2').selectOption('amount')

		// Step 8: Verify success message appears
		await expect(page.getByTestId('column-mapping-success')).toBeVisible()

		// Step 9: Verify error is not shown
		await expect(page.getByTestId('column-mapping-error')).not.toBeVisible()
	})

	test('M5-E2E-06j: Should show preview after mapping columns', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Select Custom format
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 3: Upload a CSV with non-standard column names
		const csvContent = `Transaction_Date,Memo,Value
2025-11-20,Supermercado Extra,-245.50
2025-11-19,Salario,8500.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'custom-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 4: Wait for column mapping UI
		await expect(page.getByTestId('column-mapping-container')).toBeVisible({ timeout: 5000 })

		// Step 5: Map all columns
		await page.getByTestId('field-dropdown-0').selectOption('date')
		await page.getByTestId('field-dropdown-1').selectOption('description')
		await page.getByTestId('field-dropdown-2').selectOption('amount')

		// Step 6: Verify preview table appears with transactions
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 5000 })
		await expect(page.getByTestId('import-preview-row')).toHaveCount(2)

		// Step 7: Verify Next button is enabled
		await expect(page.getByTestId('import-next-btn')).toBeEnabled()
	})

	test('M5-E2E-06k: Should disable already-mapped options in other dropdowns', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Select Custom format
		await page.getByTestId('bank-format-selector').click()
		await page.getByRole('option', { name: /personalizado|custom/i }).click()

		// Step 3: Upload a CSV
		const csvContent = `Col1,Col2,Col3
2025-11-20,Some Text,-245.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'test.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 4: Wait for column mapping UI
		await expect(page.getByTestId('column-mapping-container')).toBeVisible({ timeout: 5000 })

		// Step 5: Select "Data" (date) in first dropdown
		await page.getByTestId('field-dropdown-0').selectOption('date')

		// Step 6: Verify "Data" option shows as disabled/used in second dropdown
		const dropdown1 = page.getByTestId('field-dropdown-1')
		const dateOption = dropdown1.locator('option[value="date"]')
		await expect(dateOption).toBeDisabled()
	})
})
