# Testing

Version-gated APIs in this file require the module's `go.mod` `go` directive to be at or above the version shown in the heading.

## Testing

### Table-Driven Tests

```go
func TestParseStatus(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    Status
        wantErr bool
    }{
        {name: "valid active", input: "active", want: StatusActive},
        {name: "empty string", input: "", wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseStatus(tt.input)
            if tt.wantErr {
                require.Error(t, err)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

### testing/synctest (1.25+ — virtual time)

```go
import "testing/synctest"

func TestConcurrentTimeout(t *testing.T) {
    synctest.Test(t, func(t *testing.T) {
        ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
        defer cancel()
        go worker(ctx)
        // Time advances instantly when all goroutines block
        synctest.Wait() // wait for all goroutines to reach a blocking point
        // Assert state after virtual time elapses
    })
}
```

### Mocking (mockery v3)

```yaml
# .mockery.yaml
packages:
  github.com/myorg/myapp/internal/user:
    interfaces:
      Store:
        config:
          mockname: MockStore
          outpkg: mocks
```

```bash
go get -tool github.com/vektra/mockery/v3
go tool mockery  # generates mocks via go 1.24 tool directive
```

### Fuzz Testing

```go
func FuzzParseJSON(f *testing.F) {
    f.Add([]byte(`{"name":"test"}`))
    f.Add([]byte(`{}`))
    f.Fuzz(func(t *testing.T, data []byte) {
        result, err := ParseJSON(data)
        if err != nil { return } // invalid input is fine
        // re-encode and check round-trip
        encoded, err := json.Marshal(result)
        require.NoError(t, err)
        assert.JSONEq(t, string(data), string(encoded))
    })
}
```

### Integration with testcontainers

```go
func TestUserStore(t *testing.T) {
    ctx := t.Context() // 1.24: auto-cancelled when test ends
    container, err := mysql.Run(ctx, "mysql:8.0",
        mysql.WithDatabase("test"), mysql.WithUsername("root"), mysql.WithPassword("test"))
    require.NoError(t, err)
    t.Cleanup(func() { container.Terminate(context.Background()) })

    dsn, _ := container.ConnectionString(ctx)
    db, _ := sql.Open("mysql", dsn)
    store := user.NewStore(db)
    // ... test against real MySQL
}
```

### Test Artifacts (1.26+)

```go
func TestGenerate(t *testing.T) {
    dir := t.ArtifactDir() // dedicated directory for test output files
    // Write test artifacts (screenshots, generated files, etc.)
    os.WriteFile(filepath.Join(dir, "output.json"), data, 0o644)
}
// Persist artifacts: go test -artifacts=./testoutput ./...
// Without -artifacts, ArtifactDir returns a temporary directory removed after the test.
```
