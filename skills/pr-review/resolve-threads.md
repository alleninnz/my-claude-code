# Reply and Resolve Threads — API Reference

## Reply rules by comment category

| Category | Reply before resolving? | Reply content |
|----------|------------------------|---------------|
| Fixed (from Step 3A or rescued in Step 3B) | Yes | "Fixed in latest push. \<brief explanation\>" |
| Explicitly skipped (from Step 3A or rescued in Step 3B) | Yes | Concise reason why skipped |
| Auto-skipped Medium/Low (not rescued) | No | Resolve without reply |
| Outdated | No | Resolve without reply |
| Deduplicated groups | Yes (each comment individually) | Same reply referencing the shared fix |

## Reply to review comments

For fixed comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies \
  -f body="Fixed in latest push. <brief explanation>"
```

For explicitly skipped comments:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies \
  -f body="<concise reason why this was intentionally skipped — e.g. existing pattern is sufficient, the concern is redundant, or the suggestion doesn't apply>"
```

## Reply to issue comments (PR-level)

For fixed issue comments:

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  -f body="Fixed in latest push. <brief explanation>"
```

## Resolve review threads

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
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<threadId>"}) { thread { isResolved } } }'
```

## Deduplicated groups

For groups with multiple comment IDs:

1. Reply to each comment in the group individually (all referencing the same fix)
2. Resolve each comment's thread independently
3. Use the same reply body for all comments in a group
