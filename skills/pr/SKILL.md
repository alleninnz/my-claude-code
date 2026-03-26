---
name: pr
description: Use when creating or updating pull requests — generates accurate titles and descriptions from the diff. Also covers PR state changes (draft, ready, close, reopen).
---

# Pull Request

Smart PR creation and updates with diff-based description generation.

## create — Create a new PR (always draft)

1. Determine base branch: repo default (usually `main`), or user-specified
2. Get diff: `git diff $(git merge-base HEAD <base>)..HEAD`
3. Generate title: conventional-commit style, imperative mood, under 70 chars
4. Generate body (adaptive):
   - Small diff (<100 changed lines): 1-3 bullet summary
   - Larger diff: `## Summary` (3-5 bullets) + `## Test plan` (checklist)
   - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
5. Create: `gh pr create --draft --title "<title>" --body "<body>"`

## update — Regenerate PR description

1. Get base branch: `gh pr view --json baseRefName -q .baseRefName`
2. Get diff: `git diff $(git merge-base HEAD <base>)..HEAD`
3. Regenerate body using the same adaptive format as create
4. Update: `gh pr edit --body "<body>"`
5. Title is preserved unless the user explicitly asks to change it

## State Changes

- **Confirm before:** `close`, `reopen`
- **No confirmation:** `open` (mark ready), `draft` (convert to draft)
- Never use `--delete-branch` with close

## Common Mistakes

- `gh pr diff --stat` does not exist — use `gh pr view --json files` for change stats
- `gh pr create` without `--draft` — always create as draft
