# Version Notes

Use these APIs only when the module's `go.mod` `go` directive is at or above the listed version. If the repo targets an older Go version, keep the older pattern.

## Iterators & Range (1.22-1.23)

### Range-over-int (1.22+)

```go
for i := range 10 { fmt.Println(i) } // 0..9
```

### Range-over-func (1.23+)

```go
// iter.Seq[V] = func(yield func(V) bool)
// iter.Seq2[K, V] = func(yield func(K, V) bool)

// Custom iterator
func Backward[E any](s []E) iter.Seq2[int, E] {
    return func(yield func(int, E) bool) {
        for i := len(s) - 1; i >= 0; i-- {
            if !yield(i, s[i]) { return }
        }
    }
}
for i, v := range Backward(mySlice) { ... }

// Compose stdlib iterators
for _, key := range slices.Sorted(maps.Keys(m)) { ... }

// Pull iterator: convert push to on-demand next/stop
next, stop := iter.Pull(mySeq)
defer stop() // ALWAYS defer stop to prevent goroutine leak
v, ok := next()
```

**Convention:** collection methods returning all elements use `.All()`.

### Enhanced ServeMux (1.22+)

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // ...
})
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("GET /files/{path...}", serveFile) // wildcard rest
// Precedence: more specific patterns win
// "GET /users/admin" beats "GET /users/{id}"
// Note (1.26): trailing slash redirects now use 307 instead of 301
```

## Go 1.24-1.26 Features

### Tool Directives (1.24 — replaces tools.go hack)

```text
// go.mod
tool (
    golang.org/x/tools/cmd/stringer
    github.com/golangci/golangci-lint/v2/cmd/golangci-lint
    github.com/vektra/mockery/v3
)
```

```bash
go tool stringer -type=Status    # run tool
go get -tool example.com/cmd/foo # add tool dependency
```

### testing.B.Loop (1.24+, improved 1.26)

```go
// Old: compiler can optimize away, timer issues
func BenchmarkOld(b *testing.B) {
    for i := 0; i < b.N; i++ { process(data) }
}

// New (1.24): prevents dead-code elimination, auto-manages timer
// 1.26: no longer prevents inlining — more accurate results
func BenchmarkNew(b *testing.B) {
    data := setup() // runs once, excluded from timing
    for b.Loop() {
        process(data)
    }
}
```

### Other 1.24 highlights

```go
// t.Context(): auto-cancelled when test completes
func TestFoo(t *testing.T) {
    ctx := t.Context()
    result, err := fetchWithContext(ctx, "...")
}

// json:"omitzero" — zero-value-aware omission (unlike omitempty)
type Config struct {
    Retries int `json:"retries,omitzero"` // omits 0, not just empty
}

// Swiss Tables map: ~30% faster access, ~60% faster iteration, free upgrade
// Just set `go 1.24` in go.mod

// weak.Pointer: memory-efficient caches without preventing GC
ptr := weak.Make(&expensiveObj)
if val := ptr.Value(); val != nil { use(val) }
```

### Go 1.25 highlights

```go
// sync.WaitGroup.Go — see Concurrency section for full example
// testing/synctest — see Testing section for full example

// Container-aware GOMAXPROCS: runtime respects cgroup CPU limits on Linux
// Auto-updates if limits change. Disable: GODEBUG=containermaxprocs=0

// Trace flight recorder: lightweight continuous tracing
recorder := trace.NewFlightRecorder(trace.FlightRecorderConfig{})
if err := recorder.Start(); err != nil {
    return err
}
defer recorder.Stop()

// ... on significant event:
if _, err := recorder.WriteTo(file); err != nil {
    return err
}

// slog.GroupAttrs: create group Attr from attr slice
slog.Info("request", slog.GroupAttrs("http", attrs...))

// net/http.CrossOriginProtection: CSRF protection using Fetch metadata
// No tokens or cookies needed

// go.mod ignore directive: exclude directories from package matching
// Vet: new waitgroup analyzer catches misplaced Add calls
// Vet: new hostport analyzer suggests net.JoinHostPort for IPv6
```

### Go 1.26 highlights

```go
// new(expr): new builtin accepts expressions
type Person struct { Name string; Age *int }
p := Person{Name: "Alice", Age: new(42)} // instead of: tmp := 42; &tmp

// Self-referential generic types
type Adder[A Adder[A]] interface { Add(A) A }

// errors.AsType[T] — see Error Handling section for full example
// Green Tea GC — see Performance section for details
// go fix — see Tooling section before running source-rewriting commands
// slog.NewMultiHandler, T.ArtifactDir — see dedicated sections

// reflect iterator methods: Type.Fields(), Type.Methods(), etc.
// cgo: ~30% faster baseline overhead
// Heap base address randomization on 64-bit (security)
// Compiler: more stack allocation for slice backing stores
// io.ReadAll: ~2x faster, less intermediate memory
// crypto/tls: post-quantum hybrid key exchanges enabled by default
```
