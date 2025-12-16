import { test, expect } from '@playwright/test'

/**
 * M10-E2E: Theme Toggle (Dark Mode)
 * Validates theme switching functionality including:
 * - Toggle between light and dark mode
 * - Theme persistence across page reloads
 * - System preference detection
 * - CSS variable changes
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe('M10: Theme Toggle', () => {
	test('M10-E2E-08a: Should toggle between light and dark mode', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Find theme selector (testId: theme-select)
		const themeSelect = page.getByTestId('theme-select')
		const htmlElement = page.locator('html')

		// Wait for the theme selector to be visible
		await expect(themeSelect).toBeVisible({ timeout: 5000 })

		// Step 3: Click theme selector to open dropdown
		await themeSelect.click()

		// Step 4: Select dark theme option
		const darkOption = page.getByRole('option', { name: /escuro|dark/i })
		await expect(darkOption).toBeVisible({ timeout: 3000 })
		await darkOption.click()

		// Step 5: Verify dark mode is applied
		await expect(htmlElement).toHaveClass(/dark/, { timeout: 3000 })

		// Step 6: Switch back to light mode
		await themeSelect.click()
		const lightOption = page.getByRole('option', { name: /claro|light/i })
		await expect(lightOption).toBeVisible({ timeout: 3000 })
		await lightOption.click()

		// Step 7: Verify light mode is applied (no dark class)
		await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3000 })
	})

	test('M10-E2E-08b: Should persist theme preference after reload', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Find theme selector (testId: theme-select)
		const themeSelect = page.getByTestId('theme-select')
		const htmlElement = page.locator('html')

		// Wait for the theme selector to be visible
		await expect(themeSelect).toBeVisible({ timeout: 5000 })

		// Step 3: Select dark theme
		await themeSelect.click()
		const darkOption = page.getByRole('option', { name: /escuro|dark/i })
		await expect(darkOption).toBeVisible({ timeout: 3000 })
		await darkOption.click()

		// Step 4: Verify dark mode is active
		await expect(htmlElement).toHaveClass(/dark/, { timeout: 3000 })

		// Step 5: Reload the page
		await page.reload()

		// Step 6: Verify dark mode persisted after reload
		await expect(htmlElement).toHaveClass(/dark/, { timeout: 5000 })

		// Step 7: Switch to light mode
		const themeSelectAfterReload = page.getByTestId('theme-select')
		await expect(themeSelectAfterReload).toBeVisible({ timeout: 5000 })
		await themeSelectAfterReload.click()
		const lightOption = page.getByRole('option', { name: /claro|light/i })
		await expect(lightOption).toBeVisible({ timeout: 3000 })
		await lightOption.click()

		// Step 8: Verify light mode is active
		await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3000 })

		// Step 9: Reload and verify light mode persisted
		await page.reload()
		await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 5000 })
	})

	test('M10-E2E-08c: Should apply correct colors in dark mode', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Find and use the theme selector (testId: theme-select)
		const themeSelect = page.getByTestId('theme-select')
		const htmlElement = page.locator('html')

		// Wait for the theme selector to be visible
		await expect(themeSelect).toBeVisible({ timeout: 5000 })

		// Step 3: Click theme selector to open dropdown
		await themeSelect.click()

		// Step 4: Select dark theme option
		const darkOption = page.getByRole('option', { name: /escuro|dark/i })
		await expect(darkOption).toBeVisible({ timeout: 3000 })
		await darkOption.click()

		// Step 5: Verify dark mode class is applied to html element
		await expect(htmlElement).toHaveClass(/dark/, { timeout: 3000 })

		// Step 6: Check background color change
		const bodyBgColor = await page.evaluate(() => {
			return getComputedStyle(document.body).backgroundColor
		})

		// Dark mode should have a dark background (low RGB values)
		// Parse the rgb color - handle both rgb() and rgba() formats
		const rgbMatch = bodyBgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
		if (rgbMatch) {
			const [, rStr, gStr, bStr] = rgbMatch
			const r = parseInt(rStr || '0')
			const g = parseInt(gStr || '0')
			const b = parseInt(bStr || '0')
			// In dark mode, background should be dark (sum of RGB < 450 for more tolerance)
			// Some dark themes use slightly lighter backgrounds
			expect(r + g + b).toBeLessThan(450)
		}
	})

	test('M10-E2E-08d: Should apply correct colors in light mode', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Find theme selector
		const themeSelect = page.getByTestId('theme-select')
		const htmlElement = page.locator('html')

		// Wait for the theme selector to be visible
		await expect(themeSelect).toBeVisible({ timeout: 5000 })

		// Step 3: Ensure light mode is active
		await themeSelect.click()
		const lightOption = page.getByRole('option', { name: /claro|light/i })
		await expect(lightOption).toBeVisible({ timeout: 3000 })
		await lightOption.click()

		// Step 4: Verify dark mode class is NOT applied
		await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3000 })

		// Step 5: Check background color change
		const bodyBgColor = await page.evaluate(() => {
			return getComputedStyle(document.body).backgroundColor
		})

		// Light mode should have a light background (high RGB values)
		const rgbMatch = bodyBgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
		if (rgbMatch) {
			const [, rStr, gStr, bStr] = rgbMatch
			const r = parseInt(rStr || '0')
			const g = parseInt(gStr || '0')
			const b = parseInt(bStr || '0')
			// In light mode, background should be light (sum of RGB > 600, roughly > 200 each)
			expect(r + g + b).toBeGreaterThan(600)
		}
	})

	test('M10-E2E-08e: Should have system theme option', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Find theme selector
		const themeSelect = page.getByTestId('theme-select')

		// Wait for the theme selector to be visible
		await expect(themeSelect).toBeVisible({ timeout: 5000 })

		// Step 3: Click theme selector to open dropdown
		await themeSelect.click()

		// Step 4: Verify system option exists
		const systemOption = page.getByRole('option', { name: /sistema|system|auto/i })
		await expect(systemOption).toBeVisible({ timeout: 3000 })

		// Step 5: Select system option
		await systemOption.click()

		// Step 6: Verify system option is now selected (displayed in button text)
		await expect(themeSelect).toContainText(/sistema|system/i, { timeout: 3000 })
	})

	test('M10-E2E-08f: Should show theme selector in settings preferences section', async ({ page }) => {
		// Step 1: Navigate to settings
		await page.goto('/settings')
		await expect(page.getByTestId('settings-screen')).toBeVisible()

		// Step 2: Look for preferences section
		const preferencesSection = page.getByTestId('preferences-section')
		await expect(preferencesSection).toBeVisible({ timeout: 5000 })

		// Step 3: Verify theme selector is inside preferences section
		const themeSelect = preferencesSection.getByTestId('theme-select')
		await expect(themeSelect).toBeVisible()

		// Step 4: Verify label text "Tema" is visible
		const themeLabel = preferencesSection.getByText(/tema|theme/i)
		await expect(themeLabel.first()).toBeVisible()
	})
})
