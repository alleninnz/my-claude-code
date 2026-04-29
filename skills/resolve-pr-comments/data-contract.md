# Review Data Contract

`scripts/fetch-comments.py` returns raw, thread-aware GitHub PR data. The main skill classifies this data; the script does not decide what to fix.

## Top-Level Shape

```json
{
  "schema_version": 1,
  "source": "resolve-pr-comments/scripts/fetch-comments.py",
  "pull_request": {},
  "conversation_comments": [],
  "reviews": [],
  "review_threads": []
}
```

## Pull Request

- `owner`, `repo`, `number`, `url`, `title`, `state`
- `author`: PR author login
- `base_ref`: base branch name
- `head_sha`: current PR head SHA
- `updated_at`: PR update timestamp

## Conversation Comments

These are PR-level comments. They have no GitHub resolved state.

- `id`: REST database ID
- `node_id`: GraphQL node ID
- `type`: `pr_level`
- `body`, `created_at`, `updated_at`
- `author`, `author_association`
- `positive_reactions`: users who left `THUMBS_UP`, `HOORAY`, or `ROCKET`

Treat PR-level comments containing `<!-- resolve-pr-comments:reply -->` as prior skill replies and drop them before classification.

## Review Threads

These are inline review threads.

- `thread_id`: GraphQL review thread ID
- `is_resolved`: GitHub thread resolved state
- `is_outdated`: GitHub thread outdated state
- `path`, `line`, `start_line`, `original_line`, `original_start_line`
- `comments[]`: thread comments fetched by the script, each with `id`, `node_id`, `body`, `author`, timestamps, and `author_association`

Only unresolved threads are actionable by default. Outdated unresolved threads should be shown in the triage summary, not queued as fresh fixes unless the current code still has the issue.

## Reviews

Review submissions can contain top-level requested-change text.

- `state`: `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`, etc.
- `body`, `submitted_at`, `author`

Use review bodies as context. If a review body contains a concrete change request that is not represented by a thread or PR-level comment, include it as a PR-level actionable item.

## Classification Output

After reading this raw data, produce:

- `outdated[]`
- `copilot_triage[]`
- `nitpick_triage[]`
- `critical_major[]`
- `medium_low[]`
- `reply_only[]`
- `deferred[]`
- `thread_map[]`

Each actionable item must include: `ids`, `source_type`, `reviewer`, `signal_quality`, `severity`, `location`, `summary`, `problem`, `wants`, `code_evidence`, `confidence`, `recommendation`, `reason`, `original`, and PR-level `signals` when applicable.

- `code_evidence`: the concrete artifact in current code that confirms or refutes the bot's claim. One of:
  - `"<file:line>: <quoted code>"` — for positive inline claims (bot says line X has bug Y; show line X).
  - `"<grep/diff/test result>"` — for negative or cross-file claims (missing tests, schema/migration concerns, peer patterns).
  - `"no concrete evidence available; bot's claim is about <absence | cross-file | ownership | process | PR-level>"` — only when no in-repo artifact can confirm or deny.

  `Fix` requires the first or second form. Paraphrasing reviewer text into this field does not count as evidence.
- `recommendation`: agent's suggested action displayed on the card. Critical/Major items: one of `Fix`, `Defer`, `Reply only`, `Needs your decision`. Medium/Low compact cards: `Fix`, `Reply only`, or `Review` (the last is for items where `code_evidence` is non-concrete and the agent cannot verify within this repo).
- `decision`: user's recorded action, one of `Fix`, `Defer`, `Reply only` (3 values). The publish protocol only accepts these three plus auto-bucket states (`Outdated`, `Auto-skipped`). `Needs your decision` and `Review` are non-publishable recommendations — the user must convert them into one of the three terminal `decision` values before the workflow advances.

`nitpick_triage[]` is for automated reviewer comments explicitly labeled `Nitpick`. These comments are ignored and not processed. Do not include them in `thread_map[]`; do not reply to or resolve their threads.

Inline actionable items must also include `thread_ids`: every review thread ID represented by the item or deduplicated group. Thread resolution uses these IDs directly; do not resolve inline comments by matching comment IDs.

Medium/Low compact cards and any `Reply only` or `Defer` recommendation must include `risk_if_skipped` (the risk of not fixing).

`thread_map[]` tracks inline items that may need replies or resolution. Each entry should include `item_id`, `thread_ids`, `comment_ids`, `category`, and planned reply intent after user decisions are recorded.

Presentation buckets are severity-first. A Critical/Major item with a `Reply only`, `Defer`, `Needs your decision`, or downgraded-severity recommendation must remain in `critical_major[]`; the recommendation does not move it to `reply_only[]`, `deferred[]`, or `medium_low[]`.
