# UI Requirements: Smart Credit Card Reconciliation

**Feature Code:** M15-smart-reconciliation
**Last Updated:** 2025-12-12

---

## 1. Overview

### 1.1 Feature Purpose
Enable order-independent import of credit card statements and bank statements with automatic reconciliation. Users see clear visual indicators for pending CC transactions and receive notifications when auto-linking occurs.

### 1.2 User Entry Points
1. **Transaction List** - Pending badges on CC transactions awaiting bill link
2. **Dashboard** - Summary indicator for months with pending reconciliations
3. **Import Flow** - Modified to support auto-linking on import
4. **Manual Reconcile** - New "Reconciliar" button for on-demand reconciliation

### 1.3 Screen Map

| Screen | Status | Changes |
|--------|--------|---------|
| Dashboard | Modified | Add pending reconciliation indicator |
| Transaction List | Modified | Add pending badges on CC transactions |
| CC Import Modal | Modified | Auto-link messaging, disambiguation dialog |
| Reconciliation Status | New | Detailed pending reconciliation view |
| Bill Selection Dialog | New | Disambiguation when multiple bills match |

---

## 2. Screen Specifications

### 2.1 Dashboard - Pending Reconciliation Indicator

#### Location
Below the existing summary cards, or as a subtle banner.

#### Layout (Desktop)
```
┌────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Income Card]  [Expense Card]  [Balance Card]                         │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ℹ️ 3 meses com transações CC aguardando fatura                │   │
│  │     Nov/2024, Out/2024, Set/2024                    [Ver mais] │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  [Charts...]                                                           │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Visual States

**No Pending Reconciliations:**
- Indicator is hidden (not displayed)

**Pending Reconciliations Exist:**
- Subtle info banner (not alarming)
- Light blue/gray background
- Info icon (ℹ️)
- Text: "{N} meses com transações CC aguardando fatura"
- List of months (collapsed if > 3)
- "Ver mais" link to Reconciliation Status screen

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| pending-banner | Banner | Info-style banner, dismissible |
| month-list | Text | Comma-separated month/year list |
| view-more-link | Link | Opens Reconciliation Status screen |

#### Responsive Behavior
| Breakpoint | Layout Changes |
|------------|----------------|
| Desktop (1024px+) | Full-width banner below summary cards |
| Tablet (768px-1023px) | Same as desktop |
| Mobile (<768px) | Full-width, months in collapsed dropdown |

---

### 2.2 Transaction List - Pending Badges

#### Location
On each CC transaction row that has no linked bill.

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Transações                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  03 Dez   Zaffari Cabral                    🕐 Aguardando  -R$44,90│ │
│  │           Alimentação                          fatura              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  02 Dez   Netflix                           🕐 Aguardando  -R$55,90│ │
│  │           Entretenimento                       fatura              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  01 Dez   Pagamento de fatura                             -R$500,00│ │
│  │           (regular transaction - no badge)                         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Badge Specification

**Badge Text:** "Aguardando fatura"
**Icon:** Clock icon (🕐) or hourglass
**Color:** Muted blue/gray (not alarming)
**Position:** Between description and amount

**Tooltip (on hover):**
"Estas transações serão vinculadas automaticamente quando a fatura for importada"

#### Visual States

| State | Appearance |
|-------|------------|
| Pending (no bill) | Clock badge + "Aguardando fatura" |
| Linked (has bill) | No badge (normal appearance) |
| Amount mismatch | Yellow warning badge + "Valor divergente" |

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| pending-badge | Badge | Small chip-style badge |
| badge-tooltip | Tooltip | Explanation on hover |
| mismatch-badge | Badge | Yellow variant for warnings |

---

### 2.3 Reconciliation Status Screen (New)

#### Purpose
Detailed view of all pending reconciliations, accessible from dashboard indicator.

#### Route
`/reconciliation` or `/transacoes/reconciliacao`

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Reconciliação de Cartão de Crédito                      [Reconciliar] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Faturas Pendentes                                                      │
│  ─────────────────                                                      │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Nov/2024                                                          ││
│  │  ───────────────────────────────────────────────────────────────── ││
│  │  12 transações  •  Total: R$ 1.234,56                              ││
│  │  Status: Aguardando fatura                                         ││
│  │                                                            [Vincular]││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Out/2024                                                          ││
│  │  ───────────────────────────────────────────────────────────────── ││
│  │  8 transações  •  Total: R$ 876,32                                 ││
│  │  Status: Aguardando fatura                                         ││
│  │                                                            [Vincular]││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  Faturas Vinculadas (últimos 3 meses)                                   │
│  ────────────────────────────────────                                   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  Set/2024                                            ✓ Vinculado   ││
│  │  ───────────────────────────────────────────────────────────────── ││
│  │  15 transações  •  Fatura: R$ 1.500,00  •  CC: R$ 1.498,45         ││
│  │  Diferença: R$ 1,55 (0.1%)                           [Desvincular] ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| reconcile-btn | Button | Primary action to trigger reconciliation |
| billing-cycle-card | Card | Summary of a billing cycle |
| link-btn | Button | Manual link action |
| unlink-btn | Button | Collapse/unlink action |
| status-badge | Badge | Pending/Linked/Mismatch status |

#### Actions

| Action | Trigger | Result |
|--------|---------|--------|
| Click "Reconciliar" | Top button | Triggers on-demand reconciliation |
| Click "Vincular" | Per-cycle button | Opens bill selection if matches found |
| Click "Desvincular" | Per-cycle button | Opens collapse confirmation |

---

### 2.4 Bill Selection Dialog (New)

#### Purpose
Disambiguation when multiple potential bill matches exist.

#### Trigger
- Auto-reconciliation finds multiple matches
- User clicks "Vincular" on a pending billing cycle

#### Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Selecionar Fatura                                                   ✕ │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Encontramos 2 faturas possíveis para Nov/2024.                         │
│  Qual delas corresponde às transações de cartão?                        │
│                                                                         │
│  Total das transações CC: R$ 1.234,56                                   │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  ○  05/Dez/2024  •  R$ 1.234,56  •  ✓ Valor exato                  ││
│  │     Pagamento de fatura Nubank                                     ││
│  │     Categoria: Cartão de Crédito                                   ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  ○  06/Dez/2024  •  R$ 1.200,00  •  ⚠️ Diferença: R$ 34,56         ││
│  │     Fatura cartão                                                  ││
│  │     Categoria: Sem categoria                                       ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  ○  Nenhuma - manter pendente                                      ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                                          [Cancelar]  [Vincular Fatura] │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| bill-option | Radio | Selectable bill card |
| amount-match-badge | Badge | "Valor exato" or difference amount |
| skip-option | Radio | "Nenhuma - manter pendente" |
| cancel-btn | Button | Secondary, closes dialog |
| confirm-btn | Button | Primary, links selected bill |

#### Information Displayed Per Bill
- Date (formatted: DD/MMM/YYYY)
- Amount (R$ formatted)
- Match quality indicator (exact / difference amount)
- Description
- Category (if assigned)

---

### 2.5 CC Import Modal - Auto-Link Messaging

#### Modifications to Existing Import Modal

**Scenario A: Bill Already Exists (Auto-Link)**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Importar Extrato de Cartão                                          ✕ │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✓ 12 transações encontradas                                            │
│  ✓ Fatura Nov/2024 detectada automaticamente                            │
│                                                                         │
│  Fatura correspondente:                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  05/Dez/2024  •  Pagamento de fatura  •  R$ 1.234,56               ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                                           [Cancelar]  [Importar e Vincular]│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scenario B: No Bill Found (Import as Pending)**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Importar Extrato de Cartão                                          ✕ │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✓ 12 transações encontradas                                            │
│  ℹ️ Nenhuma fatura correspondente encontrada                             │
│                                                                         │
│  As transações serão importadas normalmente e vinculadas                │
│  automaticamente quando a fatura for adicionada.                        │
│                                                                         │
│                                           [Cancelar]  [Importar]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scenario C: Multiple Bills Found (Show Selection)**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Importar Extrato de Cartão                                          ✕ │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✓ 12 transações encontradas                                            │
│  ⚠️ Múltiplas faturas possíveis encontradas                              │
│                                                                         │
│  [Bill Selection Dialog embedded or triggered]                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Toast Notifications

| Event | Type | Message | Duration |
|-------|------|---------|----------|
| Auto-link on import | success | "12 transações importadas e vinculadas à fatura" | 5s |
| Auto-link on bill create | success | "Fatura Nov/2024 vinculada automaticamente - 12 transações" | 5s |
| Manual link | success | "Fatura vinculada com sucesso" | 3s |
| Unlink | success | "Fatura desvinculada" | 3s |
| No match on reconcile | info | "Nenhuma correspondência encontrada" | 3s |
| Amount mismatch warning | warning | "Total importado (R$300) difere da fatura (R$500)" | 8s |
| Multiple matches | info | "Múltiplas faturas encontradas - selecione manualmente" | 5s |
| Duplicates skipped | info | "4 transações ignoradas (já existentes)" | 5s |

---

## 4. Empty States

### 4.1 Reconciliation Screen - No Data
- **Illustration:** Checkmark or balanced scale icon
- **Heading:** "Tudo reconciliado!"
- **Message:** "Não há transações de cartão pendentes de vinculação."
- **CTA:** None (informational only)

### 4.2 Reconciliation Screen - No CC Transactions
- **Illustration:** Credit card icon
- **Heading:** "Nenhuma transação de cartão"
- **Message:** "Importe seu extrato de cartão de crédito para começar."
- **CTA:** "Importar extrato" → Opens CC import modal

---

## 5. Loading States

### 5.1 Reconciliation Trigger
- Button shows spinner
- Text changes to "Reconciliando..."
- Disabled state during operation
- Success/error toast on completion

### 5.2 Bill Selection Loading
- Skeleton cards while fetching potential matches
- Fade-in when data loads

---

## 6. User Flows

### 6.1 CC Statement First (Happy Path)

```
1. User navigates to Import
   → Opens CC import modal
2. User uploads Nubank CSV
   → System parses transactions
3. System checks for matching bills
   → No match found
4. System shows "Nenhuma fatura correspondente encontrada"
   → User clicks "Importar"
5. Transactions imported with pending status
   → Success toast: "12 transações importadas (aguardando fatura)"
6. User later imports bank statement with bill payment
   → System detects potential match
7. System auto-links if high confidence
   → Toast: "Fatura Nov/2024 vinculada automaticamente - 12 transações"
8. Pending badges removed from transactions
   → Dashboard indicator updated
```

### 6.2 Multiple Matches Flow

```
1. User triggers reconciliation (import or button)
   → System finds 2+ potential bills
2. Bill Selection Dialog opens
   → User sees all options with details
3. User selects appropriate bill (or "Nenhuma")
   → Clicks "Vincular Fatura"
4. System links transactions to selected bill
   → Success toast displayed
5. Dialog closes, UI updates
```

### 6.3 Manual Link Override

```
1. User sees pending CC transactions
   → Clicks "Vincular" on Reconciliation screen
2. System searches for potential bills
   → Shows Bill Selection Dialog
3. User selects bill (even if amount differs)
   → Confirmation if mismatch: "Vincular mesmo com diferença de R$ 34,56?"
4. User confirms
   → Link created with mismatch warning preserved
```

---

## 7. Responsive Behavior

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Dashboard banner | Full width, inline months | Same | Stacked, months in dropdown |
| Pending badge | Next to amount | Same | Below description |
| Reconciliation cards | 2-column grid | 1-column | 1-column, compact |
| Bill Selection Dialog | 500px width modal | Full width modal | Full screen sheet |

---

## 8. Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to select radio options
- Escape to close dialogs
- Focus trap in modals

### Screen Reader
- Pending badge: `aria-label="Aguardando vinculação com fatura"`
- Status badges: Announce status on focus
- Dialog: Announce purpose and options count
- Toast: Use `role="status"` for announcements

### Focus Management
- Focus moves to dialog when opened
- Focus returns to trigger on close
- Focus moves to first error on validation

---

## 9. Dark Mode Considerations

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Pending badge bg | `blue-100` | `blue-900` |
| Pending badge text | `blue-700` | `blue-200` |
| Warning badge bg | `yellow-100` | `yellow-900` |
| Warning badge text | `yellow-700` | `yellow-200` |
| Success badge bg | `green-100` | `green-900` |
| Dialog backdrop | `black/50` | `black/70` |
| Bill option border | `gray-200` | `gray-700` |
| Selected option border | `primary-500` | `primary-400` |

---

## 10. Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Badge appear | fade-in + scale | 200ms | ease-out |
| Badge remove | fade-out | 150ms | ease-in |
| Dialog open | fade + slide-up | 200ms | ease-out |
| Dialog close | fade + slide-down | 150ms | ease-in |
| Toast appear | slide-in from right | 300ms | ease-out |
| Card selection | border-color transition | 150ms | ease |

---

## Related Documentation

- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Base Feature:** `context/features/M12-cc-import/`
- **Guide Reference:** `context/guides/Finance-Tracker-Frontend-UI-Requirements-v3.md`
