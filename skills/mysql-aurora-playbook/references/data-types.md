# Data Types

## Defaults, Not Absolutes

Match existing schema and domain semantics first. These are defaults for new MySQL 8.0/Aurora MySQL 3 designs.

| Need | Default | Notes |
|------|---------|-------|
| PK / FK | `BIGINT UNSIGNED` | Avoid `INT` when growth can exceed 2B rows |
| Time | `DATETIME(6)` | Broad range, no timezone conversion |
| Money | `DECIMAL(p, s)` | Pick precision from domain; never `FLOAT`/`DOUBLE` |
| Boolean | `TINYINT(1)` | MySQL convention |
| UUID | `BINARY(16)` | Smaller and index-friendly |
| JSON | `JSON` + generated/indexed columns | Do not filter large JSON blobs without an indexable projection |
| Enum-like | `VARCHAR` + `CHECK` | Avoid `ENUM` when values change often |
| Hash/token | `BINARY(N)` or `VARBINARY(N)` | More compact than hex `CHAR` |

## UUID Storage

Prefer `BINARY(16)` over `CHAR(36)` for indexed UUIDs.

```sql
uuid BINARY(16) NOT NULL
```

For UUIDv1, use the swap flag consistently:

```sql
INSERT INTO t (uuid) VALUES (UUID_TO_BIN(UUID(), 1));
SELECT BIN_TO_UUID(uuid, 1) FROM t;
```

For UUIDv7, generate in application code and store without swapping:

```sql
INSERT INTO t (uuid) VALUES (UUID_TO_BIN(@uuid_v7, 0));
```

Do not mix swapped and unswapped encodings in the same column.

## DATETIME vs TIMESTAMP

Use `DATETIME(6)` for new domain timestamps unless timezone conversion is explicitly desired.

- `DATETIME(6)`: range 1000-01-01 to 9999-12-31; no timezone conversion.
- `TIMESTAMP(6)`: range 1970-01-01 to 2038-01-19; automatic UTC/session timezone conversion.

```sql
created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
```

## utf8mb4 Index Length

InnoDB index key length is limited by bytes, not characters. With `utf8mb4`, each character can require 4 bytes. On the common MySQL 8.0/InnoDB 16 KiB page setup, a 3072-byte limit means about 768 utf8mb4 characters across indexed columns. Verify page size and row format before relying on that ceiling.

```sql
-- Risky as a composite index if both columns are large utf8mb4 VARCHARs.
CREATE INDEX idx_big ON t (a, b);

-- Usually safer: size to real data, use prefixes only when equality semantics allow it.
CREATE INDEX idx_email_status ON users (email, status);
```

For ASCII-only values such as hashes, tokens, and country codes, use `CHARACTER SET ascii` to reduce index bytes.

## Charset and Collation

- MySQL 8.0 default is `utf8mb4_0900_ai_ci`.
- `utf8mb4_0900_ai_ci` uses NO PAD semantics, so trailing-space comparisons can change during migration.
- Joining `utf8mb3` and `utf8mb4` columns can prevent index use.
- Character set and collation must match across string FK columns.

## JSON Projections

Index JSON through generated columns when querying by a JSON field.

```sql
CREATE TABLE events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  payload JSON NOT NULL,
  event_type VARCHAR(64) AS (payload->>'$.type') VIRTUAL,
  INDEX idx_events_event_type (event_type)
);
```
