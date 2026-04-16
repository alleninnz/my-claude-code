---
paths:
  - "**/*.go"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.rs"
---

# TDD Discipline

**CRITICAL — You MUST follow these rules during any TDD work. Violations break the review loop and waste cycles.**

**If AVAILABLE**, Invoke `superpowers:test-driven-development` at session start for the full workflow. This rule adds checkpoint pauses — it takes priority over the skill.

**RED → GREEN → REFACTOR every task.** No production code without a failing test first. Applies to every task during `opsx:apply` and to any other TDD work.

**ONE test at a time for new behavior. NO EXCEPTION.** You MUST NOT batch tests or stack table rows when driving out new code — each test drives the next increment, and skipping this hides design problems.

**Narrow exemption for refactors and optimizations of existing code.** When the existing logic is genuinely coupled and can only be covered as a unit, grouped or table-driven tests are permitted. You MUST still: (1) run the group RED before writing any production change, (2) go GREEN on the whole group before starting the next, (3) honor every checkpoint pause below. "Coupled" means the code under change cannot be meaningfully tested in smaller pieces — convenience is NOT a reason to invoke this exemption.

**Checkpoint:** After completing a logical group of cycles, you **MUST** summarize what was added and **wait for user response** before continuing. A group boundary is:

- A task group from the plan (e.g., `## 3. Handler — Per-Method Validation`)
- A category shift: happy-path → error cases, switching target function, unit → integration tests
- Whichever comes first

Within a group, keep going — do **NOT** pause at a fixed cycle count. **NEVER** skip or continue past a checkpoint without user input.

**Auto mode does NOT relax TDD discipline.** The new-behavior-vs-refactor split above is the ONLY permitted relaxation. Checkpoint pauses between task groups and waiting for user response remain **MANDATORY** — auto mode is NEVER a license to skip them.
