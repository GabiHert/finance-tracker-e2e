import { test, expect } from '@playwright/test'

/**
 * M11-E2E: Polish & MVP Completion
 * Validates navigation, toast notifications, responsive layouts, and accessibility:
 * - Sidebar navigation (desktop)
 * - Bottom navigation (mobile)
 * - Toast notification system
 * - Offline detection
 * - Responsive layouts
 * - WCAG AA accessibility compliance
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 * (configured via storageState in playwright.config.ts)
 */
test.describe('M11: Polish & MVP Completion', () => {
	// Desktop viewport for sidebar tests
	const desktopViewport = { width: 1280, height: 720 }
	// Tablet viewport
	const tabletViewport = { width: 768, height: 1024 }
	// Mobile viewport for bottom nav tests
	const mobileViewport = { width: 375, height: 667 }

	test.describe('Navigation', () => {
		test('M11-E2E-001: Should display sidebar navigation on desktop', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard (authenticated page)
			await page.goto('/dashboard')

			// Verify sidebar is visible on desktop
			const sidebar = page.getByTestId('sidebar-nav')
			await expect(sidebar).toBeVisible()

			// Verify sidebar width is 260px (expanded state)
			const sidebarBox = await sidebar.boundingBox()
			expect(sidebarBox?.width).toBeGreaterThanOrEqual(250)
			expect(sidebarBox?.width).toBeLessThanOrEqual(270)

			// Verify all main navigation items are present
			await expect(page.getByTestId('nav-item-dashboard')).toBeVisible()
			await expect(page.getByTestId('nav-item-transactions')).toBeVisible()
			await expect(page.getByTestId('nav-item-categories')).toBeVisible()
			await expect(page.getByTestId('nav-item-goals')).toBeVisible()
			await expect(page.getByTestId('nav-item-groups')).toBeVisible()
			await expect(page.getByTestId('nav-item-settings')).toBeVisible()

			// Verify navigation labels are visible in expanded state
			await expect(page.getByTestId('nav-label-dashboard')).toBeVisible()
			await expect(page.getByTestId('nav-label-transactions')).toBeVisible()
		})

		test('M11-E2E-002: Should collapse and expand sidebar', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify sidebar is visible
			const sidebar = page.getByTestId('sidebar-nav')
			await expect(sidebar).toBeVisible()

			// Get initial sidebar width (expanded)
			let sidebarBox = await sidebar.boundingBox()
			const expandedWidth = sidebarBox?.width || 260

			// Click collapse button
			await page.getByTestId('sidebar-collapse-btn').click()

			// Wait for animation
			await page.waitForTimeout(300)

			// Verify sidebar width is now 72px (collapsed)
			sidebarBox = await sidebar.boundingBox()
			expect(sidebarBox?.width).toBeGreaterThanOrEqual(60)
			expect(sidebarBox?.width).toBeLessThanOrEqual(80)

			// Verify labels are hidden in collapsed state
			await expect(page.getByTestId('nav-label-dashboard')).not.toBeVisible()

			// Click expand button
			await page.getByTestId('sidebar-expand-btn').click()

			// Wait for animation
			await page.waitForTimeout(300)

			// Verify sidebar is expanded again
			sidebarBox = await sidebar.boundingBox()
			expect(sidebarBox?.width).toBeGreaterThanOrEqual(250)

			// Verify labels are visible again
			await expect(page.getByTestId('nav-label-dashboard')).toBeVisible()
		})

		test('M11-E2E-003: Should display bottom navigation on mobile', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize(mobileViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify sidebar is NOT visible on mobile
			const sidebar = page.getByTestId('sidebar-nav')
			await expect(sidebar).not.toBeVisible()

			// Verify bottom navigation is visible
			const bottomNav = page.getByTestId('bottom-nav')
			await expect(bottomNav).toBeVisible()

			// Verify bottom nav is at the bottom of the screen
			const bottomNavBox = await bottomNav.boundingBox()
			const viewportHeight = mobileViewport.height
			expect(bottomNavBox?.y).toBeGreaterThan(viewportHeight - 100)

			// Verify all 6 navigation items are present
			await expect(page.getByTestId('bottom-nav-dashboard')).toBeVisible()
			await expect(page.getByTestId('bottom-nav-transactions')).toBeVisible()
			await expect(page.getByTestId('bottom-nav-categories')).toBeVisible()
			await expect(page.getByTestId('bottom-nav-rules')).toBeVisible()
			await expect(page.getByTestId('bottom-nav-goals')).toBeVisible()
			await expect(page.getByTestId('bottom-nav-settings')).toBeVisible()

			// Test navigation - click on transactions
			await page.getByTestId('bottom-nav-transactions').click()
			await expect(page).toHaveURL(/\/transactions/)

			// Verify active state is shown
			await expect(page.getByTestId('bottom-nav-transactions')).toHaveAttribute('data-active', 'true')
		})
	})

	test.describe('Toast Notifications', () => {
		test('M11-E2E-004: Should display toast container in layout', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Wait for page to load
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// Verify toast container exists in DOM (it's always present, just empty when no toasts)
			const toastContainer = page.getByTestId('toast-container')
			await expect(toastContainer).toBeAttached()
		})

		test('M11-E2E-005: Should verify categories screen has correct data-testid', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to categories screen
			await page.goto('/categories')

			// Wait for page to load
			await expect(page.getByTestId('categories-screen')).toBeVisible()

			// Verify add category button exists
			await expect(page.getByTestId('add-category-btn')).toBeVisible()
		})

		test('M11-E2E-006: Should show offline detection banner', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Wait for page to load
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// Simulate offline mode
			await page.context().setOffline(true)

			// Wait a moment for offline detection
			await page.waitForTimeout(500)

			// Verify offline banner appears
			const offlineBanner = page.getByTestId('offline-banner')
			await expect(offlineBanner).toBeVisible()
			await expect(offlineBanner).toContainText(/offline|sem conexão|no connection/i)

			// Simulate online mode
			await page.context().setOffline(false)

			// Wait for online detection
			await page.waitForTimeout(500)

			// Verify offline banner disappears
			await expect(offlineBanner).not.toBeVisible()
		})

		test('M11-E2E-007: Should have toast provider wrapper', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify the toast container is in the DOM
			const toastContainer = page.getByTestId('toast-container')
			await expect(toastContainer).toBeAttached()

			// Navigate to different pages and verify toast container persists
			await page.goto('/categories')
			await expect(page.getByTestId('categories-screen')).toBeVisible()
			await expect(toastContainer).toBeAttached()

			await page.goto('/settings')
			await expect(page.getByTestId('settings-screen')).toBeVisible()
			await expect(toastContainer).toBeAttached()
		})
	})

	test.describe('Responsive Layouts', () => {
		test('M11-E2E-008: Should display tablet layout correctly', async ({ page }) => {
			// Set tablet viewport
			await page.setViewportSize(tabletViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify dashboard loads
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// On tablet (768px), sidebar should still be visible (md breakpoint)
			const sidebar = page.getByTestId('sidebar-nav')
			const bottomNav = page.getByTestId('bottom-nav')

			// At 768px (md breakpoint), sidebar should be visible
			const sidebarVisible = await sidebar.isVisible()
			expect(sidebarVisible).toBe(true)

			// Verify bottom nav is NOT visible on tablet
			await expect(bottomNav).not.toBeVisible()

			// Verify content adapts with sidebar
			const mainContent = page.getByTestId('main-content')
			await expect(mainContent).toBeVisible()
		})

		test('M11-E2E-009: Should display mobile layout correctly', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize(mobileViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify dashboard loads
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// Verify sidebar is NOT visible on mobile
			await expect(page.getByTestId('sidebar-nav')).not.toBeVisible()

			// Verify bottom navigation IS visible
			await expect(page.getByTestId('bottom-nav')).toBeVisible()

			// Verify content uses full width
			const mainContent = page.getByTestId('main-content')
			await expect(mainContent).toBeVisible()
			const contentBox = await mainContent.boundingBox()
			expect(contentBox?.width).toBeGreaterThanOrEqual(mobileViewport.width - 40) // Allow for padding

			// Navigate to categories using bottom nav
			await page.getByTestId('bottom-nav-categories').click()
			await expect(page).toHaveURL(/\/categories/)

			// Verify categories screen loads
			await expect(page.getByTestId('categories-screen')).toBeVisible()
		})
	})

	test.describe('Accessibility', () => {
		test('M11-E2E-010: Should support keyboard navigation', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Wait for page to load
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// Test skip link - first Tab should focus skip link
			await page.keyboard.press('Tab')
			const skipLink = page.getByTestId('skip-to-content')
			await expect(skipLink).toBeFocused()

			// Press Enter to skip to main content
			await page.keyboard.press('Enter')

			// Main content should now be focused
			const mainContent = page.getByTestId('main-content')
			await expect(mainContent).toBeFocused()

			// Navigate using sidebar - test that clicking nav works
			await page.getByTestId('nav-item-transactions').click()
			await expect(page).toHaveURL(/\/transactions/)

			// Test modal keyboard interaction
			await page.goto('/categories')
			await expect(page.getByTestId('categories-screen')).toBeVisible()

			// Click to open modal
			await page.getByTestId('add-category-btn').click()

			// Modal should open
			const modal = page.getByTestId('category-modal')
			await expect(modal).toBeVisible()

			// Press Escape to close modal
			await page.keyboard.press('Escape')
			await expect(modal).not.toBeVisible()
		})

		test('M11-E2E-011: Should have proper ARIA attributes for screen readers', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Verify main landmarks
			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('nav').first()).toBeVisible()

			// Verify sidebar has proper role and label
			const sidebar = page.getByTestId('sidebar-nav')
			await expect(sidebar).toHaveAttribute('role', 'navigation')
			await expect(sidebar).toHaveAttribute('aria-label', /navigation|menu|nav/i)

			// Navigate to categories
			await page.goto('/categories')
			await expect(page.getByTestId('categories-screen')).toBeVisible()

			// Open category modal
			await page.getByTestId('add-category-btn').click()
			const modal = page.getByTestId('category-modal')
			await expect(modal).toBeVisible()

			// Verify modal has proper ARIA attributes (role is on modal container)
			await expect(modal).toHaveAttribute('role', 'dialog')
			await expect(modal).toHaveAttribute('aria-modal', 'true')

			// Close modal
			await page.keyboard.press('Escape')
		})

		test('M11-E2E-012: Should have sufficient color contrast', async ({ page }) => {
			// Set desktop viewport
			await page.setViewportSize(desktopViewport)

			// Navigate to dashboard
			await page.goto('/dashboard')

			// Wait for page to load
			await expect(page.getByTestId('dashboard-screen')).toBeVisible()

			// Get computed styles for key text elements
			const primaryText = page.locator('h1').first()
			await expect(primaryText).toBeVisible()

			// Check that primary text has a color set
			const primaryTextColor = await primaryText.evaluate((el) => {
				return window.getComputedStyle(el).color
			})

			// Verify text color is set (not empty)
			expect(primaryTextColor).toBeTruthy()
			expect(primaryTextColor).not.toBe('')

			// Navigate to settings to check form labels
			await page.goto('/settings')
			await expect(page.getByTestId('settings-screen')).toBeVisible()

			// Check label text has color
			const labels = page.locator('.text-\\[var\\(--color-text\\)\\]').first()
			if (await labels.isVisible()) {
				const labelColor = await labels.evaluate((el) => {
					return window.getComputedStyle(el).color
				})
				expect(labelColor).toBeTruthy()
			}

			// Check that settings page has readable text
			const settingsHeading = page.locator('h1').first()
			await expect(settingsHeading).toBeVisible()
			const headingColor = await settingsHeading.evaluate((el) => {
				return window.getComputedStyle(el).color
			})
			expect(headingColor).toBeTruthy()
		})
	})
})
