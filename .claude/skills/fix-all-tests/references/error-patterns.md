# Test Error Message Patterns

## JavaScript/TypeScript Error Patterns

### Jest/Vitest Errors
```
Expected: "value"
Received: "different value"
```
**Fix:** Update implementation to return expected value

```
expect(received).toBe(expected)
Expected: 5
Received: undefined
```
**Fix:** Ensure function returns a value, check for missing return statement

```
TypeError: Cannot read properties of undefined (reading 'property')
```
**Fix:** Add null checks, initialize objects properly

```
ReferenceError: variable is not defined
```
**Fix:** Declare variable, fix typo, or import missing module

### Async Errors
```
Timeout - Async callback was not invoked within the 5000ms timeout
```
**Fix:** Add await, increase timeout, or mock slow operations

```
UnhandledPromiseRejectionWarning: Error
```
**Fix:** Add try/catch or .catch() handler

## Python Error Patterns

### Pytest Errors
```
AssertionError: assert 5 == 10
```
**Fix:** Correct the implementation logic

```
AttributeError: 'NoneType' object has no attribute 'method'
```
**Fix:** Check for None before accessing attributes

```
ImportError: No module named 'module_name'
```
**Fix:** Install package or fix import path

```
TypeError: function() takes 2 positional arguments but 3 were given
```
**Fix:** Correct function signature or call

## Go Error Patterns

```
--- FAIL: TestFunction (0.00s)
    file_test.go:10: Expected 5, got 3
```
**Fix:** Correct implementation to return expected value

```
panic: runtime error: index out of range [5] with length 3
```
**Fix:** Add bounds checking

```
undefined: functionName
```
**Fix:** Define function or fix typo

## Common Warning Patterns

### Deprecation Warnings
```
DeprecationWarning: function() is deprecated, use new_function() instead
```
**Fix:** Replace with recommended alternative

```
Warning: componentWillMount has been renamed
```
**Fix:** Update to new lifecycle methods

### Linting Warnings
```
'variable' is assigned a value but never used
```
**Fix:** Remove unused variable or use it

```
Missing semicolon
```
**Fix:** Add semicolon

```
Unexpected console statement
```
**Fix:** Remove or replace with proper logging

### Security Warnings
```
High severity vulnerability found in package
```
**Fix:** Update vulnerable dependency

```
Potential security vulnerability: SQL injection
```
**Fix:** Use parameterized queries

## Test Output Patterns

### Test Summary Patterns
```
Tests: 45 passed, 3 failed, 48 total
```
**Action:** Focus on the 3 failed tests

```
Test Suites: 10 passed, 2 failed, 12 total
```
**Action:** Check the 2 failed test suites

```
Snapshots: 2 obsolete
```
**Action:** Update or remove obsolete snapshots

### Coverage Patterns
```
Coverage: 75% (threshold: 80%)
```
**Action:** Add tests to increase coverage

```
Uncovered lines: 45-50, 72-75
```
**Action:** Write tests for uncovered lines

## Validation Output Patterns

### npm run validate
```
> project@1.0.0 validate
> npm run test && npm run lint && npm run type-check

FAIL src/component.test.js
PASS src/utils.test.js

Test Suites: 1 failed, 1 passed, 2 total
Tests: 2 failed, 8 passed, 10 total
```
**Action:** Fix the 2 failing tests in component.test.js

### Multi-step Validation
```
Step 1/3: Running tests... ✓
Step 2/3: Running linter... ✗
  5 errors, 10 warnings
Step 3/3: Type checking... ✓
```
**Action:** Fix linting errors and warnings

## Error Location Patterns

### Stack Traces
```
at Object.<anonymous> (src/utils.js:25:15)
at processTicksAndRejections (internal/process/task_queues.js:95:5)
```
**Action:** Check line 25 of src/utils.js

### File and Line References
```
src/components/Button.tsx:45:10 - error TS2322: Type 'string' is not assignable to type 'number'.
```
**Action:** Fix type error at line 45, column 10 in Button.tsx

## Test Naming Patterns

### Descriptive Test Names
```
✓ should return sum of two numbers (2ms)
✗ should handle negative numbers (5ms)
✓ should throw error for non-numeric input (1ms)
```
**Action:** Focus on "should handle negative numbers" test

### Nested Describes
```
Calculator
  addition
    ✓ adds positive numbers
    ✗ adds negative numbers
  subtraction
    ✓ subtracts positive numbers
```
**Action:** Fix addition of negative numbers

## Resolution Strategies by Pattern

1. **Expected vs Received**: Update implementation
2. **Type Errors**: Add type checking and validation
3. **Undefined/Null Errors**: Add defensive checks
4. **Timeout Errors**: Fix async handling
5. **Import Errors**: Fix paths or install packages
6. **Deprecation**: Update to newer APIs
7. **Linting**: Fix style issues
8. **Security**: Update dependencies or fix vulnerabilities
