---
description: Implement a task
---

Read @context/

Frontend tasks must be done in @frontend/ backend tasks in @backend/ and infrastructure tasks in @infra

When creating a backend task:

1. Use @backend/claude/prompts/feature-creation.txt to create feature in @backend/claude/pending
2. Use @.claude/agents/golang-clean-arch-specialist.md to execute the task
3. ALWAYS BDD FIRST
4. move to @backend/claude/done
5. When tests fail use /fix-tests
6. Always review the work done with @.claude/agents/golang-clean-arch-reviewer.md

When creating a frontend task:

1. Use @frontend/claude/prompts/feature-creation.txt to create feature in @frontend/claude/pending
2. Use agents to execute the task ALWAYS PLAYWRIGHT FIRST
3. move to @frontend/claude/done
4. When tests fail use /fix-tests

When you want my attention send me a notification with the notification mcp

Always use context7 for framework documentation. Always use @agent-Explore to investigation

Create TODO task lists. Always rely on @context/ .
