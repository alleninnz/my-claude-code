---
paths:
  - "**/*.go"
---

# TDD: One Test at a Time

**CRITICAL — You MUST cycle one test case at a time. Never batch.**

## Cycle

For each test case, complete the full cycle before writing the next:

1. **Write ONE test** — a single `func Test*` or one row in a table-driven test
2. **Run it** — verify it fails for the right reason (red)
3. **Implement** — write minimal code to make it pass
4. **Run it** — verify it passes (green)
5. **Increment the cycle counter** (starts at 0; resets at each checkpoint)
6. **Check for checkpoint trigger** (see below)
7. **Only then** write the next test case

Table-driven tests are fine — add one row at a time, running red-green after each row.

## Review Checkpoints

After each GREEN, before writing the next test, check whether to pause for review. Checkpoints trigger two ways:

1. **Counter trigger:** After every **2** completed RED-GREEN cycles, pause for review. Reset the counter after each checkpoint.
2. **Boundary trigger:** Before writing the next RED test, if you detect a semantic boundary, pause for review regardless of counter value. Reset the counter.

**Semantic boundaries:**

- Shifting from happy-path tests to error/edge-case tests
- Moving to a different function or method under test
- Switching from unit-level to integration-level tests

Boundary detection is your judgment call. When in doubt, skip the boundary trigger and let the counter catch it — the worst case is reviewing one cycle late.

**Flow:**

```
RED -> verify RED -> GREEN -> verify GREEN -> increment counter
  -> boundary detected?  -> CHECKPOINT -> reset counter -> next test
  -> counter hits 2?     -> CHECKPOINT -> reset counter -> next test
  -> counter < 2, no boundary  -> next test
```

## Checkpoint Format

When a checkpoint triggers, produce this block and **wait for the user to respond** before continuing. Number cycles sequentially from 1, resetting after each checkpoint (N = first cycle in batch, M = last):

```
## Review Checkpoint (cycles N-M)

### Summary
- **Tests added:** list of test names/table rows
- **Implementation:** what was added/changed (files, functions)
- **All tests passing:** yes/no

### Quality Review
- **Error handling:** [flagged concerns or "looks good"]
- **Best practices:** [any violations of existing patterns, YAGNI, etc.]
- **Edge cases:** [any missing coverage noticed]

### Refactoring Opportunities
- [suggested improvements, or "none -- code is clean"]

> Continue, or would you like changes?
```

If the user says "continue" (or equivalent), reset the counter and proceed.
If the user requests changes, address them before moving on.

## Anti-patterns

- Writing all test cases or table rows upfront before any implementation
- Writing multiple `func Test*` functions before running any of them
- Adding "one more case while I'm here" before verifying green
- Skipping a checkpoint to save time
- Continuing past a semantic boundary without review
- Treating the checkpoint as optional when the user hasn't responded
