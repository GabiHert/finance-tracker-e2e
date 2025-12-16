import { Page } from '@playwright/test'

/**
 * Utility functions for mocking API and network errors in E2E tests.
 * These allow testing error handling and recovery flows.
 */

/**
 * Mock an API endpoint to return a specific error status code
 */
export async function mockApiError(
	page: Page,
	urlPattern: string,
	statusCode: number,
	errorMessage: string,
	errorCode?: string
): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await route.fulfill({
			status: statusCode,
			contentType: 'application/json',
			body: JSON.stringify({
				error: errorMessage,
				code: errorCode || `ERROR_${statusCode}`,
				status: statusCode,
			}),
		})
	})
}

/**
 * Mock an API endpoint to simulate a network failure
 */
export async function mockNetworkError(page: Page, urlPattern: string): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await route.abort('failed')
	})
}

/**
 * Mock an API endpoint to simulate a connection timeout
 */
export async function mockTimeout(
	page: Page,
	urlPattern: string,
	delayMs: number = 30000
): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await new Promise((resolve) => setTimeout(resolve, delayMs))
		await route.abort('timedout')
	})
}

/**
 * Mock an API endpoint to return empty data
 */
export async function mockEmptyResponse(page: Page, urlPattern: string): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ data: [], total: 0 }),
		})
	})
}

/**
 * Mock an API endpoint to return malformed JSON
 */
export async function mockMalformedJson(page: Page, urlPattern: string): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: 'not valid json{',
		})
	})
}

/**
 * Mock an API endpoint to fail on first request, then succeed on retry
 */
export async function mockFailThenSucceed(
	page: Page,
	urlPattern: string,
	failCount: number = 1
): Promise<void> {
	let requestCount = 0
	await page.route(urlPattern, async (route) => {
		requestCount++
		if (requestCount <= failCount) {
			await route.abort('failed')
		} else {
			await route.continue()
		}
	})
}

/**
 * Mock an API endpoint with slow response (for testing loading states)
 */
export async function mockSlowResponse(
	page: Page,
	urlPattern: string,
	delayMs: number = 2000
): Promise<void> {
	await page.route(urlPattern, async (route) => {
		await new Promise((resolve) => setTimeout(resolve, delayMs))
		await route.continue()
	})
}

/**
 * Clear all route mocks for the page
 */
export async function clearMocks(page: Page): Promise<void> {
	await page.unrouteAll()
}
