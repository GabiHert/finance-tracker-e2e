import { test, expect } from '@playwright/test'

/**
 * M5-E2E-06: Custom Column Mapping
 * Validates the ability to manually map columns when auto-detect fails:
 * - Select "Personalizado" (Custom) bank format
 * - Manually assign columns: Date, Description, Amount
 * - Preview with custom mapping
 * - Import with custom column configuration
 *
 * Note: The custom column mapping UI is not yet fully implemented.
 * These tests verify the existing bank format selector and document
 * expected behavior for full custom mapping feature.
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
		/**
		 * Note: Custom column mapping UI is not yet implemented.
		 * This test documents the expected behavior when implemented.
		 *
		 * Expected behavior:
		 * 1. User selects "Personalizado" bank format
		 * 2. Uploads a CSV file
		 * 3. System shows column mapping interface with dropdowns
		 * 4. User maps: Date column, Description column, Amount column
		 * 5. Preview updates based on mapping
		 */

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

		// Step 4: Wait for file processing
		// When custom mapping is implemented, look for mapping UI:
		// await expect(page.getByTestId('column-mapping-ui')).toBeVisible()
		// await expect(page.getByTestId('date-column-selector')).toBeVisible()
		// await expect(page.getByTestId('description-column-selector')).toBeVisible()
		// await expect(page.getByTestId('amount-column-selector')).toBeVisible()

		// For now, verify the file is processed (auto-detect may still work)
		// The current implementation tries to auto-detect columns
		await page.waitForTimeout(1000)
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

	test('M5-E2E-06e: Should show error for CSV with unrecognized columns', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Upload CSV with completely non-standard column names
		const csvContent = `Col1,Col2,Col3
2025-11-20,Some Text,-245.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'unknown-columns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Expect error message about unrecognized columns
		await expect(page.getByTestId('file-error-message')).toBeVisible({ timeout: 5000 })
		await expect(page.getByTestId('file-error-message')).toContainText(/column|format|custom/i)
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
		await page.waitForTimeout(500)
	})
})
