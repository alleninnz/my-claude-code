---
name: tdd-checkpoint
description: Use when doing TDD to enforce one-test-at-a-time discipline with periodic review checkpoints. Triggers on any red-green cycle work, test-driven implementation, or when tests are being written incrementally.
---

# TDD: Red-Green Checkpoint

**CRITICAL — Cycle one test case at a time. Never batch.**

## Cycle

For each test case: **Write ONE test → run (red) → implement → run (green) → then checkpoint logic below.**

After GREEN:

1. Increment the cycle counter (starts at 0; resets at each checkpoint)
2. Check for checkpoint trigger (see below)
3. Only then write the next test case

Table-driven tests: add one row at a time, red-green after each. Refactoring happens at checkpoints, not between cycles.

## Checkpoint Triggers

After each GREEN, pause for review if **either** condition is met:

- **Counter:** Every **2** completed red-green cycles
- **Boundary:** Shifting from happy-path to error/edge cases, moving to a different function, or switching from unit to integration tests

When in doubt, skip the boundary trigger — the counter catches it one cycle late at worst. Reset the counter after each checkpoint.

## Checkpoint Format

Produce this block and **wait for user input** before continuing:

```
## Review Checkpoint (cycles N-M)
- **Tests added:** [names/rows]
- **Implementation:** [files, functions changed]
- **All passing:** yes/no
- **Error handling:** [flagged concerns or "looks good"]
- **Best practices:** [violations of existing patterns, YAGNI, etc. — or "looks good"]
- **Edge cases:** [missing coverage — or "looks good"]
- **Refactoring:** [opportunities — or "none, code is clean"]
```

Then use `AskUserQuestion` with options: **"Continue" (Recommended)** and **"Request changes"**. If the user requests changes, address them before moving on.

## Anti-patterns

- Writing all tests/rows upfront before any implementation
- Adding "one more case" before verifying green
- Refactoring production code while a test is still red
- Skipping or continuing past a checkpoint without user response
