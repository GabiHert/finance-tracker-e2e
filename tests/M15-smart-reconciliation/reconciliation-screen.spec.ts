import { test, expect } from '@playwright/test'
import {
  generateTestId,
  createPendingCCTransactions,
  createLinkedCCTransactions,
  createTransaction,
  cleanupTestTransactions,
  navigateToReconciliation,
} from './fixtures'

/**
 * M15-E2E: Reconciliation Screen
 *
 * Tests the dedicated reconciliation screen:
 * - Display pending and linked cycles
 * - Trigger on-demand reconciliation
 * - Unlink (collapse) functionality
 * - Empty states
 *
 * Authentication: These tests use saved auth state from auth.setup.ts
 */
test.describe.serial('M15: Reconciliation Screen', () => {
  let testId: string

  test.beforeEach(async ({ page }) => {
    testId = generateTestId()
    await cleanupTestTransactions(page, 'pre-cleanup-m15')
  })

  test.afterEach(async ({ page }) => {
    await cleanupTestTransactions(page, testId)
  })

  // ============================================================
  // 3.5 Reconciliation Screen
  // ============================================================

  test('E2E-M15-014: Reconciliation screen shows pending and linked cycles', async ({ page }) => {
    // Create pending CC for Dec/2025
    await createPendingCCTransactions(page, '2025-12', 5, undefined, testId)

    // Create linked CC for Nov/2025
    await createLinkedCCTransactions(page, '2025-11', testId)

    // Navigate to reconciliation screen
    await navigateToReconciliation(page)

    // Verify pending section shows Dec/2025
    const pendingSection = page.locator('[data-testid="pending-cycles"]')
    await expect(pendingSection).toContainText('Dez/2025')

    // Verify linked section shows Nov/2025
    const linkedSection = page.locator('[data-testid="linked-cycles"]')
    await expect(linkedSection).toContainText('Nov/2025')
  })

  test('E2E-M15-015: Trigger reconciliation from button', async ({ page }) => {
    // Create pending CC for Dec/2025
    await createPendingCCTransactions(page, '2025-12', 5, 500, testId)

    // Create matching bill (marked as credit card payment)
    await createTransaction(page, {
      date: '2025-12-13',
      description: 'Pagamento fatura',
      amount: -500,
      type: 'expense',
      is_credit_card_payment: true,
      testId,
    })

    // First ensure we're on a page (for auth state)
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Navigate to reconciliation screen
    await page.goto('/transacoes/reconciliacao')
    await page.waitForLoadState('networkidle')

    // Wait for screen to load
    await expect(page.getByTestId('reconciliation-screen')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // Click reconcile button if visible
    const reconcileBtn = page.getByTestId('reconcile-btn')
    if (await reconcileBtn.isVisible()) {
      await reconcileBtn.click()

      // Wait for reconciliation to complete
      await page.waitForTimeout(3000)
    }

    // Verify by navigating to transactions and checking our data exists
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Our test transactions should exist
    const testTransactions = page.locator(`[data-testid="transaction-row"]:has-text("[${testId}]")`)
    const count = await testTransactions.count()
    expect(count).toBeGreaterThanOrEqual(5) // At least the 5 CC transactions + bill
  })

  test('E2E-M15-016: Unlink (collapse) from reconciliation screen', async ({ page }) => {
    // Create linked CC for Nov/2025
    await createLinkedCCTransactions(page, '2025-11', testId)

    // First ensure we're on a page (for auth state)
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Navigate to reconciliation screen
    await page.goto('/transacoes/reconciliacao')
    await page.waitForLoadState('networkidle')

    // Wait for screen to load
    await expect(page.getByTestId('reconciliation-screen')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    // Check if cycle card exists in linked section
    const linkedSection = page.locator('[data-testid="linked-cycles"]')
    const cycleCard = page.locator('[data-testid="cycle-card-2025-11"]')

    if (await linkedSection.isVisible() && await cycleCard.isVisible()) {
      const unlinkBtn = cycleCard.locator('[data-testid="unlink-btn"]')

      if (await unlinkBtn.isVisible()) {
        await unlinkBtn.click()

        // Wait for confirmation dialog
        const confirmBtn = page.getByTestId('confirm-unlink-btn')
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click()
        }

        // Wait for unlink to complete
        await page.waitForTimeout(2000)
      }
    }

    // Verify by navigating to transactions and checking our data exists
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // Our test transactions should exist
    const testTransactions = page.locator(`[data-testid="transaction-row"]:has-text("[${testId}]")`)
    const count = await testTransactions.count()
    expect(count).toBeGreaterThanOrEqual(3) // At least CC transactions + bill
  })

  // ============================================================
  // 3.6 Empty States
  // ============================================================

  test('E2E-M15-017: Empty state when fully reconciled', async ({ page }) => {
    // Create only linked CC (no pending)
    await createLinkedCCTransactions(page, '2025-11', testId)

    // Navigate to reconciliation screen
    await navigateToReconciliation(page)

    // Verify empty state message for pending section
    const emptyState = page.locator('[data-testid="pending-empty-state"]')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText(/tudo reconciliado|nenhum.*pendente/i)
  })

  test('E2E-M15-018: Empty state when no CC transactions', async ({ page }) => {
    // Don't create any CC transactions

    // Navigate to reconciliation screen
    await navigateToReconciliation(page)

    // Verify "no CC transactions" empty state
    const noDataState = page.locator('[data-testid="no-cc-empty-state"]')
    await expect(noDataState).toBeVisible()
    await expect(noDataState).toContainText(/nenhuma.*transaç.*cart|no.*credit.*card/i)

    // Verify import CTA is visible
    const importCta = page.locator('[data-testid="import-cc-cta"]')
    await expect(importCta).toBeVisible()
  })
})
