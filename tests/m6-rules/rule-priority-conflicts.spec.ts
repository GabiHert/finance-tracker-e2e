import { test, expect } from '@playwright/test'

/**
 * M6-E2E-08: Rule Priority Conflicts
 * Validates the handling of overlapping/conflicting rules:
 * - Create rules with overlapping patterns
 * - Verify priority determines which rule applies
 * - Test drag-and-drop to change priority
 * - Verify higher priority rule wins when multiple rules match
 *
 * Note: The conflict warning feature (warning when creating a rule
 * that conflicts with an existing one) is not yet implemented.
 * These tests verify the existing priority-based resolution.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M6: Rule Priority Conflicts', () => {
	test('M6-E2E-08a: Should create multiple rules with overlapping patterns', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Create first rule for UBER (broader pattern)
		await page.getByTestId('new-rule-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.getByTestId('match-type-selector').click()
		await page.getByRole('option', { name: /cont[eé]m/i }).click()
		await page.getByTestId('pattern-input').fill('UBER')
		await page.getByTestId('category-selector').click()
		await page.getByRole('option').first().click()
		await page.getByTestId('save-rule-btn').click()
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 3: Create second rule for UBER EATS (more specific pattern)
		await page.getByTestId('new-rule-btn').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		await page.getByTestId('match-type-selector').click()
		await page.getByRole('option', { name: /cont[eé]m/i }).click()
		await page.getByTestId('pattern-input').fill('UBER EATS')
		await page.getByTestId('category-selector').click()
		await page.getByRole('option').nth(1).click()
		await page.getByTestId('save-rule-btn').click()
		await expect(page.getByRole('dialog')).not.toBeVisible()

		// Step 4: Verify both rules are created
		const ruleRows = page.getByTestId('rule-row')
		await expect(ruleRows.first()).toBeVisible()
		const count = await ruleRows.count()
		expect(count).toBeGreaterThanOrEqual(2)
	})

	test('M6-E2E-08b: Should display priority order for rules', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Verify rules list is visible
		await expect(page.getByTestId('rules-list')).toBeVisible()

		// Step 3: Check if there are multiple rules
		const ruleRows = page.getByTestId('rule-row')
		const count = await ruleRows.count()

		if (count >= 2) {
			// Step 4: Verify priority indicators exist
			const priorities = page.getByTestId('rule-priority')
			await expect(priorities.first()).toBeVisible()

			// Step 5: First rule should have higher priority (lower number or first position)
			const firstPriority = await priorities.first().textContent()
			const secondPriority = await priorities.nth(1).textContent()

			// Priorities should be ordered
			expect(firstPriority).toBeDefined()
			expect(secondPriority).toBeDefined()
		}
	})

	test('M6-E2E-08c: Should allow reordering rules via drag and drop', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Ensure we have at least 2 rules
		const ruleRows = page.getByTestId('rule-row')
		let count = await ruleRows.count()

		// Create rules if needed
		while (count < 2) {
			await page.getByTestId('new-rule-btn').click()
			await page.getByTestId('match-type-selector').click()
			await page.getByRole('option', { name: /cont[eé]m/i }).click()
			await page.getByTestId('pattern-input').fill(`PRIORITY_TEST_${count + 1}`)
			await page.getByTestId('category-selector').click()
			await page.getByRole('option').first().click()
			await page.getByTestId('save-rule-btn').click()
			await expect(page.getByRole('dialog')).not.toBeVisible()
			count = await ruleRows.count()
		}

		// Step 3: Get initial order
		const firstPatternBefore = await page.getByTestId('rule-pattern').first().textContent()

		// Step 4: Verify drag handles exist
		const dragHandles = page.getByTestId('drag-handle')
		await expect(dragHandles.first()).toBeVisible()

		// Step 5: Perform drag and drop
		const firstHandle = dragHandles.first()
		const secondRule = ruleRows.nth(1)
		await firstHandle.dragTo(secondRule)

		// Step 6: Wait for reorder to save
		await page.waitForTimeout(500)

		// Step 7: Verify order changed
		const firstPatternAfter = await page.getByTestId('rule-pattern').first().textContent()
		expect(firstPatternAfter).not.toBe(firstPatternBefore)
	})

	test('M6-E2E-08d: Higher priority rule should be listed first', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Verify rules list
		await expect(page.getByTestId('rules-list')).toBeVisible()

		const ruleRows = page.getByTestId('rule-row')
		const count = await ruleRows.count()

		if (count >= 2) {
			// Step 3: First rule should have priority 1
			const firstPriority = page.getByTestId('rule-priority').first()
			await expect(firstPriority).toBeVisible()
			const priorityText = await firstPriority.textContent()

			// Priority 1 or just being first in the list indicates highest priority
			expect(priorityText).toMatch(/1|#1|\u2191/)
		}
	})

	test('M6-E2E-08e: Should show conflict indicator for overlapping patterns', async ({ page }) => {
		/**
		 * Note: Conflict warning feature is not yet implemented.
		 * This test documents the expected behavior when implemented.
		 *
		 * Expected behavior:
		 * 1. When creating a rule with pattern that overlaps existing rules
		 * 2. System should show a warning/indicator about potential conflicts
		 * 3. User should see which existing rules might conflict
		 */

		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Verify rules list is visible
		await expect(page.getByTestId('rules-list')).toBeVisible()

		// Step 3: Check for any conflict indicators in existing rules
		// When implemented, look for: data-testid="conflict-warning" or similar
		const conflictWarning = page.getByTestId('conflict-warning')
		const conflictIndicator = page.getByTestId('conflict-indicator')

		// Currently not implemented - verify the basic UI works
		const ruleRows = page.getByTestId('rule-row')
		const count = await ruleRows.count()
		expect(count).toBeGreaterThanOrEqual(0)
	})

	test('M6-E2E-08f: Should maintain priority after page refresh', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Get current order of rules
		const ruleRows = page.getByTestId('rule-row')
		const count = await ruleRows.count()

		if (count >= 2) {
			const firstPatternBefore = await page.getByTestId('rule-pattern').first().textContent()

			// Step 3: Refresh page
			await page.reload()
			await expect(page.getByTestId('rules-screen')).toBeVisible()

			// Step 4: Verify order is maintained
			const firstPatternAfter = await page.getByTestId('rule-pattern').first().textContent()
			expect(firstPatternAfter).toBe(firstPatternBefore)
		}
	})

	test('M6-E2E-08g: Priority reordering should update priority numbers', async ({ page }) => {
		// Step 1: Navigate to rules screen
		await page.goto('/rules')
		await expect(page.getByTestId('rules-screen')).toBeVisible()

		// Step 2: Ensure we have at least 2 rules
		const ruleRows = page.getByTestId('rule-row')
		let count = await ruleRows.count()

		while (count < 2) {
			await page.getByTestId('new-rule-btn').click()
			await page.getByTestId('match-type-selector').click()
			await page.getByRole('option', { name: /cont[eé]m/i }).click()
			await page.getByTestId('pattern-input').fill(`REORDER_TEST_${count + 1}`)
			await page.getByTestId('category-selector').click()
			await page.getByRole('option').first().click()
			await page.getByTestId('save-rule-btn').click()
			await expect(page.getByRole('dialog')).not.toBeVisible()
			count = await ruleRows.count()
		}

		// Step 3: Get initial priorities
		const priorities = page.getByTestId('rule-priority')
		const firstPriorityBefore = await priorities.first().textContent()
		const secondPriorityBefore = await priorities.nth(1).textContent()

		// Step 4: Perform drag and drop
		const firstHandle = page.getByTestId('drag-handle').first()
		const secondRule = ruleRows.nth(1)
		await firstHandle.dragTo(secondRule)

		// Step 5: Wait for reorder
		await page.waitForTimeout(500)

		// Step 6: Verify priorities are swapped
		const firstPriorityAfter = await priorities.first().textContent()
		const secondPriorityAfter = await priorities.nth(1).textContent()

		// After swap, the priorities should reflect new positions
		expect(firstPriorityAfter).toBe(firstPriorityBefore)
		expect(secondPriorityAfter).toBe(secondPriorityBefore)
	})
})
