# Deep Analysis — Methodology and Presentation

## Analysis inputs

Before presenting a Critical/Major comment (or a Medium/Low comment promoted via `review N`), you **MUST** gather all of the following — **DO NOT** present without reading the actual code first:

1. **git diff** — `git diff $(gh pr view --json baseRefName -q .baseRefName)...HEAD -- {path}` focused on the comment's location
2. **Function-level context** — the full function/method containing the flagged line (not the entire file)
3. **Project conventions** — CLAUDE.md, linter config, surrounding code patterns

For PR-level issue comments (no file path): use the PR description and overall diff summary instead.

If a file was deleted/renamed, check `git log --diff-filter=R --find-renames -- {path}`.

## Severity re-evaluation

After deep analysis, Claude may upgrade or downgrade:

- Downgraded below Major → move to Medium/Low batch (Step 4), retain gathered context for reuse if promoted via `review N`
- Upgraded → reflect in header (e.g., `[Medium → Critical]`)
- If all Critical/Major comments downgrade, skip Step 3 and proceed to Step 4

## Language style

Every **Problem**, **Wants**, and **Analysis** field **MUST** use natural conversational language — as if explaining to a colleague sitting next to you. This applies to **ALL** severity levels, no exceptions.

**NEVER use these patterns:**
- "Consider adding..." / "It is recommended that..." / "Potential issue with..."
- Any phrasing that echoes the AI reviewer's original wording
- Hedging language: "may", "could potentially", "it might be beneficial to"

**Required style:**
- Problem: "This handler doesn't check context cancellation — if the request times out, the goroutine keeps running and never stops"
- Wants: "Add a ctx.Done() case in the select so it cleans up and returns on timeout"
- Analysis: "`category: FeeCategory!` is non-nullable, but investment-service has existing fees without category set — proto zero value hits the default case in `UnpackFeeCategory` and returns an error, breaking all fee queries for existing data"

The rule: pretend you're explaining the problem to the colleague sitting next to you.

**Problem** and **Wants** come from the data-gather subagent output. For Critical/Major, you **MUST** refine them after reading the diff and function context — the subagent's version is a starting point, not final. For un-promoted Medium/Low (no deep analysis), use the subagent's version directly.

## Presentation template

```text
── 1/N ── [Critical] ── [coderabbit] ──────────
📍 path/to/file.go:42

**Problem:**
<MUST be natural language explaining what's wrong with the code.
Write as if explaining to a colleague sitting next to you.
DO NOT echo reviewer phrasing.>

**Wants:**
<MUST be natural language explaining what the reviewer wants done.
Write as if explaining to a colleague sitting next to you.
DO NOT copy the reviewer's suggestion verbatim.>

**Analysis:**
<MUST be natural language with YOUR independent judgment: agree/disagree, and why.
Write as if explaining to a colleague sitting next to you.
DO NOT just agree with the reviewer — state disagreement explicitly when you disagree.
When code context helps your argument, use inline code blocks (e.g. `category: FeeCategory!`)
rather than a separate diff snippet.>

**Recommendation:** Fix / Skip
<1-sentence rationale>

<details><summary>Original comment</summary>
<raw reviewer text>
</details>
```

For **deduplicated groups**: replace header with `── 1/N ── [Major] ── 2 comments grouped ──`, show `📍 path/to/file.go:42 (coderabbit, copilot)`, **MUST** merge Problem/Wants/Analysis noting each reviewer's angle, and wrap originals in `<details><summary>Original comments (2)</summary>`. **DO NOT** just pick one reviewer's framing — synthesize both.

Omit `📍` for PR-level issue comments.

## User interaction

This file covers analysis methodology and presentation only. The actual user interaction model is defined in SKILL.md Steps 3 and 4.

**Critical/Major (Step 3):** Present **one at a time**. After each comment, use `AskUserQuestion` with choices `["Fix", "Skip"]`. **DO NOT** batch multiple comments into a single message.

**Medium/Low promoted via `review N` (Step 4):** Same as Critical/Major — present one at a time with immediate `AskUserQuestion` with choices `["Fix", "Skip"]` per comment.
