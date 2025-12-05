# Task: Fix Credit Card Import BillingCycle Bug and Create E2E Tests

## Overview

The credit card import feature fails with validation error because the frontend is not sending the required `billing_cycle` field to the backend API. Additionally, comprehensive E2E tests need to be created to validate the complete workflow.

**Goal:** Fix the billing_cycle field issue and create comprehensive E2E tests that validate the entire credit card import workflow using real CSV data.

---

## Current State Analysis

### What Exists
- **Frontend**: `frontend/src/main/features/credit-card/api/credit-card.ts` - API functions for CC import
- **Frontend**: `frontend/src/main/features/transactions/components/ImportWizard.tsx` - UI integration
- **Backend**: `backend/internal/integration/entrypoint/dto/credit_card.go` - DTOs with validation
- **E2E**: `e2e/tests/m12-cc-import/cc-import.spec.ts` - E2E test scaffolding (16 tests)
- **E2E**: `e2e/tests/m12-cc-import/fixtures.ts` - Test fixtures

### What's Broken
1. **Frontend API missing `billing_cycle` field**: The `previewCreditCardImport()` function doesn't include `billing_cycle` in the request body, but the backend requires it.

   **Error**: `Invalid request body: Key: 'ImportPreviewRequestDTO.BillingCycle' Error:Field validation for 'BillingCycle' failed on the 'required' tag`

2. **Frontend DTO mismatch**: The backend expects `description` but frontend sends `title`.

3. **E2E tests not using real CSV format**: Current fixtures don't match actual Nubank CSV structure.

---

## Execution Plan

### Phase 1: Fix Frontend API Bug (Critical)

#### 1.1 Update `credit-card.ts` to include `billing_cycle`

The billing cycle should be derived from the "Pagamento recebido" date in the transactions.

**File**: `frontend/src/main/features/credit-card/api/credit-card.ts`

**Change 1 - Add billing cycle extraction function**:
```typescript
// Add after existing transform functions (around line 113)

/**
 * Extract billing cycle from transactions.
 * Uses the "Pagamento recebido" date to determine the billing cycle.
 * Format: "YYYY-MM"
 */
function extractBillingCycle(transactions: CreditCardTransaction[]): string {
	// Find "Pagamento recebido" transaction
	const paymentReceived = transactions.find(tx => tx.isPaymentReceived)

	if (paymentReceived) {
		// Use the date of "Pagamento recebido" for billing cycle
		// Format: "YYYY-MM-DD" -> "YYYY-MM"
		return paymentReceived.date.substring(0, 7)
	}

	// Fallback: use the most recent transaction date
	if (transactions.length > 0) {
		// Sort by date descending and take the first
		const sortedDates = transactions
			.map(tx => tx.date)
			.sort((a, b) => b.localeCompare(a))
		return sortedDates[0].substring(0, 7)
	}

	// Last resort: use current month
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
```

**Change 2 - Update `transformTransactionToApi` to use `description`**:
```typescript
// Update the existing function (around line 115-124)
function transformTransactionToApi(tx: CreditCardTransaction): Record<string, unknown> {
	return {
		date: tx.date,
		description: tx.title,  // Backend expects "description", not "title"
		amount: Math.abs(tx.amount),
		installment_current: tx.installmentCurrent,
		installment_total: tx.installmentTotal,
		is_payment_received: tx.isPaymentReceived,
	}
}
```

**Change 3 - Update `previewCreditCardImport` to include billing_cycle**:
```typescript
// Update the existing function (around line 131-151)
export async function previewCreditCardImport(
	transactions: CreditCardTransaction[]
): Promise<ImportPreview> {
	const billingCycle = extractBillingCycle(transactions)

	const response = await authenticatedFetch(
		`${API_BASE}/transactions/credit-card/preview`,
		{
			method: 'POST',
			body: JSON.stringify({
				billing_cycle: billingCycle,
				transactions: transactions.map(transformTransactionToApi),
			}),
		}
	)

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Erro ao analisar transacoes' }))
		throw new Error(error.error || error.message || 'Erro ao analisar transacoes do cartao')
	}

	const data = await response.json()
	return transformImportPreview(data.data || data)
}
```

**Change 4 - Update `importCreditCardTransactions` to include billing_cycle**:
```typescript
// Update the existing function (around line 156-192)
export async function importCreditCardTransactions(
	transactions: CreditCardTransaction[],
	confirmedMatches: ConfirmedMatch[],
	skipUnmatched: boolean = false
): Promise<ImportResult> {
	const billingCycle = extractBillingCycle(transactions)

	const response = await authenticatedFetch(
		`${API_BASE}/transactions/credit-card/import`,
		{
			method: 'POST',
			body: JSON.stringify({
				billing_cycle: billingCycle,
				bill_payment_id: confirmedMatches.length > 0 ? confirmedMatches[0].billTransactionId : '',
				transactions: transactions.map(transformTransactionToApi),
				apply_auto_category: true,
			}),
		}
	)

	// ... rest of error handling
}
```

### Phase 2: Create Comprehensive E2E Tests

#### 2.1 Update Test Fixtures with Real CSV Data

**File**: `e2e/tests/m12-cc-import/fixtures.ts`

Replace sample CSV data with realistic data based on the actual Nubank CSV:

```typescript
// e2e/tests/m12-cc-import/fixtures.ts

import { test as base, Page, expect } from '@playwright/test'

// ============================================================
// Real Nubank CSV Data (based on actual export)
// ============================================================

export const realNubankCSV = `date,title,amount
2025-12-03,Zaffari Cabral,44.90
2025-12-02,Coollab,10.00
2025-12-02,Espaco,6.00
2025-12-01,Bourbon Ipiranga,587.09
2025-12-01,Ifd*Parrilla Del Sur A,172.87
2025-11-30,Stb*Alpina Presentes L,25.99
2025-11-30,Adriano Antonio Schnei,164.71
2025-11-30,Amazonmktplc*Guilherme,68.00
2025-11-28,Z Cafe,44.40
2025-11-28,Comercial de Combustiv,236.83
2025-11-26,Oh Bruder - Bela Vista,88.88
2025-11-24,Ifd*Sul Calabria Pizza,89.79
2025-11-23,Estacao,90.00
2025-11-23,Bourbon Ipiranga,327.60
2025-11-22,Apple.Com/Bill,34.90
2025-11-21,Ifd*Galeteria Mm Teres,133.49
2025-11-21,Uber* Trip,10.98
2025-11-17,Amazon,100.52
2025-11-17,Locale Poa,353.69
2025-11-16,Zaffari Ipiranga,347.46
2025-11-15,Estorno de compra,-253.82
2025-11-14,Bourbon Ipiranga,620.73
2025-11-11,Bolha Azul,140.00
2025-11-10,Espaco de Cinema Sul,50.00
2025-11-10,Bourbon Country,171.38
2025-11-09,Kampeki,174.01
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-08,Bourbon Ipiranga,794.15
2025-11-07,Mercadolivre*Mercadol - Parcela 1/6,55.04
2025-11-07,Lugardepetclinica,245.00
2025-11-06,Mercado Silva,8.99
2025-11-06,Aloha Petshop,89.90
2025-11-04,Pagamento recebido,-8235.79
2025-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2025-11-04,Amazon - Parcela 2/6,47.90
2025-11-04,Midea Com - Parcela 1/12,253.82
2025-11-04,Giullia Magueta de Lim - Parcela 3/6,351.50
2025-11-04,Mp *Autoservico - Parcela 2/4,353.75`

// Simpler CSV for basic tests
export const sampleCCCSV = `date,title,amount
2025-11-08,Bourbon Ipiranga,794.15
2025-11-07,Mercado Silva,108.99
2025-11-06,Aloha Petshop,89.90
2025-11-04,Pagamento recebido,-993.04`

// CSV without "Pagamento recebido"
export const sampleCCCSVNoPayment = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,100.00`

// CSV with amount mismatch
export const sampleCCCSVMismatch = `date,title,amount
2025-11-06,Store Purchase,1130.00
2025-11-04,Pagamento recebido,-1130.00`

// Empty CSV (only headers)
export const emptyCSV = `date,title,amount`

// Invalid CSV format
export const invalidCSV = `wrong,columns,here
data1,data2,data3`

// CSV with installments
export const installmentCSV = `date,title,amount
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-08,Mercadolivre*Mercadol - Parcela 1/6,55.04
2025-11-04,Livraria da Travessa L - Parcela 2/3,79.30
2025-11-04,Pagamento recebido,-331.18`

// ============================================================
// Test Helpers
// ============================================================

export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
}

export async function createBillPayment(
  page: Page,
  data: { date: string; amount: number; testId: string }
): Promise<void> {
  // Navigate to transactions and create bill payment
  await page.goto('/transactions')
  await page.getByTestId('add-transaction-btn').click()

  // Fill form
  await page.getByTestId('transaction-date-input').fill(data.date)
  await page.getByTestId('transaction-description-input').fill(`Pagamento de fatura [${data.testId}]`)
  await page.getByTestId('transaction-amount-input').fill(Math.abs(data.amount).toString())

  // Select expense type
  await page.getByTestId('transaction-type-expense').click()

  // Submit
  await page.getByTestId('save-transaction-btn').click()
  await expect(page.getByTestId('toast-success')).toBeVisible({ timeout: 5000 })
}

export async function uploadCCCSV(page: Page, csvContent: string): Promise<void> {
  const buffer = Buffer.from(csvContent)
  await page.locator('input[type="file"]').setInputFiles({
    name: 'credit-card.csv',
    mimeType: 'text/csv',
    buffer,
  })
}

export async function selectCCFormat(page: Page): Promise<void> {
  await page.getByTestId('bank-format-selector').click()
  // Wait for dropdown to open and select CC option
  await page.getByRole('option', { name: /nubank.*cart[aã]o|credit.*card/i }).click()
}

export async function openImportWizard(page: Page): Promise<void> {
  await page.goto('/transactions')
  await page.getByTestId('import-transactions-btn').click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

export async function cleanupTestTransactions(page: Page, testId: string): Promise<void> {
  // This would ideally call an API to delete test transactions
  // For now, we'll skip cleanup since tests create unique data
  try {
    const response = await page.request.delete(`/api/v1/test/cleanup?testId=${testId}`)
    // Ignore errors - cleanup is best effort
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================
// Extended Test Fixture
// ============================================================

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Tests use saved auth state from auth.setup.ts
    await use(page)
  },
})

export { expect }
```

#### 2.2 Create Comprehensive E2E Test File

The existing `cc-import.spec.ts` should be updated to test real scenarios. Key tests to add:

1. **Test real Nubank CSV parsing**
2. **Test billing cycle extraction from "Pagamento recebido"**
3. **Test installment detection and display**
4. **Test refund handling (negative amounts)**
5. **Test API validation errors**

---

## Files to Create/Modify

### Modified Files:

1. **`frontend/src/main/features/credit-card/api/credit-card.ts`**
   - Add `extractBillingCycle()` function
   - Change `title` to `description` in API payload
   - Add `billing_cycle` to preview and import requests

2. **`e2e/tests/m12-cc-import/fixtures.ts`**
   - Replace sample CSV data with realistic Nubank data
   - Add more test CSV variations

3. **`e2e/tests/m12-cc-import/cc-import.spec.ts`**
   - Verify existing tests work with fixed API
   - Add tests for real CSV data scenarios

---

## Step-by-Step Execution Instructions

### Step 1: Fix the Frontend API

Edit `frontend/src/main/features/credit-card/api/credit-card.ts`:

1. Add the `extractBillingCycle()` function after the transform functions (around line 113)
2. Update `transformTransactionToApi()` to use `description` instead of `title`
3. Update `previewCreditCardImport()` to include `billing_cycle`
4. Update `importCreditCardTransactions()` to include `billing_cycle` and `bill_payment_id`

### Step 2: Test the Fix Manually

1. Restart the frontend: `docker restart finance-tracker-frontend`
2. Go to http://localhost:3000/transactions
3. Click Import, select "Nubank Cartao de Credito"
4. Upload the test CSV file
5. Verify no validation error appears
6. Click Next and verify the matching preview works

### Step 3: Update E2E Fixtures

Replace the content of `e2e/tests/m12-cc-import/fixtures.ts` with the updated fixtures that include real Nubank CSV data.

### Step 4: Run E2E Tests

```bash
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts --headed
```

### Step 5: Fix Any Failing Tests

Review test failures and adjust selectors or expectations as needed.

---

## Acceptance Criteria

- [ ] Frontend sends `billing_cycle` field in preview request
- [ ] Frontend sends `description` field (not `title`) in transaction data
- [ ] Frontend sends `billing_cycle` and `bill_payment_id` in import request
- [ ] Credit card import wizard completes without API validation errors
- [ ] Real Nubank CSV file imports successfully
- [ ] E2E tests pass for the happy path (E2E-CC-002)
- [ ] E2E tests pass for installment detection (E2E-CC-006)
- [ ] No regressions in existing transaction import functionality

---

## Related Documentation

- **Feature Spec:** `context/features/M12-cc-import/README.md`
- **Integration Contract:** `context/features/M12-cc-import/integration.md`
- **Backend DTO:** `backend/internal/integration/entrypoint/dto/credit_card.go`
- **E2E Scenarios:** `context/features/M12-cc-import/e2e-scenarios.md`

---

## Commands to Run

```bash
# 1. After fixing the frontend API, restart container
docker restart finance-tracker-frontend

# 2. Test manually in browser
open http://localhost:3000/transactions

# 3. Run E2E tests
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts

# 4. Run specific test
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts -g "E2E-CC-002"

# 5. Run with UI for debugging
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts --ui

# 6. TypeScript check
cd frontend && npx tsc --noEmit
```

---

## Test Data Reference

**Real Nubank CSV Summary (from `/Users/gabriel.herter/Downloads/Nubank_2025-12-11.csv`)**:
- Date range: 2025-11-04 to 2025-12-03
- "Pagamento recebido": 2025-11-04, R$ -8235.79
- Installment examples:
  - "Hospital Sao Lucas da - Parcela 1/3" R$ 196.84
  - "Mercadolivre*Mercadol - Parcela 1/6" R$ 55.04
  - "Livraria da Travessa L - Parcela 2/3" R$ 79.30
  - "Midea Com - Parcela 1/12" R$ 253.82
- Refund: "Estorno de compra" R$ -253.82
- Total transactions: ~85 lines
