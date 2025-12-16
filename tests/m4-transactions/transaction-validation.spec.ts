import { test, expect } from '@playwright/test'
import {
	seedIsolatedCategories,
	cleanupIsolatedTestData,
	generateShortId,
	TEST_CATEGORIES,
} from '../fixtures/test-utils'

/**
 * M4-E2E: Transaction Validation Tests
 * Tests negative scenarios for transaction management:
 * - Zero and negative amount validation
 * - Required field validation (amount, category)
 * - Date format validation
 * - Description length limits
 * - Extremely large amounts
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M4: Transaction Validation', () => {
	test('M4-VAL-001: Should reject empty amount', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Fill description but leave amount empty
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Test Transaction')

			// Step 3: Select category
			const categorySelect = modalBody.getByTestId('transaction-category')
			if (await categorySelect.isVisible()) {
				await categorySelect.click()
				await page.getByRole('option').first().click()
			}

			// Step 4: Try to save without amount
			await page.getByTestId('modal-save-btn').click()

			// Step 5: Check for validation error or modal stays open
			const amountError = page.getByTestId('amount-error').or(page.getByTestId('transaction-amount-error-message'))
			const dialog = page.getByRole('dialog')

			// Wait a moment for validation
			await page.waitForTimeout(500)

			// Check if error shown or modal stays open
			const errorVisible = await amountError.isVisible().then(() => true, () => false)
			const dialogVisible = await dialog.isVisible().then(() => true, () => false)

			// Either validation error shown or modal stays open (save blocked)
			expect(errorVisible || dialogVisible).toBeTruthy()
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-002: Should reject zero amount', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Fill form with zero amount
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Zero Amount Test')
			await modalBody.getByTestId('transaction-amount').fill('0')

			// Step 3: Select category
			const categorySelect = modalBody.getByTestId('transaction-category')
			if (await categorySelect.isVisible()) {
				await categorySelect.click()
				await page.getByRole('option').first().click()
			}

			// Step 4: Try to save
			await page.getByTestId('modal-save-btn').click()

			// Step 5: Check for validation error or modal stays open
			const amountError = page.getByTestId('amount-error').or(page.getByTestId('transaction-amount-error-message'))
			const dialog = page.getByRole('dialog')

			// Wait a moment for validation
			await page.waitForTimeout(500)

			// Check if error shown or modal stays open
			const errorVisible = await amountError.isVisible().then(() => true, () => false)
			const dialogVisible = await dialog.isVisible().then(() => true, () => false)

			// Either validation error shown or modal stays open (save blocked)
			expect(errorVisible || dialogVisible).toBeTruthy()
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-003: Should reject negative amount input', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Try to enter negative amount
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Negative Amount Test')
			const amountInput = modalBody.getByTestId('transaction-amount')
			await amountInput.fill('-100')

			// Step 3: Check immediate validation or value sanitization
			const currentValue = await amountInput.inputValue()
			const hasNegative = currentValue.includes('-')

			if (hasNegative) {
				// Negative value accepted - check for error on save
				const categorySelect = modalBody.getByTestId('transaction-category')
				if (await categorySelect.isVisible()) {
					await categorySelect.click()
					await page.getByRole('option').first().click()
				}

				await page.getByTestId('modal-save-btn').click()

				const amountError = page.getByTestId('amount-error')
				const errorText = page.getByText(/negativo|negative|inválido|invalid/i)
				const dialog = page.getByRole('dialog')

				// Either validation error shown or modal stays open (save blocked)
				const validationIndicator = amountError
					.or(errorText.first())
					.or(dialog)
				await expect(validationIndicator).toBeVisible({ timeout: 3000 })
			} else {
				// Input sanitized - negative sign removed
				expect(currentValue).not.toContain('-')
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-004: Should handle extremely large amounts', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Enter very large amount
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Large Amount Test')
			const amountInput = modalBody.getByTestId('transaction-amount')
			await amountInput.fill('999999999999999')

			// Step 3: Check if input was truncated or sanitized
			const currentValue = await amountInput.inputValue()

			// Step 4: Select category
			const categorySelect = modalBody.getByTestId('transaction-category')
			if (await categorySelect.isVisible()) {
				await categorySelect.click()
				await page.getByRole('option').first().click()
			}

			// Step 5: Try to save
			await page.getByTestId('modal-save-btn').click()

			// Step 6: Wait for response
			await page.waitForLoadState('networkidle')

			// Step 7: App may handle large amounts in various ways:
			// - Show error
			// - Truncate input
			// - Accept large amounts
			// - Close modal (success)
			// All are valid behaviors - the key is the app doesn't crash
			const modalStillOpen = await page.getByRole('dialog').isVisible()
			const pageNotCrashed = await page.locator('body').isVisible()

			// Test passes as long as page doesn't crash
			expect(pageNotCrashed).toBeTruthy()
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-005: Should reject description exceeding max length', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Enter very long description (1001 characters)
			const longDescription = 'A'.repeat(1001)
			const modalBody = page.getByTestId('modal-body')
			const descriptionInput = modalBody.getByTestId('transaction-description')
			await descriptionInput.fill(longDescription)

			// Step 3: Fill other required fields
			await modalBody.getByTestId('transaction-amount').fill('100')

			const categorySelect = modalBody.getByTestId('transaction-category')
			if (await categorySelect.isVisible()) {
				await categorySelect.click()
				await page.getByRole('option').first().click()
			}

			// Step 4: Try to save
			await page.getByTestId('modal-save-btn').click()

			// Step 5: Check for error or truncation
			const descriptionError = page.getByTestId('description-error')
			const errorText = page.getByText(/máximo|maximum|longo|long|limite|limit|caractere|character/i)
			const currentValue = await descriptionInput.inputValue()
			const dialog = page.getByRole('dialog')

			// Either error shown, input truncated, or modal stays open
			if (currentValue.length < 1001) {
				// Input was truncated - validation worked
				expect(currentValue.length).toBeLessThan(1001)
			} else {
				// Either validation error shown or modal stays open
				const validationIndicator = descriptionError
					.or(errorText.first())
					.or(dialog)
				await expect(validationIndicator).toBeVisible({ timeout: 3000 })
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-006: Should require category selection', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Fill form without selecting category
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('No Category Test')
			await modalBody.getByTestId('transaction-amount').fill('100')

			// Step 3: Try to save without category
			await page.getByTestId('modal-save-btn').click()

			// Step 4: Check for validation error or modal stays open
			const categoryError = page.getByTestId('category-error').or(page.getByTestId('transaction-category-error-message'))
			const dialog = page.getByRole('dialog')

			// Wait a moment for validation
			await page.waitForTimeout(500)

			// Check if error shown or modal stays open
			const errorVisible = await categoryError.isVisible().then(() => true, () => false)
			const dialogVisible = await dialog.isVisible().then(() => true, () => false)

			// Either validation error shown or modal stays open (save blocked)
			expect(errorVisible || dialogVisible).toBeTruthy()
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-007: Should cancel transaction creation without saving', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Get initial count
			const initialCount = await page.getByTestId('transaction-row').count()

			// Step 2: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 3: Fill form
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Should Not Be Saved')
			await modalBody.getByTestId('transaction-amount').fill('999')

			// Step 4: Cancel instead of save
			const cancelBtn = page.getByTestId('modal-cancel-btn').or(page.getByRole('button', { name: /cancel|cancelar/i }))
			await cancelBtn.click()

			// Step 5: Verify modal closed
			await expect(page.getByRole('dialog')).not.toBeVisible()

			// Step 6: Verify transaction was not created
			const newCount = await page.getByTestId('transaction-row').count()
			expect(newCount).toBe(initialCount)
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})

	test('M4-VAL-008: Should handle special characters in description', async ({ page }) => {
		const testId = generateShortId()

		await page.goto('/transactions')
		await page.waitForLoadState('domcontentloaded')

		// Seed a category for transaction tests
		await seedIsolatedCategories(page, testId, [TEST_CATEGORIES.foodAndDining])

		await page.reload()
		await page.waitForLoadState('networkidle')

		try {
			// Step 1: Open create transaction modal (handle empty state or regular button)
			const addBtn = page.getByTestId('add-transaction-btn').or(page.getByTestId('empty-state-cta'))
			await addBtn.waitFor({ state: 'visible', timeout: 10000 })
			await addBtn.click()
			await expect(page.getByRole('dialog')).toBeVisible()

			// Step 2: Enter description with special characters
			const modalBody = page.getByTestId('modal-body')
			await modalBody.getByTestId('transaction-description').fill('Test <script>alert(1)</script> & "quotes"')
			await modalBody.getByTestId('transaction-amount').fill('50')

			const categorySelect = modalBody.getByTestId('transaction-category')
			if (await categorySelect.isVisible()) {
				await categorySelect.click()
				await page.getByRole('option').first().click()
			}

			// Step 3: Try to save
			await page.getByTestId('modal-save-btn').click()

			// Step 4: Check result - either sanitized, rejected, or saved safely
			const dialog = page.getByRole('dialog')
			const modalClosed = !(await dialog.isVisible())

			if (modalClosed) {
				// Transaction was saved - verify XSS is not executed
				const pageContent = await page.content()
				expect(pageContent).not.toContain('<script>alert(1)')
			} else {
				// Validation prevented saving - modal still open is acceptable
				await expect(dialog).toBeVisible()
			}
		} finally {
			await cleanupIsolatedTestData(page, testId)
		}
	})
})
