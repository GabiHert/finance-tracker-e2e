# BDD Feature Patterns and Examples

## Feature File Structure

```gherkin
#language: en
#utf-8

@all @feature_tag
Feature: Feature name functionality

  Background:
    Given the tables are empty
    And the header is empty
    # Environment setup
    And the "ENV_VAR" env var is set to "value"
    # AWS secrets setup
    And the aws secret named "api-secret" exists with the following values
    """
    {
      "KEY": "value"
    }
    """
    # External API mocks
    And the 0 "POST" request to "/oauth2/token" returns status 200 with the following response
    """
    {
      "access_token": "token..."
    }
    """

  @tag1 @tag2
  Scenario Outline: Feature action failure - validation message
    When I call "POST" "/v1/resource" with the following payload
    """
    {
        "field1": <field1>,
        "field2": <field2>
    }
    """
    Then the status returned should be 400
    And the response should contain the field "error.code" equal to "CODE-01400"
    And the response should contain the field "error.description" equal to "Bad request"
    And the response should contain the field "error.error_details.0.attribute" equal to "<attribute>"
    And the response should contain the field "error.error_details.0.messages.0" equal to "<message>"

    Examples:
      | field1  | field2  | attribute | message                    |
      | ""      | "valid" | field1    | REQUIRED_ATTRIBUTE_MISSING |
      | null    | "valid" | field1    | REQUIRED_ATTRIBUTE_MISSING |
      | "valid" | ""      | field2    | REQUIRED_ATTRIBUTE_MISSING |
      | "valid" | "bad"   | field2    | INVALID_VALUE              |

  @tag1 @tag2
  Scenario: Feature action success - response validation
    When I call "POST" "/v1/resource" with the following payload
    """
    {
        "field1": "value1",
        "field2": "value2"
    }
    """
    Then the status returned should be 201
    And the response should contain the field "id" equal to "not nil"
    And the response should contain the field "field1" equal to "value1"
    And the response should contain the field "created_at" equal to "not nil"

  @tag1 @tag2
  Scenario: Feature action success - database validation
    When I call "POST" "/v1/resource" with the following payload
    """
    {
        "field1": "value1",
        "field2": "value2"
    }
    """
    Then the status returned should be 201
    Then the db should contain 1 objects in the "table_name" table
    Then the db should contain 1 objects in "table_name" with the values
    """
    {
        "id": "not nil",
        "field1": "value1",
        "field2": "value2"
    }
    """
```

## Common Scenario Patterns

### 1. Validation Scenarios (Scenario Outline)

Use for testing multiple validation cases:

```gherkin
@contract_fields_validation
Scenario Outline: Create entity failure - bad request
    When I call "POST" "/v1/entities" with the following payload
    """
    {
        "name": <name>,
        "email": <email>,
        "age": <age>
    }
    """
    Then the status returned should be 400
    And the response should contain the field "error.code" equal to "ENT-01400"
    And the response should contain the field "error.error_details.0.attribute" equal to "<attribute>"
    And the response should contain the field "error.error_details.0.messages.0" equal to "<message>"

    Examples:
      | name   | email          | age | attribute | message                    |
      | ""     | "test@atest.com"| 25  | name      | REQUIRED_ATTRIBUTE_MISSING |
      | null   | "test@atest.com"| 25  | name      | REQUIRED_ATTRIBUTE_MISSING |
      | "John" | ""             | 25  | email     | REQUIRED_ATTRIBUTE_MISSING |
      | "John" | "invalid"      | 25  | email     | INVALID_EMAIL_FORMAT       |
      | "John" | "test@atest.com"| -1  | age       | INVALID_VALUE              |
```

### 2. Success Scenarios with DB Validation

```gherkin
@success @database_validation
Scenario: Create entity success - all fields
    Given the "users" exists
    """
    [
      {
        "id": "user-123",
        "name": "Test User"
      }
    ]
    """
    When I call "POST" "/v1/entities" with the following payload
    """
    {
        "name": "Entity Name",
        "description": "Entity Description",
        "user_id": "user-123",
        "metadata": {
            "category": "A",
            "priority": "high"
        }
    }
    """
    Then the status returned should be 201
    And the response should contain the field "id" equal to "not nil"
    And the response should contain the field "name" equal to "Entity Name"
    And the db should contain 1 objects in "entities" with the values
    """
    {
        "id": "not nil",
        "name": "Entity Name",
        "description": "Entity Description",
        "user_id": "user-123",
        "metadata": "not nil"
    }
    """
```

### 3. List/Pagination Scenarios

```gherkin
@list @pagination
Scenario: List entities with pagination
    Given the "entities" exists
    """
    [
      {"id": "1", "name": "Entity 1", "created_at": "2024-01-01T00:00:00Z"},
      {"id": "2", "name": "Entity 2", "created_at": "2024-01-02T00:00:00Z"},
      {"id": "3", "name": "Entity 3", "created_at": "2024-01-03T00:00:00Z"}
    ]
    """
    When I call "GET" "/v1/entities?page_size=2&page=1"
    Then the status returned should be 200
    And the response should contain the field "items" array length equal to 2
    And the response should contain the field "items.0.id" equal to "3"
    And the response should contain the field "items.1.id" equal to "2"
    And the response should contain the field "pagination.page" equal to "1"
    And the response should contain the field "pagination.page_size" equal to "2"
    And the response should contain the field "pagination.total" equal to "3"
```

### 4. External API Integration

```gherkin
@external_api
Scenario: Process with external API validation
    Given the 0 "POST" request to "/external/validate" returns status 200 with the following response
    """
    {
        "valid": true,
        "score": 95.5
    }
    """
    When I call "POST" "/v1/process" with the following payload
    """
    {
        "data": "test-data"
    }
    """
    Then the status returned should be 200
    And the 0 "POST" request for "/external/validate" json body should have the variable "data" with value "test-data"
```

### 5. Event Publishing

```gherkin
@events @sns
Scenario: Action publishes event to SNS
    When I call "POST" "/v1/entities" with the following payload
    """
    {
        "name": "New Entity"
    }
    """
    Then the status returned should be 201
    And the sns topic "arn:aws:sns:us-east-1:123456:entity-created" should have 1 messages published
    And the sns topic "arn:aws:sns:us-east-1:123456:entity-created" should have a message published with "entity_id" field equal to "not nil"
    And the sns topic "arn:aws:sns:us-east-1:123456:entity-created" should have a message published with "name" field equal to "New Entity"
```

## Error Code Patterns

Error codes follow the pattern: `PREFIX-ERRNUM`
- PREFIX: 3-letter module identifier (e.g., USR for users, CLI for clients)
- ERRNUM: 5-digit error number (e.g., 01400 for bad request)

Common error codes:
- `XXX-01400` - Bad request (validation errors)
- `XXX-01404` - Not found
- `XXX-01403` - Forbidden
- `XXX-01401` - Unauthorized
- `XXX-01409` - Conflict (duplicate)
- `XXX-01500` - Internal server error

## Special Values

- `"not nil"` - Assert field exists and is not null/empty
- `"nil"` - Assert field is null/empty
- `null` - JSON null value in examples
- `""` - Empty string value

## Naming Conventions

### Files
- File name: `feature-name.feature` (kebab-case)
- Location: `/test/integration/features/`

### Scenarios
- Format: `Action subject status - validation type`
- Examples:
  - "Create client failure - bad request"
  - "List users success - with pagination"
  - "Update entity failure - not found"
  - "Delete resource success - cascade deletion"

### Tags
- `@all` - Always include for all test runs
- Feature-specific tag (e.g., `@create_client`, `@list_users`)
- Category tags:
  - `@success` - Success scenarios
  - `@error` - Error scenarios
  - `@contract_fields_validation` - Field validation
  - `@response_validation` - Response structure
  - `@external_api` - External API integration
  - `@events` - Event publishing
  - `@database_validation` - DB state validation
