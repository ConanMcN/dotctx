# aictx

Universal, file-based, git-tracked AI context system. Works with any model in any tool.

## Install

```bash
npm install -g aictx
```

## Quick start

```bash
# Scaffold .ctx/ in your project
aictx init

# Generate a task-specific context capsule
aictx pull --task "fix authentication bug"

# Compile to your AI tool's format
aictx compile --target claude

# Record a decision
aictx decide "Use JWT" --over "sessions,cookies" --why "stateless, scales horizontally"

# Mark intentional weirdness
aictx landmine "Legacy enum values — do NOT renumber" --file src/types.ts:42

# Session handoff
aictx push --auto

# Start MCP server
aictx serve
```

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

## License

MIT
