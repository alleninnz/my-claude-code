# Anti-Patterns

## Foreign Key Index Assumptions

InnoDB requires indexes for foreign keys and referenced keys. If a suitable referencing-table index does not exist, InnoDB can create one automatically.

The real production problem: the auto-created index only satisfies the FK requirement. For a single-column FK, that means an index on the FK column; it does not create the composite index a query might need, such as `(order_id, created_at, id)`. For a composite FK, the supporting index must contain the FK columns first and in order, but it still might not match application filters or ordering.

```sql
-- FK requirement can be satisfied automatically, but this is not enough
-- for common query shapes such as order_id + created_at.
CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Prefer explicit, named indexes shaped to workload.
CREATE INDEX idx_order_items_order_created
  ON order_items (order_id, created_at, id);
```

## SELECT *

`SELECT *` prevents covering indexes, increases network payload, and can break callers when columns change.

```sql
SELECT id, email, status FROM users WHERE id = ?;
```

## Type Coercion

Implicit type conversion can disable index use.

```sql
-- Bad if user_id is BIGINT
WHERE user_id = '42'

-- Good
WHERE user_id = 42
```

## Functions on Indexed Columns

Move functions off indexed columns when possible.

```sql
-- Bad
WHERE YEAR(created_at) = 2026

-- Good
WHERE created_at >= '2026-01-01'
  AND created_at <  '2027-01-01'
```

## Nullable Columns by Default

Do not make columns nullable unless null has a distinct domain meaning.

```sql
amount DECIMAL(19,4) NOT NULL DEFAULT 0
```

## Long Transactions and HLL

Open transactions under `REPEATABLE READ` can block undo purge and grow history list length (HLL). In Aurora, long read views on replicas can also block purge on shared storage and degrade the writer.

Watch:

- `RollbackSegmentHistoryListLength`
- long-running transactions in `information_schema.innodb_trx`
- lock waits in `performance_schema` or `sys`

Treat HLL above 100K as a common investigation trigger, not a universal failure threshold. Trend and workload context matter.

Mitigations:

- Keep transactions short.
- Use `READ COMMITTED` for analytics when valid.
- Prefer exports or read models over long replica scans.
- Throttle batch jobs when HLL rises.

## OR Across Different Indexed Columns

`OR` across different indexed columns can trigger poor `index_merge` plans.

```sql
SELECT /*+ NO_INDEX_MERGE(t1) */ *
FROM t1
WHERE col1 = ? OR col2 = ?;
```

Consider `UNION ALL`, a composite index, or a query split when it matches the semantics.

## Deadlock Detection

`innodb_deadlock_detect = ON` can become expensive under very high contention, but disabling it changes failure behavior.

Before disabling:

- Prove deadlock detection itself is the bottleneck.
- Confirm the application can tolerate waiting up to `innodb_lock_wait_timeout`.
- Lower `innodb_lock_wait_timeout` deliberately, commonly 3-5s for high-contention workloads.
- Enable deadlock logging while diagnosing:

```sql
SET GLOBAL innodb_print_all_deadlocks = ON;
```

Do not disable deadlock detection as a generic deadlock fix. Fix lock order, transaction scope, and indexes first.

## Charset Mismatch

`utf8mb3` joined to `utf8mb4` can force conversion and prevent index use. Collation mismatch can also fail with "Illegal mix of collations".

Audit charset/collation during 5.7 -> 8.0 and Aurora 2 -> 3 migrations.
