# Review Interaction

Use clear, direct language. Keep sentences short. Lead with the decision-relevant point.

## Critical/Major Cards

Present Critical/Major items one at a time after reading `deep-analysis.md`.

Each item must include:

- Problem
- Wants
- Evidence
- Analysis
- Confidence
- Recommendation
- Reason
- Original comment collapsed

For PR-level comments, display staleness signals before asking.

Decision choices:

| Choice | Meaning |
| --- | --- |
| Fix | Queue a code change. |
| Defer | Queue a follow-up issue draft or tracking note plus a reply. |
| Reply only | Queue a GitHub reply without code changes. |
| Skip | Do not change code; queue a concise skip reason if the thread will be resolved. |

Use `AskUserQuestion` with `["Fix", "Defer", "Reply only", "Skip"]` in Claude Code. In Codex, ask and stop.

## Medium/Low Pages

Use compact cards by default. Present 5 items per page with global numbering:

```text
── Medium/Low (13 comments) - Page 1/3 ──────────

#1 [Medium] [coderabbit] path/to/file.go:88 - Fix
Problem: handler ignores request cancellation.
Evidence: goroutine waits on work channel without a ctx.Done() branch.
Reason: local fix prevents work from surviving the request lifecycle.
Risk if skipped: timed-out requests can leave work running.

#2 [Low] [coderabbit] path/to/model.go:33 - Skip
Problem: reviewer wants an unused option removed.
Evidence: neighboring handlers keep the same unused option for interface symmetry.
Reason: preserving the option keeps this handler consistent with adjacent code.
Risk if skipped: low; preserves repo convention.

Defaults:
Fix: #1
Skip: #2, #3, #4, #5

Reply with: ok, ok all, fix 2, defer 3, reply 4, skip 1, review 5, why 2
```

## Commands

| Input | Behavior |
| --- | --- |
| `ok` or `done` | Confirm current page defaults. |
| `ok all` | Confirm defaults for current and all remaining Medium/Low pages. |
| `fix N`, `fix 1,3`, `fix 1-4` | Queue fixes. |
| `defer N` | Queue follow-up/tracking reply. |
| `reply N` | Queue reply-only. |
| `skip N`, `skip all` | Skip current page item(s). |
| `review N`, `review all` | Promote to deep analysis one at a time using Critical/Major choices. |
| `why N` | Explain the recommendation without changing the decision. |

Users can combine commands, e.g. `fix 1, defer 2, review 4`.
