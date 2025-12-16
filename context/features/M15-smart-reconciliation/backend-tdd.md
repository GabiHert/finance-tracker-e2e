# Backend TDD: Smart Credit Card Reconciliation

**Feature Code:** M15-smart-reconciliation
**Last Updated:** 2025-12-12

---

## 1. Overview

### 1.1 Domain Description
Smart Reconciliation extends the existing credit card import domain to support automatic detection and linking of CC transactions to bill payments, regardless of import order. It introduces a reconciliation service that matches pending CC transactions to bills using configurable tolerance rules.

### 1.2 Bounded Context
This feature operates within the Transaction bounded context, specifically extending the CreditCard subdomain. It interacts with:
- Transaction aggregate (for CC transactions and bills)
- Import service (for detecting matches during import)
- User context (for ownership verification)

---

## 2. Domain Entities

### 2.1 Matching Configuration (Value Object)

```go
// Location: backend/internal/domain/valueobject/matching_config.go

package valueobject

import "github.com/shopspring/decimal"

type MatchingConfig struct {
    // Amount tolerance: whichever is greater
    AmountTolerancePercent  decimal.Decimal // 0.02 = 2%
    AmountToleranceAbsolute int64           // 2000 = R$ 20.00 in cents

    // Date tolerance
    DateToleranceDays int // 15 days

    // Confidence thresholds
    HighConfidencePercent  decimal.Decimal // 0.005 = 0.5%
    HighConfidenceAbsolute int64           // 500 = R$ 5.00
    MedConfidencePercent   decimal.Decimal // 0.02 = 2%
    MedConfidenceAbsolute  int64           // 2000 = R$ 20.00
}

func DefaultMatchingConfig() MatchingConfig {
    return MatchingConfig{
        AmountTolerancePercent:  decimal.NewFromFloat(0.02),
        AmountToleranceAbsolute: 2000,
        DateToleranceDays:       15,
        HighConfidencePercent:   decimal.NewFromFloat(0.005),
        HighConfidenceAbsolute:  500,
        MedConfidencePercent:    decimal.NewFromFloat(0.02),
        MedConfidenceAbsolute:   2000,
    }
}
```

### 2.2 Potential Match (Value Object)

```go
// Location: backend/internal/domain/valueobject/potential_match.go

package valueobject

import (
    "time"
    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

type Confidence string

const (
    ConfidenceHigh   Confidence = "high"
    ConfidenceMedium Confidence = "medium"
    ConfidenceLow    Confidence = "low"
)

type PotentialMatch struct {
    BillID                  uuid.UUID
    BillDate                time.Time
    BillDescription         string
    BillAmount              decimal.Decimal
    CategoryName            *string
    Confidence              Confidence
    AmountDifference        decimal.Decimal
    AmountDifferencePercent decimal.Decimal
    Score                   float64  // For ranking multiple matches
}
```

### 2.3 Reconciliation Result (Value Object)

```go
// Location: backend/internal/domain/valueobject/reconciliation_result.go

package valueobject

type ReconciliationResult struct {
    AutoLinked        []AutoLinkedCycle
    RequiresSelection []PendingWithMatches
    NoMatch           []PendingCycle
}

type AutoLinkedCycle struct {
    BillingCycle     string
    BillID           uuid.UUID
    BillDescription  string
    TransactionCount int
    Confidence       Confidence
    AmountDifference decimal.Decimal
}

type PendingWithMatches struct {
    BillingCycle   string
    PotentialBills []PotentialMatch
}

type PendingCycle struct {
    BillingCycle     string
    TransactionCount int
    TotalAmount      decimal.Decimal
}
```

---

## 3. Repository Interface Extensions

```go
// Location: backend/internal/application/credit_card/repository.go

package credit_card

import (
    "context"
    "time"
    "github.com/google/uuid"
)

// Extended repository interface for reconciliation
type ReconciliationRepository interface {
    // Get pending (unlinked) CC transactions grouped by billing cycle
    GetPendingBillingCycles(ctx context.Context, userID uuid.UUID) ([]PendingCycleData, error)

    // Get linked billing cycles with their bills
    GetLinkedBillingCycles(ctx context.Context, userID uuid.UUID, limit int) ([]LinkedCycleData, error)

    // Find potential bill matches for a billing cycle
    FindPotentialBills(ctx context.Context, userID uuid.UUID, billingCycle string, dateRange DateRange) ([]BillData, error)

    // Get all CC transactions for a billing cycle (for linking)
    GetCCTransactionsByBillingCycle(ctx context.Context, userID uuid.UUID, billingCycle string) ([]uuid.UUID, error)

    // Check if a bill is already linked to any CC transactions
    IsBillLinked(ctx context.Context, billID uuid.UUID) (bool, error)

    // Bulk update CC transactions to link to a bill
    LinkCCTransactionsToBill(ctx context.Context, transactionIDs []uuid.UUID, billID uuid.UUID) error
}

type PendingCycleData struct {
    BillingCycle     string
    TransactionCount int
    TotalAmount      int64 // cents
    OldestDate       time.Time
    NewestDate       time.Time
}

type LinkedCycleData struct {
    BillingCycle     string
    TransactionCount int
    TotalAmount      int64 // cents
    BillID           uuid.UUID
    BillDate         time.Time
    BillDescription  string
    BillAmount       int64 // cents (original_amount)
    CategoryName     *string
}

type BillData struct {
    ID           uuid.UUID
    Date         time.Time
    Description  string
    Amount       int64 // cents
    CategoryName *string
}

type DateRange struct {
    Start time.Time
    End   time.Time
}
```

---

## 4. Service Layer

### 4.1 Reconciliation Service

```go
// Location: backend/internal/application/usecase/credit_card/reconciliation_service.go

package credit_card

import (
    "context"
    "github.com/google/uuid"
)

type ReconciliationService struct {
    repo   ReconciliationRepository
    config valueobject.MatchingConfig
}

func NewReconciliationService(repo ReconciliationRepository) *ReconciliationService {
    return &ReconciliationService{
        repo:   repo,
        config: valueobject.DefaultMatchingConfig(),
    }
}

// GetPendingReconciliations returns all billing cycles with their reconciliation status
func (s *ReconciliationService) GetPendingReconciliations(ctx context.Context, userID uuid.UUID) (*PendingReconciliationsResponse, error)

// Reconcile triggers reconciliation for pending billing cycles
func (s *ReconciliationService) Reconcile(ctx context.Context, userID uuid.UUID, billingCycle *string) (*ReconciliationResult, error)

// ManualLink links a specific billing cycle to a bill
func (s *ReconciliationService) ManualLink(ctx context.Context, userID uuid.UUID, billingCycle string, billID uuid.UUID, force bool) (*LinkResult, error)

// FindMatchesForBill finds pending CC transactions that could match a given bill
func (s *ReconciliationService) FindMatchesForBill(ctx context.Context, userID uuid.UUID, billID uuid.UUID) ([]PendingCycleMatch, error)

// Internal: Calculate confidence level for a match
func (s *ReconciliationService) calculateConfidence(ccTotal, billAmount decimal.Decimal) Confidence

// Internal: Calculate date range for a billing cycle
func (s *ReconciliationService) calculateDateRange(billingCycle string) (DateRange, error)
```

---

## 5. API Endpoints

### 5.1 GET /credit-card/pending

**Handler:**
```go
// Location: backend/internal/integration/entrypoint/controller/reconciliation_controller.go

func (c *CreditCardController) GetPendingReconciliations(ctx *gin.Context) {
    userID := getUserID(ctx)

    result, err := c.reconciliationService.GetPendingReconciliations(ctx, userID)
    if err != nil {
        handleError(ctx, err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"data": result})
}
```

**BDD Scenarios:**

```gherkin
Feature: Get Pending Reconciliations

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: List pending billing cycles with CC transactions
    Given I have CC transactions for billing cycle "2024-11":
      | date       | description    | amount  |
      | 2024-11-03 | Zaffari        | -4490   |
      | 2024-11-15 | Netflix        | -5590   |
    And I have no bill payment linked to "2024-11"
    When I GET "/api/v1/transactions/credit-card/pending"
    Then the response status should be 200
    And the response should contain 1 pending cycle
    And the pending cycle "2024-11" should have:
      | transaction_count | 2     |
      | total_amount      | 10080 |

  Scenario: List pending with potential bill matches
    Given I have CC transactions for billing cycle "2024-11" totaling R$ 1234.56
    And I have a bill payment:
      | date       | description           | amount   |
      | 2024-12-05 | Pagamento de fatura   | -123456  |
    When I GET "/api/v1/transactions/credit-card/pending"
    Then the response should contain 1 potential bill for "2024-11"
    And the potential bill should have confidence "high"

  Scenario: Show linked cycles
    Given I have CC transactions for "2024-10" linked to a bill
    When I GET "/api/v1/transactions/credit-card/pending"
    Then the response should contain 1 linked cycle
    And the linked cycle "2024-10" should show the bill details

  Scenario: Empty when no CC transactions
    Given I have no CC transactions
    When I GET "/api/v1/transactions/credit-card/pending"
    Then the response status should be 200
    And the response should contain 0 pending cycles
    And the response should contain 0 linked cycles
```

---

### 5.2 POST /credit-card/reconcile

**Handler:**
```go
func (c *CreditCardController) Reconcile(ctx *gin.Context) {
    userID := getUserID(ctx)

    var req ReconcileRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, errorResponse("VALIDATION_ERROR", err.Error()))
        return
    }

    result, err := c.reconciliationService.Reconcile(ctx, userID, req.BillingCycle)
    if err != nil {
        handleError(ctx, err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"data": result})
}
```

**BDD Scenarios:**

```gherkin
Feature: Reconcile CC Transactions

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Auto-link single high-confidence match
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have a bill payment for R$ 1000.00 dated "2024-12-05"
    When I POST "/api/v1/transactions/credit-card/reconcile" with:
      | billing_cycle | 2024-11 |
    Then the response status should be 200
    And the response should show 1 auto-linked cycle
    And the confidence should be "high"
    And the CC transactions should be linked to the bill

  Scenario: Auto-link with medium confidence (slight difference)
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have a bill payment for R$ 1015.00 dated "2024-12-05"
    When I POST "/api/v1/transactions/credit-card/reconcile" with:
      | billing_cycle | 2024-11 |
    Then the response status should be 200
    And the response should show 1 auto-linked cycle
    And the confidence should be "medium"
    And the amount_difference should be -1500

  Scenario: Require selection for multiple matches
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have bill payments:
      | date       | description      | amount   |
      | 2024-12-05 | Fatura Nubank    | -100000  |
      | 2024-12-06 | Fatura cartão    | -100500  |
    When I POST "/api/v1/transactions/credit-card/reconcile" with:
      | billing_cycle | 2024-11 |
    Then the response status should be 200
    And the response should show 1 requires_selection cycle
    And the potential_bills should contain 2 options

  Scenario: No match when no bills exist
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have no bill payments
    When I POST "/api/v1/transactions/credit-card/reconcile" with:
      | billing_cycle | 2024-11 |
    Then the response status should be 200
    And the response should show 1 no_match cycle

  Scenario: Reconcile all pending cycles
    Given I have pending CC for "2024-10" and "2024-11"
    And I have matching bills for both
    When I POST "/api/v1/transactions/credit-card/reconcile" with empty body
    Then the response status should be 200
    And the response should show 2 auto-linked cycles

  Scenario: Skip already linked cycles
    Given I have CC for "2024-11" already linked to a bill
    When I POST "/api/v1/transactions/credit-card/reconcile" with:
      | billing_cycle | 2024-11 |
    Then the response status should be 200
    And the summary should show 0 auto-linked
```

---

### 5.3 POST /credit-card/link

**Handler:**
```go
func (c *CreditCardController) ManualLink(ctx *gin.Context) {
    userID := getUserID(ctx)

    var req ManualLinkRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, errorResponse("VALIDATION_ERROR", err.Error()))
        return
    }

    result, err := c.reconciliationService.ManualLink(ctx, userID, req.BillingCycle, req.BillPaymentID, req.Force)
    if err != nil {
        handleError(ctx, err)
        return
    }

    ctx.JSON(http.StatusOK, gin.H{"data": result})
}
```

**BDD Scenarios:**

```gherkin
Feature: Manual Link CC to Bill

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Successfully link CC to bill
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have a bill "bill-123" for R$ 1000.00
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-123 |
    Then the response status should be 200
    And the CC transactions should be linked to "bill-123"
    And the bill should have expanded_at set

  Scenario: Reject link with large mismatch without force
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have a bill "bill-123" for R$ 500.00
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-123 |
    Then the response status should be 400
    And the error code should be "AMOUNT_MISMATCH"

  Scenario: Allow link with large mismatch when forced
    Given I have CC transactions for "2024-11" totaling R$ 1000.00
    And I have a bill "bill-123" for R$ 500.00
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-123 |
      | force           | true     |
    Then the response status should be 200
    And has_mismatch should be true

  Scenario: Reject if bill not found
    Given I have CC transactions for "2024-11"
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11       |
      | bill_payment_id | non-existent  |
    Then the response status should be 404
    And the error code should be "BILL_NOT_FOUND"

  Scenario: Reject if bill belongs to another user
    Given I have CC transactions for "2024-11"
    And "other@example.com" has a bill "other-bill"
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11    |
      | bill_payment_id | other-bill |
    Then the response status should be 404
    And the error code should be "BILL_NOT_FOUND"

  Scenario: Reject if no pending transactions for cycle
    Given I have no CC transactions for "2024-11"
    And I have a bill "bill-123"
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-123 |
    Then the response status should be 404
    And the error code should be "PENDING_NOT_FOUND"

  Scenario: Reject if cycle already linked
    Given I have CC for "2024-11" already linked to "bill-old"
    And I have a bill "bill-new"
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-new |
    Then the response status should be 409
    And the error code should be "ALREADY_LINKED"

  Scenario: Reject if bill already expanded
    Given I have CC transactions for "2024-11"
    And I have a bill "bill-123" already linked to "2024-10"
    When I POST "/api/v1/transactions/credit-card/link" with:
      | billing_cycle   | 2024-11  |
      | bill_payment_id | bill-123 |
    Then the response status should be 409
    And the error code should be "BILL_ALREADY_EXPANDED"
```

---

### 5.4 POST /transactions (Modified - Auto-Reconciliation Trigger)

**BDD Scenarios:**

```gherkin
Feature: Auto-Reconcile on Bill Creation

  Background:
    Given I am authenticated as "user@example.com"

  Scenario: Auto-link when creating bill payment with pending CC
    Given I have pending CC transactions for "2024-11" totaling R$ 1000.00
    When I POST "/api/v1/transactions" with:
      | date        | 2024-12-05                  |
      | description | Pagamento de fatura Nubank  |
      | amount      | -100000                     |
      | type        | expense                     |
    Then the response status should be 201
    And auto_reconciliation.triggered should be true
    And auto_reconciliation.linked_cycle should be "2024-11"
    And the pending CC should now be linked

  Scenario: No auto-link when amount doesn't match
    Given I have pending CC transactions for "2024-11" totaling R$ 1000.00
    When I POST "/api/v1/transactions" with:
      | date        | 2024-12-05                  |
      | description | Pagamento de fatura         |
      | amount      | -50000                      |
      | type        | expense                     |
    Then the response status should be 201
    And auto_reconciliation should not be triggered
    And the pending CC should remain unlinked

  Scenario: No auto-link when multiple matches
    Given I have pending CC for "2024-10" totaling R$ 1000.00
    And I have pending CC for "2024-11" totaling R$ 1000.00
    When I POST "/api/v1/transactions" with:
      | date        | 2024-12-05            |
      | description | Pagamento de fatura   |
      | amount      | -100000               |
      | type        | expense               |
    Then the response status should be 201
    And auto_reconciliation.triggered should be false

  Scenario: No trigger for non-bill transactions
    Given I have pending CC transactions for "2024-11"
    When I POST "/api/v1/transactions" with:
      | date        | 2024-12-05  |
      | description | Mercado     |
      | amount      | -5000       |
      | type        | expense     |
    Then the response status should be 201
    And the response should not contain auto_reconciliation
```

---

## 6. Business Rules

### 6.1 Matching Rules

| Rule | Condition | Outcome |
|------|-----------|---------|
| Amount tolerance | Diff ≤ 2% OR Diff ≤ R$ 20 | Within tolerance |
| Date range | Bill date within cycle month ± 15 days | Valid date |
| High confidence | Single match + (Diff ≤ 0.5% OR Diff ≤ R$ 5) | Auto-link |
| Medium confidence | Single match + within tolerance | Auto-link with warning |
| Low confidence | Multiple matches OR > tolerance | Requires selection |
| No match | No bills in date range | Remain pending |

### 6.2 Authorization Rules

| Action | Rule |
|--------|------|
| Get pending | Only own data |
| Reconcile | Only own transactions and bills |
| Manual link | Only own transactions and bills |
| Auto-reconcile trigger | Triggered by own bill creation |

### 6.3 Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| billing_cycle | Format YYYY-MM | "Invalid billing cycle format" |
| bill_payment_id | Valid UUID | "Invalid bill payment ID" |
| bill_payment_id | Must exist | "Bill not found" |
| billing_cycle | Must have pending CC | "No pending transactions" |

---

## 7. Error Handling

```go
// Location: backend/internal/domain/error/reconciliation_errors.go

package error

import "errors"

var (
    ErrBillNotFound         = errors.New("bill payment not found")
    ErrPendingNotFound      = errors.New("no pending CC transactions for billing cycle")
    ErrAlreadyLinked        = errors.New("billing cycle already has linked bill")
    ErrBillAlreadyExpanded  = errors.New("bill is already linked to another cycle")
    ErrAmountMismatch       = errors.New("amount difference exceeds tolerance")
    ErrInvalidBillingCycle  = errors.New("invalid billing cycle format")
)
```

---

## 8. Testing

### 8.1 BDD Feature File Location
```
backend/test/integration/features/reconciliation.feature
```

### 8.2 Step Definitions Location
```
backend/test/integration/steps/reconciliation_steps.go
```

### 8.3 Unit Test Locations
```
backend/internal/application/usecase/credit_card/reconciliation_service_test.go
backend/internal/domain/valueobject/matching_config_test.go
```

### 8.4 Key Unit Test Cases

```go
func TestCalculateConfidence(t *testing.T) {
    tests := []struct {
        name       string
        ccTotal    decimal.Decimal
        billAmount decimal.Decimal
        expected   Confidence
    }{
        {"exact match", dec(100000), dec(100000), ConfidenceHigh},
        {"within 0.5%", dec(100000), dec(100500), ConfidenceHigh},
        {"within R$5", dec(100), dec(600), ConfidenceHigh},
        {"within 2%", dec(100000), dec(101500), ConfidenceMedium},
        {"within R$20", dec(1000), dec(3000), ConfidenceMedium},
        {"outside tolerance", dec(100000), dec(150000), ConfidenceLow},
    }
    // ...
}

func TestCalculateDateRange(t *testing.T) {
    tests := []struct {
        billingCycle string
        expectedStart string
        expectedEnd   string
    }{
        {"2024-11", "2024-10-17", "2024-12-15"},
        {"2024-01", "2023-12-17", "2024-02-15"},
        {"2024-12", "2024-11-16", "2025-01-15"},
    }
    // ...
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Base Feature:** `context/features/M12-cc-import/backend-tdd.md`
- **Guide Reference:** `context/guides/finance-tracker-backend-tdd-v6.md`
