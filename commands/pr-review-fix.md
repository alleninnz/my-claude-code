---
description: Reads AI reviewer comments on the current PR, fixes valid issues, and resolves conversations after user confirmation.
---

# PR Review Fix

This command invokes the **pr-review-fix** agent to process AI reviewer feedback on the current PR.

## Agent Dispatch

When spawning the pr-review-fix agent, you MUST set `model: "opus"`. Analyzing review comments, classifying them against current code state, and producing correct fixes requires Opus-level reasoning.

## What This Command Does

1. **Fetch AI comments**: Reads all review comments from bot accounts (cursor[bot], coderabbitai[bot], etc.)
2. **Analyze against current code**: Classifies each as FIXED, VALID, or WONTFIX
3. **Fix valid issues**: Applies minimal fixes and verifies the build
4. **Present summary**: Shows what was fixed, what was already addressed, what won't be fixed
5. **Push and resolve**: After user confirms, commits fixes, replies to each comment, and resolves threads

## Usage

```text
/pr-review-fix
```

No arguments needed. Requires an open PR on the current branch.

## Prerequisites

- `gh` CLI installed and authenticated
- Current branch has an open PR

## Complementary to /cr-review

| Command | When to use |
|---------|-------------|
| `/cr-review` | Before push — run CodeRabbit to find issues proactively |
| `/pr-review-fix` | After push — fix issues that AI reviewers left on the PR |

## Related

- Agent: `agents/pr-review-fix.md`
