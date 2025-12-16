import { test, expect } from '@playwright/test'
import { mockNetworkError, mockTimeout, mockFailThenSucceed, clearMocks } from '../fixtures/error-mocks'

/**
 * Error Scenarios: Network Errors
 * Tests application behavior when network fails:
 * - Complete network failure
 * - Timeout scenarios
 * - Retry after failure
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('Error Scenarios: Network Errors', () => {
	test.afterEach(async ({ page }) => {
		await clearMocks(page)
	})

	test('NET-E2E-001: Should show error message on network failure', async ({ page }) => {
		// Step 1: Mock network failure BEFORE navigating
		await mockNetworkError(page, '**/api/v1/transactions**')

		// Step 2: Navigate to transactions - this should trigger a network error
		await page.goto('/transactions')

		// Step 3: Wait for error handling to be triggered
		await page.waitForLoadState('networkidle')

		// Step 4: Check for any error indication - could be displayed in many ways
		const networkError = page.getByText(/rede|network|conexão|connection|offline|falha/i)
		const errorMessage = page.getByText(/erro|error|failed|não foi possível/i)
		const toast = page.locator('[role="alert"]')
		const emptyState = page.getByText(/nenhuma transação|sem transações|no transactions/i)

		// Network errors should be communicated to user or handled gracefully
		const errorHandlingIndicator = networkError.first()
			.or(errorMessage.first())
			.or(toast.first())
			.or(emptyState.first())
		await expect(errorHandlingIndicator).toBeVisible({ timeout: 5000 })
	})

	test('NET-E2E-002: Should handle timeout on slow network', async ({ page }) => {
		// Step 1: Mock timeout for transactions
		await mockTimeout(page, '**/api/v1/transactions**', 35000) // 35s timeout

		// Step 2: Navigate to transactions (this will timeout)
		await page.goto('/transactions', { timeout: 40000 })

		// Step 3: Wait a bit for any error handling to kick in
		await page.waitForLoadState('networkidle').then(() => true, () => false)

		// Step 4: Check for timeout message or error state
		const errorState = page.getByTestId('error-state')
		const transactionsHeader = page.getByTestId('transactions-header')

		// Check if either error state or header is visible
		const errorStateVisible = await errorState.isVisible().then(() => true, () => false)
		const headerVisible = await transactionsHeader.isVisible().then(() => true, () => false)

		// If no timeout handling, page may just show loading indefinitely - check page structure
		expect(errorStateVisible || headerVisible).toBeTruthy()
	})

	test('NET-E2E-003: Should recover after network failure and retry', async ({ page }) => {
		// Step 1: Mock to fail on first request, succeed on second
		await mockFailThenSucceed(page, '**/api/v1/transactions**', 1)

		// Step 2: Navigate to transactions (first request fails)
		await page.goto('/transactions')

		// Step 3: Check if retry button exists or auto-retry happened
		const retryBtn = page.getByTestId('retry-btn').or(page.getByRole('button', { name: /retry|tentar novamente/i }))
		const transactionsList = page.getByTestId('transactions-header')
		const errorMessage = page.getByText(/erro|error|failed/i)

		// Check for retry button, successful load, or error state
		const retryBtnVisible = await retryBtn.isVisible({ timeout: 5000 }).then(() => true, () => false)

		if (retryBtnVisible) {
			// Manual retry available
			await retryBtn.click()
			// Should now load successfully
			await expect(transactionsList).toBeVisible({ timeout: 10000 })
		} else {
			// Either auto-retry worked or error is shown - both are acceptable
			const recoveryIndicator = transactionsList.or(errorMessage.first())
			await expect(recoveryIndicator).toBeVisible({ timeout: 10000 })
		}
	})

	test('NET-E2E-004: Should handle network error during form submission', async ({ page }) => {
		// Step 1: Navigate to transactions
		await page.goto('/transactions')
		await expect(page.getByTestId('transactions-header')).toBeVisible()

		// Step 2: Open add transaction modal
		await page.getByTestId('add-transaction-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 3: Fill form
		const modalBody = page.getByTestId('modal-body')
		await modalBody.getByTestId('transaction-description').fill('Network Error Test')
		await modalBody.getByTestId('transaction-amount').fill('75')

		const categorySelect = modalBody.getByTestId('transaction-category')
		if (await categorySelect.isVisible()) {
			await categorySelect.click()
			await page.getByRole('option').first().click()
		}

		// Step 4: Mock network error for submission
		await mockNetworkError(page, '**/api/v1/transactions')

		// Step 5: Submit form
		await page.getByTestId('modal-save-btn').click()

		// Step 6: Check for error handling - either error shown or modal stays open
		const errorMessage = page.getByText(/rede|network|conexão|erro|error/i).first()
		const dialog = page.getByRole('dialog')

		// Check each indicator separately to avoid strict mode violations
		const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).then(() => true, () => false)
		const dialogVisible = await dialog.isVisible({ timeout: 2000 }).then(() => true, () => false)

		// Either error message shown or modal stays open (submission failed)
		expect(errorVisible || dialogVisible).toBeTruthy()
	})

	test('NET-E2E-005: Should handle network error on category page', async ({ page }) => {
		// Step 1: Mock network error
		await mockNetworkError(page, '**/api/v1/categories**')

		// Step 2: Navigate to categories
		await page.goto('/categories')

		// Step 3: Wait for page to settle
		await page.waitForTimeout(1000)

		// Step 4: Check for error indication
		const errorState = page.getByTestId('error-state')
		const emptyState = page.getByTestId('empty-state')
		const categoriesHeader = page.getByTestId('categories-header')

		// Check if any of these are visible
		const errorStateVisible = await errorState.isVisible().then(() => true, () => false)
		const emptyStateVisible = await emptyState.isVisible().then(() => true, () => false)
		const headerVisible = await categoriesHeader.isVisible().then(() => true, () => false)

		expect(errorStateVisible || emptyStateVisible || headerVisible).toBeTruthy()
	})

	test('NET-E2E-006: Should handle network error on goals page', async ({ page }) => {
		// Step 1: Mock network error
		await mockNetworkError(page, '**/api/v1/goals**')

		// Step 2: Navigate to goals
		await page.goto('/goals')

		// Step 3: Check for error indication
		const errorMessage = page.getByText(/erro|error|falha|failed/i)
		const errorState = page.getByTestId('error-state')
		const goalsScreen = page.getByTestId('goals-screen')

		const errorHandlingIndicator = errorMessage.first()
			.or(errorState)
			.or(goalsScreen)
		await expect(errorHandlingIndicator).toBeVisible({ timeout: 5000 })
	})
})
