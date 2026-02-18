# Architecture

## Key paths
<!-- [D] Derived from directory scan -->
| Path | Purpose |
|------|---------|
| `src/bin.ts` | [D] CLI entry point — registers all commander commands, reads version from package.json |
| `src/index.ts` | [D] Library entry point — public API exports |
| `src/types.ts` | [D] All Zod schemas, TypeScript types, and interfaces |
| `src/commands/` | [D] CLI command handlers (one file per command, `register*` pattern) |
| `src/commands/hooks.ts` | Git hook install/uninstall (post-commit) |
| `src/core/` | [D] Core logic: compiler, capsule generator, loader, precedence, freshness |
| `src/core/adapters/` | [D] Output adapters: claude, cursor, copilot, system |
| `src/mcp/` | [D] MCP server (stdio transport), tools, resources, and prompts |
| `src/templates/` | [D] Scaffold templates for `init` and the ctx-setup skill prompt |
| `src/utils/` | [D] Helpers: git, markdown parsing, token counting, YAML I/O, autocompile |
| `src/utils/autocompile.ts` | Auto-recompile all adapters after mutation commands |
| `src/__tests__/` | [D] Vitest unit tests |
| `.ctx/` | [D] The context directory this tool manages (also used on itself) |
| `.claude/commands/` | [D] Claude Code slash command (ctx-setup.md skill) |
| `.changeset/` | Changesets config for version management |

## Ripple map
<!-- [D] Derived from import analysis -->
- `src/types.ts` → almost every file in `src/` [D]
- `src/core/loader.ts` → `src/commands/*`, `src/mcp/tools.ts`, `src/mcp/server.ts`, `src/core/capsule.ts`, `src/core/compiler.ts` [D]
- `src/core/compiler.ts` → `src/core/adapters/*`, `src/core/capsule.ts` [D]
- `src/utils/tokens.ts` → `src/core/compiler.ts`, `src/core/capsule.ts`, `src/core/tokenizer.ts`, `src/commands/status.ts` [D]
- `src/utils/yaml.ts` → `src/core/loader.ts`, `src/commands/push.ts`, `src/commands/loop.ts`, `src/commands/prune.ts`, `src/mcp/tools.ts` [D]
- `src/utils/markdown.ts` → `src/core/loader.ts`, `src/commands/decide.ts`, `src/commands/landmine.ts`, `src/commands/vocab.ts`, `src/mcp/tools.ts` [D]
- `src/utils/autocompile.ts` → `src/commands/decide.ts`, `src/commands/landmine.ts`, `src/commands/vocab.ts`, `src/commands/loop.ts`, `src/commands/push.ts`, `src/commands/prune.ts`, `src/mcp/tools.ts`
- `src/core/adapters/index.ts` → `src/commands/compile.ts`, `src/utils/autocompile.ts`
- `src/core/adapters/system.ts` → `src/mcp/server.ts`
- `src/core/capsule.ts` → `src/mcp/server.ts`, `src/mcp/tools.ts`, `src/commands/pull.ts`
- `src/core/preflight.ts` → `src/mcp/server.ts`, `src/mcp/tools.ts`, `src/commands/preflight.ts`
- `src/core/precedence.ts` → `src/core/compiler.ts` [D]
- `src/core/freshness.ts` → `src/commands/loop.ts`, `src/commands/status.ts`, `src/commands/prune.ts` [D]
- `src/templates/index.ts` → `src/commands/init.ts` [D]
- `src/templates/skill.ts` → `src/commands/skill.ts`, `src/templates/index.ts` [D]

## Dependency flow
<!-- [D] Derived from imports and architecture -->
```
CLI (bin.ts) → commands/* → core/* + utils/*
                                ↓
Library (index.ts) → core/* → utils/*
                                ↓
MCP (mcp/server.ts) → mcp/tools.ts → core/* + utils/*
                    → core/adapters/system.ts (resources)
                    → core/capsule.ts + core/preflight.ts (prompts)

Data flow:
  .ctx/ files → loader.ts (parse) → CtxData → compiler.ts (budget + priority)
                                            → capsule.ts (task-specific filter)
                                            → preflight.ts (checklist)
                                            → adapters/* (format for tool)

Mutation flow:
  command (decide/landmine/vocab/loop/push/prune) → write to .ctx/ → autoCompile()
                                                                        ↓
                                                    loadContext → adapters → write output files
```
