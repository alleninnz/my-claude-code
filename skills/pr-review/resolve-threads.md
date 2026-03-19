# Reply and Resolve Threads — API Reference

## Reply to each processed comment

For review comments that were fixed:

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments/{id}/replies \
  -f body="Fixed in latest push. <brief explanation>"
```

For issue comments that were fixed:

```bash
gh api repos/{owner}/{repo}/issues/{number}/comments \
  -f body="Fixed in latest push. <brief explanation>"
```

Skipped comments: no reply.

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
