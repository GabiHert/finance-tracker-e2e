import { test, expect } from '@playwright/test'

/**
 * M3-E2E-03: Delete Category Flow
 * Validates the complete category deletion flow including:
 * - Delete button visibility on hover
 * - Confirmation dialog display
 * - Category removal from grid
 * - Success toast notification
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Delete Category Flow', () => {
	test('M3-E2E-03a: Should show delete button on category card hover', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Find a category card
		const categoryCard = page.getByTestId('category-card').first()
		await expect(categoryCard).toBeVisible()

		// Step 3: Verify delete button is initially not visible (opacity-0)
		const deleteBtn = categoryCard.getByTestId('delete-category-btn')
		await expect(deleteBtn).toBeAttached()

		// Step 4: Hover over the category card
		await categoryCard.hover()

		// Step 5: Verify delete button becomes visible on hover
		await expect(deleteBtn).toBeVisible()
	})

	test('M3-E2E-03b: Should open confirmation dialog when clicking delete', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')
		await expect(page.getByTestId('categories-grid')).toBeVisible()

		// Step 2: Hover over a category card and click delete
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()

		const deleteBtn = categoryCard.getByTestId('delete-category-btn')
		await deleteBtn.click()

		// Step 3: Verify confirmation dialog appears
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()
		await expect(page.getByRole('heading', { name: /excluir categoria/i })).toBeVisible()
		await expect(page.getByTestId('delete-confirmation-text')).toContainText(/Deseja excluir esta categoria/i)

		// Step 4: Verify cancel and confirm buttons exist
		await expect(page.getByTestId('cancel-delete-btn')).toBeVisible()
		await expect(page.getByTestId('confirm-delete-btn')).toBeVisible()
	})

	test('M3-E2E-03c: Should cancel deletion and keep category', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')

		// Step 2: Get initial category count
		const initialCards = await page.getByTestId('category-card').count()

		// Step 3: Open delete dialog
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 4: Click cancel
		await page.getByTestId('cancel-delete-btn').click()

		// Step 5: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

		// Step 6: Verify category count unchanged
		const finalCards = await page.getByTestId('category-card').count()
		expect(finalCards).toBe(initialCards)
	})

	test('M3-E2E-03d: Should delete category and show success toast', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')

		// Step 2: Get initial category count and name
		const initialCards = await page.getByTestId('category-card').count()
		const firstCardName = await page.getByTestId('category-card').first().getByTestId('category-name').textContent()

		// Step 3: Open delete dialog
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 4: Confirm deletion
		await page.getByTestId('confirm-delete-btn').click()

		// Step 5: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()

		// Step 6: Verify success toast
		await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 5000 })
		await expect(page.getByTestId('toast-success')).toContainText(/Categoria excluida/i)

		// Step 7: Verify category is removed from grid
		const finalCards = await page.getByTestId('category-card').count()
		expect(finalCards).toBe(initialCards - 1)

		// Step 8: Verify the deleted category is no longer visible
		if (firstCardName) {
			await expect(page.getByRole('heading', { name: firstCardName, level: 3 })).not.toBeVisible()
		}
	})

	test('M3-E2E-03e: Should close dialog when clicking outside', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')

		// Step 2: Open delete dialog
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 3: Verify dialog is open
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()

		// Step 4: Click outside (on backdrop) - use position to click on visible backdrop area
		// The modal is centered, so click at coordinates far from center (top-left corner)
		await page.getByTestId('modal-backdrop').click({ position: { x: 10, y: 10 } })

		// Step 5: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
	})

	test('M3-E2E-03f: Should close dialog when pressing Escape', async ({ page }) => {
		// Step 1: Navigate to categories page
		await page.goto('/categories')

		// Step 2: Open delete dialog
		const categoryCard = page.getByTestId('category-card').first()
		await categoryCard.hover()
		await categoryCard.getByTestId('delete-category-btn').click()

		// Step 3: Verify dialog is open
		await expect(page.getByTestId('delete-category-modal')).toBeVisible()

		// Step 4: Press Escape
		await page.keyboard.press('Escape')

		// Step 5: Verify dialog closes
		await expect(page.getByTestId('delete-category-modal')).not.toBeVisible()
	})
})
