# Monitoring

## CloudWatch Metrics

| Metric | Watch For |
|--------|-----------|
| `CPUUtilization` | Sustained 70-80%+ |
| `BufferCacheHitRatio` | Below expected baseline; often should be >99% |
| `AuroraReplicaLag` | Reader staleness or overloaded readers |
| `DatabaseConnections` | >80% of connection budget |
| `Deadlocks` | Sustained non-zero |
| `RollbackSegmentHistoryListLength` | HLL growth from long transactions/read views |
| `VolumeReadIOPs` / `VolumeWriteIOPs` | I/O cost and I/O-Optimized analysis |
| `ServerlessDatabaseCapacity` | Serverless v2 scaling behavior |

Thresholds are workload-dependent. Establish baseline before alerting aggressively.

## Performance Insights

Use DB load and waits to identify the bottleneck class.

Common Aurora/MySQL waits:

- `io/aurora_redo_log_flush`: commit-heavy workload.
- `synch/mutex/innodb/buf_pool_mutex`: buffer pool contention.
- `synch/rwlock/innodb/index_tree_rw_lock`: B-tree contention.

When DBLoad exceeds vCPU count, inspect whether the pressure is CPU, lock, I/O, or connection concurrency.

## Lock Waits

Prefer sys/performance schema views for lock diagnosis:

```sql
SELECT * FROM sys.innodb_lock_waits\G

SELECT * FROM performance_schema.data_lock_waits;
SELECT * FROM performance_schema.data_locks;
```

For metadata locks:

```sql
SELECT *
FROM performance_schema.metadata_locks
WHERE OBJECT_SCHEMA = DATABASE();
```

## Slow Query Log

Aurora parameter group starting point:

```text
slow_query_log = 1
long_query_time = 1
log_slow_admin_statements = 1
log_slow_extra = 1
log_queries_not_using_indexes = 1
log_throttle_queries_not_using_indexes = 60
```

Publish to CloudWatch Logs for centralized analysis.

## pt-query-digest

Use `pt-query-digest` for offline slow-log analysis and query fingerprint aggregation.

```bash
pt-query-digest slow.log > slow-report.txt
```

Use it to identify total time by fingerprint, not just the single slowest query sample.

## InnoDB Internals

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for:

- Latest deadlock.
- History list length.
- Semaphore and lock waits.

Unused index candidates:

```sql
SELECT * FROM sys.schema_unused_indexes;
```

Make indexes invisible before dropping when production risk is material.

## Redo Log Capacity

MySQL 8.0.30+ replaced `innodb_log_file_size` / `innodb_log_files_in_group` with `innodb_redo_log_capacity`.

Aurora's distributed storage changes the tuning model. Do not copy self-managed MySQL redo-log tuning advice into Aurora without checking Aurora support, parameter mutability, and AWS guidance for the actual engine version.
