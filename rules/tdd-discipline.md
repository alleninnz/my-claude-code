---
paths:
  - "**/*.go"
---

# TDD Discipline

**CRITICAL — You MUST follow these rules during any TDD work. Violations break the review loop and waste cycles.**

**If AVAILABLE**, Invoke `superpowers:test-driven-development` at session start for the full workflow. This rule adds checkpoint pauses — it takes priority over the skill.

**ONE test at a time.** No batching tests or table rows. **NO EXCEPTION**.

**Checkpoint:** After every **3** green cycles, or when shifting test category (happy-path -> errors, switching function, unit -> integration), you **MUST** summarize what was added and **wait for user response** before continuing. **NEVER** skip or continue past a checkpoint without user input.
