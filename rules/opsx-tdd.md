---
paths:
  - "**/*.go"
---

**IMPORTANT — This rule is non-negotiable. Every task implemented via `opsx:apply` MUST follow TDD discipline. No exceptions.**

If `superpowers:test-driven-development` is available, you MUST invoke it before writing any code. Otherwise, apply inline:

1. **RED** — Write a failing test for the task's behavior. Verify it fails correctly. **Do NOT skip to implementation.**
2. **GREEN** — Write minimal code to pass. Verify it passes.
3. **REFACTOR** — Clean up while staying green.

Mark task `[x]` only after all tests pass. **NEVER write production code without a failing test first.**
