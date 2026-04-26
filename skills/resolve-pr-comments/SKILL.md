---
name: resolve-pr-comments
description: >
  Use when the current PR has AI reviewer comments (CodeRabbit, Cursor, etc.)
  that need to be reviewed and addressed, or when the user says "pr review",
  "review comments", "fix review comments".
---

# PR Review

Work through unresolved PR review feedback with thread-aware data, independent analysis, user-controlled decisions, and explicit GitHub write confirmation.

## Prerequisites

- `gh` CLI installed and authenticated.
- Current branch has an open PR, or the user provides a PR URL/number.

## Platform Rules

- Use `gh` for all GitHub API calls. Do not use GitHub MCP tools for thread-aware review data.
- Claude Code blocking choices: use `AskUserQuestion`.
- Codex or other environments without `AskUserQuestion`: ask the question in plain text and stop until the user replies.
- Never commit, push, post replies, or resolve threads without explicit confirmation.

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

If the script cannot run, use the fallback fetch rules in `data-gather.md`.

If all buckets are empty (`outdated[]`, `copilot_triage[]`, `critical_major[]`, `medium_low[]`, `reply_only[]`, `deferred[]`), output "No review comments found" and stop.

## Step 2 - Triage Summary

Show only sections that have content:

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

## Step 3 - Critical/Major Review

Read `deep-analysis.md` and `interaction.md`. Present Critical/Major items one at a time using the detailed card and choices from `interaction.md`.

If deep analysis downgrades an item below Major, move it to Step 4 instead of interrupting the user here.

## Step 4 - Medium/Low Review

Read `interaction.md`. Use compact cards by default, 5 items per page with global numbering. Full deep analysis is available through `review N`; promoted items use Step 3 choices.

## Step 5 - Fix Plan and Implementation

Read `implementation.md`. Show the fix plan before editing, apply queued fixes by file or behavior area, and run targeted verification when practical.

Do not start fixing until every presented comment has a recorded decision.

## Step 6 - Preview, Confirm, Publish, Resolve

Read `implementation.md` and `resolve-threads.md`. Show the preview, ask for explicit confirmation, then publish replies and resolve only processed threads.

## Common Mistakes

- Before presenting each comment: include Evidence, Confidence, Reason, and current-code analysis; do not echo reviewer text as analysis.
- Before fixing: every presented comment must have a recorded decision; do not merge comments with different requested actions.
- Before publishing: show diff preview and verification results; post replies before resolving threads; never claim a deferred follow-up exists unless it was created.
