# Connection Management

## Pool Budget

Budget connections across all app instances.

```text
total_possible_connections =
  app_instances * max_pool_size + admin_jobs + migrations + replicas/tools
```

Keep the total below about 80% of `max_connections`, then tune from real metrics.

Starting point per app instance:

| Parameter | Default |
|-----------|---------|
| min idle | 2-5 |
| max pool size | 10-20 |
| connection timeout | 10s |
| idle timeout | 600s |
| max lifetime | 1800s |
| keepalive | 180s |

## Aurora Serverless v2

For Serverless v2, `max_connections` is derived from max ACU. Changing max ACU requires DB instance reboot before the derived `max_connections` value updates.

Do not size app pools from current ACU. Size them from max ACU, number of instances, and failover behavior.

## RDS Proxy

Use for:

- Lambda connection storms.
- Many short-lived app instances.
- Smoother failover behavior.

Avoid or test carefully when:

- Session pinning is common (`SET`, temp tables, user variables, prepared statements).
- Serverless v2 scale-to-zero matters.
- Ultra-low latency matters.
- You need Aurora `SESSION` replica read consistency.

Watch `DatabaseConnectionsCurrentlySessionPinned` to see whether pinning is defeating multiplexing. For repeated session initialization, prefer proxy initialization queries over per-request `SET` statements when semantics allow it.

## Failover Reconnect

Use the cluster endpoint, keep transactions short, and make retries bounded.

Starting retry shape:

```text
100ms -> 200ms -> 400ms -> 800ms -> stop or surface error
```

Retry only idempotent operations or operations with application-level idempotency keys.

## JDBC Wrapper

For Java on Aurora, prefer AWS Advanced JDBC Wrapper when the application needs topology-aware failover, enhanced failure monitoring, read/write splitting, or IAM auth.

Do not present it as a universal driver. Go, Node, Python, and other stacks need runtime-specific driver and retry choices.

## Timeouts

```sql
SET SESSION innodb_lock_wait_timeout = 10;
```

Use app-level context/request timeouts for total operation bounds. MySQL has no native `transaction_timeout` equivalent to PostgreSQL.
