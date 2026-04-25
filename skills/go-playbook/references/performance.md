# Performance

Version-gated runtime behavior in this file requires the module's `go.mod` `go` directive or deployment toolchain to be at or above the version shown in the heading.

## Performance

### PGO (Profile-Guided Optimization, 1.21+ GA)

```bash
# 1. Collect 30s CPU profile from production
curl -s http://localhost:6060/debug/pprof/profile?seconds=30 > default.pgo
# 2. Place default.pgo in main package directory
# 3. Rebuild — 2-14% speedup from aggressive inlining + devirtualization
go build -o myservice ./cmd/myservice
# Commit default.pgo to version control for reproducible builds
```

### Container-Aware GOMAXPROCS (1.25+)

```go
// Runtime now automatically respects cgroup CPU bandwidth limits on Linux
// Periodically updates GOMAXPROCS if limits change (e.g., vertical scaling)
// Replaces the need for uber-go/automaxprocs in most cases

// Disable if needed:
// GODEBUG=containermaxprocs=0  (disable cgroup awareness)
// GODEBUG=updatemaxprocs=0     (disable periodic updates)
// Or set GOMAXPROCS env var / call runtime.GOMAXPROCS() to override
```

### Green Tea GC (1.26 default)

- 10-40% reduction in GC overhead via improved small-object locality
- Additional 10% on newer CPUs (Ice Lake+, Zen 4+) via vector instructions
- Free upgrade — just set `go 1.26` in go.mod
- Disable: `GOEXPERIMENT=nogreenteagc` (opt-out expected removed in 1.27)

### GOGC / GOMEMLIMIT (container tuning)

```dockerfile
# ECS task definition / Dockerfile
ENV GOMEMLIMIT=460MiB   # ~90% of 512MiB container
ENV GOGC=100             # or GOGC=off with GOMEMLIMIT for max throughput
```

### sync.Pool

```go
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func Process(data []byte) []byte {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() { buf.Reset(); bufPool.Put(buf) }()
    buf.Write(data)
    return append([]byte(nil), buf.Bytes()...) // do not expose pooled backing array
}
// Use when: allocation rate >1000/sec for short-lived objects
// Never: store references to pooled objects after Put
```

### Preallocation

```go
// Slices: single allocation
results := make([]Result, 0, len(items))

// Maps: avoid rehashing
m := make(map[string]int, expectedSize)

// strings.Builder: pre-grow
var sb strings.Builder
sb.Grow(estimatedSize)
```

### Escape Analysis

```bash
go build -gcflags='-m' ./...  # check allocations
```

Common heap-escape causes: returning pointers, closure captures in goroutines, interface assignments, objects >~64KB. In hot paths: return by value, pass params explicitly to goroutines.

Note (1.25-1.26): compiler now allocates slice backing stores on stack in more situations — free performance improvement.
