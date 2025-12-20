import { test, expect } from '@playwright/test'

/**
 * M15-PROG-E2E: Progressive AI Categorization
 *
 * Validates:
 * - Progress display during batch processing
 * - Incremental suggestion delivery
 * - Partial failure handling
 * - Auto-refresh behavior
 *
 * Reference: context/features/M15-ai-categorization/progressive-processing/e2e-scenarios.md
 */

// ============================================
// Test Data Factory
// ============================================

function createMockSuggestion(index: number) {
	return {
		id: `sugg-${index}`,
		category: {
			type: 'existing',
			existing_id: `cat-${index % 3}`,
			existing_name: ['Transporte', 'Alimentação', 'Lazer'][index % 3],
			existing_icon: ['car', 'utensils', 'gamepad'][index % 3],
			existing_color: ['#3B82F6', '#10B981', '#8B5CF6'][index % 3],
		},
		match: {
			type: 'contains',
			keyword: `KEYWORD${index}`,
		},
		affected_transactions: [
			{
				id: `txn-${index}-1`,
				description: `Transaction ${index} A`,
				amount: -2500,
				date: '2025-12-10',
			},
		],
		affected_count: 3,
		status: 'pending',
		created_at: new Date().toISOString(),
	}
}

function createBatchSuggestions(batchNumber: number, count: number = 10) {
	return Array.from({ length: count }, (_, i) => createMockSuggestion(batchNumber * 100 + i))
}

// ============================================
// Progressive Processing Tests
// ============================================

test.describe('M15-PROG: Progressive AI Categorization', () => {
	// ============================================
	// Progress Display Tests
	// ============================================

	test('E2E-PROG-001: Show progress bar during processing', async ({ page }) => {
		// Mock status endpoint to show processing with progress
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 118, // 158 - 40 processed
					is_processing: true,
					pending_suggestions_count: 30,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
					progress: {
						processed_transactions: 40,
						total_transactions: 158,
						current_batch: 1,
						total_batches: 4,
					},
				}),
			})
		})

		await page.goto('/ai')

		// Should show processing state with progress
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 10000 })

		// Verify progress bar is visible
		await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

		// Verify batch info is shown
		await expect(page.locator('text=/[Bb]atch 1.*4/')).toBeVisible()

		// Verify transaction count is shown
		await expect(page.locator('text=/40.*158/')).toBeVisible()
	})

	test('E2E-PROG-002: Progress updates as batches complete', async ({ page }) => {
		let statusCallCount = 0

		// Mock status endpoint with progressive updates
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			statusCallCount++
			const isFirstCall = statusCallCount <= 2

			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: isFirstCall ? 118 : 78,
					is_processing: true,
					pending_suggestions_count: isFirstCall ? 10 : 20,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
					progress: isFirstCall
						? {
								processed_transactions: 40,
								total_transactions: 158,
								current_batch: 1,
								total_batches: 4,
							}
						: {
								processed_transactions: 80,
								total_transactions: 158,
								current_batch: 2,
								total_batches: 4,
							},
				}),
			})
		})

		await page.goto('/ai')

		// Initial state
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('text=/[Bb]atch 1.*4/')).toBeVisible()

		// Wait for poll to update - use expect with timeout instead of waitForTimeout
		// Updated state
		await expect(page.locator('text=/[Bb]atch 2.*4/')).toBeVisible({ timeout: 6000 })
		await expect(page.locator('text=/80.*158/')).toBeVisible()
	})

	// ============================================
	// Incremental Suggestion Tests
	// ============================================

	test('E2E-PROG-003: Suggestions appear incrementally', async ({ page }) => {
		const batch1Suggestions = createBatchSuggestions(1, 5)
		const batch2Suggestions = createBatchSuggestions(2, 5)
		let statusCallCount = 0

		// Track suggestions call count via timing - first 2 seconds return batch1, after that return all
		const startTime = Date.now()

		// Mock status endpoint
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			statusCallCount++
			const isFirstBatch = statusCallCount <= 2

			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: isFirstBatch ? 118 : 78,
					is_processing: true,
					pending_suggestions_count: isFirstBatch ? 5 : 10,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
					progress: isFirstBatch
						? {
								processed_transactions: 40,
								total_transactions: 158,
								current_batch: 1,
								total_batches: 4,
							}
						: {
								processed_transactions: 80,
								total_transactions: 158,
								current_batch: 2,
								total_batches: 4,
							},
				}),
			})
		})

		// Mock suggestions endpoint - use time-based batching instead of call count
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			const elapsedMs = Date.now() - startTime
			// First 3 seconds return batch1 only, after that return all
			const isFirstBatch = elapsedMs < 3000

			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: isFirstBatch ? batch1Suggestions : [...batch1Suggestions, ...batch2Suggestions],
					skipped_transactions: [],
					total_pending: isFirstBatch ? 5 : 10,
					total_skipped: 0,
					is_partial: true,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for processing state and suggestions
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('[data-testid="suggestions-list"]')).toBeVisible({ timeout: 10000 })

		// First batch - should have 5 suggestions (within first 3 seconds)
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(5, { timeout: 2000 })

		// Wait for next batch - use expect with timeout instead of waitForTimeout
		// Both batches - should have 10 suggestions
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(10, { timeout: 6000 })
	})

	test('E2E-PROG-004: Can review suggestions while processing continues', async ({ page }) => {
		const suggestions = createBatchSuggestions(1, 3)

		// Mock status endpoint - always processing
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 118,
					is_processing: true,
					pending_suggestions_count: 3,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
					progress: {
						processed_transactions: 40,
						total_transactions: 158,
						current_batch: 1,
						total_batches: 4,
					},
				}),
			})
		})

		// Mock suggestions endpoint
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: suggestions,
					skipped_transactions: [],
					total_pending: 3,
					total_skipped: 0,
					is_partial: true,
				}),
			})
		})

		// Mock approve endpoint
		await page.route('**/api/v1/ai/categorization/suggestions/*/approve', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestion_id: 'sugg-100',
					category_id: 'cat-1',
					category_name: 'Transporte',
					rule_id: 'rule-1',
					transactions_categorized: 3,
					is_new_category: false,
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestions to load
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(3, { timeout: 10000 })

		// Approve first suggestion
		await page.click('[data-testid="suggestion-card"]:first-child [data-testid="approve-suggestion-btn"]')

		// Wait for approval to process
		await page.waitForLoadState('networkidle')

		// Processing should still be visible (progress bar)
		await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
	})

	// ============================================
	// Partial Failure Tests
	// ============================================

	test('E2E-PROG-005: Show partial results on failure', async ({ page }) => {
		const savedSuggestions = [...createBatchSuggestions(1, 10), ...createBatchSuggestions(2, 10)]

		// Mock status endpoint with partial failure
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 78, // Remaining uncategorized
					is_processing: false,
					pending_suggestions_count: 20, // Partial results saved
					skipped_count: 0,
					last_processed_at: new Date().toISOString(),
					has_error: true,
					error: {
						code: 'AI_RATE_LIMITED',
						message: 'Rate limited after batch 2. 20 suggestions saved.',
						retryable: true,
						timestamp: new Date().toISOString(),
					},
					progress: null,
				}),
			})
		})

		// Mock suggestions endpoint
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: savedSuggestions,
					skipped_transactions: [],
					total_pending: 20,
					total_skipped: 0,
					is_partial: false,
				}),
			})
		})

		await page.goto('/ai')

		// Should see saved suggestions
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(20, { timeout: 10000 })

		// Should see error banner (partial failure with saved suggestions)
		await expect(page.locator('[data-testid="partial-failure-banner"]')).toBeVisible()

		// Should indicate suggestions were saved
		await expect(page.locator('text=/20.*sugest/')).toBeVisible()

		// Should have retry button
		await expect(page.locator('[data-testid="retry-remaining-btn"]')).toBeVisible()
	})

	test('E2E-PROG-006: Retry after partial failure', async ({ page }) => {
		const existingSuggestions = createBatchSuggestions(1, 10)
		let hasRetried = false

		// Mock status endpoint - initially partial failure, then processing after retry
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			if (!hasRetried) {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 78,
						is_processing: false,
						pending_suggestions_count: 10,
						skipped_count: 0,
						last_processed_at: new Date().toISOString(),
						has_error: true,
						error: {
							code: 'AI_RATE_LIMITED',
							message: 'Rate limited. 10 suggestions saved.',
							retryable: true,
							timestamp: new Date().toISOString(),
						},
						progress: null,
					}),
				})
			} else {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						uncategorized_count: 78,
						is_processing: true,
						pending_suggestions_count: 10,
						skipped_count: 0,
						last_processed_at: null,
						has_error: false,
						error: null,
						progress: {
							processed_transactions: 0,
							total_transactions: 78,
							current_batch: 1,
							total_batches: 2,
						},
					}),
				})
			}
		})

		// Mock suggestions endpoint
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: existingSuggestions,
					skipped_transactions: [],
					total_pending: 10,
					total_skipped: 0,
					is_partial: hasRetried,
				}),
			})
		})

		// Mock start endpoint for retry
		await page.route('**/api/v1/ai/categorization/start', (route) => {
			hasRetried = true
			route.fulfill({
				status: 202,
				contentType: 'application/json',
				body: JSON.stringify({
					job_id: 'retry-job-456',
					status: 'processing',
					message: 'Categorization started for remaining 78 transactions',
				}),
			})
		})

		await page.goto('/ai')

		// Should see partial failure banner
		await expect(page.locator('[data-testid="partial-failure-banner"]')).toBeVisible({ timeout: 10000 })

		// Click retry
		await page.click('[data-testid="retry-remaining-btn"]')

		// Verify processing state is shown (wait for poll to update status with progress)
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 5000 })
		// Progress bar appears after first status poll returns progress info
		await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 8000 })

		// Existing suggestions should still be visible
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(10)
	})

	// ============================================
	// Completion Tests
	// ============================================

	test('E2E-PROG-007: Progress clears on completion', async ({ page }) => {
		const allSuggestions = [
			...createBatchSuggestions(1, 10),
			...createBatchSuggestions(2, 10),
			...createBatchSuggestions(3, 10),
		]

		// Use time-based mock: first 4 seconds processing, then complete
		const startTime = Date.now()

		// Mock status endpoint - processing then complete
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			const elapsedMs = Date.now() - startTime
			const isProcessing = elapsedMs < 4000

			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: isProcessing ? 38 : 0,
					is_processing: isProcessing,
					pending_suggestions_count: 30,
					skipped_count: 0,
					last_processed_at: isProcessing ? null : new Date().toISOString(),
					has_error: false,
					error: null,
					progress: isProcessing
						? {
								processed_transactions: 120,
								total_transactions: 158,
								current_batch: 3,
								total_batches: 4,
							}
						: null,
				}),
			})
		})

		// Mock suggestions endpoint
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: allSuggestions,
					skipped_transactions: [],
					total_pending: 30,
					total_skipped: 0,
					is_partial: false,
				}),
			})
		})

		await page.goto('/ai')

		// Initial state - processing
		await expect(page.locator('[data-testid="processing-state"]')).toBeVisible({ timeout: 10000 })
		await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

		// Wait for completion - use expect with extended timeout instead of waitForTimeout
		// Progress should be gone and suggestions state should be visible
		await expect(page.locator('[data-testid="progress-bar"]')).not.toBeVisible({ timeout: 15000 })

		// All suggestions visible
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(30)
	})

	// ============================================
	// Loading Indicator Tests
	// ============================================

	test('E2E-PROG-008: Show loading indicator for more suggestions', async ({ page }) => {
		const suggestions = createBatchSuggestions(1, 5)

		// Mock status endpoint - processing
		await page.route('**/api/v1/ai/categorization/status', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					uncategorized_count: 118,
					is_processing: true,
					pending_suggestions_count: 5,
					skipped_count: 0,
					last_processed_at: null,
					has_error: false,
					error: null,
					progress: {
						processed_transactions: 40,
						total_transactions: 158,
						current_batch: 1,
						total_batches: 4,
					},
				}),
			})
		})

		// Mock suggestions endpoint with is_partial flag
		await page.route('**/api/v1/ai/categorization/suggestions', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					suggestions: suggestions,
					skipped_transactions: [],
					total_pending: 5,
					total_skipped: 0,
					is_partial: true, // More coming
				}),
			})
		})

		await page.goto('/ai')

		// Wait for suggestions to load
		await expect(page.locator('[data-testid="suggestion-card"]')).toHaveCount(5, { timeout: 10000 })

		// Should show "more coming" indicator
		await expect(page.locator('[data-testid="more-suggestions-loading"]').or(page.locator('text=/mais.*caminho/'))).toBeVisible()
	})
})
