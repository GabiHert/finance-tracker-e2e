# Backend TDD: Category Expense Trends Chart

**Feature Code:** M13-category-trends
**Last Updated:** 2025-12-05

---

## 1. Overview

### 1.1 Domain Description
The Category Trends feature provides aggregated expense data grouped by category and time period. It calculates spending trends for the top N categories and aggregates remaining categories into an "Others" bucket.

### 1.2 Bounded Context
This feature extends the Dashboard bounded context, providing a new analytical view of transaction data. It depends on:
- Transaction entity (expense filtering, date range, amount)
- Category entity (category info, colors)
- User entity (ownership/authorization)

---

## 2. Use Case

### 2.1 Use Case Definition

```go
// Location: backend/internal/application/usecase/dashboard/get_category_trends.go

package dashboard

import (
    "context"
    "time"

    "github.com/google/uuid"
    "github.com/shopspring/decimal"
)

type GetCategoryTrendsInput struct {
    UserID        uuid.UUID
    StartDate     time.Time
    EndDate       time.Time
    Granularity   Granularity // daily, weekly, monthly
    TopCategories int         // default 8
}

type Granularity string

const (
    GranularityDaily   Granularity = "daily"
    GranularityWeekly  Granularity = "weekly"
    GranularityMonthly Granularity = "monthly"
)

type GetCategoryTrendsOutput struct {
    Period     TrendPeriod
    Categories []CategoryInfo
    Trends     []TrendDataPoint
}

type TrendPeriod struct {
    StartDate   time.Time
    EndDate     time.Time
    Granularity Granularity
}

type CategoryInfo struct {
    ID          uuid.UUID
    Name        string
    Color       string
    TotalAmount decimal.Decimal
    IsOthers    bool
}

type TrendDataPoint struct {
    Date        time.Time
    PeriodLabel string
    Amounts     []CategoryAmount
}

type CategoryAmount struct {
    CategoryID uuid.UUID
    Amount     decimal.Decimal
}
```

### 2.2 Use Case Implementation

```go
type GetCategoryTrendsUseCase struct {
    transactionRepo TransactionRepository
    categoryRepo    CategoryRepository
}

func NewGetCategoryTrendsUseCase(
    transactionRepo TransactionRepository,
    categoryRepo CategoryRepository,
) *GetCategoryTrendsUseCase {
    return &GetCategoryTrendsUseCase{
        transactionRepo: transactionRepo,
        categoryRepo:    categoryRepo,
    }
}

func (uc *GetCategoryTrendsUseCase) Execute(
    ctx context.Context,
    input GetCategoryTrendsInput,
) (*GetCategoryTrendsOutput, error) {
    // 1. Validate input
    if err := validateInput(input); err != nil {
        return nil, err
    }

    // 2. Get expense transactions in date range
    transactions, err := uc.transactionRepo.GetExpensesByDateRange(
        ctx, input.UserID, input.StartDate, input.EndDate,
    )
    if err != nil {
        return nil, err
    }

    // 3. Calculate totals per category
    categoryTotals := calculateCategoryTotals(transactions)

    // 4. Determine top N categories and "Others"
    topCategories, othersTotal := selectTopCategories(
        categoryTotals, input.TopCategories,
    )

    // 5. Get category details
    categoryInfos, err := uc.getCategoryInfos(ctx, topCategories, othersTotal)
    if err != nil {
        return nil, err
    }

    // 6. Aggregate by time period
    trends := aggregateByPeriod(
        transactions, topCategories, input.Granularity, input.StartDate, input.EndDate,
    )

    return &GetCategoryTrendsOutput{
        Period: TrendPeriod{
            StartDate:   input.StartDate,
            EndDate:     input.EndDate,
            Granularity: input.Granularity,
        },
        Categories: categoryInfos,
        Trends:     trends,
    }, nil
}
```

---

## 3. Repository Interface

```go
// Location: backend/internal/application/adapter/transaction_repository.go

// Add to existing TransactionRepository interface
type TransactionRepository interface {
    // ... existing methods ...

    // GetExpensesByDateRange returns all expense transactions for a user
    // within the specified date range, including category info
    GetExpensesByDateRange(
        ctx context.Context,
        userID uuid.UUID,
        startDate time.Time,
        endDate time.Time,
    ) ([]*entity.TransactionWithCategory, error)
}
```

```go
// Location: backend/internal/domain/entity/transaction.go

// Add new type for transaction with category
type TransactionWithCategory struct {
    Transaction
    CategoryName  string
    CategoryColor string
}
```

---

## 4. Handler

```go
// Location: backend/internal/integration/entrypoint/handler/dashboard_handler.go

// Add to existing DashboardHandler

func (h *DashboardHandler) GetCategoryTrends(c *gin.Context) {
    userID := h.getUserID(c)

    // Parse query parameters
    startDateStr := c.Query("start_date")
    endDateStr := c.Query("end_date")
    granularity := c.DefaultQuery("granularity", "daily")
    topCategoriesStr := c.DefaultQuery("top_categories", "8")

    // Validate and parse dates
    startDate, err := time.Parse("2006-01-02", startDateStr)
    if err != nil {
        c.JSON(400, gin.H{"error": gin.H{
            "code":    "VALIDATION_ERROR",
            "message": "Invalid start_date format, expected YYYY-MM-DD",
        }})
        return
    }

    endDate, err := time.Parse("2006-01-02", endDateStr)
    if err != nil {
        c.JSON(400, gin.H{"error": gin.H{
            "code":    "VALIDATION_ERROR",
            "message": "Invalid end_date format, expected YYYY-MM-DD",
        }})
        return
    }

    // Validate granularity
    gran := dashboard.Granularity(granularity)
    if gran != dashboard.GranularityDaily &&
       gran != dashboard.GranularityWeekly &&
       gran != dashboard.GranularityMonthly {
        c.JSON(400, gin.H{"error": gin.H{
            "code":    "INVALID_GRANULARITY",
            "message": "Granularity must be: daily, weekly, or monthly",
        }})
        return
    }

    // Parse top categories
    topCategories, _ := strconv.Atoi(topCategoriesStr)
    if topCategories <= 0 {
        topCategories = 8
    }

    // Execute use case
    input := dashboard.GetCategoryTrendsInput{
        UserID:        userID,
        StartDate:     startDate,
        EndDate:       endDate,
        Granularity:   gran,
        TopCategories: topCategories,
    }

    output, err := h.getCategoryTrendsUC.Execute(c.Request.Context(), input)
    if err != nil {
        h.handleError(c, err)
        return
    }

    // Transform to response DTO
    response := h.transformCategoryTrendsResponse(output)
    c.JSON(200, gin.H{"data": response})
}
```

---

## 5. BDD Scenarios

### 5.1 Feature File

```gherkin
# Location: backend/test/integration/features/category_trends.feature

Feature: Category Expense Trends

  As a user
  I want to see my expense trends per category over time
  So that I can understand my spending patterns

  Background:
    Given I am authenticated as "user@example.com"

  # ============================================
  # Happy Path Scenarios
  # ============================================

  Scenario: Get daily expense trends with multiple categories
    Given I have the following expense transactions:
      | date       | description      | amount | category     |
      | 2024-11-01 | Groceries        | 150.00 | Alimentacao  |
      | 2024-11-01 | Gas              | 80.00  | Transporte   |
      | 2024-11-02 | Restaurant       | 75.00  | Alimentacao  |
      | 2024-11-02 | Uber             | 25.00  | Transporte   |
      | 2024-11-03 | Supermarket      | 200.00 | Alimentacao  |
      | 2024-11-03 | Movie tickets    | 60.00  | Lazer        |
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date     | 2024-11-01 |
      | end_date       | 2024-11-03 |
      | granularity    | daily      |
      | top_categories | 8          |
    Then the response status should be 200
    And the response should contain 3 categories
    And the response should contain 3 trend data points
    And category "Alimentacao" should have total amount 425.00
    And category "Transporte" should have total amount 105.00
    And the trend for "2024-11-01" should include:
      | category    | amount |
      | Alimentacao | 150.00 |
      | Transporte  | 80.00  |

  Scenario: Get weekly expense trends
    Given I have expense transactions spread across 4 weeks in November 2024
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | weekly     |
    Then the response status should be 200
    And the response should contain trend data points for each week
    And each trend point should have a period_label like "1-7 Nov"

  Scenario: Get monthly expense trends
    Given I have expense transactions in November and December 2024
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-12-31 |
      | granularity | monthly    |
    Then the response status should be 200
    And the response should contain 2 trend data points
    And the trend points should have period_labels "Nov" and "Dez"

  Scenario: Categories beyond top N are grouped as "Others"
    Given I have expenses in 10 different categories
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date     | 2024-11-01 |
      | end_date       | 2024-11-30 |
      | granularity    | monthly    |
      | top_categories | 3          |
    Then the response status should be 200
    And the response should contain exactly 4 categories
    And one category should have is_others = true
    And the "Outros" category should aggregate remaining amounts

  Scenario: Empty result when no expenses in period
    Given I have no expense transactions
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | daily      |
    Then the response status should be 200
    And the response should contain 0 categories
    And the response should contain 0 trend data points

  Scenario: Only expense transactions are included
    Given I have the following transactions:
      | date       | description | amount  | type    | category    |
      | 2024-11-01 | Salary      | 5000.00 | income  | Salario     |
      | 2024-11-01 | Groceries   | 150.00  | expense | Alimentacao |
      | 2024-11-02 | Freelance   | 1000.00 | income  | Freelance   |
      | 2024-11-02 | Gas         | 80.00   | expense | Transporte  |
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-02 |
      | granularity | daily      |
    Then the response status should be 200
    And the response should contain 2 categories
    And category "Alimentacao" should have total amount 150.00
    And category "Transporte" should have total amount 80.00
    And there should be no income categories in the response

  # ============================================
  # Validation Scenarios
  # ============================================

  Scenario: Invalid date format returns error
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 01-11-2024 |
      | end_date    | 30-11-2024 |
      | granularity | daily      |
    Then the response status should be 400
    And the error code should be "VALIDATION_ERROR"
    And the error message should contain "Invalid start_date format"

  Scenario: Invalid granularity returns error
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | yearly     |
    Then the response status should be 400
    And the error code should be "INVALID_GRANULARITY"

  Scenario: Missing required parameters returns error
    When I GET "/api/v1/dashboard/category-trends" with query:
      | granularity | daily |
    Then the response status should be 400
    And the error code should be "VALIDATION_ERROR"

  Scenario: End date before start date returns error
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-30 |
      | end_date    | 2024-11-01 |
      | granularity | daily      |
    Then the response status should be 400
    And the error code should be "VALIDATION_ERROR"
    And the error message should contain "end_date must be after start_date"

  # ============================================
  # Authorization Scenarios
  # ============================================

  Scenario: Unauthenticated request is rejected
    When I GET "/api/v1/dashboard/category-trends" without authentication with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | daily      |
    Then the response status should be 401

  Scenario: User only sees their own expenses
    Given "other@example.com" has expense transactions
    And I have expense transactions
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | daily      |
    Then the response status should be 200
    And I should only see my own expense data

  # ============================================
  # Edge Cases
  # ============================================

  Scenario: Single day range with daily granularity
    Given I have expenses on 2024-11-15
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-15 |
      | end_date    | 2024-11-15 |
      | granularity | daily      |
    Then the response status should be 200
    And the response should contain 1 trend data point

  Scenario: Week boundary handling
    Given I have expenses on Sunday 2024-11-03 and Monday 2024-11-04
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-10 |
      | granularity | weekly     |
    Then the response status should be 200
    And expenses should be correctly grouped by week (Monday start)

  Scenario: Month boundary handling
    Given I have expenses on 2024-10-31 and 2024-11-01
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-10-15 |
      | end_date    | 2024-11-15 |
      | granularity | monthly    |
    Then the response status should be 200
    And 2024-10-31 expense should be in October
    And 2024-11-01 expense should be in November

  Scenario: Transactions without category are excluded
    Given I have expense transactions without category
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | daily      |
    Then the response status should be 200
    And uncategorized transactions should not appear in trends

  Scenario: Categories sorted by total amount descending
    Given I have expenses in multiple categories with different totals
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | monthly    |
    Then the response status should be 200
    And categories should be sorted by total_amount in descending order
    And "Outros" category should be last if present

  Scenario: Period labels are in Portuguese
    When I GET "/api/v1/dashboard/category-trends" with query:
      | start_date  | 2024-11-01 |
      | end_date    | 2024-11-30 |
      | granularity | monthly    |
    Then the response status should be 200
    And the period_label should be "Nov" not "November"
```

### 5.2 Step Definitions Location
```
backend/test/integration/steps/category_trends_steps.go
```

---

## 6. Business Rules

### 6.1 Validation Rules

| Parameter | Rule | Error Message |
|-----------|------|---------------|
| start_date | Required, YYYY-MM-DD format | "start_date is required" / "Invalid start_date format" |
| end_date | Required, YYYY-MM-DD format | "end_date is required" / "Invalid end_date format" |
| end_date | Must be >= start_date | "end_date must be after start_date" |
| granularity | Must be: daily, weekly, monthly | "Granularity must be: daily, weekly, or monthly" |
| top_categories | Optional, default 8, min 1 | Uses default if invalid |

### 6.2 Authorization Rules

| Action | Rule |
|--------|------|
| Get trends | User can only see their own transactions |
| Get trends | Transactions in shared groups are NOT included (user's personal only) |

### 6.3 Aggregation Rules

**Top Categories Selection:**
1. Calculate total expense amount per category for the full date range
2. Sort categories by total amount descending
3. Select top N categories (default 8)
4. Sum remaining categories into "Others"

**Time Period Aggregation:**
- **Daily:** Group by calendar day
- **Weekly:** Group by ISO week (Monday start)
- **Monthly:** Group by calendar month

**Period Labels (Portuguese):**
- Daily: "15 Nov" (day + month abbreviation)
- Weekly: "1-7 Nov" (day range + month)
- Monthly: "Nov", "Dez", "Jan" (3-letter abbreviation)

**Month Abbreviations:**
```go
var monthAbbreviations = map[time.Month]string{
    time.January:   "Jan",
    time.February:  "Fev",
    time.March:     "Mar",
    time.April:     "Abr",
    time.May:       "Mai",
    time.June:      "Jun",
    time.July:      "Jul",
    time.August:    "Ago",
    time.September: "Set",
    time.October:   "Out",
    time.November:  "Nov",
    time.December:  "Dez",
}
```

---

## 7. Helper Functions

```go
// Location: backend/internal/application/usecase/dashboard/category_trends_helpers.go

// calculateCategoryTotals sums expenses by category
func calculateCategoryTotals(
    transactions []*entity.TransactionWithCategory,
) map[uuid.UUID]decimal.Decimal {
    totals := make(map[uuid.UUID]decimal.Decimal)
    for _, tx := range transactions {
        if tx.CategoryID == nil {
            continue // Skip uncategorized
        }
        current := totals[*tx.CategoryID]
        totals[*tx.CategoryID] = current.Add(tx.Amount.Abs())
    }
    return totals
}

// selectTopCategories returns top N category IDs and "others" total
func selectTopCategories(
    totals map[uuid.UUID]decimal.Decimal,
    topN int,
) ([]uuid.UUID, decimal.Decimal) {
    // Sort by total descending
    type catTotal struct {
        ID    uuid.UUID
        Total decimal.Decimal
    }
    var sorted []catTotal
    for id, total := range totals {
        sorted = append(sorted, catTotal{ID: id, Total: total})
    }
    sort.Slice(sorted, func(i, j int) bool {
        return sorted[i].Total.GreaterThan(sorted[j].Total)
    })

    // Select top N
    topIDs := make([]uuid.UUID, 0, topN)
    othersTotal := decimal.Zero
    for i, ct := range sorted {
        if i < topN {
            topIDs = append(topIDs, ct.ID)
        } else {
            othersTotal = othersTotal.Add(ct.Total)
        }
    }

    return topIDs, othersTotal
}

// aggregateByPeriod groups transactions by time period
func aggregateByPeriod(
    transactions []*entity.TransactionWithCategory,
    topCategoryIDs []uuid.UUID,
    granularity Granularity,
    startDate, endDate time.Time,
) []TrendDataPoint {
    // Create a set of top category IDs for quick lookup
    topSet := make(map[uuid.UUID]bool)
    for _, id := range topCategoryIDs {
        topSet[id] = true
    }

    // Initialize periods
    periods := generatePeriods(startDate, endDate, granularity)

    // Aggregate
    for _, tx := range transactions {
        if tx.CategoryID == nil {
            continue
        }
        periodKey := getPeriodKey(tx.Date, granularity)
        catID := *tx.CategoryID
        if !topSet[catID] {
            catID = OthersCategoryID // Constant UUID for "Others"
        }
        // Add to appropriate period/category
        // ... implementation
    }

    return periods
}

// getPeriodLabel returns human-readable label in Portuguese
func getPeriodLabel(date time.Time, granularity Granularity) string {
    switch granularity {
    case GranularityDaily:
        return fmt.Sprintf("%d %s", date.Day(), monthAbbreviations[date.Month()])
    case GranularityWeekly:
        weekEnd := date.AddDate(0, 0, 6)
        if date.Month() == weekEnd.Month() {
            return fmt.Sprintf("%d-%d %s", date.Day(), weekEnd.Day(), monthAbbreviations[date.Month()])
        }
        return fmt.Sprintf("%d %s - %d %s",
            date.Day(), monthAbbreviations[date.Month()],
            weekEnd.Day(), monthAbbreviations[weekEnd.Month()])
    case GranularityMonthly:
        return monthAbbreviations[date.Month()]
    }
    return ""
}
```

---

## 8. Error Handling

```go
// Location: backend/internal/domain/errors/category_trends_errors.go

package errors

import "errors"

var (
    ErrInvalidDateFormat    = errors.New("invalid date format, expected YYYY-MM-DD")
    ErrInvalidDateRange     = errors.New("end_date must be after start_date")
    ErrInvalidGranularity   = errors.New("granularity must be: daily, weekly, or monthly")
    ErrMissingStartDate     = errors.New("start_date is required")
    ErrMissingEndDate       = errors.New("end_date is required")
)
```

---

## 9. Testing

### 9.1 BDD Feature File Location
```
backend/test/integration/features/category_trends.feature
```

### 9.2 Step Definitions Location
```
backend/test/integration/steps/category_trends_steps.go
```

### 9.3 Unit Test Location
```
backend/internal/application/usecase/dashboard/get_category_trends_test.go
```

### 9.4 Unit Test Examples

```go
func TestGetCategoryTrends_HappyPath(t *testing.T) {
    // Arrange
    mockTxRepo := mocks.NewMockTransactionRepository()
    mockCatRepo := mocks.NewMockCategoryRepository()
    uc := NewGetCategoryTrendsUseCase(mockTxRepo, mockCatRepo)

    userID := uuid.New()
    startDate := time.Date(2024, 11, 1, 0, 0, 0, 0, time.UTC)
    endDate := time.Date(2024, 11, 30, 0, 0, 0, 0, time.UTC)

    // Setup mock data
    mockTxRepo.On("GetExpensesByDateRange", mock.Anything, userID, startDate, endDate).
        Return(testTransactions, nil)
    mockCatRepo.On("GetByIDs", mock.Anything, mock.Anything).
        Return(testCategories, nil)

    // Act
    output, err := uc.Execute(context.Background(), GetCategoryTrendsInput{
        UserID:        userID,
        StartDate:     startDate,
        EndDate:       endDate,
        Granularity:   GranularityDaily,
        TopCategories: 8,
    })

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, output)
    assert.Len(t, output.Categories, 3)
    assert.Len(t, output.Trends, 30) // 30 days in November
}

func TestGetCategoryTrends_InvalidDateRange(t *testing.T) {
    // Arrange
    uc := NewGetCategoryTrendsUseCase(nil, nil)

    // Act
    _, err := uc.Execute(context.Background(), GetCategoryTrendsInput{
        UserID:      uuid.New(),
        StartDate:   time.Date(2024, 11, 30, 0, 0, 0, 0, time.UTC),
        EndDate:     time.Date(2024, 11, 1, 0, 0, 0, 0, time.UTC), // Before start
        Granularity: GranularityDaily,
    })

    // Assert
    assert.Error(t, err)
    assert.Equal(t, ErrInvalidDateRange, err)
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Existing Dashboard Use Case:** `backend/internal/application/usecase/group/get_group_dashboard.go`
