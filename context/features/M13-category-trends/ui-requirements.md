# UI Requirements: Category Expense Trends Chart

**Feature Code:** M13-category-trends
**Last Updated:** 2025-12-05

---

## 1. Overview

### 1.1 Feature Purpose
Display a multi-line chart showing expense trends per category over time, allowing users to visualize and analyze their spending patterns across different categories.

### 1.2 User Entry Points
- Automatically visible on the Dashboard screen, below the existing TrendsChart and DonutChart row
- No separate navigation required - integrated into dashboard

### 1.3 Screen Map
- Dashboard Screen (enhanced with new chart section)
- Transactions Screen (drill-down destination)

---

## 2. Screen Specifications

### 2.1 Dashboard Screen - Category Trends Section

#### Layout
- Full-width section placed below the existing charts row (TrendsChart + DonutChart)
- Card container with header, controls, and chart area
- Minimum height: 400px
- Responsive: adjusts to container width

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| Section Title | Text | "Despesas por Categoria" (Expenses by Category) |
| Granularity Toggle | SegmentedControl | Daily / Weekly / Monthly selector |
| Chart Area | SVG Multi-Line Chart | Main visualization with category lines |
| Interactive Legend | Legend | Clickable category labels with color indicators |
| Tooltip | Floating Card | Shows values on hover |

#### Visual States
- **Default:** Chart rendered with all top 8 categories + Others visible
- **Loading:** Skeleton loader matching chart dimensions
- **Empty:** Message "Sem despesas no periodo selecionado" with empty state illustration
- **Error:** Error message with retry button
- **Partial Data:** Some categories hidden via legend toggle

#### Responsive Behavior
| Breakpoint | Layout Changes |
|------------|----------------|
| Desktop (1024px+) | Legend on right side of chart, full labels |
| Tablet (768px-1023px) | Legend below chart, 2 columns |
| Mobile (<768px) | Legend below chart, 1 column, smaller chart height (300px) |

#### Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| Change granularity | Click on Daily/Weekly/Monthly | Chart re-renders with new aggregation |
| Hover data point | Mouse over chart point | Tooltip appears with date and value |
| Toggle category | Click legend item | Line shows/hides with smooth animation |
| Drill-down | Click on data point | Navigate to transactions filtered by category and date |

#### Accessibility
- Keyboard navigation: Tab through granularity toggle and legend items
- Screen reader: Announce chart title, current granularity, and data summary
- Focus management: Visible focus ring on interactive elements
- ARIA: `role="img"` on SVG with `aria-label` describing the chart

---

## 3. Component Specifications

### 3.1 CategoryTrendsChart

#### Props
```typescript
interface CategoryTrendsChartProps {
  data: CategoryTrendDataPoint[];
  isLoading?: boolean;
  onDrillDown?: (categoryId: string, date: string) => void;
}

interface CategoryTrendDataPoint {
  date: string; // YYYY-MM-DD
  categories: CategoryAmount[];
}

interface CategoryAmount {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
}
```

#### Variants
- **With Data:** Full chart with lines and legend
- **Empty:** Empty state message
- **Loading:** Skeleton placeholder

#### States
- Default: All category lines visible
- Filtered: Some lines hidden via legend
- Hovered: Data point highlighted with tooltip
- Loading: Skeleton animation

### 3.2 GranularityToggle

#### Props
```typescript
interface GranularityToggleProps {
  value: 'daily' | 'weekly' | 'monthly';
  onChange: (value: 'daily' | 'weekly' | 'monthly') => void;
  disabled?: boolean;
}
```

#### Variants
- Default: All three options enabled
- Disabled: Grayed out during loading

### 3.3 ChartLegend

#### Props
```typescript
interface ChartLegendProps {
  items: LegendItem[];
  visibleIds: Set<string>;
  onToggle: (categoryId: string) => void;
}

interface LegendItem {
  id: string;
  name: string;
  color: string;
}
```

#### States
- Active: Full opacity, checkmark or filled circle
- Hidden: Reduced opacity, strikethrough or empty circle
- Hover: Slight highlight

### 3.4 ChartTooltip

#### Props
```typescript
interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  categoryName: string;
  categoryColor: string;
  amount: number;
}
```

---

## 4. Design Tokens

### Colors Used
| Token | Usage |
|-------|-------|
| Category colors | Each category uses its stored color from DB |
| `gray-400` | "Others" category line |
| `gray-600` | Grid lines |
| `gray-800` | Axis labels |
| `white` | Tooltip background |
| `primary-500` | Active granularity toggle |

### Typography
| Element | Token |
|---------|-------|
| Section Title | `text-lg font-semibold` |
| Axis Labels | `text-xs text-gray-600` |
| Legend Items | `text-sm` |
| Tooltip Title | `text-sm font-medium` |
| Tooltip Value | `text-lg font-bold` |

### Spacing
- Card padding: `p-4` (16px)
- Chart margins: top 20px, right 120px (legend), bottom 40px (x-axis), left 60px (y-axis)
- Legend item gap: 8px vertical

---

## 5. User Flows

### 5.1 View Category Trends (Happy Path)

```
1. User navigates to Dashboard
   -> Dashboard loads with period selector set to "this_month"
2. CategoryTrendsChart fetches data for current period
   -> Loading skeleton shown
3. Data loads successfully
   -> Multi-line chart renders with top 8 categories + Others
4. User hovers over a data point
   -> Tooltip shows: "15/11 - Alimentacao: R$ 450,00"
5. User clicks "Weekly" granularity
   -> Chart re-aggregates data by week
6. User clicks on "Transporte" in legend
   -> Transporte line fades out (hidden)
7. User clicks on a data point for "Alimentacao" on 15/11
   -> Navigates to /transactions?category=<id>&startDate=2024-11-15&endDate=2024-11-15
```

### 5.2 Empty Data Flow

```
1. User has no expenses in selected period
   -> Chart shows empty state
2. Empty state displays:
   - Icon: chart-line with "?"
   - Text: "Sem despesas no periodo selecionado"
   - Subtext: "Adicione transacoes para ver suas tendencias"
```

### 5.3 Period Change Flow

```
1. User changes dashboard period to "last_month"
   -> CategoryTrendsChart receives new period via props
2. Chart shows loading state
   -> Skeleton replaces chart
3. New data loads
   -> Chart animates to new data
```

---

## 6. Toast Notifications

| Event | Type | Message |
|-------|------|---------|
| Data load error | error | "Erro ao carregar tendencias de categorias" |

---

## 7. Empty States

### 7.1 No Expenses in Period
- **Illustration:** Line chart icon with dotted lines
- **Heading:** "Sem despesas no periodo"
- **Message:** "Adicione transacoes de despesa para visualizar tendencias por categoria"
- **CTA:** None (user should add transactions first)

---

## 8. Loading States

### 8.1 Initial Load
- Skeleton rectangle matching chart dimensions
- Subtle pulse animation
- Placeholder legend items (3-4 gray rectangles)

### 8.2 Granularity Change
- Brief loading indicator (spinner in toggle button)
- Chart data refreshes in place (no full skeleton)

---

## 9. Dark Mode Considerations

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Card Background | `white` | `gray-800` |
| Chart Background | `white` | `gray-900` |
| Grid Lines | `gray-200` | `gray-700` |
| Axis Labels | `gray-600` | `gray-400` |
| Tooltip Background | `white` | `gray-800` |
| Tooltip Border | `gray-200` | `gray-700` |

---

## 10. Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Line render | Draw from left | 500ms | ease-out |
| Line toggle | Fade in/out | 200ms | ease-in-out |
| Tooltip appear | Fade + scale | 150ms | ease-out |
| Granularity change | Crossfade data | 300ms | ease-in-out |
| Data point hover | Scale up | 100ms | ease-out |

---

## 11. Chart Technical Specifications

### 11.1 SVG Structure
```
<svg viewBox="0 0 {width} {height}">
  <!-- Grid lines -->
  <g class="grid">
    <line /> <!-- horizontal grid lines -->
  </g>

  <!-- Y-axis -->
  <g class="y-axis">
    <text /> <!-- value labels -->
  </g>

  <!-- X-axis -->
  <g class="x-axis">
    <text /> <!-- date labels -->
  </g>

  <!-- Category lines -->
  <g class="lines">
    <path /> <!-- one per category -->
  </g>

  <!-- Data points (for hover/click) -->
  <g class="points">
    <circle /> <!-- one per data point -->
  </g>
</svg>
```

### 11.2 Line Rendering
- Use SVG `<path>` with `d` attribute for smooth curves
- Apply `stroke` with category color
- Use `stroke-width: 2` for visibility
- Add `stroke-linecap: round` and `stroke-linejoin: round`

### 11.3 Data Point Markers
- Small circles at each data point
- Default: `r="4"`, same color as line
- Hover: `r="6"`, white fill with colored stroke

### 11.4 Axis Labels
- Y-axis: Format as currency (R$ 1k, R$ 5k, R$ 10k)
- X-axis: Smart date formatting based on granularity:
  - Daily: "15", "16", "17" (day numbers, month label at start)
  - Weekly: "Sem 1", "Sem 2" or "1-7 Nov", "8-14 Nov"
  - Monthly: "Nov", "Dez", "Jan"

### 11.5 "Others" Category
- Fixed color: `#9CA3AF` (gray-400)
- Fixed name: "Outros"
- Represents sum of all categories beyond top 8

---

## Related Documentation

- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Existing Chart Pattern:** `frontend/src/main/features/dashboard/components/TrendsChart.tsx`
