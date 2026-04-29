# Review Interaction

Use clear, direct language. Keep sentences short. Lead with the decision-relevant point.

## Critical/Major Cards

Present Critical/Major items one at a time after reading `deep-analysis.md`.

Critical/Major is an inbox flow, not a review report. Present exactly one deduplicated item, ask for a decision on that item, and stop. A recommendation is allowed, but it is advisory only; the user must explicitly choose `Fix`, `Defer`, or `Reply only` (the three terminal actions) before you move to the next Critical/Major item. `Needs your decision` is an agent-side recommendation signal, not a user-selectable decision — see the Decision choices table.

Never show multiple Critical/Major cards in one response. Never ask the user to decide a set of Critical/Major items together. Never proceed from one Critical/Major item to another based on the recommendation alone, including obvious false positives.

Each item must include:

- Problem
- Wants
- Code evidence
- Confidence
- Recommendation
- Reason
- Original comment collapsed

For PR-level comments, display staleness signals before asking.

The one rule from `deep-analysis.md`: `Fix` requires concrete `Code evidence` (file:line + quote, grep/diff/test artifact). If `Code evidence` is `"no concrete evidence available; bot's claim is about <category>"` or otherwise non-concrete, the recommendation must be `Defer`, `Reply only`, or `Needs your decision`. The agent picks the right one based on the case (see the Recommendations table in `deep-analysis.md`); the user's decision menu is unchanged.

Recommendation values (agent output, displayed on the card): `Fix`, `Defer`, `Reply only`, `Needs your decision` (4 values).
Decision values (user choice, recorded as the action to publish): `Fix`, `Defer`, `Reply only` (3 values). `Needs your decision` is NOT a recordable decision — the publish protocol cannot process it. The user must convert it into one of the three terminal actions.

Decision choices:

| Choice | Meaning |
| --- | --- |
| Fix | Queue a code change. |
| Defer | Queue a follow-up issue draft or tracking note plus a reply. |
| Reply only | Queue a GitHub reply explaining why no code change is made, then resolve the thread. Reply length is per-comment judgment. |

Use `AskUserQuestion` with `["Fix", "Defer", "Reply only"]` in Claude Code. In Codex, ask and stop. Record the decision before showing the next Critical/Major item. When the agent's `Recommendation` is auto-derived as `Needs your decision`, present the steel-man clearly and ask the user to pick `Fix`, `Defer`, or `Reply only` based on their domain context — do not advance until one of those three terminal actions is recorded.

## Medium/Low Pages

Use compact cards by default. Present 5 items per page with global numbering. Medium/Low cards still require `Code evidence` for any `Fix` recommendation; the agent does not need a separate counter-argument step at this tier. Promote via `review N` to trigger the full Critical/Major presentation and one-at-a-time decision.

```text
── Medium/Low (13 comments) - Page 1/3 ──────────

#1 [Medium] [coderabbit] path/to/file.go:88 - Fix
Problem: handler ignores request cancellation.
Wants: stop the worker when the request context is cancelled.
Code evidence: file.go:88 — `select { case w := <-work: ... case r := <-results: ... }` has no `ctx.Done()` branch.
Recommendation: Fix.
Risk if skipped: timed-out requests can leave work running.

#2 [Low] [coderabbit] path/to/model.go:33 - Reply only
Problem: reviewer wants an unused option removed.
Wants: delete the option from this handler.
Code evidence: model.go:33 — option declared, never referenced in this file. Adjacent handlers keep the same unused option for interface symmetry (peer files: model_a.go:41, model_b.go:55).
Recommendation: Reply only.
Risk if skipped: low; preserves repo convention.

#4 [Medium] [coderabbit] path/to/migration.sql:None - Review
Problem: reviewer asks whether this migration is safe under concurrent writes.
Wants: confirmation or a plan.
Code evidence: no concrete evidence available; bot's claim is about cross-system process (production traffic + lock timing).
Recommendation: Review.
Risk if skipped: unknown; cannot verify within this repo.

Defaults:
Fix: #1
Reply only: #2, #3 (concrete code evidence shows mismatch)
Review: #4, #5 (no concrete evidence; NOT accepted by `ok all`)

Reply with: ok, ok all, fix 2, defer 3, reply 4, review 5, why 2
```

The agent picks the default `Recommendation` per the rule in `deep-analysis.md`:

- `Fix` — Code evidence has a concrete file:line + quote (or grep/diff/test artifact) that confirms a real bug.
- `Reply only` — Code evidence shows the bot's specific claim does not match current code (stale inline, line moved, already fixed).
- `Review` — Code evidence is `"no concrete evidence available; bot's claim is about <category>"`. The item cannot be confirmed or denied within this repo. **`Review`-default items are NOT accepted by `ok all`** — the user must explicitly run `review N` to promote into Critical/Major flow (which can land on `Fix`, `Defer`, `Reply only`, or `Needs your decision`), or directly type `fix N` / `defer N` / `reply N` based on domain context.

This guards against silent skip: medium/low items the agent could not actually verify cannot be batch-resolved by a hurried `ok all`.

## Commands

| Input | Behavior |
| --- | --- |
| `ok` or `done` | Confirm current page `Fix` and `Reply only` defaults. `Review`-default items are NOT confirmed; user must address them explicitly. |
| `ok all` | Same as `ok` but applies to current and all remaining Medium/Low pages. `Review`-default items are still NOT confirmed and stop the page until handled. |
| `fix N`, `fix 1,3`, `fix 1-4` | Queue fixes. |
| `defer N` | Queue follow-up/tracking reply. |
| `reply N`, `reply 1,3`, `reply 1-4` | Queue reply-only (no code change). |
| `review N`, `review all` | Promote to deep analysis one at a time using Critical/Major choices. |
| `why N` | Explain the recommendation without changing the decision. |

Users can combine commands, e.g. `fix 1, defer 2, review 4`.
