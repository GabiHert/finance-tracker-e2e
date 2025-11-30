# Finance Tracker

## End-to-End Testing Guide

### Full-Stack Integration Validation

**Version 1.0 | November 2025**

---

| Property | Value |
|----------|-------|
| **Document Type** | E2E Testing Specification |
| **Application** | Finance Tracker - Personal Finance Management |
| **Test Stack** | Playwright + Docker Compose |
| **Related Documents** | Implementation Guide v1.0, Integration TDD v1.0, Backend TDD v6.0, Frontend UI v3.0 |
| **Status** | Ready for Implementation |

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [E2E Testing Strategy](#2-e2e-testing-strategy)
3. [Test Environment](#3-test-environment)
4. [Milestone 1: Foundation Setup](#4-milestone-1-foundation-setup)
5. [Milestone 2: Authentication System](#5-milestone-2-authentication-system)
6. [Milestone 3: Core Data Models & Categories](#6-milestone-3-core-data-models--categories)
7. [Milestone 4: Transaction Management](#7-milestone-4-transaction-management)
8. [Milestone 5: Transaction Import](#8-milestone-5-transaction-import)
9. [Milestone 6: Category Rules Engine](#9-milestone-6-category-rules-engine)
10. [Milestone 7: Goals (Spending Limits)](#10-milestone-7-goals-spending-limits)
11. [Milestone 8: Dashboard & Analytics](#11-milestone-8-dashboard--analytics)
12. [Milestone 9: Groups & Collaboration](#12-milestone-9-groups--collaboration)
13. [Milestone 10: Settings & User Profile](#13-milestone-10-settings--user-profile)
14. [Milestone 11: Polish & MVP Completion](#14-milestone-11-polish--mvp-completion)
15. [Test Data Strategy](#15-test-data-strategy)
16. [Validation Checklist](#16-validation-checklist)

---

## 1. Purpose & Scope

### 1.1 Document Purpose

This E2E Testing Guide defines the full-stack integration test scenarios that validate each milestone's implementation. These tests ensure that the **frontend UI**, **backend API**, and **database** work correctly together as a complete system.

### 1.2 What E2E Tests Validate

| Layer | Validation |
|-------|------------|
| **Frontend** | UI renders correctly, user interactions work, navigation flows |
| **Backend** | API endpoints respond correctly, business logic executes |
| **Database** | Data persists correctly, queries return expected results |
| **Integration** | Frontend calls correct endpoints, data transforms properly |

### 1.3 E2E vs Other Test Types

| Test Type | Speed | Scope | When to Use |
|-----------|-------|-------|-------------|
| Unit Tests | Fast | Single function/component | Always |
| Integration Tests | Medium | Module/layer interaction | Per feature |
| **E2E Tests** | Slow | Full system | Per milestone |

### 1.4 When E2E Tests Run

- After completing each milestone implementation
- Before merging feature branches to main
- In CI/CD pipeline (scheduled, not on every commit)
- Before production releases

---

## 2. E2E Testing Strategy

### 2.1 Incremental Validation

E2E tests are added **incrementally per milestone**, not as a big-bang effort at the end. After completing each milestone, the corresponding E2E scenarios must pass before proceeding.

### 2.2 Test Pyramid Compliance

```
        /\
       /E2E\        <- 10-20 critical journeys (this document)
      /------\
     /Integration\ <- Playwright component tests + BDD backend tests
    /--------------\
   /   Unit Tests   \ <- Jest/Vitest + Go unit tests
  /------------------\
```

### 2.3 Critical Path Focus

E2E tests focus on **critical user journeys** - the paths users most commonly take through the application. Edge cases and error conditions are covered by unit/integration tests.

---

## 3. Test Environment

### 3.1 Environment Requirements

| Component | Requirement |
|-----------|-------------|
| Docker Compose | Isolated test environment with all services |
| PostgreSQL | Clean database per test suite |
| Backend API | Running and connected to test database |
| Frontend | Running and connected to test backend |
| Test Data | Seeded before tests, cleaned after |

### 3.2 Test Database Strategy

- **Isolation**: Dedicated `finance_tracker_e2e` database
- **Seeding**: Known test data loaded before each suite
- **Cleanup**: Database truncated between test suites
- **No Production Data**: Never use real user data

### 3.3 Environment Variables

```
NODE_ENV=test
DATABASE_URL=postgres://test_user:test_pass@localhost:5433/finance_tracker_e2e
API_BASE_URL=http://localhost:8080/api/v1
FRONTEND_URL=http://localhost:3000
```

---

## 4. Milestone 1: Foundation Setup

### 4.1 E2E Eligibility: **NOT ELIGIBLE**

**Justification**: Milestone 1 establishes infrastructure and scaffolding only. There are no user-facing features to test end-to-end.

### 4.2 What M1 Delivers

- Docker Compose setup (PostgreSQL, MinIO, Redis)
- Go backend scaffolding with health check
- React frontend scaffolding
- Test framework setup (Godog, Playwright)

### 4.3 Validation Approach

Instead of E2E tests, M1 is validated through:

| Check | How to Validate |
|-------|-----------------|
| Services start | `docker-compose up -d` succeeds |
| Database connects | `GET /health` returns `database: connected` |
| Frontend loads | Browser opens `localhost:3000` without errors |
| Tests run | `make test` (backend) and `npm test` (frontend) pass |

### 4.4 Pre-E2E Infrastructure Check

Before running any E2E tests in subsequent milestones, verify M1 foundation:

```
Scenario: Infrastructure is ready for E2E testing
  Given Docker services are running
  And PostgreSQL accepts connections
  And Backend API responds to /health
  And Frontend application loads
  Then E2E test environment is ready
```

---

## 5. Milestone 2: Authentication System

### 5.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Complete user authentication flow with JWT tokens, login/register screens, password reset.

### 5.2 E2E Scenarios

#### E2E-M2-01: User Registration Flow

```
Scenario: New user registers and accesses dashboard
  Given I am on the registration screen
  When I fill in the registration form with:
    | Field | Value |
    | Nome completo | João Silva |
    | E-mail | joao@example.com |
    | Senha | SecurePass123 |
    | Confirmar senha | SecurePass123 |
  And I check "Aceito os termos de uso"
  And I click "Criar conta"
  Then I should be redirected to the dashboard
  And I should see a welcome message

  # Database Validation
  And a user record exists in the database with email "joao@example.com"
  And the password is stored as a bcrypt hash
  And terms_accepted_at is set
```

#### E2E-M2-02: User Registration with Duplicate Email

```
Scenario: Registration fails for existing email
  Given a user exists with email "existing@example.com"
  And I am on the registration screen
  When I fill in the registration form with email "existing@example.com"
  And I click "Criar conta"
  Then I should see an error message "Este e-mail já está cadastrado"
  And I should remain on the registration screen

  # Database Validation
  And no duplicate user record is created
```

#### E2E-M2-03: User Login Flow

```
Scenario: Registered user logs in successfully
  Given a user exists with email "user@example.com" and password "ValidPass123"
  And I am on the login screen
  When I fill in:
    | Field | Value |
    | E-mail | user@example.com |
    | Senha | ValidPass123 |
  And I click "Entrar"
  Then I should be redirected to the dashboard
  And I should see the user's name in the header

  # Token Validation
  And access_token is stored in memory
  And refresh_token is stored securely
```

#### E2E-M2-04: Login with Invalid Credentials

```
Scenario: Login fails with wrong password
  Given a user exists with email "user@example.com"
  And I am on the login screen
  When I fill in email "user@example.com" and password "WrongPassword"
  And I click "Entrar"
  Then I should see a toast "E-mail ou senha incorretos"
  And I should remain on the login screen

  # Security Validation
  And no token is stored
```

#### E2E-M2-05: Remember Me Functionality

```
Scenario: Remember me extends token duration
  Given a user exists with email "user@example.com"
  And I am on the login screen
  When I check "Lembrar de mim"
  And I log in with valid credentials
  Then the refresh token should have extended expiry (30 days)

  # Database/Token Validation
  And the token expiry is 30 days from now
```

#### E2E-M2-06: Password Reset Flow

```
Scenario: User resets forgotten password
  Given a user exists with email "forgot@example.com"
  And I am on the login screen
  When I click "Esqueceu a senha?"
  And I fill in email "forgot@example.com"
  And I click "Enviar link"
  Then I should see "Se o e-mail existir, enviaremos um link de recuperação"

  # Database Validation
  And a password_reset_token record exists for the user
  And the token expires in 1 hour

  # Simulated email link click
  When I navigate to the reset link with valid token
  And I fill in new password "NewSecurePass456"
  And I confirm the password
  And I click "Redefinir senha"
  Then I should be redirected to the login screen
  And I should see "Senha alterada com sucesso"

  # Database Validation
  And the user's password_hash is updated
  And the reset token is invalidated
```

#### E2E-M2-07: User Logout Flow

```
Scenario: User logs out and session is cleared
  Given I am logged in as "user@example.com"
  And I am on the dashboard
  When I click on my user profile
  And I click "Sair"
  Then I should be redirected to the login screen
  And accessing protected routes redirects to login

  # Token Validation
  And access_token is cleared from memory
  And refresh_token is invalidated on the server
```

#### E2E-M2-08: Token Refresh on Expiry

```
Scenario: Access token is automatically refreshed
  Given I am logged in with an access token about to expire
  When I perform an authenticated action
  Then the token should be automatically refreshed
  And the action should complete successfully

  # Token Validation
  And a new access_token is stored
```

### 5.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Login screen | Gradient background, centered card, logo visible |
| Email input | Envelope icon, validation on blur |
| Password input | Lock icon, visibility toggle works |
| Remember me | Checkbox toggles correctly |
| Error states | Red border on invalid fields, error messages display |
| Loading state | Button shows spinner during submission |

---

## 6. Milestone 3: Core Data Models & Categories

### 6.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Category CRUD API, Categories screen with grid layout, Icon/Color pickers.

### 6.2 E2E Scenarios

#### E2E-M3-01: Create Category Flow

```
Scenario: User creates a new expense category
  Given I am logged in
  And I navigate to the categories screen
  When I click "Nova Categoria"
  And I fill in the category form:
    | Field | Value |
    | Nome | Alimentação |
    | Tipo | Despesa |
  And I select icon "utensils"
  And I select color "#F59E0B"
  And I click "Salvar"
  Then I should see the category "Alimentação" in the grid
  And the category should display the utensils icon
  And the category should have color #F59E0B

  # Database Validation
  And a category record exists with:
    | name | Alimentação |
    | type | expense |
    | icon | utensils |
    | color | #F59E0B |
    | owner_type | user |
```

#### E2E-M3-02: Edit Category Flow

```
Scenario: User edits an existing category
  Given I am logged in
  And I have a category "Transporte" with icon "car"
  And I navigate to the categories screen
  When I hover over the "Transporte" card
  And I click the edit button
  And I change the name to "Mobilidade"
  And I change the icon to "bus"
  And I click "Salvar"
  Then I should see "Mobilidade" in the grid
  And the category should display the bus icon

  # Database Validation
  And the category record is updated with name "Mobilidade"
```

#### E2E-M3-03: Delete Category Flow

```
Scenario: User deletes a category with no transactions
  Given I am logged in
  And I have a category "Teste" with 0 transactions
  And I navigate to the categories screen
  When I hover over the "Teste" card
  And I click the delete button
  And I confirm the deletion
  Then the "Teste" category should not appear in the grid
  And I should see a success toast "Categoria excluída"

  # Database Validation
  And no category record exists with name "Teste"
```

#### E2E-M3-04: Delete Category with Transactions

```
Scenario: User deletes a category with existing transactions
  Given I am logged in
  And I have a category "Food" with 5 transactions
  And I navigate to the categories screen
  When I hover over the "Food" card
  And I click the delete button
  Then I should see a confirmation dialog
  And the dialog should warn "5 transações ficarão sem categoria"
  When I confirm the deletion
  Then the "Food" category should not appear in the grid

  # Database Validation
  And the 5 transactions have category_id set to NULL
```

#### E2E-M3-05: Categories Display Statistics

```
Scenario: Category cards show transaction count and total
  Given I am logged in
  And I have a category "Alimentação" with:
    | Transactions | 15 |
    | Period Total | -R$ 2.500,00 |
  And I navigate to the categories screen
  Then the "Alimentação" card should display:
    | Transaction count | 15 transações |
    | Period total | R$ 2.500,00 |
```

#### E2E-M3-06: Category Tabs (Personal vs Group)

```
Scenario: User views personal and group categories
  Given I am logged in
  And I have 3 personal categories
  And I am member of a group with 2 categories
  And I navigate to the categories screen
  When I click tab "Minhas Categorias"
  Then I should see 3 category cards
  When I click tab "Categorias do Grupo"
  Then I should see 2 category cards
```

### 6.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Category grid | 3 cols desktop, 2 cols tablet, 1 col mobile |
| Category card | Icon, name, type badge, stats visible |
| Icon picker | Opens on click, icons searchable, selection works |
| Color picker | Shows preset colors, custom hex input works |
| Empty state | Shows CTA "Criar primeira categoria" when no categories |

---

## 7. Milestone 4: Transaction Management

### 7.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Transaction CRUD API, Transactions list with filters, Create/Edit modal, Bulk operations.

### 7.2 E2E Scenarios

#### E2E-M4-01: Create Transaction Manually

```
Scenario: User creates a new expense transaction
  Given I am logged in
  And I have a category "Alimentação"
  And I navigate to the transactions screen
  When I click "Nova Transação"
  And I fill in the transaction form:
    | Field | Value |
    | Descrição | Supermercado Extra |
    | Valor | 245,50 |
    | Data | 20/11/2025 |
    | Categoria | Alimentação |
    | Observações | Compras da semana |
  And I select type "Despesa"
  And I click "Salvar"
  Then I should see "Supermercado Extra" in the transaction list
  And the transaction should display "-R$ 245,50" in red
  And I should see a success toast "Transação criada"

  # Database Validation
  And a transaction record exists with:
    | description | Supermercado Extra |
    | amount | -245.50 |
    | date | 2025-11-20 |
    | category_id | (Alimentação ID) |
```

#### E2E-M4-02: Create Income Transaction

```
Scenario: User creates an income transaction
  Given I am logged in
  And I have a category "Salário" of type income
  And I navigate to the transactions screen
  When I click "Nova Transação"
  And I select type "Receita"
  And I fill in description "Salário Novembro"
  And I fill in value "8.500,00"
  And I select category "Salário"
  And I click "Salvar"
  Then the transaction should display "+R$ 8.500,00" in green

  # Database Validation
  And the transaction has amount 8500.00 (positive)
```

#### E2E-M4-03: Edit Transaction

```
Scenario: User edits an existing transaction
  Given I am logged in
  And I have a transaction "UBER" for -R$ 45,90
  And I navigate to the transactions screen
  When I click on the "UBER" transaction row
  And I change the description to "UBER - Trabalho"
  And I change the value to "52,00"
  And I click "Salvar"
  Then the transaction should display "UBER - Trabalho"
  And the amount should be "-R$ 52,00"

  # Database Validation
  And the transaction record is updated
```

#### E2E-M4-04: Delete Transaction

```
Scenario: User deletes a transaction
  Given I am logged in
  And I have a transaction "Compra Teste"
  And I navigate to the transactions screen
  When I click on the "Compra Teste" transaction row
  And I click "Excluir"
  And I confirm the deletion
  Then "Compra Teste" should not appear in the list
  And I should see a success toast

  # Database Validation
  And no transaction exists with description "Compra Teste"
```

#### E2E-M4-05: Filter Transactions by Date Range

```
Scenario: User filters transactions by date
  Given I am logged in
  And I have transactions in November and October 2025
  And I navigate to the transactions screen
  When I set the date filter to "01/11/2025" to "30/11/2025"
  Then I should only see November transactions
  And the totals should reflect only November data
```

#### E2E-M4-06: Filter Transactions by Category

```
Scenario: User filters by category
  Given I am logged in
  And I have 5 transactions in "Alimentação"
  And I have 3 transactions in "Transporte"
  And I navigate to the transactions screen
  When I select category filter "Alimentação"
  Then I should see exactly 5 transactions
  And all transactions should have the Alimentação icon
```

#### E2E-M4-07: Filter Transactions by Type

```
Scenario: User filters expenses only
  Given I am logged in
  And I have 10 expense transactions
  And I have 2 income transactions
  And I navigate to the transactions screen
  When I click the "Despesas" segment filter
  Then I should see exactly 10 transactions
  And all amounts should be displayed in red
```

#### E2E-M4-08: Search Transactions

```
Scenario: User searches transactions by description
  Given I am logged in
  And I have transactions including "UBER TRIP" and "UBER EATS"
  And I navigate to the transactions screen
  When I type "UBER" in the search field
  Then I should see both "UBER TRIP" and "UBER EATS"
  And other transactions should be filtered out
```

#### E2E-M4-09: Bulk Delete Transactions

```
Scenario: User deletes multiple transactions at once
  Given I am logged in
  And I have 10 transactions
  And I navigate to the transactions screen
  When I select 3 transactions using checkboxes
  And I click "Excluir selecionados"
  And I confirm the bulk deletion
  Then 7 transactions should remain in the list
  And I should see toast "3 transações excluídas"

  # Database Validation
  And only 7 transaction records exist
```

#### E2E-M4-10: Bulk Categorize Transactions

```
Scenario: User categorizes multiple transactions at once
  Given I am logged in
  And I have 5 uncategorized transactions
  And I have a category "Outros"
  And I navigate to the transactions screen
  When I select the 5 uncategorized transactions
  And I click "Categorizar"
  And I select category "Outros"
  And I click "Aplicar"
  Then all 5 transactions should display the "Outros" category icon

  # Database Validation
  And all 5 transactions have category_id set to "Outros" ID
```

#### E2E-M4-11: Transactions Grouped by Date

```
Scenario: Transactions display grouped by date
  Given I am logged in
  And I have transactions on 2025-11-20 and 2025-11-19
  And I navigate to the transactions screen
  Then I should see date headers for both dates
  And each date header should show the daily total
  And transactions should be grouped under their respective dates
```

### 7.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Filter bar | Search, date range, category, type filters visible |
| Transaction row | Icon, description, notes, amount, date visible |
| Date grouping | Sticky headers, daily totals display |
| Bulk selection | Checkboxes appear, selection count shows |
| Empty state | Shows "Nenhuma transação encontrada" with CTA |
| Loading state | Skeleton rows during load |

---

## 8. Milestone 5: Transaction Import

### 8.1 E2E Eligibility: **ELIGIBLE**

**Goals**: File upload API, CSV/OFX parsing, Duplicate detection, 2-step wizard UI.

### 8.2 E2E Scenarios

#### E2E-M5-01: Import CSV File - Complete Flow

```
Scenario: User imports transactions from CSV file
  Given I am logged in
  And I have a category "Transporte" with rule ".*UBER.*"
  And I navigate to the transactions screen
  When I click "Importar"
  And I upload a CSV file with 10 transactions including "UBER TRIP"
  Then I should see Step 1: Upload Preview
  And I should see 10 parsed transactions in the preview table
  And "UBER TRIP" should have "Transporte" pre-selected

  When I click "Próximo"
  Then I should see Step 2: Categorize & Confirm

  When I categorize remaining uncategorized transactions
  And I click "Importar"
  Then I should see success animation
  And I should see "10 transações importadas"

  # Database Validation
  And 10 new transaction records exist in the database
  And "UBER TRIP" transaction has category_id of "Transporte"
```

#### E2E-M5-02: Import OFX File

```
Scenario: User imports transactions from OFX file
  Given I am logged in
  And I navigate to the transactions screen
  When I click "Importar"
  And I upload an OFX file from Nubank
  Then I should see the parsed transactions in preview
  And dates should be correctly parsed
  And amounts should be correctly parsed (expenses negative)
```

#### E2E-M5-03: Duplicate Detection on Import

```
Scenario: Import detects and marks duplicate transactions
  Given I am logged in
  And I have an existing transaction:
    | date | 2025-11-20 |
    | description | UBER TRIP |
    | amount | -45.90 |
  And I navigate to the transactions screen
  When I click "Importar"
  And I upload a CSV containing the same transaction
  Then the duplicate row should be highlighted yellow
  And I should see a warning icon on the duplicate row
  And the duplicate_reason tooltip should explain why

  When I check "Ignorar duplicadas"
  And I complete the import
  Then only non-duplicate transactions are imported

  # Database Validation
  And no duplicate transaction is created
```

#### E2E-M5-04: Skip Individual Transactions on Import

```
Scenario: User excludes specific transactions from import
  Given I am logged in
  And I navigate to the import wizard
  And I upload a CSV with 5 transactions
  When I uncheck 2 transactions to exclude them
  And I complete the import
  Then I should see "3 transações importadas, 2 ignoradas"

  # Database Validation
  And only 3 new transactions exist
```

#### E2E-M5-05: Create Rule During Import

```
Scenario: User creates categorization rule from import
  Given I am logged in
  And I have a category "Delivery"
  And I navigate to the import wizard
  And I upload a CSV with multiple "IFOOD" transactions
  When I select "Delivery" for an IFOOD transaction
  And I check "Criar regra para padrão similar"
  And I complete the import
  Then a new category rule should be created for ".*IFOOD.*"

  # Database Validation
  And a category_rule exists with pattern ".*IFOOD.*" for "Delivery"
```

#### E2E-M5-06: Custom Column Mapping

```
Scenario: User maps custom CSV columns
  Given I am logged in
  And I navigate to the import wizard
  And I upload a CSV with non-standard columns
  When I select bank format "Personalizado"
  And I map columns:
    | CSV Column | Field |
    | Data Transacao | date |
    | Descricao | description |
    | Valor | amount |
  And I click preview
  Then transactions should be parsed correctly with mapped columns
```

### 8.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Drag-drop zone | Accepts CSV/OFX, shows file name after drop |
| Bank format selector | Dropdown with Nubank, Inter, Custom options |
| Preview table | Date, Description, Amount columns, row selection |
| Duplicate highlight | Yellow background, warning icon, tooltip |
| Progress indicator | Step 1/2 indicator, progress bar during upload |
| Success animation | Checkmark with confetti on completion |

---

## 9. Milestone 6: Category Rules Engine

### 9.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Rules CRUD API, Regex engine, Rules screen with drag reorder, Pattern helper UI.

### 9.2 E2E Scenarios

#### E2E-M6-01: Create Rule with Pattern Helper

```
Scenario: User creates a categorization rule using pattern helper
  Given I am logged in
  And I have a category "Transporte"
  And I navigate to the rules screen
  When I click "Nova Regra"
  And I select match type "Contém"
  And I enter pattern "UBER"
  Then I should see regex preview ".*UBER.*"

  When I select category "Transporte"
  And I click "Salvar"
  Then I should see the rule in the list
  And the rule should show pattern ".*UBER.*"

  # Database Validation
  And a category_rule record exists with pattern ".*UBER.*"
```

#### E2E-M6-02: Create Rule - Starts With

```
Scenario: User creates a "starts with" rule
  Given I am logged in
  And I have a category "Pix"
  And I navigate to the rules screen
  When I click "Nova Regra"
  And I select match type "Começa com"
  And I enter pattern "PIX"
  Then I should see regex preview "^PIX.*"

  When I save the rule
  Then the rule should be created successfully
```

#### E2E-M6-03: Create Rule - Exact Match

```
Scenario: User creates an exact match rule
  Given I am logged in
  And I have a category "Streaming"
  And I navigate to the rules screen
  When I create a rule with:
    | Match type | Exato |
    | Pattern | NETFLIX |
    | Category | Streaming |
  Then I should see regex preview "^NETFLIX$"
```

#### E2E-M6-04: Test Pattern Before Saving

```
Scenario: User tests rule pattern against existing transactions
  Given I am logged in
  And I have 5 transactions containing "UBER" in description
  And I navigate to the rules screen
  When I click "Nova Regra"
  And I enter pattern "UBER" with match type "Contém"
  And I click "Testar padrão"
  Then I should see "5 transações correspondem"
  And I should see a preview of matching transactions
```

#### E2E-M6-05: Edit Existing Rule

```
Scenario: User edits a rule pattern
  Given I am logged in
  And I have a rule with pattern ".*UBER.*"
  And I navigate to the rules screen
  When I click edit on the UBER rule
  And I change the pattern to ".*UBER.*|.*99.*"
  And I save the changes
  Then the rule should display the updated pattern

  # Database Validation
  And the rule record is updated
```

#### E2E-M6-06: Delete Rule

```
Scenario: User deletes a categorization rule
  Given I am logged in
  And I have a rule for "Streaming"
  And I navigate to the rules screen
  When I click delete on the Streaming rule
  And I confirm deletion
  Then the rule should be removed from the list

  # Database Validation
  And no rule record exists for Streaming
```

#### E2E-M6-07: Reorder Rules by Priority

```
Scenario: User reorders rules by drag and drop
  Given I am logged in
  And I have 3 rules with priorities 1, 2, 3
  And I navigate to the rules screen
  When I drag rule 3 to position 1
  Then the rules should be reordered visually
  And I should see a save confirmation

  # Database Validation
  And rule priorities are updated in database
```

#### E2E-M6-08: Rule Priority Affects Matching

```
Scenario: Higher priority rule wins on conflict
  Given I am logged in
  And I have a rule ".*DELIVERY.*" → "Delivery" with priority 10
  And I have a rule ".*IFOOD.*" → "Food" with priority 20
  And I import a transaction "IFOOD DELIVERY"
  Then the transaction should be categorized as "Food" (higher priority)
```

### 9.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Match type dropdown | Contains, Starts with, Exact, Custom regex |
| Pattern input | Text input with validation |
| Regex preview | Shows generated regex in real-time |
| Test results | Shows matching transactions and count |
| Drag handles | Visible on hover, cursor changes |
| Priority indicator | Shows rule order/priority |

---

## 10. Milestone 7: Goals (Spending Limits)

### 10.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Goals CRUD API, Progress calculation, Goals screen with progress cards.

### 10.2 E2E Scenarios

#### E2E-M7-01: Create Spending Limit

```
Scenario: User creates a monthly spending limit
  Given I am logged in
  And I have an expense category "Alimentação"
  And I navigate to the goals screen
  When I click "Novo Limite"
  And I select category "Alimentação"
  And I enter limit amount "2.000,00"
  And I check "Alertar quando exceder"
  And I click "Salvar"
  Then I should see a goal card for "Alimentação"
  And the card should show limit "R$ 2.000,00"

  # Database Validation
  And a goal record exists with amount 2000.00
```

#### E2E-M7-02: Goal Progress Display

```
Scenario: Goal shows current spending progress
  Given I am logged in
  And I have a goal for "Alimentação" with limit R$ 2.000
  And I have spent R$ 1.500 in "Alimentação" this month
  When I navigate to the goals screen
  Then the "Alimentação" goal should show:
    | Current | R$ 1.500,00 |
    | Limit | R$ 2.000,00 |
    | Progress | 75% |
  And the progress bar should be green
  And the progress bar should be 75% filled
```

#### E2E-M7-03: Goal Over Limit Display

```
Scenario: Goal displays over-limit warning
  Given I am logged in
  And I have a goal for "Entretenimento" with limit R$ 500
  And I have spent R$ 650 in "Entretenimento" this month
  When I navigate to the goals screen
  Then the "Entretenimento" goal should show:
    | Current | R$ 650,00 |
    | Limit | R$ 500,00 |
    | Progress | 130% |
  And the progress bar should be red
  And the card should have a pulsing glow effect
```

#### E2E-M7-04: Edit Spending Limit

```
Scenario: User edits a spending limit
  Given I am logged in
  And I have a goal for "Transporte" with limit R$ 800
  And I navigate to the goals screen
  When I click edit on the "Transporte" goal
  And I change the limit to "1.000,00"
  And I save changes
  Then the goal should display new limit "R$ 1.000,00"
  And the progress percentage should be recalculated
```

#### E2E-M7-05: Delete Spending Limit

```
Scenario: User deletes a spending limit
  Given I am logged in
  And I have a goal for "Teste"
  And I navigate to the goals screen
  When I click delete on the "Teste" goal
  And I confirm deletion
  Then "Teste" goal should not appear in the list

  # Database Validation
  And no goal record exists for "Teste"
```

#### E2E-M7-06: Goal Updates After Transaction

```
Scenario: Goal progress updates after adding transaction
  Given I am logged in
  And I have a goal for "Alimentação" with limit R$ 1.000
  And current spending is R$ 500
  When I create a new transaction in "Alimentação" for R$ 200
  And I navigate to the goals screen
  Then the "Alimentação" goal should show current R$ 700
  And progress should be 70%
```

### 10.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Goal card | Category icon, name, progress bar, amounts |
| Progress bar | Green < 100%, red >= 100% |
| Amount display | "R$ X / R$ Y" format |
| Percentage label | Shows percentage with % symbol |
| Over-limit effect | Pulsing red glow animation |
| Empty state | Shows CTA "Criar primeiro limite" |

---

## 11. Milestone 8: Dashboard & Analytics

### 11.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Dashboard APIs, Metric cards, Donut chart, Line chart, Recent transactions.

### 11.2 E2E Scenarios

#### E2E-M8-01: Dashboard Loads All Sections

```
Scenario: Dashboard displays all sections on load
  Given I am logged in
  And I have transactions, categories, and goals set up
  When I navigate to the dashboard
  Then I should see 4 metric cards (Balance, Income, Expenses, Savings)
  And I should see the spending trends chart
  And I should see the category breakdown donut
  And I should see recent transactions list
  And I should see goals progress section
```

#### E2E-M8-02: Metric Cards Display Correct Values

```
Scenario: Metric cards show correct calculated values
  Given I am logged in
  And I have this month's data:
    | Income | R$ 8.500 |
    | Expenses | R$ 6.230 |
  When I navigate to the dashboard
  Then the "Receitas" card should show "R$ 8.500,00"
  And the "Despesas" card should show "R$ 6.230,00"
  And the "Economia" card should show "R$ 2.270,00"

  # API Validation
  And GET /dashboard/summary returns matching values
```

#### E2E-M8-03: Period Selector Changes Data

```
Scenario: Changing period updates all dashboard data
  Given I am logged in
  And I have data for November and October 2025
  And I am on the dashboard with "Este Mês" selected
  When I select "Mês Passado"
  Then all metric cards should update with October data
  And the charts should update with October data
  And recent transactions should show October transactions
```

#### E2E-M8-04: Trend Comparison Display

```
Scenario: Metric cards show comparison with previous period
  Given I am logged in
  And income increased 5.2% vs last month
  And expenses decreased 3.1% vs last month
  When I view the dashboard
  Then "Receitas" card should show "+5,2%" with green arrow
  And "Despesas" card should show "-3,1%" with green arrow
```

#### E2E-M8-05: Category Breakdown Chart

```
Scenario: Donut chart displays expense breakdown by category
  Given I am logged in
  And I have expenses in 3 categories:
    | Alimentação | R$ 1.500 |
    | Transporte | R$ 800 |
    | Outros | R$ 300 |
  When I view the dashboard
  Then the donut chart should show 3 segments
  And each segment should match category colors
  And hovering should show category name and amount
```

#### E2E-M8-06: Spending Trends Chart

```
Scenario: Line chart shows income/expense trends
  Given I am logged in
  And I have 3 months of transaction data
  When I view the dashboard
  Then the trends chart should show 3 data points
  And income line should be green
  And expense line should be red
```

#### E2E-M8-07: Recent Transactions Section

```
Scenario: Dashboard shows recent transactions
  Given I am logged in
  And I have 20 transactions this month
  When I view the dashboard
  Then I should see up to 8 recent transactions
  And clicking "Ver todas" navigates to transactions screen
```

#### E2E-M8-08: Goals Alert Banner

```
Scenario: Alert banner shows when goals are over limit
  Given I am logged in
  And I have a goal over 100% limit
  When I view the dashboard
  Then I should see an alert banner
  And the banner should mention the over-limit goal
  And clicking the banner navigates to goals screen
```

#### E2E-M8-09: Dashboard Refresh

```
Scenario: User can manually refresh dashboard data
  Given I am logged in
  And I am on the dashboard
  When I click the refresh button
  Then I should see loading indicators
  And all sections should reload with fresh data
  And "Última atualização" timestamp should update
```

### 11.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Greeting | Shows "Olá, {name}" |
| Period selector | Dropdown with Este Mês, Mês Passado |
| Metric cards | 4 cards in row, proper formatting |
| Trends chart | Line/area chart renders, tooltips work |
| Donut chart | Segments render, legend visible |
| Refresh button | Visible, triggers reload |
| Last updated | Timestamp displays |

---

## 12. Milestone 9: Groups & Collaboration

### 12.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Groups CRUD, Invitation flow, Member management, Group dashboard.

### 12.2 E2E Scenarios

#### E2E-M9-01: Create Group

```
Scenario: User creates a new group
  Given I am logged in
  And I navigate to the groups screen
  When I click "Novo Grupo"
  And I enter group name "Família Silva"
  And I click "Criar"
  Then I should see "Família Silva" in the groups list
  And I should be marked as admin

  # Database Validation
  And a group record exists with name "Família Silva"
  And a group_member record exists with role "admin"
```

#### E2E-M9-02: Invite Member to Group

```
Scenario: Admin invites a new member
  Given I am logged in as admin of group "Família"
  And I navigate to the group detail screen
  When I click "Convidar Membro"
  And I enter email "maria@example.com"
  And I click "Enviar convite"
  Then I should see "Convite enviado para maria@example.com"
  And I should see pending invite in the members list

  # Database Validation
  And a group_invite record exists with status "pending"
  And the invite expires in 7 days
```

#### E2E-M9-03: Accept Group Invitation

```
Scenario: Invited user accepts invitation
  Given a user "maria@example.com" exists
  And "maria@example.com" has a pending invite to "Família"
  And I am logged in as "maria@example.com"
  When I navigate to the invitation link
  Then I should see group invitation details

  When I click "Aceitar convite"
  Then I should be added to the "Família" group
  And I should see the group in my groups list

  # Database Validation
  And group_member record exists for "maria@example.com"
  And invite status is "accepted"
```

#### E2E-M9-04: View Group Dashboard

```
Scenario: Member views group dashboard
  Given I am a member of group "Família" with 3 members
  And the group has shared expenses
  When I navigate to the group detail screen
  And I click "Dashboard" tab
  Then I should see total group expenses
  And I should see spending breakdown by member
  And I should see spending breakdown by category
```

#### E2E-M9-05: View Group Transactions

```
Scenario: Member views group transactions
  Given I am a member of group "Família"
  And the group has transactions from multiple members
  When I navigate to the group detail screen
  And I click "Transações" tab
  Then I should see transactions from all members
  And each transaction should show the member name
  And I can filter by member
```

#### E2E-M9-06: Admin Changes Member Role

```
Scenario: Admin promotes member to admin
  Given I am admin of group "Família"
  And "maria@example.com" is a member (not admin)
  When I navigate to the Members tab
  And I click on Maria's member card
  And I change role to "Admin"
  Then Maria should now be marked as admin

  # Database Validation
  And group_member role is updated to "admin"
```

#### E2E-M9-07: Admin Removes Member

```
Scenario: Admin removes a member from group
  Given I am admin of group "Família"
  And "pedro@example.com" is a member
  When I navigate to the Members tab
  And I click remove on Pedro's card
  And I confirm removal
  Then Pedro should not appear in the members list

  # Database Validation
  And group_member record is deleted for Pedro
```

#### E2E-M9-08: Member Leaves Group

```
Scenario: Member voluntarily leaves group
  Given I am a member (not admin) of group "Amigos"
  When I navigate to the group detail screen
  And I click "Sair do grupo"
  And I confirm leaving
  Then I should be redirected to groups list
  And "Amigos" should not appear in my groups

  # Database Validation
  And my group_member record is deleted
```

#### E2E-M9-09: Group Categories

```
Scenario: Admin creates group category
  Given I am admin of group "Família"
  When I navigate to the group Categories tab
  And I create a new category "Mercado"
  Then the category should appear in group categories
  And all group members should see this category

  # Database Validation
  And category has owner_type "group"
```

### 12.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Groups list | Cards with name, member count, role badge |
| Group detail | Tabs: Dashboard, Transações, Categorias, Membros |
| Member avatars | Display in header, show count |
| Admin badge | Visible on admin members |
| Invite modal | Email input, send button |
| Pending invites | Shows in members tab with status |

---

## 13. Milestone 10: Settings & User Profile

### 13.1 E2E Eligibility: **ELIGIBLE**

**Goals**: Profile API, Settings screen, Password change, Account deletion.

### 13.2 E2E Scenarios

#### E2E-M10-01: View User Profile

```
Scenario: User views their profile information
  Given I am logged in as "joao@example.com"
  And my name is "João Silva"
  When I navigate to the settings screen
  Then I should see my name "João Silva"
  And I should see my email "joao@example.com"
  And I should see my preferences
```

#### E2E-M10-02: Update Profile Name

```
Scenario: User updates their name
  Given I am logged in with name "João Silva"
  And I navigate to the settings screen
  When I click edit on the profile section
  And I change name to "João Santos Silva"
  And I click "Salvar"
  Then my name should display as "João Santos Silva"
  And I should see success toast

  # Database Validation
  And user record has name "João Santos Silva"
```

#### E2E-M10-03: Update Date Format Preference

```
Scenario: User changes date format preference
  Given I am logged in
  And my date format is "DD/MM/YYYY"
  And I navigate to the settings screen
  When I change date format to "YYYY-MM-DD"
  And I save preferences
  Then dates throughout the app should display in YYYY-MM-DD format

  # Database Validation
  And user record has date_format "YYYY-MM-DD"
```

#### E2E-M10-04: Update Number Format Preference

```
Scenario: User changes number format preference
  Given I am logged in
  And my number format is "1.234,56" (BR)
  And I navigate to the settings screen
  When I change number format to "1,234.56" (US)
  And I save preferences
  Then numbers should display in US format
```

#### E2E-M10-05: Toggle Notification Preferences

```
Scenario: User disables email notifications
  Given I am logged in
  And email notifications are enabled
  And I navigate to the settings screen
  When I toggle off "Notificações por e-mail"
  Then the toggle should be off
  And I should see changes saved

  # Database Validation
  And user record has email_notifications = false
```

#### E2E-M10-06: Change Password

```
Scenario: User changes their password
  Given I am logged in with password "OldPass123"
  And I navigate to the settings screen
  When I click "Alterar senha"
  And I enter current password "OldPass123"
  And I enter new password "NewSecurePass456"
  And I confirm new password "NewSecurePass456"
  And I click "Salvar"
  Then I should see success toast "Senha alterada"

  # Validation
  And I can log in with new password "NewSecurePass456"
  And I cannot log in with old password "OldPass123"
```

#### E2E-M10-07: Change Password - Wrong Current Password

```
Scenario: Password change fails with wrong current password
  Given I am logged in
  And I navigate to change password
  When I enter wrong current password "WrongPass"
  And I submit the form
  Then I should see error "Senha atual incorreta"
  And password should not be changed
```

#### E2E-M10-08: Delete All Transactions

```
Scenario: User deletes all their transactions
  Given I am logged in
  And I have 50 transactions
  And I navigate to the settings screen
  When I click "Excluir todas as transações"
  And I enter my password
  And I type "DELETE_ALL_TRANSACTIONS" to confirm
  And I click "Excluir"
  Then I should see "50 transações excluídas"
  And my transaction list should be empty

  # Database Validation
  And no transaction records exist for my user
```

#### E2E-M10-09: Delete Account

```
Scenario: User deletes their account permanently
  Given I am logged in as "delete@example.com"
  And I navigate to the settings screen
  When I click "Excluir conta"
  Then I should see a danger modal with warnings

  When I enter my password
  And I type "DELETE" to confirm
  And I click "Excluir conta permanentemente"
  Then I should be logged out
  And I should be redirected to login screen

  # Database Validation
  And no user record exists for "delete@example.com"
  And no related data exists (transactions, categories, etc.)
```

### 13.3 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Settings sections | Profile, Preferências, Notificações, Dados |
| Toggle switches | Work correctly, save on change |
| Change password modal | Three password fields, validation |
| Delete account modal | Danger styling, requires password + confirmation |
| Confirmation input | Requires exact text to enable button |

---

## 14. Milestone 11: Polish & MVP Completion

### 14.1 E2E Eligibility: **PARTIALLY ELIGIBLE**

**Justification**: Some M11 tasks are infrastructure (Docker config, backup) and don't require E2E tests. Navigation and UX polish items are E2E eligible.

### 14.2 E2E Eligible Items

| Task | E2E Eligible | Reason |
|------|--------------|--------|
| M11-I1: Production Docker | No | Infrastructure |
| M11-I2: Database Backup | No | Infrastructure |
| M11-B1: Rate Limiting | Yes | Affects user experience |
| M11-B2: Request Logging | No | Backend only |
| M11-B3: OpenAPI Docs | No | Documentation |
| M11-F1: Sidebar Navigation | Yes | User navigation |
| M11-F2: Bottom Navigation | Yes | Mobile navigation |
| M11-F3: Toast System | Yes | User feedback |
| M11-F4: Error Handling | Yes | User experience |
| M11-F5: Offline Detection | Yes | User experience |
| M11-F6: Responsive Audit | Yes | Multi-device |
| M11-F7: Accessibility | Yes | Compliance |

### 14.3 E2E Scenarios

#### E2E-M11-01: Sidebar Navigation (Desktop)

```
Scenario: User navigates using desktop sidebar
  Given I am logged in on a desktop viewport
  When I view the dashboard
  Then I should see the sidebar navigation
  And the sidebar should show: Dashboard, Transações, Categorias, Regras, Metas, Grupos, Configurações

  When I click "Transações" in the sidebar
  Then I should navigate to /transactions
  And "Transações" should be highlighted as active
```

#### E2E-M11-02: Sidebar Collapse/Expand

```
Scenario: User collapses and expands sidebar
  Given I am logged in on desktop
  And the sidebar is expanded (260px)
  When I click the collapse button
  Then the sidebar should collapse to 72px
  And only icons should be visible

  When I click the expand button
  Then the sidebar should expand to 260px
  And labels should be visible again
```

#### E2E-M11-03: Bottom Navigation (Mobile)

```
Scenario: User navigates using mobile bottom nav
  Given I am logged in on a mobile viewport (375px)
  When I view the dashboard
  Then I should see bottom navigation bar
  And I should see icons for: Home, Transações, +, Metas, Mais

  When I tap "Transações"
  Then I should navigate to /transactions
```

#### E2E-M11-04: Toast Notifications

```
Scenario: Success toast displays and auto-dismisses
  Given I am logged in
  When I create a new transaction successfully
  Then I should see a success toast "Transação criada"
  And the toast should have a green indicator
  And the toast should auto-dismiss after 5 seconds
```

#### E2E-M11-05: Error Toast on API Failure

```
Scenario: Error toast displays on server error
  Given I am logged in
  And the API returns a 500 error
  When I try to save a transaction
  Then I should see an error toast "Algo deu errado. Tente novamente"
  And the toast should have a red indicator
```

#### E2E-M11-06: Offline Detection

```
Scenario: Offline banner appears when connection lost
  Given I am logged in
  When I lose network connection
  Then I should see an offline banner "Você está offline"
  And some features should be disabled

  When I regain connection
  Then the banner should disappear
  And features should be re-enabled
```

#### E2E-M11-07: Rate Limiting Feedback

```
Scenario: User sees rate limit message on too many requests
  Given I am on the login screen
  When I submit 6 login attempts within 1 minute
  Then I should see toast "Muitas tentativas. Aguarde X segundos"
  And the login button should be temporarily disabled
```

#### E2E-M11-08: Responsive Layout - Tablet

```
Scenario: Application displays correctly on tablet
  Given I am logged in on a tablet viewport (768px)
  When I view the dashboard
  Then metric cards should display in 2 columns
  And the sidebar should be collapsed by default

  When I view categories
  Then the grid should display in 2 columns
```

#### E2E-M11-09: Responsive Layout - Mobile

```
Scenario: Application displays correctly on mobile
  Given I am logged in on a mobile viewport (375px)
  When I view the dashboard
  Then metric cards should stack vertically
  And charts should be full width
  And bottom navigation should be visible

  When I view categories
  Then the grid should display in 1 column
```

#### E2E-M11-10: Accessibility - Keyboard Navigation

```
Scenario: User can navigate entire app with keyboard
  Given I am logged in
  When I press Tab repeatedly
  Then focus should move through interactive elements
  And focus indicators should be visible

  When I press Enter on a focused button
  Then the button action should execute
```

#### E2E-M11-11: Accessibility - Screen Reader

```
Scenario: Screen reader can read all content
  Given I am logged in
  Then all interactive elements should have ARIA labels
  And all images should have alt text
  And heading hierarchy should be correct
  And form fields should be properly labeled
```

#### E2E-M11-12: Accessibility - Color Contrast

```
Scenario: All text meets contrast requirements
  Given I am on any screen
  Then all text should meet WCAG AA contrast ratio (4.5:1)
  And all interactive elements should have visible focus states
```

### 14.4 UI Validation Checklist

| Element | Validation |
|---------|------------|
| Sidebar (desktop) | 260px expanded, 72px collapsed, proper icons |
| Bottom nav (mobile) | Fixed at bottom, 5 items, proper highlighting |
| Toast notifications | Appear, proper colors, auto-dismiss |
| Offline banner | Appears/disappears with connectivity |
| Skip link | First focusable element |
| Focus indicators | Visible on all interactive elements |

---

## 15. Test Data Strategy

### 15.1 Test User Accounts

| User | Email | Role | Purpose |
|------|-------|------|---------|
| Test User 1 | `e2e-user1@test.com` | User | Primary test account |
| Test User 2 | `e2e-user2@test.com` | User | Second user for group tests |
| Test Admin | `e2e-admin@test.com` | User | Admin role in groups |
| Delete Test | `e2e-delete@test.com` | User | Account deletion tests |

### 15.2 Test Data Sets

| Data Set | Contents | Purpose |
|----------|----------|---------|
| Categories | 5 expense + 2 income categories | Category tests, transaction categorization |
| Transactions | 50 transactions across 2 months | List, filter, import tests |
| Rules | 3 categorization rules | Auto-categorization tests |
| Goals | 2 under limit + 1 over limit | Goal progress tests |
| Groups | 1 group with 3 members | Collaboration tests |

### 15.3 Test File Assets

| File | Format | Contents | Purpose |
|------|--------|----------|---------|
| `test-import.csv` | CSV | 20 transactions, Nubank format | Import tests |
| `test-import-duplicates.csv` | CSV | Contains duplicates | Duplicate detection |
| `test-import.ofx` | OFX | 15 transactions | OFX import tests |
| `test-import-custom.csv` | CSV | Non-standard columns | Column mapping |

---

## 16. Validation Checklist

### 16.1 Per-Milestone Sign-Off

Before marking a milestone as complete, all E2E scenarios must pass:

| Milestone | E2E Scenarios | Required Pass Rate |
|-----------|---------------|-------------------|
| M1 | Infrastructure checks only | 100% |
| M2 | 8 scenarios | 100% |
| M3 | 6 scenarios | 100% |
| M4 | 11 scenarios | 100% |
| M5 | 6 scenarios | 100% |
| M6 | 8 scenarios | 100% |
| M7 | 6 scenarios | 100% |
| M8 | 9 scenarios | 100% |
| M9 | 9 scenarios | 100% |
| M10 | 9 scenarios | 100% |
| M11 | 12 scenarios | 100% |

### 16.2 Cross-Cutting Concerns

Each milestone should also validate:

- [ ] No console errors during test execution
- [ ] No memory leaks detected
- [ ] Response times < 3 seconds for all API calls
- [ ] No accessibility violations (axe-core)
- [ ] No broken images or assets

### 16.3 Sign-Off Template

```
Milestone: M_
Date: ___________
Tester: ___________

E2E Scenarios: ___/___  passed
UI Validation: [ ] Complete
Database Validation: [ ] Complete
Performance: [ ] Acceptable

Notes:
_________________________________

Approved: [ ] Yes [ ] No
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | QA Team | Initial document |

---

*--- End of Document ---*
