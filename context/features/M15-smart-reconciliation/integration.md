# Integration Specification: Smart Credit Card Reconciliation

**Feature Code:** M15-smart-reconciliation
**Last Updated:** 2025-12-12

---

## 1. Overview

### 1.1 Integration Summary
This feature extends the existing M12-cc-import functionality to support order-independent imports with automatic reconciliation. The backend detects potential bill matches during imports and when bills are created, automatically linking CC transactions when confidence is high.

### 1.2 API Base URL
```
/api/v1/transactions/credit-card
```

### 1.3 Endpoint Summary

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/credit-card/preview` | POST | Modified | Add auto-match detection |
| `/credit-card/import` | POST | Modified | Support pending imports, auto-link |
| `/credit-card/reconcile` | POST | **New** | On-demand reconciliation |
| `/credit-card/pending` | GET | **New** | List pending billing cycles |
| `/credit-card/link` | POST | **New** | Manual link CC to bill |
| `/transactions` | POST | Modified | Trigger reconciliation on bill create |

---

## 2. New Endpoints

### 2.1 GET /credit-card/pending

**Purpose:** Get list of billing cycles with pending (unlinked) CC transactions.

**Authentication:** Required

**Request:**
```typescript
// Headers
{
  "Authorization": "Bearer {token}"
}

// Query Parameters
{
  limit?: number;    // Default: 12 (months)
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    pending_cycles: [
      {
        billing_cycle: string;       // "2024-11"
        display_name: string;        // "Nov/2024"
        transaction_count: number;   // 12
        total_amount: number;        // 123456 (cents)
        oldest_date: string;         // "2024-11-03" (ISO date)
        newest_date: string;         // "2024-11-28" (ISO date)
        potential_bills: [           // Pre-computed matches
          {
            id: string;
            date: string;
            description: string;
            amount: number;          // cents
            category_name: string | null;
            confidence: "high" | "medium" | "low";
            amount_difference: number;  // cents, signed
            amount_difference_percent: number;
          }
        ]
      }
    ],
    linked_cycles: [
      {
        billing_cycle: string;
        display_name: string;
        transaction_count: number;
        total_amount: number;
        bill: {
          id: string;
          date: string;
          description: string;
          original_amount: number;
          category_name: string | null;
        };
        amount_difference: number;
        has_mismatch: boolean;
      }
    ],
    summary: {
      total_pending: number;
      total_linked: number;
      months_covered: number;
    }
  }
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Missing/invalid token |

---

### 2.2 POST /credit-card/reconcile

**Purpose:** Trigger on-demand reconciliation for pending CC transactions.

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
  billing_cycle?: string;  // Optional: specific cycle to reconcile, e.g., "2024-11"
                           // If omitted, reconciles ALL pending cycles
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    reconciled: [
      {
        billing_cycle: string;
        bill_id: string;
        bill_description: string;
        transaction_count: number;
        confidence: "high" | "medium";
        amount_difference: number;
        auto_linked: true;
      }
    ],
    requires_selection: [
      {
        billing_cycle: string;
        potential_bills: [
          {
            id: string;
            date: string;
            description: string;
            amount: number;
            category_name: string | null;
            confidence: "high" | "medium" | "low";
            amount_difference: number;
            amount_difference_percent: number;
          }
        ]
      }
    ],
    no_match: [
      {
        billing_cycle: string;
        transaction_count: number;
        total_amount: number;
      }
    ],
    summary: {
      auto_linked: number;
      requires_selection: number;
      no_match: number;
    }
  }
}
```

**Reconciliation Logic:**
1. **High Confidence** (auto-link): Single match with exact amount or within tolerance
2. **Medium Confidence** (auto-link with notification): Single match with slight difference
3. **Low Confidence** (requires selection): Multiple matches or large difference
4. **No Match**: No potential bills found, remains pending

---

### 2.3 POST /credit-card/link

**Purpose:** Manually link a billing cycle to a specific bill payment.

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
  billing_cycle: string;      // "2024-11"
  bill_payment_id: string;    // UUID of the bill to link
  force?: boolean;            // Allow linking even with large amount mismatch
}
```

**Response (Success):**
```typescript
// Status: 200
{
  data: {
    billing_cycle: string;
    bill_id: string;
    transactions_linked: number;
    amount_difference: number;
    has_mismatch: boolean;
  }
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid billing_cycle format |
| 400 | AMOUNT_MISMATCH | Difference > tolerance and force != true |
| 404 | BILL_NOT_FOUND | bill_payment_id doesn't exist |
| 404 | PENDING_NOT_FOUND | No pending CC transactions for billing_cycle |
| 409 | ALREADY_LINKED | Billing cycle already has a linked bill |
| 409 | BILL_ALREADY_EXPANDED | Bill already linked to another cycle |

---

## 3. Modified Endpoints

### 3.1 POST /credit-card/preview (Modified)

**Changes:** Now includes auto-match detection and confidence levels.

**New Response Fields:**
```typescript
{
  data: {
    // Existing fields...
    transactions: [...],
    billing_cycle: string,

    // NEW: Auto-match information
    auto_match: {
      found: boolean;
      confidence: "high" | "medium" | "low" | null;
      bill: {
        id: string;
        date: string;
        description: string;
        amount: number;
        category_name: string | null;
      } | null;
      amount_difference: number | null;
      requires_selection: boolean;
      potential_bills: [...] | null;  // If multiple matches
    }
  }
}
```

---

### 3.2 POST /credit-card/import (Modified)

**Changes:**
- Auto-links when high/medium confidence match exists
- Imports as "pending" when no match found
- Returns different success messages based on scenario

**New Request Fields:**
```typescript
{
  // Existing fields...
  transactions: [...],
  billing_cycle: string,

  // MODIFIED: bill_payment_id now optional
  bill_payment_id?: string;     // If provided, uses this bill
                                // If omitted, auto-selects or imports as pending
  skip_auto_link?: boolean;     // Force import as pending even if match found
}
```

**New Response Fields:**
```typescript
{
  data: {
    // Existing fields...
    imported_count: number,
    duplicates_skipped: number,

    // NEW: Link status
    link_status: "linked" | "pending" | "skipped";
    linked_bill: {
      id: string;
      date: string;
      description: string;
      original_amount: number;
    } | null;
    auto_linked: boolean;        // True if system auto-selected the bill
    amount_difference: number | null;
    has_mismatch: boolean;
  }
}
```

---

### 3.3 POST /transactions (Modified)

**Changes:** After creating a transaction that looks like a bill payment, trigger reconciliation check.

**Trigger Conditions:**
- Transaction type is "expense"
- Description matches bill payment pattern: `pagamento.*fatura|fatura.*cartao|cartao.*credito`
- OR `is_credit_card_payment` flag is true

**Behavior:**
1. Create transaction normally
2. Search for pending CC transactions in matching billing cycle
3. If single high-confidence match found: auto-link and notify
4. If multiple matches or low confidence: do nothing (user can trigger manually)

**New Response Fields:**
```typescript
{
  data: {
    // Existing transaction fields...

    // NEW: Auto-reconciliation result (only if triggered)
    auto_reconciliation?: {
      triggered: boolean;
      linked_cycle: string | null;
      transactions_linked: number;
      confidence: "high" | "medium" | null;
    }
  }
}
```

---

## 4. Matching Algorithm

### 4.1 Tolerance Configuration

```typescript
const MATCHING_TOLERANCE = {
  // Amount tolerance: whichever is greater
  amount_percent: 0.02,     // 2%
  amount_absolute: 2000,    // R$ 20.00 in cents

  // Date tolerance
  date_days: 15,            // ±15 days from billing cycle end

  // Confidence thresholds
  high_confidence: {
    max_amount_diff_percent: 0.005,  // 0.5%
    max_amount_diff_absolute: 500,   // R$ 5.00
  },
  medium_confidence: {
    max_amount_diff_percent: 0.02,   // 2%
    max_amount_diff_absolute: 2000,  // R$ 20.00
  }
  // Beyond medium = low confidence
};
```

### 4.2 Matching Flow

```
1. Parse billing_cycle from CC transactions (e.g., "2024-11")

2. Calculate expected bill date range:
   - Start: first day of billing_cycle month - 15 days
   - End: last day of billing_cycle month + 15 days
   - Example for "2024-11": Oct 17 to Dec 15

3. Find potential bills:
   - Type: expense
   - Date: within range
   - Matches pattern OR is_credit_card_payment = true
   - Not already expanded (expanded_at IS NULL)

4. For each potential bill:
   a. Calculate amount difference vs CC total
   b. Determine if within tolerance
   c. Assign confidence level

5. Rank matches:
   - Exact amount match: highest
   - Within high confidence: very high
   - Within medium confidence: medium
   - Within tolerance but outside medium: low
   - Outside tolerance: excluded

6. Return results:
   - Single high/medium confidence match → auto-link eligible
   - Multiple matches → requires selection
   - No matches → pending
```

---

## 5. State Management

### 5.1 Store Updates

```typescript
// frontend/src/main/features/credit-card/store/creditCardStore.ts

interface CreditCardState {
  // Existing state...

  // NEW: Reconciliation state
  pendingCycles: PendingCycle[];
  linkedCycles: LinkedCycle[];
  reconciliationSummary: ReconciliationSummary | null;
  isReconciling: boolean;
  reconciliationError: string | null;
}

interface PendingCycle {
  billingCycle: string;
  displayName: string;
  transactionCount: number;
  totalAmount: number;
  potentialBills: PotentialBill[];
}

interface PotentialBill {
  id: string;
  date: Date;
  description: string;
  amount: number;
  categoryName: string | null;
  confidence: 'high' | 'medium' | 'low';
  amountDifference: number;
  amountDifferencePercent: number;
}

interface LinkedCycle {
  billingCycle: string;
  displayName: string;
  transactionCount: number;
  totalAmount: number;
  bill: Bill;
  amountDifference: number;
  hasMismatch: boolean;
}
```

### 5.2 Actions

| Action | Trigger | API Call | State Update |
|--------|---------|----------|--------------|
| fetchPendingReconciliations | Mount/Refresh | GET /pending | Set pendingCycles, linkedCycles |
| triggerReconciliation | Button click | POST /reconcile | Update linked/pending lists |
| manualLink | Dialog confirm | POST /link | Move from pending to linked |
| collapseLink | Unlink button | POST /collapse | Move from linked to pending |

---

## 6. Error Handling

### 6.1 API Error Mapping

| Error Code | UI Response |
|------------|-------------|
| VALIDATION_ERROR | Show inline field error |
| BILL_NOT_FOUND | Toast: "Fatura não encontrada" |
| PENDING_NOT_FOUND | Toast: "Nenhuma transação pendente para este período" |
| ALREADY_LINKED | Toast: "Este período já possui fatura vinculada" |
| BILL_ALREADY_EXPANDED | Toast: "Esta fatura já está vinculada a outro período" |
| AMOUNT_MISMATCH | Show confirmation dialog with force option |

### 6.2 Network Errors

| Scenario | UI Response |
|----------|-------------|
| Reconciliation timeout | Toast: "Reconciliação demorou muito. Tente novamente." |
| Network error | Toast: "Erro de conexão. Verifique sua internet." |

---

## 7. WebSocket Events (Optional Future Enhancement)

If real-time updates are desired:

| Event | Payload | Handler |
|-------|---------|---------|
| `reconciliation.auto_linked` | `{ billing_cycle, bill_id, count }` | Show toast, update store |
| `reconciliation.pending` | `{ billing_cycle, count }` | Update pending indicator |

---

## 8. Data Transformations

### 8.1 API → Frontend

```typescript
function transformPendingCycle(api: ApiPendingCycle): PendingCycle {
  return {
    billingCycle: api.billing_cycle,
    displayName: api.display_name,
    transactionCount: api.transaction_count,
    totalAmount: api.total_amount / 100,  // cents to decimal
    potentialBills: api.potential_bills.map(transformPotentialBill),
  };
}

function transformPotentialBill(api: ApiPotentialBill): PotentialBill {
  return {
    id: api.id,
    date: new Date(api.date),
    description: api.description,
    amount: api.amount / 100,
    categoryName: api.category_name,
    confidence: api.confidence,
    amountDifference: api.amount_difference / 100,
    amountDifferencePercent: api.amount_difference_percent,
  };
}
```

### 8.2 Frontend → API

```typescript
function transformLinkRequest(
  billingCycle: string,
  billId: string,
  force: boolean
): ApiLinkRequest {
  return {
    billing_cycle: billingCycle,
    bill_payment_id: billId,
    force,
  };
}
```

---

## 9. Caching Strategy

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| Pending cycles | No cache (always fresh) | N/A |
| Linked cycles | 5 minutes | On link/unlink |
| Potential bills | Per session | On bill create/delete |

---

## 10. Testing Contracts

### 10.1 Mock Data

```typescript
// frontend/src/test/mocks/reconciliation.ts

export const mockPendingCycle: PendingCycle = {
  billingCycle: '2024-11',
  displayName: 'Nov/2024',
  transactionCount: 12,
  totalAmount: 1234.56,
  potentialBills: [mockPotentialBill],
};

export const mockPotentialBill: PotentialBill = {
  id: 'bill-uuid-123',
  date: new Date('2024-12-05'),
  description: 'Pagamento de fatura Nubank',
  amount: 1234.56,
  categoryName: 'Cartão de Crédito',
  confidence: 'high',
  amountDifference: 0,
  amountDifferencePercent: 0,
};
```

### 10.2 API Mocks for E2E

```typescript
// e2e/mocks/reconciliation.ts

export async function mockPendingReconciliations(page: Page) {
  await page.route('**/api/v1/transactions/credit-card/pending', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        data: {
          pending_cycles: [mockApiPendingCycle],
          linked_cycles: [],
          summary: { total_pending: 1, total_linked: 0, months_covered: 1 },
        },
      }),
    });
  });
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Base Feature:** `context/features/M12-cc-import/integration.md`
- **Guide Reference:** `context/guides/Finance-Tracker-Integration-TDD-v1.md`
