# Task: Add Custom Date Range Selection to Dashboards

## Overview

Currently, both the user dashboard and group dashboard only support predefined period options: "Este Mes", "Mes Passado", "Esta Semana", and "Semana Passada". Users need the ability to select custom date ranges to analyze their financial data for specific periods (e.g., a vacation period, a project duration, or any arbitrary date range).

**Goal:** Enable users to select a custom date range on both the personal dashboard and group dashboard, with start and end date pickers that filter all dashboard data accordingly.

---

## Current State Analysis

### What Exists

#### Frontend

1. **Period Type** (`frontend/src/main/features/dashboard/types.ts:54`):
   ```typescript
   export type Period = 'this_month' | 'last_month' | 'this_week' | 'last_week' | 'custom'
   ```
   Note: `'custom'` is already defined but NOT implemented.

2. **PeriodSelector Component** (`frontend/src/main/features/dashboard/components/PeriodSelector.tsx`):
   - Dropdown with 4 predefined options
   - Does NOT include "custom" option
   - Does NOT show date pickers

3. **DatePicker Component** (`frontend/src/main/components/ui/DatePicker/DatePicker.tsx`):
   - Fully functional single date picker
   - Brazilian locale (DD/MM/YYYY format)
   - Calendar dropdown with month/year navigation
   - Supports min/max date constraints

4. **Dashboard API** (`frontend/src/main/features/dashboard/api/dashboard.ts`):
   - `getDateRangeForPeriod(period)` - converts period to startDate/endDate
   - `fetchDashboardData(period)` - fetches data using period
   - Does NOT support custom startDate/endDate parameters

5. **User Dashboard** (`frontend/src/main/features/dashboard/DashboardScreen.tsx`):
   - Uses `period` state with `Period` type
   - Calls `fetchDashboardData(period)`

6. **Group Dashboard API** (`frontend/src/main/features/groups/api/groups.ts`):
   - `fetchGroupDashboard(groupId, period)` - fetches with period query param
   - Backend endpoint: `GET /groups/:id/dashboard?period={period}`

7. **GroupDashboardTab** (`frontend/src/main/features/groups/components/GroupDashboardTab.tsx`):
   - Receives `period` and `onPeriodChange` as props

#### Backend

1. **Dashboard Period Type** (`backend/internal/application/usecase/group/get_group_dashboard.go:16-24`):
   ```go
   type DashboardPeriod string
   const (
       PeriodThisMonth DashboardPeriod = "this_month"
       PeriodLastMonth DashboardPeriod = "last_month"
       PeriodThisWeek  DashboardPeriod = "this_week"
       PeriodLastWeek  DashboardPeriod = "last_week"
   )
   ```

2. **GetGroupDashboardInput** (`backend/internal/application/usecase/group/get_group_dashboard.go:26-31`):
   ```go
   type GetGroupDashboardInput struct {
       GroupID uuid.UUID
       UserID  uuid.UUID
       Period  DashboardPeriod
   }
   ```
   Does NOT support custom startDate/endDate.

3. **Group Controller** (`backend/internal/integration/entrypoint/controller/group.go:464-517`):
   - Parses `period` query parameter
   - Does NOT parse `start_date`/`end_date` query parameters

### What's Missing

1. **Frontend:**
   - "Personalizado" (Custom) option in PeriodSelector
   - Date range picker UI that appears when custom is selected
   - Support for custom date range in dashboard API calls
   - State management for custom date range

2. **Backend:**
   - Support for `start_date` and `end_date` query parameters in group dashboard
   - Validation of custom date range
   - Custom period calculation logic

---

## Execution Plan

### Phase 1: Backend Implementation

Add support for custom date range parameters in the group dashboard endpoint.

### Phase 2: Frontend - PeriodSelector Enhancement

Update PeriodSelector to include "Personalizado" option and show date pickers when selected.

### Phase 3: Frontend - Dashboard Integration

Update both user and group dashboards to pass custom date range to APIs.

### Phase 4: E2E Tests

Create E2E tests to verify custom date range functionality.

### Phase 5: Verification

Run all tests to ensure no regressions.

---

## Detailed Specifications

### Backend Changes

#### 1. Update GetGroupDashboardInput (`backend/internal/application/usecase/group/get_group_dashboard.go`)

```go
// GetGroupDashboardInput represents the input for getting group dashboard data.
type GetGroupDashboardInput struct {
    GroupID   uuid.UUID
    UserID    uuid.UUID
    Period    DashboardPeriod
    StartDate *time.Time // Optional: for custom period
    EndDate   *time.Time // Optional: for custom period
}
```

#### 2. Update Execute method to handle custom dates

```go
func (uc *GetGroupDashboardUseCase) Execute(ctx context.Context, input GetGroupDashboardInput) (*GetGroupDashboardOutput, error) {
    // ... membership check ...

    var startDate, endDate time.Time
    var prevStartDate, prevEndDate time.Time

    // Use custom dates if provided, otherwise calculate from period
    if input.StartDate != nil && input.EndDate != nil {
        startDate = *input.StartDate
        endDate = *input.EndDate
        // Calculate previous period with same duration
        duration := endDate.Sub(startDate)
        prevEndDate = startDate.AddDate(0, 0, -1)
        prevStartDate = prevEndDate.Add(-duration)
    } else {
        startDate, endDate = uc.calculateDateRange(input.Period)
        prevStartDate, prevEndDate = uc.calculatePreviousPeriodRange(input.Period, startDate, endDate)
    }

    // ... rest of the method ...
}
```

#### 3. Update Group Controller (`backend/internal/integration/entrypoint/controller/group.go`)

Add parsing for `start_date` and `end_date` query parameters:

```go
// GetDashboard handles GET /groups/:id/dashboard requests.
func (c *GroupController) GetDashboard(ctx *gin.Context) {
    // ... existing auth and group ID parsing ...

    // Parse period from query parameter
    periodStr := ctx.Query("period")
    period := group.PeriodThisMonth

    // Parse optional custom date range
    var startDate, endDate *time.Time
    startDateStr := ctx.Query("start_date")
    endDateStr := ctx.Query("end_date")

    if startDateStr != "" && endDateStr != "" {
        // Parse dates in YYYY-MM-DD format
        parsedStart, err := time.Parse("2006-01-02", startDateStr)
        if err != nil {
            ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
                Error: "Invalid start_date format. Use YYYY-MM-DD",
            })
            return
        }
        parsedEnd, err := time.Parse("2006-01-02", endDateStr)
        if err != nil {
            ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
                Error: "Invalid end_date format. Use YYYY-MM-DD",
            })
            return
        }

        // Validate date range
        if parsedEnd.Before(parsedStart) {
            ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
                Error: "end_date cannot be before start_date",
            })
            return
        }

        startDate = &parsedStart
        endDate = &parsedEnd
    } else {
        // Use period-based calculation
        switch periodStr {
        case "this_month":
            period = group.PeriodThisMonth
        case "last_month":
            period = group.PeriodLastMonth
        case "this_week":
            period = group.PeriodThisWeek
        case "last_week":
            period = group.PeriodLastWeek
        }
    }

    // Build input
    input := group.GetGroupDashboardInput{
        GroupID:   groupID,
        UserID:    userID,
        Period:    period,
        StartDate: startDate,
        EndDate:   endDate,
    }

    // ... execute use case ...
}
```

### Frontend Changes

#### 1. Update PeriodSelector Component (`frontend/src/main/features/dashboard/components/PeriodSelector.tsx`)

```typescript
import { useState, useRef, useEffect } from 'react'
import type { Period } from '../types'
import { DatePicker } from '@main/components/ui/DatePicker'

interface DateRange {
    startDate: string // DD/MM/YYYY
    endDate: string   // DD/MM/YYYY
}

interface PeriodSelectorProps {
    value: Period
    onChange: (period: Period) => void
    customDateRange?: DateRange
    onCustomDateRangeChange?: (range: DateRange) => void
}

const periodOptions: { value: Period; label: string }[] = [
    { value: 'this_month', label: 'Este Mes' },
    { value: 'last_month', label: 'Mes Passado' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'last_week', label: 'Semana Passada' },
    { value: 'custom', label: 'Personalizado' },
]

export function PeriodSelector({
    value,
    onChange,
    customDateRange,
    onCustomDateRangeChange
}: PeriodSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [showDatePickers, setShowDatePickers] = useState(value === 'custom')
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOption = periodOptions.find((opt) => opt.value === value)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handlePeriodSelect = (period: Period) => {
        onChange(period)
        if (period === 'custom') {
            setShowDatePickers(true)
        } else {
            setShowDatePickers(false)
            setIsOpen(false)
        }
    }

    const handleStartDateChange = (date: string) => {
        if (onCustomDateRangeChange && customDateRange) {
            onCustomDateRangeChange({
                ...customDateRange,
                startDate: date,
            })
        }
    }

    const handleEndDateChange = (date: string) => {
        if (onCustomDateRangeChange && customDateRange) {
            onCustomDateRangeChange({
                ...customDateRange,
                endDate: date,
            })
        }
    }

    // Format custom date range for display
    const getDisplayLabel = () => {
        if (value === 'custom' && customDateRange?.startDate && customDateRange?.endDate) {
            return `${customDateRange.startDate} - ${customDateRange.endDate}`
        }
        return selectedOption?.label
    }

    return (
        <div ref={containerRef} data-testid="period-selector" className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-background)]"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="max-w-[200px] truncate">{getDisplayLabel()}</span>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className="absolute z-10 mt-1 min-w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg"
                >
                    {periodOptions.map((option) => (
                        <div
                            key={option.value}
                            role="option"
                            aria-selected={value === option.value}
                            onClick={() => handlePeriodSelect(option.value)}
                            data-testid={`period-option-${option.value}`}
                            className={`px-3 py-2 cursor-pointer hover:bg-[var(--color-background)] whitespace-nowrap ${
                                value === option.value ? 'bg-[var(--color-primary)] text-white' : ''
                            }`}
                        >
                            {option.label}
                        </div>
                    ))}

                    {/* Custom Date Range Pickers */}
                    {showDatePickers && (
                        <div
                            className="p-3 border-t border-[var(--color-border)] space-y-3"
                            data-testid="custom-date-range"
                        >
                            <div>
                                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                                    Data Inicial
                                </label>
                                <DatePicker
                                    value={customDateRange?.startDate || ''}
                                    onChange={handleStartDateChange}
                                    placeholder="DD/MM/YYYY"
                                    data-testid="custom-start-date"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                                    Data Final
                                </label>
                                <DatePicker
                                    value={customDateRange?.endDate || ''}
                                    onChange={handleEndDateChange}
                                    placeholder="DD/MM/YYYY"
                                    data-testid="custom-end-date"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                disabled={!customDateRange?.startDate || !customDateRange?.endDate}
                                className="w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed"
                                data-testid="apply-custom-date"
                            >
                                Aplicar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
```

#### 2. Update Dashboard API (`frontend/src/main/features/dashboard/api/dashboard.ts`)

Update `fetchDashboardData` to support custom date range:

```typescript
export interface FetchDashboardOptions {
    period: Period
    customStartDate?: string // YYYY-MM-DD
    customEndDate?: string   // YYYY-MM-DD
}

export async function fetchDashboardData(options: FetchDashboardOptions): Promise<DashboardData> {
    let startDate: string
    let endDate: string
    let previousPeriod: { startDate: string; endDate: string }

    if (options.period === 'custom' && options.customStartDate && options.customEndDate) {
        startDate = options.customStartDate
        endDate = options.customEndDate
        // Calculate previous period with same duration
        const start = new Date(startDate)
        const end = new Date(endDate)
        const durationMs = end.getTime() - start.getTime()
        const prevEnd = new Date(start.getTime() - 86400000) // day before start
        const prevStart = new Date(prevEnd.getTime() - durationMs)
        previousPeriod = {
            startDate: prevStart.toISOString().split('T')[0],
            endDate: prevEnd.toISOString().split('T')[0],
        }
    } else {
        const range = getDateRangeForPeriod(options.period)
        startDate = range.startDate
        endDate = range.endDate
        previousPeriod = getPreviousPeriodRange(options.period)
    }

    // ... rest of the fetch logic using startDate, endDate, previousPeriod ...
}
```

#### 3. Update DashboardScreen (`frontend/src/main/features/dashboard/DashboardScreen.tsx`)

```typescript
interface DateRange {
    startDate: string
    endDate: string
}

export function DashboardScreen() {
    const [period, setPeriod] = useState<Period>('this_month')
    const [customDateRange, setCustomDateRange] = useState<DateRange>({
        startDate: '',
        endDate: '',
    })
    // ... other state ...

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            let options: FetchDashboardOptions = { period }

            if (period === 'custom' && customDateRange.startDate && customDateRange.endDate) {
                // Convert DD/MM/YYYY to YYYY-MM-DD
                const [startDay, startMonth, startYear] = customDateRange.startDate.split('/')
                const [endDay, endMonth, endYear] = customDateRange.endDate.split('/')
                options = {
                    period,
                    customStartDate: `${startYear}-${startMonth}-${startDay}`,
                    customEndDate: `${endYear}-${endMonth}-${endDay}`,
                }
            }

            const data = await fetchDashboardData(options)
            setDashboardData(data)
            setLastUpdated(new Date())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
        } finally {
            setIsLoading(false)
        }
    }, [period, customDateRange])

    // ... in return ...
    <PeriodSelector
        value={period}
        onChange={setPeriod}
        customDateRange={customDateRange}
        onCustomDateRangeChange={setCustomDateRange}
    />
}
```

#### 4. Update Group Dashboard API (`frontend/src/main/features/groups/api/groups.ts`)

```typescript
export interface FetchGroupDashboardOptions {
    groupId: string
    period?: Period
    customStartDate?: string // YYYY-MM-DD
    customEndDate?: string   // YYYY-MM-DD
}

export async function fetchGroupDashboard(options: FetchGroupDashboardOptions): Promise<GroupDashboardData> {
    const { groupId, period = 'this_month', customStartDate, customEndDate } = options

    let url = `${API_BASE}/groups/${groupId}/dashboard`

    if (period === 'custom' && customStartDate && customEndDate) {
        url += `?start_date=${customStartDate}&end_date=${customEndDate}`
    } else {
        url += `?period=${period}`
    }

    const response = await authenticatedFetch(url, { method: 'GET' })
    // ... rest of the function ...
}
```

### E2E Test Scenarios

**File:** `e2e/tests/m2-dashboard/custom-date-range.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

/**
 * M2-E2E: Custom Date Range Selection for Dashboards
 *
 * Tests the ability to select custom date ranges for both
 * personal and group dashboards.
 */

test.describe('M2: Custom Date Range Selection', () => {
    test.beforeEach(async ({ page }) => {
        // Login and navigate to dashboard
        await page.goto('/login')
        await page.getByTestId('email-input').fill('test@example.com')
        await page.getByTestId('password-input').fill('password123')
        await page.getByTestId('login-btn').click()
        await expect(page.getByTestId('dashboard-screen')).toBeVisible({ timeout: 10000 })
    })

    test('M2-CUSTOM-001: Should show custom date range option in period selector', async ({ page }) => {
        // Open period selector
        await page.getByTestId('period-selector').click()

        // Verify "Personalizado" option is visible
        await expect(page.getByTestId('period-option-custom')).toBeVisible()
        await expect(page.getByTestId('period-option-custom')).toHaveText('Personalizado')
    })

    test('M2-CUSTOM-002: Should show date pickers when custom is selected', async ({ page }) => {
        // Open period selector and select custom
        await page.getByTestId('period-selector').click()
        await page.getByTestId('period-option-custom').click()

        // Verify date pickers are visible
        await expect(page.getByTestId('custom-date-range')).toBeVisible()
        await expect(page.getByTestId('custom-start-date')).toBeVisible()
        await expect(page.getByTestId('custom-end-date')).toBeVisible()
    })

    test('M2-CUSTOM-003: Should filter dashboard data by custom date range', async ({ page }) => {
        // First, import some test transactions or ensure data exists
        // Navigate to transactions and import test data if needed

        // Open period selector and select custom
        await page.getByTestId('period-selector').click()
        await page.getByTestId('period-option-custom').click()

        // Enter custom date range (last 7 days)
        const today = new Date()
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

        const formatDate = (d: Date) => {
            const day = String(d.getDate()).padStart(2, '0')
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const year = d.getFullYear()
            return `${day}/${month}/${year}`
        }

        await page.getByTestId('custom-start-date').click()
        await page.getByTestId('custom-start-date-input').fill(formatDate(lastWeek))

        await page.getByTestId('custom-end-date').click()
        await page.getByTestId('custom-end-date-input').fill(formatDate(today))

        // Apply custom range
        await page.getByTestId('apply-custom-date').click()

        // Verify period selector shows the custom range
        const selectorText = await page.getByTestId('period-selector').textContent()
        expect(selectorText).toContain(formatDate(lastWeek))
        expect(selectorText).toContain(formatDate(today))

        // Verify dashboard updated (loading indicator should appear and disappear)
        await expect(page.getByTestId('loading-indicator')).toBeVisible()
        await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 10000 })
    })

    test('M2-CUSTOM-004: Should validate date range (end date after start date)', async ({ page }) => {
        // Open period selector and select custom
        await page.getByTestId('period-selector').click()
        await page.getByTestId('period-option-custom').click()

        // Enter invalid date range (start after end)
        await page.getByTestId('custom-start-date-input').fill('15/11/2025')
        await page.getByTestId('custom-end-date-input').fill('01/11/2025')

        // Apply button should be disabled or show error
        const applyBtn = page.getByTestId('apply-custom-date')
        await expect(applyBtn).toBeDisabled()
    })

    test('M2-CUSTOM-005: Should persist custom date range on page refresh', async ({ page }) => {
        // Select custom date range
        await page.getByTestId('period-selector').click()
        await page.getByTestId('period-option-custom').click()

        await page.getByTestId('custom-start-date-input').fill('01/11/2025')
        await page.getByTestId('custom-end-date-input').fill('15/11/2025')
        await page.getByTestId('apply-custom-date').click()

        // Wait for dashboard to load
        await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 10000 })

        // Refresh page
        await page.reload()
        await expect(page.getByTestId('dashboard-screen')).toBeVisible({ timeout: 10000 })

        // Verify custom range is persisted (or defaults to this_month)
        // Note: This depends on implementation - may need URL params or localStorage
    })
})

test.describe('M9: Group Dashboard Custom Date Range', () => {
    test.beforeEach(async ({ page }) => {
        // Login and navigate to a group dashboard
        await page.goto('/login')
        await page.getByTestId('email-input').fill('test@example.com')
        await page.getByTestId('password-input').fill('password123')
        await page.getByTestId('login-btn').click()
        await expect(page.getByTestId('dashboard-screen')).toBeVisible({ timeout: 10000 })

        // Navigate to groups
        await page.goto('/groups')
        await expect(page.getByTestId('groups-screen')).toBeVisible()
    })

    test('M9-CUSTOM-001: Should support custom date range on group dashboard', async ({ page }) => {
        // Click on first group
        const firstGroup = page.getByTestId('group-card').first()
        if (await firstGroup.isVisible()) {
            await firstGroup.click()
            await expect(page.getByTestId('group-detail-screen')).toBeVisible()

            // Navigate to dashboard tab
            await page.getByTestId('group-tabs').getByText(/dashboard/i).click()

            // Open period selector and select custom
            await page.getByTestId('period-selector').click()
            await expect(page.getByTestId('period-option-custom')).toBeVisible()
            await page.getByTestId('period-option-custom').click()

            // Verify date pickers appear
            await expect(page.getByTestId('custom-date-range')).toBeVisible()
        }
    })
})
```

---

## Files to Create/Modify

### Backend Files (Modified):
- `backend/internal/application/usecase/group/get_group_dashboard.go` - Add custom date support to input struct and execute method
- `backend/internal/integration/entrypoint/controller/group.go` - Parse start_date/end_date query params

### Frontend Files (Modified):
- `frontend/src/main/features/dashboard/components/PeriodSelector.tsx` - Add custom option and date pickers
- `frontend/src/main/features/dashboard/api/dashboard.ts` - Support custom date range in fetch
- `frontend/src/main/features/dashboard/DashboardScreen.tsx` - Manage custom date range state
- `frontend/src/main/features/groups/api/groups.ts` - Support custom date range in group dashboard fetch
- `frontend/src/main/features/groups/components/GroupDetailScreen.tsx` - Pass custom date range to GroupDashboardTab

### New Files:
- `e2e/tests/m2-dashboard/custom-date-range.spec.ts` - E2E tests for custom date range

### Optional BDD Feature File:
- `backend/test/integration/features/group-dashboard-custom-date.feature` - BDD tests for custom date API

---

## Step-by-Step Execution Instructions

### Step 1: Backend - Update Use Case Input

Edit `backend/internal/application/usecase/group/get_group_dashboard.go`:
1. Add `StartDate *time.Time` and `EndDate *time.Time` to `GetGroupDashboardInput`
2. Update `Execute()` to check for custom dates before calling `calculateDateRange()`

### Step 2: Backend - Update Controller

Edit `backend/internal/integration/entrypoint/controller/group.go`:
1. In `GetDashboard()`, parse `start_date` and `end_date` query parameters
2. Validate date format (YYYY-MM-DD)
3. Validate end_date >= start_date
4. Pass parsed dates to use case input

### Step 3: Run Backend Tests

```bash
cd backend && make test
```

### Step 4: Frontend - Update PeriodSelector

Edit `frontend/src/main/features/dashboard/components/PeriodSelector.tsx`:
1. Add "Personalizado" option to `periodOptions`
2. Add props for `customDateRange` and `onCustomDateRangeChange`
3. Add date picker UI that shows when custom is selected
4. Add "Aplicar" button to close dropdown

### Step 5: Frontend - Update Dashboard API

Edit `frontend/src/main/features/dashboard/api/dashboard.ts`:
1. Create `FetchDashboardOptions` interface
2. Update `fetchDashboardData()` to accept options object
3. Handle custom date range conversion

### Step 6: Frontend - Update DashboardScreen

Edit `frontend/src/main/features/dashboard/DashboardScreen.tsx`:
1. Add `customDateRange` state
2. Pass props to `PeriodSelector`
3. Update `loadDashboardData()` to use custom dates

### Step 7: Frontend - Update Group Dashboard API

Edit `frontend/src/main/features/groups/api/groups.ts`:
1. Update `fetchGroupDashboard()` to accept custom date parameters
2. Build URL with `start_date` and `end_date` query params for custom period

### Step 8: Frontend - Update Group Detail Screen

Edit `frontend/src/main/features/groups/components/GroupDetailScreen.tsx`:
1. Add `customDateRange` state
2. Pass to GroupDashboardTab
3. Update fetch call to use custom dates

### Step 9: Create E2E Tests

Create `e2e/tests/m2-dashboard/custom-date-range.spec.ts` with the test scenarios above.

### Step 10: Run All Tests

```bash
# Backend tests
cd backend && make test

# Frontend build
cd frontend && npm run build

# E2E tests
cd e2e && npx playwright test tests/m2-dashboard/custom-date-range.spec.ts
```

---

## Acceptance Criteria

- [ ] PeriodSelector shows "Personalizado" option in dropdown
- [ ] Selecting "Personalizado" reveals start and end date pickers
- [ ] Date pickers use DD/MM/YYYY format (Brazilian locale)
- [ ] "Aplicar" button is disabled until both dates are selected
- [ ] Dashboard updates when custom date range is applied
- [ ] Period selector displays the custom date range (e.g., "01/11/2025 - 15/11/2025")
- [ ] Group dashboard also supports custom date range
- [ ] Backend validates date format and range (end >= start)
- [ ] Previous period comparison works correctly for custom ranges
- [ ] All existing period options continue to work
- [ ] All existing E2E tests pass
- [ ] New E2E tests pass

---

## Related Documentation

- **File:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - UI design guidelines
- **File:** `frontend/src/main/features/dashboard/types.ts:54` - Period type already includes 'custom'
- **File:** `frontend/src/main/components/ui/DatePicker/DatePicker.tsx` - Existing DatePicker component
- **Tests:** `e2e/tests/m2-dashboard/` - Existing dashboard E2E tests
- **Tests:** `e2e/tests/m9-groups/` - Existing group E2E tests

---

## Commands to Run

```bash
# Run backend tests
cd backend && make test

# Run backend integration tests
cd backend && make test-integration

# Build frontend
cd frontend && npm run build

# Run specific E2E test file
cd e2e && npx playwright test tests/m2-dashboard/custom-date-range.spec.ts

# Run all E2E tests
cd e2e && npx playwright test

# Run all tests
cd backend && make test && cd ../frontend && npm run build && cd ../e2e && npx playwright test
```

---

## Technical Notes

### Date Format Handling

1. **Frontend DatePicker**: Uses DD/MM/YYYY (Brazilian format)
2. **Frontend API**: Converts to YYYY-MM-DD for API calls
3. **Backend API**: Expects YYYY-MM-DD in query parameters
4. **Backend Storage**: Uses Go `time.Time`

### Previous Period Calculation for Custom Range

When a custom date range is selected, the previous period is calculated as:
- Same duration as the custom range
- Ending the day before the custom range starts

Example:
- Custom range: Nov 1-15 (15 days)
- Previous period: Oct 17-31 (15 days, ending Oct 31 which is day before Nov 1)

### URL Parameters vs Period

When `start_date` and `end_date` are provided, the `period` parameter is ignored.
This allows backwards compatibility - existing code using `?period=this_month` continues to work.
