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
| Needs decision | Product/API/backward-compatibility tradeoff, or refutation cannot be confirmed within this repo. | Defer, Reply only, or Needs your decision |
| Convention mismatch | Reviewer asks for something that conflicts with repo patterns. | Reply only |
| Already covered | Existing guard/test/implementation handles the concern. | Reply only |
| Stale | Diff moved or current code no longer has the issue. | Reply only |
| Noise | Style nit or incorrect bot claim with no practical value. | Reply only (concise) |

## Severity Re-Evaluation

Upgrade or downgrade after reading code.

- Critical: security, data loss, normal-input panic/crash, state-corrupting race.
- Major: real correctness bug, missing error handling, API contract break, deploy/migration risk, resource leak.
- Medium: bounded edge case, missing test for changed behavior, maintenance readability concern.
- Low: naming, formatting, comment wording, optional simplification.

If a Critical/Major item downgrades below Major during deep analysis, still present it in the current one-at-a-time Critical/Major flow. Show the downgraded severity in the card and ask for the user decision before moving on. Do not silently move it into a Medium/Low batch after the Critical/Major flow has started.

## Presentation Template

```text
── 1/N ── [Major] ── [coderabbit] ──────────
Path: path/to/file.go:42

Problem: <one sentence — what can go wrong in current code if bot is right>
Wants: <one sentence — what the reviewer is asking>

Code evidence: <one of:
  - "<file:line>: `<quoted code>`" — for positive inline claims (the bot says line X has bug Y; show line X)
  - "<grep/diff/test result>" — for negative/cross-file claims (bot says X is missing or broken across files; show the artifact that proves or disproves it)
  - "no concrete evidence available; bot's claim is about <absence | cross-file | ownership | process | PR-level>" — only when no in-repo artifact can confirm or deny>

Confidence: High | Medium | Low
Recommendation: Fix | Defer | Reply only | Needs your decision
Reason: <one sentence; must reference the Code evidence concretely>

<details><summary>Original comment</summary>
...
</details>
```

For PR-level comments, include a `Signals:` section before `Problem`.

For grouped comments (multiple reviewers raising the same issue), synthesize all reviewer angles in `Wants`. Fill `Code evidence` once for the group. Do not pick one comment and hide the rest.

## The One Rule

`Fix` requires concrete code evidence: a `file:line` quote, a grep/diff result, or a test artifact that confirms the bot's claim in current code. Without that, `Fix` is not allowed — pick `Defer`, `Reply only`, or `Needs your decision` based on your judgment of the case:

- `Defer` — the concern is real but tracked separately (must actually create the follow-up issue / draft).
- `Reply only` — the bot's specific claim does not match current code (stale inline claim that's been fixed/moved) AND the reply will explain that.
- `Needs your decision` — you cannot verify the claim within this repo, the case is ambiguous, or it's a cross-service/ownership/process question that the user must resolve.

Do not invent code evidence to justify `Fix`. If you echoed reviewer text without checking current code, the `Code evidence` field will be empty or paraphrased — that is a signal to pick something other than `Fix`.

For Medium/Low compact cards, the same rule applies: `Fix` requires `Code evidence` with a concrete artifact. The user can promote any Medium/Low item via `review N` to trigger the full Critical/Major presentation flow and one-at-a-time decision.

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

- **Problem:** what can go wrong in the current code if the bot is right. One sentence.
- **Wants:** what the reviewer is asking to change. One sentence.
- **Code evidence:** the concrete artifact in current code that confirms or refutes the bot's claim. For positive inline claims, a `file:line` plus quoted excerpt. For negative or cross-file claims (missing tests, schema compatibility, migration ordering, ownership), a grep/diff/test result that proves or disproves the concern. For ownership/process questions that cannot be answered within this repo, write `"no concrete evidence available; bot's claim is about <category>"`. Not a paraphrase of reviewer text. Not a summary.
- **Reason:** one sentence. Must reference the Code evidence concretely.

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
| Fix | A code/test/docs change belongs in this PR. Requires concrete `Code evidence` (file:line + quote, or grep/diff/test artifact). |
| Defer | The concern is valid but should be tracked separately. Requires `Code evidence` that demonstrates the concern is real. Prepare a follow-up issue draft; do not claim it exists unless created. |
| Reply only | The bot's specific claim does not match current code — typically a stale inline claim where the line moved or was already fixed. The reply explains the mismatch. Requires `Code evidence` that shows the mismatch (e.g., the current state of the line the bot referenced). |
| Needs your decision | Cannot verify the bot's claim within this repo. Triggered by: cross-service ownership questions, PR-description-vs-code conflicts, missing-proof concerns that span systems, or any case where domain context the agent lacks would change the answer. `Code evidence` is `"no concrete evidence available; bot's claim is about <category>"`. |

`Fix` requires concrete code evidence. If you have not located that evidence, do not pick `Fix` — pick `Defer`, `Reply only`, or `Needs your decision` based on the case. Echoing reviewer text without verifying current code is the failure mode this skill exists to prevent.
