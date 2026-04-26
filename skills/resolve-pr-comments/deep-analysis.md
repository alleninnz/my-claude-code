# Deep Analysis

Use this for Critical/Major items and any Medium/Low item promoted with `review N`.

## Required Inputs

Before presenting, gather:

1. Focused diff for the file:
   ```bash
   git diff $(gh pr view --json baseRefName -q .baseRefName)...HEAD -- path/to/file
   ```
2. Function or method containing the flagged line.
3. Surrounding repo conventions: nearby code, tests, `CLAUDE.md`/`AGENTS.md`, linter config.
4. For PR-level comments or review bodies: PR description, changed-file summary, and related diff hunks.

If a file moved or disappeared, check rename history before deciding the comment is stale.

## Reviewer Signal

Use the signal matrix in `data-gather.md` as a prior for review order and scrutiny, not as proof:

- Human: never auto-skip; ambiguity usually becomes `Reply only` or `Defer`.
- CodeRabbit: high signal but real false positives; verify against current code.
- Codex: high signal but real false positives; verify against diff, tests, and repo conventions.
- Cursor: medium signal; verify against conventions.
- Copilot: low/variable signal; triage carefully.
- Unknown bot: low signal unless the evidence is concrete.

Signal quality is not correctness. Never recommend `Fix` only because the reviewer is high signal. Evidence from current code wins.

## Analysis Taxonomy

Classify the reviewer's concern before recommending:

| Type | Meaning | Usual recommendation |
| --- | --- | --- |
| Valid bug | Current behavior can break, corrupt data, leak, panic, or violate a contract. | Fix |
| Missing proof | Code may be fine, but tests or verification are missing for changed behavior. | Fix or Defer |
| Needs decision | Product/API/backward-compatibility tradeoff. | Defer or Reply only |
| Convention mismatch | Reviewer asks for something that conflicts with repo patterns. | Skip or Reply only |
| Already covered | Existing guard/test/implementation handles the concern. | Reply only or Skip |
| Stale | Diff moved or current code no longer has the issue. | Reply only or Skip |
| Noise | Style nit or incorrect bot claim with no practical value. | Skip |

## Severity Re-Evaluation

Upgrade or downgrade after reading code.

- Critical: security, data loss, normal-input panic/crash, state-corrupting race.
- Major: real correctness bug, missing error handling, API contract break, deploy/migration risk, resource leak.
- Medium: bounded edge case, missing test for changed behavior, maintenance readability concern.
- Low: naming, formatting, comment wording, optional simplification.

If a Critical/Major item downgrades below Major, move it to Medium/Low review.

## Presentation Template

```text
── 1/N ── [Major] ── [coderabbit] ──────────
Path: path/to/file.go:42

Problem:
This worker ignores `ctx.Done()`. If the request times out, it can keep running after the handler returns.

Wants:
Stop the worker when the request context is cancelled.

Evidence:
The function receives `ctx`, but the `select` only waits on work/results channels.

Analysis:
The reviewer is right. This is a request-lifecycle leak, and the fix is local.

Confidence: High
Recommendation: Fix
Reason: Add a `ctx.Done()` branch; it changes only cancellation behavior.

<details><summary>Original comment</summary>
...
</details>
```

For PR-level comments, include a `Signals:` section before `Problem`.

For grouped comments, synthesize all reviewer angles. Do not pick one comment and hide the rest.

## Language Rules

Write like an engineer explaining a PR review decision, not like a reviewer, marketer, or policy document.

### Style

- Use short, direct sentences.
- Put the conclusion first.
- One sentence should carry one idea.
- Prefer concrete nouns and verbs over abstractions.
- Name the exact function, field, query, branch, test, or config.
- Use "This breaks because...", "This is safe because...", or "I would skip this because..." when helpful.
- If disagreeing, say so directly and explain the code evidence.

### Field Duties

- **Problem:** what can go wrong in the current code.
- **Wants:** what the reviewer is asking to change.
- **Evidence:** the concrete code fact that supports or refutes the concern.
- **Analysis:** your judgment in 1-3 short sentences.
- **Reason:** why the recommendation is the right next action.

### Avoid

- Reviewer echo: "Consider adding...", "It is recommended that...", "Potential issue with..."
- Empty hedging: "may", "could potentially", "might be beneficial"
- Vague nouns: "thing", "logic", "handling", "issue", "scenario" without naming the concrete code
- Soft filler: "It is important to note", "Worth mentioning", "In this case"
- Fake balance: "While X is true, Y is also important" unless there is a real tradeoff
- Long chained sentences with multiple claims

### Before / After

Bad:
> This could potentially cause issues in certain scenarios, so it might be beneficial to consider adding cancellation handling.

Good:
> This worker ignores `ctx.Done()`. If the request times out, the goroutine can keep waiting after the handler returns.

Bad:
> The reviewer suggests improving error handling around the database operation.

Good:
> `CreateInvestor` drops the `Insert` error. The API can return success even when the row was not written.

## Recommendations

| Recommendation | Use when |
| --- | --- |
| Fix | A code/test/docs change belongs in this PR. |
| Defer | The concern is valid but should be tracked separately. Prepare a follow-up issue draft; do not claim it exists unless created. |
| Reply only | No code change is needed, but the reviewer deserves a technical answer. |
| Skip | No code change and no substantive reply beyond a concise resolution reason. |
