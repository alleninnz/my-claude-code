# Aurora Features

## Version Gate First

Aurora MySQL 3.x is MySQL 8.0-compatible, but Aurora minor versions map to different MySQL 8.0 patch levels. Check the cluster before relying on version-specific behavior.

```sql
select aurora_version();
select @@aurora_version;
```

Examples:

- Aurora MySQL 3.04.x maps to community MySQL 8.0.28 and is an Aurora LTS line.
- Aurora MySQL 3.10.x maps to community MySQL 8.0.42 and is an Aurora LTS line.
- Aurora MySQL 3.12.x maps to community MySQL 8.0.44.

The LTS label belongs to the Aurora minor line here, not the mapped community MySQL 8.0.x release. MySQL's community LTS release model starts with MySQL 8.4.

## Storage Mental Model

Aurora separates compute from a distributed shared cluster volume replicated across three Availability Zones. This is why RDS MySQL tuning advice does not always transfer directly.

The common mental model is six storage copies, two per AZ. Writes complete after a storage quorum, commonly described as four of six copies, instead of waiting on a single local disk.

Practical consequences:

- Do not blindly tune local disk/fsync-oriented settings as if this were self-managed MySQL.
- Be skeptical of advice centered on `innodb_flush_log_at_trx_commit`, `sync_binlog`, or local redo-file sizing until Aurora support and behavior are verified for the actual engine version.
- Read replicas attach to the same shared storage, so long replica read views can still block purge and hurt the writer.
- Scaling readers does not copy table data.

## Endpoints

| Endpoint | Use |
|----------|-----|
| Cluster/writer | All writes; failover-safe writer endpoint |
| Reader | Read-only traffic that tolerates replica lag |
| Instance | Operational targeting only; avoid in normal app code |

Use session consistency only when the request needs read-your-own-writes from a reader.

```sql
SET aurora_replica_read_consistency = 'SESSION';
```

Do not set `aurora_replica_read_consistency` globally without proving the latency cost. RDS Proxy does not support `SESSION` replica read consistency.

## Serverless v2

- ACUs are roughly 2 GiB memory each, in 0.5 increments.
- Scale-to-zero requires Aurora MySQL 3.08.0+.
- `max_connections` is derived from max ACU and requires reboot after max ACU changes.
- Performance Insights commonly needs min 2 ACU; Global Database commonly needs min 8 ACU.
- A higher min ACU can improve scale-up speed and preserve buffer cache.

## I/O-Optimized

Aurora I/O-Optimized removes per-I/O charges and increases instance cost. Use it when I/O spend is a large share of total Aurora spend, commonly around 25% or more.

AWS docs checked on 2026-04-26 state:

- Aurora Standard -> I/O-Optimized: once every 30 days.
- I/O-Optimized -> Aurora Standard: any time.
- Non-NVMe instances switch without downtime; NVMe-based configurations can require a restart.

Model with actual `VolumeReadIOPs`, `VolumeWriteIOPs`, and cost data before switching.

## Storage Size

Aurora storage limits are version-gated. Aurora MySQL 3.10+ supports larger cluster volumes than older 3.x lines. Check AWS size limits for the actual engine version before asserting a maximum such as 128 TiB or 256 TiB.

## Parallel Query

Parallel Query pushes scan-heavy work to the storage layer and bypasses the buffer pool.

```sql
SET aurora_parallel_query = 1;
EXPLAIN SELECT ...;
```

Use only for data-intensive full scans and verify that `EXPLAIN` shows parallel query. It is not an index optimization.

## Backtrack

Backtrack rewinds the entire cluster within the configured window, up to 72 hours.

Important constraints:

- Must be enabled when the cluster is created or restored.
- Cluster-wide only; not per table or per transaction.
- Backtracking disrupts connections while Aurora rewinds.
- Backtrack-enabled clusters cannot create cross-Region read replicas.
- Binlog can be enabled, but backtracking a binlog-enabled cluster usually errors unless forced; forcing can break downstream replicas and interfere with Blue/Green deployments.

Use point-in-time recovery for normal disaster recovery. Use Backtrack only for narrow "undo recent damage" workflows that accept the operational constraints.

## Blue/Green Deployments

- Enabling required binlog settings may require reboot.
- High write throughput can cause replication lag in the green environment.
- Backtrack operations on the blue cluster can break Blue/Green switchover.

## Failover

Aurora promotes a replica and updates cluster endpoints. Keep transactions short and make retry semantics explicit.

- Java: prefer AWS Advanced JDBC Wrapper for topology-aware failover, monitoring, read/write splitting, and IAM auth.
- Other runtimes: use cluster endpoints, driver-supported connection validation, short connection lifetimes, and bounded retries.

## Authentication and Security

- MySQL 8.0 defaults to `caching_sha2_password`; older clients may need upgrades before Aurora MySQL 3 migration.
- IAM database authentication avoids static DB passwords but has token-generation and connection-rate constraints.
- Enforce TLS per user when required:

```sql
ALTER USER 'app'@'%' REQUIRE SSL;
```

- Use MySQL roles for grouped privileges, but keep least-privilege grants explicit and reviewed.
