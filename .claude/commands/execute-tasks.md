# Execute All Pending Tasks

You are tasked with executing ALL pending tasks in `tasks/todo/` until completion.

## EXECUTION PROTOCOL

1. **List all tasks** in `tasks/todo/` directory
2. **Execute each task** in alphabetical order (or by priority if specified in filename)
3. **Follow TDD approach** for each task:
   - Create E2E tests FIRST (tests should FAIL initially)
   - Implement the solution
   - Verify tests PASS
   - Run full E2E suite to check for regressions
4. **Move completed tasks** from `tasks/todo/` to `tasks/done/`
5. **DO NOT STOP** until `tasks/todo/` is empty and all E2E tests pass

## FOR EACH TASK FILE

```
1. Read the task file completely: tasks/todo/TASK-{name}.md
2. Create E2E tests as specified (if not already existing)
3. Run tests to confirm they FAIL: cd e2e && npx playwright test {test-file}
4. Implement the fix following the task specification
5. Run tests to confirm they PASS
6. Run full E2E suite: cd e2e && npx playwright test
7. If all tests pass, move the task: mv tasks/todo/TASK-{name}.md tasks/done/
8. COMMIT changes in all sub repositories (see COMMIT PROTOCOL below)
9. Proceed to next task
```

## COMMIT PROTOCOL

After each task is completed and moved to `tasks/done/`, commit all changes in each sub repository that has modifications.

**IMPORTANT:** Do NOT include co-author tags in commit messages.

### Check and commit each repository:

```bash
# For each repository, check for changes and commit if any exist:

# E2E
cd e2e && git status
# If changes exist:
git add -A && git commit -m "feat: TASK-{name} - {brief description}"

# Backend
cd ../backend && git status
# If changes exist:
git add -A && git commit -m "feat: TASK-{name} - {brief description}"

# Frontend
cd ../frontend && git status
# If changes exist:
git add -A && git commit -m "feat: TASK-{name} - {brief description}"

# Infra
cd ../infra && git status
# If changes exist:
git add -A && git commit -m "feat: TASK-{name} - {brief description}"

# Return to root
cd ..
```

### Commit message format:
- Use `feat:` for new features
- Use `fix:` for bug fixes
- Use `test:` for test-only changes
- Include the task name (e.g., `TASK-Add-Rules-Navigation-Link`)
- Add a brief description of what changed in that specific repository

## TASK-SPECIFIC COMMANDS

### For Frontend-only tasks:
- Modify files in `frontend/src/`
- Run: `cd frontend && npm run build` to check for TypeScript errors

### For Backend tasks:
- Use the `/implement-task` command with backend context
- Run: `cd backend && make test` to verify

### For Full-stack tasks:
- Implement backend first, then frontend
- Use `/implement-task` for each layer

## E2E ENVIRONMENT

If E2E environment is not running:
```bash
cd e2e
npm run start        # Start all services
npm run wait         # Wait for services to be ready
```

## COMPLETION CRITERIA

You are DONE only when:
- [ ] `tasks/todo/` directory is EMPTY
- [ ] All E2E tests pass: `cd e2e && npx playwright test`
- [ ] No TypeScript errors: `cd frontend && npm run build`
- [ ] No backend errors: `cd backend && make test`
- [ ] All changes committed in sub repositories (e2e, backend, frontend, infra)

## START NOW

Begin by listing all tasks in `tasks/todo/` and start with the first one.
