# M6: Rules - Missing E2E Tests

## Missing Test Scenarios

### 1. Rule Auto-Application on Import
**Priority:** High
**File:** `e2e/tests/m6-rules/rule-application.spec.ts`

```typescript
test.describe('M6: Rule Application', () => {
  test.beforeEach(async ({ page }) => {
    // Create rule for UBER -> Transport
    await page.goto('/rules')
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option', { name: /transporte|transport/i }).click()
    await page.getByTestId('save-rule-btn').click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('M6-NEW-001: Auto-categorize imported transactions using rules', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    const csvContent = `Data,Descrição,Valor
2025-11-20,UBER TRIP,-45.90`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('import-next-btn').click()

    // Verify category is pre-selected as Transport
    const categorySelector = page.getByTestId('category-selector').first()
    await expect(categorySelector).toContainText(/transporte|transport/i)
  })

  test('M6-NEW-002: Suggest category when creating transaction', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('add-transaction-btn').click()

    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('UBER TRIP')

    // Wait for rule matching
    await page.waitForTimeout(500)

    // Category should be auto-selected
    const categorySelector = modalBody.getByTestId('transaction-category')
    await expect(categorySelector).toContainText(/transporte|transport/i)
  })
})
```

### 2. Conflicting Rules Priority
**Priority:** Medium
**File:** `e2e/tests/m6-rules/rule-conflicts.spec.ts`

```typescript
test.describe('M6: Rule Conflicts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rules')

    // Create broader rule: UBER -> Transport (priority 1)
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option', { name: /transporte|transport/i }).click()
    await page.getByTestId('save-rule-btn').click()

    // Create specific rule: UBER EATS -> Food (priority 2)
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER EATS')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option', { name: /alimenta[cç][aã]o|food/i }).click()
    await page.getByTestId('save-rule-btn').click()

    // Reorder: UBER EATS should have higher priority
    const firstHandle = page.getByTestId('drag-handle').nth(1) // UBER EATS
    const firstRule = page.getByTestId('rule-row').first()
    await firstHandle.dragTo(firstRule)
  })

  test('M6-NEW-003: Higher priority rule wins when multiple rules match', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('add-transaction-btn').click()

    const modalBody = page.getByTestId('modal-body')
    await modalBody.getByTestId('transaction-description').fill('UBER EATS ORDER')

    await page.waitForTimeout(500)

    // Should match UBER EATS rule (Food) not UBER rule (Transport)
    const categorySelector = modalBody.getByTestId('transaction-category')
    await expect(categorySelector).toContainText(/alimenta[cç][aã]o|food/i)
  })
})
```

### 3. Case Sensitivity
**Priority:** Medium
**File:** `e2e/tests/m6-rules/rule-application.spec.ts` (add)

```typescript
test('M6-NEW-004: Case-insensitive pattern matching', async ({ page }) => {
  // Create rule with lowercase
  await page.goto('/rules')
  await page.getByTestId('new-rule-btn').click()
  await page.getByTestId('match-type-selector').click()
  await page.getByRole('option', { name: /cont[eé]m/i }).click()
  await page.getByTestId('pattern-input').fill('netflix')
  await page.getByTestId('category-selector').click()
  await page.getByRole('option').first().click()
  await page.getByTestId('save-rule-btn').click()

  // Create transaction with uppercase
  await page.goto('/transactions')
  await page.getByTestId('add-transaction-btn').click()

  const modalBody = page.getByTestId('modal-body')
  await modalBody.getByTestId('transaction-description').fill('NETFLIX SUBSCRIPTION')

  await page.waitForTimeout(500)

  // Should match (case-insensitive)
  const categorySelector = modalBody.getByTestId('transaction-category')
  const value = await categorySelector.inputValue()
  expect(value).not.toBe('')
})
```

### 4. Special Characters in Pattern
**Priority:** Low
**File:** `e2e/tests/m6-rules/rule-patterns.spec.ts`

```typescript
test.describe('M6: Rule Patterns', () => {
  test('M6-NEW-005: Pattern with special characters', async ({ page }) => {
    await page.goto('/rules')
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /exato|exact/i }).click()
    await page.getByTestId('pattern-input').fill('R$100.00')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('save-rule-btn').click()

    // Verify regex preview escapes special chars
    await expect(page.getByTestId('rule-pattern').last()).toContainText('R\\$100\\.00')
  })
})
```

### 5. Bulk Apply Rules
**Priority:** Low
**File:** `e2e/tests/m6-rules/bulk-apply.spec.ts`

```typescript
test.describe('M6: Bulk Apply Rules', () => {
  test('M6-NEW-006: Apply rules to existing uncategorized transactions', async ({ page }) => {
    // First, create a rule
    await page.goto('/rules')
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('GROCERY')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option', { name: /alimenta|food/i }).click()
    await page.getByTestId('save-rule-btn').click()

    // Navigate to transactions and look for apply rules button
    await page.goto('/transactions')

    const applyRulesBtn = page.getByTestId('apply-rules-btn')
    if (await applyRulesBtn.isVisible()) {
      await applyRulesBtn.click()

      // Verify confirmation
      await expect(page.getByTestId('apply-rules-confirmation')).toBeVisible()
      await page.getByTestId('confirm-apply-rules-btn').click()

      // Verify success toast
      await expect(page.getByTestId('toast-success')).toBeVisible()
    }
  })
})
```

### 6. Duplicate Pattern Warning
**Priority:** Low
**File:** `e2e/tests/m6-rules/rule-validation.spec.ts`

```typescript
test.describe('M6: Rule Validation', () => {
  test('M6-NEW-007: Warn on duplicate pattern', async ({ page }) => {
    await page.goto('/rules')

    // Create first rule with UBER
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('save-rule-btn').click()

    // Try to create another rule with same pattern
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').nth(1).click()
    await page.getByTestId('save-rule-btn').click()

    // Should show warning
    await expect(page.getByTestId('duplicate-pattern-warning')).toBeVisible()
  })
})
```

---

## Implementation Notes

- Rule application tests need coordination between rules and transactions
- Priority tests require careful rule ordering
- Consider using API to seed rules for consistent tests
- Case sensitivity depends on backend regex implementation

## Related Review Document

See `review/M6-Rules-QA-Review.md` for full context.
