# Concurrency

Version-gated APIs in this file require the module's `go.mod` `go` directive to be at or above the version shown in the heading.

## Concurrency

### WaitGroup.Go (1.25+)

Replaces the `wg.Add(1)` + `go func() { defer wg.Done() }()` boilerplate:

```go
var wg sync.WaitGroup
for _, item := range items {
    wg.Go(func() { process(item) })
}
wg.Wait()
```

### Loop Variable Fix (1.22+)

For-loop variables are now **per-iteration scoped**. The `i, url := i, url` idiom is dead:

```go
// Go 1.22+: each goroutine correctly captures its own v
for _, v := range values {
    go func() { fmt.Println(v) }()
}
// Requires `go 1.22` or later in go.mod
```

### conc (sourcegraph/conc) — recommended for production

```go
import "github.com/sourcegraph/conc/pool"

// Bounded parallelism with error collection
func processItems(ctx context.Context, items []Item) error {
    p := pool.New().WithMaxGoroutines(10).WithErrors().WithContext(ctx)
    for _, item := range items {
        p.Go(func(ctx context.Context) error {
            return process(ctx, item)
        })
    }
    return p.Wait()
}

// Collecting typed results
func fetchAll(ctx context.Context, ids []string) ([]Result, error) {
    p := pool.NewWithResults[Result]().WithErrors().WithContext(ctx)
    for _, id := range ids {
        p.Go(func(ctx context.Context) (Result, error) {
            return fetch(ctx, id)
        })
    }
    return p.Wait()
}
```

**conc vs errgroup vs WaitGroup:**

| Feature | sync.WaitGroup | errgroup | conc |
|---------|---------------|----------|------|
| Error handling | Manual | First error | First or all |
| Panic recovery | No | No | Yes + child stack traces |
| Concurrency limit | No | SetLimit | WithMaxGoroutines |
| Result collection | No | No | ResultPool |
| Goroutine launch | `.Go(func())` (1.25) | `.Go(func() error)` | `.Go(func(ctx) error)` |

Use WaitGroup for simplest fire-and-forget. Use errgroup for stdlib-adjacent error propagation + context cancellation. Use conc when you need panic safety, result collection, or ordered streaming.

### errgroup (x/sync alternative)

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            data, err := fetch(ctx, url)
            if err != nil { return err }
            results[i] = data
            return nil
        })
    }
    return results, g.Wait()
}
```

### Context (1.21+)

```go
// WithoutCancel: decouple from parent cancellation
// Use for fire-and-forget work after HTTP handler returns
ctx := context.WithoutCancel(parentCtx)

// AfterFunc: schedule cleanup on context cancellation
stop := context.AfterFunc(ctx, func() {
    conn.Close() // runs in its own goroutine when ctx is done
})
defer stop()

// Timeouts
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
```

### Goroutine Leak Prevention

```go
// Bad: blocks forever if no receiver
ch := make(chan []byte)
go func() { ch <- fetch(url) }()

// Good: buffered channel + context check
ch := make(chan []byte, 1)
go func() {
    data, err := fetch(url)
    if err != nil { return }
    select {
    case ch <- data:
    case <-ctx.Done():
    }
}()

// In tests: use uber-go/goleak
func TestMain(m *testing.M) { goleak.VerifyTestMain(m) }

// Experimental (1.26): goroutine leak profile
// GOEXPERIMENT=goroutineleakprofile
// Detects goroutines blocked on unreachable concurrency primitives
// Available at /debug/pprof/goroutineleak
```

### Graceful Shutdown

```go
func GracefulShutdown(server *http.Server) {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := server.Shutdown(ctx); err != nil {
        slog.Error("Server forced shutdown", "error", err)
    }
}
```
