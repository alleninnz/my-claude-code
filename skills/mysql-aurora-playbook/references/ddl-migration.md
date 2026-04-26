# DDL and Schema Migration

## First Line for Production DDL

```sql
SET SESSION lock_wait_timeout = 10;
```

MySQL's default `lock_wait_timeout` can be extremely long. DDL waits for metadata locks; once queued, later reads/writes on that table can queue behind the DDL.

Check blockers:

```sql
SELECT *
FROM information_schema.innodb_trx
ORDER BY trx_started;

SELECT *
FROM performance_schema.metadata_locks
WHERE OBJECT_SCHEMA = DATABASE()
  AND OBJECT_NAME = 'target_table';
```

## Instant DDL

Use `ALGORITHM=INSTANT` only for operations that support it on the actual MySQL/Aurora version.

```sql
ALTER TABLE users
  ADD COLUMN middle_name VARCHAR(100) DEFAULT NULL,
  ALGORITHM=INSTANT;
```

Common instant operations:

- Add column, with version and table restrictions.
- Drop column on MySQL 8.0.29+ with restrictions.
- Set/drop column default.
- Rename column on MySQL 8.0.28+ when not blocked by FK/reference constraints.

Not instant:

- Add/drop indexes.
- Change data type.
- Add foreign key.
- Convert charset.
- Reorder columns.

Instant add/drop column creates row versions. After 64 row versions, more instant add/drop operations fail until a rebuild resets the counter.

## Online Index DDL

```sql
ALTER TABLE orders
  ADD INDEX idx_orders_status_created (status, created_at),
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

Even online DDL still needs metadata locks at start/end. Use lock wait timeout and check blockers.

## OPTIMIZE TABLE

For InnoDB, `OPTIMIZE TABLE` rebuilds the table, similar to `ALTER TABLE ... FORCE`. It is not a harmless cleanup command.

Use only when the rebuild cost, metadata locks, replica impact, and temporary space are acceptable.

## gh-ost vs pt-online-schema-change

| Tool | Use When | Watch Out |
|------|----------|-----------|
| gh-ost | Large table, no foreign keys, binlog available | Needs row-based binlog assumptions and operational setup |
| pt-online-schema-change | Foreign keys or trigger-compatible workflow | Triggers add write amplification |

Do not default to either tool without checking foreign keys, triggers, binlog settings, replica lag, and application write patterns.

## Expand/Migrate/Contract

Breaking schema changes should be split:

1. Expand: add nullable/new column/index/endpoint without breaking old code.
2. Migrate: backfill and switch readers/writers.
3. Contract: remove old column/path after all consumers are verified.

Avoid mixing expand and contract in one deploy unless the table and all consumers are provably private and low risk.

## Aurora Fast DDL

Aurora Fast DDL was an Aurora MySQL 2 feature. Aurora MySQL 3 uses community MySQL instant DDL behavior instead.
