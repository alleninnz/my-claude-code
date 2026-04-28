---
name: resolve-pr-comments
description: >
  Use when the current PR has AI reviewer comments (CodeRabbit, Cursor, etc.)
  that need to be reviewed and addressed, or when the user says "pr review",
  "review comments", "fix review comments".
---

# PR Review

Work through unresolved PR review feedback with thread-aware data, independent analysis, user-controlled decisions, and low-friction GitHub thread closure.

## Prerequisites

- `gh` CLI installed and authenticated.
- Current branch has an open PR, or the user provides a PR URL/number.

## Platform Rules

- Use `gh` for all GitHub API calls. Do not use GitHub MCP tools for thread-aware review data.
- Claude Code blocking choices: use `AskUserQuestion`.
- Codex or other environments without `AskUserQuestion`: ask the question in plain text and stop until the user replies.
- Never commit or push without explicit confirmation.
- In the code-fix lane, the commit/push confirmation also authorizes posting the planned replies and resolving processed threads after the pushed commit is visible on the PR. Do not ask a second time unless a publish blocker occurs.
- For comments fixed by code, commit and push before posting "Fixed in <commit>" replies or resolving threads. For no-code comments, post planned replies and resolve processed threads after the preview. Ask before GitHub thread writes only when a publish blocker makes the planned action unsafe or stale.

## Glossary

- **Inline comment**: review-thread comment with `thread_id`, `is_resolved`, and `is_outdated`.
- **PR-level comment**: conversation comment with no resolved state.
- **Review body**: top-level body from a submitted review.
- **Actionable**: maps to `Fix`, `Defer`, `Reply only`, or `Skip`.
- **Defer**: valid concern, not fixed in this PR; prepare a follow-up issue draft or tracking note.
- **Reply only**: no code change, but GitHub reply should explain the decision.

## Step 1 - Fetch and Classify

Run the deterministic fetch script from this skill directory while keeping the shell working directory at the target repo:

```bash
python3 <resolve-pr-comments-skill-dir>/scripts/fetch-comments.py
```

For explicit PRs, use `--repo OWNER/REPO --pr 123` or `--url <pr-url>`.

The script fetches PR metadata first and fail-fast checks the fetched `head_sha` against local `git rev-parse HEAD` when running inside a git checkout. If it reports a mismatch, stop before analysis and ask the user to checkout or update the PR branch. Do not analyze or fix review comments against a mismatched local checkout.

Read `data-gather.md` and `data-contract.md`, then classify the raw JSON into:

- `outdated[]`
- `copilot_triage[]`
- `critical_major[]`
- `medium_low[]`
- `reply_only[]`
- `deferred[]`
- `thread_map[]`

Severity controls presentation. Include reviewer-labeled Critical/Major/High/P0/P1 items in `critical_major[]` unless they are resolved, outdated, or pure bot noise. Do not move a Critical/Major item into `reply_only[]`, `deferred[]`, or `medium_low[]` just because its recommendation is `Reply only`, `Defer`, `Skip`, or a downgraded severity; keep it in `critical_major[]` so Step 3 presents it one item at a time.

If the script cannot run, use the fallback fetch rules in `data-gather.md`.

If all buckets are empty (`outdated[]`, `copilot_triage[]`, `critical_major[]`, `medium_low[]`, `reply_only[]`, `deferred[]`), output "No review comments found" and stop.

## Step 2 - Triage Summary

Show only a short count summary. Do not recommend decisions, synthesize the "main blocker", or present a global fix plan here.

```text
── Review Comment Triage ──────────────────
PR: OWNER/REPO#123
Outdated: 2
Copilot auto-skipped: 3
Critical/Major: 1
Medium/Low: 7
Reply only: 1
Deferred: 0
```

For outdated and Copilot auto-triage, show one-line summaries. Do not spend user attention on full templates for already-triaged noise.

After the count summary, immediately proceed to Step 3 if there are Critical/Major items. If there are no Critical/Major items, proceed to Step 4. Do not stop after the summary unless there are no actionable comments.

## Step 3 - Critical/Major Review

Read `deep-analysis.md` and `interaction.md`. Present exactly one deduplicated Critical/Major item at a time using the detailed card and choices from `interaction.md`.

Hard rule: every Critical/Major item requires an explicit user decision before moving on. Even when the recommendation is clearly `Reply only` or `Skip`, present the card, state the recommendation, ask for a decision, and stop. Do not batch Critical/Major items, ask for decisions on multiple Critical/Major items at once, or advance to the next Critical/Major item without a recorded decision for the current one.

If deep analysis downgrades a Critical/Major item below Major, keep it in the current Step 3 flow, show the downgraded severity in the card, and still ask for the user decision before moving on. Do not silently move it to Step 4 after it has entered Critical/Major review.

## Step 4 - Medium/Low Review

Read `interaction.md`. Use compact cards by default, 5 items per page with global numbering. Full deep analysis is available through `review N`; promoted items use Step 3 choices.

## Step 5 - Fix Plan and Implementation

Read `implementation.md`. Show the fix plan before editing, apply queued fixes by file or behavior area, and run targeted verification when practical.

Do not start fixing until every actionable comment has a recorded decision. Do not present a global fix plan until all Critical/Major items have explicit recorded decisions and all Medium/Low items have either recorded decisions or explicitly accepted defaults such as `ok all`.

## Step 6 - Preview, Publish, Resolve

Read `implementation.md` and `resolve-threads.md`. Follow the publish lanes there: code-fix comments are committed and pushed before reply/resolve, and that one publish confirmation covers the planned thread closure after push. No-code comments can be replied/resolved directly after the decision preview. Ask again only if a publish blocker appears.

## Common Mistakes

- Before presenting each comment: include Evidence, Confidence, Reason, and current-code analysis; do not echo reviewer text as analysis.
- For Critical/Major items: never summarize the whole review into one decision request; show one deduplicated item, ask for that item only, and stop.
- Before fixing: every actionable comment must have a recorded decision or an explicitly accepted Medium/Low default; do not merge comments with different requested actions.
- Before publishing: show diff preview and verification results; post replies before resolving threads; do not ask for permission solely to close straightforward processed threads; never claim a deferred follow-up exists unless it was created.
