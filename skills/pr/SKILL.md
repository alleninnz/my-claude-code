---
name: pr
description: Use when handling /pr create, /pr update, /pr merge, /pr close, /pr reopen, /pr draft, or /pr ready for pull request creation, synchronization, state changes, or merge conventions. Not for PR review comments; use resolve-pr-comments.
---

# PR Conventions

This skill defines PR workflow conventions, authorization boundaries, and non-obvious gotchas. Assume normal git/gh mechanics are known.

## Authorization

Invoking `/pr create`, `/pr update`, or `/pr merge` is explicit user confirmation for the necessary scoped commit, push, PR edit, or PR merge action in that command.

Invoking `/pr close`, `/pr reopen`, `/pr draft`, or `/pr ready` is explicit user confirmation for that requested PR state change.

Still ask before:

- Force push.
- Pushing directly to `main` / `master`.
- Pushing to protected branches outside the PR branch.
- Staging unrelated files.
- Bypassing non-trivial CodeRabbit findings.

## Commit Review Gate

Before an automatic commit in `/pr create` or `/pr update`:

- Stage only intended files.
- Run `coderabbit:review` with `type: uncommitted` for non-trivial changes, or the available CodeRabbit uncommitted-review equivalent.
- 0 findings + applicable verification passed: commit and push.
- 1+ findings: ask `[Fix review findings / Commit anyway / Skip]`.
- Fix review findings: fix, rerun applicable verification, restage intended files, and rerun CodeRabbit.
- Commit anyway: commit and push only after that explicit choice.
- Skip: stop without commit or push.
- Trivial wording/comment-only edits may skip CodeRabbit with a note; still stage only intended files.

Applicable verification means the checks that can prove the actual changed surface: tests for behavior changes, format/lint/build for code changes, metadata/link validation for skill or docs changes, and required CI checks when they are available.

## Conventions

- Title: `<ISSUE-ID> | <conventional commit subject>`, imperative, under 70 chars; omit issue prefix if none.
- Issue ID inference: args -> branch -> commit messages -> current session's explicit issue context. Do not infer from stale memory.
- Create: draft by default; only create ready when user passes `ready`.
- Update: regenerate and update both PR title and body from the current branch diff, even when an existing title is present.
- Body: 1-3 reviewer-focused bullets for small changes; otherwise `## Summary` + `## Test plan`.
- Merge: squash only; subject is PR title as-is; body is one why sentence + themed bullets, not file-by-file.
- Merge body: include existing `Closes` line; if absent and title has issue ID, add `Closes <ID>`.

## Gotchas

- Worktree merge cleanup: if CWD is inside a worktree, use `git worktree remove`; do not checkout base inside the worktree.
- `gh pr diff --stat` does not exist; use `gh pr view --json files`.
- `git branch -d` can fail after squash merge; use `-D` only when PR is confirmed merged.
- Rerunning `/pr create` on an existing PR should report the existing PR and treat further synchronization as `/pr update`, not create another PR.
- Never use `--delete-branch` when closing a PR.
