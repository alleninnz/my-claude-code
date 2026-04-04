# Deep Analysis — Methodology and Presentation

## Analysis inputs

Before presenting a Critical/Major comment (or a rescued Medium/Low comment), gather:

1. **git diff** — `git diff $(gh pr view --json baseRefName -q .baseRefName)...HEAD -- {path}` focused on the comment's location
2. **Function-level context** — the full function/method containing the flagged line (not the entire file)
3. **Project conventions** — CLAUDE.md, linter config, surrounding code patterns

For PR-level issue comments (no file path): use the PR description and overall diff summary instead.

If a file was deleted/renamed, check `git log --diff-filter=R --find-renames -- {path}`.

## Severity re-evaluation

After deep analysis, Claude may upgrade or downgrade:

- Downgraded below Major → move to Medium/Low overview (Step 4), retain gathered context for reuse if rescued
- Upgraded → reflect in header (e.g., `[Medium → Critical]`)
- If all Critical/Major comments downgrade, skip Step 3 and proceed to Step 4

## Presentation template

```text
── 1/N ── [Critical] ── [coderabbit] ──────────
📍 path/to/file.go:42

**Diff:**
<git diff snippet, only the change related to this comment, ±3 lines context>

**Analysis:**
<2-3 sentences: what the reviewer flagged, why it matters (or doesn't),
impact on current code. State disagreement explicitly if you disagree.>

**Recommendation:** Fix / Skip
<1-sentence rationale>

<details><summary>Original comment</summary>
<raw reviewer text>
</details>
```

For **deduplicated groups**: replace header with `── 1/N ── [Major] ── 2 comments grouped ──`, show `📍 path/to/file.go:42 (coderabbit, copilot)`, merge analysis noting each reviewer's angle, and wrap originals in `<details><summary>Original comments (2)</summary>`.

Omit `📍` and `**Diff:**` for PR-level issue comments.

## User responses

After presenting each comment, show the default action that will be taken:

- If recommendation is **Fix**: show `[auto-queuing fix — say 'skip' to override]`
- If recommendation is **Skip**: show `[auto-skipping — say 'fix' to override]`

The user only needs to respond when they disagree. If the user doesn't respond, apply the default and move to the next comment. Expected responses:

- **`fix`** — Queue for fixing (override skip recommendation). Record what to change. Next comment.
- **`skip`** — Skip (override fix recommendation). Next comment.
- Anything else — treat as discussion. Address the user's point, then present the comment again for a final `fix`/`skip` decision. If the user discusses again, make a judgment call and proceed.
