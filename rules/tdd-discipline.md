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

This rule applies when the user explicitly asks for TDD, when a plan or skill has entered a TDD workflow, or during `opsx:apply` tasks. For ordinary code changes outside a TDD workflow, follow the project's normal testing expectations instead.

**If AVAILABLE**, Invoke `superpowers:test-driven-development` at session start for the full workflow. This rule adds checkpoint pauses — it takes priority over the skill.

**RED → GREEN → REFACTOR for every TDD task.** No production code without a failing test first while this rule applies.

**ONE test at a time for new behavior. NO EXCEPTION.** You MUST NOT batch tests or stack table rows when driving out new code — each test drives the next increment, and skipping this hides design problems.

**Narrow exemption for refactors and optimizations of existing code.** When the existing logic is genuinely coupled and can only be covered as a unit, grouped or table-driven tests are permitted. You MUST still: (1) run the group RED before writing any production change, (2) go GREEN on the whole group before starting the next, (3) honor every checkpoint pause below. "Coupled" means the code under change cannot be meaningfully tested in smaller pieces — convenience is NOT a reason to invoke this exemption.

**Checkpoint:** After completing a review-worthy milestone, you **MUST** summarize what was added, what remains, and **wait for user response** before continuing.

A milestone is review-worthy only when the user can make a meaningful direction decision. A group boundary is:

- Completion of a plan task group that produces independently reviewable behavior
- Completion of an end-to-end behavior slice across the relevant layers
- Crossing a contract or risk boundary: schema, migration, proto, public API, permissions, data ownership, concurrency, or deployment behavior
- Discovery that invalidates the plan, changes scope, or requires choosing between implementation strategies
- Reaching a commit/review gate already defined elsewhere; use that gate as the checkpoint rather than adding a second pause

The following are NOT group boundaries by themselves:

- Happy-path → error cases within the same behavior slice
- Switching target functions while implementing the same approved behavior
- Adding adjacent edge cases or table rows under the same contract
- Unit → integration tests when the integration test only verifies the same slice
- Refactor cleanup required to keep the same slice green

Within a group, keep going through RED → GREEN → REFACTOR cycles. Send concise progress updates if useful, but do **NOT** wait unless a review-worthy milestone is reached. **NEVER** skip or continue past a checkpoint without user input.

**Auto mode does NOT relax TDD discipline.** The new-behavior-vs-refactor split above is the ONLY permitted relaxation. Checkpoint pauses between review-worthy milestones and waiting for user response remain **MANDATORY** — auto mode is NEVER a license to skip them.
