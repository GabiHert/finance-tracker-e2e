Finance Tracker

Backend Technical Design Document

Version 6.0 (MVP) \| November 2025

*Minimum Viable Product Scope*

**MVP Scope Notes**

This document defines the MVP (Minimum Viable Product) backend
specification. The following features are explicitly excluded from MVP:

- Social Authentication (Google, Apple) - Local auth only

- Multi-currency support - BRL only

- Push notifications - Email notifications only

- Dark mode preferences

- Data export functionality

- Avatar/profile picture upload

- Weekly summary emails

- Email verification flow

- Savings goals - Spending limits only

- Account deletion grace period - Immediate deletion

**1. Overview**

Finance Tracker is a personal and collaborative finance management
application that allows users to import bank transactions, categorize
expenses, track spending limits, and share financial insights with
groups. MVP uses BRL currency only.

**1.1 Key Features**

- Bank file import with automatic transaction parsing (CSV, OFX)

- Rule-based automatic categorization using regex patterns

- Multi-user accounts with group collaboration

- Category-based monthly spending limits

- Dashboard with analytics and trends visualization

- Email notifications for spending alerts

**2. Architecture**

**2.1 System Components**

The backend follows a layered architecture with clear separation of
concerns:

- **API Layer:** RESTful HTTP endpoints for client communication

- **Service Layer:** Business logic and transaction processing

- **Data Access Layer:** Database operations and ORM

- **External Services:** Email service for notifications

**2.2 Technology Stack (Recommended)**

- **Runtime:** Node.js with TypeScript or Go

- **Database:** PostgreSQL (relational data with JSON support)

- **Cache:** Redis (session management, rate limiting)

- **Authentication:** JWT with refresh tokens

- **File Storage:** S3-compatible storage for uploaded bank files

- **Email Service:** SendGrid, AWS SES, or similar for transactional
  emails

**3. Data Models**

The following entity-relationship model defines the core data structures
of the system.

**3.1 User**

Represents a registered user account with profile and preferences.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  email                  VARCHAR(255)       Unique, used for
                                            authentication

  name                   VARCHAR(100)       Display name

  password_hash          VARCHAR(255)       Bcrypt hashed password

  date_format            ENUM               DD/MM/YYYY, MM/DD/YYYY, or
                                            YYYY-MM-DD

  number_format          ENUM               1.234,56 (BR) or 1,234.56
                                            (US)

  first_day_of_week      ENUM               sunday or monday

  email_notifications    BOOLEAN            Email notification opt-in,
                                            default true

  goal_alerts            BOOLEAN            Spending limit alerts opt-in,
                                            default true

  recurring_reminders    BOOLEAN            Recurring expense reminders,
                                            default true

  terms_accepted_at      TIMESTAMP          When user accepted terms of
                                            service

  created_at             TIMESTAMP          Account creation timestamp

  updated_at             TIMESTAMP          Last update timestamp
  -----------------------------------------------------------------------

**3.2 Group**

Represents a collaborative group for shared financial tracking.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  name                   VARCHAR(100)       Group display name

  created_at             TIMESTAMP          Group creation timestamp

  updated_at             TIMESTAMP          Last update timestamp
  -----------------------------------------------------------------------

**3.3 GroupMember**

Junction table for user-group relationships with role management.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  group_id               UUID (FK)          Reference to Group

  user_id                UUID (FK)          Reference to User

  role                   ENUM               admin or member

  joined_at              TIMESTAMP          When user joined the group
  -----------------------------------------------------------------------

**Constraints:** UNIQUE(group_id, user_id)

**3.4 GroupInvite**

Tracks pending group invitations.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  group_id               UUID (FK)          Reference to Group

  email                  VARCHAR(255)       Invitee email address

  invited_by             UUID (FK)          Reference to User who sent
                                            invite

  status                 ENUM               pending, accepted, expired

  token                  VARCHAR(255)       Unique invitation token

  expires_at             TIMESTAMP          Invitation expiration time (7
                                            days)

  created_at             TIMESTAMP          Invite creation timestamp
  -----------------------------------------------------------------------

**3.5 Transaction**

Represents a financial transaction imported from bank data or manually
entered. All amounts in BRL.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  user_id                UUID (FK)          Owner of the transaction

  date                   DATE               Transaction date

  description            VARCHAR(500)       Merchant name or transaction
                                            description

  amount                 DECIMAL(15,2)      Amount in BRL (negative for
                                            expenses)

  type                   ENUM               expense or income (derived
                                            from amount sign)

  category_id            UUID (FK)          Reference to Category
                                            (nullable)

  notes                  TEXT               User notes (optional)

  is_recurring           BOOLEAN            Recurring expense flag
                                            (system-detected,
                                            user-editable)

  uploaded_at            TIMESTAMP          When transaction was imported
  -----------------------------------------------------------------------

**Indexes:** user_id, date, category_id, type, (user_id, date)
composite, (user_id, description) for search

**3.6 Category**

Represents a transaction category, owned by either a user or a group.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  name                   VARCHAR(50)        Category name (e.g., Food,
                                            Transport)

  color                  VARCHAR(7)         Hex color code for UI display

  icon                   VARCHAR(50)        Icon identifier for UI

  owner_type             ENUM               user or group

  owner_id               UUID               ID of owning user or group

  type                   ENUM               expense or income
  -----------------------------------------------------------------------

**3.7 CategoryRule**

Defines auto-categorization rules using regex patterns. Frontend
provides UI helpers for common patterns (contains, starts with, exact
match) that generate regex.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  category_id            UUID (FK)          Target category for matched
                                            transactions

  owner_type             ENUM               user or group

  owner_id               UUID               ID of owning user or group

  pattern                VARCHAR(255)       Regex pattern to match (e.g.,
                                            .\*UBER.\*)

  priority               INTEGER            Higher priority wins on
                                            conflicts

  enabled                BOOLEAN            Allow rules to be disabled,
                                            default true

  created_at             TIMESTAMP          Rule creation timestamp
  -----------------------------------------------------------------------

Note: Frontend converts user-friendly match types to regex: Contains
\'UBER\' → .\*UBER.\*, Starts with \'PIX\' → \^PIX.\*, Exact \'NETFLIX\'
→ \^NETFLIX\$

**3.8 Goal (Spending Limit)**

Represents monthly spending limits tied to a category. MVP supports
spending limits only.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  category_id            UUID (FK)          Target category

  amount                 DECIMAL(15,2)      Monthly limit amount in BRL

  notify_over_limit      BOOLEAN            Alert when over limit,
                                            default true

  created_at             TIMESTAMP          Goal creation timestamp

  updated_at             TIMESTAMP          Last update timestamp
  -----------------------------------------------------------------------

**3.9 PasswordResetToken**

Stores password reset tokens for secure password recovery.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key

  user_id                UUID (FK)          Reference to User

  token                  VARCHAR(255)       Unique reset token (hashed)

  expires_at             TIMESTAMP          Token expiration (1 hour from
                                            creation)

  used_at                TIMESTAMP NULL     When token was used (null if
                                            unused)

  created_at             TIMESTAMP          Token creation timestamp
  -----------------------------------------------------------------------

**3.10 TransactionUpload**

Tracks bank file upload sessions for staged import flow.

  -----------------------------------------------------------------------
  **Field**              **Type**           **Description**
  ---------------------- ------------------ -----------------------------
  id                     UUID               Primary key (upload_id)

  user_id                UUID (FK)          Reference to User

  file_name              VARCHAR(255)       Original file name

  bank_format            VARCHAR(50)        nubank, inter, custom

  column_mapping         JSONB NULL         Column mapping for custom
                                            format

  parsed_data            JSONB              Parsed transactions with
                                            metadata

  status                 ENUM               pending, confirmed, expired

  expires_at             TIMESTAMP          Session expiration (1 hour)

  created_at             TIMESTAMP          Upload timestamp
  -----------------------------------------------------------------------

**4. API Endpoints**

All endpoints follow REST conventions. Authentication required unless
noted. Responses use JSON format.

**4.1 Authentication**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**               **Description**
  ------------ -------------------------- ---------------------------------
  POST         /auth/register             Create new user account

  POST         /auth/login                Authenticate and receive JWT

  POST         /auth/logout               Invalidate refresh token

  POST         /auth/refresh              Refresh access token

  POST         /auth/forgot-password      Request password reset email

  POST         /auth/reset-password       Reset password with token
  -------------------------------------------------------------------------

**4.1.1 POST /auth/register**

**Request:** { \"email\": string, \"name\": string, \"password\":
string, \"terms_accepted\": true }

**Response (201):** { \"access_token\": string, \"refresh_token\":
string, \"user\": User }

**Validation:** terms_accepted must be true, password min 8 characters

**Errors:** 400 Validation error, 409 Email already exists

**4.1.2 POST /auth/login**

**Request:** { \"email\": string, \"password\": string, \"remember_me\":
boolean }

**Response (200):** { \"access_token\": string, \"refresh_token\":
string, \"user\": User }

**Token Duration:** access_token: 15min (default) or 7 days
(remember_me). refresh_token: 7 days or 30 days.

**Errors:** 401 Invalid credentials, 429 Rate limited

**4.1.3 POST /auth/logout**

**Request:** { \"refresh_token\": string }

**Response (200):** { \"message\": \"Logged out successfully\" }

**Behavior:** Invalidates the refresh token server-side

**4.1.4 POST /auth/refresh**

**Request:** { \"refresh_token\": string }

**Response (200):** { \"access_token\": string, \"refresh_token\":
string }

**Errors:** 401 Invalid or expired refresh token

**4.1.5 POST /auth/forgot-password**

**Request:** { \"email\": string }

**Response (200):** { \"message\": \"If email exists, reset link sent\"
}

Note: Always returns 200 to prevent email enumeration attacks.

**4.1.6 POST /auth/reset-password**

**Request:** { \"token\": string, \"new_password\": string }

**Response (200):** { \"message\": \"Password reset successful\" }

**Errors:** 400 Invalid or expired token

**4.2 User Profile**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**               **Description**
  ------------ -------------------------- ---------------------------------
  GET          /users/me                  Get current user profile

  PATCH        /users/me                  Update user profile and
                                          preferences

  POST         /users/me/password         Change password (authenticated)

  DELETE       /users/me                  Delete user account (immediate)

  DELETE       /users/me/transactions     Delete all user transactions
  -------------------------------------------------------------------------

**4.2.1 GET /users/me**

**Response (200):** Full User object with all profile and preference
fields

**4.2.2 PATCH /users/me**

**Request:** Partial User object (name, date_format, number_format,
first_day_of_week, email_notifications, goal_alerts,
recurring_reminders)

**Response (200):** Updated User object

**4.2.3 POST /users/me/password**

**Request:** { \"current_password\": string, \"new_password\": string }

**Response (200):** { \"message\": \"Password changed successfully\" }

**Errors:** 401 Current password incorrect

**4.2.4 DELETE /users/me**

**Request:** { \"password\": string, \"confirmation\": \"DELETE\" }

**Response (204):** No content - account deleted immediately

**Behavior:** Immediate deletion of all user data, no grace period

**4.2.5 DELETE /users/me/transactions**

**Request:** { \"password\": string, \"confirmation\":
\"DELETE_ALL_TRANSACTIONS\" }

**Response (200):** { \"deleted_count\": int }

**4.3 Transactions**

  --------------------------------------------------------------------------
  **Method**   **Endpoint**                    **Description**
  ------------ ------------------------------- -----------------------------
  GET          /transactions                   List transactions with
                                               filters and search

  POST         /transactions                   Create manual transaction

  PATCH        /transactions/:id               Update transaction

  DELETE       /transactions/:id               Delete transaction

  POST         /transactions/bulk-delete       Delete multiple transactions

  POST         /transactions/bulk-categorize   Categorize multiple
                                               transactions

  POST         /transactions/upload            Upload bank file for preview

  POST         /transactions/upload/confirm    Confirm and import parsed
                                               transactions
  --------------------------------------------------------------------------

**4.3.1 GET /transactions**

**Query Parameters:** startDate, endDate, categoryIds\[\] (array), type
(expense\|income\|all), search, page, limit (1-100, default 20),
groupByDate (boolean)

The \'search\' parameter performs case-insensitive partial match on
transaction description.

**Response (200):** { \"data\": \[Transaction\], \"pagination\": {
\"page\": int, \"limit\": int, \"total\": int, \"total_pages\": int },
\"totals\": { \"income_total\": decimal, \"expense_total\": decimal,
\"net_total\": decimal } }

**Grouped Response:** When groupByDate=true: { \"data\": \[{ \"date\":
date, \"transactions\": \[Transaction\], \"daily_total\": decimal }\],
\"pagination\": {\...}, \"totals\": {\...} }

**4.3.2 POST /transactions**

**Request:** { \"date\": ISO date, \"description\": string, \"amount\":
decimal, \"category_id\": uuid\|null, \"notes\": string\|null }

**Response (201):** Created Transaction object

Note: Amount should be negative for expenses, positive for income.

**4.3.3 POST /transactions/bulk-delete**

**Request:** { \"transaction_ids\": \[uuid\] }

**Response (200):** { \"deleted_count\": int }

**4.3.4 POST /transactions/bulk-categorize**

**Request:** { \"transaction_ids\": \[uuid\], \"category_id\": uuid }

**Response (200):** { \"updated_count\": int }

**4.3.5 POST /transactions/upload**

**Content-Type:** multipart/form-data

**Request:** file: File (CSV/OFX), bank_format:
\"nubank\"\|\"inter\"\|\"custom\", column_mapping?: { date: string,
description: string, amount: string }, date_format?:
\"DD/MM/YYYY\"\|\"MM/DD/YYYY\"\|\"YYYY-MM-DD\"

**Response (200):** { \"upload_id\": uuid, \"parsed_transactions\": \[{
\"index\": int, \"date\": date, \"description\": string, \"amount\":
decimal, \"suggested_category_id\": uuid\|null, \"is_duplicate\":
boolean, \"duplicate_reason\": string\|null }\], \"duplicate_count\":
int, \"total_count\": int }

Duplicate Detection: Transactions are flagged as duplicates if an
existing transaction matches same date + description + amount, or within
3 days with exact description and amount match.

The duplicate_reason field provides a human-readable explanation (e.g.,
\'Transação idêntica encontrada em 15/11/2025\').

**4.3.6 POST /transactions/upload/confirm**

**Request:** { \"upload_id\": uuid, \"skip_duplicates\": boolean,
\"transactions\": \[{ \"index\": int, \"category_id\": uuid\|null,
\"include\": boolean }\], \"new_rules\": \[{ \"pattern\": string,
\"category_id\": uuid }\] }

**Response (200):** { \"imported_count\": int, \"skipped_count\": int,
\"rules_created\": int }

**4.4 Categories**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**               **Description**
  ------------ -------------------------- ---------------------------------
  GET          /categories                List user + group categories with
                                          stats

  POST         /categories                Create category

  PATCH        /categories/:id            Update category

  DELETE       /categories/:id            Delete category
  -------------------------------------------------------------------------

**4.4.1 GET /categories**

**Query Parameters:** owner_type (optional), owner_id (optional),
startDate (optional), endDate (optional)

**Response (200):** Array of Category objects with computed fields: {
\...Category, \"transaction_count\": int, \"period_total\": decimal }

**4.4.2 POST /categories**

**Request:** { \"name\": string, \"color\": \"#XXXXXX\", \"icon\":
string, \"type\": \"expense\"\|\"income\", \"owner_type\":
\"user\"\|\"group\", \"owner_id\": uuid }

**Response (201):** Created Category object

**4.5 Category Rules**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**                   **Description**
  ------------ ------------------------------ -----------------------------
  GET          /category-rules                List all rules sorted by
                                              priority

  POST         /category-rules                Create new rule

  PATCH        /category-rules/:id            Update rule

  DELETE       /category-rules/:id            Delete rule

  POST         /category-rules/test           Test pattern matching

  PATCH        /category-rules/reorder        Batch update rule priorities
  -------------------------------------------------------------------------

**4.5.1 POST /category-rules**

**Request:** { \"pattern\": string (regex), \"category_id\": uuid,
\"priority\": int, \"owner_type\": \"user\"\|\"group\", \"owner_id\":
uuid }

**Response (201):** Created CategoryRule object

Note: Pattern is always regex. Frontend converts user selections to
regex patterns.

**4.5.2 POST /category-rules/test**

**Request:** { \"pattern\": string (regex) }

**Response (200):** { \"matching_transactions\": \[{ \"id\": uuid,
\"description\": string, \"date\": date, \"amount\": decimal }\],
\"match_count\": int }

**4.5.3 PATCH /category-rules/reorder**

**Request:** { \"order\": \[{ \"id\": uuid, \"priority\": int }\] }

**Response (200):** Updated array of CategoryRule objects

**4.6 Goals (Spending Limits)**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**               **Description**
  ------------ -------------------------- ---------------------------------
  GET          /goals                     List all spending limits with
                                          progress

  POST         /goals                     Create spending limit

  PATCH        /goals/:id                 Update spending limit

  DELETE       /goals/:id                 Delete spending limit

  GET          /goals/:id/progress        Get detailed progress
  -------------------------------------------------------------------------

**4.6.1 GET /goals**

**Response (200):** Array of Goal objects with progress: { \...Goal,
\"current_amount\": decimal, \"percentage\": decimal, \"status\":
\"on_track\"\|\"over_limit\" }

**4.6.2 POST /goals**

**Request:** { \"category_id\": uuid, \"amount\": decimal,
\"notify_over_limit\": boolean }

**Response (201):** Created Goal object

Note: All goals are monthly spending limits in BRL.

**4.6.3 GET /goals/:id/progress**

**Response (200):** { \"goal_id\": uuid, \"current_amount\": decimal,
\"limit_amount\": decimal, \"percentage\": decimal, \"status\":
\"on_track\"\|\"over_limit\", \"remaining\": decimal, \"period_end\":
date }

**4.7 Groups**

  -----------------------------------------------------------------------------
  **Method**   **Endpoint**                           **Description**
  ------------ -------------------------------------- -------------------------
  POST         /groups                                Create new group

  GET          /groups                                List user\'s groups

  GET          /groups/:id                            Get group details with
                                                      members

  PATCH        /groups/:id                            Update group (name)

  DELETE       /groups/:id                            Delete group (admin only)

  POST         /groups/:id/invite                     Invite user to group

  GET          /groups/:id/invites                    List pending invitations

  DELETE       /groups/:id/invites/:inviteId          Cancel invitation

  POST         /groups/:id/invites/:inviteId/resend   Resend invitation email

  POST         /groups/invites/:token/accept          Accept invitation via
                                                      token

  DELETE       /groups/:id/leave                      Leave group

  PATCH        /groups/:id/members/:userId            Change member role

  DELETE       /groups/:id/members/:userId            Remove member

  GET          /groups/:id/transactions               Get group transactions

  GET          /groups/:id/dashboard                  Get group dashboard
                                                      summary
  -----------------------------------------------------------------------------

**4.7.1 GET /groups**

**Response (200):** { \"data\": \[{ \"id\": uuid, \"name\": string,
\"member_count\": int, \"user_role\": \"admin\"\|\"member\",
\"created_at\": timestamp }\] }

**4.7.2 PATCH /groups/:id**

**Request:** { \"name\": string }

**Authorization:** Admin only

**4.7.3 DELETE /groups/:id**

**Authorization:** Admin only. Must be only remaining member or transfer
admin first.

**4.7.4 POST /groups/:id/invite**

**Request:** { \"email\": string }

**Response (201):** { \"invite_id\": uuid, \"status\": \"pending\",
\"expires_at\": datetime }

**Authorization:** Admin only

**4.7.5 GET /groups/:id/invites**

**Response (200):** \[{ \"id\": uuid, \"email\": string, \"status\":
\"pending\", \"expires_at\": datetime }\]

**Authorization:** Admin only

**4.7.6 POST /groups/invites/:token/accept**

**Response (200):** { \"group_id\": uuid, \"group_name\": string,
\"role\": \"member\" }

**Errors:** 400 Invalid/expired token, 403 Email mismatch, 409 Already a
member

**4.7.7 PATCH /groups/:id/members/:userId**

**Request:** { \"role\": \"admin\"\|\"member\" }

**Authorization:** Admin only. Cannot demote self if only admin.

**4.7.8 DELETE /groups/:id/members/:userId**

**Authorization:** Admin only. Cannot remove self (use leave instead).

**4.7.9 GET /groups/:id/transactions**

**Query Parameters:** Same as /transactions, plus member_id to filter by
member

**Response:** Each transaction includes \"user\": { \"id\": uuid,
\"name\": string }

**4.7.10 GET /groups/:id/dashboard**

**Query Parameters:** period (this_month\|last_month), startDate,
endDate

**Response (200):** { \"total_expenses\": decimal,
\"spending_by_member\": \[\...\], \"spending_by_category\": \[\...\],
\"period\": {\...} }

**4.8 Dashboard & Analytics**

  -------------------------------------------------------------------------
  **Method**   **Endpoint**               **Description**
  ------------ -------------------------- ---------------------------------
  GET          /dashboard/summary         Spending summary by period

  GET          /dashboard/trends          Spending trends over time

  GET          /dashboard/recurring       Detected recurring expenses

  GET          /dashboard/alerts          Upcoming alerts and warnings
  -------------------------------------------------------------------------

**4.8.1 GET /dashboard/summary**

**Query Parameters:** period: \"this_month\"\|\"last_month\",
startDate?, endDate?

**Response (200):** { \"total_balance\": decimal, \"total_income\":
decimal, \"total_expenses\": decimal, \"net_savings\": decimal,
\"period\": {\...}, \"comparison\": { \"income_change_pct\": decimal,
\"expense_change_pct\": decimal } }

**4.8.2 GET /dashboard/trends**

**Query Parameters:** period: \"month\"\|\"3months\"

**Response (200):** { \"data_points\": \[{ \"date\": ISO date,
\"income\": decimal, \"expenses\": decimal }\] }

**4.8.3 GET /dashboard/recurring**

**Response (200):** \[{ \"description_pattern\": string,
\"average_amount\": decimal, \"frequency\": \"weekly\"\|\"monthly\",
\"next_expected\": date, \"category_id\": uuid\|null }\]

**4.8.4 GET /dashboard/alerts**

**Response (200):** { \"upcoming_recurring\": \[{ \"description\":
string, \"amount\": decimal, \"expected_date\": date }\],
\"goals_over_limit\": \[{ \"goal_id\": uuid, \"name\": string,
\"percentage\": decimal }\], \"uncategorized_count\": int }

**5. Business Logic**

**5.1 Transaction Import Flow (2-Step)**

MVP uses simplified 2-step import:

1.  Step 1 - Upload & Preview: User uploads file, system parses and
    detects duplicates

2.  Step 2 - Categorize & Confirm: User reviews, applies categories,
    confirms import

Auto-categorization runs rules during preview to suggest categories.

**5.2 Auto-Categorization Algorithm**

All rules use regex pattern matching:

1.  Load all applicable enabled rules (user rules + group rules if
    member)

2.  Sort rules by priority (descending)

3.  Test transaction description against each regex pattern

4.  First matching rule wins - assign its category

5.  No match - leave uncategorized for manual tagging

**5.3 Group Membership Policies**

- Group creator is automatically assigned admin role

- Only admins can invite new members, manage roles, and delete group

- Invitations expire after 7 days

- When last admin leaves: must promote another member first or delete
  group

- When last member leaves: group and shared categories are deleted

**5.4 Account Deletion**

MVP uses immediate deletion (no grace period):

1.  User confirms deletion with password

2.  All user data immediately and permanently deleted

3.  Group memberships handled per group policies

**6. Security Considerations**

**6.1 Authentication & Authorization**

- JWT access tokens with 15-minute expiry (or extended for remember_me)

- Refresh tokens with 7-day expiry (30 days with remember_me)

- Passwords hashed with bcrypt (cost factor 12)

- Password reset tokens: single-use, 1-hour expiry, hashed storage

- Role-based access control for group operations

**6.2 Data Protection**

- All API endpoints require authentication except /auth/\*

- Users can only access their own transactions and groups they belong to

- Rate limiting on authentication endpoints (5 attempts per minute)

- Input validation and sanitization on all endpoints

- File upload restrictions: CSV/OFX only, max 10MB

**7. Error Handling**

**7.1 HTTP Status Codes**

  ------------------------------------------------------------------------
  **Status**   **Meaning**        **Usage**
  ------------ ------------------ ----------------------------------------
  200          Success            Successful GET, PATCH operations

  201          Created            Successful POST creating new resource

  204          No Content         Successful DELETE

  400          Bad Request        Validation error, malformed request

  401          Unauthorized       Missing/invalid token

  403          Forbidden          Insufficient permissions

  404          Not Found          Resource not found

  409          Conflict           Duplicate resource

  429          Too Many Requests  Rate limit exceeded

  500          Internal Server    Unexpected server error
               Error              
  ------------------------------------------------------------------------

**7.2 Error Response Format**

All API errors follow this consistent format:

{ \"error\": { \"code\": \"VALIDATION_ERROR\", \"message\": \"Human
readable message\", \"details\": { \"field\": \[\"error1\"\] },
\"request_id\": \"uuid\" } }

**8. Appendix**

**8.1 Sample Bank CSV Formats**

**Nubank format:** date,description,amount

2025-11-20,UBER \*TRIP,-45.90

**Inter format:** Data;Histórico;Valor

20/11/2025;PIX RECEBIDO;1500.00

**8.2 Regex Pattern Examples**

  -----------------------------------------------------------------------
  **User Selection** **Generated        **Matches**
                     Regex**            
  ------------------ ------------------ ---------------------------------
  Contains \'UBER\'  .\*UBER.\*         UBER \*TRIP, UBER EATS, MY UBER

  Starts with        \^PIX.\*           PIX RECEBIDO, PIX ENVIADO
  \'PIX\'                               

  Exact \'NETFLIX\'  \^NETFLIX\$        NETFLIX only

  Custom regex       (IFOOD\|RAPPI)     IFOOD or RAPPI
  -----------------------------------------------------------------------

**8.3 Entity Relationships**

- User 1:N Transaction (user owns transactions)

- User N:M Group (via GroupMember junction table)

- Category 1:N Transaction (category applied to transactions)

- Category 1:N CategoryRule (rules target categories)

- Category 1:N Goal (goals tied to categories)

- User/Group 1:N Category (polymorphic ownership)

- User 1:N PasswordResetToken (for password recovery)

- User 1:N TransactionUpload (for staged imports)

- Group 1:N GroupInvite (pending invitations)

**8.4 MVP vs Future Scope**

  -----------------------------------------------------------------------
  **Feature**        **MVP**                **Future**
  ------------------ ---------------------- -----------------------------
  Authentication     Email/password only    Google, Apple OAuth

  Currency           BRL only               Multi-currency (BRL/USD)

  Goals              Monthly spending       Savings targets, custom
                     limits                 periods

  Notifications      Email only             Push notifications

  Theme              Light only             Dark mode

  Data Export        Not available          CSV/JSON export

  Profile            Name only              Avatar upload

  Account Deletion   Immediate              30-day grace period
  -----------------------------------------------------------------------

**8.5 Version History**

  -------------------------------------------------------------------------
  **Version**   **Date**           **Changes**
  ------------- ------------------ ----------------------------------------
  1.0           November 2025      Initial release

  2.0           November 2025      Integration requirements

  3.0           November 2025      Gap resolution: social auth, bulk ops,
                                   group management

  4.0           November 2025      Final gaps: logout, invite accept,
                                   totals, terms

  5.0           November 2025      MVP scope: removed social auth,
                                   multi-currency, dark mode, export

  6.0           November 2025      Enhanced duplicate detection with
                                   per-transaction flags
  -------------------------------------------------------------------------

**Document Information**

  -----------------------------------------------------------------------
  **Property**           **Value**
  ---------------------- ------------------------------------------------
  Document Title         Finance Tracker Backend Technical Design
                         Document

  Version                6.0 (MVP)

  Date                   November 2025

  Status                 MVP Scope - Ready for Implementation

  Related Docs           Frontend UI Design v3.0 (MVP), Integration TDD
                         v1.0
  -----------------------------------------------------------------------
