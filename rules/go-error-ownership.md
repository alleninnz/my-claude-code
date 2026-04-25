---
paths:
  - "**/*.go"
---

# Error Ownership

**IMPORTANT — You MUST follow these rules when touching any Go error path. Violations cause silent bugs and duplicate logging.**

1. **One owner per error** — classify and log each error in exactly one place. When writing shared functions, decide who owns classification (shared function or caller) based on whether callers need different handling for the same error. **NEVER log the same error in multiple layers.**

2. **Trace before fixing** — before changing any error path, you MUST trace the full chain from source to response. Fix holistically, don't patch one layer. **No blind single-layer patches.**

   Trace checklist:
   - Source error: where the error is created or returned
   - Wrap point: where context is added with `%w`
   - Classification owner: the layer that decides retryable/not found/validation/internal/etc.
   - Log owner: the single layer allowed to log this error
   - Transport mapping: HTTP/gRPC/GraphQL status and response shape
   - Test expectation: the existing or new test that proves the intended behavior

3. **Don't change error behavior by accident** — when modifying code that returns errors, you MUST diff the before/after error paths. Intentional changes are fine — give them their own tests. Run existing error-path tests after any change.
