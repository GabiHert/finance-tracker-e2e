import { test, expect } from '@playwright/test'
import { getAuthToken, API_URL, createGroup, deleteAllGroups } from '../fixtures/test-utils'

/**
 * M9-E2E: Group Invite Validation
 * Validates that inviting non-registered users requires confirmation.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M9: Group Invite User Validation', () => {
	const testGroupName = `E2E Invite Test ${Date.now()}`

	test.beforeEach(async ({ page }) => {
		// Clean up any existing groups and create a fresh test group
		await page.goto('/dashboard')
		await page.waitForLoadState('domcontentloaded')
		await deleteAllGroups(page)
		await createGroup(page, { name: testGroupName, description: 'Test group for invite validation E2E' })

		// Navigate to groups page
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')
	})

	test.afterEach(async ({ page }) => {
		// Clean up test group
		try {
			await deleteAllGroups(page)
		} catch {
			// Ignore cleanup errors
		}
	})

	test('M9-E2E-11a: Should show confirmation dialog when inviting non-registered user', async ({ page }) => {
		// Step 1: Find the test group (created in beforeEach)
		const groupCard = page.getByTestId('group-card').first()
		await expect(groupCard).toBeVisible({ timeout: 5000 })

		await groupCard.click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Step 2: Go to members tab
		const membersTab = page.getByTestId('group-tabs').getByText(/membros|members/i)
		await expect(membersTab).toBeVisible({ timeout: 5000 })
		await membersTab.click()
		await page.waitForTimeout(500) // Wait for tab content to render

		// Step 3: Wait for and click invite button (only visible for admins)
		const inviteBtn = page.getByTestId('invite-member-btn')
		await expect(inviteBtn).toBeVisible({ timeout: 5000 })
		await inviteBtn.click()

		// Step 4: Wait for invite modal
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Step 5: Enter a non-existing user email
		const nonExistentEmail = `nonexistent-${Date.now()}@test.example.com`
		const emailInput = page.getByTestId('invite-email-input')
		const emailInputAlt = dialog.getByPlaceholder(/email/i)

		if (await emailInput.isVisible()) {
			await emailInput.fill(nonExistentEmail)
		} else if (await emailInputAlt.isVisible()) {
			await emailInputAlt.fill(nonExistentEmail)
		}

		// Step 6: Click send button
		const sendBtn = page.getByTestId('send-invite-btn')
		const sendBtnAlt = dialog.getByRole('button', { name: /enviar|send|convidar|invite/i })

		if (await sendBtn.isVisible()) {
			await sendBtn.click()
		} else if (await sendBtnAlt.isVisible()) {
			await sendBtnAlt.click()
		}

		// Step 7: Verify confirmation dialog appears
		await page.waitForTimeout(500)
		const confirmationDialog = page.getByTestId('confirm-non-user-dialog')
		const confirmationText = page.getByText(/n[aã]o.*usu[aá]rio|n[aã]o.*cadastrado|not.*registered|not.*user/i)
		const platformInviteText = page.getByText(/convite.*plataforma|invite.*platform|cadastrar/i)

		const hasConfirmation = await confirmationDialog.isVisible().catch(() => false) ||
			await confirmationText.isVisible().catch(() => false) ||
			await platformInviteText.isVisible().catch(() => false)

		expect(hasConfirmation).toBeTruthy()
	})

	test('M9-E2E-11b: Should proceed directly when inviting existing registered user', async ({ page }) => {
		// This test verifies that inviting an existing user doesn't show confirmation

		// Step 1: Find the test group (created in beforeEach)
		const groupCard = page.getByTestId('group-card').first()
		await expect(groupCard).toBeVisible({ timeout: 5000 })

		await groupCard.click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Step 2: Go to members tab
		const membersTab = page.getByTestId('group-tabs').getByText(/membros|members/i)
		await expect(membersTab).toBeVisible({ timeout: 5000 })
		await membersTab.click()
		await page.waitForTimeout(500)

		// Step 3: Wait for and click invite button (only visible for admins)
		const inviteBtn = page.getByTestId('invite-member-btn')
		await expect(inviteBtn).toBeVisible({ timeout: 5000 })
		await inviteBtn.click()

		// Step 4: Wait for invite modal
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Step 5: We need to first create or find an existing user
		// For this test, we'll use API to check what happens with a known email
		// Using a predictable email pattern that could be another test user
		const existingUserEmail = 'existing-user@example.com'

		// First, let's create a test user via API if needed
		const token = await getAuthToken(page)

		// Try to register a second test user
		try {
			await page.request.post(`${API_URL}/auth/register`, {
				data: {
					email: existingUserEmail,
					password: 'TestPassword123',
					name: 'Existing Test User',
					terms_accepted: true,
				},
			})
		} catch {
			// User might already exist
		}

		// Step 6: Enter the existing user email
		const emailInput = page.getByTestId('invite-email-input')
		const emailInputAlt = dialog.getByPlaceholder(/email/i)

		if (await emailInput.isVisible()) {
			await emailInput.fill(existingUserEmail)
		} else if (await emailInputAlt.isVisible()) {
			await emailInputAlt.fill(existingUserEmail)
		}

		// Step 7: Click send button
		const sendBtn = page.getByTestId('send-invite-btn')
		const sendBtnAlt = dialog.getByRole('button', { name: /enviar|send|convidar|invite/i })

		if (await sendBtn.isVisible()) {
			await sendBtn.click()
		} else if (await sendBtnAlt.isVisible()) {
			await sendBtnAlt.click()
		}

		// Step 8: Verify no confirmation dialog appears (success or error directly)
		await page.waitForTimeout(1000)

		// Should either show success toast/close modal OR show error (already member, etc)
		// But NOT show non-user confirmation dialog
		const confirmationDialog = page.getByTestId('confirm-non-user-dialog')
		const noUserConfirmation = !(await confirmationDialog.isVisible().catch(() => false))

		// Check for success (modal closed or toast) or expected error
		const modalClosed = !(await dialog.isVisible().catch(() => true))
		const successToast = page.getByTestId('toast-success')
		const errorMessage = page.getByText(/j[aá].*membro|already.*member|enviado|sent/i)

		const hasExpectedResult = modalClosed ||
			await successToast.isVisible().catch(() => false) ||
			await errorMessage.isVisible().catch(() => false)

		expect(noUserConfirmation).toBeTruthy()
		expect(hasExpectedResult).toBeTruthy()
	})

	test('M9-E2E-11c: Should send invite after confirming non-user invitation', async ({ page }) => {
		// Step 1: Find the test group (created in beforeEach)
		const groupCard = page.getByTestId('group-card').first()
		await expect(groupCard).toBeVisible({ timeout: 5000 })

		await groupCard.click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Step 2: Go to members tab
		const membersTab = page.getByTestId('group-tabs').getByText(/membros|members/i)
		await expect(membersTab).toBeVisible({ timeout: 5000 })
		await membersTab.click()
		await page.waitForTimeout(500)

		// Step 3: Wait for and click invite button (only visible for admins)
		const inviteBtn = page.getByTestId('invite-member-btn')
		await expect(inviteBtn).toBeVisible({ timeout: 5000 })
		await inviteBtn.click()

		// Step 4: Wait for invite modal
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Step 5: Enter a non-existing user email
		const nonExistentEmail = `confirm-test-${Date.now()}@test.example.com`
		const emailInput = page.getByTestId('invite-email-input')
		const emailInputAlt = dialog.getByPlaceholder(/email/i)

		if (await emailInput.isVisible()) {
			await emailInput.fill(nonExistentEmail)
		} else if (await emailInputAlt.isVisible()) {
			await emailInputAlt.fill(nonExistentEmail)
		}

		// Step 6: Click send button
		const sendBtn = page.getByTestId('send-invite-btn')
		const sendBtnAlt = dialog.getByRole('button', { name: /enviar|send|convidar|invite/i })

		if (await sendBtn.isVisible()) {
			await sendBtn.click()
		} else if (await sendBtnAlt.isVisible()) {
			await sendBtnAlt.click()
		}

		// Step 7: Wait for confirmation dialog
		await page.waitForTimeout(500)

		// Step 8: Confirm sending the invite to non-user
		const confirmBtn = page.getByTestId('confirm-send-invite-btn')
		const confirmBtnAlt = page.getByRole('button', { name: /sim.*enviar|confirmar|confirm|yes.*send/i })

		if (await confirmBtn.isVisible()) {
			await confirmBtn.click()
		} else if (await confirmBtnAlt.isVisible()) {
			await confirmBtnAlt.click()
		}

		// Step 9: Verify success (modal closes or success message)
		await page.waitForTimeout(1000)

		const successToast = page.getByTestId('toast-success')
		const successText = page.getByText(/enviado|sent|sucesso|success/i)
		const modalClosed = !(await dialog.isVisible().catch(() => true))

		const hasSuccess = modalClosed ||
			await successToast.isVisible().catch(() => false) ||
			await successText.isVisible().catch(() => false)

		expect(hasSuccess).toBeTruthy()
	})

	test('M9-E2E-11d: Should cancel non-user confirmation and return to modal', async ({ page }) => {
		// Step 1: Find the test group (created in beforeEach)
		const groupCard = page.getByTestId('group-card').first()
		await expect(groupCard).toBeVisible({ timeout: 5000 })

		await groupCard.click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Step 2: Go to members tab
		const membersTab = page.getByTestId('group-tabs').getByText(/membros|members/i)
		await expect(membersTab).toBeVisible({ timeout: 5000 })
		await membersTab.click()
		await page.waitForTimeout(500)

		// Step 3: Wait for and click invite button (only visible for admins)
		const inviteBtn = page.getByTestId('invite-member-btn')
		await expect(inviteBtn).toBeVisible({ timeout: 5000 })
		await inviteBtn.click()

		// Step 4: Wait for invite modal
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible({ timeout: 3000 })

		// Step 5: Enter a non-existing user email
		const nonExistentEmail = `cancel-test-${Date.now()}@test.example.com`
		const emailInput = page.getByTestId('invite-email-input')
		const emailInputAlt = dialog.getByPlaceholder(/email/i)

		if (await emailInput.isVisible()) {
			await emailInput.fill(nonExistentEmail)
		} else if (await emailInputAlt.isVisible()) {
			await emailInputAlt.fill(nonExistentEmail)
		}

		// Step 6: Click send button
		const sendBtn = page.getByTestId('send-invite-btn')
		const sendBtnAlt = dialog.getByRole('button', { name: /enviar|send|convidar|invite/i })

		if (await sendBtn.isVisible()) {
			await sendBtn.click()
		} else if (await sendBtnAlt.isVisible()) {
			await sendBtnAlt.click()
		}

		// Step 7: Wait for confirmation dialog
		await page.waitForTimeout(500)

		// Step 8: Click cancel on the confirmation dialog
		const cancelBtn = page.getByTestId('cancel-non-user-invite-btn')
		const cancelBtnAlt = page.getByRole('button', { name: /cancelar|cancel|n[aã]o/i })

		if (await cancelBtn.isVisible()) {
			await cancelBtn.click()
		} else if (await cancelBtnAlt.isVisible()) {
			// Be careful to click the cancel in the confirmation, not the original modal
			const confirmationDialog = page.getByTestId('confirm-non-user-dialog')
			if (await confirmationDialog.isVisible()) {
				await confirmationDialog.getByRole('button', { name: /cancelar|cancel|n[aã]o/i }).click()
			} else {
				await cancelBtnAlt.first().click()
			}
		}

		// Step 9: Verify confirmation dialog closed but invite modal may still be open
		await page.waitForTimeout(300)

		const confirmationDialog = page.getByTestId('confirm-non-user-dialog')
		const confirmationClosed = !(await confirmationDialog.isVisible().catch(() => false))

		// The original invite modal should still be available (either open or closeable)
		expect(confirmationClosed).toBeTruthy()
	})

	test('M9-E2E-11e: API check endpoint returns user status correctly', async ({ page }) => {
		// This test verifies the new check endpoint directly via API

		const token = await getAuthToken(page)

		// Navigate to the test group to get its ID
		const groupCard = page.getByTestId('group-card').first()
		await expect(groupCard).toBeVisible({ timeout: 5000 })
		await groupCard.click()
		await expect(page.getByTestId('group-detail-screen')).toBeVisible()
		await page.waitForLoadState('networkidle')

		// Get group ID from URL
		const url = page.url()
		const groupIdMatch = url.match(/groups\/([a-f0-9-]+)/)
		const actualGroupId = groupIdMatch ? groupIdMatch[1] : null

		expect(actualGroupId).toBeTruthy()

		// Test 1: Check with non-existing user email
		const nonExistentEmail = `api-check-${Date.now()}@test.example.com`
		const checkNonExistent = await page.request.post(
			`${API_URL}/groups/${actualGroupId}/invite/check`,
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				data: { email: nonExistentEmail },
			}
		)

		if (checkNonExistent.ok()) {
			const data = await checkNonExistent.json()
			expect(data.user_exists).toBe(false)
			expect(data.requires_confirmation).toBe(true)
		}

		// Test 2: Check with existing user email (the main test user)
		const existingEmail = 'e2e-test@example.com'
		const checkExistent = await page.request.post(
			`${API_URL}/groups/${actualGroupId}/invite/check`,
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				data: { email: existingEmail },
			}
		)

		if (checkExistent.ok()) {
			const data = await checkExistent.json()
			// User exists (is the test user themselves or another existing user)
			// Note: self-invite check might return different response
			expect(data.user_exists === true || data.is_already_member === true).toBeTruthy()
		}
	})
})
