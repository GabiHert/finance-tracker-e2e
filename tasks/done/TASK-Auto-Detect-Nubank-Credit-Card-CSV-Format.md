# Task: Auto-Detect Nubank Credit Card CSV Format

## Overview

The Import Transactions wizard fails to auto-detect Nubank credit card statement files. When a user uploads a file like `Nubank_2025-12-11.csv` with the credit card format, the system shows "Could not detect columns. Please use custom format." instead of automatically recognizing and routing to the credit card import flow.

**Goal:** Make the auto-detect feature recognize Nubank credit card CSV files and automatically switch to the credit card import workflow.

---

## Current State Analysis

### What Exists
- **File:** `frontend/src/main/features/transactions/components/ImportWizard.tsx`
- Bank format dropdown with "Auto Detect" as default (line 48)
- Auto-detect logic in `parseCSV` function (lines 130-138):
  ```typescript
  // Auto-detect columns
  dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'))
  descIdx = headersLower.findIndex(h => h.includes('descri') || h.includes('description'))
  amountIdx = headersLower.findIndex(h => h.includes('valor') || h.includes('amount') || h.includes('value'))
  ```
- Nubank credit card parser exists in `frontend/src/main/features/credit-card/utils/credit-card-parser.ts`
- Credit card workflow is triggered only when `bankFormat === 'nubank-cc'` (explicit selection)

### What's Missing/Broken

1. **Description column detection fails**: Nubank CC uses `title` not `descrição`/`description`
   - Current detection: looks for `descri` or `description`
   - Nubank CC header: `date,title,amount`
   - Result: `descIdx === -1` → throws error

2. **No format-specific auto-detection**: The system doesn't try to identify which bank format the file matches before parsing

3. **No automatic routing to CC workflow**: Even if columns were detected, it wouldn't route to the credit card import flow

### File Format Comparison

| Aspect | Nubank Checking | Nubank Credit Card |
|--------|-----------------|-------------------|
| Headers | `Data,Valor,Identificador,Descrição` | `date,title,amount` |
| Date format | DD/MM/YYYY | YYYY-MM-DD |
| Columns | 4 | 3 |
| Description col | `Descrição` | `title` |

---

## Execution Plan

### Phase 1: Implement Smart Auto-Detection
Add logic to identify file format based on header structure before parsing.

### Phase 2: Auto-Route to Credit Card Workflow
When Nubank CC format is detected, automatically switch `bankFormat` state and use CC parsing flow.

### Phase 3: Add E2E Tests
Test auto-detection with both Nubank checking and credit card files.

### Phase 4: Verification
Verify both file types are correctly auto-detected and processed.

---

## Detailed Specifications

### Detection Strategy

Create a function to identify the bank format from CSV headers:

```typescript
type DetectedFormat = 'nubank' | 'nubank-cc' | 'inter' | 'itau' | 'unknown'

const detectBankFormat = (headers: string[]): DetectedFormat => {
    const headersLower = headers.map(h => h.toLowerCase().trim())

    // Nubank Credit Card: exactly "date,title,amount"
    if (
        headersLower.includes('date') &&
        headersLower.includes('title') &&
        headersLower.includes('amount') &&
        headers.length === 3
    ) {
        return 'nubank-cc'
    }

    // Nubank Checking: "Data,Valor,Identificador,Descrição"
    if (
        headersLower.some(h => h === 'data') &&
        headersLower.some(h => h.includes('descri')) &&
        headersLower.some(h => h === 'valor')
    ) {
        return 'nubank'
    }

    // Banco Inter: has specific columns (implement if known)
    // Itau: has specific columns (implement if known)

    return 'unknown'
}
```

### Updated handleFileSelect Flow

```typescript
const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... existing file validation ...

    const content = await file.text()
    const lines = content.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())

    // Auto-detect bank format if set to 'auto'
    if (bankFormat === 'auto') {
        const detectedFormat = detectBankFormat(headers)

        if (detectedFormat === 'nubank-cc') {
            // Validate and use credit card workflow
            const validation = validateCreditCardCSV(content)
            if (validation.valid) {
                setBankFormat('nubank-cc')
                const parsedLines = parseCreditCardCSV(content)
                setCCParsedLines(parsedLines)
                const apiTransactions = toApiFormat(parsedLines)
                setCCTransactions(apiTransactions)
                setFile(selectedFile)
                setIsLoading(false)
                return
            }
        }

        if (detectedFormat !== 'unknown') {
            setBankFormat(detectedFormat)
        }
    }

    // Continue with existing logic...
}, [bankFormat, ...])
```

### Alternative: Extend Column Detection

A simpler fix is to add `title` to the description detection:

```typescript
// Auto-detect columns
dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'))
descIdx = headersLower.findIndex(h =>
    h.includes('descri') || h.includes('description') || h === 'title'
)
amountIdx = headersLower.findIndex(h =>
    h.includes('valor') || h.includes('amount') || h.includes('value')
)

// After detection, check if this is a credit card file
if (dateIdx !== -1 && descIdx !== -1 && amountIdx !== -1) {
    const isNubankCC =
        headersLower[dateIdx] === 'date' &&
        headersLower[descIdx] === 'title' &&
        headersLower[amountIdx] === 'amount'

    if (isNubankCC && bankFormat === 'auto') {
        // Switch to credit card flow
        setBankFormat('nubank-cc')
        // ... trigger CC parsing ...
        return
    }
}
```

---

## Files to Create/Modify

### Modified Files:
- `frontend/src/main/features/transactions/components/ImportWizard.tsx`
  - Add `detectBankFormat()` function
  - Update `handleFileSelect()` to auto-detect and route to CC workflow
  - Optionally update `parseCSV()` to include `title` in description detection

### Test Files:
- `e2e/tests/m5-import/import-auto-detect.spec.ts` (new or extend existing)

---

## Step-by-Step Execution Instructions

### Step 1: Add Format Detection Function

Add this function near the top of `ImportWizard.tsx` (after imports, before component):

```typescript
type DetectedFormat = 'nubank' | 'nubank-cc' | 'inter' | 'itau' | 'unknown'

const detectBankFormat = (headers: string[]): DetectedFormat => {
    const headersLower = headers.map(h => h.toLowerCase().trim())

    // Nubank Credit Card: exactly "date,title,amount" (3 columns)
    const hasDate = headersLower.includes('date')
    const hasTitle = headersLower.includes('title')
    const hasAmount = headersLower.includes('amount')

    if (hasDate && hasTitle && hasAmount && headers.length === 3) {
        return 'nubank-cc'
    }

    // Nubank Checking: "Data,Valor,Identificador,Descrição" (4 columns)
    const hasData = headersLower.some(h => h === 'data')
    const hasDescricao = headersLower.some(h => h.includes('descri'))
    const hasValor = headersLower.some(h => h === 'valor')

    if (hasData && hasDescricao && hasValor) {
        return 'nubank'
    }

    return 'unknown'
}
```

### Step 2: Update handleFileSelect for Auto-Detection

In the `handleFileSelect` function, after reading file content, add format detection logic:

```typescript
// After: const content = await selectedFile.text()
// Before: existing format handling

// Auto-detect format when set to 'auto'
if (bankFormat === 'auto') {
    const lines = content.trim().split('\n')
    if (lines.length >= 1) {
        const headers = lines[0].split(',').map(h => h.trim())
        const detectedFormat = detectBankFormat(headers)

        if (detectedFormat === 'nubank-cc') {
            // Use credit card workflow
            const validation = validateCreditCardCSV(content)
            if (!validation.valid) {
                setError(validation.error || 'Invalid credit card file format')
                setIsLoading(false)
                return
            }

            const parsedLines = parseCreditCardCSV(content)
            if (parsedLines.length === 0) {
                setError('No transactions found in credit card file.')
                setIsLoading(false)
                return
            }

            setCCParsedLines(parsedLines)
            const apiTransactions = toApiFormat(parsedLines)
            setCCTransactions(apiTransactions)
            setBankFormat('nubank-cc')
            setFile(selectedFile)
            setIsLoading(false)
            return
        }

        // For other detected formats, continue with normal flow
        // (optionally set bankFormat to detected value)
    }
}
```

### Step 3: Ensure Imports Exist

Make sure these imports are present at the top of the file:

```typescript
import {
    validateCreditCardCSV,
    parseCreditCardCSV,
    toApiFormat
} from '../../credit-card/utils/credit-card-parser'
```

### Step 4: Update parseCSV as Fallback

Also update the `parseCSV` function to include `title` in description detection as a fallback:

```typescript
// Line 132 - update description detection
descIdx = headersLower.findIndex(h =>
    h.includes('descri') || h.includes('description') || h === 'title'
)
```

### Step 5: Verify Build

```bash
cd frontend && npm run build
```

### Step 6: Visual Verification

1. Run the frontend dev server
2. Navigate to Transactions → Import
3. Select "Auto Detect" (default)
4. Upload a Nubank credit card CSV file
5. Verify it's detected and routed to credit card workflow
6. Upload a Nubank checking account CSV file
7. Verify it's detected and uses normal import flow

---

## Acceptance Criteria

- [ ] Uploading a Nubank credit card CSV with "Auto Detect" selected automatically detects the format
- [ ] Credit card files are routed to the credit card import workflow (with billing cycle input)
- [ ] Nubank checking account files continue to work with auto-detect
- [ ] Error message "Could not detect columns" no longer appears for valid Nubank CC files
- [ ] Bank format dropdown updates to show detected format after file upload
- [ ] Frontend build passes without errors
- [ ] No regressions in existing import functionality

---

## E2E Test Scenarios

### Test: Auto-detect Nubank Credit Card Format

```typescript
test('should auto-detect Nubank credit card CSV format', async ({ page }) => {
    // Navigate to import
    await page.goto('/transactions')
    await page.getByRole('button', { name: /import/i }).click()

    // Verify Auto Detect is selected by default
    await expect(page.getByText('Auto Detect')).toBeVisible()

    // Upload Nubank CC file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/nubank-cc-statement.csv')

    // Verify CC workflow is triggered (billing cycle input appears)
    await expect(page.getByLabel(/billing cycle|ciclo de faturamento/i)).toBeVisible()

    // Verify transactions are parsed
    await expect(page.getByText(/Zaffari|Mercado/i)).toBeVisible()
})

test('should auto-detect Nubank checking account CSV format', async ({ page }) => {
    await page.goto('/transactions')
    await page.getByRole('button', { name: /import/i }).click()

    // Upload Nubank checking file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/nubank-statement.csv')

    // Verify normal import workflow (no billing cycle input)
    await expect(page.getByLabel(/billing cycle/i)).not.toBeVisible()

    // Verify transactions are parsed
    await expect(page.getByTestId('transaction-row')).toHaveCount.greaterThan(0)
})
```

---

## Related Documentation

- **Feature Spec:** `context/features/M12-cc-import/README.md` - Credit card import feature overview
- **UI Spec:** `context/features/M12-cc-import/ui-requirements.md` - UI specifications
- **CC Parser:** `frontend/src/main/features/credit-card/utils/credit-card-parser.ts` - Existing parser code
- **E2E Tests:** `e2e/tests/m12-cc-import/` - Existing credit card import tests

---

## Commands to Run

```bash
# Verify frontend build
cd frontend && npm run build

# Run frontend dev server for visual testing
cd frontend && npm run dev

# Run E2E tests for import functionality
cd e2e && npx playwright test tests/m5-import/
cd e2e && npx playwright test tests/m12-cc-import/
```

---

## Test Fixture Files

### Nubank Credit Card (e2e/tests/fixtures/nubank-cc-statement.csv)
```csv
date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-04,Pagamento recebido,-8235.79
```

### Nubank Checking (e2e/tests/fixtures/nubank-statement.csv)
```csv
Data,Valor,Identificador,Descrição
03/10/2025,-200.00,68e003a6-xxxx,Transferência enviada pelo Pix
03/10/2025,7095.28,68e07b88-xxxx,Transferência recebida pelo Pix
```
