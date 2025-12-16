import { test, expect } from '@playwright/test'

/**
 * M9-E2E: Group Modal Focus Bug
 *
 * Bug: When typing in the description textarea, the focus unexpectedly
 * jumps to the group name input field, causing text to be typed in the
 * wrong field.
 *
 * This test validates that:
 * - Focus remains on the description field while typing
 * - Text typed in description field stays in description field
 * - Group name field is not modified when typing in description
 */
test.describe('M9: Group Modal - Focus Behavior', () => {
	test('Should maintain focus on description field while typing', async ({ page }) => {
		// Step 1: Navigate to groups screen
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Click "Novo Grupo" button to open modal
		await page.getByTestId('new-group-btn').click()

		// Step 3: Verify modal is open
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		// Step 4: Get references to both input fields
		const nameInput = modal.getByTestId('group-name-input')
		const descriptionInput = modal.getByTestId('group-description-input')

		// Step 5: Type a group name first
		const groupName = 'Test Group Focus'
		await nameInput.fill(groupName)

		// Verify name field has the correct value
		await expect(nameInput).toHaveValue(groupName)

		// Step 6: Click on description field to focus it
		await descriptionInput.click()

		// Step 7: Verify description field is focused
		await expect(descriptionInput).toBeFocused()

		// Step 8: Type in the description field character by character
		// This simulates real user typing and will expose the focus bug
		const descriptionText = 'This is a test description'
		for (const char of descriptionText) {
			await page.keyboard.type(char)
			// Small delay to simulate real typing
			await page.waitForTimeout(50)
		}

		// Step 9: CRITICAL ASSERTIONS - These should pass but will FAIL due to the bug

		// Assert that description field contains the typed text
		await expect(descriptionInput).toHaveValue(descriptionText)

		// Assert that name field still has ONLY the original group name
		// (should not have any of the description text appended)
		await expect(nameInput).toHaveValue(groupName)

		// Assert description field is still focused after typing
		await expect(descriptionInput).toBeFocused()
	})

	test('Should not transfer focus from description to name field on input', async ({ page }) => {
		// Step 1: Navigate to groups screen
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Open the group modal
		await page.getByTestId('new-group-btn').click()
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		// Step 3: Get input references
		const nameInput = modal.getByTestId('group-name-input')
		const descriptionInput = modal.getByTestId('group-description-input')

		// Step 4: Fill group name
		await nameInput.fill('My Group')
		await expect(nameInput).toHaveValue('My Group')

		// Step 5: Focus on description and type using keyboard
		await descriptionInput.focus()
		await expect(descriptionInput).toBeFocused()

		// Step 6: Type a single character and immediately check focus
		await page.keyboard.type('A')

		// Focus should still be on description field after typing
		await expect(descriptionInput).toBeFocused()

		// Step 7: Type more characters
		await page.keyboard.type('BC')
		await expect(descriptionInput).toBeFocused()

		// Step 8: Verify the text ended up in the correct field
		await expect(descriptionInput).toHaveValue('ABC')
		await expect(nameInput).toHaveValue('My Group')
	})

	test('Should allow completing full description without focus issues', async ({ page }) => {
		// Step 1: Navigate to groups screen
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Open modal
		await page.getByTestId('new-group-btn').click()
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		const nameInput = modal.getByTestId('group-name-input')
		const descriptionInput = modal.getByTestId('group-description-input')

		// Step 3: Fill name field
		const expectedName = 'Family Expenses'
		await nameInput.fill(expectedName)

		// Step 4: Tab to description field (natural navigation)
		await page.keyboard.press('Tab')

		// Step 5: Type complete description
		const expectedDescription = 'Shared expenses for our family household'
		await page.keyboard.type(expectedDescription)

		// Step 6: Verify both fields have correct values
		await expect(nameInput).toHaveValue(expectedName)
		await expect(descriptionInput).toHaveValue(expectedDescription)

		// Step 7: The name should not contain any description text
		const nameValue = await nameInput.inputValue()
		expect(nameValue).toBe(expectedName)
		expect(nameValue).not.toContain(expectedDescription.substring(0, 5))
	})
})
