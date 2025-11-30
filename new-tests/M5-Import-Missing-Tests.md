# M5: Import - Missing E2E Tests

## Missing Test Scenarios

### 1. OFX File Import
**Priority:** High
**File:** `e2e/tests/m5-import/ofx-import.spec.ts`

```typescript
test.describe('M5: OFX Import', () => {
  test('M5-NEW-001: Import transactions from OFX file', async ({ page }) => {
    await page.goto('/transactions')

    // Open import modal
    await page.getByTestId('import-transactions-btn').click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Create mock OFX content
    const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20251120
<TRNAMT>-100.50
<NAME>Test OFX Transaction
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`

    // Upload OFX file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-import.ofx',
      mimeType: 'application/x-ofx',
      buffer: Buffer.from(ofxContent),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify parsed transaction
    await expect(page.getByTestId('import-preview-row')).toHaveCount(1)
    await expect(page.getByText('Test OFX Transaction')).toBeVisible()
  })
})
```

### 2. Auto-Apply Categories via Rules
**Priority:** High
**File:** `e2e/tests/m5-import/rule-integration.spec.ts`

```typescript
test.describe('M5: Rule Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Create a rule matching "UBER" to first available category
    await page.goto('/rules')
    await page.getByTestId('new-rule-btn').click()
    await page.getByTestId('match-type-selector').click()
    await page.getByRole('option', { name: /cont[eé]m/i }).click()
    await page.getByTestId('pattern-input').fill('UBER')
    await page.getByTestId('category-selector').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('save-rule-btn').click()
  })

  test('M5-NEW-002: Auto-categorize using existing rules', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    // Upload CSV with UBER transaction
    const csvContent = `Data,Descrição,Valor
2025-11-20,UBER TRIP,-45.90`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Wait for preview
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Go to step 2
    await page.getByTestId('import-next-btn').click()
    await expect(page.getByTestId('import-step-2')).toBeVisible()

    // Verify category is pre-selected based on rule
    const categorySelector = page.getByTestId('category-selector').first()
    const selectedValue = await categorySelector.inputValue()
    expect(selectedValue).not.toBe('')
  })
})
```

### 3. Bank-Specific Format
**Priority:** Medium
**File:** `e2e/tests/m5-import/bank-formats.spec.ts`

```typescript
test.describe('M5: Bank Formats', () => {
  test('M5-NEW-003: Import using Nubank format', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    // Select Nubank format
    await page.getByTestId('bank-format-selector').click()
    await page.getByRole('option', { name: /nubank/i }).click()

    // Nubank CSV format
    const csvContent = `date,title,amount
2025-11-20,Compra no Supermercado,-150.00
2025-11-19,Pix recebido,500.00`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'nubank-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Verify parsing
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('import-preview-row')).toHaveCount(2)
  })
})
```

### 4. Large File Import
**Priority:** Medium
**File:** `e2e/tests/m5-import/large-file.spec.ts`

```typescript
test.describe('M5: Large File Import', () => {
  test('M5-NEW-004: Import large CSV file with 500+ transactions', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    // Generate large CSV
    const rows = Array.from({ length: 500 }, (_, i) =>
      `2025-11-${String((i % 30) + 1).padStart(2, '0')},Transaction ${i + 1},-${(i + 1) * 10}.00`
    )
    const csvContent = `Data,Descrição,Valor\n${rows.join('\n')}`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Wait for preview with extended timeout
    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 30000 })

    // Verify count display
    await expect(page.getByTestId('import-row-count')).toContainText('500')
  })
})
```

### 5. Import Error Handling
**Priority:** Medium
**File:** `e2e/tests/m5-import/import-errors.spec.ts`

```typescript
test.describe('M5: Import Errors', () => {
  test('M5-NEW-005: Handle malformed CSV file', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    // Malformed CSV (missing columns)
    const csvContent = `Data,Descrição
2025-11-20,Test`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'malformed.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // Should show error message
    await expect(page.getByTestId('file-error-message')).toBeVisible()
    await expect(page.getByTestId('file-error-message')).toContainText(/coluna|column|valor|amount/i)
  })
})
```

### 6. Bulk Category Assignment
**Priority:** Low
**File:** `e2e/tests/m5-import/import.spec.ts` (add to existing)

```typescript
test('M5-NEW-006: Bulk assign category to all transactions', async ({ page }) => {
  await page.goto('/transactions')
  await page.getByTestId('import-transactions-btn').click()

  // Upload CSV
  const csvContent = `Data,Descrição,Valor
2025-11-20,Transaction 1,-100.00
2025-11-19,Transaction 2,-200.00
2025-11-18,Transaction 3,-300.00`

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvContent),
  })

  await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('import-next-btn').click()
  await expect(page.getByTestId('import-step-2')).toBeVisible()

  // Select "Apply to all"
  await page.getByTestId('apply-category-to-all').check()

  // Select category
  await page.getByTestId('bulk-category-selector').click()
  await page.getByRole('option').first().click()

  // All categories should be updated
  const categorySelectors = page.getByTestId('category-selector')
  const count = await categorySelectors.count()
  for (let i = 0; i < count; i++) {
    const value = await categorySelectors.nth(i).inputValue()
    expect(value).not.toBe('')
  }
})
```

### 7. Date Format Detection
**Priority:** Low
**File:** `e2e/tests/m5-import/date-formats.spec.ts`

```typescript
test.describe('M5: Date Formats', () => {
  test('M5-NEW-007: Parse different date formats', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByTestId('import-transactions-btn').click()

    // CSV with DD/MM/YYYY format
    const csvContent = `Data,Descrição,Valor
20/11/2025,Transaction 1,-100.00`

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    await expect(page.getByTestId('import-preview-table')).toBeVisible({ timeout: 10000 })

    // Verify date is correctly parsed and displayed
    const dateCell = page.getByTestId('preview-date').first()
    await expect(dateCell).toContainText('2025-11-20')
  })
})
```

---

## Implementation Notes

- OFX parsing may require specific library support
- Bank format tests need real bank export samples
- Large file tests should monitor performance
- Error handling should cover various malformed scenarios

## Related Review Document

See `review/M5-Import-QA-Review.md` for full context.
