# Integration Specification: Credit Card Statement Import

**Feature Code:** M12-cc-import
**Last Updated:** 2025-12-04

---

## 1. Overview

### 1.1 Integration Summary

This feature extends the existing transaction import flow with credit card-specific processing. The frontend parses Nubank credit card CSVs and sends transactions to the backend, which handles matching with existing "Pagamento de fatura" transactions and manages the linking/zeroing process.

### 1.2 API Base URL

```
/api/v1/transactions/credit-card
```

### 1.3 New vs Modified Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `POST /transactions/credit-card/preview` | New | Preview matches before import |
| `POST /transactions/credit-card/import` | New | Import with matching/linking |
| `POST /transactions/credit-card/collapse` | New | Reverse expansion |
| `GET /transactions/credit-card/status` | New | Get match status summary |
| `GET /transactions` | Modified | Add CC filters |

---

## 2. API Endpoints

### 2.1 POST /transactions/credit-card/preview

**Purpose:** Preview credit card import and show potential matches with existing bill payments.

**Authentication:** Required

**Request:**
```typescript
// Headers
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Body
{
  transactions: CreditCardTransaction[];
}

interface CreditCardTransaction {
  date: string;                    // ISO 8601: "2025-11-08"
  title: string;                   // "Bourbon Ipiranga"
  amount: number;                  // 794.15 (positive = expense)
  installment_current?: number;    // 1 (parsed from "Parcela 1/3")
  installment_total?: number;      // 3
  is_payment_received?: boolean;   // true if "Pagamento recebido"
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    matches: BillMatch[];
    unmatched_transactions: number;
    total_cc_amount: number;
    warnings: string[];
  }
}

interface BillMatch {
  bill_transaction_id: string;     // UUID of "Pagamento de fatura"
  bill_date: string;               // "2025-10-31"
  bill_amount: number;             // 1124.77
  cc_total: number;                // 1130.45 (sum of matched CC transactions)
  difference: number;              // 5.68
  matched_transaction_count: number; // 47
  payment_received_date?: string;  // "2025-11-04" (from CC statement)
}
```

**Response (Error):**
```typescript
// Status: 400 | 401 | 422
{
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string; }[];
  }
}
```

**Error Codes:**
| Status | Code | When |
|--------|------|------|
| 400 | INVALID_FORMAT | CSV doesn't match expected format |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 422 | NO_TRANSACTIONS | Empty transaction list |

### 2.2 POST /transactions/credit-card/import

**Purpose:** Import credit card transactions and link them to bill payments.

**Authentication:** Required

**Request:**
```typescript
// Body
{
  transactions: CreditCardTransaction[];
  confirmed_matches: ConfirmedMatch[];  // User can override automatic matches
  skip_unmatched: boolean;              // If true, don't import unmatched transactions
}

interface ConfirmedMatch {
  bill_transaction_id: string;          // UUID of bill to link to
  payment_received_date: string;        // Date from CC statement
}
```

**Response (Success):**
```typescript
// Status: 201
{
  data: {
    imported_count: number;
    matched_count: number;
    unmatched_count: number;
    zeroed_bills: ZeroedBill[];
    warnings: string[];
  }
}

interface ZeroedBill {
  transaction_id: string;
  original_amount: number;
  linked_transactions: number;
}
```

**Response (Error):**
```typescript
// Status: 400 | 401 | 409 | 422
{
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string; }[];
  }
}
```

**Error Codes:**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 409 | ALREADY_EXPANDED | Bill already has linked CC transactions |
| 422 | BILL_NOT_FOUND | Referenced bill transaction doesn't exist |

### 2.3 POST /transactions/credit-card/collapse

**Purpose:** Reverse credit card expansion - delete CC transactions and restore original bill.

**Authentication:** Required

**Request:**
```typescript
// Body
{
  bill_transaction_id: string;    // UUID of the zeroed bill to restore
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    restored_amount: number;
    deleted_transactions: number;
    transaction_id: string;
  }
}
```

**Error Codes:**
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid token |
| 404 | NOT_FOUND | Bill transaction doesn't exist |
| 422 | NOT_EXPANDED | Bill is not in expanded state |

### 2.4 GET /transactions/credit-card/status

**Purpose:** Get credit card match status for dashboard display.

**Authentication:** Required

**Request:**
```typescript
// Query Parameters
{
  month?: string;     // "2025-11" (defaults to current month)
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    total_spending: number;        // Sum of all CC transactions
    matched_amount: number;        // CC transactions linked to bills
    unmatched_amount: number;      // CC transactions without bill links
    expanded_bills: number;        // Count of bills with CC details
    pending_bills: number;         // "Pagamento de fatura" without CC details
    has_mismatches: boolean;       // True if unmatched > 0
  }
}
```

### 2.5 GET /transactions (Modified)

**New Query Parameters:**

```typescript
{
  // Existing params...
  is_credit_card?: boolean;           // Filter CC transactions only
  credit_card_payment_id?: string;    // Filter by linked bill
  billing_cycle?: string;             // "2025-10"
  include_hidden?: boolean;           // Include hidden transactions (Pagamento recebido)
  is_expanded_bill?: boolean;         // Filter zeroed bill payments
}
```

**Modified Response (Transaction object):**

```typescript
interface Transaction {
  // Existing fields...
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id?: string;

  // New CC fields
  credit_card_payment_id?: string;    // Link to bill payment
  billing_cycle?: string;             // "2025-10"
  original_amount?: number;           // For zeroed bills
  is_credit_card_payment?: boolean;   // True for "Pagamento de fatura"
  expanded_at?: string;               // When CC details were imported
  installment_current?: number;       // 1
  installment_total?: number;         // 3
  is_hidden?: boolean;                // True for "Pagamento recebido"
  linked_transaction_count?: number;  // For expanded bills
}
```

---

## 3. State Management

### 3.1 Store Structure

```typescript
// Location: frontend/src/main/features/transactions/store/creditCardStore.ts

interface CreditCardState {
  // Import state
  importPreview: ImportPreview | null;
  isPreviewLoading: boolean;
  isImporting: boolean;
  importError: string | null;

  // Status state
  status: CreditCardStatus | null;
  isStatusLoading: boolean;

  // UI state
  dismissedMismatchBanner: boolean;
}

interface ImportPreview {
  matches: BillMatch[];
  unmatchedTransactionCount: number;
  totalCCAmount: number;
  warnings: string[];
}

interface CreditCardStatus {
  totalSpending: number;
  matchedAmount: number;
  unmatchedAmount: number;
  expandedBills: number;
  pendingBills: number;
  hasMismatches: boolean;
}
```

### 3.2 Actions

| Action | Trigger | API Call | State Update |
|--------|---------|----------|--------------|
| fetchPreview | Parse CC CSV | POST /preview | Set importPreview |
| importCreditCard | Confirm import | POST /import | Clear preview, refresh transactions |
| collapseExpansion | Click Collapse | POST /collapse | Refresh transactions |
| fetchStatus | Mount dashboard | GET /status | Set status |
| dismissBanner | Click X on banner | None | Set dismissedMismatchBanner |

### 3.3 Optimistic Updates

| Action | Optimistic Behavior | Rollback on Error |
|--------|---------------------|-------------------|
| collapse | Remove CC transactions from list | Restore transactions |
| dismissBanner | Hide banner immediately | Show banner again |

---

## 4. Error Handling

### 4.1 API Error Mapping

| Error Code | UI Response |
|------------|-------------|
| INVALID_FORMAT | Show error toast with format hints |
| ALREADY_EXPANDED | Show "Bill already expanded" message |
| BILL_NOT_FOUND | Show "Bill payment not found" message |
| NOT_EXPANDED | Show "Cannot collapse - bill not expanded" |
| UNAUTHORIZED | Redirect to login |

### 4.2 Network Errors

| Scenario | UI Response |
|----------|-------------|
| No connection | Show offline message, disable import |
| Timeout | Show retry button in modal |
| Rate limited | Show "too many requests" toast |

---

## 5. Data Transformations

### 5.1 CSV → Frontend

```typescript
// Location: frontend/src/main/features/transactions/utils/creditCardParser.ts

interface ParsedCCTransaction {
  date: Date;
  title: string;
  amount: number;
  installmentCurrent?: number;
  installmentTotal?: number;
  isPaymentReceived: boolean;
}

function parseCreditCardCSV(csvContent: string): ParsedCCTransaction[] {
  // Parse CSV with headers: date,title,amount
  // Date format: YYYY-MM-DD
  // Detect "Pagamento recebido" → isPaymentReceived = true
  // Parse installments: "Hospital Sao Lucas - Parcela 1/3" → {current: 1, total: 3}
  // Amount: positive = expense (flip sign), negative = payment/refund
}

function parseInstallment(title: string): { current?: number; total?: number } {
  const match = title.match(/Parcela (\d+)\/(\d+)/i);
  if (match) {
    return { current: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return {};
}
```

### 5.2 Frontend → API

```typescript
function transformCCTransactionToApi(tx: ParsedCCTransaction): CreditCardTransaction {
  return {
    date: tx.date.toISOString().split('T')[0],  // YYYY-MM-DD
    title: tx.title,
    amount: Math.abs(tx.amount),                 // Always positive
    installment_current: tx.installmentCurrent,
    installment_total: tx.installmentTotal,
    is_payment_received: tx.isPaymentReceived,
  };
}
```

### 5.3 API → Frontend

```typescript
function transformTransactionFromApi(apiTx: ApiTransaction): Transaction {
  return {
    // Existing transformations...

    // New CC fields
    creditCardPaymentId: apiTx.credit_card_payment_id,
    billingCycle: apiTx.billing_cycle,
    originalAmount: apiTx.original_amount,
    isCreditCardPayment: apiTx.is_credit_card_payment,
    expandedAt: apiTx.expanded_at ? new Date(apiTx.expanded_at) : undefined,
    installmentCurrent: apiTx.installment_current,
    installmentTotal: apiTx.installment_total,
    isHidden: apiTx.is_hidden,
    linkedTransactionCount: apiTx.linked_transaction_count,
  };
}
```

---

## 6. Caching Strategy

### 6.1 Cache Rules

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| CC Status | 1 minute | On import, collapse |
| Transaction list | 5 minutes | On import, collapse, category change |
| Import preview | Session only | On modal close |

### 6.2 Stale-While-Revalidate

- CC Status refetched on dashboard mount
- Transaction list refetched after any mutation

---

## 7. Real-time Updates

Not applicable for this feature. Match status updates when transactions are modified.

---

## 8. Testing Contracts

### 8.1 Mock Data

```typescript
// Location: frontend/src/test/mocks/creditCard.ts

export const mockCCTransaction: ParsedCCTransaction = {
  date: new Date('2025-11-08'),
  title: 'Bourbon Ipiranga',
  amount: 794.15,
  isPaymentReceived: false,
};

export const mockInstallmentTransaction: ParsedCCTransaction = {
  date: new Date('2025-11-08'),
  title: 'Hospital Sao Lucas da - Parcela 1/3',
  amount: 196.84,
  installmentCurrent: 1,
  installmentTotal: 3,
  isPaymentReceived: false,
};

export const mockPaymentReceived: ParsedCCTransaction = {
  date: new Date('2025-11-04'),
  title: 'Pagamento recebido',
  amount: -8235.79,
  isPaymentReceived: true,
};

export const mockBillMatch: BillMatch = {
  bill_transaction_id: 'abc-123',
  bill_date: '2025-10-31',
  bill_amount: 1124.77,
  cc_total: 1130.45,
  difference: 5.68,
  matched_transaction_count: 47,
  payment_received_date: '2025-11-04',
};

export const mockCCStatus: CreditCardStatus = {
  totalSpending: 8235.79,
  matchedAmount: 1178.20,
  unmatchedAmount: 7057.59,
  expandedBills: 2,
  pendingBills: 1,
  hasMismatches: true,
};
```

### 8.2 API Mocks for E2E

```typescript
// Location: e2e/mocks/creditCard.ts

export async function mockCCPreviewApi(page: Page) {
  await page.route('**/api/v1/transactions/credit-card/preview', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        data: {
          matches: [mockBillMatch],
          unmatched_transactions: 12,
          total_cc_amount: 8235.79,
          warnings: [],
        },
      }),
    });
  });
}

export async function mockCCImportApi(page: Page) {
  await page.route('**/api/v1/transactions/credit-card/import', (route) => {
    route.fulfill({
      status: 201,
      body: JSON.stringify({
        data: {
          imported_count: 47,
          matched_count: 35,
          unmatched_count: 12,
          zeroed_bills: [{
            transaction_id: 'abc-123',
            original_amount: 1124.77,
            linked_transactions: 35,
          }],
          warnings: [],
        },
      }),
    });
  });
}

export async function mockCCStatusApi(page: Page, status?: Partial<CreditCardStatus>) {
  await page.route('**/api/v1/transactions/credit-card/status*', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        data: { ...mockCCStatus, ...status },
      }),
    });
  });
}
```

---

## 9. Frontend File Structure

```
frontend/src/main/features/transactions/
├── api/
│   ├── transactions.ts           # Existing
│   └── creditCard.ts             # NEW - CC-specific API calls
├── components/
│   ├── ImportWizard.tsx          # MODIFIED - Add CC format
│   ├── CreditCardMatchPreview.tsx # NEW
│   ├── CreditCardBadge.tsx       # NEW
│   ├── InstallmentBadge.tsx      # NEW
│   ├── CreditCardStatusCard.tsx  # NEW - Dashboard card
│   ├── CCMismatchBanner.tsx      # NEW - Transactions banner
│   └── CollapseConfirmModal.tsx  # NEW
├── store/
│   ├── transactionsStore.ts      # Existing
│   └── creditCardStore.ts        # NEW
├── utils/
│   ├── csvParser.ts              # Existing
│   └── creditCardParser.ts       # NEW - CC CSV parsing
└── types.ts                      # MODIFIED - Add CC types
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/Finance-Tracker-Integration-TDD-v1.md`
