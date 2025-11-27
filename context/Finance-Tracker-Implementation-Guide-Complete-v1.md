**Finance Tracker**

Implementation Guide

Complete MVP Development Roadmap

Version 1.0 \| November 2025

  --------------------- -------------------------------------------
  **Backend Stack**     Go 1.21+, Gin, GORM, PostgreSQL

  **Frontend Stack**    React 18+, TypeScript, Vite, Tailwind CSS

  **Infrastructure**    Docker, PostgreSQL 15+, MinIO

  **Testing**           Cucumber/Godog (Backend), Playwright
                        (Frontend)

  **Total Points**      445 points across 89 tasks in 11 milestones
  --------------------- -------------------------------------------

**Milestone 1: Foundation Setup**

Establish the basic project structure, development environment, and core
infrastructure.

**1.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Working dev environment with Docker services,
                     basic API health check, React app loading

  **Total Points**   24 points

  **Dependencies**   None (starting milestone)
  ------------------ -----------------------------------------------

**1.2 Tasks**


  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M1-I1   Docker Compose Setup       Infra         3          ☐

   M1-I2   PostgreSQL                 Infra         3          ☐
           Configuration                                  

   M1-I3   MinIO Configuration        Infra         2          ☐

   M1-B1   Go Project Scaffolding    Backend        3          ☐

   M1-B2   Database Connection &     Backend        3          ☐
           Health Check                                   

   M1-B3   Cucumber Test Framework   Backend        3          ☐
           Setup                                          

   M1-F1   React Project             Frontend       3          ☐
           Scaffolding                                    

   M1-F2   Playwright Test           Frontend       2          ☐
           Framework Setup                                

   M1-F3   Design System             Frontend       2          ☐
           Foundation                                     
  --------------------------------------------------------------------

**1.3 Task Details**

**M1-I1: Docker Compose Setup**

**Domain:** Infrastructure \| Points: 3 \| Reference: Backend TDD v6.0
Section 2.2

Create Docker Compose configuration orchestrating PostgreSQL, MinIO, and
network setup for local development.

**Acceptance Criteria:**

- docker-compose.yml with PostgreSQL 15+ and MinIO services

- docker-compose.dev.yml override for development settings

- Named volumes for data persistence

- Internal network \'finance-tracker-network\' created

- Environment variables in .env.example template

- Services start with \'docker-compose up -d\'

**M1-I2: PostgreSQL Configuration**

**Domain:** Infrastructure \| Points: 3 \| Reference: Backend TDD v6.0
Section 3

Configure PostgreSQL with initial database, user, and required
extensions.

**Acceptance Criteria:**

- PostgreSQL 15+ container with health check

- init.sql creates \'finance_tracker\' database and \'app_user\'

- uuid-ossp extension installed

- Data persisted in \'postgres_data\' volume

- Port 5432 exposed for local development

**M1-I3: MinIO Configuration**

**Domain:** Infrastructure \| Points: 2 \| Reference: Backend TDD v6.0
Section 2.2

Configure MinIO as S3-compatible storage for bank file uploads.

**Acceptance Criteria:**

- MinIO container with console on port 9001

- Default bucket \'finance-tracker-uploads\' created

- Access credentials via MINIO_ROOT_USER/PASSWORD env vars

- Data persisted in \'minio_data\' volume

**M1-B1: Go Project Scaffolding**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
2

Initialize Go backend with clean architecture directory structure and
Gin HTTP server.

**Acceptance Criteria:**

- go.mod with module \'github.com/org/finance-tracker-backend\'

- Directory structure: cmd/api/,
  internal/{domain,repository,service,handler,middleware}/, config/

- Gin server starts on configurable port (default 8080)

- Configuration via environment variables with defaults

- Makefile with: run, build, test, migrate commands

- Dockerfile for production build

**BDD Test:**

> Feature: API Health Scenario: Health endpoint returns OK Given the API
> server is running When I GET \"/health\" Then status should be 200 And
> response contains \"status\": \"ok\"

**M1-B2: Database Connection & Health Check**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
3

Implement GORM database connection with pooling and health check
endpoint.

**Acceptance Criteria:**

- GORM configured with PostgreSQL driver

- Connection pool: max 25 connections, 5 min idle timeout

- GET /health includes database status

- Graceful shutdown closes connections

**BDD Test:**

> Scenario: Health check includes DB status Given API is running and
> database available When I GET \"/health\" Then response contains
> \"database\": \"connected\"

**M1-B3: Cucumber Test Framework Setup**

**Domain:** Backend \| Points: 3

Set up Godog testing framework with test database management.

**Acceptance Criteria:**

- Godog dependency installed

- features/ directory for .feature files

- steps/ directory for step definitions

- Test database setup/teardown between scenarios

- HTTP client helper for API testing

- \'make test\' runs all Cucumber tests

**M1-F1: React Project Scaffolding**

**Domain:** Frontend \| Points: 3 \| Reference: Frontend UI v3.0 Section
10.1

Initialize React 18+ project with Vite, TypeScript, and Tailwind CSS.

**Acceptance Criteria:**

- Vite + React + TypeScript template

- Tailwind CSS configured

- Directory: components/, pages/, hooks/, services/, store/, utils/

- React Router for client-side routing

- ESLint + Prettier configured

- Dev server on port 3000

**Playwright Test:**

> test(\'should load application\', async ({ page }) =\> { await
> page.goto(\'/\'); await expect(page).toHaveTitle(/Finance Tracker/);
> });

**M1-F2: Playwright Test Framework Setup**

**Domain:** Frontend \| Points: 2

Configure Playwright with multi-browser support and test fixtures.

**Acceptance Criteria:**

- Playwright installed with browser dependencies

- playwright.config.ts for Chrome, Firefox, Safari

- e2e/ directory structure

- Test fixtures for auth and API mocking

- \'npm run test:e2e\' runs tests

- HTML report generation

**M1-F3: Design System Foundation**

**Domain:** Frontend \| Points: 2 \| Reference: Frontend UI v3.0 Section
2

Implement design tokens as Tailwind configuration.

**Acceptance Criteria:**

- Color tokens: primary-50 to primary-900, semantic colors

- Typography scale: text-xs to text-5xl

- Spacing scale: space-0 to space-24

- Shadow tokens: shadow-xs to shadow-2xl

- Border radius tokens

- Inter font family loaded

**1.4 Validation Checklist**

- [ ] docker-compose up starts all services

- [ ] PostgreSQL accepts connections on 5432

- [ ] MinIO console accessible at localhost:9001

- [ ] GET /health returns 200 with database status

- [ ] Backend Cucumber tests pass

- [ ] Frontend loads at localhost:3000

- [ ] Playwright tests pass

**Milestone 2: Authentication System**

Complete user authentication: registration, login, logout, password
reset, JWT handling.

**2.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Full auth flow with JWT tokens, Login/Register
                     screens, Password reset

  **Total Points**   47 points

  **Dependencies**   Milestone 1 completed
  ------------------ -----------------------------------------------

**2.2 Tasks**

  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M2-I1   Users Table Migration      Infra         2          ☐

   M2-I2   Password Reset Tokens      Infra         2          ☐
           Table                                          

   M2-B1   User Domain Model         Backend        3          ☐

   M2-B2   POST /auth/register       Backend        5          ☐

   M2-B3   POST /auth/login          Backend        5          ☐

   M2-B4   JWT Token Service         Backend        5          ☐

   M2-B5   POST /auth/refresh        Backend        3          ☐

   M2-B6   POST /auth/logout         Backend        2          ☐

   M2-B7   POST                      Backend        3          ☐
           /auth/forgot-password                          

   M2-B8   POST                      Backend        3          ☐
           /auth/reset-password                           

   M2-F1   Button Component          Frontend       2          ☐

   M2-F2   Input Component           Frontend       2          ☐

   M2-F3   Login Screen              Frontend       5          ☐

   M2-F4   Registration Screen       Frontend       5          ☐
  --------------------------------------------------------------------

**2.3 Task Details**

**M2-B2: POST /auth/register**

**Domain:** Backend \| Points: 5 \| Reference: Backend TDD v6.0 Section
4.1.1

User registration with validation, password hashing, and JWT generation.

**Acceptance Criteria:**

- Accepts: email, name, password, terms_accepted

- Validates email format and uniqueness

- Password minimum 8 characters

- terms_accepted must be true

- Bcrypt hash with cost 12

- Returns 201 with access_token, refresh_token, user

- Returns 409 for duplicate email

- Returns 400 for validation errors

**BDD Test:**

> Feature: Registration Scenario: Successful registration When I POST
> \"/auth/register\" with: \| email \| test@example.com \| \| name \|
> Test User \| \| password \| SecurePass123 \| \| terms_accepted \| true
> \| Then status is 201 And response contains \"access_token\" Scenario:
> Duplicate email Given user exists \"existing@example.com\" When I POST
> \"/auth/register\" with email \"existing@example.com\" Then status is
> 409

**M2-B3: POST /auth/login**

**Domain:** Backend \| Points: 5 \| Reference: Backend TDD v6.0 Section
4.1.2

Authentication with rate limiting and remember_me token extension.

**Acceptance Criteria:**

- Accepts: email, password, remember_me

- Verifies bcrypt password

- Token duration: 15min default, 7 days with remember_me

- Refresh token: 7 days default, 30 days with remember_me

- Returns 401 for invalid credentials

- Rate limit: 5 attempts/minute per IP, returns 429

**BDD Test:**

> Feature: Login Scenario: Successful login Given user
> \"user@example.com\" with password \"Pass123\" When I POST
> \"/auth/login\" with credentials Then status is 200 and response has
> tokens Scenario: Invalid password Given user exists When I POST
> \"/auth/login\" with wrong password Then status is 401

**M2-F3: Login Screen**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.1.1

Full login screen with form validation, error handling, and navigation.

**Acceptance Criteria:**

- Gradient background (primary-500 to primary-700)

- Centered card with logo, \'Bem-vindo de volta\' heading

- Email input with envelope icon

- Password input with lock icon and visibility toggle

- Remember me checkbox, \'Esqueceu a senha?\' link

- \'Entrar\' button with loading state

- \'Criar conta\' link to registration

- Error toast for invalid credentials

- Redirect to /dashboard on success

**Playwright Test:**

> test.describe(\'Login Screen\', () =\> { test(\'displays all
> elements\', async ({ page }) =\> { await page.goto(\'/login\'); await
> expect(page.locator(\'\[data-testid=\"email-input\"\]\')).toBeVisible();
> await
> expect(page.locator(\'\[data-testid=\"password-input\"\]\')).toBeVisible();
> await
> expect(page.locator(\'\[data-testid=\"login-button\"\]\')).toContainText(\'Entrar\');
> }); test(\'shows error for invalid credentials\', async ({ page }) =\>
> { await page.route(\'\*\*/auth/login\', r =\> r.fulfill({ status: 401
> })); await page.goto(\'/login\'); await
> page.fill(\'\[data-testid=\"email-input\"\]\', \'user@example.com\');
> await page.fill(\'\[data-testid=\"password-input\"\]\', \'wrong\');
> await page.click(\'\[data-testid=\"login-button\"\]\'); await
> expect(page.locator(\'\[data-testid=\"error-toast\"\]\')).toContainText(\'incorretos\');
> }); test(\'redirects on success\', async ({ page }) =\> { await
> page.route(\'\*\*/auth/login\', r =\> r.fulfill({ status: 200, body:
> JSON.stringify({ access_token: \'tok\', user: {} }) })); await
> page.goto(\'/login\'); await
> page.fill(\'\[data-testid=\"email-input\"\]\', \'user@example.com\');
> await page.fill(\'\[data-testid=\"password-input\"\]\', \'Pass123\');
> await page.click(\'\[data-testid=\"login-button\"\]\'); await
> expect(page).toHaveURL(\'/dashboard\'); }); });

**2.4 Validation Checklist**

- [ ] User registration creates account and returns tokens

- [ ] Duplicate email returns 409

- [ ] Login with valid credentials returns tokens

- [ ] Invalid login returns 401

- [ ] Token refresh works

- [ ] Logout invalidates refresh token

- [ ] Password reset flow works

- [ ] Login screen matches specs

- [ ] Registration screen matches specs

- [ ] All tests pass

**Milestone 3: Core Data Models & Categories**

Categories CRUD with transaction statistics and management UI.

**3.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Category CRUD API, Categories screen with grid
                     layout, Icon/Color pickers

  **Total Points**   38 points

  **Dependencies**   Milestone 2 completed
  ------------------ -----------------------------------------------

**3.2 Tasks**

  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M3-I1   Categories Table           Infra         2          ☐
           Migration                                      

   M3-I2   Transactions Table         Infra         3          ☐
           Migration                                      

   M3-B1   Category Domain Model     Backend        3          ☐

   M3-B2   GET /categories           Backend        3          ☐

   M3-B3   POST /categories          Backend        3          ☐

   M3-B4   PATCH /categories/:id     Backend        3          ☐

   M3-B5   DELETE /categories/:id    Backend        3          ☐

   M3-F1   Card Component            Frontend       2          ☐

   M3-F2   Modal Component           Frontend       3          ☐

   M3-F3   Select/Dropdown           Frontend       3          ☐
           Component                                      

   M3-F4   Icon Picker Component     Frontend       2          ☐

   M3-F5   Color Picker Component    Frontend       2          ☐

   M3-F6   Categories List Screen    Frontend       3          ☐

   M3-F7   Category Create/Edit      Frontend       3          ☐
           Modal                                          
  --------------------------------------------------------------------

**3.3 Key Task Details**

**M3-B2: GET /categories**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
4.4.1

**Acceptance Criteria:**

- Returns user\'s categories

- Supports owner_type, owner_id for group categories

- Supports startDate, endDate for statistics

- Returns transaction_count, period_total computed fields

- Requires authentication

**BDD Test:**

> Scenario: List categories with stats Given I am authenticated And I
> have category \"Food\" with 5 transactions totaling -500 When I GET
> \"/categories?startDate=2025-11-01&endDate=2025-11-30\" Then status is
> 200 And category \"Food\" has period_total -500

**M3-F6: Categories List Screen**

**Domain:** Frontend \| Points: 3 \| Reference: Frontend UI v3.0 Section
4.4.1

**Acceptance Criteria:**

- Tabs: \'Minhas Categorias\' \| \'Categorias do Grupo\'

- Grid: 3 cols desktop, 2 cols tablet, 1 col mobile

- Card shows: icon, name, type badge, stats

- Hover shows Edit/Delete buttons

- Empty state with \'Criar Categoria\' CTA

**Playwright Test:**

> test(\'displays categories grid\', async ({ page }) =\> { await
> page.route(\'\*\*/categories\*\', r =\> r.fulfill({ status: 200, body:
> JSON.stringify(\[{ id: \'1\', name: \'Food\', type: \'expense\' }\])
> })); await page.goto(\'/categories\'); await
> expect(page.locator(\'\[data-testid=\"category-card\"\]\')).toHaveCount(1);
> });

**Milestone 4: Transaction Management**

Complete transaction CRUD, list with filtering, and bulk operations.

**4.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Transaction CRUD API, Transactions list with
                     filters, Create/Edit modal, Bulk ops

  **Total Points**   52 points

  **Dependencies**   Milestone 3 completed
  ------------------ -----------------------------------------------

**4.2 Tasks**

  ----------------------------------------------------------------------------
   **ID**  **Task**                         **Domain**   **Pts**   **Status**
  -------- ------------------------------- ------------ --------- ------------
   M4-B1   Transaction Domain Model          Backend        3          ☐

   M4-B2   GET /transactions                 Backend        5          ☐

   M4-B3   POST /transactions                Backend        3          ☐

   M4-B4   PATCH /transactions/:id           Backend        3          ☐

   M4-B5   DELETE /transactions/:id          Backend        2          ☐

   M4-B6   POST /transactions/bulk-delete    Backend        3          ☐

   M4-B7   POST                              Backend        3          ☐
           /transactions/bulk-categorize                          

   M4-F1   Currency Input Component (BRL)    Frontend       3          ☐

   M4-F2   Date Picker Component             Frontend       3          ☐

   M4-F3   Transaction Row Component         Frontend       3          ☐

   M4-F4   Filter Bar Component              Frontend       3          ☐

   M4-F5   Transactions List Screen          Frontend       5          ☐

   M4-F6   Transaction Create/Edit Modal     Frontend       5          ☐

   M4-F7   Bulk Selection & Actions          Frontend       5          ☐

   M4-F8   Empty & Loading States            Frontend       3          ☐
  ----------------------------------------------------------------------------

**4.3 Key Task Details**

**M4-B2: GET /transactions**

**Domain:** Backend \| Points: 5 \| Reference: Backend TDD v6.0 Section
4.3.1

**Acceptance Criteria:**

- Query params: startDate, endDate, categoryIds\[\], type, search, page,
  limit

- Search performs case-insensitive match on description

- groupByDate=true groups by date with daily_total

- Returns pagination and totals (income_total, expense_total, net_total)

**BDD Test:**

> Scenario: List transactions with filters Given I have transactions in
> November 2025 When I GET
> \"/transactions?startDate=2025-11-01&type=expense\" Then status is 200
> And all transactions are expenses And response has totals

**M4-F5: Transactions List Screen**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.3

**Acceptance Criteria:**

- Header with title, count, refresh and action buttons

- Filter bar: search, date range, categories, type

- Grouped by date with sticky headers

- Daily total in date header

- Transaction row: category icon, description, notes, amount

- Hover shows edit/delete

- Empty state for no results

**Playwright Test:**

> test(\'displays grouped transactions\', async ({ page }) =\> { await
> mockTransactions(page, \[ { date: \'2025-11-20\', description:
> \'UBER\', amount: -45.90 } \]); await page.goto(\'/transactions\');
> await
> expect(page.locator(\'\[data-testid=\"date-header\"\]\')).toContainText(\'20\');
> await
> expect(page.locator(\'\[data-testid=\"transaction-row\"\]\')).toHaveCount(1);
> });

**Milestone 5: Transaction Import**

2-step import wizard for CSV/OFX files with duplicate detection.

**5.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    File upload API, CSV/OFX parsing, Duplicate
                     detection, 2-step wizard UI

  **Total Points**   48 points

  **Dependencies**   Milestone 4 completed
  ------------------ -----------------------------------------------

**5.2 Tasks**

  ---------------------------------------------------------------------------
   **ID**  **Task**                        **Domain**   **Pts**   **Status**
  -------- ------------------------------ ------------ --------- ------------
   M5-I1   TransactionUpload Table           Infra         2          ☐

   M5-B1   CSV Parser Service               Backend        5          ☐

   M5-B2   OFX Parser Service               Backend        5          ☐

   M5-B3   Duplicate Detection Service      Backend        5          ☐

   M5-B4   POST /transactions/upload        Backend        5          ☐

   M5-B5   POST                             Backend        5          ☐
           /transactions/upload/confirm                          

   M5-F1   File Drop Zone Component         Frontend       3          ☐

   M5-F2   Import Preview Table             Frontend       3          ☐

   M5-F3   Step 1: Upload & Preview Modal   Frontend       5          ☐

   M5-F4   Step 2: Categorize & Confirm     Frontend       5          ☐
           Modal                                                 

   M5-F5   Import Success Animation         Frontend       3          ☐

   M5-F6   Column Mapping UI                Frontend       2          ☐
  ---------------------------------------------------------------------------

**5.3 Key Task Details**

**M5-B4: POST /transactions/upload**

**Domain:** Backend \| Points: 5 \| Reference: Backend TDD v6.0 Section
4.3.5

**Acceptance Criteria:**

- Accepts multipart/form-data with file, bank_format, column_mapping

- Parses CSV and OFX formats

- Detects duplicates (same date+description+amount or within 3 days)

- Returns upload_id, parsed_transactions with is_duplicate flag

- Suggests categories based on rules

- File size limit: 10MB

**BDD Test:**

> Scenario: Upload CSV with duplicates Given I have existing transaction
> \"UBER\" on 2025-11-20 for -45.90 When I POST \"/transactions/upload\"
> with CSV containing same transaction Then status is 200 And
> parsed_transactions\[0\].is_duplicate is true

**M5-F3: Step 1: Upload & Preview Modal**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.3.3

**Acceptance Criteria:**

- Drag-drop zone with \'ou Procurar Arquivos\'

- Bank format dropdown: Auto, Nubank, Inter, Custom

- Progress bar during upload

- Preview table with Date, Description, Amount columns

- Duplicate rows highlighted yellow with warning icon

- \'Ignorar duplicadas\' checkbox

- \'Próximo\' button to proceed

**Milestone 6: Category Rules Engine**

Regex-based auto-categorization with UI helper for pattern generation.

**6.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Rules CRUD API, Regex engine, Rules screen with
                     drag reorder, Pattern helper UI

  **Total Points**   35 points

  **Dependencies**   Milestone 5 completed
  ------------------ -----------------------------------------------

**6.2 Tasks**

  ----------------------------------------------------------------------
   **ID**  **Task**                   **Domain**   **Pts**   **Status**
  -------- ------------------------- ------------ --------- ------------
   M6-I1   CategoryRules Table          Infra         2          ☐

   M6-B1   CategoryRule Domain Model   Backend        3          ☐

   M6-B2   Regex Matching Engine       Backend        5          ☐

   M6-B3   GET /category-rules         Backend        2          ☐

   M6-B4   POST /category-rules        Backend        3          ☐

   M6-B5   POST /category-rules/test   Backend        3          ☐

   M6-B6   PATCH                       Backend        3          ☐
           /category-rules/reorder                          

   M6-F1   Rule Row with Drag Handle   Frontend       2          ☐

   M6-F2   Pattern Helper UI           Frontend       3          ☐

   M6-F3   Rules List Screen           Frontend       3          ☐

   M6-F4   Rule Create/Edit Modal      Frontend       5          ☐

   M6-F5   Drag-and-Drop Reordering    Frontend       3          ☐
  ----------------------------------------------------------------------

**6.3 Key Task Details**

**M6-F2: Pattern Helper UI**

**Domain:** Frontend \| Points: 3 \| Reference: Frontend UI v3.0 Section
4.5.2

Convert user-friendly match types to regex patterns.

**Acceptance Criteria:**

- Match type dropdown: Contém, Começa com, Exato, Regex

- Pattern input field

- Generated regex preview

- Contém \'UBER\' → .\*UBER.\*

- Começa com \'PIX\' → \^PIX.\*

- Exato \'NETFLIX\' → \^NETFLIX\$

**Playwright Test:**

> test(\'generates regex from match type\', async ({ page }) =\> { await
> page.goto(\'/rules/new\'); await
> page.selectOption(\'\[data-testid=\"match-type\"\]\', \'contains\');
> await page.fill(\'\[data-testid=\"pattern-input\"\]\', \'UBER\');
> await
> expect(page.locator(\'\[data-testid=\"regex-preview\"\]\')).toContainText(\'.\*UBER.\*\');
> });

**Milestone 7: Goals (Spending Limits)**

Monthly spending limits tied to categories with progress tracking.

**7.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Goals CRUD API, Progress calculation, Goals
                     screen with progress cards

  **Total Points**   28 points

  **Dependencies**   Milestone 4 completed
  ------------------ -----------------------------------------------

**7.2 Tasks**

  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M7-I1   Goals Table Migration      Infra         2          ☐

   M7-B1   Goal Domain Model         Backend        3          ☐

   M7-B2   GET /goals with           Backend        3          ☐
           Progress                                       

   M7-B3   POST /goals               Backend        2          ☐

   M7-B4   PATCH /goals/:id          Backend        2          ☐

   M7-B5   DELETE /goals/:id         Backend        2          ☐

   M7-B6   GET /goals/:id/progress   Backend        3          ☐

   M7-F1   Progress Bar Component    Frontend       2          ☐

   M7-F2   Goal Progress Card        Frontend       3          ☐

   M7-F3   Goals List Screen         Frontend       3          ☐

   M7-F4   Goal Create/Edit Modal    Frontend       3          ☐
  --------------------------------------------------------------------

**7.3 Key Task Details**

**M7-B2: GET /goals with Progress**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
4.6.1

**Acceptance Criteria:**

- Returns goals with current_amount, percentage, status

- Calculates current spending from transactions in current month

- status: \'on_track\' if \<100%, \'over_limit\' if \>=100%

**BDD Test:**

> Scenario: Goal shows progress Given goal for \"Food\" with limit 2000
> And transactions in \"Food\" totaling -1500 this month When I GET
> \"/goals\" Then goal has current_amount 1500 and percentage 75

**M7-F2: Goal Progress Card**

**Domain:** Frontend \| Points: 3 \| Reference: Frontend UI v3.0 Section
3.3.4

**Acceptance Criteria:**

- Category icon and name

- Progress bar: green \<100%, red \>=100%

- Amount display: \'R\$ X / R\$ Y\'

- Percentage label

- Pulsing glow when over limit

**Milestone 8: Dashboard & Analytics**

Main dashboard with metrics, charts, and analytics endpoints.

**8.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Dashboard APIs, Metric cards, Donut chart, Line
                     chart, Recent transactions

  **Total Points**   45 points

  **Dependencies**   Milestone 7 completed
  ------------------ -----------------------------------------------

**8.2 Tasks**

  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M8-B1   GET /dashboard/summary    Backend        5          ☐

   M8-B2   GET /dashboard/trends     Backend        5          ☐

   M8-B3   GET                       Backend        3          ☐
           /dashboard/recurring                           

   M8-B4   GET /dashboard/alerts     Backend        3          ☐

   M8-F1   Metric Card Component     Frontend       3          ☐

   M8-F2   Donut Chart Component     Frontend       5          ☐

   M8-F3   Line/Area Chart           Frontend       5          ☐
           Component                                      

   M8-F4   Period Selector           Frontend       2          ☐

   M8-F5   Dashboard Layout          Frontend       5          ☐
           (Desktop)                                      

   M8-F6   Dashboard Layout          Frontend       3          ☐
           (Mobile)                                       

   M8-F7   Alerts Banner             Frontend       3          ☐

   M8-F8   Pull-to-Refresh &         Frontend       3          ☐
           Refresh Button                                 
  --------------------------------------------------------------------

**8.3 Key Task Details**

**M8-B1: GET /dashboard/summary**

**Domain:** Backend \| Points: 5 \| Reference: Backend TDD v6.0 Section
4.8.1

**Acceptance Criteria:**

- Query params: period (this_month, last_month), startDate, endDate

- Returns: total_balance, total_income, total_expenses, net_savings

- Returns comparison with previous period (change percentages)

**BDD Test:**

> Scenario: Summary for current month Given income 8500 and expenses
> 6230 this month When I GET \"/dashboard/summary?period=this_month\"
> Then total_income is 8500 And total_expenses is -6230 And net_savings
> is 2270

**M8-F5: Dashboard Layout (Desktop)**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.2.1

**Acceptance Criteria:**

- Header: greeting, period selector, refresh button

- Row 1: 4 metric cards (Balance, Income, Expenses, Savings)

- Row 2: 8-col trends chart + 4-col category donut

- Row 3: Recent transactions + Goals progress

- Alerts banner when goals over limit

- Last updated timestamp

**Playwright Test:**

> test(\'dashboard loads all sections\', async ({ page }) =\> { await
> mockDashboardAPIs(page); await page.goto(\'/dashboard\'); await
> expect(page.locator(\'\[data-testid=\"metric-card\"\]\')).toHaveCount(4);
> await
> expect(page.locator(\'\[data-testid=\"trends-chart\"\]\')).toBeVisible();
> await
> expect(page.locator(\'\[data-testid=\"category-donut\"\]\')).toBeVisible();
> });

**Milestone 9: Groups & Collaboration**

Group creation, invitations, member management, and shared views.

**9.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Groups CRUD, Invitation flow, Member
                     management, Group dashboard

  **Total Points**   58 points

  **Dependencies**   Milestone 8 completed
  ------------------ -----------------------------------------------

**9.2 Tasks**

  ----------------------------------------------------------------------------
   **ID**  **Task**                         **Domain**   **Pts**   **Status**
  -------- ------------------------------- ------------ --------- ------------
   M9-I1   Groups & GroupMembers Tables       Infra         3          ☐

   M9-I2   GroupInvites Table                 Infra         2          ☐

   M9-B1   Group Domain Model                Backend        3          ☐

   M9-B2   POST /groups                      Backend        3          ☐

   M9-B3   GET /groups                       Backend        2          ☐

   M9-B4   GET /groups/:id                   Backend        2          ☐

   M9-B5   POST /groups/:id/invite           Backend        3          ☐

   M9-B6   POST                              Backend        3          ☐
           /groups/invites/:token/accept                          

   M9-B7   Member Management Endpoints       Backend        5          ☐

   M9-B8   GET /groups/:id/transactions      Backend        3          ☐

   M9-B9   GET /groups/:id/dashboard         Backend        5          ☐

   M9-F1   Groups List Screen                Frontend       3          ☐

   M9-F2   Group Detail with Tabs            Frontend       5          ☐

   M9-F3   Group Create Modal                Frontend       2          ☐

   M9-F4   Invite Member Modal               Frontend       3          ☐

   M9-F5   Members Tab                       Frontend       5          ☐

   M9-F6   Accept Invitation Screen          Frontend       3          ☐

   M9-F7   Group Dashboard Tab               Frontend       5          ☐
  ----------------------------------------------------------------------------

**9.3 Key Task Details**

**M9-B5: POST /groups/:id/invite**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
4.7.4

**Acceptance Criteria:**

- Accepts email address

- Creates invite with unique token

- Expires after 7 days

- Sends invitation email

- Admin only authorization

- Returns 409 if already member

**BDD Test:**

> Scenario: Admin invites member Given I am admin of group \"Family\"
> When I POST \"/groups/{id}/invite\" with email \"new@example.com\"
> Then status is 201 And invite has expires_at 7 days from now

**M9-F2: Group Detail with Tabs**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.7.2

**Acceptance Criteria:**

- Header: group name, member avatars, settings gear (admin)

- Tabs: Dashboard, Transações, Categorias, Membros

- Refresh button and last updated timestamp

- Admin-only features properly gated

**Milestone 10: Settings & User Profile**

User settings, preferences, password change, and account deletion.

**10.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Profile API, Settings screen with sections,
                     Password change, Account deletion

  **Total Points**   32 points

  **Dependencies**   Milestone 2 completed
  ------------------ -----------------------------------------------

**10.2 Tasks**

  ---------------------------------------------------------------------
   **ID**  **Task**                  **Domain**   **Pts**   **Status**
  -------- ------------------------ ------------ --------- ------------
   M10-B1  GET /users/me              Backend        2          ☐

   M10-B2  PATCH /users/me            Backend        3          ☐

   M10-B3  POST /users/me/password    Backend        3          ☐

   M10-B4  DELETE                     Backend        3          ☐
           /users/me/transactions                          

   M10-B5  DELETE /users/me           Backend        3          ☐

   M10-F1  Toggle Switch Component    Frontend       2          ☐

   M10-F2  Settings Screen Layout     Frontend       3          ☐

   M10-F3  Profile Section            Frontend       3          ☐

   M10-F4  Preferences Section        Frontend       3          ☐

   M10-F5  Notifications Section      Frontend       2          ☐

   M10-F6  Change Password Modal      Frontend       3          ☐

   M10-F7  Delete Account Flow        Frontend       5          ☐
  ---------------------------------------------------------------------

**10.3 Key Task Details**

**M10-B5: DELETE /users/me**

**Domain:** Backend \| Points: 3 \| Reference: Backend TDD v6.0 Section
4.2.4

**Acceptance Criteria:**

- Requires password and confirmation \'DELETE\'

- Immediately deletes all user data

- Removes from all groups

- Invalidates all tokens

- Returns 204 on success

**BDD Test:**

> Scenario: Delete account Given I am authenticated When I DELETE
> \"/users/me\" with password and confirmation Then status is 204 And
> user no longer exists

**M10-F7: Delete Account Flow**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
4.8

**Acceptance Criteria:**

- Danger button in Data & Privacy section

- Confirmation modal with warning text

- Password input required

- Type \'DELETE\' to confirm

- Redirect to login after deletion

**Playwright Test:**

> test(\'delete account requires confirmation\', async ({ page }) =\> {
> await page.goto(\'/settings\'); await
> page.click(\'\[data-testid=\"delete-account-btn\"\]\'); await
> expect(page.locator(\'\[data-testid=\"delete-modal\"\]\')).toBeVisible();
> await
> expect(page.locator(\'\[data-testid=\"confirm-delete-btn\"\]\')).toBeDisabled();
> await page.fill(\'\[data-testid=\"password-input\"\]\', \'password\');
> await page.fill(\'\[data-testid=\"confirmation-input\"\]\',
> \'DELETE\'); await
> expect(page.locator(\'\[data-testid=\"confirm-delete-btn\"\]\')).toBeEnabled();
> });

**Milestone 11: Polish & MVP Completion**

Navigation, responsive design, error handling, accessibility, and final
testing.

**11.1 Overview**

  ------------------ -----------------------------------------------
  **Deliverable**    Navigation system, Responsive audit, Error
                     handling, Accessibility, E2E tests

  **Total Points**   38 points

  **Dependencies**   All milestones completed
  ------------------ -----------------------------------------------

**11.2 Tasks**

  --------------------------------------------------------------------
   **ID**  **Task**                 **Domain**   **Pts**   **Status**
  -------- ----------------------- ------------ --------- ------------
   M11-I1  Production Docker          Infra         3          ☐
           Config                                         

   M11-I2  Database Backup Config     Infra         2          ☐

   M11-B1  API Rate Limiting         Backend        3          ☐

   M11-B2  Request Logging &         Backend        3          ☐
           Monitoring                                     

   M11-B3  OpenAPI Documentation     Backend        3          ☐

   M11-F1  Sidebar Navigation        Frontend       3          ☐
           (Desktop)                                      

   M11-F2  Bottom Navigation         Frontend       3          ☐
           (Mobile)                                       

   M11-F3  Toast Notification        Frontend       3          ☐
           System                                         

   M11-F4  Global Error Handling     Frontend       3          ☐

   M11-F5  Offline Detection         Frontend       2          ☐
           Banner                                         

   M11-F6  Responsive Design Audit   Frontend       5          ☐

   M11-F7  Accessibility Audit       Frontend       5          ☐
           (WCAG AA)                                      
  --------------------------------------------------------------------

**11.3 Key Task Details**

**M11-F1: Sidebar Navigation (Desktop)**

**Domain:** Frontend \| Points: 3 \| Reference: Frontend UI v3.0 Section
3.4.1

**Acceptance Criteria:**

- 260px expanded, 72px collapsed

- Logo area, nav items with icons

- Active state with left border

- User section at bottom

- Collapse/expand button

**Playwright Test:**

> test(\'sidebar navigation\', async ({ page }) =\> { await
> page.goto(\'/dashboard\'); await
> expect(page.locator(\'\[data-testid=\"sidebar\"\]\')).toBeVisible();
> await page.click(\'\[data-testid=\"nav-transactions\"\]\'); await
> expect(page).toHaveURL(\'/transactions\'); });

**M11-F7: Accessibility Audit (WCAG AA)**

**Domain:** Frontend \| Points: 5 \| Reference: Frontend UI v3.0 Section
7

**Acceptance Criteria:**

- All text meets 4.5:1 contrast ratio

- Focus indicators visible on all interactive elements

- Skip link as first focusable element

- Proper heading hierarchy

- ARIA labels on icon-only buttons

- Keyboard navigation works throughout

- Screen reader tested

**Playwright Test:**

> test(\'accessibility audit\', async ({ page }) =\> { await
> page.goto(\'/dashboard\'); const results = await new AxeBuilder({ page
> }).analyze(); expect(results.violations).toEqual(\[\]); });

**Appendix: Progress Summary**

**A.1 Points by Milestone**

  ------------------------- ------------- -------------- ----------- -----------
  **Milestone**              **Backend**   **Frontend**   **Infra**   **Total**

  M1: Foundation                  9             7             8          24

  M2: Authentication             29             14            4          47

  M3: Categories                 15             18            5          38

  M4: Transactions               22             30            0          52

  M5: Import                     25             21            2          48

  M6: Rules                      19             14            2          35

  M7: Goals                      15             11            2          28

  M8: Dashboard                  16             29            0          45

  M9: Groups                     29             24            5          58

  M10: Settings                  14             18            0          32

  M11: Polish                     9             24            5          38

  **TOTAL**                    **202**       **210**       **33**      **445**
  ------------------------- ------------- -------------- ----------- -----------

**A.2 Velocity Estimation**

Based on team capacity, estimate delivery using points per sprint:

- Small team (2-3 devs): \~30-40 points/week → 11-15 weeks

- Medium team (4-5 devs): \~50-70 points/week → 6-9 weeks

- Large team (6-8 devs): \~80-100 points/week → 4-6 weeks

**A.3 Critical Path**

Milestones must be completed in order due to dependencies:

- M1 → M2 → M3 → M4 → M5 → M6 (main path)

- M4 → M7 (goals depend on transactions)

- M7 → M8 (dashboard depends on goals)

- M8 → M9 (groups extend dashboard)

- M2 → M10 (settings depend on auth only)

- All → M11 (polish is final)

**A.4 Sign-Off**

  ---------------- ---------------- ---------------- ----------------
      **Role**         **Name**      **Signature**       **Date**

  Project Manager                                    

    Backend Lead                                     

   Frontend Lead                                     

      QA Lead                                        
  ---------------- ---------------- ---------------- ----------------

*--- End of Document ---*
