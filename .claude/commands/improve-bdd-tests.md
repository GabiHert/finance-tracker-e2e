---
description: Improve and generate more BDD tests for a given feature file following BDD best practices
---

Please invoke the @agent-golang-clean-arch-specialist to improve and generate more comprehensive BDD tests following these guidelines:

## Task
Analyze the specified .feature file and enhance it with additional test scenarios based on the provided context (curl commands, API responses, business rules, etc.).

## Core Principles

### Must Follow
1. **Follow @.claude/skills/bdd-feature-generator.md** - All patterns and step definitions from the BDD skill guide
2. **Only use existing step definitions** - Never create new step definitions
3. **Examine similar feature files** - Look at `/test/integration/features/` for patterns
4. **Use provided context** - Incorporate curl examples, API responses, and business requirements
5. **Maintain consistency** - Follow existing error code formats (e.g., "404", "400")

### Test Coverage Areas to Consider
1. **Validation Scenarios**:
   - Required field validation (empty strings, null values)
   - Invalid value validation (type errors, format errors)
   - Business rule violations
   - Edge cases and boundary conditions

2. **Success Scenarios**:
   - Minimal required fields
   - Full fields with all optional parameters
   - Database persistence validation
   - External API call validation
   - Event publishing validation (SNS)

3. **Error Scenarios**:
   - Authentication/Authorization failures
   - Resource not found (404)
   - Duplicate entries
   - Invalid state transitions
   - Business logic errors

4. **Integration Scenarios**:
   - External API interactions
   - Database state validation
   - Event-driven flows
   - Multi-step workflows

## Workflow

1. **Read the existing feature file** specified by the user
2. **Analyze provided context** (curl commands, responses, requirements)
3. **Identify gaps** in current test coverage
4. **Review similar features** for patterns to follow
5. **Generate new scenarios** using only existing step definitions
6. **Maintain proper structure**:
   - Use Scenario Outline for multiple validation cases
   - Use appropriate tags (@all, @success, @failure, @contract_fields_validation, etc.)
   - Follow naming conventions (kebab-case for files)
7. **Validate consistency** with existing patterns

## Output Format

Provide:
1. Analysis of current coverage gaps
2. Proposed new scenarios with rationale
3. Updated .feature file with new tests
4. Summary of improvements made

## Important Notes

- **NEVER create new step definitions** - only use steps from @.claude/skills/bdd-feature-generator.md
- **ALWAYS examine existing features** before adding new scenarios
- **FOLLOW exact patterns** from existing features
- **USE consistent error codes** and JSON structure
- **MAINTAIN feature file consistency** with the project style
- Feature files represent the specification - they should be comprehensive and clear

## User's Request

{USER_INPUT_WILL_BE_APPENDED_HERE}
