---
name: pr
description: Use when creating or updating pull requests — generates accurate titles and descriptions from the diff. Also covers PR state changes (draft, ready, close, reopen, merge).
---

# Pull Request

Smart PR creation and updates with diff-based description generation.

## create — Create a new PR (always draft)

1. Determine base branch: repo default (usually `main`), or user-specified
2. Infer ticket ID (check in order, stop at first match):
   - User's arguments (e.g. `/pr create APP-21395`)
   - Branch name (e.g. `feat/app-21395-...` → `APP-21395`)
   - Commit messages (e.g. `APP-21395 | ...` or `(APP-21395)`)
   - Recent conversation context (e.g. a Linear issue just discussed)
   - If no ticket ID found, ask the user before proceeding
3. Get diff: `git diff $(git merge-base HEAD <base>)..HEAD`
4. Generate title: `<TICKET-ID> | <conventional-commit style>`, imperative mood, under 70 chars
5. Generate body (adaptive):
   - Small diff (<100 changed lines): 1-3 bullet summary
   - Larger diff: `## Summary` (3-5 bullets) + `## Test plan` (checklist)
   - Include `Closes <TICKET-ID>` before the footer
   - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
6. Create: `gh pr create --draft --title "<title>" --body "<body>"`

## update — Regenerate PR description

1. Get base branch: `gh pr view --json baseRefName -q .baseRefName`
2. Get diff: `git diff $(git merge-base HEAD <base>)..HEAD`
3. Regenerate body using the same adaptive format as create
4. Update: `gh pr edit --body "<body>"`
5. Title is preserved unless the user explicitly asks to change it

## merge — Squash merge and clean up branches

1. Confirm with user before proceeding
2. Merge: `gh pr merge --squash`
3. Get base branch: `gh pr view --json baseRefName -q .baseRefName`
4. Switch and update: `git checkout <base> && git pull`
5. Delete remote branch: `git push origin --delete <merged-branch>`
6. Delete local branch: `git branch -d <merged-branch>`
7. If merge fails (checks, conflicts): report error and stop — do not clean up
8. If branch cleanup fails after successful merge: warn but don't error

## State Changes

- **Confirm before:** `merge`, `close`, `reopen`
- **No confirmation:** `open` (mark ready), `draft` (convert to draft)
- Never use `--delete-branch` with close

## Common Mistakes

- `gh pr diff --stat` does not exist — use `gh pr view --json files` for change stats
- `gh pr create` without `--draft` — always create as draft
