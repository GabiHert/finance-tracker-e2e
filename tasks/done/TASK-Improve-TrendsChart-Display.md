# Task: Improve TrendsChart X-Axis Display and Line Thickness

## Problem Description

The "Evolucao Financeira" (Financial Evolution) chart on the dashboard has two issues:

### Issue 1: Repeated Month Labels on X-Axis
When all transactions are from the same month (e.g., October), the X-axis shows "out." repeated for every data point because:
- Each data point has a date like `2024-10-01`, `2024-10-05`, `2024-10-10`, etc.
- The `formatMonth()` function only shows the month abbreviation (`out.` for outubro)
- Result: "out. out. out. out. out. out. out. out. out. out."

### Issue 2: Line Thickness
The current `strokeWidth="2"` makes the lines appear too thick, especially on smaller screens.

## File Location
`frontend/src/main/features/dashboard/components/TrendsChart.tsx`

## Current Implementation

### X-Axis Label Formatting (Lines 39-42, 99-109)
```typescript
const formatMonth = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
}

// X-axis labels
{data.map((d, i) => (
  <text
    key={`label-${i}`}
    x={getX(i)}
    y={chartHeight + 15}
    textAnchor="middle"
    className="text-xs fill-[var(--color-text-secondary)]"
  >
    {formatMonth(d.date)}
  </text>
))}
```

### Line Thickness (Lines 67-86)
```typescript
<path
  d={incomePath}
  fill="none"
  stroke="#10B981"
  strokeWidth="2"  // Current thickness
  strokeLinecap="round"
  strokeLinejoin="round"
/>
```

## Required Changes

### 1. Smart X-Axis Label Formatting ("Zoom In" Effect)

Implement intelligent label formatting based on the date range of the data:

```typescript
const getDateRange = (data: TrendDataPoint[]) => {
  if (data.length === 0) return { sameMonth: false, sameYear: false }

  const dates = data.map(d => new Date(d.date))
  const months = new Set(dates.map(d => d.getMonth()))
  const years = new Set(dates.map(d => d.getFullYear()))

  return {
    sameMonth: months.size === 1,
    sameYear: years.size === 1,
    spansDays: data.length > 1 && (dates[dates.length - 1].getTime() - dates[0].getTime()) < 32 * 24 * 60 * 60 * 1000
  }
}

const formatDateLabel = (dateString: string, dateRange: ReturnType<typeof getDateRange>) => {
  const date = new Date(dateString)

  // If all data is within the same month, show day numbers (e.g., "1", "5", "10", "15")
  if (dateRange.sameMonth) {
    return date.getDate().toString()
  }

  // If data spans multiple months but same year, show "day/month" (e.g., "5/out", "10/nov")
  if (dateRange.sameYear) {
    const day = date.getDate()
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
    return `${day}/${month}`
  }

  // Default: show month abbreviation
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date)
}
```

### 2. Reduce Label Density

When there are many data points, only show labels for every Nth point to avoid crowding:

```typescript
const shouldShowLabel = (index: number, totalPoints: number) => {
  if (totalPoints <= 7) return true  // Show all labels if 7 or fewer points
  if (totalPoints <= 14) return index % 2 === 0  // Show every other label
  if (totalPoints <= 31) return index % 3 === 0 || index === totalPoints - 1  // Show every 3rd + last
  return index % 5 === 0 || index === totalPoints - 1  // Show every 5th + last
}

// In render:
{data.map((d, i) => (
  shouldShowLabel(i, data.length) && (
    <text
      key={`label-${i}`}
      x={getX(i)}
      y={chartHeight + 15}
      textAnchor="middle"
      className="text-xs fill-[var(--color-text-secondary)]"
    >
      {formatDateLabel(d.date, dateRange)}
    </text>
  )
))}
```

### 3. Reduce Line Thickness

Change `strokeWidth` from `2` to `1.5` for thinner lines:

```typescript
<path
  d={incomePath}
  fill="none"
  stroke="#10B981"
  strokeWidth="1.5"  // Reduced from 2
  strokeLinecap="round"
  strokeLinejoin="round"
/>

<path
  d={expensesPath}
  fill="none"
  stroke="#EF4444"
  strokeWidth="1.5"  // Reduced from 2
  strokeLinecap="round"
  strokeLinejoin="round"
/>
```

### 4. Optionally Reduce Data Point Size

Consider reducing circle radius from 4 to 3:

```typescript
<circle key={`income-${i}`} cx={getX(i)} cy={getY(d.income)} r="3" fill="#10B981" />
<circle key={`expense-${i}`} cx={getX(i)} cy={getY(d.expenses)} r="3" fill="#EF4444" />
```

## Expected Results

### Before (Current):
- X-axis: `out. out. out. out. out. out. out. out. out. out.`
- Lines: Thick (strokeWidth=2)

### After (Fixed):
- X-axis when same month: `1  5  10  15  20  25  30` (day numbers)
- X-axis when multiple months: `5/out  10/nov  15/dez` (day/month)
- Lines: Thinner (strokeWidth=1.5)

## Testing

1. Create transactions all in the same month → X-axis should show day numbers
2. Create transactions spanning multiple months → X-axis should show day/month or month
3. Verify lines appear thinner and cleaner
4. Test with varying numbers of data points (5, 10, 20, 30+) to verify label density

## Files to Modify

- `frontend/src/main/features/dashboard/components/TrendsChart.tsx`

## Acceptance Criteria

- [ ] X-axis shows day numbers when all data is in the same month
- [ ] X-axis shows appropriate format when data spans multiple months
- [ ] Label density is reduced to avoid crowding on X-axis
- [ ] Line thickness reduced from 2 to 1.5
- [ ] Chart remains readable and visually appealing
- [ ] No regression in chart functionality
