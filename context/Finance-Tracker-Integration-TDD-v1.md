Finance Tracker

**Integration Technical Design Document**

Frontend-Backend Integration Specification

Version 1.0 \| November 2025

*MVP Implementation Guide*

  ------------------------- ------------------------------------------
  **Document Type**         Integration Technical Design Specification

  **Application**           Finance Tracker - Personal Finance
                            Management

  **Architecture**          REST API - Request/Response Pattern

  **Currency**              BRL (Brazilian Real) - Single Currency

  **Language**              Portuguese (pt-BR) - Single Language

  **Related Documents**     Frontend UI Requirements v3.0, Backend TDD
                            v6.0

  **Status**                MVP - Ready for Implementation
  ------------------------- ------------------------------------------

Table of Contents

1\. Introduction

2\. Architecture Overview

3\. Authentication Integration

4\. Dashboard Integration

5\. Transactions Integration

6\. Categories Integration

7\. Category Rules Integration

8\. Goals (Spending Limits) Integration

9\. Groups Integration

10\. Settings & Profile Integration

11\. Global Error Handling

12\. Data Transformation Reference

13\. State Management Patterns

14\. Implementation Checklist

1\. Introduction

1.1 Document Purpose

This Integration Technical Design Document (Integration TDD) serves as
the authoritative reference for implementing the connection between the
Finance Tracker frontend UI and backend API. It provides
screen-by-screen mapping of every user interaction to its corresponding
API endpoint, including request/response formats, data transformations,
loading states, and error handling strategies.

1.2 Intended Audience

- Frontend Developers: Understanding which endpoints to call for each UI
  component

- Backend Developers: Understanding how endpoints will be consumed and
  what data formats are expected

- QA Engineers: Understanding integration points for testing

- Technical Leads: Reviewing implementation completeness

1.3 MVP Scope Alignment

This document aligns with the MVP scope defined in both Frontend UI
Requirements v3.0 and Backend TDD v6.0. Key MVP constraints that affect
integration:

- Authentication: Email/password only (no social auth)

- Currency: BRL only (no currency conversion or selection)

- Language: Portuguese (pt-BR) only (no i18n)

- Goals: Monthly spending limits only (no savings goals)

- Theme: Light mode only (no dark mode)

- Data Export: Not available in MVP

- Account Deletion: Immediate (no grace period)

2\. Architecture Overview

2.1 Communication Pattern

The Finance Tracker uses a REST API architecture with standard HTTP
request/response patterns. There is no WebSocket or real-time
synchronization. All data updates are achieved through explicit API
calls triggered by user actions or navigation events.

2.2 API Base Configuration

  ---------------------- ---------------------------------------------
       **Property**                        **Value**

         Base URL              https://api.financetracker.com/v1

       Content-Type                    application/json

      Authentication                 Bearer {access_token}

       Date Format                   ISO 8601 (YYYY-MM-DD)

     Timestamp Format           ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)

         Currency               BRL (implicit, no field needed)
  ---------------------- ---------------------------------------------

2.3 Data Refresh Strategy

Data freshness is maintained through explicit refresh mechanisms:

  ------------------ ------------------------- ------------------------
     **Trigger**             **Scope**             **User Action**

  Screen Navigation    Refresh data for new           Automatic
                              screen           

   Pull-to-Refresh    Refresh current screen        Mobile gesture
                               data            

    Refresh Button    Refresh current screen         Button click
                               data            

   Form Submission     Refresh affected data     Automatic after save

    Filter/Period     Fetch new filtered data         Automatic
        Change                                 

     Return from       Refresh if stale (\>5          Automatic
      Background               min)            
  ------------------ ------------------------- ------------------------

2.4 Request Headers

Standard headers for all authenticated requests:

> Authorization: Bearer {access_token}
>
> Content-Type: application/json
>
> Accept: application/json
>
> X-Request-ID: {uuid} (optional, for tracing)

3\. Authentication Integration

3.1 Login Screen Integration

3.1.1 Screen-to-Endpoint Mapping

  ----------------- ----------------- ----------------- -----------------
   **UI Element**      **Action**       **Endpoint**       **Method**

  Login Form Submit    User clicks       /auth/login          POST
                       \'Entrar\'                       

   Forgot Password  User clicks link     Navigate to           N/A
        Link                            forgot screen   

   Create Account   User clicks link     Navigate to           N/A
        Link                           register screen  
  ----------------- ----------------- ----------------- -----------------

3.1.2 Login Request/Response

**Request Payload:**

> { \"email\": \"user@example.com\", \"password\": \"\*\*\*\*\*\*\*\*\",
> \"remember_me\": true }

**Success Response (200):**

> { \"access_token\": \"eyJhbG\...\", \"refresh_token\": \"dGhpcy\...\",
> \"user\": { \"id\": \"uuid\", \"email\": \"\...\", \"name\": \"\...\"
> } }

3.1.3 Frontend Field Mapping

  ----------------- ----------------- ----------------- -----------------
   **Form Field**     **API Field**    **Validation**   **Error Message**

    E-mail input          email        Required, valid  Por favor, insira
                                           format       um e-mail válido

     Senha input        password       Required, min 8  A senha deve ter
                                            chars         pelo menos 8
                                                           caracteres

     Lembrar-me        remember_me         Boolean             N/A
      checkbox                                          
  ----------------- ----------------- ----------------- -----------------

3.1.4 Post-Login Actions

1.  Store access_token in memory (not localStorage for security)

2.  Store refresh_token securely (httpOnly cookie preferred, or secure
    storage)

3.  Store user object in application state

4.  Navigate to Dashboard screen

5.  Initialize token refresh timer (refresh at token_expiry - 1 minute)

3.1.5 Error Handling

  ----------- ---------------------- ----------------------------------
    **HTTP        **Error Code**               **UI Action**
    Code**                           

      401      INVALID_CREDENTIALS     Show toast: \'E-mail ou senha
                                                incorretos\'

      429          RATE_LIMITED       Show toast: \'Muitas tentativas.
                                            Aguarde X segundos\'

      400        VALIDATION_ERROR      Show inline field errors from
                                              response.details

      500          SERVER_ERROR        Show toast: \'Algo deu errado.
                                             Tente novamente\'
  ----------- ---------------------- ----------------------------------

3.2 Registration Screen Integration

3.2.1 Request/Response

**Request Payload:**

> { \"email\": \"user@example.com\", \"name\": \"João Silva\",
> \"password\": \"\*\*\*\*\*\*\*\*\", \"terms_accepted\": true }

**Success Response (201):**

> { \"access_token\": \"eyJhbG\...\", \"refresh_token\": \"dGhpcy\...\",
> \"user\": { \"id\": \"uuid\", \... } }

3.2.2 Frontend Field Mapping

  ----------------- ----------------- ----------------------------------
   **Form Field**     **API Field**             **Validation**

    Nome completo         name              Required, min 2 chars

       E-mail             email          Required, valid email format

        Senha           password            Required, min 8 chars

   Confirmar senha   (frontend only)      Must match password field

   Terms checkbox    terms_accepted              Must be true
  ----------------- ----------------- ----------------------------------

3.2.3 Error Handling

  ----------- ---------------------- ----------------------------------
    **HTTP        **Error Code**               **UI Action**
    Code**                           

      409          EMAIL_EXISTS       Show inline error: \'Este e-mail
                                            já está cadastrado\'

      400       TERMS_NOT_ACCEPTED     Show inline error: \'Você deve
                                            aceitar os termos\'

      400        VALIDATION_ERROR      Show inline field errors from
                                              response.details
  ----------- ---------------------- ----------------------------------

3.3 Password Reset Flow

3.3.1 Forgot Password

**Endpoint:**

> POST /auth/forgot-password

**Request:**

> { \"email\": \"user@example.com\" }

**Response (always 200):**

> { \"message\": \"If email exists, reset link sent\" }

**Note:** Always returns 200 to prevent email enumeration. Show success
message regardless of whether email exists.

3.3.2 Reset Password

**Endpoint:**

> POST /auth/reset-password

**Request:**

> { \"token\": \"reset_token_from_email_link\", \"new_password\":
> \"\*\*\*\*\*\*\*\*\" }

Token is extracted from URL query parameter when user clicks email link.

3.4 Token Refresh Integration

**Endpoint:**

> POST /auth/refresh

**Request:**

> { \"refresh_token\": \"dGhpcy\...\" }

**Implementation Strategy:**

1.  Set timer to refresh token 1 minute before expiry

2.  On 401 response from any endpoint, attempt token refresh

3.  If refresh fails, redirect to login screen

4.  Queue failed requests and retry after successful refresh

3.5 Logout Integration

**Endpoint:**

> POST /auth/logout

**Request:**

> { \"refresh_token\": \"dGhpcy\...\" }

**Post-Logout Actions:**

1.  Clear access_token from memory

2.  Clear refresh_token from storage

3.  Clear all application state/cache

4.  Navigate to Login screen

4\. Dashboard Integration

4.1 Dashboard Data Loading Strategy

The Dashboard requires multiple API calls to populate all sections.
These should be executed in parallel for optimal performance.

4.1.1 Required API Calls on Load

  -------------------- -------------------- -------------- -------------
      **Dashboard          **Endpoint**      **Priority**   **Parallel
       Section**                                              Group**

      Metric Cards             GET               High         Group 1
                        /dashboard/summary                 

    Spending Trends            GET              Medium        Group 1
         Chart          /dashboard/trends                  

   Category Breakdown    GET /categories        Medium        Group 1

  Recent Transactions   GET /transactions       Medium        Group 1

     Goals Progress         GET /goals          Medium        Group 1

     Alerts Banner             GET               Low          Group 2
                        /dashboard/alerts                  
  -------------------- -------------------- -------------- -------------

4.2 Period Selector Integration

The period selector affects multiple dashboard components. When changed,
refresh all data with new period parameters.

  ---------------------- ---------------------------------------------
     **UI Selection**                  **API Parameter**

         Este Mês                      period=this_month

       Mês Passado                     period=last_month
  ---------------------- ---------------------------------------------

4.3 Metric Cards Integration

4.3.1 Endpoint Details

**Endpoint:**

> GET /dashboard/summary?period=this_month

**Response:**

> { \"total_balance\": 15420.50, \"total_income\": 8500.00,
> \"total_expenses\": -6230.00, \"net_savings\": 2270.00, \"period\": {
> \"start\": \"2025-11-01\", \"end\": \"2025-11-30\" }, \"comparison\":
> { \"income_change_pct\": 5.2, \"expense_change_pct\": -3.1 } }

4.3.2 Data Mapping to UI Cards

  ----------------- ----------------- ----------------------------------
   **Card Title**     **API Field**           **Display Format**

     Saldo Total      total_balance    R\$ 15.420,50 (Brazilian format)

      Receitas        total_income       R\$ 8.500,00 (green, success
                                                    color)

      Despesas       total_expenses    R\$ 6.230,00 (red, error color,
                                                show absolute)

      Economia         net_savings       R\$ 2.270,00 (color based on
                                              positive/negative)
  ----------------- ----------------- ----------------------------------

4.3.3 Trend Indicator Mapping

  ---------------------- ---------------------- ----------------------
      **API Field**           **Display**           **Color/Icon**

  income_change_pct \> 0 +5.2% vs mês anterior  success-500, arrow up

  income_change_pct \< 0 -5.2% vs mês anterior  error-500, arrow down

  income_change_pct = 0    0% vs mês anterior    gray-500, horizontal
                                                        arrow
  ---------------------- ---------------------- ----------------------

4.4 Spending Trends Chart Integration

**Endpoint:**

> GET /dashboard/trends?period=3months

**Response:**

> { \"data_points\": \[ { \"date\": \"2025-09-01\", \"income\": 8200.00,
> \"expenses\": 5800.00 }, { \"date\": \"2025-10-01\", \"income\":
> 8400.00, \"expenses\": 6100.00 }, { \"date\": \"2025-11-01\",
> \"income\": 8500.00, \"expenses\": 6230.00 } \] }

**Chart Library Recommendation:** Recharts or Victory for React. Map
data_points array directly to chart data series.

4.5 Category Breakdown (Donut Chart) Integration

**Endpoint:**

> GET /categories?startDate=2025-11-01&endDate=2025-11-30

**Response:**

> \[ { \"id\": \"uuid\", \"name\": \"Alimentação\", \"color\":
> \"#F59E0B\", \"icon\": \"utensils\", \"type\": \"expense\",
> \"transaction_count\": 45, \"period_total\": -1850.00 }, \... \]

**Data Transformation for Chart:**

- Filter to expense categories only (type === \'expense\')

- Convert period_total to absolute values for chart segments

- Calculate percentage for each category

- Use color field for segment fill color

4.6 Recent Transactions Integration

**Endpoint:**

> GET /transactions?limit=8&startDate=2025-11-01&endDate=2025-11-30

Display as transaction list. \'Ver todas\' link navigates to full
Transactions screen with current period filters applied.

4.7 Goals Progress Integration

**Endpoint:**

> GET /goals

**Response:**

> \[ { \"id\": \"uuid\", \"category_id\": \"uuid\", \"amount\": 2000.00,
> \"notify_over_limit\": true, \"current_amount\": 1850.00,
> \"percentage\": 92.5, \"status\": \"on_track\" }, \... \]

**Progress Bar Color Logic:**

- percentage \< 100: success-500 (green)

- percentage \>= 100: error-500 (red) with pulsing glow effect

4.8 Alerts Banner Integration

**Endpoint:**

> GET /dashboard/alerts

**Response:**

> { \"upcoming_recurring\": \[\...\], \"goals_over_limit\": \[ {
> \"goal_id\": \"uuid\", \"name\": \"Alimentação\", \"percentage\":
> 115.5 } \], \"uncategorized_count\": 12 }

**Alert Display Logic:**

- Show banner if goals_over_limit.length \> 0 OR uncategorized_count \>
  0

- Banner style: warning-50 background, dismissible

- Click action: Navigate to relevant screen (Goals or Transactions)

4.9 Dashboard Loading States

  ---------------------- ---------------------- ----------------------
      **Component**         **Initial Load**       **Refresh Load**

       Metric Cards         4 skeleton cards       Semi-transparent
                                                 overlay with spinner

          Charts           Skeleton rectangle       Fade + reload
                                                      animation

     Transaction List       5 skeleton rows     Inline spinner at top

          Goals             2 skeleton cards       Individual card
                                                       spinners
  ---------------------- ---------------------- ----------------------

5\. Transactions Integration

5.1 Transaction List Screen

5.1.1 Initial Load Endpoint

**Endpoint:**

> GET
> /transactions?page=1&limit=20&startDate=2025-11-01&endDate=2025-11-30&groupByDate=true

**Response (grouped):**

> { \"data\": \[ { \"date\": \"2025-11-20\", \"transactions\": \[\...\],
> \"daily_total\": -245.50 }, \... \], \"pagination\": { \"page\": 1,
> \"limit\": 20, \"total\": 127, \"total_pages\": 7 }, \"totals\": {
> \"income_total\": 8500.00, \"expense_total\": -6230.00, \"net_total\":
> 2270.00 } }

5.1.2 Filter Bar to Query Parameter Mapping

  ----------------- ----------------- ---------------------------------------------
    **Filter UI**    **Query Param**                   **Example**

    Search input         search                        search=UBER

     Date Range        startDate,        startDate=2025-11-01&endDate=2025-11-30
                         endDate      

     Categories      categoryIds\[\]   categoryIds\[\]=uuid1&categoryIds\[\]=uuid2
       (multi)                        

    Type segment          type                type=expense (or income, all)
  ----------------- ----------------- ---------------------------------------------

5.1.3 Period Shortcuts Mapping

  ---------------------- ---------------------------------------------
      **UI Option**                  **Query Parameters**

         Este Mês               startDate={first day of current
                          month}&endDate={last day of current month}

       Mês Passado               startDate={first day of last
                            month}&endDate={last day of last month}
  ---------------------- ---------------------------------------------

5.2 Create Transaction

5.2.1 Endpoint Details

**Endpoint:**

> POST /transactions

**Request:**

> { \"date\": \"2025-11-20\", \"description\": \"Supermercado Extra\",
> \"amount\": -245.50, \"category_id\": \"uuid-or-null\", \"notes\":
> \"Compras da semana\" }

**Important:** Amount must be negative for expenses, positive for
income. Frontend should handle sign based on transaction type selection.

5.2.2 Form Field Mapping

  ----------------- ----------------- ----------------------------------
   **Form Field**     **API Field**             **Transform**

      Descrição        description       Direct map, trim whitespace

     Valor (R\$)         amount       Parse BR format, negate if expense
                                                     type

        Data              date         Convert DD/MM/YYYY to YYYY-MM-DD

      Categoria        category_id      UUID from select, null if not
                                                   selected

     Observações          notes           Direct map, null if empty
  ----------------- ----------------- ----------------------------------

5.2.3 Post-Create Actions

1.  Close modal

2.  Show success toast: \'Transação criada com sucesso\'

3.  Refresh transaction list (maintain current filters)

4.  Optimistic UI: Add transaction to list immediately, remove on error

5.3 Edit Transaction

**Endpoint:**

> PATCH /transactions/{id}

Request body contains only changed fields. Response returns full updated
transaction object.

5.4 Delete Transaction

**Endpoint:**

> DELETE /transactions/{id}

**UI Flow:**

1.  User clicks delete button on transaction row/modal

2.  Show confirmation dialog: \'Excluir esta transação?\'

3.  On confirm: Optimistically remove from list with fade animation

4.  Call DELETE endpoint

5.  On error: Restore transaction to list, show error toast

5.5 Bulk Operations

5.5.1 Bulk Delete

**Endpoint:**

> POST /transactions/bulk-delete

**Request:**

> { \"transaction_ids\": \[\"uuid1\", \"uuid2\", \"uuid3\"\] }

**Response:**

> { \"deleted_count\": 3 }

5.5.2 Bulk Categorize

**Endpoint:**

> POST /transactions/bulk-categorize

**Request:**

> { \"transaction_ids\": \[\"uuid1\", \"uuid2\"\], \"category_id\":
> \"category-uuid\" }

**Response:**

> { \"updated_count\": 2 }

5.6 Transaction Import Flow (2-Step Wizard)

5.6.1 Step 1: Upload & Preview

**Endpoint:**

> POST /transactions/upload (multipart/form-data)

**Form Data Fields:**

  ----------------- ----------------- ----------------------------------
      **Field**         **Type**               **Description**

        file              File            CSV or OFX file (max 10MB)

     bank_format         String           \'nubank\', \'inter\', or
                                                  \'custom\'

   column_mapping    JSON (optional)  Required if bank_format=\'custom\'

     date_format    String (optional) \'DD/MM/YYYY\', \'MM/DD/YYYY\', or
                                                \'YYYY-MM-DD\'
  ----------------- ----------------- ----------------------------------

**Response:**

> { \"upload_id\": \"uuid\", \"parsed_transactions\": \[ { \"index\": 0,
> \"date\": \"2025-11-20\", \"description\": \"UBER \*TRIP\",
> \"amount\": -45.90, \"suggested_category_id\": \"uuid-or-null\",
> \"is_duplicate\": false, \"duplicate_reason\": null } \],
> \"duplicate_count\": 3, \"total_count\": 127 }

5.6.2 Preview Table UI Mapping

  ----------------------- ----------------- ----------------------------------
       **API Field**      **Table Column**          **Display Logic**

           date                 Data               Format as DD/MM/YYYY

        description           Descrição      Direct display, truncate if long

          amount                Valor           R\$ format, color by sign

       is_duplicate           Row style      Yellow background + warning icon
                                                         if true

     duplicate_reason          Tooltip        Show on hover of warning icon

   suggested_category_id      Categoria     Pre-select in dropdown if not null
  ----------------------- ----------------- ----------------------------------

5.6.3 Step 2: Categorize & Confirm

**Endpoint:**

> POST /transactions/upload/confirm

**Request:**

> { \"upload_id\": \"uuid-from-step-1\", \"skip_duplicates\": true,
> \"transactions\": \[ { \"index\": 0, \"category_id\":
> \"uuid-or-null\", \"include\": true }, { \"index\": 1,
> \"category_id\": null, \"include\": false } \], \"new_rules\": \[ {
> \"pattern\": \".\*UBER.\*\", \"category_id\": \"transport-uuid\" } \]
> }

**Response:**

> { \"imported_count\": 124, \"skipped_count\": 3, \"rules_created\": 1
> }

5.6.4 Post-Import UI Actions

1.  Show success animation (checkmark with confetti)

2.  Display summary: \'X transações importadas, Y ignoradas\'

3.  Show options: \'Ver Transações\' (navigate to list) or \'Importar
    Outro\' (reset wizard)

4.  Refresh transaction list in background

6\. Categories Integration

6.1 Categories List

**Endpoint:**

> GET /categories?startDate=2025-11-01&endDate=2025-11-30

**Response:**

> \[ { \"id\": \"uuid\", \"name\": \"Alimentação\", \"color\":
> \"#F59E0B\", \"icon\": \"utensils\", \"owner_type\": \"user\",
> \"owner_id\": \"user-uuid\", \"type\": \"expense\",
> \"transaction_count\": 45, \"period_total\": -1850.00 }, \... \]

6.1.1 Tab Filtering

  ---------------------------------- ----------------------------------
               **Tab**                        **Filter Logic**

          Minhas Categorias             owner_type === \'user\' AND
                                         owner_id === currentUserId

         Categorias do Grupo          owner_type === \'group\' (filter
                                             by user\'s groups)
  ---------------------------------- ----------------------------------

6.2 Create Category

**Endpoint:**

> POST /categories

**Request:**

> { \"name\": \"Transporte\", \"color\": \"#EF4444\", \"icon\": \"car\",
> \"type\": \"expense\", \"owner_type\": \"user\", \"owner_id\":
> \"current-user-uuid\" }

6.2.1 Form Field Mapping

  ----------------- ----------------- ----------------------------------
   **Form Field**     **API Field**               **Notes**

        Nome              name              Max 50 chars, required

   Tipo (segment)         type            \'expense\' or \'income\'

     Icon picker          icon              Icon identifier string

    Color picker          color               Hex format with \#

     (implicit)        owner_type      \'user\' for personal, \'group\'
                                             if creating in group

     (implicit)         owner_id      Current user ID or selected group
                                                      ID
  ----------------- ----------------- ----------------------------------

6.3 Edit Category

**Endpoint:**

> PATCH /categories/{id}

Same fields as create. Only send changed fields.

6.4 Delete Category

**Endpoint:**

> DELETE /categories/{id}

**Confirmation Dialog:**

\'Excluir categoria? X transações ficarão sem categoria.\' (X =
transaction_count from category data)

7\. Category Rules Integration

7.1 Rules List

**Endpoint:**

> GET /category-rules

**Response:**

> \[ { \"id\": \"uuid\", \"pattern\": \".\*UBER.\*\", \"category_id\":
> \"uuid\", \"owner_type\": \"user\", \"owner_id\": \"uuid\",
> \"priority\": 10, \"enabled\": true, \"created_at\":
> \"2025-11-01T10:00:00Z\" }, \... \]

7.2 Create Rule (with UI Helper)

The frontend provides a UI helper that generates regex patterns from
user-friendly options.

7.2.1 Match Type to Regex Conversion

  ----------------- ----------------- ----------------------------------
  **UI Match Type**  **User Input**   **Generated Regex (sent to API)**

       Contém             UBER                    .\*UBER.\*

     Começa com            PIX                     \^PIX.\*

        Exato            NETFLIX                 \^NETFLIX\$

        Regex        (IFOOD\|RAPPI)             (IFOOD\|RAPPI)
    personalizado                     
  ----------------- ----------------- ----------------------------------

7.2.2 Request Format

**Endpoint:**

> POST /category-rules

**Request:**

> { \"pattern\": \".\*UBER.\*\", \"category_id\": \"transport-uuid\",
> \"priority\": 10, \"owner_type\": \"user\", \"owner_id\":
> \"current-user-uuid\" }

7.3 Test Pattern

**Endpoint:**

> POST /category-rules/test

**Request:**

> { \"pattern\": \".\*UBER.\*\" }

**Response:**

> { \"matching_transactions\": \[ { \"id\": \"uuid\", \"description\":
> \"UBER \*TRIP\", \"date\": \"2025-11-20\", \"amount\": -45.90 } \],
> \"match_count\": 23 }

Display matching transactions in preview area (max 5 shown). Show total
match_count.

7.4 Reorder Rules

**Endpoint:**

> PATCH /category-rules/reorder

**Request:**

> { \"order\": \[ { \"id\": \"rule-uuid-1\", \"priority\": 10 }, {
> \"id\": \"rule-uuid-2\", \"priority\": 9 }, { \"id\": \"rule-uuid-3\",
> \"priority\": 8 } \] }

Triggered after drag-and-drop reorder. Higher priority = checked first.

8\. Goals (Spending Limits) Integration

MVP supports only monthly spending limits tied to categories. No savings
goals or custom periods.

8.1 Goals List

**Endpoint:**

> GET /goals

**Response:**

> \[ { \"id\": \"uuid\", \"category_id\": \"uuid\", \"amount\": 2000.00,
> \"notify_over_limit\": true, \"current_amount\": 1850.00,
> \"percentage\": 92.5, \"status\": \"on_track\", \"created_at\":
> \"2025-11-01T10:00:00Z\" }, \... \]

8.1.1 Card Display Mapping

  ----------------- ----------------- ----------------------------------
    **API Field**    **UI Element**           **Display Logic**

     category_id       Icon + Name        Lookup category by ID for
                                                  icon/name

       amount         Limit amount     \'R\$ 2.000,00\' (monthly limit)

   current_amount    Progress amount   \'R\$ 1.850,00 / R\$ 2.000,00\'

     percentage     Progress bar fill  Width % of bar, capped visual at
                                                     100%

       status         Progress bar    on_track = green, over_limit = red
                          color       
  ----------------- ----------------- ----------------------------------

8.2 Create Spending Limit

**Endpoint:**

> POST /goals

**Request:**

> { \"category_id\": \"uuid\", \"amount\": 2000.00,
> \"notify_over_limit\": true }

8.2.1 Form Field Mapping

  ---------------------- ---------------------- ----------------------
      **Form Field**         **API Field**            **Notes**

    Categoria (select)        category_id         Required, expense
                                                   categories only

       Limite (R\$)              amount            Parse BR format,
                                                   always positive

  Alertar quando exceder   notify_over_limit       Boolean toggle,
                                                     default true
  ---------------------- ---------------------- ----------------------

8.3 Goal Progress Detail

**Endpoint:**

> GET /goals/{id}/progress

**Response:**

> { \"goal_id\": \"uuid\", \"current_amount\": 1850.00,
> \"limit_amount\": 2000.00, \"percentage\": 92.5, \"status\":
> \"on_track\", \"remaining\": 150.00, \"period_end\": \"2025-11-30\" }

9\. Groups Integration

9.1 Groups List

**Endpoint:**

> GET /groups

**Response:**

> { \"data\": \[ { \"id\": \"uuid\", \"name\": \"Família Silva\",
> \"member_count\": 3, \"user_role\": \"admin\", \"created_at\":
> \"2025-10-01T10:00:00Z\" } \] }

9.2 Create Group

**Endpoint:**

> POST /groups

**Request:**

> { \"name\": \"Família Silva\" }

Creator is automatically assigned admin role.

9.3 Group Detail View

**Endpoint:**

> GET /groups/{id}

Returns full group details with members array.

9.4 Group Invitation Flow

9.4.1 Send Invitation

**Endpoint:**

> POST /groups/{id}/invite

**Request:**

> { \"email\": \"newmember@example.com\" }

**Response:**

> { \"invite_id\": \"uuid\", \"status\": \"pending\", \"expires_at\":
> \"2025-11-27T10:00:00Z\" }

Admin only. Invitation expires after 7 days.

9.4.2 Accept Invitation

**Endpoint:**

> POST /groups/invites/{token}/accept

Token extracted from invitation email link. User must be logged in with
matching email.

9.4.3 Manage Pending Invitations

  --------------------------- ---------------------------------------- --------------------
          **Action**                        **Endpoint**                    **Method**

         List pending                 GET /groups/{id}/invites                 GET

         Resend email                           POST                           POST
                               /groups/{id}/invites/{inviteId}/resend  

         Cancel invite         DELETE /groups/{id}/invites/{inviteId}         DELETE
  --------------------------- ---------------------------------------- --------------------

9.5 Member Management

  ---------------------- ---------------------------------- -----------
        **Action**                  **Endpoint**             **Auth**

       Change role                     PATCH                   Admin
                           /groups/{id}/members/{userId}    

      Remove member                    DELETE                  Admin
                           /groups/{id}/members/{userId}    

       Leave group           DELETE /groups/{id}/leave        Member
  ---------------------- ---------------------------------- -----------

9.6 Group Dashboard

**Endpoint:**

> GET /groups/{id}/dashboard?period=this_month

**Response:**

> { \"total_expenses\": -12500.00, \"spending_by_member\": \[ {
> \"user_id\": \"uuid\", \"name\": \"João\", \"amount\": -5200.00 } \],
> \"spending_by_category\": \[ { \"category_id\": \"uuid\", \"name\":
> \"Alimentação\", \"amount\": -3500.00 } \], \"period\": { \"start\":
> \"2025-11-01\", \"end\": \"2025-11-30\" } }

9.7 Group Transactions

**Endpoint:**

> GET /groups/{id}/transactions?member_id=uuid&page=1&limit=20

Same query parameters as /transactions, plus optional member_id filter.
Each transaction includes user object with id and name.

10\. Settings & Profile Integration

10.1 Get User Profile

**Endpoint:**

> GET /users/me

**Response:**

> { \"id\": \"uuid\", \"email\": \"user@example.com\", \"name\": \"João
> Silva\", \"date_format\": \"DD/MM/YYYY\", \"number_format\":
> \"1.234,56\", \"first_day_of_week\": \"sunday\",
> \"email_notifications\": true, \"goal_alerts\": true,
> \"recurring_reminders\": true, \"terms_accepted_at\":
> \"2025-10-01T10:00:00Z\", \"created_at\": \"2025-10-01T10:00:00Z\" }

10.2 Update Profile

**Endpoint:**

> PATCH /users/me

**Request (partial):**

> { \"name\": \"João Santos Silva\", \"date_format\": \"DD/MM/YYYY\",
> \"email_notifications\": false }

10.2.1 Settings Field Mapping

  ---------------------- ---------------------- ----------------------
     **Settings UI**         **API Field**         **Valid Values**

      Nome completo               name          String, max 100 chars

     Formato de data          date_format            DD/MM/YYYY,
                                                MM/DD/YYYY, YYYY-MM-DD

     Formato numérico        number_format          1.234,56 (BR),
                                                    1,234.56 (US)

  Primeiro dia da semana   first_day_of_week        sunday, monday

     Notificações por     email_notifications          Boolean
          e-mail                                

    Alertas de limite         goal_alerts              Boolean

  Lembretes recorrentes   recurring_reminders          Boolean
  ---------------------- ---------------------- ----------------------

10.3 Change Password

**Endpoint:**

> POST /users/me/password

**Request:**

> { \"current_password\": \"\*\*\*\*\*\*\*\*\", \"new_password\":
> \"\*\*\*\*\*\*\*\*\" }

**Error 401:** \'Senha atual incorreta\'

10.4 Delete All Transactions

**Endpoint:**

> DELETE /users/me/transactions

**Request:**

> { \"password\": \"\*\*\*\*\*\*\*\*\", \"confirmation\":
> \"DELETE_ALL_TRANSACTIONS\" }

**UI Flow:**

1.  Show danger modal with warning text

2.  Require password entry

3.  Require typing \'DELETE_ALL_TRANSACTIONS\' to confirm

4.  Show success toast: \'X transações excluídas\'

10.5 Delete Account

**Endpoint:**

> DELETE /users/me

**Request:**

> { \"password\": \"\*\*\*\*\*\*\*\*\", \"confirmation\": \"DELETE\" }

**Important:** Immediate deletion, no grace period. Clear all tokens and
navigate to login after success.

11\. Global Error Handling

11.1 Error Response Format

**All API errors follow this format:**

> { \"error\": { \"code\": \"ERROR_CODE\", \"message\": \"Human readable
> message in Portuguese\", \"details\": { \"field_name\": \[\"error1\",
> \"error2\"\] }, \"request_id\": \"uuid\" } }

11.2 HTTP Status Code Handling

  ---------- -------------- ----------------------------------------------
   **Code**   **Meaning**                **Frontend Action**

     200        Success              Process response, update UI

     201        Created      Process response, show success toast, update
                                                 list

     204       No Content    Operation successful, update UI accordingly

     400      Bad Request         Show inline validation errors from
                                            error.details

     401      Unauthorized   Attempt token refresh; if fails, redirect to
                                                login

     403       Forbidden    Show toast: \'Você não tem permissão para esta
                                                ação\'

     404       Not Found    Show toast: \'Item não encontrado\', redirect
                                               to list

     409        Conflict       Show toast with conflict details (e.g.,
                                              duplicate)

     429      Rate Limited   Show toast: \'Muitas requisições. Aguarde X
                                              segundos\'

     500      Server Error       Show toast: \'Algo deu errado. Tente
                                             novamente\'
  ---------- -------------- ----------------------------------------------

11.3 Network Error Handling

  ---------------------- ---------------------------------------------
      **Condition**                      **UI Action**

  No network connection    Show sticky banner: \'Você está offline.
                               Algumas funções indisponíveis.\'

     Request timeout     Show toast: \'Requisição demorou muito. Tente
                                         novamente.\'

   Connection restored    Remove offline banner, optionally prompt to
                                         refresh data
  ---------------------- ---------------------------------------------

11.4 Validation Error Display

When error.details contains field-specific errors, display them inline
below the corresponding form field. Use error-500 color for text and
error-50 for input background.

12\. Data Transformation Reference

12.1 Currency Formatting (BRL)

12.1.1 API to Display

  ---------------------- ---------------------- ----------------------
      **API Value**        **Display Value**         **Context**

         1234.56              R\$ 1.234,56         Positive amounts

         -1234.56           \- R\$ 1.234,56      Expenses (red color)

         1234.56            \+ R\$ 1.234,56      Income (green color)

           0.00                 R\$ 0,00             Zero values
  ---------------------- ---------------------- ----------------------

12.1.2 Input to API

User input \'1.234,56\' → Parse: remove dots, replace comma with dot →
API value: 1234.56. For expenses, negate the value based on transaction
type selection.

12.2 Date Formatting

  ---------------------- ---------------------- ----------------------
       **Context**           **API Format**        **Display Format
                                                        (BR)**

        Date only              2025-11-20             20/11/2025

       Date header             2025-11-20        Hoje, Ontem, 18 Nov
                                                         2025

        Timestamp         2025-11-20T14:30:00Z   20/11/2025 às 14:30

      Relative time       2025-11-20T14:30:00Z    Há 5 minutos, Há 2
                                                        horas
  ---------------------- ---------------------- ----------------------

12.3 Percentage Formatting

  ---------------------- ---------------------- ----------------------
      **API Value**           **Display**            **Context**

           5.25                  +5,25%         Positive trend (green)

          -3.10                  -3,10%          Negative trend (red)

           92.5                  92,5%           Progress percentage

          115.5                  115,5%            Over limit (red)
  ---------------------- ---------------------- ----------------------

13\. State Management Patterns

13.1 Recommended State Structure

> { auth: { user, accessToken, isAuthenticated }, transactions: { list,
> filters, pagination, totals, isLoading }, categories: { list,
> isLoading }, goals: { list, isLoading }, groups: { list, activeGroup,
> members, isLoading }, dashboard: { summary, trends, alerts, isLoading,
> lastUpdated }, ui: { sidebarCollapsed, activeModal, toasts } }

13.2 Optimistic Update Pattern

  ----------------- ---------------------------------------------------
      **Step**                          **Action**

   1\. User Action   User initiates action (e.g., delete transaction)

   2\. Optimistic     Immediately update UI state (remove from list)
       Update       

    3\. API Call                  Send request to backend

     4a. Success       Keep UI state, optionally show success toast

      4b. Error             Rollback UI state, show error toast
  ----------------- ---------------------------------------------------

13.3 Cache Invalidation Rules

  --------------------------- ----------------------------------------
          **Action**                   **Invalidate/Refresh**

      Create/Edit/Delete       transactions.list, dashboard.summary,
          Transaction               dashboard.trends, goals.list

      Import Transactions       transactions.list, dashboard (all),
                                   goals.list, categories (stats)

  Create/Edit/Delete Category    categories.list, transactions (for
                                         category display)

       Create/Edit Rule         category-rules.list (no transaction
                                          refresh needed)

    Create/Edit/Delete Goal         goals.list, dashboard.alerts

     Period Filter Change        All data for affected period scope
  --------------------------- ----------------------------------------

14\. Implementation Checklist

14.1 Backend Implementation Checklist

- All endpoints return consistent error format

- JWT token validation on all authenticated routes

- Rate limiting on auth endpoints (5/min)

- File upload size limit enforced (10MB)

- Duplicate detection logic for imports

- Regex pattern validation for rules

- Group authorization checks (admin vs member)

- Pagination implemented consistently

- Period filtering for dashboard endpoints

- Email service integration for invites/password reset

14.2 Frontend Implementation Checklist

- Token storage and refresh mechanism

- Global error interceptor for API responses

- Loading states for all async operations

- Optimistic updates with rollback

- Currency formatting utilities (BR format)

- Date formatting utilities (BR format)

- Pull-to-refresh on mobile

- Refresh button functionality

- Last updated timestamp display

- Empty state components for all lists

- Form validation matching backend rules

- Regex generator for rule creation UI

- File upload with drag-drop and progress

- Toast notification system

- Offline detection and banner

14.3 Integration Testing Checklist

- Authentication flow (login, register, logout, refresh)

- Password reset email flow

- Dashboard data loading and refresh

- Transaction CRUD operations

- Transaction import wizard (both steps)

- Bulk operations (delete, categorize)

- Category CRUD operations

- Rule CRUD and pattern testing

- Goal CRUD and progress tracking

- Group creation and management

- Group invitation flow

- Settings update and password change

- Account deletion

- Error handling for all failure scenarios

- Network offline/online transitions

Document Sign-Off

This Integration Technical Design Document has been reviewed and
approved by the following stakeholders:

  ----------------- ----------------- ----------------- -----------------
      **Role**          **Name**        **Signature**       **Date**

   Product Manager                                      

    Frontend Lead                                       

    Backend Lead                                        

       QA Lead                                          
  ----------------- ----------------- ----------------- -----------------

*--- End of Document ---*
