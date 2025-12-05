# Backend TDD: Credit Card Statement Import

**Feature Code:** M12-cc-import
**Last Updated:** 2025-12-04

---

## 1. Overview

### 1.1 Domain Description

Credit Card Import extends the transaction domain to support detailed credit card statements. It introduces the concept of "expanding" a bill payment into individual transactions, maintaining a link between them for grouping and audit purposes.

### 1.2 Bounded Context

- **Transaction Aggregate**: Extended with CC-specific fields
- **Bill Payment**: A transaction that can be "expanded" into detailed CC transactions
- **Credit Card Transaction**: A transaction linked to a bill payment
- **Match**: Relationship between CC statement and bank statement bill payments

---

## 2. Database Schema

### 2.1 Migration: Add Credit Card Fields

```sql
-- Migration: 20251204_add_credit_card_fields.sql

ALTER TABLE transactions ADD COLUMN credit_card_payment_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN billing_cycle VARCHAR(7);
ALTER TABLE transactions ADD COLUMN original_amount DECIMAL(12,2);
ALTER TABLE transactions ADD COLUMN is_credit_card_payment BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN expanded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transactions ADD COLUMN installment_current INT;
ALTER TABLE transactions ADD COLUMN installment_total INT;
ALTER TABLE transactions ADD COLUMN is_hidden BOOLEAN DEFAULT false;

-- Indexes for efficient querying
CREATE INDEX idx_transactions_credit_card_payment_id ON transactions(credit_card_payment_id) WHERE credit_card_payment_id IS NOT NULL;
CREATE INDEX idx_transactions_billing_cycle ON transactions(billing_cycle) WHERE billing_cycle IS NOT NULL;
CREATE INDEX idx_transactions_is_credit_card_payment ON transactions(is_credit_card_payment) WHERE is_credit_card_payment = true;
CREATE INDEX idx_transactions_is_hidden ON transactions(is_hidden) WHERE is_hidden = true;

-- Constraint: installment_current must be <= installment_total
ALTER TABLE transactions ADD CONSTRAINT chk_installment_valid
  CHECK (installment_current IS NULL OR (installment_current > 0 AND installment_current <= installment_total));
```

### 2.2 Updated Transaction Table Structure

```sql
-- Complete transactions table with CC fields
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE,

    -- Credit Card fields
    credit_card_payment_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(7),                -- "2025-10"
    original_amount DECIMAL(12,2),           -- Preserved before zeroing
    is_credit_card_payment BOOLEAN DEFAULT false,
    expanded_at TIMESTAMP WITH TIME ZONE,    -- When CC details imported
    installment_current INT,                 -- 1
    installment_total INT,                   -- 3
    is_hidden BOOLEAN DEFAULT false,         -- For "Pagamento recebido"

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,     -- Soft delete

    -- Constraints
    CONSTRAINT chk_installment_valid CHECK (
        installment_current IS NULL OR
        (installment_current > 0 AND installment_current <= installment_total)
    )
);
```

### 2.3 Relationships

```
Transaction (Bill Payment)
├── has_many: CreditCardTransactions (via credit_card_payment_id)
└── fields: is_credit_card_payment=true, original_amount, expanded_at

Transaction (Credit Card)
├── belongs_to: BillPayment (credit_card_payment_id)
└── fields: billing_cycle, installment_current, installment_total
```

---

## 3. Domain Entity

### 3.1 Extended Transaction Entity

```go
// Location: backend/internal/domain/entity/transaction.go

package entity

import (
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

type Transaction struct {
    ID          uuid.UUID       `json:"id"`
    UserID      uuid.UUID       `json:"user_id"`
    Date        time.Time       `json:"date"`
    Description string          `json:"description"`
    Amount      decimal.Decimal `json:"amount"`
    Type        TransactionType `json:"type"`
    CategoryID  *uuid.UUID      `json:"category_id"`
    Notes       string          `json:"notes"`
    IsRecurring bool            `json:"is_recurring"`
    UploadedAt  *time.Time      `json:"uploaded_at"`

    // Credit Card fields
    CreditCardPaymentID *uuid.UUID      `json:"credit_card_payment_id"`
    BillingCycle        string          `json:"billing_cycle"`
    OriginalAmount      *decimal.Decimal `json:"original_amount"`
    IsCreditCardPayment bool            `json:"is_credit_card_payment"`
    ExpandedAt          *time.Time      `json:"expanded_at"`
    InstallmentCurrent  *int            `json:"installment_current"`
    InstallmentTotal    *int            `json:"installment_total"`
    IsHidden            bool            `json:"is_hidden"`

    // Computed (not stored)
    LinkedTransactionCount int `json:"linked_transaction_count,omitempty"`

    // Timestamps
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
    DeletedAt *time.Time `json:"deleted_at"`
}

// IsCreditCardTransaction returns true if this transaction is linked to a bill payment
func (t *Transaction) IsCreditCardTransaction() bool {
    return t.CreditCardPaymentID != nil
}

// IsExpanded returns true if this bill payment has been expanded
func (t *Transaction) IsExpanded() bool {
    return t.IsCreditCardPayment && t.ExpandedAt != nil
}

// HasInstallment returns true if this is an installment transaction
func (t *Transaction) HasInstallment() bool {
    return t.InstallmentCurrent != nil && t.InstallmentTotal != nil
}
```

### 3.2 Credit Card Import DTOs

```go
// Location: backend/internal/domain/dto/credit_card.go

package dto

import (
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

// CreditCardTransaction represents a parsed CC statement line
type CreditCardTransaction struct {
    Date               time.Time       `json:"date"`
    Title              string          `json:"title"`
    Amount             decimal.Decimal `json:"amount"`
    InstallmentCurrent *int            `json:"installment_current,omitempty"`
    InstallmentTotal   *int            `json:"installment_total,omitempty"`
    IsPaymentReceived  bool            `json:"is_payment_received"`
}

// BillMatch represents a potential match between CC and bank statement
type BillMatch struct {
    BillTransactionID       uuid.UUID       `json:"bill_transaction_id"`
    BillDate                time.Time       `json:"bill_date"`
    BillAmount              decimal.Decimal `json:"bill_amount"`
    CCTotal                 decimal.Decimal `json:"cc_total"`
    Difference              decimal.Decimal `json:"difference"`
    MatchedTransactionCount int             `json:"matched_transaction_count"`
    PaymentReceivedDate     *time.Time      `json:"payment_received_date,omitempty"`
}

// ImportPreviewResponse represents the preview before import
type ImportPreviewResponse struct {
    Matches                []BillMatch `json:"matches"`
    UnmatchedTransactions  int         `json:"unmatched_transactions"`
    TotalCCAmount          decimal.Decimal `json:"total_cc_amount"`
    Warnings               []string    `json:"warnings"`
}

// ImportResult represents the result after import
type ImportResult struct {
    ImportedCount   int           `json:"imported_count"`
    MatchedCount    int           `json:"matched_count"`
    UnmatchedCount  int           `json:"unmatched_count"`
    ZeroedBills     []ZeroedBill  `json:"zeroed_bills"`
    Warnings        []string      `json:"warnings"`
}

type ZeroedBill struct {
    TransactionID      uuid.UUID       `json:"transaction_id"`
    OriginalAmount     decimal.Decimal `json:"original_amount"`
    LinkedTransactions int             `json:"linked_transactions"`
}

// CreditCardStatus represents the match status for dashboard
type CreditCardStatus struct {
    TotalSpending   decimal.Decimal `json:"total_spending"`
    MatchedAmount   decimal.Decimal `json:"matched_amount"`
    UnmatchedAmount decimal.Decimal `json:"unmatched_amount"`
    ExpandedBills   int             `json:"expanded_bills"`
    PendingBills    int             `json:"pending_bills"`
    HasMismatches   bool            `json:"has_mismatches"`
}
```

---

## 4. Repository Interface

```go
// Location: backend/internal/application/creditcard/repository.go

package creditcard

import (
    "context"
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

type Repository interface {
    // Find bill payments that could match CC transactions
    FindPotentialBillPayments(ctx context.Context, userID uuid.UUID, startDate, endDate time.Time) ([]*entity.Transaction, error)

    // Get credit card transactions linked to a bill
    GetLinkedTransactions(ctx context.Context, billID uuid.UUID) ([]*entity.Transaction, error)

    // Bulk create credit card transactions
    BulkCreateCCTransactions(ctx context.Context, transactions []*entity.Transaction) error

    // Expand a bill payment (zero amount, set expanded_at)
    ExpandBillPayment(ctx context.Context, billID uuid.UUID, originalAmount decimal.Decimal) error

    // Collapse expansion (restore amount, delete linked transactions)
    CollapseExpansion(ctx context.Context, billID uuid.UUID) (int, error)

    // Get status summary for a month
    GetCreditCardStatus(ctx context.Context, userID uuid.UUID, month string) (*dto.CreditCardStatus, error)

    // Check if bill is already expanded
    IsBillExpanded(ctx context.Context, billID uuid.UUID) (bool, error)
}
```

---

## 5. Service Layer

```go
// Location: backend/internal/application/creditcard/service.go

package creditcard

import (
    "context"
    "time"
)

type Service struct {
    repo     Repository
    txRepo   TransactionRepository  // Existing transaction repo
    ruleRepo CategoryRuleRepository // For auto-categorization
}

func NewService(repo Repository, txRepo TransactionRepository, ruleRepo CategoryRuleRepository) *Service {
    return &Service{repo: repo, txRepo: txRepo, ruleRepo: ruleRepo}
}

// PreviewImport analyzes CC transactions and finds potential matches
func (s *Service) PreviewImport(ctx context.Context, userID uuid.UUID, transactions []dto.CreditCardTransaction) (*dto.ImportPreviewResponse, error) {
    // 1. Calculate date range from transactions
    // 2. Find "Pagamento de fatura" transactions in that range
    // 3. Find "Pagamento recebido" entries in CC statement
    // 4. Match by date proximity (±3 days) and amount
    // 5. Return matches and unmatched count
}

// Import creates CC transactions and links them to bills
func (s *Service) Import(ctx context.Context, userID uuid.UUID, input ImportInput) (*dto.ImportResult, error) {
    // 1. Validate input
    // 2. Create CC transactions with billing_cycle and credit_card_payment_id
    // 3. Apply auto-categorization rules
    // 4. Zero out matched bill payments (preserve original_amount)
    // 5. Create "Pagamento recebido" as hidden transaction
    // 6. Return result summary
}

// Collapse reverses an expansion
func (s *Service) Collapse(ctx context.Context, userID uuid.UUID, billID uuid.UUID) (*dto.CollapseResult, error) {
    // 1. Verify bill exists and belongs to user
    // 2. Verify bill is expanded
    // 3. Restore original amount
    // 4. Delete linked CC transactions
    // 5. Clear expanded_at
}

// GetStatus returns match status for dashboard
func (s *Service) GetStatus(ctx context.Context, userID uuid.UUID, month string) (*dto.CreditCardStatus, error) {
    // Query aggregate data for the month
}
```

---

## 6. API Endpoints

### 6.1 POST /api/v1/transactions/credit-card/preview

**Handler:**
```go
// Location: backend/internal/integration/entrypoint/controller/credit_card_controller.go

func (c *CreditCardController) Preview(ctx *gin.Context) {
    var input struct {
        Transactions []dto.CreditCardTransaction `json:"transactions"`
    }
    if err := ctx.ShouldBindJSON(&input); err != nil {
        ctx.JSON(400, gin.H{"error": dto.NewValidationError(err)})
        return
    }

    userID := ctx.MustGet("user_id").(uuid.UUID)
    result, err := c.service.PreviewImport(ctx, userID, input.Transactions)
    if err != nil {
        ctx.JSON(500, gin.H{"error": dto.NewInternalError(err)})
        return
    }

    ctx.JSON(200, gin.H{"data": result})
}
```

**BDD Scenarios:**

```gherkin
Feature: Credit Card Import Preview

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Preview with matching bill payment
    Given I have a transaction:
      | date       | description         | amount   | type    |
      | 2025-10-31 | Pagamento de fatura | -1124.77 | expense |
    When I POST "/api/v1/transactions/credit-card/preview" with:
      """
      {
        "transactions": [
          {"date": "2025-11-06", "title": "Mercado Silva", "amount": 8.99},
          {"date": "2025-11-08", "title": "Bourbon Ipiranga", "amount": 794.15},
          {"date": "2025-11-04", "title": "Pagamento recebido", "amount": -1124.77, "is_payment_received": true}
        ]
      }
      """
    Then the response status should be 200
    And the response should contain 1 match
    And the match should have bill_amount "1124.77"

  Scenario: Preview with amount mismatch
    Given I have a transaction:
      | date       | description         | amount   | type    |
      | 2025-10-31 | Pagamento de fatura | -1124.77 | expense |
    When I POST "/api/v1/transactions/credit-card/preview" with:
      """
      {
        "transactions": [
          {"date": "2025-11-06", "title": "Mercado Silva", "amount": 100.00},
          {"date": "2025-11-04", "title": "Pagamento recebido", "amount": -1130.00, "is_payment_received": true}
        ]
      }
      """
    Then the response status should be 200
    And the response should contain 1 match
    And the match should have difference "5.23"

  Scenario: Preview with no matching bills
    Given I have no transactions
    When I POST "/api/v1/transactions/credit-card/preview" with:
      """
      {
        "transactions": [
          {"date": "2025-11-06", "title": "Mercado Silva", "amount": 8.99}
        ]
      }
      """
    Then the response status should be 200
    And the response should contain 0 matches
    And unmatched_transactions should be 1

  Scenario: Preview with installment transactions
    Given I have a transaction:
      | date       | description         | amount   | type    |
      | 2025-10-31 | Pagamento de fatura | -500.00  | expense |
    When I POST "/api/v1/transactions/credit-card/preview" with:
      """
      {
        "transactions": [
          {"date": "2025-11-08", "title": "Hospital - Parcela 1/3", "amount": 200.00, "installment_current": 1, "installment_total": 3},
          {"date": "2025-11-04", "title": "Pagamento recebido", "amount": -500.00, "is_payment_received": true}
        ]
      }
      """
    Then the response status should be 200
    And the response should contain 1 match

  Scenario: Unauthenticated request
    When I POST "/api/v1/transactions/credit-card/preview" without authentication
    Then the response status should be 401
```

### 6.2 POST /api/v1/transactions/credit-card/import

**BDD Scenarios:**

```gherkin
Feature: Credit Card Import

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Import with automatic matching
    Given I have a transaction:
      | id       | date       | description         | amount   | type    |
      | bill-123 | 2025-10-31 | Pagamento de fatura | -1124.77 | expense |
    When I POST "/api/v1/transactions/credit-card/import" with:
      """
      {
        "transactions": [
          {"date": "2025-11-06", "title": "Mercado Silva", "amount": 8.99},
          {"date": "2025-11-08", "title": "Bourbon Ipiranga", "amount": 794.15},
          {"date": "2025-11-04", "title": "Pagamento recebido", "amount": -1124.77, "is_payment_received": true}
        ],
        "confirmed_matches": [
          {"bill_transaction_id": "bill-123", "payment_received_date": "2025-11-04"}
        ],
        "skip_unmatched": false
      }
      """
    Then the response status should be 201
    And imported_count should be 2
    And matched_count should be 2
    And the bill "bill-123" should have amount 0
    And the bill "bill-123" should have original_amount -1124.77
    And the bill "bill-123" should have expanded_at set
    And new transactions should have credit_card_payment_id "bill-123"

  Scenario: Import with installments
    Given I have a transaction:
      | id       | date       | description         | amount  | type    |
      | bill-456 | 2025-10-31 | Pagamento de fatura | -500.00 | expense |
    When I POST "/api/v1/transactions/credit-card/import" with:
      """
      {
        "transactions": [
          {"date": "2025-11-08", "title": "Hospital - Parcela 1/3", "amount": 200.00, "installment_current": 1, "installment_total": 3},
          {"date": "2025-11-08", "title": "Amazon - Parcela 2/6", "amount": 50.00, "installment_current": 2, "installment_total": 6}
        ],
        "confirmed_matches": [
          {"bill_transaction_id": "bill-456", "payment_received_date": "2025-11-04"}
        ],
        "skip_unmatched": false
      }
      """
    Then the response status should be 201
    And the transaction "Hospital - Parcela 1/3" should have:
      | installment_current | 1 |
      | installment_total   | 3 |

  Scenario: Import creates hidden Pagamento recebido
    Given I have a transaction:
      | id       | date       | description         | amount   | type    |
      | bill-789 | 2025-10-31 | Pagamento de fatura | -1000.00 | expense |
    When I POST "/api/v1/transactions/credit-card/import" with:
      """
      {
        "transactions": [
          {"date": "2025-11-06", "title": "Test Purchase", "amount": 500.00},
          {"date": "2025-11-04", "title": "Pagamento recebido", "amount": -1000.00, "is_payment_received": true}
        ],
        "confirmed_matches": [
          {"bill_transaction_id": "bill-789", "payment_received_date": "2025-11-04"}
        ],
        "skip_unmatched": false
      }
      """
    Then the response status should be 201
    And there should be a hidden transaction with description "Pagamento recebido"

  Scenario: Cannot import to already expanded bill
    Given I have a transaction:
      | id       | date       | description         | amount | is_credit_card_payment | expanded_at          |
      | bill-exp | 2025-10-31 | Pagamento de fatura | 0      | true                   | 2025-11-01T10:00:00Z |
    When I POST "/api/v1/transactions/credit-card/import" with:
      """
      {
        "transactions": [{"date": "2025-11-06", "title": "Test", "amount": 100}],
        "confirmed_matches": [
          {"bill_transaction_id": "bill-exp", "payment_received_date": "2025-11-04"}
        ],
        "skip_unmatched": false
      }
      """
    Then the response status should be 409
    And the error code should be "ALREADY_EXPANDED"

  Scenario: Auto-categorization applies to CC transactions
    Given I am authenticated as "user@example.com"
    And I have a category rule:
      | pattern  | category_name |
      | Bourbon  | Shopping      |
    And I have a transaction:
      | id       | date       | description         | amount   | type    |
      | bill-cat | 2025-10-31 | Pagamento de fatura | -1000.00 | expense |
    When I POST "/api/v1/transactions/credit-card/import" with:
      """
      {
        "transactions": [
          {"date": "2025-11-08", "title": "Bourbon Ipiranga", "amount": 500.00}
        ],
        "confirmed_matches": [
          {"bill_transaction_id": "bill-cat", "payment_received_date": "2025-11-04"}
        ],
        "skip_unmatched": false
      }
      """
    Then the response status should be 201
    And the transaction "Bourbon Ipiranga" should have category "Shopping"
```

### 6.3 POST /api/v1/transactions/credit-card/collapse

**BDD Scenarios:**

```gherkin
Feature: Collapse Credit Card Expansion

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Successfully collapse expansion
    Given I have an expanded bill payment:
      | id       | date       | description         | amount | original_amount | is_credit_card_payment | expanded_at          |
      | bill-col | 2025-10-31 | Pagamento de fatura | 0      | -1124.77        | true                   | 2025-11-01T10:00:00Z |
    And I have CC transactions linked to "bill-col":
      | description      | amount |
      | Mercado Silva    | -8.99  |
      | Bourbon Ipiranga | -794.15|
    When I POST "/api/v1/transactions/credit-card/collapse" with:
      """
      {"bill_transaction_id": "bill-col"}
      """
    Then the response status should be 200
    And restored_amount should be -1124.77
    And deleted_transactions should be 2
    And the bill "bill-col" should have amount -1124.77
    And the bill "bill-col" should have expanded_at null
    And no transactions should have credit_card_payment_id "bill-col"

  Scenario: Cannot collapse non-expanded bill
    Given I have a transaction:
      | id        | date       | description         | amount   | is_credit_card_payment |
      | bill-norm | 2025-10-31 | Pagamento de fatura | -1124.77 | false                  |
    When I POST "/api/v1/transactions/credit-card/collapse" with:
      """
      {"bill_transaction_id": "bill-norm"}
      """
    Then the response status should be 422
    And the error code should be "NOT_EXPANDED"

  Scenario: Cannot collapse another user's bill
    Given "other@example.com" has an expanded bill payment with id "other-bill"
    When I POST "/api/v1/transactions/credit-card/collapse" with:
      """
      {"bill_transaction_id": "other-bill"}
      """
    Then the response status should be 403
```

### 6.4 GET /api/v1/transactions/credit-card/status

**BDD Scenarios:**

```gherkin
Feature: Credit Card Status

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Get status with mixed transactions
    Given I have CC transactions for "2025-11":
      | description      | amount | credit_card_payment_id |
      | Mercado Silva    | -8.99  | bill-123               |
      | Bourbon Ipiranga | -794.15| bill-123               |
      | Unlinked Store   | -200.00| null                   |
    And I have an expanded bill "bill-123" with original_amount -803.14
    When I GET "/api/v1/transactions/credit-card/status?month=2025-11"
    Then the response status should be 200
    And total_spending should be 1003.14
    And matched_amount should be 803.14
    And unmatched_amount should be 200.00
    And has_mismatches should be true

  Scenario: Get status with all matched
    Given I have CC transactions for "2025-11":
      | description   | amount | credit_card_payment_id |
      | Mercado Silva | -100   | bill-all               |
    And I have an expanded bill "bill-all" with original_amount -100
    When I GET "/api/v1/transactions/credit-card/status?month=2025-11"
    Then the response status should be 200
    And has_mismatches should be false

  Scenario: Get status with no CC data
    Given I have no CC transactions for "2025-11"
    When I GET "/api/v1/transactions/credit-card/status?month=2025-11"
    Then the response status should be 200
    And total_spending should be 0
```

---

## 7. Business Rules

### 7.1 Matching Rules

| Rule | Description |
|------|-------------|
| Amount Tolerance | Match if difference < 1% or < R$ 10.00 |
| Date Proximity | "Pagamento recebido" within ±5 days of "Pagamento de fatura" |
| Priority | Match by closest amount when multiple candidates |
| Direction | CC "Pagamento recebido" (negative) matches bank "Pagamento de fatura" (negative) |

### 7.2 Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required, max 500 chars | "Title is required" |
| amount | Required, must be numeric | "Amount must be a number" |
| date | Required, valid date | "Date is required" |
| installment_current | If present, must be > 0 | "Invalid installment number" |
| installment_total | If present, must be >= current | "Total must be >= current" |

### 7.3 Authorization Rules

| Action | Rule |
|--------|------|
| Preview | Any authenticated user |
| Import | Only own transactions can be matched |
| Collapse | Only own expanded bills |
| Get Status | Only own data |

### 7.4 Business Logic

**Billing Cycle Calculation:**
- Derived from "Pagamento recebido" date
- Format: "YYYY-MM"
- Example: "Pagamento recebido" on 2025-11-04 → billing_cycle = "2025-10"

**Zero Amount Logic:**
- When bill is expanded, amount becomes 0
- original_amount preserves the actual value
- expanded_at timestamp marks when expansion occurred
- Dashboard calculations should use CC transaction amounts, not zeroed bill

---

## 8. Error Handling

```go
// Location: backend/internal/domain/errors/credit_card_errors.go

package errors

import "errors"

var (
    ErrBillNotFound        = errors.New("bill payment not found")
    ErrBillAlreadyExpanded = errors.New("bill payment already expanded")
    ErrBillNotExpanded     = errors.New("bill payment is not expanded")
    ErrInvalidCCFormat     = errors.New("invalid credit card statement format")
    ErrNoTransactions      = errors.New("no transactions provided")
    ErrUnauthorizedBill    = errors.New("not authorized to modify this bill")
)
```

---

## 9. Testing

### 9.1 BDD Feature File Location
```
backend/test/integration/features/credit_card.feature
```

### 9.2 Step Definitions Location
```
backend/test/integration/steps/credit_card_steps.go
```

### 9.3 Unit Test Locations
```
backend/internal/application/creditcard/service_test.go
backend/internal/application/creditcard/matcher_test.go
backend/internal/integration/persistence/credit_card_repository_test.go
```

### 9.4 Test Data Fixtures

```go
// Location: backend/test/fixtures/credit_card.go

var TestCCTransactions = []dto.CreditCardTransaction{
    {
        Date:              time.Date(2025, 11, 6, 0, 0, 0, 0, time.UTC),
        Title:             "Mercado Silva",
        Amount:            decimal.NewFromFloat(8.99),
        IsPaymentReceived: false,
    },
    {
        Date:               time.Date(2025, 11, 8, 0, 0, 0, 0, time.UTC),
        Title:              "Hospital Sao Lucas - Parcela 1/3",
        Amount:             decimal.NewFromFloat(196.84),
        InstallmentCurrent: ptr(1),
        InstallmentTotal:   ptr(3),
        IsPaymentReceived:  false,
    },
    {
        Date:              time.Date(2025, 11, 4, 0, 0, 0, 0, time.UTC),
        Title:             "Pagamento recebido",
        Amount:            decimal.NewFromFloat(-1124.77),
        IsPaymentReceived: true,
    },
}

var TestBillPayment = &entity.Transaction{
    ID:                  uuid.MustParse("bill-test-123"),
    Date:                time.Date(2025, 10, 31, 0, 0, 0, 0, time.UTC),
    Description:         "Pagamento de fatura",
    Amount:              decimal.NewFromFloat(-1124.77),
    Type:                entity.TransactionTypeExpense,
    IsCreditCardPayment: false,
}
```

---

## 10. File Structure

```
backend/internal/
├── application/
│   └── creditcard/
│       ├── service.go           # Main service
│       ├── service_test.go      # Unit tests
│       ├── matcher.go           # Bill matching logic
│       ├── matcher_test.go      # Matcher tests
│       └── repository.go        # Repository interface
├── domain/
│   ├── dto/
│   │   └── credit_card.go       # DTOs
│   └── errors/
│       └── credit_card_errors.go # Domain errors
└── integration/
    ├── entrypoint/
    │   └── controller/
    │       └── credit_card_controller.go  # HTTP handlers
    └── persistence/
        └── credit_card_repository.go      # Repository implementation

backend/test/
├── integration/
│   ├── features/
│   │   └── credit_card.feature  # BDD scenarios
│   └── steps/
│       └── credit_card_steps.go # Step definitions
└── fixtures/
    └── credit_card.go           # Test fixtures
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/finance-tracker-backend-tdd-v6.md`
