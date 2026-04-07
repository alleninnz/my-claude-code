---
paths:
  - "**/*.go"
---

# Error Ownership

1. **One owner per error** — classify and log each error in exactly one place. When writing shared functions, decide who owns classification (shared function or caller) based on whether callers need different handling for the same error.

2. **Trace before fixing** — before changing any error path, trace the full chain from source to response. Fix holistically, don't patch one layer.

3. **Don't change error behavior by accident** — when modifying code that returns errors, diff the before/after error paths. Intentional changes are fine — give them their own tests. Run existing error-path tests after any change.
