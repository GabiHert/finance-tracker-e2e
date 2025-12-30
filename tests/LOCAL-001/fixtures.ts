import { test as base, Page } from '@playwright/test'

interface CumulativeBalanceFixtures {
	dashboardPage: Page
}

export const test = base.extend<CumulativeBalanceFixtures>({
	dashboardPage: async ({ page }, use) => {
		await page.goto('/dashboard')
		await page.waitForSelector('[data-testid="dashboard-screen"]')
		await page.waitForLoadState('networkidle')
		await use(page)
	},
})

export { expect } from '@playwright/test'
