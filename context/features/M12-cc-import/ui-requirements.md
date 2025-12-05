# UI Requirements: Credit Card Statement Import

**Feature Code:** M12-cc-import
**Last Updated:** 2025-12-04

---

## 1. Overview

### 1.1 Feature Purpose

Allow users to import Nubank credit card statements through the existing import wizard, automatically matching them with "Pagamento de fatura" transactions, and displaying detailed credit card transactions with appropriate visual indicators.

### 1.2 User Entry Points

1. **Import Wizard** - Select "Nubank Credit Card" format from bank format dropdown
2. **Dashboard** - Credit Card Status card shows match warnings
3. **Transactions List** - Banner shows when mismatches exist

### 1.3 Screen Map

| Screen | New/Modified | Description |
|--------|--------------|-------------|
| Import Wizard | Modified | Add "Nubank Credit Card" format option |
| Import Preview | Modified | Show matching preview for CC imports |
| Transactions List | Modified | Display CC transactions with badges |
| Dashboard | Modified | Add Credit Card Status card |

---

## 2. Screen Specifications

### 2.1 Import Wizard - Step 1 (Modified)

#### Changes to Bank Format Dropdown

Add new option in the format selector:

```
┌─────────────────────────────────────┐
│ Bank Format                     ▼   │
├─────────────────────────────────────┤
│ ○ Auto Detect                       │
│ ○ Nubank                            │
│ ○ Nubank Credit Card        ← NEW   │
│ ○ Banco Inter                       │
│ ○ Itau                              │
│ ○ Custom                            │
└─────────────────────────────────────┘
```

#### Visual States

- **Default**: Shows all format options
- **Nubank Credit Card Selected**: Shows info text explaining the feature

#### Info Text (when Nubank Credit Card selected)

```
ℹ️ Credit card statements will be matched with existing "Pagamento de fatura"
   transactions. Individual purchases will be linked to your bill payments.
```

### 2.2 Import Wizard - Step 2: Category Assignment (Modified for CC)

When importing credit card statement, show additional matching preview section:

#### Matching Preview Section

```
┌─────────────────────────────────────────────────────────────────┐
│ 💳 Credit Card Matching                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Found Matches:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📄 Pagamento de fatura (31/10/2025)                       │ │
│  │    Bank Statement: R$ 1.124,77                            │ │
│  │    Credit Card Total: R$ 1.130,45                         │ │
│  │    Difference: R$ 5,68 ⚠️                                 │ │
│  │    47 transactions will be linked                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Unmatched Transactions: 12                                     │
│  (Will be imported without linking to a bill payment)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Components

| Component | Type | Description |
|-----------|------|-------------|
| Matching Preview Card | Card | Shows found matches between CC and bank statements |
| Match Item | List Item | Individual match with amounts comparison |
| Difference Badge | Badge | Shows amount difference (warning if > 0) |
| Unmatched Count | Text | Number of transactions without matches |

#### Visual States

- **All Matched**: Green success indicator, no warnings
- **Partial Match**: Yellow warning, shows difference amount
- **No Matches Found**: Orange info, explains CC transactions will be imported unlinked
- **Amount Mismatch**: Yellow warning with difference displayed

### 2.3 Import Wizard - Confirmation Dialog (Modified for CC)

After clicking "Import [N] Transactions", show confirmation dialog:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💳 Import Credit Card Statement                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This will:                                                     │
│                                                                 │
│  ✓ Import 47 credit card transactions                          │
│  ✓ Link 35 transactions to "Pagamento de fatura" (31/10)       │
│  ✓ Zero out the original bill (R$ 1.124,77 → R$ 0)            │
│  ✓ Keep 12 transactions unlinked (no matching bill found)      │
│  ✓ Apply category rules automatically                          │
│                                                                 │
│  ⚠️ Amount difference of R$ 5,68 detected                      │
│     The credit card total doesn't exactly match the bill.      │
│     This is normal for partial payments or pending charges.    │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │      Cancel         │  │   Confirm Import    │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Transactions List - Credit Card Transactions Display

#### Transaction Card - Credit Card Badge

Credit card transactions display with a badge indicator:

```
┌─────────────────────────────────────────────────────────────────┐
│  🛒 Shopping    │  Bourbon Ipiranga         │  -R$ 794,15     │
│  [💳]           │  08/11/2025               │                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Transaction Card - Installment Display

For installment transactions, show installment info:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏥 Health      │  Hospital Sao Lucas da    │  -R$ 196,84     │
│  [💳] [1/3]     │  08/11/2025               │  Parcela 1 de 3 │
└─────────────────────────────────────────────────────────────────┘
```

#### Original Bill Payment Display (Grayed Out)

The zeroed original "Pagamento de fatura" is shown grayed out:

```
┌─────────────────────────────────────────────────────────────────┐
│  💳 Bill        │  Pagamento de fatura      │  R$ 0,00        │
│  [Expanded]     │  31/10/2025               │  (was R$ 1.124) │
│                 │  ▼ 47 transactions        │  [Collapse]     │
└─────────────────────────────────────────────────────────────────┘
```

#### Components

| Component | Type | Description |
|-----------|------|-------------|
| Credit Card Badge | Badge | `[💳]` indicator on CC transactions |
| Installment Badge | Badge | `[1/3]` showing current/total |
| Expanded Badge | Badge | Shows on zeroed original bill |
| Collapse Button | Button | Reverts expansion (restores original) |
| Transaction Count | Link | "47 transactions" - clickable filter |

### 2.5 Transactions List - Mismatch Banner

When credit card mismatches exist, show dismissible banner:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ Credit Card Mismatch                                    [X] │
│    Credit card total: R$ 8.235,79 | Matched: R$ 1.178,20       │
│    Unmatched: R$ 7.057,59 - Import updated bank statement      │
└─────────────────────────────────────────────────────────────────┘
```

#### Visual States

- **Visible**: When unmatched CC transactions exist
- **Dismissed**: Hidden (user clicked X), persisted for session
- **Resolved**: Hidden when all transactions matched

### 2.6 Dashboard - Credit Card Status Card

New dashboard card showing credit card match status:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💳 Credit Card Status                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This Month                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Total CC Spending: R$ 8.235,79                          │   │
│  │ Matched to Bills:  R$ 1.178,20  ✓                       │   │
│  │ Unmatched:         R$ 7.057,59  ⚠️                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [View Details]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Visual States

- **All Matched**: Green border, checkmark icon
- **Partial Match**: Yellow border, warning icon
- **No CC Data**: Card hidden or shows "No credit card transactions"

#### Interactions

| Action | Trigger | Result |
|--------|---------|--------|
| View Details | Click button | Navigate to transactions with CC filter |

### 2.7 Collapse Credit Card Expansion Modal

When user clicks "Collapse" on an expanded bill payment:

```
┌─────────────────────────────────────────────────────────────────┐
│ Collapse Credit Card Details                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ This will:                                                  │
│                                                                 │
│  • Delete 47 detailed credit card transactions                  │
│  • Restore "Pagamento de fatura" to R$ 1.124,77                │
│  • Remove category assignments from CC purchases                │
│                                                                 │
│  This action cannot be undone.                                  │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │      Cancel         │  │   Collapse          │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 CreditCardBadge

```typescript
interface CreditCardBadgeProps {
  showIcon?: boolean;      // default: true
  size?: 'sm' | 'md';      // default: 'sm'
}
```

#### Variants
- **Default**: Blue background, credit card icon
- **Expanded**: Gray background, "Expanded" text

### 3.2 InstallmentBadge

```typescript
interface InstallmentBadgeProps {
  current: number;         // e.g., 1
  total: number;           // e.g., 3
  showLabel?: boolean;     // default: false, shows "Parcela X de Y"
}
```

#### Display
- Compact: `[1/3]`
- Expanded: `Parcela 1 de 3`

### 3.3 MatchStatusCard

```typescript
interface MatchStatusCardProps {
  bankAmount: number;
  ccTotal: number;
  transactionCount: number;
  billDate: string;
  onExpand?: () => void;
}
```

### 3.4 CreditCardStatusDashboardCard

```typescript
interface CreditCardStatusProps {
  totalSpending: number;
  matchedAmount: number;
  unmatchedAmount: number;
  onViewDetails: () => void;
}
```

---

## 4. Design Tokens

### Colors Used

| Token | Usage |
|-------|-------|
| `blue-500` | Credit card badge background |
| `blue-100` | Credit card badge background (light) |
| `green-500` | Matched indicator |
| `yellow-500` | Warning/mismatch indicator |
| `gray-400` | Grayed out original transaction |
| `gray-100` | Disabled/expanded state background |

### Typography

| Element | Token |
|---------|-------|
| Badge text | `text-xs font-medium` |
| Card title | `text-lg font-semibold` |
| Amount | `text-base font-mono` |
| Difference | `text-sm text-yellow-600` |

### Spacing

- Badge padding: `px-2 py-0.5`
- Card padding: `p-4`
- Section gaps: `space-y-4`

---

## 5. User Flows

### 5.1 Import Credit Card Statement (Happy Path)

```
1. User clicks "Import" on Transactions screen
   → Import Wizard modal opens

2. User selects "Nubank Credit Card" from format dropdown
   → Info text appears explaining the feature

3. User uploads CSV file (drag-drop or browse)
   → File parsed, transactions extracted
   → Installments detected from "Parcela X/Y" pattern

4. User clicks "Next"
   → Step 2: Category assignment with Matching Preview

5. User sees matching preview
   → Shows which "Pagamento de fatura" transactions were found
   → Shows any amount differences

6. User assigns categories (optional, rules apply automatically)

7. User clicks "Import [N] Transactions"
   → Confirmation dialog shows summary

8. User confirms
   → Original bill zeroed (original_amount preserved)
   → CC transactions created with links
   → Category rules applied
   → Success toast shown

9. Modal closes
   → Transactions list refreshes
   → CC transactions visible with badges
```

### 5.2 Import with Mismatch (Warning Path)

```
1. User imports CC statement
   → System finds "Pagamento de fatura" but amounts differ

2. Matching Preview shows:
   → Bank: R$ 1.124,77
   → CC Total: R$ 1.130,45
   → Difference: R$ 5,68 ⚠️

3. User proceeds with import
   → Warning shown in confirmation dialog
   → User confirms

4. After import:
   → Dashboard shows Credit Card Status card with warning
   → Transactions page shows mismatch banner
   → User can import updated bank statement to resolve
```

### 5.3 Collapse Expanded Bill (Reversal)

```
1. User views transaction list
   → Sees grayed-out "Pagamento de fatura" with "Collapse" button

2. User clicks "Collapse"
   → Confirmation modal appears

3. User confirms
   → All linked CC transactions deleted
   → Original bill restored to original amount
   → Success toast shown
```

---

## 6. Toast Notifications

| Event | Type | Message |
|-------|------|---------|
| CC Import Success | success | "47 credit card transactions imported" |
| CC Import with Warning | info | "Imported with warnings - check dashboard" |
| Collapse Success | success | "Credit card details collapsed" |
| Import Error | error | "Failed to import: {error message}" |
| Match Updated | success | "Credit card matches updated" |

---

## 7. Empty States

### 7.1 No Credit Card Data (Dashboard Card)

- **Illustration**: Credit card icon (outline)
- **Heading**: "No credit card data"
- **Message**: "Import a credit card statement to see detailed spending"
- **CTA**: "Import Statement" → Opens import wizard

### 7.2 No Matches Found (Import Preview)

- **Icon**: Info icon (i)
- **Heading**: "No matching bill payments found"
- **Message**: "Credit card transactions will be imported without linking to a bill. You can import your bank statement later to establish the connection."
- **Action**: Proceed button enabled

---

## 8. Loading States

### 8.1 Import Parsing

- Spinner in upload area
- Text: "Parsing credit card statement..."

### 8.2 Matching Analysis

- Spinner in matching preview section
- Text: "Finding matching bill payments..."

### 8.3 Import Processing

- Button shows spinner: "Importing..."
- Modal cannot be closed during processing

---

## 9. Dark Mode Considerations

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| CC Badge BG | `blue-100` | `blue-900` |
| CC Badge Text | `blue-700` | `blue-200` |
| Grayed Transaction | `gray-100` | `gray-800` |
| Warning Banner BG | `yellow-50` | `yellow-900/20` |
| Warning Banner Border | `yellow-200` | `yellow-700` |
| Status Card BG | `white` | `gray-800` |

---

## 10. Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Modal open | fade + scale | 200ms | ease-out |
| Banner dismiss | slide up + fade | 150ms | ease-in |
| Badge appear | scale | 150ms | ease-out |
| Status update | pulse | 300ms | ease-in-out |

---

## 11. Accessibility

### Keyboard Navigation

- All interactive elements focusable
- Tab order: Format dropdown → File upload → Next button
- Enter to confirm dialogs
- Escape to dismiss modals

### Screen Reader

- Badge: "Credit card transaction"
- Installment: "Installment 1 of 3"
- Expanded bill: "Expanded bill payment, originally R$ 1124, now showing 47 detailed transactions"
- Mismatch banner: "Warning: Credit card mismatch of R$ 5.68"

### Focus Management

- Focus trapped in modals
- Return focus to trigger after modal close
- Auto-focus first input in forms

---

## 12. Responsive Behavior

| Breakpoint | Layout Changes |
|------------|----------------|
| Desktop (1024px+) | Full card layout, side-by-side amounts |
| Tablet (768px-1023px) | Stacked amounts, full-width cards |
| Mobile (<768px) | Single column, condensed badges |

### Mobile-Specific

- Matching preview scrollable
- Badges stack vertically on small cards
- Dashboard card takes full width

---

## Related Documentation

- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/Finance-Tracker-Frontend-UI-Requirements-v3.md`
