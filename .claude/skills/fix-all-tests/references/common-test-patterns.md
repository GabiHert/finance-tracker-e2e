# Common Test Patterns and Fixes

## Test Framework Commands

### JavaScript/TypeScript
- **Jest**: `npm test`, `npm run test`, `jest`
- **Mocha**: `npm test`, `mocha`
- **Vitest**: `npm run test`, `vitest`
- **Validation suites**: `npm run validate`, `npm run test:all`

### Python
- **pytest**: `pytest`, `python -m pytest`
- **unittest**: `python -m unittest`
- **tox**: `tox`

### Go
- **go test**: `go test ./...`, `go test -v ./...`
- **goconvey**: `goconvey`

### Java
- **JUnit**: `mvn test`, `gradle test`
- **TestNG**: `mvn test`, `gradle test`

### Ruby
- **RSpec**: `rspec`, `bundle exec rspec`
- **Minitest**: `rake test`, `ruby -Itest test/*`

## Common Test Failure Categories

### 1. Assertion Failures
**Symptoms:**
- Expected value doesn't match actual value
- `Expected: X, Received: Y`
- `AssertionError`

**Common Fixes:**
- Update implementation to return correct value
- Fix calculation logic
- Correct data transformation
- Handle edge cases properly

### 2. Type Errors
**Symptoms:**
- `TypeError: Cannot read property of undefined`
- `AttributeError` (Python)
- Type mismatch errors

**Common Fixes:**
- Add null/undefined checks
- Initialize variables properly
- Ensure correct types are returned
- Add type guards or assertions

### 3. Async/Await Issues
**Symptoms:**
- `Timeout exceeded`
- `UnhandledPromiseRejectionWarning`
- Tests passing inconsistently

**Common Fixes:**
- Add proper `await` keywords
- Return promises correctly
- Increase timeout for slow operations
- Mock external API calls

### 4. Missing Dependencies
**Symptoms:**
- `Module not found`
- `Cannot find module`
- Import errors

**Common Fixes:**
- Install missing packages
- Fix import paths
- Check for typos in import statements
- Ensure build output exists

### 5. State Management Issues
**Symptoms:**
- Tests fail when run together but pass individually
- Inconsistent test results
- "Already exists" errors

**Common Fixes:**
- Add proper setup/teardown
- Clear state between tests
- Use fresh instances for each test
- Reset mocks and spies

## Warning Categories

### 1. Deprecation Warnings
**Common Fixes:**
- Update to newer API methods
- Replace deprecated functions
- Update dependencies to newer versions

### 2. Linting Warnings
**Common Fixes:**
- Fix code style issues
- Add missing semicolons
- Fix indentation
- Remove unused variables

### 3. Type Warnings (TypeScript/Flow)
**Common Fixes:**
- Add proper type annotations
- Fix type mismatches
- Handle all possible types in unions

### 4. Security Warnings
**Common Fixes:**
- Update vulnerable dependencies
- Use secure methods
- Sanitize inputs
- Fix potential injection points

## Test Organization Best Practices

### Setup and Teardown
```javascript
// JavaScript/Jest example
beforeEach(() => {
  // Reset state
  // Initialize test data
});

afterEach(() => {
  // Clean up
  // Clear mocks
});
```

### Mocking External Dependencies
```javascript
// Mock external services
jest.mock('./api-client');

// Mock timers
jest.useFakeTimers();
```

### Test Data Management
- Use factories for test data
- Keep test data close to tests
- Use realistic data
- Cover edge cases

## Debugging Strategies

### 1. Isolate Failing Tests
- Run single test file
- Run single test case
- Use `.only()` temporarily for debugging

### 2. Add Debug Output
- Console.log key variables
- Use debugger statements
- Enable verbose test output

### 3. Check Test Environment
- Verify environment variables
- Check database connections
- Ensure services are running

### 4. Review Recent Changes
- Check git diff
- Review recent commits
- Identify what changed

## Framework-Specific Tips

### Jest
- Clear cache: `jest --clearCache`
- Update snapshots: `jest --updateSnapshot`
- Run in watch mode: `jest --watch`
- Debug mode: `node --inspect-brk jest`

### Pytest
- Verbose output: `pytest -vv`
- Show local variables: `pytest -l`
- Stop on first failure: `pytest -x`
- Run specific test: `pytest path/to/test.py::test_name`

### Go Test
- Verbose mode: `go test -v`
- Run specific test: `go test -run TestName`
- Show coverage: `go test -cover`
- Race detection: `go test -race`

## Common Anti-Patterns to Avoid

1. **Never modify tests to make them pass** - Fix the implementation
2. **Don't skip difficult tests** - They often catch important bugs
3. **Avoid hardcoding expected values** - Use constants or calculations
4. **Don't ignore flaky tests** - Fix the underlying issue
5. **Never comment out failing tests** - Keep them active and fix them
