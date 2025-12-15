# E2E Scenarios: Smart Credit Card Reconciliation

**Feature Code:** M15-smart-reconciliation
**Last Updated:** 2025-12-12

---

## 1. Overview

### 1.1 Test Scope
End-to-end tests validating the complete smart reconciliation flow, including:
- Order-independent import behavior
- Automatic bill detection and linking
- Visual feedback (badges, toasts, indicators)
- Manual linking and disambiguation
- Dashboard integration

### 1.2 Test File Location
```
e2e/tests/M15-smart-reconciliation/
├── pending-indicator.spec.ts
├── auto-reconciliation.spec.ts
├── manual-linking.spec.ts
├── import-flow.spec.ts
└── helpers.ts
```

### 1.3 Prerequisites
- User authenticated
- Clean test database (no existing CC transactions)
- Test fixtures for CC CSV files

---

## 2. Test Configuration

### 2.1 Playwright Project Config

```typescript
// In playwright.config.ts, add:
{
  name: 'M15-smart-reconciliation',
  testDir: './tests/M15-smart-reconciliation',
  testMatch: '**/*.spec.ts',
  use: {
    ...devices['Desktop Chrome'],
  },
}
```

### 2.2 Test Fixtures

```typescript
// e2e/tests/M15-smart-reconciliation/fixtures.ts

import { test as base, Page } from '@playwright/test';

interface ReconciliationFixtures {
  authenticatedPage: Page;
  ccCsvNov2024: string;
  billPaymentNov2024: TransactionData;
}

export const test = base.extend<ReconciliationFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginAsTestUser(page);
    await use(page);
  },

  ccCsvNov2024: async ({}, use) => {
    const csv = `date,title,amount
2024-11-03,Zaffari Cabral,44.90
2024-11-08,Netflix,55.90
2024-11-15,Amazon,120.00
2024-11-28,Pagamento recebido,-220.80`;
    await use(csv);
  },

  billPaymentNov2024: async ({}, use) => {
    await use({
      date: '2024-12-05',
      description: 'Pagamento de fatura Nubank',
      amount: -220.80,
      type: 'expense',
    });
  },
});
```

---

## 3. E2E Test Scenarios

### 3.1 Dashboard Pending Indicator

#### E2E-M15-001: No indicator when no pending CC transactions

```gherkin
Scenario: Dashboard shows no pending indicator when all CC is linked
  Given I am logged in
  And I have no pending CC transactions
  When I navigate to the dashboard
  Then I should not see the pending reconciliation banner
```

```typescript
test('E2E-M15-001: No pending indicator when all linked', async ({ authenticatedPage: page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="pending-reconciliation-banner"]')).not.toBeVisible();
});
```

#### E2E-M15-002: Show pending indicator with count

```gherkin
Scenario: Dashboard shows pending indicator when CC transactions await bills
  Given I am logged in
  And I have pending CC transactions for:
    | billing_cycle | transaction_count |
    | 2024-11       | 12                |
    | 2024-10       | 8                 |
  When I navigate to the dashboard
  Then I should see "2 meses com transações CC aguardando fatura"
  And I should see "Nov/2024, Out/2024" in the banner
```

```typescript
test('E2E-M15-002: Show pending indicator with count', async ({ authenticatedPage: page }) => {
  // Setup: Create pending CC transactions
  await createPendingCCTransactions(page, '2024-11', 12);
  await createPendingCCTransactions(page, '2024-10', 8);

  await page.goto('/dashboard');

  const banner = page.locator('[data-testid="pending-reconciliation-banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('2 meses com transações CC aguardando fatura');
  await expect(banner).toContainText('Nov/2024');
  await expect(banner).toContainText('Out/2024');
});
```

#### E2E-M15-003: Navigate to reconciliation from dashboard

```gherkin
Scenario: User can navigate to reconciliation screen from dashboard banner
  Given I am logged in
  And I have pending CC transactions
  When I click "Ver mais" in the pending banner
  Then I should be on the reconciliation screen
```

```typescript
test('E2E-M15-003: Navigate to reconciliation from dashboard', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5);
  await page.goto('/dashboard');

  await page.click('[data-testid="pending-reconciliation-banner"] [data-testid="view-more-link"]');

  await expect(page).toHaveURL(/\/reconciliation|\/transacoes\/reconciliacao/);
});
```

---

### 3.2 Transaction List Pending Badges

#### E2E-M15-004: Show pending badge on unlinked CC transactions

```gherkin
Scenario: CC transactions without linked bill show pending badge
  Given I am logged in
  And I have CC transactions for "2024-11" without a linked bill
  When I navigate to the transactions list
  Then I should see "Aguardando fatura" badge on CC transactions
```

```typescript
test('E2E-M15-004: Show pending badge on unlinked CC', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 3);
  await page.goto('/transacoes');

  const ccTransactions = page.locator('[data-testid="transaction-row"]').filter({
    has: page.locator('[data-testid="pending-badge"]'),
  });

  await expect(ccTransactions).toHaveCount(3);
  await expect(ccTransactions.first().locator('[data-testid="pending-badge"]')).toContainText('Aguardando fatura');
});
```

#### E2E-M15-005: No badge on linked CC transactions

```gherkin
Scenario: CC transactions with linked bill show no badge
  Given I am logged in
  And I have CC transactions for "2024-10" linked to a bill
  When I navigate to the transactions list
  Then the CC transactions should not have a pending badge
```

```typescript
test('E2E-M15-005: No badge on linked CC', async ({ authenticatedPage: page }) => {
  await createLinkedCCTransactions(page, '2024-10');
  await page.goto('/transacoes');

  const linkedTransactions = page.locator('[data-testid="transaction-row"]').filter({
    hasText: /2024-10/,
  });

  await expect(linkedTransactions.locator('[data-testid="pending-badge"]')).not.toBeVisible();
});
```

#### E2E-M15-006: Badge tooltip explains pending status

```gherkin
Scenario: Hovering pending badge shows explanation tooltip
  Given I am logged in
  And I have pending CC transactions
  When I hover over the pending badge
  Then I should see tooltip "Estas transações serão vinculadas automaticamente..."
```

```typescript
test('E2E-M15-006: Badge tooltip shows explanation', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 1);
  await page.goto('/transacoes');

  const badge = page.locator('[data-testid="pending-badge"]').first();
  await badge.hover();

  await expect(page.locator('[role="tooltip"]')).toContainText('vinculadas automaticamente');
});
```

---

### 3.3 Auto-Reconciliation Flow

#### E2E-M15-007: Auto-link when importing CC with existing bill (high confidence)

```gherkin
Scenario: CC import auto-links to existing bill with matching amount
  Given I am logged in
  And I have a bill payment for Nov/2024 of R$ 220.80
  When I import a CC CSV with total R$ 220.80 for billing cycle "2024-11"
  Then I should see success toast "12 transações importadas e vinculadas à fatura"
  And the CC transactions should be linked to the bill
  And the pending badge should not appear
```

```typescript
test('E2E-M15-007: Auto-link CC to existing bill', async ({ authenticatedPage: page, ccCsvNov2024, billPaymentNov2024 }) => {
  // Setup: Create bill first
  await createTransaction(page, billPaymentNov2024);

  // Import CC
  await page.goto('/transacoes');
  await page.click('[data-testid="import-cc-btn"]');
  await uploadCsv(page, ccCsvNov2024);

  // Verify auto-link message
  await expect(page.locator('[data-testid="import-preview"]')).toContainText('Fatura Nov/2024 detectada automaticamente');

  await page.click('[data-testid="import-confirm-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('vinculadas à fatura');

  // Verify no pending badge
  await page.goto('/transacoes');
  await expect(page.locator('[data-testid="pending-badge"]')).not.toBeVisible();
});
```

#### E2E-M15-008: Auto-link when creating bill with pending CC

```gherkin
Scenario: Creating bill payment auto-links to pending CC transactions
  Given I am logged in
  And I have pending CC transactions for "2024-11" totaling R$ 220.80
  When I create a transaction:
    | date        | 2024-12-05                |
    | description | Pagamento de fatura Nubank|
    | amount      | -220.80                   |
  Then I should see toast "Fatura Nov/2024 vinculada automaticamente - 3 transações"
  And the pending CC should now be linked
```

```typescript
test('E2E-M15-008: Auto-link on bill creation', async ({ authenticatedPage: page }) => {
  // Setup: Create pending CC first
  await createPendingCCTransactions(page, '2024-11', 3, 22080); // R$ 220.80 in cents

  // Create bill payment
  await page.goto('/transacoes');
  await page.click('[data-testid="add-transaction-btn"]');
  await page.fill('[data-testid="date-input"]', '2024-12-05');
  await page.fill('[data-testid="description-input"]', 'Pagamento de fatura Nubank');
  await page.fill('[data-testid="amount-input"]', '-220.80');
  await page.click('[data-testid="save-btn"]');

  // Verify auto-link toast
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('vinculada automaticamente');
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('3 transações');

  // Verify pending badges removed
  await page.goto('/transacoes');
  await expect(page.locator('[data-testid="pending-badge"]')).not.toBeVisible();
});
```

#### E2E-M15-009: Import CC without matching bill stores as pending

```gherkin
Scenario: CC import without matching bill creates pending transactions
  Given I am logged in
  And I have no bill payments
  When I import a CC CSV for billing cycle "2024-11"
  Then I should see info message "Nenhuma fatura correspondente encontrada"
  And the CC transactions should be imported
  And the transactions should show pending badges
```

```typescript
test('E2E-M15-009: Import CC as pending when no bill', async ({ authenticatedPage: page, ccCsvNov2024 }) => {
  await page.goto('/transacoes');
  await page.click('[data-testid="import-cc-btn"]');
  await uploadCsv(page, ccCsvNov2024);

  // Verify no match message
  await expect(page.locator('[data-testid="import-preview"]')).toContainText('Nenhuma fatura correspondente encontrada');

  await page.click('[data-testid="import-confirm-btn"]');

  // Verify success (pending)
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('transações importadas');

  // Verify pending badges appear
  await page.goto('/transacoes');
  await expect(page.locator('[data-testid="pending-badge"]')).toHaveCount(3); // Excluding "Pagamento recebido"
});
```

---

### 3.4 Manual Linking & Disambiguation

#### E2E-M15-010: Manual link from reconciliation screen

```gherkin
Scenario: User manually links pending CC to a bill
  Given I am logged in
  And I have pending CC transactions for "2024-11"
  And I have a bill payment that wasn't auto-detected
  When I navigate to the reconciliation screen
  And I click "Vincular" for Nov/2024
  And I select the bill in the dialog
  And I click "Vincular Fatura"
  Then I should see success toast "Fatura vinculada com sucesso"
  And Nov/2024 should move to "Linked" section
```

```typescript
test('E2E-M15-010: Manual link from reconciliation screen', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5);
  await createTransaction(page, {
    date: '2024-12-10',
    description: 'Pagamento cartão',
    amount: -500,
    type: 'expense',
  });

  await page.goto('/reconciliation');

  // Click link button for Nov/2024
  await page.click('[data-testid="cycle-card-2024-11"] [data-testid="link-btn"]');

  // Select bill in dialog
  await expect(page.locator('[data-testid="bill-selection-dialog"]')).toBeVisible();
  await page.click('[data-testid="bill-option"]:first-child');
  await page.click('[data-testid="confirm-link-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('vinculada com sucesso');

  // Verify moved to linked section
  await expect(page.locator('[data-testid="linked-cycles"] [data-testid="cycle-card-2024-11"]')).toBeVisible();
});
```

#### E2E-M15-011: Disambiguation dialog for multiple bills

```gherkin
Scenario: Multiple potential bills show selection dialog
  Given I am logged in
  And I have pending CC for "2024-11" totaling R$ 500
  And I have bill payments:
    | date       | description    | amount |
    | 2024-12-05 | Fatura Nubank  | -500   |
    | 2024-12-06 | Fatura cartão  | -505   |
  When I trigger reconciliation
  Then I should see the bill selection dialog
  And I should see 2 bill options with full details
```

```typescript
test('E2E-M15-011: Disambiguation dialog for multiple bills', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5, 50000);
  await createTransaction(page, { date: '2024-12-05', description: 'Fatura Nubank', amount: -500, type: 'expense' });
  await createTransaction(page, { date: '2024-12-06', description: 'Fatura cartão', amount: -505, type: 'expense' });

  await page.goto('/reconciliation');
  await page.click('[data-testid="reconcile-btn"]');

  // Verify dialog appears
  const dialog = page.locator('[data-testid="bill-selection-dialog"]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid="bill-option"]')).toHaveCount(2);

  // Verify full details shown
  await expect(dialog).toContainText('Fatura Nubank');
  await expect(dialog).toContainText('R$ 500,00');
  await expect(dialog).toContainText('05/Dez/2024');
});
```

#### E2E-M15-012: Bill selection shows match quality

```gherkin
Scenario: Bill selection dialog shows amount match quality
  Given I am logged in
  And I have pending CC totaling R$ 1000.00
  And I have bills:
    | amount  | expected_indicator    |
    | -1000   | "Valor exato"         |
    | -1015   | "Diferença: R$ 15,00" |
  When I see the bill selection dialog
  Then the exact match should show "Valor exato"
  And the close match should show "Diferença: R$ 15,00"
```

```typescript
test('E2E-M15-012: Bill selection shows match quality', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5, 100000);
  await createTransaction(page, { date: '2024-12-05', description: 'Fatura 1', amount: -1000, type: 'expense' });
  await createTransaction(page, { date: '2024-12-06', description: 'Fatura 2', amount: -1015, type: 'expense' });

  await page.goto('/reconciliation');
  await page.click('[data-testid="cycle-card-2024-11"] [data-testid="link-btn"]');

  const dialog = page.locator('[data-testid="bill-selection-dialog"]');
  await expect(dialog.locator('[data-testid="bill-option"]').first()).toContainText('Valor exato');
  await expect(dialog.locator('[data-testid="bill-option"]').nth(1)).toContainText('Diferença: R$ 15,00');
});
```

#### E2E-M15-013: Force link with amount mismatch

```gherkin
Scenario: User can force-link despite large amount mismatch
  Given I am logged in
  And I have pending CC for "2024-11" totaling R$ 1000
  And I have a bill for R$ 500
  When I try to link them
  Then I should see confirmation "Vincular mesmo com diferença de R$ 500,00?"
  When I confirm
  Then the link should be created with mismatch warning
```

```typescript
test('E2E-M15-013: Force link with amount mismatch', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5, 100000); // R$ 1000
  await createTransaction(page, { date: '2024-12-05', description: 'Fatura', amount: -500, type: 'expense' });

  await page.goto('/reconciliation');
  await page.click('[data-testid="cycle-card-2024-11"] [data-testid="link-btn"]');
  await page.click('[data-testid="bill-option"]:first-child');
  await page.click('[data-testid="confirm-link-btn"]');

  // Verify mismatch confirmation
  await expect(page.locator('[data-testid="mismatch-confirmation"]')).toContainText('diferença de R$ 500,00');

  await page.click('[data-testid="force-link-btn"]');

  // Verify linked with warning
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  await expect(page.locator('[data-testid="linked-cycles"] [data-testid="cycle-card-2024-11"]')).toContainText('Valor divergente');
});
```

---

### 3.5 Reconciliation Screen

#### E2E-M15-014: Reconciliation screen shows pending and linked cycles

```gherkin
Scenario: Reconciliation screen displays all cycles
  Given I am logged in
  And I have pending CC for "2024-11"
  And I have linked CC for "2024-10"
  When I navigate to the reconciliation screen
  Then I should see "Faturas Pendentes" section with Nov/2024
  And I should see "Faturas Vinculadas" section with Oct/2024
```

```typescript
test('E2E-M15-014: Reconciliation screen shows all cycles', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5);
  await createLinkedCCTransactions(page, '2024-10');

  await page.goto('/reconciliation');

  await expect(page.locator('[data-testid="pending-cycles"]')).toContainText('Nov/2024');
  await expect(page.locator('[data-testid="linked-cycles"]')).toContainText('Out/2024');
});
```

#### E2E-M15-015: Trigger reconciliation from button

```gherkin
Scenario: User triggers on-demand reconciliation
  Given I am logged in
  And I have pending CC for "2024-11"
  And I have a matching bill
  When I click "Reconciliar" button
  Then I should see loading state
  And I should see success result
  And Nov/2024 should be auto-linked
```

```typescript
test('E2E-M15-015: Trigger reconciliation from button', async ({ authenticatedPage: page }) => {
  await createPendingCCTransactions(page, '2024-11', 5, 50000);
  await createTransaction(page, { date: '2024-12-05', description: 'Pagamento fatura', amount: -500, type: 'expense' });

  await page.goto('/reconciliation');
  await page.click('[data-testid="reconcile-btn"]');

  // Verify loading
  await expect(page.locator('[data-testid="reconcile-btn"]')).toContainText('Reconciliando...');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  await expect(page.locator('[data-testid="linked-cycles"]')).toContainText('Nov/2024');
});
```

#### E2E-M15-016: Unlink (collapse) from reconciliation screen

```gherkin
Scenario: User unlinks a previously linked billing cycle
  Given I am logged in
  And I have linked CC for "2024-10"
  When I click "Desvincular" for Oct/2024
  And I confirm the action
  Then I should see success toast "Fatura desvinculada"
  And Oct/2024 should move to pending section
```

```typescript
test('E2E-M15-016: Unlink from reconciliation screen', async ({ authenticatedPage: page }) => {
  await createLinkedCCTransactions(page, '2024-10');

  await page.goto('/reconciliation');
  await page.click('[data-testid="cycle-card-2024-10"] [data-testid="unlink-btn"]');

  // Confirm
  await page.click('[data-testid="confirm-unlink-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('desvinculada');
  await expect(page.locator('[data-testid="pending-cycles"]')).toContainText('Out/2024');
});
```

---

### 3.6 Empty States

#### E2E-M15-017: Empty state when fully reconciled

```gherkin
Scenario: Show success empty state when no pending reconciliations
  Given I am logged in
  And I have linked CC but no pending CC
  When I navigate to reconciliation screen
  Then I should see "Tudo reconciliado!"
```

```typescript
test('E2E-M15-017: Empty state when fully reconciled', async ({ authenticatedPage: page }) => {
  await createLinkedCCTransactions(page, '2024-10');

  await page.goto('/reconciliation');

  await expect(page.locator('[data-testid="pending-empty-state"]')).toContainText('Tudo reconciliado');
});
```

#### E2E-M15-018: Empty state when no CC transactions

```gherkin
Scenario: Show prompt to import when no CC transactions exist
  Given I am logged in
  And I have no CC transactions at all
  When I navigate to reconciliation screen
  Then I should see "Nenhuma transação de cartão"
  And I should see "Importar extrato" button
```

```typescript
test('E2E-M15-018: Empty state when no CC transactions', async ({ authenticatedPage: page }) => {
  await page.goto('/reconciliation');

  await expect(page.locator('[data-testid="no-cc-empty-state"]')).toContainText('Nenhuma transação de cartão');
  await expect(page.locator('[data-testid="import-cc-cta"]')).toBeVisible();
});
```

---

## 4. Test Data Helpers

```typescript
// e2e/tests/M15-smart-reconciliation/helpers.ts

import { Page } from '@playwright/test';

export async function createPendingCCTransactions(
  page: Page,
  billingCycle: string,
  count: number,
  totalAmountCents?: number
): Promise<void> {
  const amountPerTransaction = totalAmountCents
    ? Math.floor(totalAmountCents / count)
    : 5000; // R$ 50.00 default

  for (let i = 0; i < count; i++) {
    await page.request.post('/api/v1/transactions', {
      data: {
        date: `${billingCycle}-${String(i + 1).padStart(2, '0')}`,
        description: `CC Transaction ${i + 1}`,
        amount: -amountPerTransaction,
        type: 'expense',
        billing_cycle: billingCycle,
        // Note: No credit_card_payment_id means pending
      },
    });
  }
}

export async function createLinkedCCTransactions(
  page: Page,
  billingCycle: string
): Promise<void> {
  // First create a bill
  const billResponse = await page.request.post('/api/v1/transactions', {
    data: {
      date: `${billingCycle}-05`,
      description: 'Pagamento de fatura',
      amount: -50000,
      type: 'expense',
      is_credit_card_payment: true,
    },
  });
  const bill = await billResponse.json();

  // Then create CC transactions linked to it
  for (let i = 0; i < 3; i++) {
    await page.request.post('/api/v1/transactions', {
      data: {
        date: `${billingCycle}-${String(i + 10).padStart(2, '0')}`,
        description: `CC Transaction ${i + 1}`,
        amount: -15000,
        type: 'expense',
        billing_cycle: billingCycle,
        credit_card_payment_id: bill.data.id,
      },
    });
  }
}

export async function createTransaction(
  page: Page,
  data: {
    date: string;
    description: string;
    amount: number;
    type: string;
    is_credit_card_payment?: boolean;
  }
): Promise<void> {
  await page.request.post('/api/v1/transactions', {
    data: {
      ...data,
      amount: Math.round(data.amount * 100), // Convert to cents
    },
  });
}

export async function uploadCsv(page: Page, csvContent: string): Promise<void> {
  const buffer = Buffer.from(csvContent);

  await page.locator('[data-testid="csv-file-input"]').setInputFiles({
    name: 'nubank.csv',
    mimeType: 'text/csv',
    buffer,
  });
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'testpassword');
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL('/dashboard');
}
```

---

## 5. Test Execution

### Run All M15 Tests
```bash
cd e2e && npx playwright test --project=M15-smart-reconciliation
```

### Run Specific Test File
```bash
cd e2e && npx playwright test tests/M15-smart-reconciliation/auto-reconciliation.spec.ts
```

### Run Specific Test
```bash
cd e2e && npx playwright test --project=M15-smart-reconciliation -g "E2E-M15-007"
```

### Debug Mode
```bash
cd e2e && npx playwright test --project=M15-smart-reconciliation --debug
```

### Generate Report
```bash
cd e2e && npx playwright test --project=M15-smart-reconciliation --reporter=html
```

---

## 6. Test Summary

| Category | Test Count | Priority |
|----------|------------|----------|
| Dashboard Indicator | 3 | High |
| Transaction Badges | 3 | High |
| Auto-Reconciliation | 3 | Critical |
| Manual Linking | 4 | High |
| Reconciliation Screen | 3 | High |
| Empty States | 2 | Medium |
| **Total** | **18** | - |

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **Infrastructure:** [infrastructure.md](./infrastructure.md)
- **Base E2E:** `e2e/tests/M12-cc-import/`
- **Guide Reference:** `context/guides/Finance-Tracker-E2E-Testing-Guide-v1.md`
