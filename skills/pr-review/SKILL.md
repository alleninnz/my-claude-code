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

Fetch **review comments** (inline on code), top-level only:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --paginate \
  --jq '[.[] | select(.user.type == "Bot") | select(.in_reply_to_id == null) | {id: .id, path: .path, line: .line, body: .body, user: .user.login}]'
```

Fetch **issue comments** (PR-level):

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  --paginate \
  --jq '[.[] | select(.user.type == "Bot") | {id: .id, body: .body, user: .user.login, type: "issue_comment"}]'
```

- Only process top-level comments (`in_reply_to_id` is null for review comments)
- Skip issue comments that are purely summaries with no actionable findings (e.g. CodeRabbit summary tables)
- If no actionable AI reviewer comments found, report "No AI review comments found" and stop

## Step 2.5 — Partition outdated comments

Review comments where `line` is `null` are outdated — GitHub marks them this way when the diff context no longer exists after subsequent pushes.

Split review comments into two groups:
- **Outdated:** `line` is `null`
- **Active:** `line` is not `null`

Issue comments (PR-level) are always active — they have no diff position.

If outdated comments exist, present them as a batch before the interactive loop:

```
── N outdated comment(s) (auto-skipped) ──────────
1. [bot-name] path/to/file.go — <one-line plain-language summary of the concern>
2. [bot-name] path/to/other.go — <one-line plain-language summary>

Proceeding with M remaining comment(s)...
```

The one-line summary is derived from the comment body — translate to plain language, same as the interactive comments, but condensed to one line.

If all comments are outdated (M=0), display the batch summary, report "No active comments to review", and proceed directly to Step 5.

## Step 2.75 — Triage Copilot comments

Copilot has a high false-positive rate. Instead of presenting its comments interactively, auto-triage them:

1. Separate active comments into **Copilot** (`user` contains "copilot" case-insensitive) and **non-Copilot** groups
2. For each Copilot comment, silently read the referenced code and assess validity:
   - **Noise:** style nitpicks, incorrect claims about bugs that don't exist, suggestions already handled by validation/framework, duplicates of comments from other bots → auto-skip
   - **Legitimate:** real bugs, missing error handling, actual logic issues confirmed by reading the code → promote to interactive queue
3. Present a batch summary:

```
── N Copilot comment(s) (auto-triaged) ──────────
1. ✗ path/to/file.go:42 — <one-line summary> — <why skipped>
2. ✓ path/to/file.go:88 — <one-line summary> — promoted to interactive review
3. ✗ path/to/other.go:55 — <one-line summary> — <why skipped>

M Copilot comment(s) promoted to interactive review.
Proceeding with X comment(s) (Y non-Copilot + M Copilot)...
```

Promoted Copilot comments join the interactive queue and are presented with the same template as other bot comments (with `[copilot]` in the header).

If all Copilot comments are noise, show the batch summary and proceed with non-Copilot comments only.

## Step 3 — Interactive per-comment review

For each active (non-outdated) comment:

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

After all comments: show summary (`Fix: X, Skip: Y, Outdated: Z`).

## Step 4 — Apply queued fixes

If no fixes queued: report "No fixes to apply" and proceed to Step 5.

If fixes queued: apply all fixes, run build/lint/test to verify, show summary of changes. If build breaks, investigate and adjust.

**Stop here.** Do NOT commit, push, or modify git state. The user handles git workflow.

## Step 5 — Optional reply and resolve threads

Ask: **"Want to reply and resolve threads on GitHub? (yes / no)"**

If **no**: done.

If **yes**: read `resolve-threads.md` in this skill directory for the API commands to reply to comments and resolve review threads via GraphQL.

Outdated comments are included in thread resolution but do not need a reply. Active comments (fixed or skipped) must have a reply explaining the resolution before resolving.

## Common mistakes

- **Echoing the AI text verbatim** — The whole point is to translate into plain language. Summarize what the reviewer wants, don't paste their output.
- **Committing or pushing** — Never. The user handles git workflow after fixes are applied.
- **Processing human comments** — Only bot reviewers. Filter is in the jq query.
- **Presenting Copilot comments interactively** — Copilot has high false-positive rate. Auto-triage in Step 2.75, only promote legitimate findings to the interactive loop.
- **Fixing without queuing first** — Go through ALL comments before applying any fixes.
- **Presenting outdated comments interactively** — Comments with `line: null` are outdated. Batch them in Step 2.5, don't walk through them one-by-one.
