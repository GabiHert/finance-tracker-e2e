import { test, expect } from '@playwright/test'

/**
 * M3-E2E-04: Delete Category with Transactions Flow
 * Validates the category deletion flow when the category has linked transactions:
 * - Warning message about orphaned transactions
 * - Confirmation with transaction count display
 * - Cancellation preserves category and transactions
 * - Deletion removes category (transactions become uncategorized)
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Delete Category with Transactions', () => {
	test('M3-E2E-04a: Should show transaction warning when deleting category with transactions', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Find the first category that has transactions (Food & Dining has 5)
		const categoryCard = page.getByTestId('category-card').first()
		await expect(categoryCard).toBeVisible()

		// Step 3: Hover and click delete
		await categoryCard.hover()
		const deleteBtn = categoryCard.getByTestId('delete-category-btn')
		await deleteBtn.click()

		// Step 4: Verify confirmation dialog appears with transaction warning
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()
		await expect(page.getByTestId('delete-confirmation-text')).toContainText(/Deseja excluir esta categoria/i)

		// Step 5: Verify transaction warning message is shown
		await expect(page.getByTestId('transaction-warning')).toBeVisible()
		await expect(page.getByTestId('transaction-warning')).toContainText(/transacoes ficarao sem categoria/i)
	})

	test('M3-E2E-04b: Should show specific transaction count in warning', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Find the Food & Dining category (has 5 transactions in mock)
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 3: Verify the warning shows the correct count (5 transactions)
		await expect(page.getByTestId('transaction-warning')).toBeVisible()
		await expect(page.getByTestId('transaction-warning')).toContainText('5 transacoes ficarao sem categoria')
	})

	test('M3-E2E-04c: Should cancel deletion and keep category with transactions', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Get initial category count
		const initialCards = await page.getByTestId('category-card').count()

		// Step 3: Get the first category name (Food & Dining)
		const firstCategoryName = await page.getByTestId('category-card').first().getByTestId('category-name').textContent()

		// Step 4: Open delete dialog for category with transactions
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 5: Verify transaction warning is shown
		await expect(page.getByTestId('transaction-warning')).toBeVisible()

		// Step 6: Click cancel
		await page.getByTestId('cancel-delete-btn').click()

		// Step 7: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

		// Step 8: Verify category count unchanged
		const finalCards = await page.getByTestId('category-card').count()
		expect(finalCards).toBe(initialCards)

		// Step 9: Verify the category is still visible
		if (firstCategoryName) {
			await expect(page.getByTestId('category-name').first()).toHaveText(firstCategoryName)
		}
	})

	test('M3-E2E-04d: Should delete category with transactions and show success toast', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Get initial category count
		const initialCards = await page.getByTestId('category-card').count()

		// Step 3: Open delete dialog for category with transactions (first one - Food & Dining)
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 4: Verify transaction warning is shown
		await expect(page.getByTestId('transaction-warning')).toBeVisible()

		// Step 5: Confirm deletion despite warning
		await page.getByTestId('confirm-delete-btn').click()

		// Step 6: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

		// Step 7: Verify success toast
		await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 5000 })
		await expect(page.getByTestId('toast-success')).toContainText(/Categoria excluida/i)

		// Step 8: Verify category is removed from grid
		const finalCards = await page.getByTestId('category-card').count()
		expect(finalCards).toBe(initialCards - 1)
	})

	test('M3-E2E-04e: Should not show transaction warning for category with zero transactions', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Find the Housing category (index 2) which has 0 transactions
		// We need to find a category with 0 transactions
		const categoryCards = page.getByTestId('category-card')
		const thirdCard = categoryCards.nth(2) // Housing has transactionCount: 0

		// Step 3: Hover and click delete on Housing
		await thirdCard.hover()
		await thirdCard.getByTestId('delete-category-btn').click()

		// Step 4: Verify confirmation dialog appears
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()
		await expect(page.getByTestId('delete-confirmation-text')).toBeVisible()

		// Step 5: Verify NO transaction warning is shown (category has 0 transactions)
		await expect(page.getByTestId('transaction-warning')).not.toBeVisible()

		// Step 6: Close dialog
		await page.getByTestId('cancel-delete-btn').click()
	})

	test('M3-E2E-04f: Should show different transaction counts for different categories', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Check Entertainment category (index 3) which has 10 transactions
		const entertainmentCard = page.getByTestId('category-card').nth(3)
		await entertainmentCard.hover()
		await entertainmentCard.getByTestId('delete-category-btn').click()

		// Step 3: Verify the warning shows 10 transactions
		await expect(page.getByTestId('transaction-warning')).toBeVisible()
		await expect(page.getByTestId('transaction-warning')).toContainText('10 transacoes ficarao sem categoria')

		// Step 4: Close dialog
		await page.getByTestId('cancel-delete-btn').click()
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

		// Step 5: Now check Salary category (index 6) which has 12 transactions
		const salaryCard = page.getByTestId('category-card').nth(6)
		await salaryCard.hover()
		await salaryCard.getByTestId('delete-category-btn').click()

		// Step 6: Verify the warning shows 12 transactions
		await expect(page.getByTestId('transaction-warning')).toBeVisible()
		await expect(page.getByTestId('transaction-warning')).toContainText('12 transacoes ficarao sem categoria')
	})
})
