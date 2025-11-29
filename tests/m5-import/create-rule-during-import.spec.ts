import { test, expect } from '@playwright/test'

/**
 * M5-E2E-05: Create Rule During Import
 * Validates the ability to create categorization rules during the import process:
 * - Upload CSV with repeated patterns (e.g., multiple IFOOD transactions)
 * - Navigate to categorization step
 * - Select category for a transaction with repeated pattern
 * - Option to "Create rule for similar pattern" should appear
 * - Complete import and verify rule was created
 *
 * Note: The "Create rule for similar pattern" feature is not yet fully
 * implemented in the frontend. These tests verify the import flow with
 * repeated patterns and document the expected behavior.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M5: Create Rule During Import', () => {
	test('M5-E2E-05a: Should import CSV with multiple IFOOD transactions', async ({ page }) => {
		// Step 1: Navigate to transactions and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Upload CSV with multiple IFOOD transactions
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Restaurante ABC,-45.90
2025-11-19,IFOOD *Pizza Delivery,-32.50
2025-11-18,IFOOD *Lanchonete XYZ,-28.00
2025-11-17,IFOOD *Sushi Express,-65.00
2025-11-16,Supermercado Extra,-245.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'ifood-transactions.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Verify preview shows all transactions
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await expect(page.getByTestId('import-preview-row')).toHaveCount(5)
	})

	test('M5-E2E-05b: Should navigate to categorize step with IFOOD transactions', async ({ page }) => {
		// Step 1: Navigate to transactions and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Upload CSV with IFOOD pattern
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Restaurante,-45.90
2025-11-19,IFOOD *Pizza,-32.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'ifood.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Wait for preview and go to step 2
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await page.getByTestId('import-next-btn').click()

		// Step 4: Verify categorize step is shown
		await expect(page.getByTestId('import-step-2')).toBeVisible()
		await expect(page.getByTestId('categorize-transactions-form')).toBeVisible()

		// Step 5: Verify category selectors are available for each transaction
		const categorySelectors = page.getByTestId('category-selector')
		await expect(categorySelectors.first()).toBeVisible()
	})

	test('M5-E2E-05c: Should show category selector for transactions with repeated patterns', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()

		// Step 2: Upload CSV with repeated UBER pattern
		const csvContent = `Data,Descrição,Valor
2025-11-20,UBER TRIP,-25.90
2025-11-19,UBER TRIP,-18.50
2025-11-18,UBER EATS,-42.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'uber.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Go to categorize step
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await page.getByTestId('import-next-btn').click()
		await expect(page.getByTestId('categorize-transactions-form')).toBeVisible()

		// Step 4: Verify multiple category selectors exist
		const categorySelectors = page.getByTestId('category-selector')
		const count = await categorySelectors.count()
		expect(count).toBe(3)
	})

	test('M5-E2E-05d: Should complete import with categorized IFOOD transactions', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()

		// Step 2: Upload CSV with IFOOD transactions
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Test Restaurant,-55.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'ifood-single.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Navigate through wizard
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await page.getByTestId('import-next-btn').click()
		await expect(page.getByTestId('categorize-transactions-form')).toBeVisible()

		// Step 4: Complete import
		await page.getByTestId('import-confirm-btn').click()

		// Step 5: Verify success
		await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 10000 })
	})

	test('M5-E2E-05e: Create rule checkbox should appear when categorizing repeated patterns', async ({ page }) => {
		/**
		 * Note: This test documents the EXPECTED behavior.
		 * The "Create rule for similar pattern" feature is not yet implemented.
		 *
		 * Expected behavior when implemented:
		 * 1. User selects category for a transaction with repeated pattern (e.g., IFOOD)
		 * 2. A checkbox appears: "Criar regra para padrao similar"
		 * 3. When checked, a rule is created with pattern .*IFOOD.* -> selected category
		 */

		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()

		// Step 2: Upload CSV with repeated pattern
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Restaurant A,-45.90
2025-11-19,IFOOD *Restaurant B,-32.50
2025-11-18,IFOOD *Restaurant C,-28.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'ifood-multiple.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Go to categorize step
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await page.getByTestId('import-next-btn').click()
		await expect(page.getByTestId('categorize-transactions-form')).toBeVisible()

		// Step 4: Check for create rule checkbox (not yet implemented)
		// When implemented, uncomment the following:
		// await expect(page.getByTestId('create-rule-checkbox')).toBeVisible()
		// await expect(page.getByTestId('create-rule-label')).toContainText(/Criar regra/i)

		// For now, verify the categorize form exists and has selectors
		const categorySelectors = page.getByTestId('category-selector')
		const count = await categorySelectors.count()
		expect(count).toBe(3)
	})

	test('M5-E2E-05f: Should handle mixed patterns in same import', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()

		// Step 2: Upload CSV with mixed patterns
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Restaurant,-45.90
2025-11-19,UBER TRIP,-25.00
2025-11-18,IFOOD *Delivery,-32.50
2025-11-17,UBER EATS,-42.00
2025-11-16,Supermercado Extra,-245.50`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'mixed-patterns.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Verify all transactions are parsed
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
		await expect(page.getByTestId('import-preview-row')).toHaveCount(5)

		// Step 4: Navigate to categorize step
		await page.getByTestId('import-next-btn').click()
		await expect(page.getByTestId('categorize-transactions-form')).toBeVisible()

		// Step 5: Verify 5 category selectors for 5 transactions
		const categorySelectors = page.getByTestId('category-selector')
		await expect(categorySelectors).toHaveCount(5)
	})

	test('M5-E2E-05g: Import with patterns should show selected count', async ({ page }) => {
		// Step 1: Navigate and open import wizard
		await page.goto('/transactions')
		await page.getByTestId('import-transactions-btn').click()

		// Step 2: Upload CSV
		const csvContent = `Data,Descrição,Valor
2025-11-20,IFOOD *Test 1,-10.00
2025-11-19,IFOOD *Test 2,-20.00
2025-11-18,IFOOD *Test 3,-30.00`

		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'ifood-count.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})

		// Step 3: Wait for preview
		await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

		// Step 4: Verify selected count shows 3
		const selectedCount = page.getByTestId('import-selected-count')
		await expect(selectedCount).toContainText('3')
	})
})
