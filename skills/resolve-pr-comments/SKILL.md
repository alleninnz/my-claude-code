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

After fetch, compare fetched `pull_request.head_sha` with local `git rev-parse HEAD`. If they differ, stop before analysis and ask the user to checkout or update the PR branch. Do not analyze or fix review comments against a mismatched local checkout.

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

Present Critical/Major items one at a time. Read `deep-analysis.md` before presenting each item.

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

If deep analysis downgrades an item below Major, move it to Step 4 instead of interrupting the user here.

## Step 4 - Medium/Low Review

Use compact cards by default. Full deep analysis is available through `review N`.

Present 5 items per page with global numbering:

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

Commands:

| Input | Behavior |
| --- | --- |
| `ok` or `done` | Confirm current page defaults. |
| `ok all` | Confirm defaults for current and all remaining Medium/Low pages. |
| `fix N`, `fix 1,3`, `fix 1-4` | Queue fixes. |
| `defer N` | Queue follow-up/tracking reply. |
| `reply N` | Queue reply-only. |
| `skip N`, `skip all` | Skip current page item(s). |
| `review N`, `review all` | Promote to deep analysis one at a time using Step 3 choices. |
| `why N` | Explain the recommendation without changing the decision. |

Users can combine commands, e.g. `fix 1, defer 2, review 4`.

## Step 5 - Fix Plan and Implementation

Before editing, show the plan:

```text
── Fix Plan ───────────────────────────────
Fix:
1. path/to/file.go - add ctx cancellation to worker loop
2. store.go - handle nil category before packing proto

Defer:
3. PR-level comment - draft follow-up issue for pagination refactor

Reply only:
4. config.go - explain why existing default matches production config

Skip:
5. model.go - style nit conflicts with local convention
```

Then apply queued fixes.

Implementation order:

1. Group fixes by file or behavior area.
2. Apply one group at a time.
3. Run targeted verification for that group when practical.
4. After all groups, run full applicable verification.

Verification must be concrete. Infer commands from `CLAUDE.md`/`AGENTS.md`, `Makefile`, package scripts, `go.mod`, or existing CI config. Print the chosen commands before running them. If verification fails, stop in Step 5, report the failure, and do not proceed to Step 6.

Do not start fixing until every presented comment has a recorded decision.

## Step 6 - Preview, Confirm, Publish, Resolve

Before asking for confirmation, show:

- `git diff --stat`
- focused diff summaries for changed files
- verification commands and results
- replies that will be posted
- threads/comments that will be resolved
- deferred follow-up drafts, if any

Ask:

> Commit and push, then reply and resolve threads?

Use `AskUserQuestion` with `["Yes", "No"]` in Claude Code. In Codex, ask and stop.

If Yes:

1. Stage only intended files.
2. Create a descriptive commit.
3. Push.
4. Read `resolve-threads.md`.
5. Post replies before resolving threads.
6. Resolve only threads processed in this run.

If No: do not commit, push, reply, or resolve.

If there are no code fixes but there are reply-only, deferred, skipped, outdated, or auto-skipped Copilot items, ask a narrower confirmation:

> Post replies and resolve processed threads?

Use the same blocking rule.

## Common Mistakes

- Echoing reviewer text verbatim instead of explaining in natural language.
- Skipping Evidence or Confidence.
- Treating human comments like bot comments.
- Auto-skipping PR-level comments because they look stale.
- Merging nearby comments with different requested actions.
- Fixing before all review decisions are recorded.
- Running vague "tests" without naming commands.
- Asking for commit/push before showing the diff preview.
- Resolving a thread without first posting a reply.
- Claiming a deferred follow-up exists when only a draft was prepared.
