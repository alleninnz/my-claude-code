---
paths:
  - "**/*.go"
---

# TDD: One Test at a Time

**CRITICAL — You MUST cycle one test case at a time. Never batch.**

For each test case, complete the full cycle before writing the next:

1. **Write ONE test** — a single `func Test*` or one row in a table-driven test
2. **Run it** — verify it fails for the right reason (red)
3. **Implement** — write minimal code to make it pass
4. **Run it** — verify it passes (green)
5. **Only then** write the next test case

Table-driven tests are fine — add one row at a time, running red-green after each row.

## Anti-patterns

- Writing all test cases or table rows upfront before any implementation
- Writing multiple `func Test*` functions before running any of them
- Adding "one more case while I'm here" before verifying green
