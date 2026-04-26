# Batch Operations

## Bulk Insert

Use multi-row inserts and commit in bounded chunks.

```sql
SET autocommit = 0;

INSERT INTO events (type, payload) VALUES
  ('click', '{"page":"/"}'),
  ('click', '{"page":"/about"}'),
  ('view',  '{"page":"/pricing"}');

COMMIT;
```

Starting point:

- 500-1000 rows per insert.
- Commit every 1,000-10,000 rows.
- Insert in primary-key order when practical.
- Keep transactions small enough to avoid HLL, lock, redo, binlog, and replica pressure.

## AUTO_INCREMENT Lock Mode

MySQL 8.0 defaults to `innodb_autoinc_lock_mode = 2` ("interleaved").

This improves concurrency for simple inserts. It does not mean every insert path is lock-free. Bulk forms such as `INSERT ... SELECT` and `LOAD DATA` still have special auto-increment behavior and can produce gaps under concurrency.

Treat auto-increment IDs as opaque identifiers, not gapless sequences.

## Chunked UPDATE/DELETE

`DELETE ... LIMIT N` without a primary-key range predicate does not sort by itself, but it can repeatedly scan to find qualifying rows. Prefer primary-key windows or keyset batches so progress is deterministic.

Bad pattern for large tables:

```sql
DELETE FROM old_events
WHERE created_at < '2025-01-01'
LIMIT 1000;
```

Safer keyset pattern for sparse IDs:

```sql
SET @last_id = 0;

SELECT id
FROM old_events
WHERE id > @last_id
  AND created_at < '2025-01-01'
ORDER BY id
LIMIT 1000;
```

Delete exactly the selected IDs in application code or a temporary table, then set `@last_id` to the largest selected ID. Stop only when the select returns no rows.

Example using a temporary table:

```sql
CREATE TEMPORARY TABLE batch_ids (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY
);

TRUNCATE TABLE batch_ids;

INSERT INTO batch_ids (id)
SELECT id
FROM old_events
WHERE id > @last_id
  AND created_at < '2025-01-01'
ORDER BY id
LIMIT 1000;

-- If this returns zero, stop before deleting.
SELECT COUNT(*) FROM batch_ids;

DELETE e
FROM old_events e
JOIN batch_ids b USING (id);

SELECT @last_id := MAX(id) FROM batch_ids;
```

Repeat from `TRUNCATE TABLE batch_ids`. Do not stop based only on `ROW_COUNT()` from a sparse primary-key range. An empty range can appear before later matching rows.

## Throttling

Between batches:

- Commit.
- Sleep briefly.
- Watch HLL, replica lag, CPU, I/O, and lock waits.
- Reduce batch size if HLL or lock waits climb.

For time-range deletion at scale, prefer partitioning and `DROP PARTITION` when the schema is designed for it.
