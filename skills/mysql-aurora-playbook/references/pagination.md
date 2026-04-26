# Pagination

## Avoid Deep OFFSET

Deep offsets scan and discard rows.

```sql
SELECT *
FROM orders
ORDER BY id
LIMIT 20 OFFSET 100000;
```

Use this only for small tables or admin-only workflows where predictable performance is not required.

## Cursor Pagination

Use a stable sort and include a unique tiebreaker.

```sql
-- First page
SELECT id, created_at, total
FROM orders
WHERE status = 'completed'
ORDER BY created_at, id
LIMIT 21;

-- Next page
SELECT id, created_at, total
FROM orders
WHERE status = 'completed'
  AND (
    created_at > :last_created_at
    OR (created_at = :last_created_at AND id > :last_id)
  )
ORDER BY created_at, id
LIMIT 21;
```

Fetch `N+1` rows to determine `hasNextPage`.

Required index:

```sql
CREATE INDEX idx_orders_status_created_id
  ON orders (status, created_at, id);
```

## Row Constructors

Row constructors are semantically compact, but they can use less of a composite index when mixed with other predicates.

```sql
-- Risk: may not use the full composite index in all shapes.
WHERE status = 'completed'
  AND (created_at, id) > (:last_created_at, :last_id)
```

Prefer the decomposed form for deterministic composite-index use:

```sql
WHERE status = 'completed'
  AND (
    created_at > :last_created_at
    OR (created_at = :last_created_at AND id > :last_id)
  )
```

MySQL 8.0 has row constructor optimizations, including range optimization for some forms, but the decomposed predicate remains safer when prefix usage matters. Always verify with `EXPLAIN`.

## Deferred Join

When an addressable page number is unavoidable, fetch IDs first through a covering index, then join back to full rows.

```sql
SELECT o.*
FROM orders o
JOIN (
  SELECT id
  FROM orders
  ORDER BY created_at, id
  LIMIT 100000, 20
) page USING (id);
```

This still scans to the offset, but it scans a narrower index before fetching full rows.

## Cursor Encoding

Encode cursor state as an opaque token containing the sort keys and direction. Do not expose implementation details that prevent future cursor changes.
