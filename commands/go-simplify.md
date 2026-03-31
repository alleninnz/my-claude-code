---
description: Use when simplifying Go code for clarity and maintainability.
  Runs staticcheck gosimple checks then applies structural simplifications.
  Default targets uncommitted changes.
---

# Go Simplify

Dispatch the **go-simplifier** agent to simplify Go code using a 3-layer approach:
staticcheck mechanical fixes → AI structural checks → AI architectural checks.

```text
/go-simplify                    # Simplify uncommitted changes (staged + unstaged)
/go-simplify --base             # Simplify files changed on branch vs main/master
/go-simplify path/to/file.go   # Simplify specific file(s)
```
