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

# Check context freshness
dotctx audit

# Session handoff
dotctx push --auto

# Start MCP server
dotctx serve
```

## Workflow

### Zero-ceremony (recommended)

After setup, dotctx works automatically — no slash commands needed for normal development:

```bash
dotctx init --scan    # one-time setup: creates .ctx/, installs hooks and skills
```

From here, everything is automatic:
- **Every prompt** — the preflight hook injects relevant landmines, decisions, and ripple effects as context (uses `--brief` mode for question-like prompts to reduce noise)
- **Every file edit** — landmine guard warns before touching flagged files; ripple check shows downstream effects
- **Every commit** — session state is auto-synced and adapters recompiled
- **Session end** — current.yaml is updated automatically

To verify your setup is correct: `dotctx doctor`

The compiled output (CLAUDE.md, .cursorrules, etc.) includes a **Development Workflow** section that tells the AI how to work with your project's context — respecting conventions, verifying changes, and recording decisions. No manual invocation required.

### With skills (optional ceremony)

For more structured workflows, three Claude Code slash commands are available:

1. **`/ctx-setup`** — Deep codebase scan to populate `.ctx/` files (run once, or when major changes happen)
2. **`/ctx-work <task>`** — Full 6-stage workflow with tiered triage, planning, and verification
3. **`/ctx-refresh`** — Guided review of stale context flagged by `dotctx audit`

These are power-user tools for when you want explicit ceremony. Normal development doesn't require them.

### The development loop

1. **Initialize** — `dotctx init --scan` creates `.ctx/`, installs skills and editor hooks
2. **Populate** — Run `/ctx-setup` (or edit `.ctx/` files manually) to fill in your project context
3. **Code** — Just code normally; hooks inject context automatically. Use `/ctx-work <task>` for detailed ceremony
4. **Iterate** — Mutation commands (`decide`, `landmine`, `vocab`, `loop add`, `push`) auto-compile after each change
5. **Maintain** — `dotctx audit` flags stale context; `/ctx-refresh` guides updates
6. **Handoff** — `dotctx push --auto` records session state from git for the next session
7. **Resume** — `dotctx pull --task "..."` generates a task-specific capsule to onboard the next session

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

## Skills

`dotctx init` installs three Claude Code slash commands in `.claude/commands/`. These are **optional** — the compiled output and hooks handle most workflows automatically. Skills are for when you want explicit ceremony.

### `/ctx-setup` — Deep codebase scan

Scans your codebase and auto-populates all `.ctx/` files. Tags every AI-inferred value with `[D]` so you know what to verify. Works as a Claude Code slash command or can be copy-pasted into ChatGPT, Cursor, or Copilot Chat.

### `/ctx-work <task>` — Detailed development workflow (optional)

A structured, 6-stage workflow for complex development tasks. Use this when you want more ceremony than the automatic workflow posture provides:

1. **Triage** — Runs `dotctx preflight`, classifies task as quick/standard/deep based on landmines, ripple effects, and decisions
2. **Scope** — Progressive context gathering proportional to complexity
3. **Plan** — Tiered planning: quick = one sentence, standard = brief plan, deep = full plan with user confirmation
4. **Build** — Editor hooks fire automatically (landmine guard, ripple check) — no manual checks needed
5. **Verify** — Tiered: quick = re-read, standard = tests, deep = full suite + ripple verification + type check
6. **Close** — Tiered: quick = nothing, standard = `push --sync`, deep = record decisions + resolve loops + compile

Usage: `/ctx-work fix the authentication bug in login flow`

**Note:** For most tasks, the automatic workflow posture baked into the compiled output (CLAUDE.md, .cursorrules) is sufficient. Use `/ctx-work` for complex, multi-file changes where explicit tiering and verification steps are valuable.

### `/ctx-refresh` — Guided context refresh

Reviews stale `.ctx/` files flagged by `dotctx audit`. Reads current source code, compares against context, and proposes updates using mutation commands. Tags AI-inferred changes with `[D]`.

To update skills to the latest version: `dotctx upgrade`

## Editor hooks

`dotctx init` automatically installs editor hooks that inject context without any manual steps.

### Claude Code

Five hooks are installed in `.claude/hooks/`, registered in `.claude/settings.json`:

| Hook | Event | Trigger | What it does |
|------|-------|---------|-------------|
| `dotctx-preflight.sh` | UserPromptSubmit | Every prompt | Runs `dotctx preflight` with prompt text, injects landmine warnings, decisions, and ripple effects as context |
| `dotctx-post-commit.sh` | PostToolUse (Bash) | `git commit`, `merge`, `rebase`, `cherry-pick`, `checkout`, `switch` | Runs `push --auto` + `compile --target all` for commits; `push --sync` for branch changes |
| `dotctx-session-sync.sh` | Stop | Claude finishes responding | Runs `push --sync` to keep current.yaml fresh between commits |
| `dotctx-landmine-guard.sh` | PreToolUse (Write\|Edit) | Before file edits | Checks for landmines in the target file, injects warning as additional context |
| `dotctx-ripple-check.sh` | PostToolUse (Write\|Edit) | After file edits | Shows ripple map entries for the edited file as additional context |

All hooks exit 0 and never block your workflow. The preflight hook includes a Context Health section that flags stale context, expired loops, and branch mismatches.

### Cursor

If `.cursor/` already exists in your project, a `sessionStart` hook is installed at `.cursor/hooks/dotctx-session-start.sh`. It generates a context capsule at the start of each session and returns it via Cursor's `additional_context` JSON format. This supplements the token-budgeted `.cursorrules` file with a fuller context dump.

### Other editors

Windsurf and GitHub Copilot don't currently support context injection via hooks. They rely on the compiled adapter output files (`.cursorrules`, `.github/copilot-instructions.md`) generated by `dotctx compile`.

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
- `ctx_audit` — Audit context freshness and detect stale files

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

## Commands

| Command | Description |
|---------|-------------|
| `dotctx init [--scan] [--force]` | Initialize `.ctx/` directory, install skills and hooks |
| `dotctx compile --target <tool\|all>` | Compile context for an AI tool |
| `dotctx pull --task "..."` | Generate a task-specific capsule |
| `dotctx preflight --task "..." [--brief]` | Pre-coding checklist (`--brief` for landmines + health only) |
| `dotctx check <file>` | Check a file for landmines and ripple effects |
| `dotctx push [--auto] [--sync]` | Record a session handoff note (`--sync` for lightweight current.yaml update) |
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
| `dotctx skill install` | Install/update Claude Code skills |
| `dotctx upgrade [--git-hooks] [--dry-run]` | Upgrade hooks, skills, and .ctxrc without touching .ctx/ content |
| `dotctx audit [--json]` | Audit context freshness — stale files, drifted entries, ripple gaps |
| `dotctx doctor` | Check dotctx setup — hooks, skills, adapters, freshness |
| `dotctx serve` | Start MCP server |

All mutation commands support `--no-compile` to skip auto-compilation.

## License

MIT
