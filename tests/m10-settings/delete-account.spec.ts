import { test, expect } from '@playwright/test'
import { API_URL } from '../fixtures/test-utils'

/**
 * M10-E2E-09: Delete Account
 * Validates the complete account deletion flow including:
 * - Creating a dedicated test user for deletion
 * - Confirming deletion with password and "DELETE" text
 * - Redirect to login after deletion
 * - Unable to login after account is deleted
 *
 * Note: This test creates and deletes its own test user to avoid
 * affecting other tests. Does NOT use saved auth state.
 */
test.describe('M10: Delete Account', () => {
	// Test user credentials - unique for this test
	const DELETE_TEST_USER = {
		email: `delete-test-${Date.now()}@example.com`,
		password: 'DeleteTestPass123',
		name: 'Delete Test User',
	}

	test.beforeAll(async ({ browser }) => {
		// Create a dedicated test user for deletion tests
		const page = await browser.newPage()
		try {
			const response = await page.request.post(`${API_URL}/auth/register`, {
				data: {
					email: DELETE_TEST_USER.email,
					password: DELETE_TEST_USER.password,
					name: DELETE_TEST_USER.name,
					terms_accepted: true,
				},
			})

			if (response.status() !== 201 && response.status() !== 409) {
				throw new Error(`Failed to create test user: ${response.status()}`)
			}
		} catch (error) {
			console.log('Test user creation:', error)
		}
		await page.close()
	})

	test('M10-E2E-009: Should permanently delete account and prevent future login', async ({ page }) => {
		// Step 1: Login with the test user
		await page.goto('/login')
		await expect(page.getByLabel('E-mail')).toBeVisible()

		await page.getByLabel('E-mail').fill(DELETE_TEST_USER.email)
		await page.getByTestId('input-password').fill(DELETE_TEST_USER.password)
		await page.getByRole('button', { name: 'Entrar' }).click()

		// Wait for dashboard or authenticated route
		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Step 2: Navigate to settings screen
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 3: Click delete account button
		await page.getByTestId('delete-account-btn').click()

		// Verify delete modal opens
		const deleteModal = page.getByTestId('delete-account-modal')
		await expect(deleteModal).toBeVisible()

		// Verify warning text is present
		await expect(deleteModal.getByTestId('delete-warning')).toBeVisible()
		await expect(deleteModal.getByTestId('delete-warning')).toContainText(/irreversivel|irreversible/i)

		// Step 4: Verify delete button is disabled initially
		const confirmDeleteBtn = deleteModal.getByTestId('confirm-delete-btn')
		await expect(confirmDeleteBtn).toBeDisabled()

		// Step 5: Fill password and confirmation
		await deleteModal.getByTestId('delete-password-input').fill(DELETE_TEST_USER.password)
		await deleteModal.getByTestId('delete-confirmation-input').fill('DELETE')

		// Verify delete button is now enabled
		await expect(confirmDeleteBtn).toBeEnabled()

		// Step 6: Click confirm delete
		await confirmDeleteBtn.click()

		// Step 7: Verify redirect to login screen
		await expect(page).toHaveURL(/.*login/, { timeout: 10000 })

		// Optional: Check for success message
		// await expect(page.getByText(/conta.*excluida|account.*deleted/i)).toBeVisible()

		// Step 8: Verify tokens are cleared
		const localStorage = await page.evaluate(() => {
			return Object.keys(window.localStorage).filter(
				(k) => k.includes('token') || k.includes('auth')
			)
		})
		expect(localStorage.length).toBe(0)

		// Step 9: Try to login with deleted account credentials
		await page.getByLabel('E-mail').fill(DELETE_TEST_USER.email)
		await page.getByTestId('input-password').fill(DELETE_TEST_USER.password)
		await page.getByRole('button', { name: 'Entrar' }).click()

		// Should show error - account doesn't exist
		await expect(page.getByText(/incorretos|invalid|not found|erro/i)).toBeVisible({ timeout: 10000 })

		// Should NOT navigate to dashboard
		await expect(page).toHaveURL(/.*login/)
	})

	test('M10-E2E-009b: Delete button should remain disabled without correct confirmation', async ({ page }) => {
		// This test uses the main test user, but only tests the UI flow without deleting
		// Login first
		await page.goto('/login')
		await expect(page.getByLabel('E-mail')).toBeVisible()

		// Use a regular test user for this test (not the delete test user)
		await page.getByLabel('E-mail').fill('e2e-test@example.com')
		await page.getByTestId('input-password').fill('E2eTestPassword1234')
		await page.getByRole('button', { name: 'Entrar' }).click()

		await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })

		// Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Open delete modal
		await page.getByTestId('delete-account-btn').click()
		const deleteModal = page.getByTestId('delete-account-modal')
		await expect(deleteModal).toBeVisible()

		const confirmDeleteBtn = deleteModal.getByTestId('confirm-delete-btn')

		// Test: Only password, no confirmation text
		await deleteModal.getByTestId('delete-password-input').fill('TestPass123!')
		await expect(confirmDeleteBtn).toBeDisabled()

		// Test: Password + wrong confirmation text (lowercase)
		await deleteModal.getByTestId('delete-confirmation-input').fill('delete')
		await expect(confirmDeleteBtn).toBeDisabled()

		// Test: Password + correct confirmation text
		await deleteModal.getByTestId('delete-confirmation-input').clear()
		await deleteModal.getByTestId('delete-confirmation-input').fill('DELETE')
		await expect(confirmDeleteBtn).toBeEnabled()

		// Cancel without deleting
		await deleteModal.getByTestId('cancel-delete-btn').click()
		await expect(deleteModal).not.toBeVisible()
	})
})
