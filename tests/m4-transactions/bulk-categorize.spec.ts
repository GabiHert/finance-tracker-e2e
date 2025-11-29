import { test, expect } from '@playwright/test'

/**
 * M4-E2E-10: Bulk Categorize Transactions
 * Validates the bulk categorization flow for transactions:
 * - Select multiple transactions
 * - Bulk actions bar appears with "Change Category" button
 * - Click "Change Category" button
 *
 * Note: The bulk categorization modal is not yet fully implemented
 * in the frontend. These tests verify the UI elements that exist.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M4: Bulk Categorize Transactions', () => {
	test('M4-E2E-10a: Should show Change Category button when transactions are selected', async ({ page }) => {
		// Step 1: Navigate to transactions screen
		await page.goto('/transactions')
		await expect(page.getByTestId('transactions-header')).toBeVisible()

		// Step 2: Verify transactions exist
		const transactionRows = page.getByTestId('transaction-row')
		const rowCount = await transactionRows.count()
		expect(rowCount).toBeGreaterThan(0)

		// Step 3: Select first transaction
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 4: Verify bulk actions bar appears
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

		// Step 5: Verify "Change Category" button is visible
		await expect(page.getByTestId('bulk-edit-category-btn')).toBeVisible()
	})

	test('M4-E2E-10b: Should show correct count of selected transactions in bulk bar', async ({ page }) => {
		// Step 1: Navigate to transactions screen
		await page.goto('/transactions')
		await expect(page.getByTestId('transactions-header')).toBeVisible()

		// Step 2: Select multiple transactions
		const checkboxes = page.getByTestId('transaction-checkbox')
		const checkboxCount = await checkboxes.count()

		// Select first 3 transactions (or all if less than 3)
		const selectCount = Math.min(3, checkboxCount)
		for (let i = 0; i < selectCount; i++) {
			await checkboxes.nth(i).click()
		}

		// Step 3: Verify bulk bar shows correct count
		const selectedCountText = await page.getByTestId('bulk-selected-count').textContent()
		expect(selectedCountText).toContain(`${selectCount}`)
	})

	test('M4-E2E-10c: Should show all bulk action buttons when transactions selected', async ({ page }) => {
		// Step 1: Navigate and select transactions
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Verify bulk actions bar appears
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

		// Step 3: Verify all bulk action buttons are visible
		await expect(page.getByTestId('bulk-edit-category-btn')).toBeVisible()
		await expect(page.getByTestId('bulk-export-btn')).toBeVisible()
		await expect(page.getByTestId('bulk-delete-btn')).toBeVisible()
		await expect(page.getByTestId('bulk-clear-selection')).toBeVisible()
	})

	test('M4-E2E-10d: Should clear selection when clicking Clear button', async ({ page }) => {
		// Step 1: Navigate and select transactions
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Verify bulk bar appears
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

		// Step 3: Click clear selection button
		await page.getByTestId('bulk-clear-selection').click()

		// Step 4: Verify bulk bar disappears
		await expect(page.getByTestId('bulk-actions-bar')).not.toBeVisible()
	})

	test('M4-E2E-10e: Should select all transactions via header checkbox', async ({ page }) => {
		// Step 1: Navigate to transactions screen
		await page.goto('/transactions')

		// Step 2: Count transactions
		const transactionCount = await page.getByTestId('transaction-row').count()
		expect(transactionCount).toBeGreaterThan(0)

		// Step 3: Click select all checkbox
		await page.getByTestId('select-all-transactions').click()

		// Step 4: Verify bulk bar shows all selected
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()
		const selectedCountText = await page.getByTestId('bulk-selected-count').textContent()
		expect(selectedCountText).toContain(`${transactionCount}`)

		// Step 5: Verify Change Category button is visible for bulk operation
		await expect(page.getByTestId('bulk-edit-category-btn')).toBeVisible()
	})

	test('M4-E2E-10f: Should deselect all when clicking header checkbox again', async ({ page }) => {
		// Step 1: Navigate and select all
		await page.goto('/transactions')
		await page.getByTestId('select-all-transactions').click()

		// Step 2: Verify bulk bar appears
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

		// Step 3: Click select all again to deselect
		await page.getByTestId('select-all-transactions').click()

		// Step 4: Verify bulk bar disappears (no selections)
		await expect(page.getByTestId('bulk-actions-bar')).not.toBeVisible()
	})

	test('M4-E2E-10g: Change Category button should be clickable', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Verify Change Category button is visible and enabled
		const changeCategoryBtn = page.getByTestId('bulk-edit-category-btn')
		await expect(changeCategoryBtn).toBeVisible()
		await expect(changeCategoryBtn).toBeEnabled()

		// Step 3: Click the button
		// Note: Currently the button has no onClick handler in the frontend
		// This test verifies the button is clickable, not the modal behavior
		await changeCategoryBtn.click()

		// Note: Full bulk categorization modal is not yet implemented
		// When implemented, add expectations for modal appearance and category selection
	})
})
