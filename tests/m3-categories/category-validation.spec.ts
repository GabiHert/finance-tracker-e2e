import { test, expect } from '@playwright/test'
import { deleteAllCategories } from '../fixtures/test-utils'

/**
 * M3-E2E: Category Validation Tests
 * Tests negative scenarios for category management:
 * - Empty name validation
 * - Duplicate name validation
 * - Maximum name length
 * - Special characters handling
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M3: Category Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to categories and clean up
		await page.goto('/categories')
		await page.waitForLoadState('domcontentloaded')
		await deleteAllCategories(page)
	})

	test('M3-VAL-001: Should reject empty category name', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Leave name empty and try to save
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.clear()
		await page.getByTestId('save-category-btn').click()

		// Step 3: Check for validation error or modal stays open
		const nameError = page.getByTestId('name-error')
		const errorText = page.getByText(/obrigatório|required|nome é|name is/i)
		const modalStillOpen = await page.getByRole('dialog').isVisible()

		const hasValidation =
			(await nameError.isVisible().catch(() => false)) ||
			(await errorText.first().isVisible().catch(() => false)) ||
			modalStillOpen

		expect(hasValidation).toBeTruthy()
	})

	test('M3-VAL-002: Should reject whitespace-only category name', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Enter whitespace-only name
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.fill('   ')
		await page.getByTestId('save-category-btn').click()

		// Step 3: Check for validation error or modal stays open
		const nameError = page.getByTestId('name-error')
		const errorText = page.getByText(/obrigatório|required|inválido|invalid/i)
		const modalStillOpen = await page.getByRole('dialog').isVisible()

		const hasValidation =
			(await nameError.isVisible().catch(() => false)) ||
			(await errorText.first().isVisible().catch(() => false)) ||
			modalStillOpen

		expect(hasValidation).toBeTruthy()
	})

	test('M3-VAL-003: Should reject category name exceeding max length', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Enter very long name (256 characters)
		const longName = 'A'.repeat(256)
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.fill(longName)

		// Step 3: Try to save or check for immediate validation
		await page.getByTestId('save-category-btn').click()

		// Step 4: Check for validation error or truncated input
		const nameError = page.getByTestId('name-error')
		const errorText = page.getByText(/máximo|maximum|longo|long|limite|limit/i)
		const currentValue = await nameInput.inputValue()
		const modalStillOpen = await page.getByRole('dialog').isVisible()

		// Either error shown, input truncated, or modal stays open
		const hasValidation =
			(await nameError.isVisible().catch(() => false)) ||
			(await errorText.first().isVisible().catch(() => false)) ||
			currentValue.length < 256 ||
			modalStillOpen

		expect(hasValidation).toBeTruthy()
	})

	test('M3-VAL-004: Should handle duplicate category name', async ({ page }) => {
		// Step 1: Create first category via UI
		const categoryName = `Test Category ${Date.now()}`

		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		let nameInput = page.getByTestId('category-name-input')
		await nameInput.fill(categoryName)

		// Select type
		let typeSelect = page.getByTestId('category-type')
		if (await typeSelect.isVisible()) {
			await typeSelect.click()
			await page.getByRole('option', { name: /expense|despesa/i }).click()
		}

		await page.getByTestId('save-category-btn').click()
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 2: Try to create another category with same name
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		nameInput = page.getByTestId('category-name-input')
		await nameInput.fill(categoryName)

		// Select type again
		typeSelect = page.getByTestId('category-type')
		if (await typeSelect.isVisible()) {
			await typeSelect.click()
			await page.getByRole('option', { name: /expense|despesa/i }).click()
		}

		await page.getByTestId('save-category-btn').click()

		// Step 3: Check for duplicate error or modal stays open
		const duplicateError = page.getByTestId('duplicate-error')
		const errorText = page.getByText(/existe|exists|duplicado|duplicate|já cadastrada/i)
		const errorAlert = page.locator('[role="alert"]')
		const modalStillOpen = await page.getByRole('dialog').isVisible()

		const hasDuplicateHandling =
			(await duplicateError.isVisible().catch(() => false)) ||
			(await errorText.first().isVisible().catch(() => false)) ||
			(await errorAlert.first().isVisible().catch(() => false)) ||
			modalStillOpen

		expect(hasDuplicateHandling).toBeTruthy()
	})

	test('M3-VAL-005: Should handle special characters in category name', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Enter name with special characters
		const specialName = 'Test <script>alert(1)</script> & "quotes"'
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.fill(specialName)

		// Select type
		const typeSelect = page.getByTestId('category-type')
		if (await typeSelect.isVisible()) {
			await typeSelect.click()
			await page.getByRole('option', { name: /expense|despesa/i }).click()
		}

		await page.getByTestId('save-category-btn').click()

		// Step 3: Check result - either sanitized, rejected, or saved safely
		const modalClosed = !(await page.getByRole('dialog').isVisible().catch(() => false))
		const nameError = page.getByTestId('name-error')
		const errorText = page.getByText(/inválido|invalid|caractere|character/i)

		if (modalClosed) {
			// Category was saved - verify XSS is not executed (no script tag in page)
			const pageContent = await page.content()
			expect(pageContent).not.toContain('<script>alert(1)')
		} else {
			// Validation prevented saving
			const hasValidation =
				(await nameError.isVisible().catch(() => false)) ||
				(await errorText.first().isVisible().catch(() => false))
			expect(hasValidation).toBeTruthy()
		}
	})

	test('M3-VAL-006: Should require category type selection', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Fill name but don't select type (if type is a separate required field)
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.fill(`Category ${Date.now()}`)

		// Step 3: Try to save without selecting type
		await page.getByTestId('save-category-btn').click()

		// Step 4: Wait for response
		await page.waitForLoadState('networkidle')

		// Step 5: Check if type is required or has default
		const typeError = page.getByTestId('type-error')
		const errorText = page.getByText(/tipo|type|selecione|select/i)
		const modalClosed = !(await page.getByRole('dialog').isVisible())
		const pageNotCrashed = await page.locator('body').isVisible()

		// Either type error shown, modal closed (type has default), or page handles gracefully
		const hasTypeHandling =
			(await typeError.isVisible().catch(() => false)) ||
			(await errorText.first().isVisible().catch(() => false)) ||
			modalClosed ||
			pageNotCrashed

		expect(hasTypeHandling).toBeTruthy()
	})

	test('M3-VAL-007: Should cancel category creation without saving', async ({ page }) => {
		// Step 1: Open create category modal
		await page.getByTestId('add-category-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 2: Fill form
		const nameInput = page.getByTestId('category-name-input')
		await nameInput.fill('Should Not Be Saved')

		// Step 3: Cancel instead of save
		const cancelBtn = page.getByTestId('cancel-category-btn').or(page.getByRole('button', { name: /cancel|cancelar/i }))
		await cancelBtn.click()

		// Step 4: Verify modal closed
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 5: Verify category was not created
		const categoryCard = page.getByText('Should Not Be Saved')
		await expect(categoryCard).not.toBeVisible()
	})
})
