---
paths:
  - "openspec/**"
---

When implementing tasks via `opsx:apply` slash command, each task MUST follow TDD discipline:

1. **RED** — Write a failing test for the task's behavior. Verify it fails correctly.
2. **GREEN** — Write minimal code to pass. Verify it passes.
3. **REFACTOR** — Clean up while staying green.
4. Mark task `[x]` only after all tests pass.

No production code without a failing test first. No exceptions.
