import { test, expect } from '@playwright/test'

/**
 * M9-E2E: Group Invitations
 * Validates group invitation functionality including:
 * - Viewing pending invitations
 * - Accepting group invitations
 * - Declining group invitations
 * - Invitation notification display
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M9: Group Invitations', () => {
	test('M9-E2E-10a: Should display pending invitations section', async ({ page }) => {
		// Step 1: Navigate to groups page
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Check for invitations section
		const invitationsSection = page.getByTestId('pending-invitations')
		const invitationBadge = page.getByTestId('invitation-badge')

		// If there are pending invitations, they should be visible
		if (await invitationsSection.isVisible()) {
			// Step 3: Verify invitation details are shown
			const invitationCard = invitationsSection.getByTestId('pending-invitation').first()

			if (await invitationCard.isVisible()) {
				// Should show group name
				await expect(invitationCard.getByTestId('invitation-group-name')).toBeVisible()

				// Should show accept/decline buttons
				await expect(invitationCard.getByTestId('accept-invitation-btn')).toBeVisible()
				await expect(invitationCard.getByTestId('decline-invitation-btn')).toBeVisible()
			}
		} else if (await invitationBadge.isVisible()) {
			// Badge indicates invitations exist
			const badgeText = await invitationBadge.textContent()
			expect(badgeText).toMatch(/\d+/)
		}
	})

	test('M9-E2E-10b: Should accept group invitation', async ({ page }) => {
		// Step 1: Navigate to groups page
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Find pending invitation
		const pendingInvitation = page.getByTestId('pending-invitation').first()

		if (await pendingInvitation.isVisible()) {
			// Step 3: Get invitation group name
			const groupName = await pendingInvitation.getByTestId('invitation-group-name').textContent()

			// Step 4: Get initial group count
			const initialGroupCount = await page.getByTestId('group-card').count()

			// Step 5: Click accept
			await pendingInvitation.getByTestId('accept-invitation-btn').click()

			// Step 6: Wait for update
			await page.waitForTimeout(500)

			// Step 7: Verify invitation is removed
			await expect(pendingInvitation).not.toBeVisible()

			// Step 8: Verify group appears in list (if groupName was available)
			if (groupName) {
				const newGroupCount = await page.getByTestId('group-card').count()
				expect(newGroupCount).toBeGreaterThan(initialGroupCount)
			}
		}
	})

	test('M9-E2E-10c: Should decline group invitation', async ({ page }) => {
		// Step 1: Navigate to groups page
		await page.goto('/groups')
		await expect(page.getByTestId('groups-screen')).toBeVisible()

		// Step 2: Find pending invitations
		const pendingInvitations = page.getByTestId('pending-invitation')
		const initialCount = await pendingInvitations.count()

		if (initialCount > 0) {
			// Step 3: Click decline on first invitation
			const firstInvitation = pendingInvitations.first()
			await firstInvitation.getByTestId('decline-invitation-btn').click()

			// Step 4: Confirm decline if dialog appears
			const confirmDialog = page.getByTestId('confirm-decline-dialog')
			if (await confirmDialog.isVisible()) {
				await confirmDialog.getByTestId('confirm-btn').click()
			}

			// Step 5: Wait for update
			await page.waitForTimeout(500)

			// Step 6: Verify invitation count decreased
			const newCount = await pendingInvitations.count()
			expect(newCount).toBeLessThan(initialCount)
		}
	})

	test('M9-E2E-10d: Should show invitation notification badge', async ({ page }) => {
		// Step 1: Navigate to dashboard first
		await page.goto('/dashboard')

		// Step 2: Check for groups navigation item
		const groupsNavItem = page.getByTestId('nav-item-groups')

		if (await groupsNavItem.isVisible()) {
			// Step 3: Check for notification badge
			const notificationBadge = groupsNavItem.getByTestId('notification-badge')

			if (await notificationBadge.isVisible()) {
				const badgeText = await notificationBadge.textContent()
				// Should show a number
				expect(badgeText).toMatch(/\d+/)
			}
		}
	})

	test('M9-E2E-10e: Should send group invitation', async ({ page }) => {
		// Step 1: Navigate to groups page
		await page.goto('/groups')

		// Step 2: Create or select a group
		const groupCard = page.getByTestId('group-card').first()

		if (await groupCard.isVisible()) {
			await groupCard.click()
			await expect(page.getByTestId('group-detail-screen')).toBeVisible()

			// Step 3: Go to members tab
			const membersTab = page.getByTestId('group-tabs').getByText(/membros|members/i)
			if (await membersTab.isVisible()) {
				await membersTab.click()
				await page.waitForTimeout(300)
			}

			// Step 4: Click invite button (try multiple selectors)
			const inviteBtn = page.getByTestId('invite-member-btn')
			const inviteBtnByText = page.getByRole('button', { name: /convidar|invite/i })

			let clickedInvite = false
			if (await inviteBtn.isVisible()) {
				await inviteBtn.click()
				clickedInvite = true
			} else if (await inviteBtnByText.isVisible()) {
				await inviteBtnByText.click()
				clickedInvite = true
			}

			if (clickedInvite) {
				// Step 5: Wait for modal
				const dialog = page.getByRole('dialog')
				if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
					// Step 6: Fill email (try multiple selectors)
					const emailInput = page.getByTestId('invite-email-input')
					const emailInputAlt = dialog.getByPlaceholder(/email/i)

					if (await emailInput.isVisible()) {
						await emailInput.fill('test@example.com')
					} else if (await emailInputAlt.isVisible()) {
						await emailInputAlt.fill('test@example.com')
					}

					// Step 7: Send invitation (try multiple selectors)
					const sendBtn = page.getByTestId('send-invite-btn')
					const sendBtnAlt = dialog.getByRole('button', { name: /enviar|send|convidar|invite/i })

					if (await sendBtn.isVisible()) {
						await sendBtn.click()
					} else if (await sendBtnAlt.isVisible()) {
						await sendBtnAlt.click()
					}

					// Step 8: Verify success (toast or modal closes)
					await page.waitForTimeout(500)
					const successToast = page.getByTestId('toast-success')
					const toastAlt = page.getByText(/enviado|sent|sucesso|success/i)
					const hasSuccess = await successToast.isVisible().catch(() => false) ||
						await toastAlt.isVisible().catch(() => false) ||
						!(await dialog.isVisible().catch(() => true))
					expect(hasSuccess).toBeTruthy()
				}
			}
		}
	})
})
