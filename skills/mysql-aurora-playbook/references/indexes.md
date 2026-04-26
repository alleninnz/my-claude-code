# Indexes

## B-tree and Composite Indexes

Composite indexes follow the leftmost-prefix rule for equality, range, `ORDER BY`, and `GROUP BY`.

```sql
CREATE INDEX idx_orders_status_created_id
  ON orders (status, created_at, id);
```

Useful for:

- `WHERE status = ?`
- `WHERE status = ? AND created_at >= ?`
- `WHERE status = ? ORDER BY created_at, id`

Not useful by itself for `WHERE created_at >= ?` unless skip scan is chosen and proven by `EXPLAIN`.

## Covering Indexes

A covering index contains every column needed by the query. InnoDB secondary indexes include the primary key implicitly.

```sql
-- Query: SELECT id, email FROM users WHERE status = 'active'
CREATE INDEX idx_users_status_email ON users (status, email);
```

Do not append the primary key merely to project it in `SELECT`; it is already present in secondary index leaves. Add it explicitly only when predicate or ordering semantics need that key part in a specific position.

## Cardinality

Low-cardinality single-column indexes are often weak.

```sql
-- Often weak if status has only 3 values:
CREATE INDEX idx_orders_status ON orders (status);

-- Usually better when it matches filtering + ordering:
CREATE INDEX idx_orders_status_created_id ON orders (status, created_at, id);
```

Use `SHOW INDEX FROM table_name;` and `EXPLAIN` to check cardinality and plan choice. Low cardinality is not automatically bad when the column is the leading part of a selective composite index.

## Descending Indexes

MySQL 8.0 supports true descending index key parts.

```sql
CREATE INDEX idx_orders_created_desc_id_asc
  ON orders (created_at DESC, id ASC);
```

Use for mixed-direction sorts. Single-column `DESC` usually gives marginal gains because backward scans are available.

## Functional Indexes

Functional indexes need double parentheses and the query expression must match.

```sql
CREATE INDEX idx_users_lower_email ON users ((LOWER(email)));

SELECT id FROM users WHERE LOWER(email) = ?;
```

Functional indexes cannot be primary keys. Prefer a generated column when the expression is reused broadly or needs clearer schema visibility.

## Invisible Indexes

Invisible indexes are useful for testing index removal. They are still maintained and still enforce uniqueness.

```sql
ALTER TABLE orders ALTER INDEX idx_old_status INVISIBLE;
ALTER TABLE orders DROP INDEX idx_old_status;
```

Do not rely on `FORCE INDEX` against an invisible index. Verify the plan after making an index invisible.

## Multi-Valued JSON Indexes

Use multi-valued indexes only for JSON arrays and only when the predicate supports them.

```sql
CREATE TABLE products (
  id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  doc JSON NOT NULL,
  INDEX idx_tags ((CAST(doc->'$.tags' AS CHAR(64) ARRAY)))
);
```

Works with `MEMBER OF()`, `JSON_CONTAINS()`, and `JSON_OVERLAPS()`. Limitations: one multi-valued key part per index, no covering index, no range scans, and DDL may require `ALGORITHM=COPY`.

## Fulltext Indexes

Use fulltext indexes for natural language or boolean text search, not for arbitrary substring matching.

```sql
CREATE FULLTEXT INDEX idx_posts_title_body ON posts (title, body);

SELECT id
FROM posts
WHERE MATCH(title, body) AGAINST ('+aurora -postgres' IN BOOLEAN MODE);
```

For product search or relevance ranking beyond MySQL fulltext semantics, use the service's search architecture instead of forcing relational indexes.

## Partial Index Pattern

MySQL has no native partial indexes. Use a generated column.

```sql
ALTER TABLE users
  ADD COLUMN active_email VARCHAR(255)
    AS (IF(status = 'active', email, NULL)) VIRTUAL,
  ADD INDEX idx_users_active_email (active_email);
```

Use `STORED` instead of `VIRTUAL` when write-time cost and storage are acceptable and read/index behavior needs to be more predictable.
