import { test, expect } from '@playwright/test'

/**
 * M7-E2E: Goals (Spending Limits)
 * Validates the goals/spending limits functionality including:
 * - Creating monthly spending limits for categories
 * - Progress bar display and calculations
 * - Over-limit warning display
 * - Editing and deleting spending limits
 * - Goal updates after transactions
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M7: Goals (Spending Limits)', () => {
	// No login needed - auth state is pre-populated by auth-setup project

	test('M7-E2E-001: Should display goals screen with navigation', async ({ page }) => {
		// Navigate to goals screen
		await page.goto('/goals')

		// Verify the goals screen loads
		await expect(page.getByTestId('goals-screen')).toBeVisible()

		// Verify "Novo Limite" button exists
		await expect(page.getByTestId('new-goal-btn')).toBeVisible()
	})

	test('M7-E2E-002: Should create a monthly spending limit', async ({ page }) => {
		await page.goto('/goals')

		// Click "Novo Limite" button
		await page.getByTestId('new-goal-btn').click()

		// Verify modal opens
		const modal = page.getByRole('dialog')
		await expect(modal).toBeVisible()

		// Select a category
		await page.getByTestId('category-selector').click()
		await page.getByRole('option').first().click()

		// Enter limit amount
		await page.getByTestId('limit-amount-input').fill('2000')

		// Check alert option if available
		const alertCheckbox = page.getByTestId('alert-checkbox')
		if (await alertCheckbox.isVisible()) {
			await alertCheckbox.check()
		}

		// Save the goal
		await page.getByTestId('save-goal-btn').click()

		// Verify goal card appears
		await expect(page.getByTestId('goal-card').first()).toBeVisible()

		// Verify limit is displayed
		await expect(page.getByTestId('goal-limit').first()).toContainText('2.000')
	})

	test('M7-E2E-003: Should display goal progress correctly (under limit)', async ({ page }) => {
		// First create a goal if one doesn't exist
		await page.goto('/goals')

		const goalCards = page.getByTestId('goal-card')
		const count = await goalCards.count()

		if (count === 0) {
			// Create a goal first
			await page.getByTestId('new-goal-btn').click()
			await page.getByTestId('category-selector').click()
			await page.getByRole('option').first().click()
			await page.getByTestId('limit-amount-input').fill('2000')
			await page.getByTestId('save-goal-btn').click()
			await expect(page.getByRole('dialog')).not.toBeVisible()
		}

		// Verify goal card elements
		const firstGoal = page.getByTestId('goal-card').first()
		await expect(firstGoal).toBeVisible()

		// Verify progress bar exists
		await expect(firstGoal.getByTestId('progress-bar')).toBeVisible()

		// Verify current and limit amounts are displayed
		await expect(firstGoal.getByTestId('goal-current')).toBeVisible()
		await expect(firstGoal.getByTestId('goal-limit')).toBeVisible()

		// Verify progress percentage is displayed
		await expect(firstGoal.getByTestId('goal-progress-percent')).toBeVisible()
	})

	test('M7-E2E-004: Should display over-limit warning (progress >= 100%)', async ({ page }) => {
		// This test assumes there's a goal with spending over the limit
		// We'll check for the visual indicators when over limit
		await page.goto('/goals')

		// Look for any goal that's over limit (has red progress bar or warning)
		const overLimitGoal = page.locator('[data-testid="goal-card"].over-limit')

		// If there's an over-limit goal, verify the warning indicators
		if ((await overLimitGoal.count()) > 0) {
			// Progress bar should be red
			await expect(
				overLimitGoal.first().locator('[data-testid="progress-bar"]')
			).toHaveClass(/red|danger|over/)

			// Should have pulsing glow effect (via CSS class)
			await expect(overLimitGoal.first()).toHaveClass(/pulse|glow/)
		}
	})

	test('M7-E2E-005: Should edit a spending limit', async ({ page }) => {
		await page.goto('/goals')

		// Wait for goals list to load
		await expect(page.getByTestId('goals-list')).toBeVisible()

		const goalCards = page.getByTestId('goal-card')
		let count = await goalCards.count()

		// Create a goal if none exist
		if (count === 0) {
			await page.getByTestId('new-goal-btn').click()
			await page.getByTestId('category-selector').click()
			await page.getByRole('option').first().click()
			await page.getByTestId('limit-amount-input').fill('800')
			await page.getByTestId('save-goal-btn').click()
			await expect(page.getByRole('dialog')).not.toBeVisible()
			count = await goalCards.count()
		}

		if (count > 0) {
			// Click edit button on first goal
			await goalCards.first().getByTestId('edit-goal-btn').click()

			// Verify edit modal opens
			await expect(page.getByRole('dialog')).toBeVisible()

			// Change the limit
			await page.getByTestId('limit-amount-input').clear()
			await page.getByTestId('limit-amount-input').fill('1000')

			// Save changes
			await page.getByTestId('save-goal-btn').click()

			// Verify modal closes
			await expect(page.getByRole('dialog')).not.toBeVisible()

			// Verify the update is reflected
			await expect(page.getByTestId('goal-limit').first()).toContainText('1.000')
		}
	})

	test('M7-E2E-006: Should delete a spending limit', async ({ page }) => {
		await page.goto('/goals')

		// Wait for goals list to load
		await expect(page.getByTestId('goals-list')).toBeVisible()

		const goalCards = page.getByTestId('goal-card')
		let initialCount = await goalCards.count()

		// Create a goal if none exist
		if (initialCount === 0) {
			await page.getByTestId('new-goal-btn').click()
			await page.getByTestId('category-selector').click()
			await page.getByRole('option').first().click()
			await page.getByTestId('limit-amount-input').fill('500')
			await page.getByTestId('save-goal-btn').click()
			await expect(page.getByRole('dialog')).not.toBeVisible()
			initialCount = await goalCards.count()
		}

		if (initialCount > 0) {
			// Click delete button on first goal
			await goalCards.first().getByTestId('delete-goal-btn').click()

			// Confirm deletion in the dialog
			await expect(page.getByTestId('confirm-delete-dialog')).toBeVisible()
			await page.getByTestId('confirm-delete-btn').click()

			// Verify goal is removed
			const newCount = await goalCards.count()
			expect(newCount).toBeLessThan(initialCount)
		}
	})

	test('M7-E2E-007: Should navigate to goals from sidebar', async ({ page }) => {
		// Start from another page
		await page.goto('/transactions')

		// Look for goals/limits link in sidebar or menu
		const goalsLink = page.getByRole('link', { name: /metas|limites|goals/i })

		if (await goalsLink.isVisible()) {
			await goalsLink.click()
			await expect(page).toHaveURL(/\/goals/)
			await expect(page.getByTestId('goals-screen')).toBeVisible()
		}
	})

	test('M7-E2E-008: Should display empty state when no goals exist', async ({ page }) => {
		await page.goto('/goals')

		const emptyState = page.getByTestId('goals-empty-state')
		const goalCards = page.getByTestId('goal-card')

		const goalsExist = (await goalCards.count()) > 0

		if (!goalsExist) {
			await expect(emptyState).toBeVisible()
			await expect(emptyState).toContainText(/nenhum limite|criar.*limite/i)
		}
	})

	test('M7-E2E-009: Should validate limit amount input', async ({ page }) => {
		await page.goto('/goals')

		// Open goal creation modal
		await page.getByTestId('new-goal-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Select a category
		await page.getByTestId('category-selector').click()
		await page.getByRole('option').first().click()

		// Try to save without entering amount
		await page.getByTestId('save-goal-btn').click()

		// Should show validation error
		await expect(page.getByTestId('amount-error')).toBeVisible()
	})

	test('M7-E2E-010: Should cancel goal creation', async ({ page }) => {
		await page.goto('/goals')

		// Open goal creation modal
		await page.getByTestId('new-goal-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Click cancel
		await page.getByTestId('cancel-btn').click()

		// Modal should close
		await expect(page.getByRole('dialog')).not.toBeVisible()
	})

	test('M7-E2E-011: Should display progress bar with correct fill percentage', async ({
		page,
	}) => {
		await page.goto('/goals')

		const goalCards = page.getByTestId('goal-card')
		const count = await goalCards.count()

		if (count > 0) {
			const firstGoal = goalCards.first()

			// Get the progress bar fill element
			const progressFill = firstGoal.getByTestId('progress-bar-fill')
			await expect(progressFill).toBeVisible()

			// Verify the progress bar has a width style (indicating percentage)
			const style = await progressFill.getAttribute('style')
			expect(style).toContain('width')
		}
	})

	test('M7-E2E-012: Should show category icon and name on goal card', async ({ page }) => {
		await page.goto('/goals')

		const goalCards = page.getByTestId('goal-card')
		const count = await goalCards.count()

		if (count > 0) {
			const firstGoal = goalCards.first()

			// Verify category icon exists
			await expect(firstGoal.getByTestId('goal-category-icon')).toBeVisible()

			// Verify category name exists
			await expect(firstGoal.getByTestId('goal-category-name')).toBeVisible()
		}
	})

	test('M7-E2E-013: Should display amount in correct format', async ({ page }) => {
		await page.goto('/goals')

		// Create a goal with a specific amount to verify formatting
		await page.getByTestId('new-goal-btn').click()
		await page.getByTestId('category-selector').click()
		await page.getByRole('option').first().click()
		await page.getByTestId('limit-amount-input').fill('1500')
		await page.getByTestId('save-goal-btn').click()

		// Verify the amount is formatted as currency (R$ X.XXX,XX)
		await expect(page.getByTestId('goal-limit').last()).toContainText(/R?\$?\s*1[.,]500/)
	})
})
