import { test, expect } from '@playwright/test'

/**
 * M10-E2E: Settings & User Profile
 * Validates the settings and user profile functionality including:
 * - Profile viewing and editing
 * - Preferences management
 * - Password change
 * - Account deletion
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M10: Settings & User Profile', () => {
	// No login needed - auth state is pre-populated by auth-setup project

	test('M10-E2E-001: Should display user profile information', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Verify profile section is visible
		await expect(page.getByTestId('profile-section')).toBeVisible()

		// Verify user name is displayed
		await expect(page.getByTestId('user-name')).toBeVisible()

		// Verify user email is displayed
		await expect(page.getByTestId('user-email')).toBeVisible()

		// Verify preferences section is visible
		await expect(page.getByTestId('preferences-section')).toBeVisible()
	})

	test('M10-E2E-002: Should update user profile name', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Click edit profile button
		await page.getByTestId('edit-profile-btn').click()

		// Verify edit modal opens
		const editModal = page.getByTestId('edit-profile-modal')
		await expect(editModal).toBeVisible()

		// Get current name for verification
		const nameInput = editModal.getByTestId('profile-name-input')
		await nameInput.clear()

		// Enter new name with unique identifier
		const newName = `Usuario Teste ${Date.now()}`
		await nameInput.fill(newName)

		// Click save
		await editModal.getByTestId('save-profile-btn').click()

		// Verify modal closes
		await expect(editModal).not.toBeVisible()

		// Verify name is updated on the screen
		await expect(page.getByTestId('user-name')).toContainText(newName)
	})

	test('M10-E2E-003: Should update date format preference', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Verify preferences section is visible
		await expect(page.getByTestId('preferences-section')).toBeVisible()

		// Click on date format selector
		await page.getByTestId('date-format-select').click()

		// Select a different format
		await page.getByRole('option', { name: /YYYY-MM-DD/i }).click()

		// Verify the selection is updated
		await expect(page.getByTestId('date-format-select')).toContainText('YYYY-MM-DD')
	})

	test('M10-E2E-004: Should update number format preference', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Click on number format selector
		await page.getByTestId('number-format-select').click()

		// Select US format (1,234.56)
		await page.getByRole('option', { name: /1,234\.56/i }).click()

		// Verify the selection is updated
		await expect(page.getByTestId('number-format-select')).toContainText('1,234.56')
	})

	test('M10-E2E-005: Should toggle notification preferences', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Verify notifications section is visible
		await expect(page.getByTestId('notifications-section')).toBeVisible()

		// Get the email notifications toggle
		const emailToggle = page.getByTestId('email-notifications-toggle')
		await expect(emailToggle).toBeVisible()

		// Get initial state
		const initialState = await emailToggle.getAttribute('aria-checked')

		// Click to toggle
		await emailToggle.click()

		// Verify the state changed
		const newState = await emailToggle.getAttribute('aria-checked')
		expect(newState).not.toBe(initialState)
	})

	test('M10-E2E-006: Should change password successfully', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Click change password button
		await page.getByTestId('change-password-btn').click()

		// Verify password modal opens
		const passwordModal = page.getByTestId('change-password-modal')
		await expect(passwordModal).toBeVisible()

		// Fill in current password
		await passwordModal.getByTestId('current-password-input').fill('TestPass123!')

		// Fill in new password
		await passwordModal.getByTestId('new-password-input').fill('NewSecurePass456!')

		// Confirm new password
		await passwordModal.getByTestId('confirm-password-input').fill('NewSecurePass456!')

		// Click save
		await passwordModal.getByTestId('save-password-btn').click()

		// Verify modal closes (success case - in mock mode)
		await expect(passwordModal).not.toBeVisible()
	})

	test('M10-E2E-007: Should show error for wrong current password', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Click change password button
		await page.getByTestId('change-password-btn').click()

		// Verify password modal opens
		const passwordModal = page.getByTestId('change-password-modal')
		await expect(passwordModal).toBeVisible()

		// Fill in wrong current password
		await passwordModal.getByTestId('current-password-input').fill('WrongPassword123')

		// Fill in new password
		await passwordModal.getByTestId('new-password-input').fill('NewSecurePass456!')

		// Confirm new password
		await passwordModal.getByTestId('confirm-password-input').fill('NewSecurePass456!')

		// Click save
		await passwordModal.getByTestId('save-password-btn').click()

		// Verify error message is displayed
		await expect(passwordModal.getByTestId('password-error')).toBeVisible()
		await expect(passwordModal.getByTestId('password-error')).toContainText(/incorreta|incorreto|invalid|wrong/i)
	})

	test('M10-E2E-008: Should show delete account confirmation flow', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Verify data section is visible
		await expect(page.getByTestId('data-section')).toBeVisible()

		// Click delete account button
		await page.getByTestId('delete-account-btn').click()

		// Verify delete modal opens
		const deleteModal = page.getByTestId('delete-account-modal')
		await expect(deleteModal).toBeVisible()

		// Verify warning text is present
		await expect(deleteModal.getByTestId('delete-warning')).toBeVisible()

		// Verify password input is required
		await expect(deleteModal.getByTestId('delete-password-input')).toBeVisible()

		// Verify confirmation input is required
		await expect(deleteModal.getByTestId('delete-confirmation-input')).toBeVisible()

		// Verify delete button is disabled initially
		const deleteButton = deleteModal.getByTestId('confirm-delete-btn')
		await expect(deleteButton).toBeDisabled()

		// Fill password
		await deleteModal.getByTestId('delete-password-input').fill('TestPass123!')

		// Type DELETE to confirm
		await deleteModal.getByTestId('delete-confirmation-input').fill('DELETE')

		// Verify delete button is now enabled
		await expect(deleteButton).toBeEnabled()

		// Close modal without actually deleting (for test safety)
		await deleteModal.getByTestId('cancel-delete-btn').click()
		await expect(deleteModal).not.toBeVisible()
	})

	test('M10-E2E-009: Should display all settings sections', async ({ page }) => {
		// Navigate to settings screen
		await page.goto('/settings')

		// Verify settings screen loads
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Verify all main sections are present
		await expect(page.getByTestId('profile-section')).toBeVisible()
		await expect(page.getByTestId('preferences-section')).toBeVisible()
		await expect(page.getByTestId('notifications-section')).toBeVisible()
		await expect(page.getByTestId('data-section')).toBeVisible()

		// Verify section headers
		await expect(page.getByText(/perfil|profile/i).first()).toBeVisible()
		await expect(page.getByText(/prefer[eê]ncias|preferences/i).first()).toBeVisible()
		await expect(page.getByText(/notifica[cç][oõ]es|notifications/i).first()).toBeVisible()
		await expect(page.getByText(/dados|data|privacidade|privacy/i).first()).toBeVisible()
	})
})
