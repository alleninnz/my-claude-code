---
paths:
  - "**/*.go"
---

# Error Ownership

**IMPORTANT — You MUST follow these rules when touching any Go error path. Violations cause silent bugs and duplicate logging.**

1. **One owner per error** — classify and log each error in exactly one place. When writing shared functions, decide who owns classification (shared function or caller) based on whether callers need different handling for the same error. **NEVER log the same error in multiple layers.**

2. **Trace before fixing** — before changing any error path, you MUST trace the full chain from source to response. Fix holistically, don't patch one layer. **No blind single-layer patches.**

3. **Don't change error behavior by accident** — when modifying code that returns errors, you MUST diff the before/after error paths. Intentional changes are fine — give them their own tests. Run existing error-path tests after any change.
