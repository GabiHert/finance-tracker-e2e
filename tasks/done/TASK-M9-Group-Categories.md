# Task: M9 Group Categories - Backend Implementation

## Overview

Implement the backend API endpoints for Group Categories. The frontend already has the UI components and API client ready (`GroupCategoriesTab.tsx`, `GroupCategoryModal.tsx`, and the groups API client), but the backend endpoints do not exist yet. The E2E test `E2E-M9-09: Admin should create group category` is failing because the API routes are not implemented.

**Goal:** Create backend endpoints for listing and creating categories within a group, enabling the E2E test to pass.

---

## Current State Analysis

### What Exists

**Backend:**
- Category entity supports both user and group ownership via `OwnerType` and `OwnerID` fields (`backend/internal/domain/entity/category.go`)
- Category repository already handles both user and group categories transparently
- Category use cases exist for Create, List, Update, Delete (`backend/internal/application/usecase/category/`)
- User category endpoints exist at `/categories` (`backend/internal/integration/entrypoint/controller/category.go`)
- Group controller handles group-specific operations (`backend/internal/integration/entrypoint/controller/group.go`)

**Frontend:**
- `GroupCategoriesTab.tsx` - UI for displaying and creating group categories
- `GroupCategoryModal.tsx` - Modal for creating/editing group categories
- API client functions in `frontend/src/main/features/groups/api/groups.ts`:
  - `fetchGroupCategories(groupId)` - calls `GET /groups/{groupId}/categories`
  - `createGroupCategory(groupId, input)` - calls `POST /groups/{groupId}/categories`
- Types defined in `frontend/src/main/features/groups/types.ts`

**E2E Test:**
- `E2E-M9-09` in `e2e/tests/m9-groups/groups.spec.ts` (lines 357-408) expects:
  1. Navigate to group detail screen
  2. Click Categories tab
  3. Click "new-category-btn"
  4. Fill category name and select type
  5. Save category
  6. Verify new category appears in list

### What's Missing/Broken

**Backend endpoints do not exist:**
```
GET  /api/v1/groups/:id/categories   → List group categories
POST /api/v1/groups/:id/categories   → Create group category
```

The frontend calls these endpoints, but they return 404 because no routes are registered.

**Required backend changes:**
1. Add new route handlers to the group controller (or create a new group category controller)
2. Register the routes in the router
3. Validate that the user is a member of the group before allowing access
4. Use existing category use cases with `OwnerType: "group"` and `OwnerID: groupID`

---

## Execution Plan

### Phase 1: BDD Feature File (TDD)

Create a BDD feature file describing the group categories behavior.

### Phase 2: Backend Implementation

1. Add `ListGroupCategories` and `CreateGroupCategory` handlers to `GroupController`
2. Create DTOs for group category requests/responses
3. Register routes in the router
4. Add authorization check (user must be group member)

### Phase 3: Verification

1. Run the E2E test `E2E-M9-09`
2. Verify all group-related E2E tests still pass
3. Run backend unit tests

---

## Detailed Specifications

### API Endpoints

#### GET /api/v1/groups/:id/categories

Lists all categories belonging to a group.

**Authorization:** User must be a member of the group.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | No | Filter by category type: "expense" or "income" |
| startDate | string | No | Start date for statistics (YYYY-MM-DD) |
| endDate | string | No | End date for statistics (YYYY-MM-DD) |

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Mercado",
    "type": "expense",
    "icon": "shopping-cart",
    "color": "#EF4444",
    "transaction_count": 15
  }
]
```

**Error Responses:**
- 401 Unauthorized - User not authenticated
- 403 Forbidden - User is not a member of the group
- 404 Not Found - Group does not exist

#### POST /api/v1/groups/:id/categories

Creates a new category for a group.

**Authorization:** User must be an admin of the group.

**Request Body:**
```json
{
  "name": "Mercado",
  "type": "expense",
  "color": "#EF4444"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | 1-50 characters |
| type | string | Yes | "expense" or "income" |
| color | string | Yes | Valid hex color (#XXXXXX) |

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Mercado",
  "type": "expense",
  "icon": "tag",
  "color": "#EF4444",
  "transaction_count": 0
}
```

**Error Responses:**
- 400 Bad Request - Invalid request body or validation error
- 401 Unauthorized - User not authenticated
- 403 Forbidden - User is not an admin of the group
- 404 Not Found - Group does not exist
- 409 Conflict - Category with this name already exists in the group

---

## Files to Create/Modify

### Modified Files:

1. **`backend/internal/integration/entrypoint/controller/group.go`**
   - Add `ListCategories` handler method
   - Add `CreateCategory` handler method
   - Add group membership validation helper
   - Add admin role validation helper

2. **`backend/internal/integration/entrypoint/dto/group.go`**
   - Add `CreateGroupCategoryRequest` struct
   - Add `GroupCategoryResponse` struct
   - Add `ToGroupCategoryResponse` transformer function
   - Add `ToGroupCategoryListResponse` transformer function

3. **`backend/internal/infra/server/router/router.go`** (or equivalent routes file)
   - Add route: `GET /groups/:id/categories`
   - Add route: `POST /groups/:id/categories`

4. **`backend/internal/infra/dependency/injector.go`** (or equivalent DI file)
   - Ensure `CategoryController` and category use cases are injected into `GroupController`

### New Files:

1. **`test/integration/features/group-categories.feature`**
   - BDD feature file for group categories

---

## Step-by-Step Execution Instructions

### Step 1: Create BDD Feature File

Create `/backend/test/integration/features/group-categories.feature`:

```gherkin
Feature: Group Categories Management
  As a group member
  I want to manage categories within a group
  So that we can organize our shared expenses

  Background:
    Given I am authenticated as a user
    And I am a member of a group

  Scenario: List group categories as member
    Given the group has categories
    When I request the group categories
    Then I should receive a list of categories

  Scenario: Create group category as admin
    Given I am an admin of the group
    When I create a category with name "Mercado" and type "expense"
    Then the category should be created
    And the category should appear in the group categories list

  Scenario: Cannot create group category as regular member
    Given I am a regular member of the group
    When I try to create a category
    Then I should receive a forbidden error

  Scenario: Cannot access categories of non-member group
    Given I am not a member of the group
    When I request the group categories
    Then I should receive a forbidden error
```

### Step 2: Add DTOs for Group Categories

In `backend/internal/integration/entrypoint/dto/group.go`, add:

```go
// CreateGroupCategoryRequest represents the request body for creating a group category.
type CreateGroupCategoryRequest struct {
    Name  string `json:"name" binding:"required,min=1,max=50"`
    Type  string `json:"type" binding:"required,oneof=expense income"`
    Color string `json:"color" binding:"required"`
}

// GroupCategoryResponse represents a category in API responses.
type GroupCategoryResponse struct {
    ID               string `json:"id"`
    Name             string `json:"name"`
    Type             string `json:"type"`
    Icon             string `json:"icon"`
    Color            string `json:"color"`
    TransactionCount int    `json:"transaction_count"`
}

// ToGroupCategoryResponse converts a CategoryWithStats to GroupCategoryResponse.
func ToGroupCategoryResponse(cat *entity.CategoryWithStats) GroupCategoryResponse {
    return GroupCategoryResponse{
        ID:               cat.ID.String(),
        Name:             cat.Name,
        Type:             string(cat.Type),
        Icon:             cat.Icon,
        Color:            cat.Color,
        TransactionCount: cat.TransactionCount,
    }
}

// ToGroupCategoryListResponse converts a slice of CategoryWithStats to a slice of GroupCategoryResponse.
func ToGroupCategoryListResponse(categories []*entity.CategoryWithStats) []GroupCategoryResponse {
    result := make([]GroupCategoryResponse, len(categories))
    for i, cat := range categories {
        result[i] = ToGroupCategoryResponse(cat)
    }
    return result
}
```

### Step 3: Add Handlers to GroupController

Update `backend/internal/integration/entrypoint/controller/group.go`:

1. Add category use cases to the controller struct:
```go
type GroupController struct {
    // ... existing fields ...
    listCategoriesUseCase   *category.ListCategoriesUseCase
    createCategoryUseCase   *category.CreateCategoryUseCase
}
```

2. Update the constructor to accept category use cases.

3. Add `ListCategories` handler:
```go
// ListCategories handles GET /groups/:id/categories requests.
func (c *GroupController) ListCategories(ctx *gin.Context) {
    userID, ok := middleware.GetUserIDFromContext(ctx)
    if !ok {
        ctx.JSON(http.StatusUnauthorized, dto.ErrorResponse{
            Error: "User not authenticated",
            Code:  string(domainerror.ErrCodeMissingToken),
        })
        return
    }

    groupIDStr := ctx.Param("id")
    groupID, err := uuid.Parse(groupIDStr)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
            Error: "Invalid group ID format",
        })
        return
    }

    // Verify user is member of the group
    isMember, err := c.groupRepo.IsUserMemberOfGroup(ctx.Request.Context(), userID, groupID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, dto.ErrorResponse{
            Error: "Failed to verify group membership",
        })
        return
    }
    if !isMember {
        ctx.JSON(http.StatusForbidden, dto.ErrorResponse{
            Error: "You are not a member of this group",
            Code:  string(domainerror.ErrCodeNotGroupMember),
        })
        return
    }

    // Build input for list categories use case
    input := category.ListCategoriesInput{
        OwnerType: entity.OwnerTypeGroup,
        OwnerID:   groupID,
    }

    // Parse optional query parameters
    if categoryType := ctx.Query("type"); categoryType != "" {
        catType := entity.CategoryType(categoryType)
        input.CategoryType = &catType
    }

    output, err := c.listCategoriesUseCase.Execute(ctx.Request.Context(), input)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, dto.ErrorResponse{
            Error: "Failed to retrieve categories",
        })
        return
    }

    response := dto.ToGroupCategoryListResponse(output.Categories)
    ctx.JSON(http.StatusOK, response)
}
```

4. Add `CreateCategory` handler:
```go
// CreateCategory handles POST /groups/:id/categories requests.
func (c *GroupController) CreateCategory(ctx *gin.Context) {
    userID, ok := middleware.GetUserIDFromContext(ctx)
    if !ok {
        ctx.JSON(http.StatusUnauthorized, dto.ErrorResponse{
            Error: "User not authenticated",
            Code:  string(domainerror.ErrCodeMissingToken),
        })
        return
    }

    groupIDStr := ctx.Param("id")
    groupID, err := uuid.Parse(groupIDStr)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
            Error: "Invalid group ID format",
        })
        return
    }

    // Verify user is admin of the group
    member, err := c.groupRepo.FindMemberByGroupAndUser(ctx.Request.Context(), groupID, userID)
    if err != nil {
        ctx.JSON(http.StatusForbidden, dto.ErrorResponse{
            Error: "You are not a member of this group",
            Code:  string(domainerror.ErrCodeNotGroupMember),
        })
        return
    }
    if member.Role != entity.MemberRoleAdmin {
        ctx.JSON(http.StatusForbidden, dto.ErrorResponse{
            Error: "Only group admins can create categories",
            Code:  string(domainerror.ErrCodeNotGroupAdmin),
        })
        return
    }

    // Parse request body
    var req dto.CreateGroupCategoryRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(http.StatusBadRequest, dto.ErrorResponse{
            Error: "Invalid request body: " + err.Error(),
            Code:  string(domainerror.ErrCodeMissingCategoryFields),
        })
        return
    }

    // Build input for create category use case
    input := category.CreateCategoryInput{
        Name:      req.Name,
        Color:     req.Color,
        Icon:      "tag", // Default icon for group categories
        OwnerType: entity.OwnerTypeGroup,
        OwnerID:   groupID,
        Type:      entity.CategoryType(req.Type),
    }

    output, err := c.createCategoryUseCase.Execute(ctx.Request.Context(), input)
    if err != nil {
        c.handleCategoryError(ctx, err)
        return
    }

    // Build response
    response := dto.GroupCategoryResponse{
        ID:               output.Category.ID.String(),
        Name:             output.Category.Name,
        Type:             string(output.Category.Type),
        Icon:             output.Category.Icon,
        Color:            output.Category.Color,
        TransactionCount: 0,
    }
    ctx.JSON(http.StatusCreated, response)
}
```

5. Add helper method for category errors:
```go
func (c *GroupController) handleCategoryError(ctx *gin.Context, err error) {
    var catErr *domainerror.CategoryError
    if errors.As(err, &catErr) {
        var statusCode int
        switch catErr.Code {
        case domainerror.ErrCodeCategoryNotFound:
            statusCode = http.StatusNotFound
        case domainerror.ErrCodeCategoryNameExists:
            statusCode = http.StatusConflict
        case domainerror.ErrCodeNotAuthorizedCategory:
            statusCode = http.StatusForbidden
        default:
            statusCode = http.StatusBadRequest
        }
        ctx.JSON(statusCode, dto.ErrorResponse{
            Error: catErr.Message,
            Code:  string(catErr.Code),
        })
        return
    }
    ctx.JSON(http.StatusInternalServerError, dto.ErrorResponse{
        Error: "An internal error occurred",
    })
}
```

### Step 4: Register Routes

In the router file, add the new routes under the groups route group:

```go
// Group category routes
groups.GET("/:id/categories", groupController.ListCategories)
groups.POST("/:id/categories", groupController.CreateCategory)
```

### Step 5: Update Dependency Injection

Ensure the `GroupController` constructor receives the category use cases and that the DI container wires them correctly.

---

## Acceptance Criteria

- [ ] `GET /api/v1/groups/:id/categories` returns categories for the group
- [ ] `POST /api/v1/groups/:id/categories` creates a new category for the group
- [ ] Only group members can list group categories
- [ ] Only group admins can create group categories
- [ ] E2E test `E2E-M9-09: Admin should create group category` passes
- [ ] All existing E2E tests still pass (no regressions)
- [ ] Backend unit tests pass
- [ ] BDD feature scenarios pass

---

## Related Documentation

- **Backend TDD:** `context/finance-tracker-backend-tdd-v6.md` - Section 4.4 Categories API specification
- **Frontend UI:** `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - Section 4.7.2 Group Detail View
- **E2E Tests:** `e2e/tests/m9-groups/groups.spec.ts` - Test E2E-M9-09
- **Existing Category Controller:** `backend/internal/integration/entrypoint/controller/category.go`
- **Existing Group Controller:** `backend/internal/integration/entrypoint/controller/group.go`

---

## Commands to Run

```bash
# Run the specific E2E test to verify (should FAIL before implementation)
cd e2e && npx playwright test tests/m9-groups/groups.spec.ts -g "E2E-M9-09"

# Run backend tests
cd backend && make test

# Run BDD integration tests (after creating feature file)
cd backend && make test-integration

# After implementation, verify E2E test passes
cd e2e && npx playwright test tests/m9-groups/groups.spec.ts -g "E2E-M9-09"

# Verify no regressions in M9 tests
cd e2e && npx playwright test tests/m9-groups/

# Build check
cd backend && go build ./...
```

---

## Implementation Notes

### Why Extend GroupController vs Create New Controller

The group category endpoints are scoped to `/groups/:id/categories`, making them logically part of the group API surface. Adding them to `GroupController` keeps related functionality together and allows reuse of group membership validation logic.

### Authorization Flow

1. **List Categories:** Any group member can view categories
2. **Create Category:** Only group admins can create categories (matches frontend behavior where the "New Category" button is only shown to admins)

### Reusing Existing Use Cases

The existing `ListCategoriesUseCase` and `CreateCategoryUseCase` already support the `OwnerType` and `OwnerID` pattern. We just need to pass `OwnerType: "group"` and `OwnerID: groupID` to leverage the existing business logic.

### Default Icon

Group categories don't support icon selection in the frontend (`GroupCategoryModal.tsx` doesn't have an icon picker), so we default to `"tag"` icon when creating group categories.
