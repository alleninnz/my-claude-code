# my-claude-code

Claude Code plugin for Go development — agents, skills, and commands.

## Install

```bash
/plugin marketplace add alleninnz/my-claude-code
/plugin install my-claude-code
```

## Commands

| Command | Agent | What it does |
|---------|-------|-------------|
| `/go-simplify` | go-simplifier | Simplify Go code: staticcheck fixes, structural + architectural cleanup |

## Skills

| Skill | What it does |
|-------|-------------|
| `pr` | Create and update PRs with diff-based title/description generation |
| `resolve-pr-comments` | Interactive per-comment review of AI reviewer feedback on current PR |
| `write-articles` | Technical articles, voice capture, evidence-first writing |
| `go-playbook` | Go 1.21-1.26 patterns — error handling, concurrency, testing, performance, gRPC |
| `mysql-aurora-playbook` | MySQL 8.0 & Aurora MySQL 3 patterns — indexes, types, queries, DDL, monitoring |
| `skill-guiding` | Browse and discover installed skills from user directory and marketplace plugins |
| `opsx-prompt` | Generate ticket-first `opsx:new` prompts from Linear issues, with optional deeper review |

## Rules

> **Note:** Claude Code plugins cannot distribute rules yet. Run `npm run install:rules` to copy these files into `~/.claude/rules/` for them to take effect.

| Rule | Triggers on | What it does |
|------|-------------|--------------|
| `go-playbook.md` | `**/*.go`, `**/go.mod`, `**/go.sum` | Auto-invokes the go-playbook skill when touching Go files |
| `go-quality.md` | `**/*.go` | Enforces stdlib-first, no-reinvention policy for Go code |
| `go-error-ownership.md` | `**/*.go` | Enforces single-owner error handling — no duplicate logging, trace before fixing |
| `tdd-discipline.md` | `**/*.go`, `**/*.py`, `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`, `**/*.rs` | Enforces RED→GREEN→REFACTOR discipline during explicit TDD work |
| `mysql-aurora-playbook.md` | `**/*.sql`, `**/migrations/**`, `**/migrate/**`, `**/db/**`, `**/database/**`, `**/ent/schema/**` | Auto-invokes the mysql-aurora-playbook skill for MySQL/Aurora database work |

## License

MIT
