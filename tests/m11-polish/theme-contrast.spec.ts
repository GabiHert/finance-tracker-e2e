import { test, expect } from '@playwright/test'

/**
 * M11-E2E: Theme Contrast Validation
 * Validates that UI elements have sufficient color contrast in dark mode.
 * These tests verify:
 * - Modal backgrounds and text contrast
 * - Transaction page elements contrast
 * - Button variants contrast
 * - Form labels contrast
 *
 * WCAG AA requires a minimum contrast ratio of 4.5:1 for normal text.
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M11: Theme Contrast - Dark Mode', () => {
	test.beforeEach(async ({ page }) => {
		// Emulate dark mode preference
		await page.emulateMedia({ colorScheme: 'dark' })
	})

	test.describe('Modal Contrast', () => {
		test('M11-CONTRAST-001: Modal should have dark background in dark mode', async ({ page }) => {
			// Navigate to groups page
			await page.goto('/groups')

			// Click to open new group modal
			await page.getByTestId('new-group-btn').click()

			// Wait for modal to be visible
			const modal = page.getByTestId('modal-content')
			await expect(modal).toBeVisible()

			// Get computed background color
			const modalBgColor = await modal.evaluate(el => {
				return window.getComputedStyle(el).backgroundColor
			})

			// Modal background should NOT be white (rgb(255, 255, 255))
			// In dark mode, it should be a dark color
			expect(modalBgColor).not.toBe('rgb(255, 255, 255)')

			// The background should be dark - check if it's a dark shade
			// Dark mode surface color should be around neutral-800/900
			const rgbMatch = modalBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Each RGB component should be less than 128 for a dark background
				expect(r).toBeLessThan(128)
				expect(g).toBeLessThan(128)
				expect(b).toBeLessThan(128)
			}
		})

		test('M11-CONTRAST-002: Modal title should be visible in dark mode', async ({ page }) => {
			// Navigate to groups page
			await page.goto('/groups')

			// Click to open new group modal
			await page.getByTestId('new-group-btn').click()

			// Wait for modal title
			const modalTitle = page.getByTestId('modal-title')
			await expect(modalTitle).toBeVisible()

			// Get computed text color
			const titleColor = await modalTitle.evaluate(el => {
				return window.getComputedStyle(el).color
			})

			// Title text should be light colored in dark mode
			const rgbMatch = titleColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Each RGB component should be greater than 200 for light text
				expect(r).toBeGreaterThan(200)
				expect(g).toBeGreaterThan(200)
				expect(b).toBeGreaterThan(200)
			}
		})

		test('M11-CONTRAST-003: Form labels should be visible in dark mode', async ({ page }) => {
			// Navigate to groups page
			await page.goto('/groups')

			// Click to open new group modal
			await page.getByTestId('new-group-btn').click()

			// Wait for modal to be visible
			await expect(page.getByTestId('modal-content')).toBeVisible()

			// Find label elements within the modal
			const labels = page.locator('[data-testid="modal-content"] label')
			const labelCount = await labels.count()

			expect(labelCount).toBeGreaterThan(0)

			// Check each label has sufficient contrast
			for (let i = 0; i < labelCount; i++) {
				const label = labels.nth(i)
				const labelColor = await label.evaluate(el => {
					return window.getComputedStyle(el).color
				})

				// Label text should be visible (not too dark on dark background)
				const rgbMatch = labelColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					// At least one RGB component should be above 150 for visible text
					const maxValue = Math.max(r, g, b)
					expect(maxValue).toBeGreaterThan(150)
				}
			}
		})

		test('M11-CONTRAST-004: Secondary button (Cancelar) should be visible in dark mode', async ({ page }) => {
			// Navigate to groups page
			await page.goto('/groups')

			// Click to open new group modal
			await page.getByTestId('new-group-btn').click()

			// Wait for cancel button
			const cancelBtn = page.getByTestId('cancel-btn')
			await expect(cancelBtn).toBeVisible()

			// Get computed styles
			const btnColor = await cancelBtn.evaluate(el => {
				return window.getComputedStyle(el).color
			})

			const btnBgColor = await cancelBtn.evaluate(el => {
				return window.getComputedStyle(el).backgroundColor
			})

			// Button text should have sufficient contrast with background
			// In dark mode, button should have visible text
			const colorMatch = btnColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			const bgMatch = btnBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)

			if (colorMatch && bgMatch) {
				const [, textR, textG, textB] = colorMatch.map(Number)
				const [, bgR, bgG, bgB] = bgMatch.map(Number)

				// Calculate simple luminance difference
				const textLuminance = (textR + textG + textB) / 3
				const bgLuminance = (bgR + bgG + bgB) / 3
				const contrastDiff = Math.abs(textLuminance - bgLuminance)

				// There should be at least 100 units of luminance difference
				expect(contrastDiff).toBeGreaterThan(100)
			}
		})
	})

	test.describe('Transaction Page Contrast', () => {
		test('M11-CONTRAST-005: Transaction header should use dark background in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for the header section using data-testid
			const header = page.getByTestId('transactions-header-container')
			await expect(header).toBeVisible()

			// The header should NOT have a white background in dark mode
			const headerBgColor = await header.evaluate(el => {
				return window.getComputedStyle(el).backgroundColor
			})

			// Background should NOT be white in dark mode
			expect(headerBgColor).not.toBe('rgb(255, 255, 255)')

			// Verify it's a dark background
			const rgbMatch = headerBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Each RGB component should be less than 128 for a dark background
				expect(r).toBeLessThan(128)
				expect(g).toBeLessThan(128)
				expect(b).toBeLessThan(128)
			}
		})

		test('M11-CONTRAST-006: Transaction title should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for title
			const title = page.getByTestId('transactions-header')
			await expect(title).toBeVisible()

			// Get computed text color
			const titleColor = await title.evaluate(el => {
				return window.getComputedStyle(el).color
			})

			// Title should be light-colored in dark mode
			const rgbMatch = titleColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Text should be light (visible on dark background)
				expect(r).toBeGreaterThan(180)
				expect(g).toBeGreaterThan(180)
				expect(b).toBeGreaterThan(180)
			}
		})

		test('M11-CONTRAST-007: Transaction count text should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for transaction count
			const countText = page.getByTestId('transactions-count')
			await expect(countText).toBeVisible()

			// Get computed text color
			const textColor = await countText.evaluate(el => {
				return window.getComputedStyle(el).color
			})

			// Count text should have sufficient contrast
			const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Secondary text should still be visible (at least 130+ each component)
				expect(r).toBeGreaterThan(130)
				expect(g).toBeGreaterThan(130)
				expect(b).toBeGreaterThan(130)
			}
		})

		test('M11-CONTRAST-008: Date group headers should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for transaction date headers
			const dateHeaders = page.getByTestId('transaction-date-header')
			const headerCount = await dateHeaders.count()

			if (headerCount > 0) {
				const firstHeader = dateHeaders.first()
				await expect(firstHeader).toBeVisible()

				// Get computed text color
				const headerColor = await firstHeader.evaluate(el => {
					return window.getComputedStyle(el).color
				})

				// Date header text should be light in dark mode
				const rgbMatch = headerColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					expect(r).toBeGreaterThan(180)
					expect(g).toBeGreaterThan(180)
					expect(b).toBeGreaterThan(180)
				}
			}
		})

		test('M11-CONTRAST-009: Transaction description should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for transaction descriptions
			const descriptions = page.getByTestId('transaction-description')
			const descCount = await descriptions.count()

			if (descCount > 0) {
				const firstDesc = descriptions.first()
				await expect(firstDesc).toBeVisible()

				// Get computed text color
				const descColor = await firstDesc.evaluate(el => {
					return window.getComputedStyle(el).color
				})

				// Transaction description should be light in dark mode
				const rgbMatch = descColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					expect(r).toBeGreaterThan(180)
					expect(g).toBeGreaterThan(180)
					expect(b).toBeGreaterThan(180)
				}
			}
		})

		test('M11-CONTRAST-010: Transaction list should use dark background in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Find the transaction list container using data-testid
			const listContainer = page.getByTestId('transactions-list-container')
			await expect(listContainer).toBeVisible()

			// Get computed background color
			const bgColor = await listContainer.evaluate(el => {
				return window.getComputedStyle(el).backgroundColor
			})

			// Background should NOT be white in dark mode
			expect(bgColor).not.toBe('rgb(255, 255, 255)')

			// Verify it's a dark background
			const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number)
				// Each RGB component should be less than 128 for a dark background
				expect(r).toBeLessThan(128)
				expect(g).toBeLessThan(128)
				expect(b).toBeLessThan(128)
			}
		})

		test('M11-CONTRAST-011: Summary card labels should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Wait for summary section
			const summary = page.getByTestId('total-summary')
			await expect(summary).toBeVisible()

			// Check all label text elements within summary cards
			const labels = summary.locator('p.text-sm')
			const labelCount = await labels.count()

			for (let i = 0; i < labelCount; i++) {
				const label = labels.nth(i)
				const labelColor = await label.evaluate(el => {
					return window.getComputedStyle(el).color
				})

				// Labels should be visible on their backgrounds
				const rgbMatch = labelColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					// Labels should have at least medium contrast
					const avg = (r + g + b) / 3
					expect(avg).toBeGreaterThan(100)
				}
			}
		})

		test('M11-CONTRAST-012: Summary values (Income, Expense, Net) should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page
			await page.goto('/transactions')

			// Check income total
			const incomeTotal = page.getByTestId('income-total')
			if (await incomeTotal.isVisible()) {
				const incomeColor = await incomeTotal.evaluate(el => {
					return window.getComputedStyle(el).color
				})
				expect(incomeColor).not.toBe('rgb(255, 255, 255)')
				// Green success color should have high green component
				const rgbMatch = incomeColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g] = rgbMatch.map(Number)
					// Green component should be higher for success color
					expect(g).toBeGreaterThan(100)
				}
			}

			// Check expense total
			const expenseTotal = page.getByTestId('expense-total')
			if (await expenseTotal.isVisible()) {
				const expenseColor = await expenseTotal.evaluate(el => {
					return window.getComputedStyle(el).color
				})
				expect(expenseColor).not.toBe('rgb(255, 255, 255)')
				// Red error color should have high red component
				const rgbMatch = expenseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r] = rgbMatch.map(Number)
					// Red component should be higher for error color
					expect(r).toBeGreaterThan(100)
				}
			}

			// Check net total
			const netTotal = page.getByTestId('net-total')
			if (await netTotal.isVisible()) {
				const netColor = await netTotal.evaluate(el => {
					return window.getComputedStyle(el).color
				})
				expect(netColor).not.toBe('rgb(255, 255, 255)')
			}
		})
	})

	test.describe('Dashboard Period Selector Contrast', () => {
		test('M11-CONTRAST-013: Period selector button should be visible in dark mode', async ({ page }) => {
			// Navigate to dashboard
			await page.goto('/dashboard')

			// Look for the period selector button
			const periodSelector = page.getByTestId('period-selector-btn')

			if (await periodSelector.isVisible()) {
				// Get computed styles
				const textColor = await periodSelector.evaluate(el => {
					return window.getComputedStyle(el).color
				})

				// Text should be visible
				const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (rgbMatch) {
					const [, r, g, b] = rgbMatch.map(Number)
					const avg = (r + g + b) / 3
					expect(avg).toBeGreaterThan(100)
				}
			}
		})

		test('M11-CONTRAST-014: Refresh button should be visible in dark mode', async ({ page }) => {
			// Navigate to dashboard
			await page.goto('/dashboard')

			// Look for refresh button or any action button next to period selector
			const refreshBtn = page.getByTestId('refresh-btn')

			if (await refreshBtn.isVisible()) {
				// The button should be visible - check it's not invisible
				const opacity = await refreshBtn.evaluate(el => {
					return window.getComputedStyle(el).opacity
				})

				expect(parseFloat(opacity)).toBeGreaterThan(0.5)

				// Check button has visible styling
				const btnColor = await refreshBtn.evaluate(el => {
					const style = window.getComputedStyle(el)
					return {
						color: style.color,
						backgroundColor: style.backgroundColor,
						borderColor: style.borderColor
					}
				})

				// At least one property should provide contrast
				expect(
					btnColor.color !== 'rgba(0, 0, 0, 0)' ||
					btnColor.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
					btnColor.borderColor !== 'rgba(0, 0, 0, 0)'
				).toBeTruthy()
			}
		})
	})

	test.describe('Outline Button Variant Contrast', () => {
		test('M11-CONTRAST-015: Outline buttons should be visible in dark mode', async ({ page }) => {
			// Navigate to transactions page which has outline buttons
			await page.goto('/transactions')

			// Find the Import button (outline variant)
			const importBtn = page.getByTestId('import-transactions-btn')

			if (await importBtn.isVisible()) {
				// Get computed styles
				const styles = await importBtn.evaluate(el => {
					const computedStyle = window.getComputedStyle(el)
					return {
						color: computedStyle.color,
						backgroundColor: computedStyle.backgroundColor,
						borderColor: computedStyle.borderColor,
						borderWidth: computedStyle.borderWidth
					}
				})

				// For outline button, text color should be visible
				const colorMatch = styles.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
				if (colorMatch) {
					const [, r, g, b] = colorMatch.map(Number)
					const avg = (r + g + b) / 3
					// Text should be light enough to see on dark background
					expect(avg).toBeGreaterThan(100)
				}

				// Border should be visible
				if (styles.borderWidth !== '0px' && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
					const borderMatch = styles.borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
					if (borderMatch) {
						const [, r, g, b] = borderMatch.map(Number)
						const avg = (r + g + b) / 3
						expect(avg).toBeGreaterThan(80)
					}
				}
			}
		})
	})
})

/**
 * Light Mode Contrast Tests (baseline comparison)
 */
test.describe('M11: Theme Contrast - Light Mode', () => {
	test.beforeEach(async ({ page }) => {
		// Emulate light mode preference
		await page.emulateMedia({ colorScheme: 'light' })
	})

	test('M11-CONTRAST-016: Modal should have light background in light mode', async ({ page }) => {
		// Navigate to groups page
		await page.goto('/groups')

		// Click to open new group modal
		await page.getByTestId('new-group-btn').click()

		// Wait for modal
		const modal = page.getByTestId('modal-content')
		await expect(modal).toBeVisible()

		// Get computed background color
		const modalBgColor = await modal.evaluate(el => {
			return window.getComputedStyle(el).backgroundColor
		})

		// Modal background should be white or near-white in light mode
		const rgbMatch = modalBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
		if (rgbMatch) {
			const [, r, g, b] = rgbMatch.map(Number)
			// Each RGB component should be above 240 for light background
			expect(r).toBeGreaterThan(240)
			expect(g).toBeGreaterThan(240)
			expect(b).toBeGreaterThan(240)
		}
	})

	test('M11-CONTRAST-017: Transaction header should have light background in light mode', async ({ page }) => {
		// Navigate to transactions page
		await page.goto('/transactions')

		// Wait for header using data-testid
		const header = page.getByTestId('transactions-header-container')
		await expect(header).toBeVisible()

		// Get computed background color
		const headerBgColor = await header.evaluate(el => {
			return window.getComputedStyle(el).backgroundColor
		})

		// Background should be white or near-white in light mode
		const rgbMatch = headerBgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
		if (rgbMatch) {
			const [, r, g, b] = rgbMatch.map(Number)
			expect(r).toBeGreaterThan(240)
			expect(g).toBeGreaterThan(240)
			expect(b).toBeGreaterThan(240)
		}
	})
})
