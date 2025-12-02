---
description: Fix all E2E tests until 100% pass with zero failures and zero warnings
---

## Task

Ensure ALL tests pass by running the e2e tests repeatedly until every single validation passes successfully. You must not stop until 100% of tests are passing with ZERO warnings.

## Core Rules - MANDATORY COMPLIANCE

### 🚫 ABSOLUTELY FORBIDDEN ACTIONS

1. **DO NOT SKIP ANY TESTS** - This is strictly prohibited
1. **DO NOT IGNORE WARNINGS** - All warnings must be fixed, even if 100% of the tests are passing
1. **DO NOT DELETE ANY TESTS** - All tests must remain intact
1. **DO NOT COMMENT OUT TESTS** - All tests must stay active and executable
1. **DO NOT MODIFY TEST EXPECTATIONS** - Fix the code, not the tests
1. **DO NOT USE TEST IGNORE/SKIP FUNCTIONS** (e.g., test.skip(), describe.skip(), xit(), etc.)

### ✅ REQUIRED ACTIONS

1. **Run fresh tests**: Execute the E2E tests using npm run test:fresh
1. **Run the validation command**: Execute the E2E tests to check all tests
1. **Analyze all failures**: Carefully read every error message and failure report
1. **Fix all warnings**: Carefully read every warning message and failure report and fix until there are no warnings
1. **Fix the underlying code**: Modify source code to make tests pass. Create a detailed task description with context and pass it as argument to /implement-task command
1. **Re-run validation**: Execute the E2E tests again after each fix
1. **Repeat until success**: Continue this cycle until ALL tests pass (0 failures, 0 warnings)

## Success Criteria

- ✅ 100% of tests passing
- ✅ 0 failures
- ✅ 0 warnings
- ✅ All test scenarios remain intact and executable

**IMPORTANT**: It does not matter if the tests pass when warnings are present. We need to fix the code and not ignore warnings.
