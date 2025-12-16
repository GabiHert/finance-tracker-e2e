import { test, expect } from '@playwright/test'
import {
  generateTestId,
  createPendingCCTransactions,
  cleanupTestTransactions,
  formatBillingCycleDisplay,
} from './fixtures'

/**
 * M15-E2E: Dashboard Pending Indicator & Transaction Badges
 *
 * Tests the visual indicators for pending CC reconciliation:
 * - Dashboard pending reconciliation banner
 * - Transaction list pending badges
 * - Tooltip explanations
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe.serial('M15: Pending Reconciliation Indicators', () => {
  let testId: string

  test.beforeEach(async ({ page }) => {
    testId = generateTestId()
    await cleanupTestTransactions(page, 'pre-cleanup-m15')
  })

  test.afterEach(async ({ page }) => {
    await cleanupTestTransactions(page, testId)
  })

  // ============================================================
  // 3.1 Dashboard Pending Indicator
  // ============================================================

  test('E2E-M15-001: No pending indicator when no pending CC transactions', async ({ page }) => {
    // Navigate to dashboard without creating any pending CC transactions
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Verify pending reconciliation banner is not visible
    const banner = page.locator('[data-testid="pending-reconciliation-banner"]')
    await expect(banner).not.toBeVisible()
  })

  test('E2E-M15-002: Show pending indicator with count', async ({ page }) => {
    // Create pending CC transactions for two months (current month and previous)
    await createPendingCCTransactions(page, '2025-12', 12, undefined, testId)
    await createPendingCCTransactions(page, '2025-11', 8, undefined, testId)

    // Wait a moment for DB to be consistent
    await page.waitForTimeout(500)

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Verify banner is visible
    const banner = page.locator('[data-testid="pending-reconciliation-banner"]')
    await expect(banner).toBeVisible()

    // Verify banner shows pending transactions
    // Note: The count depends on how many distinct billing cycles exist
    await expect(banner).toContainText(/mês|meses/i)

    // Verify at least one month name is displayed
    const hasDecOrNov = await banner.textContent()
    const hasMonth = hasDecOrNov?.includes('Dez/2025') || hasDecOrNov?.includes('Nov/2025')
    expect(hasMonth).toBeTruthy()
  })

  test('E2E-M15-003: Navigate to reconciliation from dashboard banner', async ({ page }) => {
    // Create pending CC transactions
    await createPendingCCTransactions(page, '2025-12', 5, undefined, testId)

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click "Ver mais" link
    const viewMoreLink = page.locator('[data-testid="pending-reconciliation-banner"] [data-testid="view-more-link"]')
    await viewMoreLink.click()

    // Verify navigation to reconciliation screen
    await expect(page).toHaveURL(/\/reconciliation|\/transacoes\/reconciliacao/)
  })

  // ============================================================
  // 3.2 Transaction List Pending Badges
  // ============================================================

  test('E2E-M15-004: Show pending badge on unlinked CC transactions', async ({ page }) => {
    // Create pending CC transactions
    await createPendingCCTransactions(page, '2025-12', 3, undefined, testId)

    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Find transaction rows with pending badges
    const pendingBadges = page.locator('[data-testid="pending-badge"]')
    await expect(pendingBadges).toHaveCount(3)

    // Verify badge text
    await expect(pendingBadges.first()).toContainText(/aguardando fatura/i)
  })

  test('E2E-M15-005: No badge on linked CC transactions', async ({ page }) => {
    // Import fixtures for creating linked transactions
    const { createLinkedCCTransactions } = await import('./fixtures')
    await createLinkedCCTransactions(page, '2025-11', testId)

    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Filter to find test transactions
    const testTransactions = page.locator(`[data-testid="transaction-row"]:has-text("[${testId}]")`)

    // Verify no pending badges on linked transactions
    const pendingBadges = testTransactions.locator('[data-testid="pending-badge"]')
    await expect(pendingBadges).toHaveCount(0)
  })

  test('E2E-M15-006: Badge tooltip shows explanation', async ({ page }) => {
    // Create pending CC transaction
    await createPendingCCTransactions(page, '2025-12', 1, undefined, testId)

    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Hover over pending badge
    const badge = page.locator('[data-testid="pending-badge"]').first()
    await badge.hover()

    // Verify tooltip appears with explanation
    const tooltip = page.locator('[role="tooltip"]')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText(/vinculad.*automaticamente|automaticamente.*vinculad/i)
  })
})
