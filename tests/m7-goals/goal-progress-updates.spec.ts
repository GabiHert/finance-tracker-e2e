import { test, expect } from '@playwright/test'

/**
 * M7-E2E-06: Goal Progress Updates
 * Validates goal progress display and visual indicators:
 * - Progress percentage calculation
 * - Visual indicators for different progress levels
 * - Over-limit warning with red color and animation
 * - Green color for under-limit goals
 *
 * Note: Since the frontend uses mock data, we test the visual state
 * based on pre-configured current/limit amounts in the mock data:
 * - Alimentacao: R$1,500/R$2,000 = 75% (under limit, green)
 * - Transporte: R$450/R$800 = 56% (under limit, green)
 * - Entretenimento: R$650/R$500 = 130% (over limit, red)
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M7: Goal Progress Updates', () => {
	test('M7-E2E-06a: Should display goal with correct progress percentage', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')
		await expect(page.getByTestId('goals-screen')).toBeVisible()

		// Step 2: Find the first goal card (Alimentacao: 75%)
		const firstGoal = page.getByTestId('goal-card').first()
		await expect(firstGoal).toBeVisible()

		// Step 3: Verify progress percentage is displayed
		const progressPercent = firstGoal.getByTestId('goal-progress-percent')
		await expect(progressPercent).toBeVisible()
		await expect(progressPercent).toContainText('75%')

		// Step 4: Verify current amount is R$1,500
		const currentAmount = firstGoal.getByTestId('goal-current')
		await expect(currentAmount).toContainText(/1[.,]500/)

		// Step 5: Verify limit amount is R$2,000
		const limitAmount = firstGoal.getByTestId('goal-limit')
		await expect(limitAmount).toContainText(/2[.,]000/)
	})

	test('M7-E2E-06b: Should display under-limit goal with green progress indicator', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Find the Transporte goal (56% - under limit)
		const transporteGoal = page.getByTestId('goal-card').nth(1)
		await expect(transporteGoal).toBeVisible()

		// Step 3: Verify it's under the limit
		const progressPercent = transporteGoal.getByTestId('goal-progress-percent')
		await expect(progressPercent).toBeVisible()
		await expect(progressPercent).toContainText('56%')

		// Step 4: Verify the progress is displayed in green (not red)
		await expect(progressPercent).toHaveClass(/text-green/)

		// Step 5: Verify the card does NOT have over-limit styling
		await expect(transporteGoal).not.toHaveClass(/over-limit/)
	})

	test('M7-E2E-06c: Should display over-limit goal with red warning indicators', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Find the Entretenimento goal (130% - over limit)
		const overLimitGoal = page.getByTestId('goal-card').nth(2)
		await expect(overLimitGoal).toBeVisible()

		// Step 3: Verify it exceeds the limit
		const progressPercent = overLimitGoal.getByTestId('goal-progress-percent')
		await expect(progressPercent).toBeVisible()
		await expect(progressPercent).toContainText('130%')

		// Step 4: Verify the progress is displayed in red
		await expect(progressPercent).toHaveClass(/text-red/)

		// Step 5: Verify the card has over-limit styling (pulse animation, ring)
		await expect(overLimitGoal).toHaveClass(/over-limit/)

		// Step 6: Verify "Limite excedido!" warning is visible
		await expect(overLimitGoal).toContainText(/Limite excedido/i)
	})

	test('M7-E2E-06d: Should display progress bar with correct fill width', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Get the first goal's progress bar fill
		const firstGoal = page.getByTestId('goal-card').first()
		const progressFill = firstGoal.getByTestId('progress-bar-fill')
		await expect(progressFill).toBeVisible()

		// Step 3: Verify the progress bar has width style (should be 75%)
		const style = await progressFill.getAttribute('style')
		expect(style).toMatch(/width:\s*(75%|75\.?\d*%)/)
	})

	test('M7-E2E-06e: Over-limit progress bar should be capped visually at 100%', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Get the over-limit goal's progress bar (Entretenimento 130%)
		const overLimitGoal = page.getByTestId('goal-card').nth(2)
		const progressFill = overLimitGoal.getByTestId('progress-bar-fill')
		await expect(progressFill).toBeVisible()

		// Step 3: Even though spending is 130%, progress bar fill should max at 100%
		const style = await progressFill.getAttribute('style')
		expect(style).toMatch(/width:\s*(100%|100\.?\d*%)/)
	})

	test('M7-E2E-06f: Should verify multiple goals with different progress levels', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Verify all 3 goals are displayed
		const goalCards = page.getByTestId('goal-card')
		await expect(goalCards).toHaveCount(3)

		// Step 3: Verify first goal (Alimentacao - 75%)
		const alimentacao = goalCards.nth(0)
		await expect(alimentacao.getByTestId('goal-category-name')).toHaveText('Alimentacao')
		await expect(alimentacao.getByTestId('goal-progress-percent')).toContainText('75%')

		// Step 4: Verify second goal (Transporte - 56%)
		const transporte = goalCards.nth(1)
		await expect(transporte.getByTestId('goal-category-name')).toHaveText('Transporte')
		await expect(transporte.getByTestId('goal-progress-percent')).toContainText('56%')

		// Step 5: Verify third goal (Entretenimento - 130%)
		const entretenimento = goalCards.nth(2)
		await expect(entretenimento.getByTestId('goal-category-name')).toHaveText('Entretenimento')
		await expect(entretenimento.getByTestId('goal-progress-percent')).toContainText('130%')
	})

	test('M7-E2E-06g: Should update goal progress when editing limit amount', async ({ page }) => {
		// Step 1: Navigate to goals screen
		await page.goto('/goals')

		// Step 2: Get the first goal's current progress (75%)
		const firstGoal = page.getByTestId('goal-card').first()
		await expect(firstGoal.getByTestId('goal-progress-percent')).toContainText('75%')

		// Step 3: Click edit on the first goal
		await firstGoal.getByTestId('edit-goal-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Step 4: Change the limit from R$2,000 to R$1,500 (making it 100%)
		await page.getByTestId('limit-amount-input').clear()
		await page.getByTestId('limit-amount-input').fill('1500')

		// Step 5: Save changes
		await page.getByTestId('save-goal-btn').click()
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 6: Verify progress is now 100% (1500/1500)
		await expect(firstGoal.getByTestId('goal-progress-percent')).toContainText('100%')

		// Step 7: Verify it's now at the limit threshold
		await expect(firstGoal).toHaveClass(/over-limit/)
	})
})
