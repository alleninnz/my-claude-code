---
name: go-playbook
description: Use when a Go task needs version-specific APIs, idiomatic error/concurrency/testing patterns, package/interface design tradeoffs, performance tuning, gRPC/protobuf, database/sql, Ent, or tooling decisions.
---

# Go Playbook (1.21-1.26)

Idiomatic Go patterns and production-ready recipes. Load only the reference section needed for the current task.

## When to Use

- Writing or reviewing Go code where the right idiom is not obvious
- Designing packages, structs, or dependency injection
- Optimizing performance (PGO, GC tuning, allocations)
- Writing tests (table-driven, fuzz, integration, benchmarks)
- Working with gRPC/Protobuf, databases, or structured logging

**Not for:** Non-Go languages, generic algorithms unrelated to Go idioms, trivial syntax questions, or repos where nearby code already gives a clear pattern.

## Version Gate

Before using version-specific APIs, check the repo's `go.mod` `go` directive. If the module targets an older Go version, use the fallback pattern already shown nearby or the older equivalent in the reference.

## Quick Reference

| Idiom | Pattern | Section |
|-------|---------|---------|
| Error matching | `errors.AsType[*T](err)` (1.26) | `references/errors.md` |
| Error wrapping | `fmt.Errorf("context: %w", err)` | `references/errors.md` |
| Goroutine launch | `wg.Go(func() { ... })` (1.25) | `references/concurrency.md` |
| Bounded parallelism | `conc/pool` with `WithMaxGoroutines` | `references/concurrency.md` |
| Iterators | `iter.Seq[V]`, `iter.Seq2[K,V]` (1.23) | `references/version-notes.md` |
| HTTP routing | `mux.HandleFunc("GET /users/{id}", h)` (1.22) | `references/version-notes.md` |
| Test concurrency | `testing/synctest` virtual time (1.25) | `references/testing.md` |
| Benchmarks | `b.Loop()` (1.24) | `references/testing.md` |
| Logging | `slog.NewMultiHandler` (1.26) | `references/logging.md` |
| Container perf | Auto GOMAXPROCS from cgroup (1.25) | `references/performance.md` |
| GC | Green Tea GC default (1.26) | `references/performance.md` |
| Lint | `golangci-lint v2` with `go tool` (1.24) | `references/tooling.md` |

## Reference Routing

Read only the file that matches the current work:

- `references/errors.md` — wrapping, sentinels, custom types, `errors.AsType[T]`, duplicate logging
- `references/concurrency.md` — `WaitGroup.Go`, conc, `errgroup`, context, goroutine leaks, graceful shutdown
- `references/version-notes.md` — Go 1.22-1.26 APIs: iterators, ServeMux, tool directives, `omitzero`, flight recorder, release highlights
- `references/design.md` — interfaces, packages, dependency injection, structs, method receivers, zero values
- `references/testing.md` — table-driven tests, `testing/synctest`, mockery v3, fuzzing, testcontainers, artifacts
- `references/logging.md` — slog setup, child loggers, groups, `NewMultiHandler`, redaction
- `references/performance.md` — PGO, GOMAXPROCS, Green Tea GC, memory limits, `sync.Pool`, allocation analysis
- `references/grpc-protobuf.md` — buf, gRPC status errors, rich errors, interceptors, health checks
- `references/database.md` — Ent, `database/sql` pools, transactions
- `references/tooling.md` — golangci-lint v2, formatting, essential commands, anti-patterns
