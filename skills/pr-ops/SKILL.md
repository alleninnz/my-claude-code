---
name: pr-ops
description: Use when performing PR lifecycle operations — merge, check status, list PRs, convert draft/ready, close, reopen, update metadata, check CI, or re-run checks. Triggers on "merge PR", "PR status", "list my PRs", "mark as draft", "check CI", "close PR", "reopen PR", "update PR".
---

# PR Operations

Swiss-army-knife for PR lifecycle management using `gh` CLI. Covers status, listing, CI checks, state changes, metadata updates, and merging.

This skill does NOT cover: PR creation (system prompt / agentic-dev flow), code review (`/pr-review`, `/cr-review`), or deployment (`caruso deploy`).

## Prerequisites

- `gh` CLI installed and authenticated
- For current-branch operations: cwd must be inside a git repo

## Context Resolution

Resolve which PR to operate on using this priority:

1. **Explicit reference** in user message — `PR #22`, `entity-service#2079`, full GitHub URL like `https://github.com/JasperLabs/entity-service/pull/2079`
2. **Current branch** — run `gh pr view --json number,url,state,title` from cwd
3. **Ambiguous** — ask the user

For explicit cross-repo references, translate to `-R` flag:
- `entity-service#2079` → `-R JasperLabs/entity-service 2079`
- GitHub URL → parse owner/repo/number

For list operations, choose scope based on user intent:
- "list PRs" / "my PRs" (no repo context) → `gh search prs --author=@me --state=open --owner=JasperLabs`
- "list PRs in entity-service" → `gh pr list -R JasperLabs/entity-service`
- "PRs needing my review" → `gh search prs --review-requested=@me --state=open --owner=JasperLabs`

Default pagination: `gh search prs` returns 30 results, `gh pr list` returns 30. Add `--limit 100` for comprehensive listings if the user expects more.

## Operations

### status — View PR details

No confirmation needed. Fetch and present a concise summary.

```bash
gh pr view <NUMBER> -R <OWNER/REPO> --json number,title,state,baseRefName,headRefName,url,labels,reviewDecision,mergeStateStatus,isDraft
gh pr checks <NUMBER> -R <OWNER/REPO>
```

Format output as:
```
PR #22 (chore/multi-select-hints-and-readme) -> main
State: Open (ready for review)
CI: 3/3 passing
Reviews: 0 approved, 0 changes requested
Merge state: CLEAN
Labels: none
URL: https://github.com/JasperLabs/caruso-cli/pull/22
```

### list — List PRs

No confirmation needed.

```bash
# My open PRs across all Caruso repos (CI status not available from search)
gh search prs --author=@me --state=open --owner=JasperLabs --json repository,number,title,updatedAt,isDraft

# My open PRs in a specific repo (CI status available here)
gh pr list -R JasperLabs/<repo> --author=@me --state=open --json number,title,updatedAt,statusCheckRollup

# PRs requesting my review
gh search prs --review-requested=@me --state=open --owner=JasperLabs --json repository,number,title,updatedAt
```

Format org-wide output as a table (no CI column — use `/pr-ops ci` for individual PR CI status):
```
#     Repo                Title                          State   Updated
22    caruso-cli          Multi-select hints and README  open    2h ago
2079  entity-service      Add related party fields       draft   1d ago
```

Format single-repo output with CI column (available from `gh pr list`):
```
#     Title                          CI     Updated
22    Multi-select hints and README  pass   2h ago
```

### ci — Check CI status

No confirmation needed.

```bash
gh pr checks <NUMBER> -R <OWNER/REPO>
```

Format output as:
```
PR #2079 CI Status: 2/5 failing

FAIL  lint (3m12s)         https://github.com/...runs/123
FAIL  test-integration     https://github.com/...runs/124
PASS  test-unit
PASS  build
PASS  security-scan
```

### diff — Show PR diff summary

No confirmation needed.

```bash
# File list with change stats
gh pr view <NUMBER> -R <OWNER/REPO> --json files,additions,deletions,changedFiles

# File names only (lightweight)
gh pr diff <NUMBER> -R <OWNER/REPO> --name-only
```

Format output as:
```
PR #22: 3 files changed, +45 -12

cmd/deploy.go          +12 -20
cmd/deploys.go          +0  -0
internal/pkg/config.go  +1  -1
```

Note: `gh pr diff` does NOT support `--stat`. Use `--name-only` for file names or `gh pr view --json files` for full stats.

### draft — Convert to draft

No confirmation needed. Low risk, easily reversible.

```bash
gh pr ready --undo <NUMBER> -R <OWNER/REPO>
```

### ready — Mark ready for review

No confirmation needed. Low risk, easily reversible.

```bash
gh pr ready <NUMBER> -R <OWNER/REPO>
```

### close — Close PR without merging

**Requires confirmation.** Show PR title and state before executing.

Do NOT use `--delete-branch` with close. Branch deletion is only allowed during merge.

```bash
gh pr close <NUMBER> -R <OWNER/REPO>
```

### reopen — Reopen a closed PR

**Requires confirmation.** Show PR title before executing.

```bash
gh pr reopen <NUMBER> -R <OWNER/REPO>
```

### merge — Merge PR

**Requires confirmation.** Run the merge pre-flight checklist first.

**Pre-flight checklist (run automatically before confirming):**

1. `gh pr view <NUMBER> -R <OWNER/REPO> --json isDraft` — block if draft PR (tell user to mark ready first)
2. `gh pr checks <NUMBER> -R <OWNER/REPO>` — warn if any checks failing/pending/no checks configured
3. `gh pr view <NUMBER> -R <OWNER/REPO> --json mergeStateStatus` — warn if not CLEAN (values: BEHIND, BLOCKED, DIRTY, DRAFT, HAS_HOOKS, UNKNOWN, UNSTABLE)
4. `gh pr view <NUMBER> -R <OWNER/REPO> --json reviewDecision` — warn if zero approvals
5. Present all findings with merge strategy (squash default)
6. Ask the user for confirmation

If user confirms:
```bash
gh pr merge <NUMBER> -R <OWNER/REPO> --squash --delete-branch
```

Squash merge is the default (Caruso convention). Only use `--rebase` or `--merge` if the user explicitly asks.

Note: `--delete-branch` deletes both the remote and local branch. If the user is in a worktree on that branch, warn them.

### update — Update PR metadata

No confirmation needed.

```bash
# Update title
gh pr edit <NUMBER> -R <OWNER/REPO> --title "<new title>"

# Update body
gh pr edit <NUMBER> -R <OWNER/REPO> --body "<new body>"

# Add labels
gh pr edit <NUMBER> -R <OWNER/REPO> --add-label "<label>"

# Remove labels
gh pr edit <NUMBER> -R <OWNER/REPO> --remove-label "<label>"

# Add reviewers
gh pr edit <NUMBER> -R <OWNER/REPO> --add-reviewer "<user>"

# Change base branch
gh pr edit <NUMBER> -R <OWNER/REPO> --base "<branch>"
```

### rerun — Re-run failed CI checks

No confirmation needed.

List all failed runs for the PR's head branch and rerun each:
```bash
# Get the PR's head branch
gh pr view <NUMBER> -R <OWNER/REPO> --json headRefName -q .headRefName

# List ALL failed runs on that branch (not just one)
gh run list -R <OWNER/REPO> --branch <head-branch> --status failure --json databaseId

# Re-run failed jobs for each run
gh run rerun <RUN_ID> -R <OWNER/REPO> --failed
```

If multiple failed runs exist, rerun all of them. Do not stop at the first one.

## Hard Rules

- **Never** force merge past failing CI (do not use `--admin` flag)
- **Never** delete branches independently of merge (`--delete-branch` only during merge, never with `close`)
- **Squash merge by default** — only use rebase/merge if explicitly asked
- **Confirm before** `merge`, `close`, `reopen`
- **Never confirm for** read-only operations, metadata updates, `draft`/`ready`, `rerun`

## Error Handling

- **PR not found:** "PR #N not found in JasperLabs/repo. Check the number and try again."
- **No PR on current branch:** "No PR found for branch `feat/xyz`. Create one with `gh pr create`."
- **PR already merged/closed:** Check state before attempting `merge`/`close`. Tell the user the current state.
- **Permission denied:** Surface the `gh` error directly.
- **Rate limiting:** Surface the error and suggest waiting.
- **Not in a git repo (and no explicit reference):** Ask the user which repo and PR number.
