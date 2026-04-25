# Database

## Database Patterns

### Ent ORM

```go
// Schema-as-code
func (User) Fields() []ent.Field {
    return []ent.Field{
        field.String("name").NotEmpty(),
        field.String("email").Unique(),
        field.Time("created_at").Default(time.Now).Immutable(),
    }
}

// Eager loading (avoid N+1)
users, err := client.User.Query().
    WithOrders(func(q *ent.OrderQuery) {
        q.WithItems() // nested eager load
    }).
    Where(user.StatusEQ(user.StatusActive)).
    All(ctx)

// Transaction
tx, err := client.Tx(ctx)
if err != nil { return err }
defer tx.Rollback() // no-op after commit
// ... operations on tx ...
return tx.Commit()
```

### Connection Pool (database/sql)

```go
db.SetMaxOpenConns(maxOpen)            // always set — default 0 = unlimited
db.SetMaxIdleConns(maxIdle)            // usually <= MaxOpenConns; tune per workload
db.SetConnMaxLifetime(5 * time.Minute) // below MySQL wait_timeout
db.SetConnMaxIdleTime(5 * time.Minute)
// Always use *Context variants: QueryContext, ExecContext
```

Start from service SLOs, database limits, and deployment concurrency. Do not cargo-cult fixed pool sizes across services.

### Transaction Pattern

```go
// Repository owns the transaction boundary
func (r *Repo) TransferFunds(ctx context.Context, from, to string, amount int) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil { return fmt.Errorf("begin tx: %w", err) }
    defer tx.Rollback()

    if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - ? WHERE id = ?", amount, from); err != nil {
        return fmt.Errorf("debit: %w", err)
    }
    if _, err := tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + ? WHERE id = ?", amount, to); err != nil {
        return fmt.Errorf("credit: %w", err)
    }
    return tx.Commit()
}
```
