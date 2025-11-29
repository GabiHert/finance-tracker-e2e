import { test, expect } from '@playwright/test'

/**
 * M4-E2E-10: Bulk Categorize Transactions
 * Validates the bulk categorization flow for transactions:
 * - Select multiple transactions
 * - Bulk actions bar appears with "Change Category" button
 * - Click "Change Category" button to open modal
 * - Modal shows selected count and transaction preview
 * - Category selector with apply/cancel actions
 * - Apply clears selection, Cancel keeps selection
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

	test('M4-E2E-10g: Change Category button should open bulk categorize modal', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Verify Change Category button is visible and enabled
		const changeCategoryBtn = page.getByTestId('bulk-edit-category-btn')
		await expect(changeCategoryBtn).toBeVisible()
		await expect(changeCategoryBtn).toBeEnabled()

		// Step 3: Click the button to open modal
		await changeCategoryBtn.click()

		// Step 4: Verify modal opens
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 5: Verify modal shows correct count
		await expect(page.getByTestId('bulk-categorize-count')).toContainText('1')
	})

	test('M4-E2E-10h: Bulk categorize modal should show selected count and preview', async ({ page }) => {
		// Step 1: Navigate and select multiple transactions
		await page.goto('/transactions')

		const checkboxes = page.getByTestId('transaction-checkbox')
		const checkboxCount = await checkboxes.count()
		const selectCount = Math.min(3, checkboxCount)

		for (let i = 0; i < selectCount; i++) {
			await checkboxes.nth(i).click()
		}

		// Step 2: Open bulk categorize modal
		await page.getByTestId('bulk-edit-category-btn').click()
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 3: Verify count display
		await expect(page.getByTestId('bulk-categorize-count')).toContainText(`${selectCount}`)

		// Step 4: Verify preview is visible when transactions are selected
		await expect(page.getByTestId('bulk-categorize-preview')).toBeVisible()
	})

	test('M4-E2E-10i: Bulk categorize modal should have category selector', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Open modal
		await page.getByTestId('bulk-edit-category-btn').click()
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 3: Verify category selector exists
		await expect(page.getByTestId('bulk-categorize-category-select')).toBeVisible()

		// Step 4: Verify Apply button is disabled when no category selected
		await expect(page.getByTestId('bulk-categorize-apply-btn')).toBeDisabled()
	})

	test('M4-E2E-10j: Should enable Apply button when category is selected', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Open modal
		await page.getByTestId('bulk-edit-category-btn').click()
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 3: Verify Apply button is initially disabled
		await expect(page.getByTestId('bulk-categorize-apply-btn')).toBeDisabled()

		// Step 4: Select a category from dropdown
		const categorySelect = page.getByTestId('bulk-categorize-category-select')
		await categorySelect.selectOption({ index: 1 })

		// Step 5: Verify Apply button is now enabled
		await expect(page.getByTestId('bulk-categorize-apply-btn')).toBeEnabled()
	})

	test('M4-E2E-10k: Should close modal and clear selection when clicking Apply', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()

		// Step 2: Open modal
		await page.getByTestId('bulk-edit-category-btn').click()
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 3: Select a category
		const categorySelect = page.getByTestId('bulk-categorize-category-select')
		await categorySelect.selectOption({ index: 1 })

		// Step 4: Click Apply
		await page.getByTestId('bulk-categorize-apply-btn').click()

		// Step 5: Verify modal closes
		await expect(page.getByTestId('bulk-categorize-modal')).not.toBeVisible()

		// Step 6: Verify selection is cleared (bulk actions bar hidden)
		await expect(page.getByTestId('bulk-actions-bar')).not.toBeVisible()
	})

	test('M4-E2E-10l: Should close modal when clicking Cancel', async ({ page }) => {
		// Step 1: Navigate and select transaction
		await page.goto('/transactions')
		await page.getByTestId('transaction-checkbox').first().click()

		// Step 2: Open modal
		await page.getByTestId('bulk-edit-category-btn').click()
		await expect(page.getByTestId('bulk-categorize-modal')).toBeVisible()

		// Step 3: Click Cancel
		await page.getByTestId('bulk-categorize-cancel-btn').click()

		// Step 4: Verify modal closes
		await expect(page.getByTestId('bulk-categorize-modal')).not.toBeVisible()

		// Step 5: Verify selection is NOT cleared (bulk actions bar still visible)
		await expect(page.getByTestId('bulk-actions-bar')).toBeVisible()
	})
})
