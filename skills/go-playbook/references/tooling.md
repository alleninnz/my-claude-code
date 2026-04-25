# Tooling

Check the repo's existing formatter, linter, and Go toolchain before changing tooling. Prefer the local commands already used by CI.

## Tooling

### golangci-lint v2 (.golangci.yml)

```yaml
version: "2"
formatters:
  enable: [goimports, golines]
  settings:
    golines: { max-len: 120 }
    goimports: { local-prefixes: github.com/myorg }
linters:
  default: all
  disable:
    - depguard
    - exhaustruct
  settings:
    govet: { enable-all: true }
    errcheck: { check-type-assertions: true }
    revive:
      rules:
        - name: unexported-return
          disabled: true
```

### go fix

```bash
# Source-rewriting command. Run only when intentionally modernizing code.
go fix ./...
```

Always inspect the diff after `go fix`; do not mix mechanical modernization with unrelated feature work.

### Essential Commands

```bash
# Format (follow the repo's configured formatter; gofumpt is common)
gofumpt -w .
golines -w --max-len=120 .
gci write -s standard -s default -s "prefix(github.com/myorg)" .

# Lint
golangci-lint run

# Test
go test -race -count=1 ./...
go test -cover -coverprofile=coverage.out ./...
go test -fuzz=FuzzParseJSON -fuzztime=30s ./...

# Build (auto-discovers default.pgo in main package dir)
go build -o bin/myservice ./cmd/myservice

# Modernize intentionally, then review the diff
go fix ./...

# Escape analysis
go build -gcflags='-m' ./...
```

## Anti-Patterns

```go
// ❌ Goroutine leak: no cancellation mechanism
go func() { for { processQueue() } }()
// ✅ Always: context cancellation, WaitGroup, or channel close

// ❌ Concurrent map access: unrecoverable panic
go func() { m["key"] = "val" }()
// ✅ sync.RWMutex or sync.Map

// ❌ Interface pollution: defining alongside implementation
type Store interface { ... } // in the same package as PostgresStore
// ✅ Define interfaces at the consumer, not the provider

// ❌ Context in struct
type Request struct { ctx context.Context; ID string }
// ✅ Context as first parameter
func Process(ctx context.Context, id string) error { ... }

// ❌ init() overuse: hidden side effects, hard to test
func init() { db, _ = sql.Open(...) }
// ✅ Explicit initialization in main() or constructors

// ❌ Naked returns in long functions
func process() (result int, err error) { /* 50 lines */ return }
// ✅ Explicit returns always

// ❌ Panic for control flow
if err != nil { panic(err) }
// ✅ Return errors; panic only for truly unrecoverable programmer errors

// ❌ Premature abstraction: repository + interface + mock before 2nd impl
// ✅ Wait until you have two concrete implementations

// ❌ Defer error ignoring
defer rows.Close()
// ✅ Handle or at minimum log
defer func() {
    if err := rows.Close(); err != nil {
        slog.Warn("Closing rows", "error", err)
    }
}()
```
