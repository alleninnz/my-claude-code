---
paths:
  - "**/*.go"
---

# Go Code Quality

**CRITICAL — You MUST follow these rules before writing any Go code. Violations are treated as bugs.**

## Before writing a new function

Run this checklist in order. Stop at the first match:

1. **Existing codebase** — Does a function in the current repo already do this, or nearly this? Prefer reusing or extending it when that keeps the diff small and reduces current risk. Do not turn a narrow change into a broad refactor just to remove minor local duplication.
2. **Stdlib** — `slices`, `maps`, `strings`, `sort`, `bytes`, `cmp`, `sync`, `math/bits`, `crypto/*`, `encoding/*`, etc.
3. **Compiler intrinsics** — stdlib wrappers (`bits.Len`, `bits.OnesCount`, `sync/atomic`) compile to single instructions. A hand-rolled loop is ALWAYS worse.
4. **Libraries in go.mod** — Prefer existing project-approved dependencies such as `samber/lo`, `golang.org/x/*`, or local shared libraries already used in the repo.

If stdlib, compiler intrinsics, or an existing approved dependency directly covers the need, use it instead of writing a custom utility. If existing repo code is close but would require a risky or cross-package refactor, pause and explain the trade-off before expanding scope.

## Before adding a function that parallels an existing one

If you're about to create `fooWithX` alongside an existing `foo`:
- **STOP.** First consider whether `foo` should handle both cases by adding a parameter, changing the signature, or extracting shared logic.
- If the refactor is local and lowers risk, do it. If it causes broad caller churn or crosses package boundaries, ask before widening the diff.
