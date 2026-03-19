---
name: pr-review
description: Use when the current PR has AI reviewer comments (CodeRabbit, Cursor, etc.) that need to be reviewed and addressed, or when the user says "pr review", "review comments", "fix review comments".
---

# PR Review

Interactive review of AI reviewer comments on the current PR. Processes comments one at a time — you analyze each comment, recommend fix or skip, and the user decides.

## Prerequisites

- `gh` CLI installed and authenticated
- Current branch has an open PR

## Step 1 — Identify PR and repo

```bash
gh pr view --json number,headRefName,url \
  --jq '{number: .number, branch: .headRefName, url: .url}'
```

Extract `{owner}` and `{repo}` from the URL (e.g. `https://github.com/Org/repo/pull/14` → owner=Org, repo=repo).

If no PR exists for the current branch, report and stop.

## Step 2 — Fetch AI reviewer comments

Fetch **review comments** (inline on code), excluding Copilot, top-level only:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --paginate \
  --jq '[.[] | select(.user.type == "Bot") | select(.user.login != "Copilot") | select(.in_reply_to_id == null) | {id: .id, path: .path, line: .line, body: .body, user: .user.login}]'
```

Fetch **issue comments** (PR-level), excluding Copilot:

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  --paginate \
  --jq '[.[] | select(.user.type == "Bot") | select(.user.login != "Copilot") | {id: .id, body: .body, user: .user.login, type: "issue_comment"}]'
```

- Only process top-level comments (`in_reply_to_id` is null for review comments)
- Skip issue comments that are purely summaries with no actionable findings (e.g. CodeRabbit summary tables)
- If no actionable AI reviewer comments found, report "No AI review comments found" and stop

## Step 3 — Interactive per-comment review

For each comment:

1. Read the referenced file/line (review comments) or identify relevant code (issue comments)
2. If file was deleted/renamed, check `git log --diff-filter=R --find-renames -- {path}`
3. Translate the AI-generated text into plain language — what is the actual concern?
4. Check current code state — the issue may already be fixed by subsequent commits
5. Present analysis using the template below

### Presentation template

```
── Comment 1/N ── [bot-name] ──────────────
📍 path/to/file.go:42          (omit for PR-level issue comments)

**What the reviewer wants:** <plain-language analysis — do NOT echo AI text>

**My recommendation:** Fix / Skip
<reasoning>

**Current code:**              (omit for PR-level issue comments)
<code snippet>

<details><summary>Original comment</summary>
<raw text>
</details>

What would you like to do? (fix / skip / discuss)
```

### User responses

- **fix** — Queue for fixing. Record what to change. Next comment.
- **skip** — Next comment.
- **discuss** — User disagrees, asks questions, or gives custom fix instructions. After resolution, return to fix/skip.

After all comments: show summary (`Fix: X, Skip: Y`).

## Step 4 — Apply queued fixes

If no fixes queued: report "No fixes to apply" and proceed to Step 5.

If fixes queued: apply all fixes, run build/lint/test to verify, show summary of changes. If build breaks, investigate and adjust.

**Stop here.** Do NOT commit, push, or modify git state. The user handles git workflow.

## Step 5 — Optional reply and resolve threads

Ask: **"Want to reply and resolve threads on GitHub? (yes / no)"**

If **no**: done.

If **yes**: read `resolve-threads.md` in this skill directory for the API commands to reply to comments and resolve review threads via GraphQL.

## Common mistakes

- **Echoing the AI text verbatim** — The whole point is to translate into plain language. Summarize what the reviewer wants, don't paste their output.
- **Committing or pushing** — Never. The user handles git workflow after fixes are applied.
- **Processing Copilot or human comments** — Only bot reviewers excluding `Copilot`. Filter is in the jq query.
- **Fixing without queuing first** — Go through ALL comments before applying any fixes.
