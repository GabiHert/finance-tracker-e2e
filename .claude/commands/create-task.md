# Create a New Task

You are creating a comprehensive task specification based on the user's request: **$ARGUMENTS**

## TASK CREATION PROTOCOL

### Step 1: Investigate the Request

Before writing the task file, thoroughly investigate:

1. **Check for existing feature specs** in `context/features/`
   - If a feature spec exists for this task, use it as the primary source
   - Feature specs contain: ui-requirements.md, integration.md, backend-tdd.md, e2e-scenarios.md

2. **Read relevant context files:**
   - `context/features/{feature-code}/` - Feature-specific specs (preferred)
   - `context/` - Project-wide guides (for patterns and standards)

3. **Explore the codebase** to understand current implementation

4. **Check existing E2E tests** in `e2e/tests/` for related functionality

5. **Identify all files** that need to be created or modified

### Step 2: Create Task File

Create a task file at: `tasks/todo/TASK-{Descriptive-Name}.md`

The task file MUST follow this structure:

```markdown
# Task: {Clear Title}

## Overview

{Brief description of what needs to be done and why}

**Goal:** {One sentence describing the end result}

---

## Current State Analysis

### What Exists
{Describe current implementation, file locations, patterns used}

### What's Missing/Broken
{Describe the gap between current state and desired state}

---

## Execution Plan

{High-level phases of implementation}

### Phase 1: Create E2E Tests (TDD)
{E2E tests that will FAIL until implementation is complete}

### Phase 2: Backend Implementation (if applicable)
{Backend changes needed}

### Phase 3: Frontend Implementation (if applicable)
{Frontend changes needed}

### Phase 4: Verification
{How to verify the implementation is complete}

---

## Detailed Specifications

### E2E Test Scenarios

{Complete E2E test code or detailed scenarios}

### API Endpoints (if applicable)

{Request/response formats}

### Component Changes (if applicable)

{Exact code changes needed}

---

## Files to Create/Modify

### New Files:
- `path/to/new/file.ts` - Description

### Modified Files:
- `path/to/existing/file.ts` - What to change

---

## Step-by-Step Execution Instructions

### Step 1: {First step}
{Detailed instructions}

### Step 2: {Second step}
{Detailed instructions}

{... continue for all steps}

---

## Acceptance Criteria

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] All E2E tests pass
- [ ] No regressions in existing tests

---

## Related Documentation

- **File:** `context/{relevant-doc}.md` - {Why it's relevant}
- **Tests:** `e2e/tests/{relevant-tests}/` - {What they test}

---

## Commands to Run

```bash
# Create E2E tests and verify they fail
cd e2e && npx playwright test tests/{test-file}.spec.ts

# After implementation, verify tests pass
cd e2e && npx playwright test

# Build checks
cd frontend && npm run build
cd backend && make test
```
```

### Step 3: Confirm Creation

After creating the task file:
1. Display the file path
2. Summarize what the task will accomplish
3. List the key files that will be affected

---

## GUIDELINES FOR TASK CONTENT

### Be Comprehensive
- Include ALL context needed for implementation
- Provide exact code snippets where possible
- Reference specific line numbers when relevant

### Follow TDD Approach
- E2E tests MUST be defined first
- Tests should FAIL before implementation
- Tests should PASS after implementation

### Make It Self-Contained
- Task file should have everything needed to implement
- No need to reference external documents for critical info
- Include code examples, not just descriptions

### Include Verification Steps
- How to run tests
- How to verify visually (if applicable)
- What the expected outcome looks like

---

## CONTEXT FILES TO CHECK

Before creating the task, check these locations in order:

### Feature-Specific Specs (Preferred)
If the task relates to a specific feature, check `context/features/{feature-code}/`:
- `README.md` - Feature overview and dependencies
- `ui-requirements.md` - Frontend UI specifications
- `integration.md` - API contracts and state management
- `backend-tdd.md` - Backend BDD scenarios and implementation
- `e2e-scenarios.md` - E2E test scenarios

### Project-Wide Guides (For Patterns & Standards)
- `context/Finance-Tracker-Frontend-UI-Requirements-v3.md` - Full UI specs
- `context/finance-tracker-backend-tdd-v6.md` - Full backend API specs
- `context/Finance-Tracker-Implementation-Guide-Complete-v1.md` - Implementation guide
- `context/Finance-Tracker-E2E-Testing-Guide-v1.md` - E2E test patterns
- `context/Finance-Tracker-Integration-TDD-v1.md` - Integration patterns

---

## START NOW

1. Investigate the request: **$ARGUMENTS**
2. Explore relevant code and documentation
3. Create the comprehensive task file
4. Confirm creation with summary
