# dotctx

Universal, file-based, git-tracked AI context system. Works with any model in any tool.

## Install

```bash
# As a dev dependency (recommended for teams)
npm install --save-dev dotctx

# Or globally
npm install -g dotctx
```

## Quick start

```bash
# Scaffold .ctx/ in your project
dotctx init --scan

# Generate a task-specific context capsule
dotctx pull --task "fix authentication bug"

# Compile to your AI tool's format
dotctx compile --target claude

# Record a decision
dotctx decide "Use JWT" --over "sessions,cookies" --why "stateless, scales horizontally"

# Mark intentional weirdness
dotctx landmine "Legacy enum values — do NOT renumber" --file src/types.ts:42

# Session handoff
dotctx push --auto

# Start MCP server
dotctx serve
```

## Workflow

The typical development loop with dotctx:

1. **Initialize** — `dotctx init --scan` creates the `.ctx/` directory with template files
2. **Populate** — Run `/ctx-setup` in Claude Code (or edit `.ctx/` files manually) to fill in your project context
3. **Compile** — `dotctx compile --target all` generates tool-specific context files (CLAUDE.md, .cursorrules, etc.)
4. **Code** — Mutation commands (`decide`, `landmine`, `vocab`, `loop add`, `push`) auto-compile after each change
5. **Handoff** — `dotctx push --auto` records session state from git for the next session
6. **Resume** — `dotctx pull --task "..."` generates a task-specific capsule to onboard the next session

Auto-compile keeps your context files in sync — no need to run `dotctx compile` manually after mutations.

## `.ctx/` directory

```
.ctx/
  stack.yaml              # tech, tooling, environments
  current.yaml            # WIP: branch, task, state, next step
  open-loops.yaml         # hanging threads with TTL
  architecture.md         # key paths, ripple map, dependency flow
  conventions.md          # patterns, anti-patterns, AI failure modes
  decisions.md            # decision | rejected | why | date
  landmines.md            # looks wrong but intentional — DON'T touch
  vocabulary.md           # domain terms models misinterpret
  sessions/               # rolling handoff notes (auto-pruned to last 5)
  .ctxrc                  # config: budgets, adapters, TTLs, precedence
  capsule.md              # (auto-generated) task-specific compiled context
  resume.txt              # (auto-generated) ~50 token paste-anywhere summary
```

## Git hooks

Auto-update context after every commit:

```bash
# Install the post-commit hook
dotctx hooks install

# Remove it
dotctx hooks uninstall
```

The hook runs `dotctx push --auto` and `dotctx compile --target all` after each commit. It uses `exit 0` so it never blocks commits.

## MCP server

dotctx includes an MCP (Model Context Protocol) server for AI tools that support it:

```bash
dotctx serve
```

**Tools** available via MCP:
- `ctx_pull` — Generate a task-specific context capsule
- `ctx_preflight` — Get a pre-coding checklist for a task
- `ctx_push` — Record a session handoff note
- `ctx_decide` — Record a decision
- `ctx_landmine` — Mark intentional weirdness

**Resources** exposed:
- `ctx://context` — Full compiled project context
- `ctx://current` — Current work-in-progress state
- `ctx://landmines` — List of landmines

**Prompts:**
- `ctx_start_session` — Start a session with combined capsule + preflight for a task

### MCP configuration

Add to your MCP client config (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dotctx": {
      "command": "npx",
      "args": ["--yes", "dotctx", "serve"]
    }
  }
}
```

## Claude Code integration

After running `dotctx init`, the `/ctx-setup` slash command is automatically installed. Use it in Claude Code to scan your codebase and auto-populate `.ctx/` files.

## Commands

| Command | Description |
|---------|-------------|
| `dotctx init [--scan] [--force]` | Initialize `.ctx/` directory |
| `dotctx compile --target <tool\|all>` | Compile context for an AI tool |
| `dotctx pull --task "..."` | Generate a task-specific capsule |
| `dotctx preflight --task "..."` | Pre-coding checklist |
| `dotctx push [--auto]` | Record a session handoff note |
| `dotctx decide <decision> [--over ...] [--why ...]` | Record a decision |
| `dotctx landmine <desc> [--file ...] [--why ...]` | Mark intentional weirdness |
| `dotctx vocab <term> <definition>` | Add a domain term |
| `dotctx loop add <desc> [--ttl ...]` | Add an open loop |
| `dotctx loop resolve <id>` | Resolve an open loop |
| `dotctx loop list [--all]` | List open loops |
| `dotctx status` | Show context freshness |
| `dotctx prune [--dry-run]` | Remove expired items |
| `dotctx hooks install` | Install git post-commit hook |
| `dotctx hooks uninstall` | Remove git post-commit hook |
| `dotctx serve` | Start MCP server |

All mutation commands support `--no-compile` to skip auto-compilation.

## License

MIT
