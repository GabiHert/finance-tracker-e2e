# Create Feature Specification

You are creating a comprehensive feature specification based on the user's description: **$ARGUMENTS**

---

## PHASE 1: DISCOVERY & ANALYSIS

### Step 1.1: Understand the Request

Analyze the feature description and identify:
- What is the core functionality?
- What user problem does this solve?
- What screens/components are involved?
- What data needs to be stored/retrieved?

### Step 1.2: Codebase Investigation

Before asking questions, investigate:

1. **Check existing features** in `context/features/` for patterns
2. **Search codebase** for related implementations:
   - `frontend/src/main/features/` - Existing frontend features
   - `backend/internal/` - Existing backend patterns
   - `e2e/tests/` - Existing E2E test patterns
3. **Read relevant guides** in `context/guides/` (if exists) or `context/`:
   - `Finance-Tracker-Frontend-UI-Requirements-v3.md`
   - `finance-tracker-backend-tdd-v6.md`
   - `Finance-Tracker-Integration-TDD-v1.md`
   - `Finance-Tracker-E2E-Testing-Guide-v1.md`
4. **Identify milestone**: Determine which milestone (M1-M11) this belongs to, or if it's a new feature (M12+)
5. **Find dependencies**: What other features does this depend on?

### Step 1.3: Generate Feature Code

Based on your analysis, determine:
- **Milestone number**: M1-M11 (existing) or M12+ (new)
- **Feature code**: Short kebab-case name (e.g., `auth`, `rules`, `goals`)
- **Full code**: `{milestone}-{feature}` (e.g., `M6-rules`, `M12-recurring-transactions`)

---

## PHASE 2: CLARIFICATION QUESTIONS

### Step 2.1: Ask Strategic Questions

Use the AskUserQuestion tool to gather missing information. Ask questions in these categories:

**Category 1: User Stories & Value**
- Who are the primary users of this feature?
- What problem does this solve for them?
- What's the expected frequency of use?

**Category 2: Happy Path Flow**
- What's the step-by-step user journey?
- What screens are involved?
- What actions can the user take?

**Category 3: Data & State**
- What data needs to be created/stored?
- What existing data does this interact with?
- What are the data validation rules?

**Category 4: Edge Cases & Errors**
- What happens when data is empty?
- What validation errors are possible?
- How should API failures be handled?
- What are the loading states?

**Category 5: Visual & UX**
- Desktop vs mobile layout differences?
- Dark mode considerations?
- Animations or transitions needed?
- Toast notifications or feedback?

**Category 6: Security & Permissions**
- Who can access this feature?
- Are there admin-only actions?
- What data should be protected?

**Category 7: Integration Points**
- Does this affect other features?
- Are there shared components to reuse?
- Does this need real-time updates?

### Step 2.2: Compile Answers

After getting answers, compile a complete feature understanding document.

---

## PHASE 3: SPECIFICATION GENERATION

Create files in this exact order (each builds on the previous):

### Step 3.1: Create Feature Directory

```
context/features/{feature-code}/
```

### Step 3.2: Create README.md (Overview)

```markdown
# Feature: {Feature Name}

**Code:** {feature-code}
**Milestone:** {milestone}
**Status:** Specification Complete

## Overview

{Brief description of the feature and its value}

## User Stories

- As a {user type}, I want to {action} so that {benefit}
- ...

## Dependencies

- **Requires:** {list of features this depends on}
- **Enables:** {list of features that depend on this}

## Specification Files

| File | Description |
|------|-------------|
| [ui-requirements.md](./ui-requirements.md) | Frontend UI specifications |
| [integration.md](./integration.md) | API contracts & state management |
| [backend-tdd.md](./backend-tdd.md) | Backend implementation specs |
| [infrastructure.md](./infrastructure.md) | Database migrations & infrastructure |
| [e2e-scenarios.md](./e2e-scenarios.md) | End-to-end test scenarios |

## Quick Links

- **Frontend Code:** `frontend/src/main/features/{feature}/`
- **Backend Code:** `backend/internal/application/{feature}/`
- **E2E Tests:** `e2e/tests/{milestone}-{feature}/`
- **Task File:** `tasks/todo/TASK-{Feature-Name}.md`

## Implementation Checklist

- [ ] UI Requirements reviewed
- [ ] Integration contracts defined
- [ ] Backend TDD scenarios written
- [ ] Infrastructure migrations defined
- [ ] E2E scenarios defined
- [ ] Task file created
- [ ] Ready for implementation
```

### Step 3.3: Create ui-requirements.md

**PURPOSE:** Define everything the user sees and interacts with.

```markdown
# UI Requirements: {Feature Name}

**Feature Code:** {feature-code}
**Last Updated:** {date}

---

## 1. Overview

### 1.1 Feature Purpose
{What this feature does from a UI perspective}

### 1.2 User Entry Points
{How users access this feature - navigation, buttons, links}

### 1.3 Screen Map
{List of screens/modals involved}

---

## 2. Screen Specifications

### 2.1 {Screen Name}

#### Layout
{Description of the layout - grid, sections, responsive behavior}

#### Components
| Component | Type | Description |
|-----------|------|-------------|
| {name} | {Button/Input/Card/etc} | {what it does} |

#### Visual States
- **Default:** {description}
- **Loading:** {description}
- **Empty:** {description}
- **Error:** {description}
- **Success:** {description}

#### Responsive Behavior
| Breakpoint | Layout Changes |
|------------|----------------|
| Desktop (1024px+) | {description} |
| Tablet (768px-1023px) | {description} |
| Mobile (<768px) | {description} |

#### Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| {action} | {click/hover/submit} | {what happens} |

#### Accessibility
- Keyboard navigation: {description}
- Screen reader: {aria labels, announcements}
- Focus management: {focus order, traps}

### 2.2 {Modal/Dialog Name}

{Same structure as screens}

---

## 3. Component Specifications

### 3.1 {Component Name}

#### Props
```typescript
interface {Component}Props {
  prop1: string;
  prop2?: boolean;
  onAction: () => void;
}
```

#### Variants
{Different visual variants of the component}

#### States
{Interactive states: default, hover, active, disabled, focus}

---

## 4. Design Tokens

### Colors Used
| Token | Usage |
|-------|-------|
| `primary-500` | {usage} |
| `success-500` | {usage} |
| `error-500` | {usage} |

### Typography
| Element | Token |
|---------|-------|
| Heading | `text-xl font-semibold` |
| Body | `text-sm` |

### Spacing
{Key spacing values used}

---

## 5. User Flows

### 5.1 {Flow Name} (Happy Path)

```
1. User {action}
   → System {response}
2. User {action}
   → System {response}
3. ...
```

### 5.2 {Error Flow Name}

```
1. User {action}
   → System shows {error state}
2. User {corrective action}
   → System {response}
```

---

## 6. Toast Notifications

| Event | Type | Message |
|-------|------|---------|
| {event} | success/error/info | "{message}" |

---

## 7. Empty States

### 7.1 {Empty State Name}
- **Illustration:** {description or "none"}
- **Heading:** "{text}"
- **Message:** "{text}"
- **CTA:** "{button text}" → {action}

---

## 8. Loading States

### 8.1 Initial Load
{Skeleton, spinner, or progressive loading description}

### 8.2 Action Loading
{Button loading states, inline spinners}

---

## 9. Dark Mode Considerations

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `white` | `gray-900` |
| Text | `gray-900` | `gray-100` |
| {element} | {color} | {color} |

---

## 10. Animations & Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Modal open | fade + scale | 200ms | ease-out |
| {element} | {animation} | {duration} | {easing} |

---

## Related Documentation

- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/Finance-Tracker-Frontend-UI-Requirements-v3.md`
```

### Step 3.4: Create integration.md

**PURPOSE:** Define the contract between frontend and backend.

```markdown
# Integration Specification: {Feature Name}

**Feature Code:** {feature-code}
**Last Updated:** {date}

---

## 1. Overview

### 1.1 Integration Summary
{Brief description of how frontend and backend communicate for this feature}

### 1.2 API Base URL
```
/api/v1/{resource}
```

---

## 2. API Endpoints

### 2.1 {METHOD} {/endpoint}

**Purpose:** {what this endpoint does}

**Authentication:** Required / Not Required

**Request:**
```typescript
// Headers
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Query Parameters (for GET)
{
  param1?: string;
  param2?: number;
}

// Body (for POST/PUT/PATCH)
{
  field1: string;
  field2?: number;
}
```

**Response (Success):**
```typescript
// Status: 200 | 201
{
  data: {
    id: string;
    field1: string;
    field2: number;
    created_at: string;  // ISO 8601
    updated_at: string;  // ISO 8601
  }
}
```

**Response (Error):**
```typescript
// Status: 400 | 401 | 403 | 404 | 409 | 422 | 500
{
  error: {
    code: string;        // e.g., "VALIDATION_ERROR"
    message: string;     // Human-readable message
    details?: {          // Field-level errors
      field: string;
      message: string;
    }[];
  }
}
```

**Error Codes:**
| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate resource |
| 422 | UNPROCESSABLE | Business rule violation |
| 500 | INTERNAL_ERROR | Server error |

**Frontend Usage:**
```typescript
// Location: frontend/src/main/features/{feature}/api/{feature}.ts

export async function {functionName}(params: RequestType): Promise<ResponseType> {
  const response = await apiClient.{method}('/endpoint', params);
  return response.data;
}
```

---

## 3. State Management

### 3.1 Store Structure

```typescript
// Location: frontend/src/main/features/{feature}/store/{feature}Store.ts

interface {Feature}State {
  items: {Item}[];
  selectedItem: {Item} | null;
  isLoading: boolean;
  error: string | null;

  // Pagination (if applicable)
  page: number;
  totalPages: number;
  totalItems: number;
}
```

### 3.2 Actions

| Action | Trigger | API Call | State Update |
|--------|---------|----------|--------------|
| fetch{Items} | Mount/Refresh | GET /items | Set items, clear error |
| create{Item} | Form submit | POST /items | Add to items |
| update{Item} | Edit submit | PATCH /items/:id | Update in items |
| delete{Item} | Delete confirm | DELETE /items/:id | Remove from items |

### 3.3 Optimistic Updates

| Action | Optimistic Behavior | Rollback on Error |
|--------|---------------------|-------------------|
| create | Add to list immediately | Remove and show error |
| update | Update immediately | Revert to original |
| delete | Remove immediately | Restore and show error |

---

## 4. Error Handling

### 4.1 API Error Mapping

| Error Code | UI Response |
|------------|-------------|
| VALIDATION_ERROR | Show field errors inline |
| UNAUTHORIZED | Redirect to login |
| FORBIDDEN | Show permission denied message |
| NOT_FOUND | Show not found state |
| CONFLICT | Show specific conflict message |
| INTERNAL_ERROR | Show generic error toast |

### 4.2 Network Errors

| Scenario | UI Response |
|----------|-------------|
| No connection | Show offline banner |
| Timeout | Show retry button |
| Rate limited | Show "too many requests" message |

---

## 5. Data Transformations

### 5.1 API → Frontend

```typescript
// Transform API response to frontend model
function transform{Item}FromApi(apiItem: Api{Item}): {Item} {
  return {
    id: apiItem.id,
    // Transform dates
    createdAt: new Date(apiItem.created_at),
    // Transform amounts (cents to decimal)
    amount: apiItem.amount / 100,
    // ... other transformations
  };
}
```

### 5.2 Frontend → API

```typescript
// Transform frontend model to API request
function transform{Item}ToApi(item: {Item}): Api{Item}Request {
  return {
    // Transform amounts (decimal to cents)
    amount: Math.round(item.amount * 100),
    // Format dates
    date: item.date.toISOString().split('T')[0],
    // ... other transformations
  };
}
```

---

## 6. Caching Strategy

### 6.1 Cache Rules

| Data | Cache Duration | Invalidation |
|------|----------------|--------------|
| List data | 5 minutes | On create/update/delete |
| Detail data | 5 minutes | On update/delete |
| User preferences | Session | On update |

### 6.2 Stale-While-Revalidate

{Describe SWR strategy if applicable}

---

## 7. Real-time Updates

### 7.1 WebSocket Events (if applicable)

| Event | Payload | Handler |
|-------|---------|---------|
| {event_name} | `{ ... }` | Update store |

---

## 8. Testing Contracts

### 8.1 Mock Data

```typescript
// Location: frontend/src/test/mocks/{feature}.ts

export const mock{Item}: {Item} = {
  id: 'test-id-1',
  field1: 'Test Value',
  // ... complete mock object
};

export const mock{Items}: {Item}[] = [
  mock{Item},
  // ... more items
];
```

### 8.2 API Mocks for E2E

```typescript
// Location: e2e/mocks/{feature}.ts

export function mock{Feature}Api(page: Page) {
  await page.route('**/api/v1/{resource}', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ data: mock{Items} }),
    });
  });
}
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/Finance-Tracker-Integration-TDD-v1.md`
```

### Step 3.5: Create backend-tdd.md

**PURPOSE:** Define backend implementation with BDD scenarios.

```markdown
# Backend TDD: {Feature Name}

**Feature Code:** {feature-code}
**Last Updated:** {date}

---

## 1. Overview

### 1.1 Domain Description
{What this domain represents in the business context}

### 1.2 Bounded Context
{How this fits into the overall domain model}

---

## 2. Database Schema

### 2.1 Table: {table_name}

```sql
CREATE TABLE {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields
    field1 VARCHAR(255) NOT NULL,
    field2 INTEGER,

    -- Ownership
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_field UNIQUE (user_id, field1)
);

-- Indexes
CREATE INDEX idx_{table}_user ON {table_name}(user_id);
CREATE INDEX idx_{table}_field ON {table_name}(field1);
```

### 2.2 Relationships

```
{table_name}
├── belongs_to: users (user_id)
├── has_many: {related_table}
└── belongs_to: {another_table} (fk_id)
```

---

## 3. Domain Entity

### 3.1 Entity Definition

```go
// Location: backend/internal/domain/entity/{entity}.go

package entity

import (
    "time"
    "github.com/google/uuid"
)

type {Entity} struct {
    ID        uuid.UUID  `json:"id"`
    Field1    string     `json:"field1"`
    Field2    int        `json:"field2"`
    UserID    uuid.UUID  `json:"user_id"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
}

// Validation
func (e *{Entity}) Validate() error {
    if e.Field1 == "" {
        return errors.New("field1 is required")
    }
    // ... more validations
    return nil
}
```

### 3.2 Value Objects (if any)

```go
// Location: backend/internal/domain/valueobject/{vo}.go

type {ValueObject} struct {
    // ...
}
```

---

## 4. Repository Interface

```go
// Location: backend/internal/application/{feature}/repository.go

package {feature}

import (
    "context"
    "github.com/google/uuid"
)

type Repository interface {
    Create(ctx context.Context, entity *entity.{Entity}) error
    GetByID(ctx context.Context, id uuid.UUID) (*entity.{Entity}, error)
    GetByUserID(ctx context.Context, userID uuid.UUID, filters Filters) ([]*entity.{Entity}, error)
    Update(ctx context.Context, entity *entity.{Entity}) error
    Delete(ctx context.Context, id uuid.UUID) error
}

type Filters struct {
    Search    string
    StartDate *time.Time
    EndDate   *time.Time
    Page      int
    Limit     int
}
```

---

## 5. Service Layer

```go
// Location: backend/internal/application/{feature}/service.go

package {feature}

type Service struct {
    repo Repository
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*entity.{Entity}, error) {
    // Validation
    // Business logic
    // Repository call
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*entity.{Entity}, error) {
    // ...
}

// ... other methods
```

---

## 6. API Endpoints

### 6.1 GET /api/v1/{resource}

**Handler:**
```go
// Location: backend/internal/integration/handler/{feature}_handler.go

func (h *Handler) List(c *gin.Context) {
    // Parse query params
    // Call service
    // Return response
}
```

**BDD Scenario:**
```gherkin
Feature: List {Resources}

  Scenario: User lists their {resources}
    Given I am authenticated as "user@example.com"
    And I have {resources}:
      | field1 | field2 |
      | Value1 | 100    |
      | Value2 | 200    |
    When I GET "/api/v1/{resource}"
    Then the response status should be 200
    And the response should contain 2 {resources}

  Scenario: Empty list returns empty array
    Given I am authenticated as "user@example.com"
    And I have no {resources}
    When I GET "/api/v1/{resource}"
    Then the response status should be 200
    And the response should contain 0 {resources}

  Scenario: Unauthenticated request is rejected
    When I GET "/api/v1/{resource}" without authentication
    Then the response status should be 401
```

### 6.2 POST /api/v1/{resource}

**Handler:**
```go
func (h *Handler) Create(c *gin.Context) {
    // Parse body
    // Validate
    // Call service
    // Return response
}
```

**BDD Scenario:**
```gherkin
Feature: Create {Resource}

  Scenario: Successfully create {resource}
    Given I am authenticated as "user@example.com"
    When I POST "/api/v1/{resource}" with:
      | field1 | Value1 |
      | field2 | 100    |
    Then the response status should be 201
    And the response should contain the created {resource}

  Scenario: Validation error on missing required field
    Given I am authenticated
    When I POST "/api/v1/{resource}" with:
      | field2 | 100 |
    Then the response status should be 400
    And the error code should be "VALIDATION_ERROR"

  Scenario: Conflict on duplicate
    Given I am authenticated
    And I have a {resource} with field1 "Existing"
    When I POST "/api/v1/{resource}" with:
      | field1 | Existing |
    Then the response status should be 409
```

### 6.3 PATCH /api/v1/{resource}/:id

**BDD Scenario:**
```gherkin
Feature: Update {Resource}

  Scenario: Successfully update {resource}
    Given I am authenticated
    And I have a {resource} with id "abc-123"
    When I PATCH "/api/v1/{resource}/abc-123" with:
      | field1 | Updated |
    Then the response status should be 200
    And field1 should be "Updated"

  Scenario: Cannot update another user's {resource}
    Given I am authenticated as "user@example.com"
    And "other@example.com" has a {resource} with id "other-123"
    When I PATCH "/api/v1/{resource}/other-123" with:
      | field1 | Hacked |
    Then the response status should be 403
```

### 6.4 DELETE /api/v1/{resource}/:id

**BDD Scenario:**
```gherkin
Feature: Delete {Resource}

  Scenario: Successfully delete {resource}
    Given I am authenticated
    And I have a {resource} with id "abc-123"
    When I DELETE "/api/v1/{resource}/abc-123"
    Then the response status should be 204
    And the {resource} should not exist

  Scenario: Delete non-existent returns 404
    Given I am authenticated
    When I DELETE "/api/v1/{resource}/non-existent"
    Then the response status should be 404
```

---

## 7. Business Rules

### 7.1 Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| field1 | Required, max 255 chars | "field1 is required" |
| field2 | Must be positive | "field2 must be positive" |

### 7.2 Authorization Rules

| Action | Rule |
|--------|------|
| List | Only own {resources} |
| Create | Any authenticated user |
| Update | Only own {resources} |
| Delete | Only own {resources} |

### 7.3 Business Logic

{Describe any complex business logic, calculations, or side effects}

---

## 8. Error Handling

```go
// Location: backend/internal/domain/errors/{feature}_errors.go

var (
    Err{Entity}NotFound = errors.New("{entity} not found")
    Err{Entity}Duplicate = errors.New("{entity} already exists")
    // ... other errors
)
```

---

## 9. Testing

### 9.1 BDD Feature File Location
```
backend/test/integration/features/{feature}.feature
```

### 9.2 Step Definitions Location
```
backend/test/integration/steps/{feature}_steps.go
```

### 9.3 Unit Test Location
```
backend/internal/application/{feature}/service_test.go
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
- **Guide Reference:** `context/guides/finance-tracker-backend-tdd-v6.md`
```

### Step 3.6: Create infrastructure.md

**PURPOSE:** Define database migrations, infrastructure requirements, and deployment considerations.

```markdown
# Infrastructure: {Feature Name}

**Feature Code:** {feature-code}
**Last Updated:** {date}

---

## 1. Overview

### 1.1 Infrastructure Summary
{Brief description of infrastructure requirements for this feature}

### 1.2 Dependencies
- **Database:** PostgreSQL
- **External Services:** {list any external APIs, services}
- **Environment Variables:** {list required env vars}

---

## 2. Database Migrations

### 2.1 Migration: Create {table_name} Table

**File:** `backend/internal/infrastructure/db/migrations/{timestamp}_create_{table_name}.sql`

**Up Migration:**
```sql
-- Migration: Create {table_name} table
-- Feature: {feature-code}

CREATE TABLE IF NOT EXISTS {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields
    field1 VARCHAR(255) NOT NULL,
    field2 INTEGER,
    field3 DECIMAL(12, 2),

    -- Foreign keys
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    {related}_id UUID REFERENCES {related_table}(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT {table}_field1_not_empty CHECK (field1 <> ''),
    CONSTRAINT {table}_field2_positive CHECK (field2 >= 0),
    CONSTRAINT {table}_unique_per_user UNIQUE (user_id, field1)
);

-- Indexes for common queries
CREATE INDEX idx_{table}_user_id ON {table_name}(user_id);
CREATE INDEX idx_{table}_created_at ON {table_name}(created_at);
CREATE INDEX idx_{table}_{related}_id ON {table_name}({related}_id);

-- Composite indexes for filtered queries
CREATE INDEX idx_{table}_user_field1 ON {table_name}(user_id, field1);

-- Add trigger for updated_at
CREATE TRIGGER update_{table}_updated_at
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE {table_name} IS '{Feature description}';
COMMENT ON COLUMN {table_name}.field1 IS '{Field description}';
```

**Down Migration:**
```sql
-- Rollback: Drop {table_name} table

DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table_name};
DROP INDEX IF EXISTS idx_{table}_user_field1;
DROP INDEX IF EXISTS idx_{table}_{related}_id;
DROP INDEX IF EXISTS idx_{table}_created_at;
DROP INDEX IF EXISTS idx_{table}_user_id;
DROP TABLE IF EXISTS {table_name};
```

### 2.2 Migration: Add Columns to Existing Table (if applicable)

**File:** `backend/internal/infrastructure/db/migrations/{timestamp}_add_{columns}_to_{table}.sql`

**Up Migration:**
```sql
-- Migration: Add {columns} to {existing_table}
-- Feature: {feature-code}

ALTER TABLE {existing_table}
    ADD COLUMN IF NOT EXISTS new_column_1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS new_column_2 INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_{table}_new_column_1 ON {existing_table}(new_column_1);
```

**Down Migration:**
```sql
-- Rollback: Remove {columns} from {existing_table}

DROP INDEX IF EXISTS idx_{table}_new_column_1;
ALTER TABLE {existing_table}
    DROP COLUMN IF EXISTS new_column_1,
    DROP COLUMN IF EXISTS new_column_2;
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────┐
│                      users                          │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ email                                               │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────┐
│                   {table_name}                      │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ user_id (FK → users.id)                             │
│ {related}_id (FK → {related_table}.id)              │
│ field1                                              │
│ field2                                              │
│ created_at                                          │
│ updated_at                                          │
└─────────────────────────────────────────────────────┘
         │
         │ N:1
         ▼
┌─────────────────────────────────────────────────────┐
│                  {related_table}                    │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### 3.2 Table Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| user_id | UUID | NO | - | Owner reference |
| field1 | VARCHAR(255) | NO | - | {description} |
| field2 | INTEGER | YES | NULL | {description} |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

### 3.3 Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| idx_{table}_user_id | user_id | B-tree | Filter by user |
| idx_{table}_created_at | created_at | B-tree | Sort by date |
| idx_{table}_user_field1 | user_id, field1 | B-tree | User + search |

### 3.4 Constraints

| Constraint | Type | Definition | Purpose |
|------------|------|------------|---------|
| {table}_pkey | PRIMARY KEY | id | Unique identifier |
| {table}_user_fkey | FOREIGN KEY | user_id → users(id) | Referential integrity |
| {table}_field1_not_empty | CHECK | field1 <> '' | Data validation |
| {table}_unique_per_user | UNIQUE | (user_id, field1) | Prevent duplicates |

---

## 4. Environment Variables

### 4.1 Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection string | postgres://... | Yes |
| {FEATURE}_ENABLED | Feature flag | true | No |
| {EXTERNAL_API}_KEY | External service API key | sk-... | If using external service |

### 4.2 Feature Flags (if applicable)

```env
# Feature: {feature-code}
FEATURE_{CODE}_ENABLED=true
FEATURE_{CODE}_MAX_ITEMS=100
```

---

## 5. External Services (if applicable)

### 5.1 {Service Name}

**Purpose:** {What this service is used for}

**Integration:**
- API Endpoint: `https://api.service.com/v1/`
- Authentication: API Key in header
- Rate Limits: 100 requests/minute

**Required Configuration:**
```env
{SERVICE}_API_KEY=your_api_key
{SERVICE}_BASE_URL=https://api.service.com/v1
```

**Error Handling:**
| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process response |
| 401 | Invalid API key | Log error, fail request |
| 429 | Rate limited | Retry with backoff |
| 500 | Service error | Retry or fail gracefully |

---

## 6. Performance Considerations

### 6.1 Expected Data Volume

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| Rows per user | ~100-1000 | Average usage |
| Total rows (1K users) | 100K-1M | Capacity planning |
| Row size (avg) | ~200 bytes | Storage estimate |

### 6.2 Query Patterns

| Query | Frequency | Index Used | Expected Time |
|-------|-----------|------------|---------------|
| List by user | High | idx_{table}_user_id | < 10ms |
| Search by field | Medium | idx_{table}_user_field1 | < 20ms |
| Aggregate stats | Low | Full scan / idx | < 100ms |

### 6.3 Optimization Notes

- {Note about specific query optimization}
- {Note about caching if applicable}
- {Note about pagination requirements}

---

## 7. Data Migration (if migrating from existing system)

### 7.1 Migration Strategy

{Description of how to migrate existing data, if applicable}

### 7.2 Migration Script

```sql
-- Data migration: {description}
-- Run this AFTER the schema migration

INSERT INTO {new_table} (column1, column2, ...)
SELECT old_column1, old_column2, ...
FROM {old_table}
WHERE {conditions};
```

### 7.3 Rollback Plan

{Description of how to rollback if migration fails}

---

## 8. Deployment Checklist

### 8.1 Pre-Deployment

- [ ] Migration tested in staging
- [ ] Rollback scripts tested
- [ ] Environment variables configured
- [ ] External service credentials verified
- [ ] Performance impact assessed

### 8.2 Deployment Steps

1. Apply database migrations
2. Deploy backend with new code
3. Deploy frontend with new code
4. Verify feature works in production
5. Monitor for errors/performance issues

### 8.3 Post-Deployment

- [ ] Verify data integrity
- [ ] Check query performance
- [ ] Monitor error rates
- [ ] Validate external service integration

---

## 9. Backup & Recovery

### 9.1 Backup Considerations

- Table included in daily backups: Yes
- Point-in-time recovery: Supported
- Data retention: {policy}

### 9.2 Recovery Procedures

{Description of recovery procedures for this feature's data}

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend TDD:** [backend-tdd.md](./backend-tdd.md)
- **E2E Tests:** [e2e-scenarios.md](./e2e-scenarios.md)
```

### Step 3.7: Create e2e-scenarios.md

**PURPOSE:** Define complete E2E test scenarios.

```markdown
# E2E Scenarios: {Feature Name}

**Feature Code:** {feature-code}
**Last Updated:** {date}

---

## 1. Overview

### 1.1 Test Scope
{What this E2E test suite validates}

### 1.2 Test File Location
```
e2e/tests/{feature-code}/{feature}.spec.ts
```

### 1.3 Prerequisites
- User authenticated
- {Other prerequisites}

---

## 2. Test Configuration

### 2.1 Playwright Project Config

```typescript
// In playwright.config.ts, add:
{
  name: '{feature-code}',
  testDir: './tests/{feature-code}',
  testMatch: '**/*.spec.ts',
}
```

### 2.2 Test Fixtures

```typescript
// e2e/tests/{feature-code}/fixtures.ts

import { test as base } from '@playwright/test';

export const test = base.extend({
  // Custom fixtures for this feature
  authenticated: async ({ page }, use) => {
    // Login helper
    await use(page);
  },
});
```

---

## 3. E2E Test Scenarios

### 3.1 Navigation & Access

#### E2E-{CODE}-001: Navigate to {Feature} Screen

```gherkin
Scenario: User navigates to {feature} screen from sidebar
  Given I am logged in
  And I am on the dashboard
  When I click "{Feature}" in the sidebar navigation
  Then I should be on the {feature} screen
  And the URL should be "/{feature}"
  And the page title should contain "{Feature}"
```

```typescript
test('E2E-{CODE}-001: Navigate to {feature} screen', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="nav-{feature}"]');

  await expect(page).toHaveURL('/{feature}');
  await expect(page.locator('h1')).toContainText('{Feature}');
});
```

### 3.2 List & Display

#### E2E-{CODE}-002: Display {Feature} List

```gherkin
Scenario: User sees list of {items}
  Given I am logged in
  And I have {items}:
    | field1 | field2 |
    | Item 1 | 100    |
    | Item 2 | 200    |
  When I navigate to the {feature} screen
  Then I should see 2 {item} cards
  And the first card should display "Item 1"
```

```typescript
test('E2E-{CODE}-002: Display {feature} list', async ({ page }) => {
  // Setup: Create test data via API
  await createTestData(page);

  await page.goto('/{feature}');

  const cards = page.locator('[data-testid="{item}-card"]');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Item 1');
});
```

#### E2E-{CODE}-003: Empty State

```gherkin
Scenario: User sees empty state when no {items} exist
  Given I am logged in
  And I have no {items}
  When I navigate to the {feature} screen
  Then I should see the empty state
  And I should see "Create your first {item}" button
```

```typescript
test('E2E-{CODE}-003: Empty state display', async ({ page }) => {
  await page.goto('/{feature}');

  await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="create-first-btn"]')).toBeVisible();
});
```

### 3.3 Create Flow

#### E2E-{CODE}-004: Create {Item} - Happy Path

```gherkin
Scenario: User creates a new {item} successfully
  Given I am logged in
  And I am on the {feature} screen
  When I click "New {Item}"
  Then I should see the create {item} modal

  When I fill in:
    | Field  | Value  |
    | field1 | Test 1 |
    | field2 | 100    |
  And I click "Save"
  Then I should see a success toast "{Item} created"
  And I should see "Test 1" in the {item} list
```

```typescript
test('E2E-{CODE}-004: Create {item} successfully', async ({ page }) => {
  await page.goto('/{feature}');

  // Open modal
  await page.click('[data-testid="new-{item}-btn"]');
  await expect(page.locator('[data-testid="{item}-modal"]')).toBeVisible();

  // Fill form
  await page.fill('[data-testid="field1-input"]', 'Test 1');
  await page.fill('[data-testid="field2-input"]', '100');

  // Submit
  await page.click('[data-testid="save-btn"]');

  // Verify
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('created');
  await expect(page.locator('[data-testid="{item}-card"]')).toContainText('Test 1');
});
```

#### E2E-{CODE}-005: Create {Item} - Validation Error

```gherkin
Scenario: User sees validation error on empty required field
  Given I am logged in
  And I am on the create {item} modal
  When I leave field1 empty
  And I click "Save"
  Then I should see error "field1 is required"
  And the modal should remain open
```

```typescript
test('E2E-{CODE}-005: Create validation error', async ({ page }) => {
  await page.goto('/{feature}');
  await page.click('[data-testid="new-{item}-btn"]');

  // Submit without filling required field
  await page.click('[data-testid="save-btn"]');

  await expect(page.locator('[data-testid="field1-error"]')).toContainText('required');
  await expect(page.locator('[data-testid="{item}-modal"]')).toBeVisible();
});
```

### 3.4 Edit Flow

#### E2E-{CODE}-006: Edit {Item} - Happy Path

```gherkin
Scenario: User edits an existing {item}
  Given I am logged in
  And I have a {item} "Original"
  And I am on the {feature} screen
  When I click on the "Original" {item} card
  Then I should see the edit modal with "Original" data

  When I change field1 to "Updated"
  And I click "Save"
  Then I should see a success toast
  And the {item} should display "Updated"
```

```typescript
test('E2E-{CODE}-006: Edit {item}', async ({ page }) => {
  // Setup
  await createTestItem(page, { field1: 'Original' });
  await page.goto('/{feature}');

  // Open edit modal
  await page.click('[data-testid="{item}-card"]:has-text("Original")');
  await expect(page.locator('[data-testid="field1-input"]')).toHaveValue('Original');

  // Edit
  await page.fill('[data-testid="field1-input"]', 'Updated');
  await page.click('[data-testid="save-btn"]');

  // Verify
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  await expect(page.locator('[data-testid="{item}-card"]')).toContainText('Updated');
});
```

### 3.5 Delete Flow

#### E2E-{CODE}-007: Delete {Item}

```gherkin
Scenario: User deletes a {item}
  Given I am logged in
  And I have a {item} "To Delete"
  When I click delete on the "To Delete" {item}
  Then I should see a confirmation dialog

  When I confirm deletion
  Then I should see a success toast "{Item} deleted"
  And "To Delete" should not appear in the list
```

```typescript
test('E2E-{CODE}-007: Delete {item}', async ({ page }) => {
  await createTestItem(page, { field1: 'To Delete' });
  await page.goto('/{feature}');

  // Delete
  await page.click('[data-testid="{item}-card"]:has-text("To Delete") [data-testid="delete-btn"]');
  await page.click('[data-testid="confirm-delete-btn"]');

  // Verify
  await expect(page.locator('[data-testid="toast-success"]')).toContainText('deleted');
  await expect(page.locator('[data-testid="{item}-card"]:has-text("To Delete")')).not.toBeVisible();
});
```

### 3.6 Error Handling

#### E2E-{CODE}-008: Handle API Error

```gherkin
Scenario: User sees error when API fails
  Given I am logged in
  And the API returns an error
  When I try to create a {item}
  Then I should see an error toast
  And the modal should remain open
```

```typescript
test('E2E-{CODE}-008: API error handling', async ({ page }) => {
  // Mock API failure
  await page.route('**/api/v1/{resource}', (route) => {
    route.fulfill({ status: 500 });
  });

  await page.goto('/{feature}');
  await page.click('[data-testid="new-{item}-btn"]');
  await page.fill('[data-testid="field1-input"]', 'Test');
  await page.click('[data-testid="save-btn"]');

  await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
});
```

### 3.7 Loading States

#### E2E-{CODE}-009: Loading State Display

```gherkin
Scenario: User sees loading state while data loads
  Given I am logged in
  And the API is slow
  When I navigate to the {feature} screen
  Then I should see loading skeletons
  When the data loads
  Then I should see the {item} list
```

---

## 4. Test Data Helpers

```typescript
// e2e/tests/{feature-code}/helpers.ts

import { Page } from '@playwright/test';

export async function createTestItem(page: Page, data: Partial<{Item}>) {
  // Create via API for test setup
  await page.request.post('/api/v1/{resource}', {
    data: {
      field1: data.field1 ?? 'Test Item',
      field2: data.field2 ?? 100,
    },
  });
}

export async function clearTestData(page: Page) {
  // Clean up test data
}
```

---

## 5. Visual Regression Tests (Optional)

```typescript
test('E2E-{CODE}-VR-001: {Feature} screen visual', async ({ page }) => {
  await page.goto('/{feature}');
  await expect(page).toHaveScreenshot('{feature}-screen.png');
});
```

---

## 6. Test Execution

### Run All {Feature} Tests
```bash
cd e2e && npx playwright test --project={feature-code}
```

### Run Specific Test
```bash
cd e2e && npx playwright test tests/{feature-code}/{feature}.spec.ts -g "E2E-{CODE}-001"
```

### Debug Mode
```bash
cd e2e && npx playwright test --project={feature-code} --debug
```

---

## Related Documentation

- **UI Requirements:** [ui-requirements.md](./ui-requirements.md)
- **Integration:** [integration.md](./integration.md)
- **Backend:** [backend-tdd.md](./backend-tdd.md)
- **Guide Reference:** `context/guides/Finance-Tracker-E2E-Testing-Guide-v1.md`
```

---

## PHASE 4: SUMMARY & CONFIRMATION

### Step 4.1: Display Summary

After creating all files, show:

```
## Feature Specification Created

**Feature:** {Feature Name}
**Code:** {feature-code}
**Location:** context/features/{feature-code}/

### Files Created:
- [x] README.md - Feature overview
- [x] ui-requirements.md - Frontend UI specifications
- [x] integration.md - API contracts & state management
- [x] backend-tdd.md - Backend BDD scenarios
- [x] infrastructure.md - Database migrations & infrastructure
- [x] e2e-scenarios.md - E2E test scenarios

### Next Steps:
1. Review specifications for completeness
2. Run `/implement-feature {feature-code}` to begin implementation
3. Run `/fix-e2e` after implementation to verify

### Key Implementation Areas:
- **Frontend:** {list of components/screens}
- **Backend:** {list of endpoints}
- **E2E Tests:** {number} scenarios defined
```

---

## GUIDELINES

### Quality Standards

1. **Completeness**: Every field, state, and interaction must be specified
2. **Consistency**: Use same terminology across all files
3. **Testability**: Every requirement must be verifiable
4. **No Ambiguity**: If something is unclear, ask before documenting

### Naming Conventions

- Feature codes: `M{number}-{name}` (e.g., `M6-rules`, `M12-recurring`)
- File names: `kebab-case.md`
- Test IDs: `E2E-{CODE}-{number}` (e.g., `E2E-RULES-001`)
- Data test IDs: `{component}-{element}` (e.g., `rule-card`, `save-btn`)

### Cross-References

Every file should link to related files:
- UI → Integration (what APIs it needs)
- Integration → Backend (what to implement)
- Backend → Integration (contracts to fulfill)
- E2E → All (validates everything)

---

## START NOW

1. Analyze the feature description: **$ARGUMENTS**
2. Investigate the codebase for related patterns
3. Ask clarifying questions using AskUserQuestion
4. Generate all specification files in order (UI → Integration → Backend → E2E)
5. Display summary with next steps
