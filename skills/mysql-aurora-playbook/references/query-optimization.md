# Query Optimization

## First Steps

1. Capture the exact SQL and bind values shape.
2. Check table size, indexes, cardinality, and predicates.
3. Use `EXPLAIN FORMAT=TREE` or `EXPLAIN FORMAT=JSON`.
4. Use `EXPLAIN ANALYZE` only when executing the query is safe.

## Safer Production Plan Inspection

`EXPLAIN ANALYZE` runs the query. For live production diagnostics, prefer inspecting an already-running statement:

```sql
SHOW PROCESSLIST;
EXPLAIN FOR CONNECTION <connection_id>;
```

This avoids re-executing an expensive query.

## EXPLAIN ANALYZE

Use when it is safe to execute the query and you need real timing.

```sql
EXPLAIN ANALYZE
SELECT u.id, u.email, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.status = 'active'
GROUP BY u.id, u.email;
```

Read:

- `actual time=X..Y`: time to first row and all rows.
- `rows=N`: actual rows processed.
- Estimated rows much larger/smaller than actual rows: stale stats, bad cardinality, or missing histogram.

## Optimizer Hints

Use hints after proving the optimizer is wrong. Hints age poorly.

```sql
SELECT /*+ SET_VAR(join_buffer_size=16777216) */ ...;
SELECT /*+ INDEX(t1 idx1) NO_INDEX(t1 idx_old) */ ...;
SELECT /*+ MAX_EXECUTION_TIME(5000) */ * FROM large_table WHERE ...;
```

`MAX_EXECUTION_TIME` applies to `SELECT`, not DML or DDL.

## Hash Join

MySQL 8.0.18 introduced hash joins. In MySQL 8.0.19+, `HASH_JOIN` and `NO_HASH_JOIN` hints have no effect. Use `BNL` / `NO_BNL` to influence hash join behavior in supported 8.0 versions.

```sql
SELECT /*+ NO_BNL(t1) */ ...
FROM t1 JOIN t2 ON t1.c1 = t2.c1;
```

Hash join memory is controlled by `join_buffer_size`. Increase it only after confirming hash join spill or join buffer pressure.

## Histograms

Histograms help skewed non-indexed columns.

```sql
ANALYZE TABLE orders UPDATE HISTOGRAM ON status WITH 64 BUCKETS;
```

They are not automatically refreshed. Re-run after significant data distribution changes.

## Avoiding Filesort

Match filtering and ordering in one index.

```sql
CREATE INDEX idx_orders_status_created_id
  ON orders (status, created_at, id);

SELECT id, created_at
FROM orders
WHERE status = 'shipped'
ORDER BY created_at, id
LIMIT 20;
```

## Upsert

Use row alias syntax on MySQL 8.0.20+ because `VALUES()` in `ON DUPLICATE KEY UPDATE` is deprecated.

```sql
INSERT INTO user_stats (user_id, login_count, last_login)
VALUES (42, 1, NOW()) AS new
ON DUPLICATE KEY UPDATE
  login_count = user_stats.login_count + 1,
  last_login = new.last_login;
```

Make the intended unique key explicit. `ON DUPLICATE KEY` can fire on any unique index.

## Batch Insert

```sql
INSERT INTO events (type, payload) VALUES
  ('click', '{"page":"/"}'),
  ('click', '{"page":"/about"}'),
  ('view',  '{"page":"/pricing"}');
```

Aim for 500-1000 rows per batch, then tune with real latency, redo/binlog pressure, lock time, and packet size.
