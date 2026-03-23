# Deep Analysis — Methodology and Presentation Templates

## Analysis inputs

Before presenting a Critical/Major comment (or a rescued Medium/Low comment), gather three inputs:

1. **git diff** — run `git diff $(gh pr view --json baseRefName -q .baseRefName)...HEAD -- {path}` to get the PR's changes for the file, focused on the comment's location
2. **Function-level context** — read the full function/method containing the flagged line (not the entire file)
3. **Project conventions** — check CLAUDE.md, linter config, and surrounding code patterns for relevant conventions

For PR-level issue comments (no file path): use the PR description and overall diff summary instead of file-specific diff and function context.

If a file was deleted/renamed, check `git log --diff-filter=R --find-renames -- {path}`.

## Severity re-evaluation

After deep analysis, Claude may upgrade or downgrade the comment's severity:

- If downgraded below Major → move to Medium/Low overview list (Step 3B), do not present interactively. Retain the gathered deep analysis context — if the user rescues this comment in Step 3B, reuse it instead of re-reading files
- If upgraded → reflect in display header (e.g., `[Medium → Critical]`)
- If all Critical/Major comments are downgraded during deep analysis, skip Step 3A interaction entirely and proceed to Step 3B with all comments

## Presentation template — single comment

```text
── 1/N ── [Critical] ── [coderabbit] ──────────
📍 path/to/file.go:42

**Diff:**
<git diff snippet, only the change related to this comment, ±3 lines context>

**Analysis:**
<2-3 sentences: what the reviewer flagged, why it matters (or doesn't),
impact on current code. If Claude disagrees with reviewer, state the
disagreement and reasoning explicitly.>

**Recommendation:** Fix / Skip
<1-sentence rationale>

<details><summary>Original comment</summary>
<raw reviewer text>
</details>
```

Then prompt the user with `AskUserQuestion` using selectable options: `["Fix", "Skip", "Discuss"]`. If the user selects "Discuss", follow up with a freeform `AskUserQuestion` to get their input.

## Presentation template — deduplicated group

```text
── 1/N ── [Major] ── 2 comments grouped ──────
📍 path/to/file.go:42 (coderabbit, copilot)

**Diff:**
<shared diff snippet>

**Analysis:**
<merged analysis, noting each reviewer's angle if different>

**Recommendation:** Fix / Skip
<rationale>

<details><summary>Original comments (2)</summary>
[coderabbit] ...
[copilot] ...
</details>
```

Same `AskUserQuestion` with `["Fix", "Skip", "Discuss"]` options.

Omit `📍` and `**Diff:**` for PR-level issue comments.

## User responses

Use `AskUserQuestion` with `options: ["Fix", "Skip", "Discuss"]` for each comment. The user selects with arrow keys.

- **Fix** — Queue for fixing. Record what to change. Next comment.
- **Skip** — Next comment.
- **Discuss** — Follow up with a freeform `AskUserQuestion` asking the user to explain. After discussion resolves, re-present with `options: ["Fix", "Skip"]` for final decision (no more Discuss option).
