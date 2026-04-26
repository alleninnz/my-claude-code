# Implementation and Publish Protocol

## Fix Plan

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

## Implementation Order

1. Group fixes by file or behavior area.
2. Apply one group at a time.
3. Run targeted verification for that group when practical.
4. After all groups, run full applicable verification.

Verification must be concrete. Infer commands from `CLAUDE.md`/`AGENTS.md`, `Makefile`, package scripts, `go.mod`, or existing CI config. Print the chosen commands before running them.

If verification fails, stop in Step 5, report the failure, and do not proceed to publish.

## Preview and Confirmation

Before asking for confirmation, show:

- `git diff --stat`
- focused diff summaries for changed files
- verification commands and results
- replies that will be posted
- threads/comments that will be resolved
- deferred follow-up drafts, if any

For code fixes, ask:

> Commit and push, then reply and resolve threads?

If there are no code fixes but there are reply-only, deferred, skipped, outdated, or auto-skipped Copilot items, ask:

> Post replies and resolve processed threads?

Use `AskUserQuestion` with `["Yes", "No"]` in Claude Code. In Codex, ask and stop.

## Publish

If confirmed:

1. Stage only intended files.
2. Create a descriptive commit when code changed.
3. Push when code changed.
4. Read `resolve-threads.md`.
5. Post replies before resolving threads.
6. Resolve only threads processed in this run.

If not confirmed, do not commit, push, reply, or resolve.
