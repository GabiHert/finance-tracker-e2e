import { test, expect } from '@playwright/test'
import {
  createCategory,
  deleteAllCategories,
} from '../fixtures/test-utils'

/**
 * M3-E2E-04: Delete Category with Transactions Flow
 * Validates the category deletion flow when the category has linked transactions:
 * - Warning message about orphaned transactions
 * - Confirmation with transaction count display
 * - Cancellation preserves category and transactions
 * - Deletion removes category (transactions become uncategorized)
 *
 * Note: Tests that require transactions (04a-04d, 04f) are marked as TODO
 * until transaction API integration is complete. Test 04e (zero transactions)
 * works with current implementation.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Delete Category with Transactions', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate first to establish auth context
		await page.goto('/categories')
		await page.waitForLoadState('domcontentloaded')
		// Clean up any existing categories
		await deleteAllCategories(page)
	})

	test.skip('M3-E2E-04a: Should show transaction warning when deleting category with transactions', async ({ page }) => {
		// TODO: Requires transaction creation API integration
		// This test needs a category with transactions to show the warning
		test.info().annotations.push({ type: 'issue', description: 'Requires transaction API integration' })
	})

	test.skip('M3-E2E-04b: Should show specific transaction count in warning', async ({ page }) => {
		// TODO: Requires transaction creation API integration
		test.info().annotations.push({ type: 'issue', description: 'Requires transaction API integration' })
	})

	test.skip('M3-E2E-04c: Should cancel deletion and keep category with transactions', async ({ page }) => {
		// TODO: Requires transaction creation API integration
		test.info().annotations.push({ type: 'issue', description: 'Requires transaction API integration' })
	})

	test.skip('M3-E2E-04d: Should delete category with transactions and show success toast', async ({ page }) => {
		// TODO: Requires transaction creation API integration
		test.info().annotations.push({ type: 'issue', description: 'Requires transaction API integration' })
	})

	test('M3-E2E-04e: Should not show transaction warning for category with zero transactions', async ({ page }) => {
		// Step 1: Create a category (will have 0 transactions)
		await createCategory(page, { name: 'Category with No Transactions', type: 'expense' })

		// Step 2: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 3: Find and hover over the category
		const categoryCard = page.getByTestId('category-card').first()
		await expect(categoryCard).toBeVisible()

		// Step 4: Hover and click delete
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 5: Verify confirmation dialog appears
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()
		await expect(page.getByTestId('delete-confirmation-text')).toBeVisible()

		// Step 6: Verify NO transaction warning is shown (category has 0 transactions)
		await expect(page.getByTestId('transaction-warning')).not.toBeVisible()

		// Step 7: Close dialog
		await page.getByTestId('cancel-delete-btn').click()
	})

	test.skip('M3-E2E-04f: Should show different transaction counts for different categories', async ({ page }) => {
		// TODO: Requires transaction creation API integration
		test.info().annotations.push({ type: 'issue', description: 'Requires transaction API integration' })
	})
})
