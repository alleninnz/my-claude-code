# Reply and Resolve Threads — API Reference

## Reply rules by comment category

**Every thread MUST receive a reply before resolving.** Never resolve a thread silently — the reviewer (bot or human) and other readers should always see why a thread was resolved.

| Category | Reply content |
|----------|---------------|
| Fixed (from Step 3A or rescued in Step 3B) | "Fixed in \<commit\>. \<brief explanation of what changed\>" |
| Explicitly skipped (from Step 3A or rescued in Step 3B) | Concise technical reason why skipped (e.g., "Follows existing codebase convention — all services use concrete deps") |
| Auto-skipped Medium/Low (not rescued) | One-line reason (e.g., "Style preference — not addressing in this PR", "Low-impact edge case, tracked for follow-up") |
| Auto-skipped Copilot (noise from Step 2.75) | One-line reason explaining why it's not applicable (e.g., "Not applicable — Go 1.22+ fixed loop variable semantics") |
| Outdated | "Already addressed in \<commit\>" or "No longer applicable after \<change\>" |
| Deduplicated groups | Same reply on each comment in the group, referencing the shared fix |

## Suppressing output noise

**All `gh api` calls in this step MUST redirect output to `/dev/null`** to avoid cluttering the terminal with JSON responses. Run all reply and resolve commands silently. After all replies are posted, print a single status line:

```
All replies posted. Now resolving threads.
```

After all threads are resolved, print:

```
All N threads resolved.
```

## Reply to review comments

**Every comment gets a reply.** Use the appropriate template based on category:

```bash
# Fixed comments
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies \
  -f body="Fixed in <commit>. <brief explanation>" > /dev/null

# Skipped comments (any category — explicit skip, auto-skip, Copilot noise, outdated)
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies \
  -f body="<one-line technical reason>" > /dev/null
```

## Reply to issue comments (PR-level)

```bash
# Fixed
gh api repos/{owner}/{repo}/issues/{number}/comments \
  -f body="Fixed in <commit>. <brief explanation>" > /dev/null

# Skipped
gh api repos/{owner}/{repo}/issues/{number}/comments \
  -f body="<one-line technical reason>" > /dev/null
```

## Resolve review threads

First reply to every thread (see above), then resolve. Never resolve without replying first.

Fetch unresolved thread IDs:

```bash
gh api graphql -F owner='{owner}' -F repo='{repo}' -F number={number} -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 1) { nodes { databaseId } }
          }
        }
      }
    }
  }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | {threadId: .id, commentId: .comments.nodes[0].databaseId}'
```

Match thread comment IDs to the comment IDs processed in this run. Resolve each matched thread:

```bash
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<threadId>"}) { thread { isResolved } } }' > /dev/null
```

## Deduplicated groups

For groups with multiple comment IDs:

1. Reply to each comment in the group individually (all referencing the shared fix)
2. Resolve each comment's thread independently
3. Use the same reply body for all comments in a group
4. All commands redirect to `/dev/null` — same noise suppression rules apply
