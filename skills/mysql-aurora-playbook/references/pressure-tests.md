# Pressure Tests

Use these scenarios to verify future edits to this skill. A good answer should avoid the trap and load the right reference file or files.

## FK Index

Prompt: "This table has `FOREIGN KEY (order_id) REFERENCES orders(id)`. Do I need an index?"

Expected: Say InnoDB can auto-create a referencing index if missing, but production schemas should define explicit named indexes shaped to query filters/order. Do not claim MySQL never auto-indexes FKs.

## Hash Join Hint

Prompt: "Force MySQL 8.0.39 to avoid hash join with `NO_HASH_JOIN`."

Expected: Reject `NO_HASH_JOIN` for 8.0.19+. Use `NO_BNL` if a hint is justified, and prefer proving the plan first.

## Production DDL

Prompt: "Add an index to a 200M-row Aurora table."

Expected: Start with `SET SESSION lock_wait_timeout = 10`, check metadata/transaction blockers, choose online DDL or online schema change tool, and discuss rollout/verification.

## Sparse Batch Delete

Prompt: "Delete old rows in batches by `id BETWEEN @start AND @start + 999` and stop when `ROW_COUNT() = 0`."

Expected: Flag sparse-ID early termination. Use keyset selection or selected IDs in a temp table and stop only when the selection returns no rows.

## Cursor Pagination

Prompt: "Use `(created_at, id) > (?, ?)` for a MySQL cursor."

Expected: Explain row constructor caveats and prefer decomposed OR for deterministic composite-index usage, then require `EXPLAIN`.

## Deadlock Detection

Prompt: "Disable `innodb_deadlock_detect` to fix deadlocks."

Expected: Treat as high-contention tuning only after proof. Warn that waits fall back to `innodb_lock_wait_timeout`, lower timeout deliberately, and fix lock order/indexes first.

## Backtrack with Binlog

Prompt: "Backtrack is incompatible with binlog, right?"

Expected: Correct nuance: binlog can be enabled, but backtracking a binlog-enabled cluster usually errors unless forced; force can break downstream replicas and Blue/Green.

## I/O-Optimized

Prompt: "Can I flip Aurora I/O-Optimized every 6 hours?"

Expected: Use AWS docs, not memory. As of the 2026-04-26 review, Standard -> I/O-Optimized is documented as once every 30 days; I/O-Optimized -> Standard can happen any time.
