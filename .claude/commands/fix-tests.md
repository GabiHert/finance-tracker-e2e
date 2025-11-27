---
description: Fix all BDD tests until 100% pass with zero failures and zero warnings
---

Please invoke the @agent-golang-clean-arch-specialist to fix all BDD tests following these strict guidelines:

## Task
Ensure ALL tests pass by running the BDD tests repeatedly until every single validation passes successfully. You must not stop until 100% of tests are passing with ZERO warnings.

## Core Rules - MANDATORY COMPLIANCE

### 🚫 ABSOLUTELY FORBIDDEN ACTIONS
1. **DO NOT SKIP ANY TESTS** - This is strictly prohibited
2. **DO NOT IGNORE WARNINGS** - All warnings must be fixed, even if 100% of the tests are passing
3. **DO NOT DELETE ANY TESTS** - All tests must remain intact
4. **DO NOT COMMENT OUT TESTS** - All tests must stay active and executable
5. **DO NOT MODIFY TEST EXPECTATIONS** - Fix the code, not the tests
6. **DO NOT USE TEST IGNORE/SKIP FUNCTIONS** (e.g., test.skip(), describe.skip(), xit(), etc.)

### ✅ REQUIRED ACTIONS
1. **Run the validation command**: Execute the BDD tests to check all tests
2. **Analyze all failures**: Carefully read every error message and failure report
3. **Fix all warnings**: Carefully read every warning message and failure report and fix until there are no warnings
4. **Fix the underlying code**: Modify source code to make tests pass
5. **Re-run validation**: Execute the BDD tests again after each fix
6. **Repeat until success**: Continue this cycle until ALL tests pass (0 failures, 0 warnings)

## Success Criteria
- ✅ 100% of tests passing
- ✅ 0 failures
- ✅ 0 warnings
- ✅ All test scenarios remain intact and executable

**IMPORTANT**: It does not matter if the tests pass when warnings are present. We need to fix the code and not ignore warnings.
