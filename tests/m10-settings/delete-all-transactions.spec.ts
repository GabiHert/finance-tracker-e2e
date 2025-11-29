import { test, expect } from '@playwright/test'

/**
 * M10-E2E-08: Delete All Transactions
 * Validates the delete all transactions flow in the Danger Zone:
 * - Navigate to settings "Zona de Perigo" section
 * - Click "Excluir todas as transacoes"
 * - Confirmation modal with password and exact text "DELETE_ALL_TRANSACTIONS"
 * - Verify success and empty transactions screen
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M10: Delete All Transactions', () => {
	test('M10-E2E-08a: Should show delete all transactions button in Danger Zone', async ({ page }) => {
		// Step 1: Navigate to settings screen
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Verify Danger Zone section is visible
		const dangerZone = page.getByTestId('danger-zone')
		await expect(dangerZone).toBeVisible()
		await expect(dangerZone).toContainText(/Zona de perigo/i)

		// Step 3: Verify "Delete all transactions" button is visible
		const deleteTransactionsBtn = page.getByTestId('delete-all-transactions-btn')
		await expect(deleteTransactionsBtn).toBeVisible()
		await expect(deleteTransactionsBtn).toContainText(/Excluir todas as transacoes/i)
	})

	test('M10-E2E-08b: Should open confirmation modal when clicking delete all transactions', async ({ page }) => {
		// Step 1: Navigate to settings screen
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Click delete all transactions button
		await page.getByTestId('delete-all-transactions-btn').click()

		// Step 3: Verify confirmation modal opens
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		// Step 4: Verify warning message is displayed
		await expect(modal.getByTestId('delete-transactions-warning')).toBeVisible()
		await expect(modal.getByTestId('delete-transactions-warning')).toContainText(/irreversivel/i)

		// Step 5: Verify password input is present
		await expect(modal.getByTestId('delete-transactions-password-input')).toBeVisible()

		// Step 6: Verify confirmation input is present
		await expect(modal.getByTestId('delete-transactions-confirmation-input')).toBeVisible()
	})

	test('M10-E2E-08c: Confirm button should be disabled until valid input', async ({ page }) => {
		// Step 1: Navigate to settings and open modal
		await page.goto('/settings')
		await page.getByTestId('delete-all-transactions-btn').click()
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		const confirmBtn = modal.getByTestId('confirm-delete-transactions-btn')

		// Step 2: Initially button should be disabled
		await expect(confirmBtn).toBeDisabled()

		// Step 3: Enter only password - button still disabled
		await modal.getByTestId('delete-transactions-password-input').fill('TestPass123!')
		await expect(confirmBtn).toBeDisabled()

		// Step 4: Enter wrong confirmation text (lowercase) - button still disabled
		await modal.getByTestId('delete-transactions-confirmation-input').fill('delete_all_transactions')
		await expect(confirmBtn).toBeDisabled()

		// Step 5: Enter partial confirmation text - button still disabled
		await modal.getByTestId('delete-transactions-confirmation-input').clear()
		await modal.getByTestId('delete-transactions-confirmation-input').fill('DELETE_ALL')
		await expect(confirmBtn).toBeDisabled()

		// Step 6: Enter correct confirmation text - button enabled
		await modal.getByTestId('delete-transactions-confirmation-input').clear()
		await modal.getByTestId('delete-transactions-confirmation-input').fill('DELETE_ALL_TRANSACTIONS')
		await expect(confirmBtn).toBeEnabled()
	})

	test('M10-E2E-08d: Should cancel deletion and close modal', async ({ page }) => {
		// Step 1: Navigate to settings and open modal
		await page.goto('/settings')
		await page.getByTestId('delete-all-transactions-btn').click()
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		// Step 2: Click cancel button
		await modal.getByTestId('cancel-delete-transactions-btn').click()

		// Step 3: Verify modal closes
		await expect(modal).not.toBeVisible()

		// Step 4: Verify still on settings page
		await expect(page.getByTestId('settings-screen')).toBeVisible()
	})

	test('M10-E2E-08e: Should delete all transactions and navigate to empty transactions screen', async ({ page }) => {
		// Step 1: Navigate to settings screen
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Click delete all transactions button
		await page.getByTestId('delete-all-transactions-btn').click()
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		// Step 3: Fill in password
		await modal.getByTestId('delete-transactions-password-input').fill('TestPassword123')

		// Step 4: Fill in exact confirmation text
		await modal.getByTestId('delete-transactions-confirmation-input').fill('DELETE_ALL_TRANSACTIONS')

		// Step 5: Verify confirm button is now enabled
		const confirmBtn = modal.getByTestId('confirm-delete-transactions-btn')
		await expect(confirmBtn).toBeEnabled()

		// Step 6: Click confirm
		await confirmBtn.click()

		// Step 7: Verify modal closes
		await expect(modal).not.toBeVisible()

		// Step 8: Verify navigation to transactions page with empty state
		await expect(page).toHaveURL(/.*transactions.*empty=true/)

		// Step 9: Verify empty state is displayed
		await expect(page.getByTestId('empty-state')).toBeVisible()
		await expect(page.getByTestId('empty-state-title')).toContainText(/No transactions/i)
	})

	test('M10-E2E-08f: Should show warning about irreversible action', async ({ page }) => {
		// Step 1: Navigate to settings and open modal
		await page.goto('/settings')
		await page.getByTestId('delete-all-transactions-btn').click()
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		// Step 2: Verify warning message content
		const warning = modal.getByTestId('delete-transactions-warning')
		await expect(warning).toBeVisible()
		await expect(warning).toContainText(/irreversivel/i)
		await expect(warning).toContainText(/historico financeiro/i)
	})

	test('M10-E2E-08g: Modal should reset on close and reopen', async ({ page }) => {
		// Step 1: Navigate to settings and open modal
		await page.goto('/settings')
		await page.getByTestId('delete-all-transactions-btn').click()
		const modal = page.getByTestId('delete-all-transactions-modal')
		await expect(modal).toBeVisible()

		// Step 2: Fill in some data
		await modal.getByTestId('delete-transactions-password-input').fill('SomePassword')
		await modal.getByTestId('delete-transactions-confirmation-input').fill('DELETE')

		// Step 3: Cancel
		await modal.getByTestId('cancel-delete-transactions-btn').click()
		await expect(modal).not.toBeVisible()

		// Step 4: Reopen modal
		await page.getByTestId('delete-all-transactions-btn').click()
		await expect(modal).toBeVisible()

		// Step 5: Verify fields are empty
		const passwordInput = modal.getByTestId('delete-transactions-password-input')
		const confirmInput = modal.getByTestId('delete-transactions-confirmation-input')
		await expect(passwordInput).toHaveValue('')
		await expect(confirmInput).toHaveValue('')

		// Step 6: Confirm button should be disabled again
		await expect(modal.getByTestId('confirm-delete-transactions-btn')).toBeDisabled()
	})
})
