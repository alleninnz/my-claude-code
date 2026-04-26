# Logging

## Structured Logging (slog, 1.21+)

```go
// Setup: JSON handler for production
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo, AddSource: true,
}))
slog.SetDefault(logger)

// Basic usage
slog.Info("request completed", "method", "GET", "status", 200, "duration_ms", 45)

// Child logger with persistent context
reqLogger := slog.With("request_id", reqID, "user_id", userID)
reqLogger.Info("Processing order", "order_id", orderID)

// Grouped attributes for nested JSON
slog.Info("request", slog.Group("http",
    slog.String("method", r.Method),
    slog.Int("status", code),
))
// {"http":{"method":"GET","status":200}}

// GroupAttrs (1.25): create group from attr slice
slog.Info("request", slog.GroupAttrs("http", attrs...))

// MultiHandler (1.26): fan out to multiple backends
handler := slog.NewMultiHandler(jsonHandler, sentryHandler)
logger := slog.New(handler)

// Hot path: avoid reflection with LogAttrs
logger.LogAttrs(ctx, slog.LevelInfo, "processed",
    slog.String("id", id), slog.Duration("took", elapsed))

// Sensitive data redaction via LogValuer
type Token string
func (t Token) LogValue() slog.Value { return slog.StringValue("REDACTED") }
```

**slog vs zap vs zerolog:**

- slog: good baseline for new projects unless the repo already standardizes on zap/zerolog/logrus
- zerolog: raw performance winner (zero-allocation)
- zap: high customization via zapcore
- Pragmatic: slog frontend + high-perf backend handler (slogzap/slogzerolog)
