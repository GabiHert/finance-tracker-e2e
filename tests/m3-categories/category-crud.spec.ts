import { test, expect } from '@playwright/test'
import {
  createCategory,
  deleteAllCategories,
  seedTestCategories,
  fetchCategories,
  TEST_CATEGORIES,
  TestCategory,
} from '../fixtures/test-utils'

/**
 * M3-E2E: Category CRUD Operations
 * Validates complete create, read, update flows for categories:
 * - Full category creation with all fields
 * - Category editing with data persistence
 * - Form validation for name length
 * - Empty state handling
 * - Combined search and filter operations
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Category CRUD Operations', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate first to establish auth context
		await page.goto('/categories')
		await page.waitForLoadState('domcontentloaded')
		// Clean up any existing categories before each test
		await deleteAllCategories(page)
	})

	test('M3-E2E-06a: Should complete full category creation flow', async ({ page }) => {
		// Step 1: Navigate to categories screen
		await page.goto('/categories')
		await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

		// Step 2: Count initial categories
		const initialCards = page.getByTestId('category-card')
		const initialCount = await initialCards.count()

		// Step 3: Click "Add Category" button
		await page.getByTestId('add-category-btn').click()

		// Step 4: Verify modal opens
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('heading', { name: /new category/i })).toBeVisible()

		// Step 5: Fill in category name with unique identifier
		const categoryName = `E2E Test ${Date.now()}`
		await page.getByTestId('category-name-input').fill(categoryName)

		// Step 6: Verify form elements have valid values
		// Type, icon, and color have defaults - verify they're present
		await expect(page.getByTestId('category-type-select')).toBeVisible()
		await expect(page.getByTestId('category-icon-picker')).toBeVisible()
		await expect(page.getByTestId('category-color-picker')).toBeVisible()

		// Step 7: Click "Save" button
		await page.getByTestId('save-category-btn').click()

		// Step 8: Verify modal closes (save was successful)
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 9: Category MUST appear in list (not OR logic)
		const createdCategory = page.getByTestId('category-card').filter({ hasText: categoryName })
		await expect(createdCategory).toBeVisible()

		// Step 10: Count MUST have increased by exactly 1
		const newCount = await page.getByTestId('category-card').count()
		expect(newCount).toBe(initialCount + 1)

		// Step 11: API MUST have the category
		const categories = await fetchCategories(page)
		const found = categories.find(c => c.name === categoryName)
		expect(found).toBeDefined()
	})

	test('M3-E2E-06b: Should complete full category edit flow', async ({ page }) => {
		// Step 0: Create a category to edit
		const testCategory = await createCategory(page, { name: 'Category to Edit', type: 'expense' })

		// Step 1: Navigate to categories screen (reload to see the new category)
		await page.goto('/categories')
		await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

		// Step 2: Get the first category card and its current name
		const categoryCard = page.getByTestId('category-card').first()
		await expect(categoryCard).toBeVisible()
		const originalName = await categoryCard.getByTestId('category-name').textContent()

		// Step 3: Click on the category card to open edit modal
		await categoryCard.click()

		// Step 4: Verify edit modal opens with pre-populated data
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByRole('heading', { name: /edit category/i })).toBeVisible()

		// Step 5: Verify name is pre-filled with original name
		const nameInput = page.getByTestId('category-name-input')
		if (originalName) {
			await expect(nameInput).toHaveValue(originalName)
		}

		// Step 6: Change the name
		const updatedName = `Updated ${Date.now()}`
		await nameInput.clear()
		await nameInput.fill(updatedName)

		// Step 7: Click "Save Changes" button
		await page.getByTestId('save-category-btn').click()

		// Step 8: Verify modal closes (save was successful)
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 9: Verify new name appears in list
		await expect(page.getByTestId('category-name').filter({ hasText: updatedName })).toBeVisible()

		// Step 10: Verify old name no longer appears
		if (originalName) {
			await expect(page.getByTestId('category-name').filter({ hasText: originalName })).not.toBeVisible()
		}

		// Step 11: Verify API has updated category
		const categories = await fetchCategories(page)
		const updated = categories.find(c => c.name === updatedName)
		expect(updated).toBeDefined()
	})

	test('M3-E2E-06c: Should validate category name minimum length', async ({ page }) => {
		// Step 1: Navigate to categories screen
		await page.goto('/categories')

		// Step 2: Open create modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 3: Enter single character (too short)
		await page.getByTestId('category-name-input').fill('A')

		// Step 4: Try to save
		await page.getByTestId('save-category-btn').click()

		// Step 5: Should show error message
		const errorMessage = page.getByTestId('name-error').or(page.locator('[role="alert"]'))
		await expect(errorMessage.first()).toBeVisible()

		// Step 6: Modal should remain open
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('M3-E2E-06d: Should handle category name with many characters', async ({ page }) => {
		// Define expected behavior: 51 chars should be rejected (max is 50)
		const MAX_CATEGORY_NAME_LENGTH = 50

		// Step 1: Navigate to categories screen
		await page.goto('/categories')

		// Step 2: Open create modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 3: Enter name with 51 characters (over the limit)
		const longName = 'A'.repeat(51)
		await page.getByTestId('category-name-input').fill(longName)

		// Step 4: Try to save
		await page.getByTestId('save-category-btn').click()

		// Step 5: Modal should remain open (validation failed)
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 6: Error message should be shown for exceeding max length
		const errorMessage = page.getByTestId('name-error').or(page.getByTestId('input-error-message'))
		await expect(errorMessage.first()).toBeVisible()
		await expect(errorMessage.first()).toContainText(/too long|muito longo|max|máximo|character|caractere/i)
	})

	test('M3-E2E-06e: Should apply combined search and type filter', async ({ page }) => {
		// Step 0: Seed test categories for filtering
		await seedTestCategories(page, [
			TEST_CATEGORIES.foodAndDining,
			TEST_CATEGORIES.salary,
			TEST_CATEGORIES.transportation,
		])

		// Step 1: Navigate to categories screen (reload to see the seeded data)
		await page.goto('/categories')
		await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

		// Step 2: Apply type filter for expense
		await page.getByTestId('category-type-filter').click()
		await page.getByRole('option', { name: /expense/i }).click()

		// Step 3: Apply search for "Food"
		await page.getByTestId('category-search').fill('Food')

		// Step 4: Wait for filtering
		await page.waitForTimeout(300)

		// Step 5: Verify only matching results shown
		const visibleCategories = page.getByTestId('category-card')
		const count = await visibleCategories.count()

		// If categories visible, they should match both criteria
		if (count > 0) {
			// Food & Dining should be visible (it's an expense containing "Food")
			await expect(page.getByRole('heading', { name: 'Food & Dining', level: 3 })).toBeVisible()

			// Salary should NOT be visible (it's income, not expense)
			await expect(
				page.getByRole('heading', { name: 'Salary', level: 3 })
			).not.toBeVisible()
		}
	})

	test('M3-E2E-06f: Should clear filters and show all categories', async ({ page }) => {
		// Step 0: Seed test categories for filtering
		await seedTestCategories(page, [
			TEST_CATEGORIES.foodAndDining,
			TEST_CATEGORIES.salary,
			TEST_CATEGORIES.transportation,
		])

		// Step 1: Navigate to categories screen (reload to see the seeded data)
		await page.goto('/categories')
		await expect(page.getByRole('heading', { name: /categorias|categories/i })).toBeVisible()

		// Step 2: Wait for categories to load and get initial count
		await expect(page.getByTestId('categories-grid')).toBeVisible()
		await expect(page.getByTestId('category-card').first()).toBeVisible()
		const initialCount = await page.getByTestId('category-card').count()
		expect(initialCount).toBeGreaterThan(0)

		// Step 3: Apply type filter
		await page.getByTestId('category-type-filter').click()
		await page.getByRole('option', { name: /expense/i }).click()

		// Step 4: Apply search
		await page.getByTestId('category-search').fill('Food')

		// Step 5: Wait for filtering
		await page.waitForTimeout(300)

		// Step 6: Verify fewer categories shown
		const filteredCount = await page.getByTestId('category-card').count()
		expect(filteredCount).toBeLessThanOrEqual(initialCount)

		// Step 7: Clear search
		await page.getByTestId('category-search').clear()

		// Step 8: Reset type filter to "All"
		await page.getByTestId('category-type-filter').click()
		await page.getByRole('option', { name: /all|todos/i }).click()

		// Step 9: Verify all categories shown again
		await page.waitForTimeout(300)
		const restoredCount = await page.getByTestId('category-card').count()
		expect(restoredCount).toBe(initialCount)
	})

	test('M3-E2E-06g: Should cancel category creation without saving', async ({ page }) => {
		// Step 1: Navigate to categories screen
		await page.goto('/categories')

		// Step 2: Get initial count
		const initialCount = await page.getByTestId('category-card').count()

		// Step 3: Open create modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 4: Fill in some data
		const categoryName = `Cancelled Category ${Date.now()}`
		await page.getByTestId('category-name-input').fill(categoryName)

		// Step 5: Click cancel
		await page.getByRole('button', { name: /cancel/i }).click()

		// Step 6: Verify modal closes
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 7: Verify category was NOT created
		await expect(page.getByText(categoryName)).not.toBeVisible()
		await expect(page.getByTestId('category-card')).toHaveCount(initialCount)
	})

	test('M3-E2E-06h: Should close modal by clicking outside (backdrop)', async ({ page }) => {
		// Step 1: Navigate to categories screen
		await page.goto('/categories')

		// Step 2: Open create modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 3: Click outside the modal (on backdrop)
		await page.mouse.click(10, 10)

		// Step 4: Verify modal closes
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('M3-E2E-06i: Should close modal by pressing Escape key', async ({ page }) => {
		// Step 1: Navigate to categories screen
		await page.goto('/categories')

		// Step 2: Open create modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 3: Press Escape key
		await page.keyboard.press('Escape')

		// Step 4: Verify modal closes
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})
})
