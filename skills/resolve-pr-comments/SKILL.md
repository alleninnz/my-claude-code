---
name: resolve-pr-comments
description: Use when the current PR has AI reviewer comments (CodeRabbit, Cursor, etc.) that need to be reviewed and addressed, or when the user says "pr review", "review comments", "fix review comments".
---

# PR Review

Interactive review of all unresolved PR review comments — both AI reviewer (CodeRabbit, Cursor, Copilot, etc.) and human reviewer comments. Dispatches a subagent to silently gather and classify comments, then presents results for interactive review.

## Prerequisites

- `gh` CLI installed and authenticated
- Current branch has an open PR (or PR URL/number provided as argument)

## Tool constraints

- **`gh` CLI only** — use `gh api` (via Bash tool) for all GitHub API calls. Never use GitHub MCP tools.
- **No `AskUserQuestion`** — present your analysis and recommendation, then let the user type a freeform response (`fix`, `skip`, `1,3`, etc.).

## Step 1 — Gather and classify comments (silent)

Dispatch a subagent using the prompt template in `data-gather.md`. The subagent silently:

- Identifies the PR and repo
- Fetches unresolved review threads
- Fetches all comments (bot and human), filters to unresolved only
- Partitions outdated comments
- Auto-triages Copilot comments (high false-positive rate)
- Classifies severity and deduplicates

The subagent returns structured data with: `pr`, `outdated[]`, `copilot_triage[]`, `critical_major[]`, `medium_low[]`, and `thread_map[]`.

If the subagent reports no comments, output "No review comments found" and stop.

## Step 2 — Present triage summaries

Show the subagent's triage results. Only show sections that have content:

**Outdated** (if any):

```text
── N outdated comment(s) ──────────
1. [bot-name] path/to/file.go — <one-line summary>
```

**Copilot triage** (if any):

```text
── N Copilot comment(s) (auto-triaged) ──────────
1. ✗ path/to/file.go:42 — <one-line summary> — <why skipped>
2. ✓ path/to/file.go:88 — <one-line summary> — promoted
```

## Step 3 — Critical/Major interactive review

For each Critical/Major comment (or deduplicated group), perform deep analysis before presentation.

Read `deep-analysis.md` for the methodology, severity re-evaluation rules, and presentation template.

**Auto-queue defaults:** Critical/Major comments have been deep-analyzed, so their recommendations are high-confidence. After presenting all comments, show a defaults summary. "Fix" recommendations are auto-queued, "Skip" recommendations are auto-skipped:

```text
── Defaults ──────────────────────────
Auto-queued:  #2 path traversal in removeNested (Fix)
Auto-skipped: #1 breaking change .worktrees → worktrees (Skip)

Override? (e.g., 'skip 2' or 'fix 1', 'ok' to confirm):
```

| User input | Behavior |
|------------|----------|
| `ok` or `done` | Confirm all defaults, proceed to Step 4 |
| `skip 2` or `skip 1,2` | Override: skip those items, rest keep defaults |
| `fix 1` or `fix 1,3` | Override: queue those items for fix, rest keep defaults |
| `skip all` | Override all to skip |
| `fix all` | Override all to fix |

Users can combine overrides in one response (e.g., `fix 1, skip 2`).

If all Critical/Major comments are downgraded during deep analysis, skip this step and merge them into Step 4.

## Step 4 — Medium/Low overview + rescue

Present all Medium/Low comments (including any downgraded from Step 3) as a numbered overview. Each entry shows the recommendation inline. **Default action is skip all** — Medium/Low items have not been deep-analyzed, so they require explicit opt-in. The user types `y` to accept all recommendations, or overrides specific items.

Each entry must include: what the reviewer wants (plain language), your recommendation (Fix/Skip), and brief reasoning.

```text
── Medium/Low (N comments, default skip all) ──────
1. [Medium] path/to/file.go:88 (coderabbit) → Fix
   Add context cancellation check — real concern, handler runs unbounded.

2. [Low] path/to/model.go:33 (coderabbit) → Skip
   Remove unused `opts` parameter — matches existing codebase convention.

3. [Medium] path/to/handler.go:120 (cursor) → Fix
   Check IsSkip in removeFlat — same bug pattern as flat rebase.

── Recommended: fix 1,3 — skip 2
Accept? (y to accept, 'fix 1,3' to fix, 'review 3' for deep review, 'done' to skip all):
```

**Interaction rules:**

| User input | Behavior |
|------------|----------|
| `y` or `yes` | Accept all recommendations (fix items marked Fix, skip items marked Skip) |
| `done` or `skip all` | Skip all, proceed to Step 5 |
| `fix 1` or `fix 1,3` | Queue selected for fix, skip the rest |
| `fix all` | Queue all for fix |
| `review 3` or `review 1,3` | Rescue selected for deep review (Step 3 process), skip the rest |
| `review all` | Rescue all for deep review |

**Combining:** Users can mix in one response (e.g., `fix 1, review 3` — fast-fix #1, deep-review #3, skip the rest). All tokens are keyword-prefixed (`fix`, `review`, `skip`) — bare numbers are not valid input.

**Fast-fix flow:** Comments queued via `fix` skip deep analysis entirely. The Step 4 summary is the analysis — no further investigation needed.

**Rescue flow:** Items selected via `review` are deep-analyzed using `deep-analysis.md`, then presented as a batch with the same defaults model as Step 3 (auto-queue Fix recommendations, auto-skip Skip recommendations, user overrides with `ok`/`done`/`skip N`/`fix N`). This allows independent fix/skip decisions per rescued item.

## Step 5 — Apply queued fixes

Show the review summary:

```text
── Review Summary ──────────────────────────
Critical/Major: 3 comments (2 fix, 1 skip)
Medium/Low:     5 comments (1 rescued → fix, 4 skipped)
Outdated:       2 comments (auto-skipped)
Copilot:        4 comments (1 promoted → fix, 3 auto-skipped)
Duplicates:     3 comments merged into 2 groups
────────────────────────────────────────────
Total: 17 comments → 4 fixes queued
```

If no fixes queued: report "No fixes to apply." then skip straight to replying and resolving threads — no commit/push needed, no confirmation prompt. Read `resolve-threads.md` for API commands and reply rules.

If fixes queued: apply all fixes, run build/lint/test to verify, show summary of changes, then proceed to Step 6.

## Step 6 — Commit, push, and resolve threads

Ask: "Commit and push, then reply and resolve threads? (y/n, recommended: y)"

If **y**: stage changed files, create a descriptive commit, push, then read `resolve-threads.md` for API commands and reply rules. **Every thread MUST receive a reply before being resolved** — never resolve silently.
If **n**: do NOT commit, push, or resolve.

## Common mistakes

- **Echoing AI text verbatim** — Translate to plain language. The Analysis section is YOUR independent analysis.
- **Shallow analysis without reading diff/context** — For Critical/Major, you MUST read the git diff and function context before presenting.
- **Agreeing with the reviewer by default** — Form your own judgment. If the concern doesn't apply, say so.
- **Committing or resolving without asking** — Always ask the user in Step 6.
- **Fixing without queuing first** — Go through ALL comments (Steps 3 + 4) before applying fixes in Step 5.
- **Resolving threads without replying** — Every thread must get a reply explaining why it was resolved.
