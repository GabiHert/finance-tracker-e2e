# Finance Tracker

## Missing E2E Test Scenarios

### Gap Analysis & Implementation Backlog

**Version 1.0 | November 2025**

---

| Property | Value |
|----------|-------|
| **Document Type** | E2E Testing Gap Analysis |
| **Application** | Finance Tracker - Personal Finance Management |
| **Test Stack** | Playwright + Docker Compose |
| **Related Documents** | E2E Testing Guide v1.0, Implementation Guide v1.0 |
| **Status** | Ready for Implementation |

---

## Table of Contents

1. [Overview](#1-overview)
2. [M2: Authentication - Missing Scenarios](#2-m2-authentication---missing-scenarios)
3. [M3: Categories - Missing Scenarios](#3-m3-categories---missing-scenarios)
4. [M4: Transactions - Missing Scenarios](#4-m4-transactions---missing-scenarios)
5. [M5: Import - Missing Scenarios](#5-m5-import---missing-scenarios)
6. [M6: Rules - Missing Scenarios](#6-m6-rules---missing-scenarios)
7. [M7: Goals - Missing Scenarios](#7-m7-goals---missing-scenarios)
8. [M10: Settings - Missing Scenarios](#8-m10-settings---missing-scenarios)
9. [Implementation Priority](#9-implementation-priority)
10. [Test Data Requirements](#10-test-data-requirements)

---

## 1. Overview

### 1.1 Document Purpose

This document identifies E2E test scenarios that were specified in the original E2E Testing Guide (v1.0) but have not yet been implemented. These scenarios represent gaps in test coverage that should be addressed to achieve full milestone validation.

### 1.2 Current Coverage Summary

| Milestone | Specified | Implemented | Missing | Coverage |
|-----------|-----------|-------------|---------|----------|
| M2 | 8 | 4 | 4 | 50% |
| M3 | 6 | 3 | 3 | 50% |
| M4 | 11 | 10 | 1 | 91% |
| M5 | 6 | 4 | 2 | 67% |
| M6 | 8 | 7 | 1 | 88% |
| M7 | 6 | 5 | 1 | 83% |
| M10 | 9 | 7 | 2 | 78% |
| **Total** | **54** | **40** | **14** | **74%** |

### 1.3 Gap Categories

| Category | Count | Description |
|----------|-------|-------------|
| Authentication | 4 | Session management, token refresh, password reset |
| Data Management | 4 | Delete operations with side effects |
| Advanced Features | 4 | Complex workflows (import rules, bulk operations) |
| Destructive Operations | 2 | Account/data deletion with confirmation |

---

## 2. M2: Authentication - Missing Scenarios

### 2.1 E2E-M2-05: Remember Me Functionality

**Priority**: Medium
**Dependencies**: Login flow working, token storage implemented

```gherkin
Feature: Remember Me Functionality

  Scenario: Remember me extends token duration
    Given I am on the login screen
    And a user exists with email "user@example.com" and password "ValidPass123"
    When I fill in email "user@example.com"
    And I fill in password "ValidPass123"
    And I check the "Lembrar de mim" checkbox
    And I click "Entrar"
    Then I should be redirected to the dashboard
    And the refresh token should have extended expiry (30 days)

    # Token Validation
    When I inspect the stored token
    Then the token expiry should be approximately 30 days from now

  Scenario: Without remember me, token has standard duration
    Given I am on the login screen
    And a user exists with email "user@example.com" and password "ValidPass123"
    When I log in without checking "Lembrar de mim"
    Then the refresh token should have standard expiry (7 days)
```

**Test Implementation Notes**:
- File: `e2e/tests/m2-auth/remember-me.spec.ts`
- Requires: Access to token storage (localStorage/cookies)
- Mock: Consider mocking time to verify token expiry

---

### 2.2 E2E-M2-06: Password Reset Flow

**Priority**: High
**Dependencies**: Email service (can be mocked), password reset API

```gherkin
Feature: Password Reset Flow

  Scenario: User requests password reset
    Given a user exists with email "forgot@example.com"
    And I am on the login screen
    When I click "Esqueceu a senha?"
    Then I should see the password reset form

    When I fill in email "forgot@example.com"
    And I click "Enviar link"
    Then I should see "Se o e-mail existir, enviaremos um link de recuperacao"

    # Database Validation
    And a password_reset_token record should exist for the user
    And the token should expire in 1 hour

  Scenario: User completes password reset with valid token
    Given a user exists with email "forgot@example.com"
    And a valid password reset token exists for the user
    When I navigate to the reset link with the valid token
    Then I should see the new password form

    When I fill in new password "NewSecurePass456"
    And I confirm the password "NewSecurePass456"
    And I click "Redefinir senha"
    Then I should be redirected to the login screen
    And I should see "Senha alterada com sucesso"

    # Validation
    When I log in with email "forgot@example.com" and password "NewSecurePass456"
    Then I should be redirected to the dashboard

  Scenario: Password reset fails with expired token
    Given a user exists with email "forgot@example.com"
    And an expired password reset token exists
    When I navigate to the reset link with the expired token
    Then I should see an error "Link expirado. Solicite um novo"
    And I should see a link to request a new reset
```

**Test Implementation Notes**:
- File: `e2e/tests/m2-auth/password-reset.spec.ts`
- Requires: Mock email service or direct database token access
- Consider: Token generation helper in test utilities

---

### 2.3 E2E-M2-07: User Logout Flow

**Priority**: High
**Dependencies**: Login flow working, session management

```gherkin
Feature: User Logout

  Scenario: User logs out and session is cleared
    Given I am logged in as "user@example.com"
    And I am on the dashboard
    When I click on my user profile menu
    And I click "Sair"
    Then I should be redirected to the login screen
    And I should see the login form

    # Session Validation
    When I try to navigate to "/dashboard" directly
    Then I should be redirected to the login screen

    # Token Validation
    And access_token should be cleared from storage
    And refresh_token should be invalidated on the server

  Scenario: Logout from any page works correctly
    Given I am logged in
    And I am on the transactions screen
    When I log out
    Then I should be redirected to the login screen
    And my session should be completely cleared
```

**Test Implementation Notes**:
- File: `e2e/tests/m2-auth/logout.spec.ts`
- Requires: Profile/user menu implemented
- Verify: Protected route access after logout

---

### 2.4 E2E-M2-08: Token Refresh on Expiry

**Priority**: Medium
**Dependencies**: Token refresh API, interceptors implemented

```gherkin
Feature: Automatic Token Refresh

  Scenario: Access token is automatically refreshed when expired
    Given I am logged in with an access token that expires in 5 seconds
    And I have a valid refresh token
    When I wait for the access token to expire
    And I perform an authenticated action (e.g., fetch transactions)
    Then the request should succeed
    And a new access_token should be stored
    And the action should complete without user intervention

  Scenario: User is logged out when refresh token is also expired
    Given I am logged in with an expired access token
    And my refresh token is also expired
    When I perform an authenticated action
    Then I should be redirected to the login screen
    And I should see a message "Sua sessao expirou. Faca login novamente"
```

**Test Implementation Notes**:
- File: `e2e/tests/m2-auth/token-refresh.spec.ts`
- Requires: Ability to set/mock token expiry times
- Consider: API interceptor to inject expired tokens for testing

---

## 3. M3: Categories - Missing Scenarios

### 3.1 E2E-M3-03: Delete Category Flow

**Priority**: High
**Dependencies**: Category CRUD working

```gherkin
Feature: Delete Category

  Scenario: User deletes a category with no transactions
    Given I am logged in
    And I have a category "Teste" with 0 transactions
    And I navigate to the categories screen
    When I hover over the "Teste" card
    And I click the delete button
    Then I should see a confirmation dialog
    And the dialog should ask "Deseja excluir esta categoria?"

    When I confirm the deletion
    Then the "Teste" category should not appear in the grid
    And I should see a success toast "Categoria excluida"

    # Database Validation
    And no category record should exist with name "Teste"
```

**Test Implementation Notes**:
- File: `e2e/tests/m3-categories/delete-category.spec.ts`
- Requires: Delete confirmation modal implemented
- Setup: Create test category in beforeEach

---

### 3.2 E2E-M3-04: Delete Category with Transactions

**Priority**: High
**Dependencies**: Categories and transactions linked

```gherkin
Feature: Delete Category with Existing Transactions

  Scenario: User deletes a category that has transactions
    Given I am logged in
    And I have a category "Food" with 5 transactions
    And I navigate to the categories screen
    When I hover over the "Food" card
    And I click the delete button
    Then I should see a confirmation dialog
    And the dialog should warn "5 transacoes ficarao sem categoria"

    When I confirm the deletion
    Then the "Food" category should not appear in the grid
    And I should see a success toast

    # Database Validation
    And the 5 transactions should have category_id set to NULL
    And no category record should exist with name "Food"

  Scenario: User cancels deletion of category with transactions
    Given I am logged in
    And I have a category "Important" with 10 transactions
    And I navigate to the categories screen
    When I click delete on "Important" category
    And I see the warning about 10 transactions
    And I click "Cancelar"
    Then the "Important" category should still appear in the grid
    And all 10 transactions should still be linked to it
```

**Test Implementation Notes**:
- File: `e2e/tests/m3-categories/delete-category-with-transactions.spec.ts`
- Requires: Test data with category-transaction relationships
- Verify: Orphaned transactions handling

---

### 3.3 E2E-M3-06: Category Tabs (Personal vs Group)

**Priority**: Medium
**Dependencies**: Groups feature (M9) implemented

```gherkin
Feature: Category Tabs

  Scenario: User views personal and group categories separately
    Given I am logged in
    And I have 3 personal categories
    And I am a member of a group "Familia" with 2 group categories
    And I navigate to the categories screen

    When I click tab "Minhas Categorias"
    Then I should see 3 category cards
    And all categories should have owner_type "user"

    When I click tab "Categorias do Grupo"
    Then I should see 2 category cards
    And all categories should have owner_type "group"

  Scenario: Tab indicator shows correct counts
    Given I am logged in
    And I have 5 personal categories
    And I have 3 group categories
    When I navigate to the categories screen
    Then the "Minhas Categorias" tab should show "(5)"
    And the "Categorias do Grupo" tab should show "(3)"
```

**Test Implementation Notes**:
- File: `e2e/tests/m3-categories/category-tabs.spec.ts`
- Dependencies: Requires group setup from M9
- Consider: May need to defer until after M9 completion

---

## 4. M4: Transactions - Missing Scenarios

### 4.1 E2E-M4-10: Bulk Categorize Transactions

**Priority**: Medium
**Dependencies**: Bulk selection, category assignment

```gherkin
Feature: Bulk Categorize Transactions

  Scenario: User categorizes multiple uncategorized transactions at once
    Given I am logged in
    And I have 5 uncategorized transactions
    And I have a category "Outros"
    And I navigate to the transactions screen

    When I select the 5 uncategorized transactions using checkboxes
    Then I should see bulk actions bar showing "5 selecionados"

    When I click "Categorizar"
    Then I should see a category selection dropdown/modal

    When I select category "Outros"
    And I click "Aplicar"
    Then all 5 transactions should display the "Outros" category icon
    And I should see toast "5 transacoes categorizadas"

    # Database Validation
    And all 5 transactions should have category_id set to "Outros" ID

  Scenario: Bulk categorize mixed transactions (some already categorized)
    Given I am logged in
    And I have 3 transactions in category "Food"
    And I have 2 uncategorized transactions
    And I have a category "Outros"
    When I select all 5 transactions
    And I bulk categorize to "Outros"
    Then all 5 transactions should be recategorized to "Outros"
```

**Test Implementation Notes**:
- File: `e2e/tests/m4-transactions/bulk-categorize.spec.ts`
- Requires: Bulk selection UI, category assignment modal
- Setup: Multiple uncategorized transactions

---

## 5. M5: Import - Missing Scenarios

### 5.1 E2E-M5-05: Create Rule During Import

**Priority**: Medium
**Dependencies**: Import wizard, rules engine

```gherkin
Feature: Create Categorization Rule During Import

  Scenario: User creates a rule while categorizing imported transactions
    Given I am logged in
    And I have a category "Delivery"
    And I navigate to the transactions screen
    When I click "Importar"
    And I upload a CSV file with multiple "IFOOD" transactions
    And I proceed to the categorization step

    When I select "Delivery" for one IFOOD transaction
    Then I should see option "Criar regra para padrao similar"

    When I check "Criar regra para padrao similar"
    And I complete the import
    Then I should see success message with rule creation note

    # Database Validation
    And a category_rule should exist with pattern ".*IFOOD.*"
    And the rule should be linked to category "Delivery"

  Scenario: Created rule applies to subsequent imports
    Given I created a rule ".*IFOOD.*" -> "Delivery" in a previous import
    When I import a new CSV with IFOOD transactions
    Then the IFOOD transactions should be auto-categorized as "Delivery"
```

**Test Implementation Notes**:
- File: `e2e/tests/m5-import/create-rule-during-import.spec.ts`
- Requires: Rule creation checkbox in import wizard
- Test data: CSV file with repeated merchant patterns

---

### 5.2 E2E-M5-06: Custom Column Mapping

**Priority**: Low
**Dependencies**: Column mapping UI in import wizard

```gherkin
Feature: Custom Column Mapping for CSV Import

  Scenario: User maps custom CSV columns to transaction fields
    Given I am logged in
    And I navigate to the import wizard
    And I upload a CSV file with non-standard column headers:
      | Data Transacao | Descricao Completa | Valor Total |

    When I select bank format "Personalizado"
    Then I should see column mapping interface

    When I map columns:
      | CSV Column | Transaction Field |
      | Data Transacao | date |
      | Descricao Completa | description |
      | Valor Total | amount |
    And I click "Visualizar"
    Then I should see correctly parsed transactions
    And dates should display in correct format
    And amounts should be parsed as numbers

  Scenario: Column mapping validation
    Given I am in the column mapping interface
    When I leave the "date" field unmapped
    And I try to proceed
    Then I should see error "Campo 'Data' e obrigatorio"
    And I should not be able to continue until mapped
```

**Test Implementation Notes**:
- File: `e2e/tests/m5-import/custom-column-mapping.spec.ts`
- Requires: Custom format selection, drag-drop or dropdown mapping UI
- Test data: CSV with non-standard headers

---

## 6. M6: Rules - Missing Scenarios

### 6.1 E2E-M6-08: Rule Priority Conflict Resolution

**Priority**: Medium
**Dependencies**: Multiple rules with overlapping patterns

```gherkin
Feature: Rule Priority Affects Matching

  Scenario: Higher priority rule wins when multiple rules match
    Given I am logged in
    And I have a rule ".*DELIVERY.*" -> "Delivery" with priority 10
    And I have a rule ".*IFOOD.*" -> "Food" with priority 20

    When I import a transaction with description "IFOOD DELIVERY"
    Then the transaction should be categorized as "Food"
    Because "Food" rule has higher priority (20 > 10)

  Scenario: Editing rule priority changes matching behavior
    Given I am logged in
    And I have a rule ".*DELIVERY.*" -> "Delivery" with priority 10
    And I have a rule ".*IFOOD.*" -> "Food" with priority 20
    And I navigate to the rules screen

    When I drag the "Delivery" rule above the "Food" rule
    Then "Delivery" rule should have higher priority than "Food"

    When I import a transaction "IFOOD DELIVERY"
    Then the transaction should now be categorized as "Delivery"

  Scenario: Rule priority is visible in rules list
    Given I am logged in
    And I have 3 rules with different priorities
    When I navigate to the rules screen
    Then rules should be displayed in priority order
    And each rule should show its priority number or position indicator
```

**Test Implementation Notes**:
- File: `e2e/tests/m6-rules/rule-priority.spec.ts`
- Requires: Drag-and-drop reordering, priority storage
- Test data: Multiple rules with overlapping patterns

---

## 7. M7: Goals - Missing Scenarios

### 7.1 E2E-M7-06: Goal Updates After Transaction

**Priority**: High
**Dependencies**: Real-time goal progress calculation

```gherkin
Feature: Goal Progress Updates After Transaction Changes

  Scenario: Goal progress increases when new expense added
    Given I am logged in
    And I have a goal for "Alimentacao" with limit R$ 1.000
    And current spending in "Alimentacao" is R$ 500 (50%)
    And I navigate to the goals screen
    Then the "Alimentacao" goal should show progress at 50%

    When I create a new transaction:
      | Category | Alimentacao |
      | Amount | -200 |
      | Description | Supermercado |
    And I navigate back to the goals screen
    Then the "Alimentacao" goal should show R$ 700 spent
    And progress should be 70%
    And the progress bar should reflect 70%

  Scenario: Goal progress decreases when expense deleted
    Given I am logged in
    And I have a goal for "Transporte" with limit R$ 500
    And current spending is R$ 400 (80%)
    And I have a transaction "UBER" for R$ 100 in "Transporte"

    When I delete the "UBER" transaction
    And I navigate to the goals screen
    Then the "Transporte" goal should show R$ 300 spent
    And progress should be 60%

  Scenario: Goal crosses threshold and changes color
    Given I am logged in
    And I have a goal for "Entretenimento" with limit R$ 200
    And current spending is R$ 180 (90%)
    And the progress bar is green

    When I add a transaction in "Entretenimento" for R$ 50
    And I navigate to the goals screen
    Then current spending should be R$ 230 (115%)
    And the progress bar should be red
    And the card should have the over-limit visual effect
```

**Test Implementation Notes**:
- File: `e2e/tests/m7-goals/goal-progress-updates.spec.ts`
- Requires: Real-time progress calculation
- Test: Both adding and removing transactions

---

## 8. M10: Settings - Missing Scenarios

### 8.1 E2E-M10-08: Delete All Transactions

**Priority**: High
**Dependencies**: Danger zone UI, password confirmation

```gherkin
Feature: Delete All Transactions

  Scenario: User deletes all their transactions
    Given I am logged in
    And I have 50 transactions
    And I navigate to the settings screen

    When I scroll to the "Zona de Perigo" section
    And I click "Excluir todas as transacoes"
    Then I should see a danger confirmation modal
    And the modal should warn "Esta acao ira excluir 50 transacoes permanentemente"

    When I enter my password for confirmation
    And I type "DELETE_ALL_TRANSACTIONS" in the confirmation field
    Then the "Excluir" button should become enabled

    When I click "Excluir"
    Then I should see a success message "50 transacoes excluidas"

    When I navigate to the transactions screen
    Then I should see the empty state
    And no transactions should exist

    # Database Validation
    And no transaction records should exist for my user

  Scenario: Delete all transactions requires exact confirmation text
    Given I am logged in
    And I have transactions
    And I am on the delete transactions modal
    When I type "delete all transactions" (lowercase)
    Then the "Excluir" button should remain disabled

    When I type "DELETE_ALL_TRANSACTIONS" (exact match)
    Then the "Excluir" button should become enabled

  Scenario: Wrong password prevents deletion
    Given I am logged in
    And I am on the delete transactions modal
    When I enter wrong password "WrongPassword123"
    And I type the correct confirmation text
    And I click "Excluir"
    Then I should see error "Senha incorreta"
    And my transactions should not be deleted
```

**Test Implementation Notes**:
- File: `e2e/tests/m10-settings/delete-all-transactions.spec.ts`
- Requires: Password re-confirmation, exact text matching
- Safety: Dangerous action - test with isolated test data

---

### 8.2 E2E-M10-09: Delete Account

**Priority**: High
**Dependencies**: Cascade delete, session cleanup

```gherkin
Feature: Delete User Account

  Scenario: User permanently deletes their account
    Given I am logged in as "delete-test@example.com"
    And I have transactions, categories, and goals
    And I navigate to the settings screen

    When I scroll to the "Zona de Perigo" section
    And I click "Excluir conta"
    Then I should see a danger modal with warnings:
      | Warning |
      | Esta acao e irreversivel |
      | Todos os seus dados serao excluidos |
      | Voce nao podera recuperar sua conta |

    When I enter my password
    And I type "DELETE" in the confirmation field
    And I click "Excluir conta permanentemente"
    Then I should be logged out
    And I should be redirected to the login screen
    And I should see message "Sua conta foi excluida"

    # Database Validation
    And no user record should exist for "delete-test@example.com"
    And no transactions should exist for the deleted user
    And no categories should exist for the deleted user
    And no goals should exist for the deleted user

  Scenario: Account deletion fails with wrong password
    Given I am logged in
    And I am on the delete account modal
    When I enter wrong password
    And I type "DELETE"
    And I click "Excluir conta permanentemente"
    Then I should see error "Senha incorreta"
    And my account should still exist
    And I should remain on the settings screen

  Scenario: User cannot log in after account deletion
    Given I previously deleted account "deleted@example.com"
    When I try to log in with "deleted@example.com"
    Then I should see error "E-mail ou senha incorretos"
    And I should not be able to access the account
```

**Test Implementation Notes**:
- File: `e2e/tests/m10-settings/delete-account.spec.ts`
- Requires: Cascade delete on backend, session invalidation
- Safety: Use dedicated test user for deletion tests
- Isolation: Run in separate test database or cleanup after

---

## 9. Implementation Priority

### 9.1 Priority Matrix

| Priority | Scenario | Milestone | Reason |
|----------|----------|-----------|--------|
| P0 - Critical | E2E-M2-07: Logout | M2 | Security requirement |
| P0 - Critical | E2E-M10-09: Delete Account | M10 | GDPR compliance |
| P1 - High | E2E-M2-06: Password Reset | M2 | User recovery path |
| P1 - High | E2E-M3-03: Delete Category | M3 | Core CRUD completion |
| P1 - High | E2E-M3-04: Delete with Transactions | M3 | Data integrity |
| P1 - High | E2E-M7-06: Goal Progress Updates | M7 | Core feature validation |
| P1 - High | E2E-M10-08: Delete All Transactions | M10 | User data control |
| P2 - Medium | E2E-M2-05: Remember Me | M2 | UX enhancement |
| P2 - Medium | E2E-M2-08: Token Refresh | M2 | Session management |
| P2 - Medium | E2E-M4-10: Bulk Categorize | M4 | Productivity feature |
| P2 - Medium | E2E-M5-05: Create Rule in Import | M5 | Workflow optimization |
| P2 - Medium | E2E-M6-08: Rule Priority | M6 | Advanced feature |
| P2 - Medium | E2E-M3-06: Category Tabs | M3 | Groups integration |
| P3 - Low | E2E-M5-06: Custom Column Mapping | M5 | Edge case support |

### 9.2 Recommended Implementation Order

1. **Phase 1 - Security & Compliance** (P0)
   - E2E-M2-07: Logout
   - E2E-M10-09: Delete Account

2. **Phase 2 - Core CRUD Completion** (P1)
   - E2E-M3-03: Delete Category
   - E2E-M3-04: Delete Category with Transactions
   - E2E-M2-06: Password Reset

3. **Phase 3 - Feature Validation** (P1)
   - E2E-M7-06: Goal Progress Updates
   - E2E-M10-08: Delete All Transactions

4. **Phase 4 - Enhanced UX** (P2)
   - E2E-M2-05: Remember Me
   - E2E-M2-08: Token Refresh
   - E2E-M4-10: Bulk Categorize

5. **Phase 5 - Advanced Features** (P2-P3)
   - E2E-M5-05: Create Rule During Import
   - E2E-M6-08: Rule Priority
   - E2E-M3-06: Category Tabs
   - E2E-M5-06: Custom Column Mapping

---

## 10. Test Data Requirements

### 10.1 New Test Fixtures Needed

| Fixture | Purpose | Required By |
|---------|---------|-------------|
| `user-for-deletion` | Isolated user for delete tests | M10-09 |
| `user-with-expired-token` | Token refresh testing | M2-08 |
| `password-reset-token` | Reset flow testing | M2-06 |
| `category-with-transactions` | Cascade delete testing | M3-04 |
| `overlapping-rules` | Priority conflict testing | M6-08 |
| `csv-custom-columns` | Column mapping testing | M5-06 |

### 10.2 Test Database Considerations

- Create isolated test users for destructive tests
- Implement database transaction rollback between tests
- Consider using database snapshots for complex setups
- Ensure test data doesn't leak between test runs

### 10.3 Mock Requirements

| Mock | Purpose | Scenarios |
|------|---------|-----------|
| Email Service | Password reset emails | M2-06 |
| Time/Date | Token expiry testing | M2-05, M2-08 |
| Network | Offline detection | Already in M11 |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Team | Initial gap analysis |

---

*--- End of Document ---*
