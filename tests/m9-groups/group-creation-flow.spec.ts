import { test, expect } from '@playwright/test'
import { deleteAllGroups } from '../fixtures/test-utils'

/**
 * M9-E2E: Group Creation and Navigation Flow
 *
 * Validates the complete group creation flow including:
 * - Creating a new group via modal
 * - Navigating to the newly created group
 * - Verifying group detail page displays correctly (not "Grupo nao encontrado")
 *
 * This test exposes a bug where GroupsScreen stores groups in local state
 * but GroupDetailScreen looks up groups from hardcoded mockGroups only.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M9: Group Creation and Navigation Flow', () => {
	// Run tests serially to avoid race conditions with group counts
	test.describe.configure({ mode: 'serial' })

	// Clean up all groups before each test to ensure isolation
	test.beforeEach(async ({ page }) => {
		try {
			await page.goto('/dashboard')
			await page.waitForLoadState('domcontentloaded')
			await deleteAllGroups(page)
			console.log('Cleaned up groups before test')
		} catch (e) {
			console.log('Could not clean up groups:', e)
		}
	})
	test('E2E-M9-CREATE-01: Should create group and view its details', async ({ page }) => {
		// Step 1: Navigate to groups screen
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Click "Novo Grupo" button
		await page.getByTestId('new-group-btn').click()

		// Step 3: Verify create group modal opens
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		// Step 4: Enter unique group name
		const uniqueGroupName = `Test Group E2E ${Date.now()}`
		await modal.getByTestId('group-name-input').fill(uniqueGroupName)

		// Step 5: Enter description (optional)
		const descriptionInput = modal.getByTestId('group-description-input')
		if (await descriptionInput.isVisible().then(() => true, () => false)) {
			await descriptionInput.fill('Test group created by E2E test')
		}

		// Step 6: Click save button
		await modal.getByTestId('save-group-btn').click()

		// Step 7: Verify modal closes
		await expect(modal).not.toBeVisible()

		// Step 8: Verify new group appears in the list
		const newGroupCard = page.getByTestId('group-card').filter({ hasText: uniqueGroupName })
		await expect(newGroupCard).toBeVisible()

		// Step 9: Click on the newly created group to navigate to details
		await newGroupCard.click()

		// Step 10: Verify we're on the group detail page
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()

		// Step 11: CRITICAL - Verify the group name is displayed (NOT "Grupo nao encontrado")
		// This is the main assertion that should fail before the fix
		await expect(page.getByText(uniqueGroupName)).toBeVisible()

		// Step 12: Verify "Grupo nao encontrado" is NOT displayed
		await expect(page.getByText(/grupo n[aã]o encontrado/i)).not.toBeVisible()

		// Step 13: Verify group header shows correct name
		const groupHeader = page.getByTestId('group-header')
		await expect(groupHeader).toBeVisible()
		await expect(groupHeader.getByText(uniqueGroupName)).toBeVisible()

		// Step 14: Verify tabs are available
		const tabs = page.getByTestId('group-tabs')
		await expect(tabs).toBeVisible()
		await expect(tabs.getByText(/dashboard/i)).toBeVisible()
	})

	test('E2E-M9-CREATE-02: Should navigate to group via back button and return', async ({ page }) => {
		// Step 1: Navigate to groups screen and create a group
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Create a new group
		await page.getByTestId('new-group-btn').click()
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		const uniqueGroupName = `Back Nav Test ${Date.now()}`
		await modal.getByTestId('group-name-input').fill(uniqueGroupName)
		await modal.getByTestId('save-group-btn').click()
		await expect(modal).not.toBeVisible()

		// Step 3: Click on the new group
		const newGroupCard = page.getByTestId('group-card').filter({ hasText: uniqueGroupName })
		await expect(newGroupCard).toBeVisible()
		await newGroupCard.click()

		// Step 4: Verify detail page loads
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await expect(page.getByText(uniqueGroupName)).toBeVisible()

		// Step 5: Use back button (client-side navigation)
		await page.getByText('Voltar').click()

		// Step 6: Verify we're back on groups list
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 7: Verify the group is still in the list
		await expect(page.getByTestId('group-card').filter({ hasText: uniqueGroupName })).toBeVisible()

		// Step 8: Click on the group again
		await page.getByTestId('group-card').filter({ hasText: uniqueGroupName }).click()

		// Step 9: Verify detail page loads correctly again
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await expect(page.getByText(uniqueGroupName)).toBeVisible()
		await expect(page.getByText(/grupo n[aã]o encontrado/i)).not.toBeVisible()
	})

	test('E2E-M9-CREATE-03: Should allow creating multiple groups in sequence', async ({ page }) => {
		// Step 1: Navigate to groups screen
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Get initial count
		const initialCount = await page.getByTestId('group-card').count()

		// Step 2: Create first group
		await page.getByTestId('new-group-btn').click()
		const modal = page.getByTestId('group-modal')
		await expect(modal).toBeVisible()

		const firstGroupName = `First Group ${Date.now()}`
		await modal.getByTestId('group-name-input').fill(firstGroupName)
		await modal.getByTestId('save-group-btn').click()
		await expect(modal).not.toBeVisible()

		// Step 3: Verify first group appears
		await expect(page.getByTestId('group-card').filter({ hasText: firstGroupName })).toBeVisible()
		await expect(page.getByTestId('group-card')).toHaveCount(initialCount + 1)

		// Step 4: Create second group
		await page.getByTestId('new-group-btn').click()
		await expect(modal).toBeVisible()

		const secondGroupName = `Second Group ${Date.now()}`
		await modal.getByTestId('group-name-input').fill(secondGroupName)
		await modal.getByTestId('save-group-btn').click()
		await expect(modal).not.toBeVisible()

		// Step 5: Verify both groups appear
		await expect(page.getByTestId('group-card').filter({ hasText: firstGroupName })).toBeVisible()
		await expect(page.getByTestId('group-card').filter({ hasText: secondGroupName })).toBeVisible()
		await expect(page.getByTestId('group-card')).toHaveCount(initialCount + 2)

		// Step 6: Navigate to second group
		await page.getByTestId('group-card').filter({ hasText: secondGroupName }).click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await expect(page.getByText(secondGroupName)).toBeVisible()
		await expect(page.getByText(/grupo n[aã]o encontrado/i)).not.toBeVisible()

		// Step 7: Go back and navigate to first group
		await page.getByText('Voltar').click()
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		await page.getByTestId('group-card').filter({ hasText: firstGroupName }).click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await expect(page.getByText(firstGroupName)).toBeVisible()
		await expect(page.getByText(/grupo n[aã]o encontrado/i)).not.toBeVisible()
	})
})
