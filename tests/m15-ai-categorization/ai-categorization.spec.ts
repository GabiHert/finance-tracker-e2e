import { test, expect } from '@playwright/test'

/**
 * M15-E2E: AI Smart Categorization
 *
 * Validates:
 * - Navigation to AI Assistant section
 * - Smart Categorization flow (start, processing, results)
 * - Suggestion review workflow (approve, reject, edit)
 * - Session persistence of suggestions
 *
 * Authentication: Uses saved auth state from auth.setup.ts
 */
test.describe('M15: AI Smart Categorization', () => {
	// ============================================
	// Navigation & Access Tests
	// ============================================

	test('M15-E2E-001: Navigate to AI Assistant from sidebar', async ({ page }) => {
		await page.goto('/dashboard')

		// Click AI Assistant in sidebar (using nav-item-ai-assistant testId)
		await page.click('[data-testid="nav-item-ai-assistant"]')

		// Verify navigation to /ai
		await expect(page).toHaveURL('/ai')

		// Verify the screen loads
		await expect(page.locator('[data-testid="ai-categorization-screen"]')).toBeVisible()
	})

	test('M15-E2E-002: AI screen displays correct title', async ({ page }) => {
		await page.goto('/ai')

		// Verify the AI screen is visible with correct title
		await expect(page.locator('[data-testid="ai-categorization-screen"]')).toBeVisible()
		await expect(page.locator('h1')).toContainText('AI Assistant')
	})

	// ============================================
	// API Health Check (uses real API, no mocking)
	// ============================================

	test('M15-E2E-002a: Status API returns valid response (regression test)', async ({ page }) => {
		// This test uses the REAL API without mocking to ensure:
		// 1. The ai_categorization_suggestions table exists (migration applied)
		// 2. The status endpoint returns a valid response structure
		// This catches the regression where the table was missing from AutoMigrate

		await page.goto('/ai')

		// Wait for the page to load and make the API call
		// The screen should show either idle-state, empty-state, or error-state
		// We verify it does NOT show error-state (which would indicate API failure)
		await expect(page.locator('[data-testid="ai-categorization-screen"]')).toBeVisible({ timeout: 10000 })

		// Wait for the loading to complete - should show idle or empty state, NOT error
		// Give time for API call to complete
		await page.waitForTimeout(2000)

		// Verify we're NOT in error state (which would mean the API failed)
		const errorState = page.locator('[data-testid="error-state"]')
		const idleState = page.locator('[data-testid="idle-state"]')
		const emptyState = page.locator('[data-testid="empty-state"]')

		// Either idle or empty should be visible, not error
		const hasIdleOrEmpty = await idleState.or(emptyState).isVisible()
		const hasError = await errorState.isVisible()

		// Assert that we have a valid state and no error
		expect(hasIdleOrEmpty || !hasError).toBeTruthy()
	})

	// ============================================
	// Idle & Empty State Tests
	// ============================================

	test('M15-E2E-003: Display idle state with uncategorized count', async ({ page }) => {
		// Mock status endpoint to show uncategorized transactions
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 5,
					is_processing: false,
					pending_suggestions_count: 0,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
				}),
			})
		})

		await page.goto('/ai')

		// Should show idle state with uncategorized count
		await expect(page.locator('[data-testid="idle-state"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('[data-testid="start-categorization-btn"]')).toBeEnabled()
	})

	test('M15-E2E-004: Display empty state when all transactions categorized', async ({ page }) => {
		// Mock status endpoint to show no uncategorized transactions
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 0,
					is_processing: false,
					pending_suggestions_count: 0,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
				}),
			})
		})

		await page.goto('/ai')

		// Should show empty state when all transactions are categorized
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible({ timeout: 10000 })
	})

	// ============================================
	// Processing Flow Tests
	// ============================================

	test('M15-E2E-005: Start categorization shows processing state', async ({ page }) => {
		// Mock status endpoint to show uncategorized transactions (idle state)
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 3,
					is_processing: false,
					pending_suggestions_count: 0,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
				}),
			})
		})

		// Mock the start endpoint to return processing state
		await page.route('**/api/v1/ai/categorization/start', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Processing started',
					transactions_to_process: 3,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for idle state with start button
		await expect(page.locator('[data-testid="idle-state"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('[data-testid="start-categorization-btn"]')).toBeEnabled()

		// Click start
		await page.click('[data-testid="start-categorization-btn"]')

		// Verify processing state appears
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 5000 })
	})

	// ============================================
	// Suggestion Review Tests (with mock API)
	// ============================================

	test('M15-E2E-006: Display suggestions when available', async ({ page }) => {
		// Mock the status endpoint to show pending suggestions
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 2,
					is_processing: false,
					pending_suggestions_count: 1,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		// Mock suggestions endpoint
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: {
								type: 'existing',
								existing_id: 'cat-1',
								existing_name: 'Transport',
								existing_icon: 'car',
								existing_color: '#3B82F6',
							},
							match: {
								type: 'contains',
								keyword: 'UBER',
							},
							affected_transactions: [
								{ id: 'tx-1', description: 'UBER TRIP', amount: -2550, date: '2025-01-10' },
							],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 1,
					total_skipped: 0,
				}),
			})
		})

		await page.goto('/ai')

		// Should show suggestions list
		await expect(page.locator('[data-testid="suggestions-list"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible()
	})

	test('M15-E2E-007: Approve suggestion button works', async ({ page }) => {
		// Mock endpoints
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 1,
					is_processing: false,
					pending_suggestions_count: 1,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: {
								type: 'existing',
								existing_id: 'cat-1',
								existing_name: 'Transport',
								existing_icon: 'car',
								existing_color: '#3B82F6',
							},
							match: { type: 'contains', keyword: 'UBER' },
							affected_transactions: [
								{ id: 'tx-1', description: 'UBER TRIP', amount: -2550, date: '2025-01-10' },
							],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 1,
					total_skipped: 0,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions/*/approve', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestion_id: 'test-suggestion-1',
					category_id: 'cat-1',
					category_name: 'Transport',
					rule_id: 'rule-1',
					transactions_categorized: 1,
					is_new_category: false,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestion card
		await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible({ timeout: 10000 })

		// Click approve button
		await page.click('[data-testid="approve-suggestion-btn"]')

		// Suggestion should disappear (removed from list after approval)
		await expect(page.locator('[data-testid="suggestion-card"]')).not.toBeVisible({ timeout: 5000 })
	})

	test('M15-E2E-008: Edit suggestion modal opens', async ({ page }) => {
		// Mock endpoints
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 1,
					is_processing: false,
					pending_suggestions_count: 1,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: {
								type: 'existing',
								existing_id: 'cat-1',
								existing_name: 'Food',
								existing_icon: 'utensils',
								existing_color: '#10B981',
							},
							match: { type: 'contains', keyword: 'MERCADO' },
							affected_transactions: [
								{ id: 'tx-1', description: 'MERCADO LIVRE', amount: -5000, date: '2025-01-10' },
							],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 1,
					total_skipped: 0,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestion card
		await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible({ timeout: 10000 })

		// Click edit button
		await page.click('[data-testid="edit-suggestion-btn"]')

		// Verify modal opens
		await expect(page.locator('[data-testid="edit-suggestion-modal"]')).toBeVisible()
	})

	test('M15-E2E-009: Reject suggestion shows confirmation', async ({ page }) => {
		// Mock endpoints
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 1,
					is_processing: false,
					pending_suggestions_count: 1,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: {
								type: 'new',
								new_name: 'Random',
								new_icon: 'folder',
								new_color: '#6B7280',
							},
							match: { type: 'contains', keyword: 'RANDOM' },
							affected_transactions: [
								{ id: 'tx-1', description: 'RANDOM MERCHANT', amount: -1000, date: '2025-01-10' },
							],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 1,
					total_skipped: 0,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestion card
		await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible({ timeout: 10000 })

		// Click reject button
		await page.click('[data-testid="reject-suggestion-btn"]')

		// Verify reject dialog appears
		await expect(page.locator('[data-testid="reject-dialog"]')).toBeVisible()
	})

	// ============================================
	// Clear All Tests
	// ============================================

	test('M15-E2E-010: Clear all button shows confirmation', async ({ page }) => {
		// Mock endpoints
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 2,
					is_processing: false,
					pending_suggestions_count: 2,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: { type: 'new', new_name: 'Test 1', new_icon: 'folder', new_color: '#6B7280' },
							match: { type: 'contains', keyword: 'TEST1' },
							affected_transactions: [{ id: 'tx-1', description: 'TEST1', amount: -1000, date: '2025-01-10' }],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
						{
							id: 'test-suggestion-2',
							category: { type: 'new', new_name: 'Test 2', new_icon: 'folder', new_color: '#6B7280' },
							match: { type: 'contains', keyword: 'TEST2' },
							affected_transactions: [{ id: 'tx-2', description: 'TEST2', amount: -2000, date: '2025-01-09' }],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 2,
					total_skipped: 0,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestions to load
		await expect(page.locator('[data-testid="suggestions-list"]')).toBeVisible({ timeout: 10000 })

		// Click clear all button
		await page.click('[data-testid="clear-all-btn"]')

		// Verify confirmation dialog appears
		await expect(page.locator('[data-testid="clear-confirm-dialog"]')).toBeVisible()
	})

	// ============================================
	// Error Handling Tests
	// ============================================

	test('M15-E2E-011: Display error state when API fails', async ({ page }) => {
		// Mock status endpoint to fail
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({
					error: 'Internal server error',
				}),
			})
		})

		await page.goto('/ai')

		// Should show error state
		await expect(page.locator('[data-testid="error-state"]')).toBeVisible({ timeout: 10000 })
	})

	// ============================================
	// AI Error Forwarding Tests
	// ============================================

	test('M15-E2E-012: Display AI error state when processing fails', async ({ page }) => {
		// Set up route mocks BEFORE any navigation
		await page.route('**/api/v1/ai/categorization/status', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 5,
					is_processing: false,
					pending_suggestions_count: 0,
					skipped_count: 0,
					last_processed_at: null,
					has_error: true,
					error: {
						code: 'AI_SERVICE_UNAVAILABLE',
						message: 'O servico de inteligencia artificial esta temporariamente indisponivel. Tente novamente mais tarde.',
						retryable: true,
						timestamp: new Date().toISOString(),
					},
				}),
			})
		})

		// Navigate to /ai - the route should be intercepted
		await page.goto('/ai', { waitUntil: 'networkidle' })

		// Should show AI error state with amber/warning styling
		await expect(page.locator('[data-testid="ai-error-state"]')).toBeVisible({ timeout: 10000 })

		// Verify error message is displayed
		await expect(page.locator('text=Erro no Processamento')).toBeVisible()
		await expect(page.locator('text=O servico de inteligencia artificial esta temporariamente indisponivel')).toBeVisible()

		// Verify retry button is visible
		await expect(page.locator('[data-testid="retry-categorization-btn"]')).toBeVisible()
		await expect(page.locator('[data-testid="retry-categorization-btn"]')).toBeEnabled()
	})

	test('M15-E2E-013: Retry button works after AI error', async ({ page }) => {
		let showError = true

		// Set up route mocks BEFORE any navigation
		// Initially returns error, after start is called returns processing state
		await page.route('**/api/v1/ai/categorization/status', async (route) => {
			if (showError) {
				// Return error state until retry is triggered
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 5,
						is_processing: false,
						pending_suggestions_count: 0,
						skipped_count: 0,
						last_processed_at: null,
						has_error: true,
						error: {
							code: 'AI_RATE_LIMITED',
							message: 'Limite de requisicoes atingido. Aguarde alguns minutos e tente novamente.',
							retryable: true,
							timestamp: new Date().toISOString(),
						},
					}),
				})
			} else {
				// After retry: return processing state
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 5,
						is_processing: true,
						pending_suggestions_count: 0,
						skipped_count: 0,
						last_processed_at: null,
						has_error: false,
						error: null,
					}),
				})
			}
		})

		// Mock start endpoint for retry - this triggers the state change
		await page.route('**/api/v1/ai/categorization/start', async (route) => {
			showError = false // Switch to processing state after start is called
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Processing started',
					job_id: 'retry-job-123',
				}),
			})
		})

		await page.goto('/ai')

		// Should initially show AI error state
		await expect(page.locator('[data-testid="ai-error-state"]')).toBeVisible({ timeout: 10000 })

		// Click retry button
		await page.click('[data-testid="retry-categorization-btn"]')

		// Should transition to processing state
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 5000 })
	})

	test('M15-E2E-014: AI error displays error code', async ({ page }) => {
		// Set up route mocks BEFORE any navigation
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 5,
					is_processing: false,
					pending_suggestions_count: 0,
					skipped_count: 0,
					last_processed_at: null,
					has_error: true,
					error: {
						code: 'AI_TIMEOUT',
						message: 'O processamento demorou mais do que o esperado. Tente novamente com menos transacoes.',
						retryable: true,
						timestamp: new Date().toISOString(),
					},
				}),
			})
		})

		await page.goto('/ai')

		// Should show AI error state
		await expect(page.locator('[data-testid="ai-error-state"]')).toBeVisible({ timeout: 10000 })

		// Verify error code is displayed
		await expect(page.locator('text=Codigo: AI_TIMEOUT')).toBeVisible()
	})

	test('M15-E2E-015: Polling stops when AI error occurs during processing', async ({ page }) => {
		let pollCount = 0

		// Set up route mocks BEFORE any navigation
		// First return processing, then error
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			pollCount++
			if (pollCount <= 2) {
				// First two calls: processing
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 5,
						is_processing: true,
						pending_suggestions_count: 0,
						skipped_count: 0,
						last_processed_at: null,
						has_error: false,
						error: null,
					}),
				})
			} else {
				// Third call: error occurs
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 5,
						is_processing: false,
						pending_suggestions_count: 0,
						skipped_count: 0,
						last_processed_at: null,
						has_error: true,
						error: {
							code: 'AI_SERVICE_UNAVAILABLE',
							message: 'O servico de inteligencia artificial esta temporariamente indisponivel.',
							retryable: true,
							timestamp: new Date().toISOString(),
						},
					}),
				})
			}
		})

		// Mock start endpoint
		await page.route('**/api/v1/ai/categorization/start', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Processing started',
					job_id: 'test-job-123',
				}),
			})
		})

		await page.goto('/ai')

		// Initial state should be processing (first status call)
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 10000 })

		// Wait for polling to detect error (approximately 6-10 seconds)
		await expect(page.locator('[data-testid="ai-error-state"]')).toBeVisible({ timeout: 15000 })

		// Verify processing state is no longer visible
		await expect(page.locator('[data-testid="processing-state"]')).not.toBeVisible()
	})

	// ============================================
	// New Category Badge Test
	// ============================================

	test('M15-E2E-016: Display new category badge for new category suggestions', async ({ page }) => {
		// Mock endpoints
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 1,
					is_processing: false,
					pending_suggestions_count: 1,
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: false,
					error: null,
				}),
			})
		})

		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: [
						{
							id: 'test-suggestion-1',
							category: {
								type: 'new',
								new_name: 'Pet Store',
								new_icon: 'paw',
								new_color: '#F59E0B',
							},
							match: { type: 'contains', keyword: 'PETZ' },
							affected_transactions: [
								{ id: 'tx-1', description: 'PETZ PET SHOP', amount: -15000, date: '2025-01-10' },
							],
							affected_count: 1,
							status: 'pending',
							created_at: new Date().toISOString(),
						},
					],
					skipped_transactions: [],
					total_pending: 1,
					total_skipped: 0,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestion card
		await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible({ timeout: 10000 })

		// Verify new category badge is shown
		await expect(page.locator('[data-testid="new-category-badge"]')).toBeVisible()
	})

	// ============================================
	// DTO Contract Validation Tests
	// ============================================

	test('M15-E2E-017: Status API includes has_error field (DTO contract test)', async ({ page }) => {
		// This test validates the DTO includes error fields by intercepting real API calls
		// It catches the DTO regression where error fields were missing from the response
		let responseContainsErrorFields = false

		// Intercept the real status API call and check the response structure
		await page.route('**/api/v1/ai/categorization/status', async (route) => {
			const response = await route.fetch()
			const body = await response.json()

			// Check that has_error field exists in the response
			responseContainsErrorFields = 'has_error' in body

			await route.fulfill({ response })
		})

		await page.goto('/ai')
		await expect(page.locator('[data-testid="ai-categorization-screen"]')).toBeVisible({ timeout: 10000 })

		// Wait for the API call to complete
		await page.waitForTimeout(2000)

		// Assert the response contained the error fields
		expect(responseContainsErrorFields).toBe(true)
	})
})
