# Feature: Category Expense Trends Chart

**Code:** M13-category-trends
**Milestone:** M13
**Status:** Specification Complete

## Overview

A multi-line chart visualization on the dashboard that displays expense trends per category over time. Users can track how their spending in different categories evolves across days, weeks, or months, with full interactivity including tooltips, legend toggling, and drill-down to transactions.

## User Stories

- As a user, I want to see how my spending in each category changes over time so that I can identify spending patterns and trends
- As a user, I want to toggle category visibility so that I can focus on specific categories of interest
- As a user, I want to click on a data point to see the actual transactions so that I can understand what contributed to that spending
- As a user, I want to switch between daily, weekly, and monthly views so that I can analyze trends at different granularities

## Key Features

1. **Multi-Line Chart** - Separate colored line for each of the top 8 expense categories
2. **"Others" Aggregation** - Categories beyond top 8 are grouped into an "Others" line
3. **Time Granularity Toggle** - Switch between Daily, Weekly, and Monthly aggregation
4. **Dashboard Period Sync** - Uses the same date range as the main dashboard period selector
5. **Interactive Legend** - Click to show/hide individual category lines
6. **Hover Tooltips** - Display exact values when hovering over data points
7. **Drill-Down** - Click on a data point to navigate to filtered transactions view

## Dependencies

- **Requires:**
  - M3-transactions (Transaction data and filtering)
  - M4-categories (Category entity and colors)
  - M5-dashboard (Dashboard period selector and layout)
- **Enables:** None (standalone visualization feature)

## Specification Files

| File | Description |
|------|-------------|
| [ui-requirements.md](./ui-requirements.md) | Frontend UI specifications |
| [integration.md](./integration.md) | API contracts & state management |
| [backend-tdd.md](./backend-tdd.md) | Backend implementation specs |
| [infrastructure.md](./infrastructure.md) | Database queries & infrastructure |
| [e2e-scenarios.md](./e2e-scenarios.md) | End-to-end test scenarios |

## Quick Links

- **Frontend Code:** `frontend/src/main/features/dashboard/components/CategoryTrendsChart.tsx`
- **Backend Code:** `backend/internal/application/usecase/dashboard/get_category_trends.go`
- **E2E Tests:** `e2e/tests/M13-category-trends/`

## Implementation Checklist

- [ ] UI Requirements reviewed
- [ ] Integration contracts defined
- [ ] Backend TDD scenarios written
- [ ] Infrastructure queries defined
- [ ] E2E scenarios defined
- [ ] Ready for implementation
