# E2E Scenarios: Credit Card Statement Import

**Feature Code:** M12-cc-import
**Last Updated:** 2025-12-04

---

## 1. Overview

### 1.1 Test Scope

End-to-end tests for the complete credit card import flow, including:
- Import wizard with CC format selection
- Matching preview and confirmation
- Transaction display with CC badges
- Dashboard status card
- Mismatch banner
- Collapse functionality

### 1.2 Test File Location

```
e2e/tests/m12-cc-import/
├── cc-import.spec.ts           # Core import flow
├── cc-matching.spec.ts         # Matching preview scenarios
├── cc-display.spec.ts          # Transaction display with badges
├── cc-dashboard.spec.ts        # Dashboard status card
├── cc-collapse.spec.ts         # Collapse functionality
└── fixtures.ts                 # Test fixtures and helpers
```

### 1.3 Prerequisites

- User authenticated
- Existing "Pagamento de fatura" transactions (for matching tests)
- Test CSV files available

---

## 2. Test Configuration

### 2.1 Playwright Project Config

```typescript
// In playwright.config.ts, add:
{
  name: 'm12-cc-import',
  testDir: './tests/m12-cc-import',
  testMatch: '**/*.spec.ts',
}
```

### 2.2 Test Fixtures

```typescript
// e2e/tests/m12-cc-import/fixtures.ts

import { test as base, Page } from '@playwright/test';

// Sample CSV content for testing
export const sampleCCCSV = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,794.15
2025-11-08,Hospital Sao Lucas da - Parcela 1/3,196.84
2025-11-04,Pagamento recebido,-1124.77`;

export const sampleCCCSVNoMatch = `date,title,amount
2025-11-06,Mercado Silva,8.99
2025-11-08,Bourbon Ipiranga,100.00`;

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login and navigate to transactions
    await loginAsTestUser(page);
    await page.goto('/transactions');
    await use(page);
  },
});

export async function createBillPayment(page: Page, data: {
  date: string;
  amount: number;
}) {
  // Create bill payment via API
  const response = await page.request.post('/api/v1/transactions', {
    data: {
      date: data.date,
      description: 'Pagamento de fatura',
      amount: data.amount,
      type: 'expense',
    },
  });
  return response.json();
}

export async function uploadCCCSV(page: Page, csvContent: string) {
  // Create file and upload to import wizard
  const buffer = Buffer.from(csvContent);
  await page.locator('[data-testid="file-upload-input"]').setInputFiles({
    name: 'credit-card.csv',
    mimeType: 'text/csv',
    buffer,
  });
}

export async function selectCCFormat(page: Page) {
  await page.click('[data-testid="bank-format-select"]');
  await page.click('[data-testid="format-nubank-credit-card"]');
}
```

---

## 3. E2E Test Scenarios

### 3.1 Import Wizard - Format Selection

#### E2E-CC-001: Select Nubank Credit Card Format

```gherkin
Scenario: User selects Nubank Credit Card format in import wizard
  Given I am logged in
  And I am on the transactions screen
  When I click "Import" button
  Then I should see the import wizard modal
  When I click on the bank format dropdown
  Then I should see "Nubank Credit Card" option
  When I select "Nubank Credit Card"
  Then I should see info text about credit card matching
```

```typescript
test('E2E-CC-001: Select Nubank Credit Card format', async ({ authenticatedPage: page }) => {
  // Open import wizard
  await page.click('[data-testid="import-btn"]');
  await expect(page.locator('[data-testid="import-wizard-modal"]')).toBeVisible();

  // Open format dropdown
  await page.click('[data-testid="bank-format-select"]');

  // Verify CC option exists
  await expect(page.locator('[data-testid="format-nubank-credit-card"]')).toBeVisible();

  // Select CC format
  await page.click('[data-testid="format-nubank-credit-card"]');

  // Verify info text appears
  await expect(page.locator('[data-testid="cc-info-text"]')).toContainText('credit card statements');
});
```

### 3.2 Import Flow - Happy Path

#### E2E-CC-002: Complete Import with Matching Bill

```gherkin
Scenario: User imports credit card statement with matching bill payment
  Given I am logged in
  And I have a "Pagamento de fatura" transaction for R$ 1124.77 on 2025-10-31
  When I open the import wizard
  And I select "Nubank Credit Card" format
  And I upload a CC CSV with transactions totaling R$ 1124.77
  Then I should see the matching preview
  And I should see "Found 1 matching bill payment"
  When I click "Next"
  And I assign categories (optional)
  And I click "Import"
  Then I should see the confirmation dialog
  When I confirm the import
  Then I should see success toast "transactions imported"
  And I should see credit card transactions with badges in the list
  And the original bill should show as grayed out with amount R$ 0
```

```typescript
test('E2E-CC-002: Complete import with matching bill', async ({ authenticatedPage: page }) => {
  // Setup: Create bill payment
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();

  // Open import wizard and select CC format
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  // Upload CSV
  await uploadCCCSV(page, sampleCCCSV);

  // Wait for parsing
  await expect(page.locator('[data-testid="parsed-transactions-count"]')).toBeVisible();

  // Click Next
  await page.click('[data-testid="next-btn"]');

  // Verify matching preview
  await expect(page.locator('[data-testid="cc-matching-preview"]')).toBeVisible();
  await expect(page.locator('[data-testid="match-count"]')).toContainText('1');

  // Click Import
  await page.click('[data-testid="import-btn"]');

  // Confirm in dialog
  await expect(page.locator('[data-testid="import-confirm-dialog"]')).toBeVisible();
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('imported');

  // Verify CC badges visible
  await expect(page.locator('[data-testid="cc-badge"]').first()).toBeVisible();

  // Verify original bill is grayed
  await expect(page.locator('[data-testid="expanded-bill"]')).toBeVisible();
  await expect(page.locator('[data-testid="expanded-bill"]')).toContainText('R$ 0');
});
```

#### E2E-CC-003: Import with Amount Mismatch Warning

```gherkin
Scenario: User imports CC statement with amount mismatch
  Given I am logged in
  And I have a "Pagamento de fatura" transaction for R$ 1124.77
  When I import a CC CSV totaling R$ 1130.00
  Then I should see matching preview with warning
  And I should see "Difference: R$ 5.23"
  When I proceed with import
  Then import should succeed
  And I should see mismatch banner on transactions page
```

```typescript
test('E2E-CC-003: Import with amount mismatch warning', async ({ authenticatedPage: page }) => {
  // Setup: Create bill payment
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();

  // Import CSV with different total
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const mismatchCSV = `date,title,amount
2025-11-06,Purchase 1,1130.00
2025-11-04,Pagamento recebido,-1130.00`;

  await uploadCCCSV(page, mismatchCSV);
  await page.click('[data-testid="next-btn"]');

  // Verify warning
  await expect(page.locator('[data-testid="match-difference-warning"]')).toBeVisible();
  await expect(page.locator('[data-testid="match-difference"]')).toContainText('5.23');

  // Proceed with import
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify mismatch banner
  await expect(page.locator('[data-testid="cc-mismatch-banner"]')).toBeVisible();
});
```

#### E2E-CC-004: Import without Matching Bill

```gherkin
Scenario: User imports CC statement without matching bill payment
  Given I am logged in
  And I have no "Pagamento de fatura" transactions
  When I import a CC CSV
  Then I should see "No matching bill payments found"
  When I proceed with import
  Then transactions should be imported without linking
  And dashboard should show unmatched amount
```

```typescript
test('E2E-CC-004: Import without matching bill', async ({ authenticatedPage: page }) => {
  // Import without any bill payments
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSVNoMatch);
  await page.click('[data-testid="next-btn"]');

  // Verify no match message
  await expect(page.locator('[data-testid="no-matches-message"]')).toBeVisible();

  // Proceed
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

  // Navigate to dashboard and check status
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="cc-status-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="cc-unmatched-amount"]')).not.toContainText('R$ 0');
});
```

### 3.3 Transaction Display

#### E2E-CC-005: Display Credit Card Badge

```gherkin
Scenario: Credit card transactions show badge
  Given I am logged in
  And I have imported CC transactions
  When I view the transactions list
  Then CC transactions should have credit card badge
  And badge should be blue colored
```

```typescript
test('E2E-CC-005: Display credit card badge', async ({ authenticatedPage: page }) => {
  // Setup: Import CC transactions
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSV);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Wait for import to complete
  await page.waitForSelector('[data-testid="cc-badge"]');

  // Verify badge is visible and styled
  const badge = page.locator('[data-testid="cc-badge"]').first();
  await expect(badge).toBeVisible();
  await expect(badge).toHaveCSS('background-color', /blue|rgb\(59, 130, 246\)/);
});
```

#### E2E-CC-006: Display Installment Badge

```gherkin
Scenario: Installment transactions show installment badge
  Given I am logged in
  And I have imported CC transactions with installments
  When I view the transactions list
  Then installment transactions should show "1/3" badge
  And tooltip should show "Parcela 1 de 3"
```

```typescript
test('E2E-CC-006: Display installment badge', async ({ authenticatedPage: page }) => {
  // Setup with installment transaction
  await createBillPayment(page, { date: '2025-10-31', amount: -500 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const installmentCSV = `date,title,amount
2025-11-08,Hospital - Parcela 1/3,200.00
2025-11-04,Pagamento recebido,-500.00`;

  await uploadCCCSV(page, installmentCSV);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify installment badge
  await expect(page.locator('[data-testid="installment-badge"]')).toContainText('1/3');

  // Hover for tooltip
  await page.locator('[data-testid="installment-badge"]').hover();
  await expect(page.locator('[role="tooltip"]')).toContainText('Parcela 1 de 3');
});
```

#### E2E-CC-007: Display Expanded Bill (Grayed Out)

```gherkin
Scenario: Expanded bill payment shows grayed out with original amount
  Given I am logged in
  And I have expanded a bill payment
  When I view the transactions list
  Then the original bill should be grayed out
  And it should show "R$ 0" as current amount
  And it should show "(was R$ 1,124.77)" reference
  And it should have "Collapse" button
```

```typescript
test('E2E-CC-007: Display expanded bill grayed out', async ({ authenticatedPage: page }) => {
  // Setup and import
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSV);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify expanded bill display
  const expandedBill = page.locator('[data-testid="expanded-bill"]');
  await expect(expandedBill).toBeVisible();
  await expect(expandedBill).toHaveCSS('opacity', '0.5'); // or similar grayed style
  await expect(expandedBill).toContainText('R$ 0');
  await expect(expandedBill).toContainText('was R$ 1.124');
  await expect(expandedBill.locator('[data-testid="collapse-btn"]')).toBeVisible();
});
```

### 3.4 Dashboard Status Card

#### E2E-CC-008: Dashboard Shows CC Status Card

```gherkin
Scenario: Dashboard displays credit card status card
  Given I am logged in
  And I have imported CC transactions
  When I navigate to the dashboard
  Then I should see "Credit Card Status" card
  And it should show total CC spending
  And it should show matched amount
  And it should show unmatched amount if any
```

```typescript
test('E2E-CC-008: Dashboard shows CC status card', async ({ authenticatedPage: page }) => {
  // Setup: Import CC transactions
  await createBillPayment(page, { date: '2025-10-31', amount: -1000 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const csv = `date,title,amount
2025-11-06,Store 1,500.00
2025-11-06,Store 2,300.00
2025-11-04,Pagamento recebido,-1000.00`;

  await uploadCCCSV(page, csv);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Navigate to dashboard
  await page.goto('/dashboard');

  // Verify CC status card
  const statusCard = page.locator('[data-testid="cc-status-card"]');
  await expect(statusCard).toBeVisible();
  await expect(statusCard.locator('[data-testid="cc-total-spending"]')).toBeVisible();
  await expect(statusCard.locator('[data-testid="cc-matched-amount"]')).toBeVisible();
});
```

#### E2E-CC-009: Dashboard Status Card Shows Warning

```gherkin
Scenario: Dashboard status card shows mismatch warning
  Given I am logged in
  And I have unmatched CC transactions
  When I navigate to the dashboard
  Then the CC status card should have warning indicator
  And unmatched amount should be highlighted
```

```typescript
test('E2E-CC-009: Dashboard status card shows warning', async ({ authenticatedPage: page }) => {
  // Import without matching bill
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSVNoMatch);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Navigate to dashboard
  await page.goto('/dashboard');

  // Verify warning state
  const statusCard = page.locator('[data-testid="cc-status-card"]');
  await expect(statusCard.locator('[data-testid="cc-warning-indicator"]')).toBeVisible();
  await expect(statusCard.locator('[data-testid="cc-unmatched-amount"]')).toHaveClass(/warning|yellow/);
});
```

### 3.5 Mismatch Banner

#### E2E-CC-010: Mismatch Banner on Transactions Page

```gherkin
Scenario: Mismatch banner appears on transactions page
  Given I am logged in
  And I have unmatched CC transactions
  When I view the transactions page
  Then I should see a warning banner
  And it should show unmatched amount
  And it should be dismissible
```

```typescript
test('E2E-CC-010: Mismatch banner on transactions page', async ({ authenticatedPage: page }) => {
  // Import without matching bill
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSVNoMatch);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Verify banner
  const banner = page.locator('[data-testid="cc-mismatch-banner"]');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Unmatched');
  await expect(banner.locator('[data-testid="dismiss-banner-btn"]')).toBeVisible();
});
```

#### E2E-CC-011: Dismiss Mismatch Banner

```gherkin
Scenario: User dismisses mismatch banner
  Given I am logged in
  And I see the mismatch banner
  When I click the dismiss button
  Then the banner should hide
  And it should stay hidden during the session
```

```typescript
test('E2E-CC-011: Dismiss mismatch banner', async ({ authenticatedPage: page }) => {
  // Setup: Create unmatched scenario
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSVNoMatch);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Dismiss banner
  await page.click('[data-testid="dismiss-banner-btn"]');

  // Verify hidden
  await expect(page.locator('[data-testid="cc-mismatch-banner"]')).not.toBeVisible();

  // Navigate away and back
  await page.goto('/dashboard');
  await page.goto('/transactions');

  // Should stay hidden
  await expect(page.locator('[data-testid="cc-mismatch-banner"]')).not.toBeVisible();
});
```

### 3.6 Collapse Functionality

#### E2E-CC-012: Collapse Expanded Bill

```gherkin
Scenario: User collapses expanded bill payment
  Given I am logged in
  And I have an expanded bill payment with linked CC transactions
  When I click "Collapse" on the expanded bill
  Then I should see confirmation dialog
  When I confirm
  Then the CC transactions should be deleted
  And the bill should be restored to original amount
  And success toast should appear
```

```typescript
test('E2E-CC-012: Collapse expanded bill', async ({ authenticatedPage: page }) => {
  // Setup: Create and expand bill
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSV);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Count CC transactions before collapse
  const ccTransactionsBefore = await page.locator('[data-testid="cc-badge"]').count();
  expect(ccTransactionsBefore).toBeGreaterThan(0);

  // Click collapse
  await page.click('[data-testid="collapse-btn"]');

  // Verify confirmation dialog
  await expect(page.locator('[data-testid="collapse-confirm-dialog"]')).toBeVisible();
  await expect(page.locator('[data-testid="collapse-confirm-dialog"]')).toContainText('Delete');

  // Confirm
  await page.click('[data-testid="confirm-collapse-btn"]');

  // Verify success
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('collapsed');

  // Verify CC transactions gone
  await expect(page.locator('[data-testid="cc-badge"]')).not.toBeVisible();

  // Verify bill restored
  const billRow = page.locator('[data-testid="transaction-row"]:has-text("Pagamento de fatura")');
  await expect(billRow).toContainText('R$ 1.124');
  await expect(billRow).not.toHaveClass(/grayed|expanded/);
});
```

#### E2E-CC-013: Cancel Collapse

```gherkin
Scenario: User cancels collapse confirmation
  Given I am logged in
  And I see the collapse confirmation dialog
  When I click "Cancel"
  Then the dialog should close
  And no changes should be made
```

```typescript
test('E2E-CC-013: Cancel collapse', async ({ authenticatedPage: page }) => {
  // Setup expanded bill
  await createBillPayment(page, { date: '2025-10-31', amount: -500 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const csv = `date,title,amount
2025-11-06,Store,500.00
2025-11-04,Pagamento recebido,-500.00`;

  await uploadCCCSV(page, csv);
  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');

  // Click collapse then cancel
  await page.click('[data-testid="collapse-btn"]');
  await page.click('[data-testid="cancel-collapse-btn"]');

  // Verify dialog closed
  await expect(page.locator('[data-testid="collapse-confirm-dialog"]')).not.toBeVisible();

  // Verify CC transactions still exist
  await expect(page.locator('[data-testid="cc-badge"]')).toBeVisible();
});
```

### 3.7 Edge Cases

#### E2E-CC-014: Import Empty CSV

```gherkin
Scenario: User tries to import empty CSV
  Given I am logged in
  When I upload an empty CSV file
  Then I should see error message "No transactions found"
```

```typescript
test('E2E-CC-014: Import empty CSV', async ({ authenticatedPage: page }) => {
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const emptyCSV = `date,title,amount`;
  await uploadCCCSV(page, emptyCSV);

  await expect(page.locator('[data-testid="parse-error"]')).toContainText('No transactions');
});
```

#### E2E-CC-015: Import Invalid CSV Format

```gherkin
Scenario: User uploads CSV with wrong format
  Given I am logged in
  When I upload a CSV with missing columns
  Then I should see format error message
```

```typescript
test('E2E-CC-015: Import invalid CSV format', async ({ authenticatedPage: page }) => {
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const invalidCSV = `wrong,columns,here
data1,data2,data3`;
  await uploadCCCSV(page, invalidCSV);

  await expect(page.locator('[data-testid="parse-error"]')).toContainText('Invalid format');
});
```

#### E2E-CC-016: Multiple Bill Payments in Same Month

```gherkin
Scenario: Import matches correct bill when multiple exist
  Given I am logged in
  And I have two "Pagamento de fatura" transactions:
    | date       | amount   |
    | 2025-10-15 | -500.00  |
    | 2025-10-31 | -1000.00 |
  When I import CC statement with "Pagamento recebido" of R$ 1000
  Then it should match the R$ 1000 bill, not the R$ 500 bill
```

```typescript
test('E2E-CC-016: Multiple bill payments matching', async ({ authenticatedPage: page }) => {
  // Create two bills
  await createBillPayment(page, { date: '2025-10-15', amount: -500 });
  await createBillPayment(page, { date: '2025-10-31', amount: -1000 });
  await page.reload();

  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);

  const csv = `date,title,amount
2025-11-06,Store,1000.00
2025-11-04,Pagamento recebido,-1000.00`;

  await uploadCCCSV(page, csv);
  await page.click('[data-testid="next-btn"]');

  // Verify correct match
  await expect(page.locator('[data-testid="match-bill-amount"]')).toContainText('1.000');
  await expect(page.locator('[data-testid="match-bill-date"]')).toContainText('31/10');
});
```

---

## 4. Test Data Helpers

```typescript
// e2e/tests/m12-cc-import/helpers.ts

import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'testpassword');
  await page.click('[data-testid="login-btn"]');
  await page.waitForURL('/dashboard');
}

export async function createBillPayment(page: Page, data: {
  date: string;
  amount: number;
}) {
  return page.request.post('/api/v1/transactions', {
    data: {
      date: data.date,
      description: 'Pagamento de fatura',
      amount: data.amount,
      type: 'expense',
    },
  });
}

export async function importCCStatement(page: Page, csvContent: string) {
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="bank-format-select"]');
  await page.click('[data-testid="format-nubank-credit-card"]');

  const buffer = Buffer.from(csvContent);
  await page.locator('[data-testid="file-upload-input"]').setInputFiles({
    name: 'credit-card.csv',
    mimeType: 'text/csv',
    buffer,
  });

  await page.click('[data-testid="next-btn"]');
  await page.click('[data-testid="import-btn"]');
  await page.click('[data-testid="confirm-import-btn"]');
}

export async function clearTestData(page: Page) {
  // API call to clear test user data
  await page.request.delete('/api/v1/test/clear-data');
}
```

---

## 5. Visual Regression Tests

```typescript
// e2e/tests/m12-cc-import/visual.spec.ts

test('E2E-CC-VR-001: Import wizard with CC format', async ({ authenticatedPage: page }) => {
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await expect(page).toHaveScreenshot('cc-import-wizard.png');
});

test('E2E-CC-VR-002: Matching preview', async ({ authenticatedPage: page }) => {
  await createBillPayment(page, { date: '2025-10-31', amount: -1124.77 });
  await page.reload();
  await page.click('[data-testid="import-btn"]');
  await selectCCFormat(page);
  await uploadCCCSV(page, sampleCCCSV);
  await page.click('[data-testid="next-btn"]');
  await expect(page).toHaveScreenshot('cc-matching-preview.png');
});

test('E2E-CC-VR-003: Transaction with CC badge', async ({ authenticatedPage: page }) => {
  // Setup imported transactions
  await expect(page.locator('[data-testid="cc-badge"]').first()).toHaveScreenshot('cc-badge.png');
});

test('E2E-CC-VR-004: Dashboard status card', async ({ authenticatedPage: page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="cc-status-card"]')).toHaveScreenshot('cc-status-card.png');
});
```

---

## 6. Test Execution

### Run All CC Import Tests

```bash
cd e2e && npx playwright test --project=m12-cc-import
```

### Run Specific Test

```bash
cd e2e && npx playwright test tests/m12-cc-import/cc-import.spec.ts -g "E2E-CC-002"
```

### Run with UI

```bash
cd e2e && npx playwright test --project=m12-cc-import --ui
```

### Debug Mode

```bash
cd e2e && npx playwright test --project=m12-cc-import --debug
```

### Generate Report

```bash
cd e2e && npx playwright test --project=m12-cc-import --reporter=html
```

---

## 7. Test Coverage Matrix

| Scenario | Import | Display | Dashboard | Collapse | Error |
|----------|--------|---------|-----------|----------|-------|
| E2E-CC-001 | x | | | | |
| E2E-CC-002 | x | x | | | |
| E2E-CC-003 | x | | | | x |
| E2E-CC-004 | x | | x | | |
| E2E-CC-005 | | x | | | |
| E2E-CC-006 | | x | | | |
| E2E-CC-007 | | x | | | |
| E2E-CC-008 | | | x | | |
| E2E-CC-009 | | | x | | |
| E2E-CC-010 | | x | | | |
| E2E-CC-011 | | x | | | |
| E2E-CC-012 | | | | x | |
| E2E-CC-013 | | | | x | |
| E2E-CC-014 | | | | | x |
| E2E-CC-015 | | | | | x |
| E2E-CC-016 | x | | | | |

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **Guide Reference:** `context/guides/Finance-Tracker-E2E-Testing-Guide-v1.md`
