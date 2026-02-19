# Project Context

## Current
Branch: main
Task: Add /ctx-work skill and multi-skill refactor
State: in-progress
Files: .claude/commands/ctx-work.md, .ctx/architecture.md, .ctx/conventions.md, .ctx/current.yaml, .ctx/decisions.md, .ctx/vocabulary.md, .cursorrules, .github/copilot-instructions.md, CLAUDE.md, package-lock.json, package.json

## Landmines
- [D] `console.error` instead of `console.log` in serve command (src/commands/serve.ts:10) — [D] MCP server uses stdout for stdio transport — any console.log would corrupt the protocol
- [D] `extractKeywords` function duplicated in capsule.ts and preflight.ts (src/core/capsule.ts:6, src/core/preflight.ts:3) — [D] Intentional — these modules are independent and may diverge; extracting a shared util would create coupling
- [D] `tokenizer.ts` re-exports from `utils/tokens.ts` (src/core/tokenizer.ts) — [D] Part of the public core API surface — provides `allocateBudget()` alongside re-exported token utils
- MCP server version hardcoded to `0.1.0` (differs from package version) (src/mcp/server.ts:15) — MCP protocol version is intentionally decoupled from package version — MCP spec version, not release version
- `autoCompile` uses `{ silent: true }` in MCP tools but not in CLI commands (src/mcp/tools.ts) — MCP uses stdio — compile output would corrupt the protocol; CLI commands should show user feedback
- Hook scripts always `exit 0` even on failure (src/utils/claude-hooks.ts, src/utils/cursor-hooks.ts) — Hooks must never block the user — a failed preflight is better than a blocked prompt
- Claude hook settings use absolute path for command (src/utils/claude-hooks.ts) — Claude Code resolves hook commands from project root — absolute path ensures it works regardless of cwd

## Decisions
- ESM-only package (`"type": "module"`) (over: CJS, dual CJS+ESM) — [D] Simpler build, modern Node.js, aligns with MCP SDK
- Zod for schema validation (over: io-ts, Ajv, manual validation) — [D] Co-locates schema + type derivation, good DX with `.parse()`
- commander for CLI (over: yargs, oclif, citty) — [D] Lightweight, well-known, subcommand support
- tsup for bundling (over: esbuild direct, Rollup, tsc-only) — [D] Zero-config TS→ESM, handles shims and DTS generation
- Word-based token approximation (1.3x) (over: tiktoken, exact BPE counting) — [D] Zero dependencies, fast, good enough for budget allocation
- File-based context (`.ctx/` directory) (over: Database, JSON single-file, API) — [D] Git-trackable, human-editable, tool-agnostic, zero infrastructure
- Manual markdown table parsing (over: remark, markdown-it, unified) — [D] Tables are simple/predictable, avoids heavy AST dependency
- Renamed package to `dotctx` (over: Keep `aictx`) — [D] `aictx` was taken on npm; `dotctx` reflects the `.ctx/` convention
- Dual bin names (`dotctx` + `aictx`) (over: Single name only) — [D] `aictx` alias preserved for backwards compatibility
- Priority-based token allocation (over: Equal allocation, percentage-based) — [D] Critical sections (current, landmines) get uncapped space, lower-priority sections share remainder
- Adapter pattern for output formats (over: Single output, template strings) — [D] Each AI tool (Claude, Cursor, Copilot) has different conventions; adapters encapsulate format differences
- Auto-compile after mutations (over: Manual compile only, file watchers) — Keeps context files in sync without extra steps; --no-compile escape hatch for hooks/scripts
- Git hook uses `npx --yes` with `exit 0` (over: Direct binary path, husky) — Works whether installed globally or locally; never blocks commits
- MCP resources for passive context (over: Tools-only MCP) — Resources let MCP clients auto-read context without explicit tool calls
- Dynamic CLI version from package.json (over: Hardcoded version string) — Prevents version drift between package.json and CLI --version output
- Auto-install editor hooks during init (over: Manual hook setup, separate CLI command) — Removes agent from the loop — context injected automatically via editor hooks
- Claude Code hook runs preflight per-prompt (over: Session-start only, manual preflight) — UserPromptSubmit fires every prompt — task-specific context always fresh
- Cursor hook runs capsule at session start (over: Per-prompt hook) — Cursor's beforeSubmitPrompt can't inject context; sessionStart can via additional_context JSON
- Hook script tries binary → node_modules → npx (over: npx only, direct path only) — Speed optimization — avoids npx overhead when binary is available locally
- Cursor hooks only install if .cursor/ exists (over: Always install) — Respects user's editor choice — don't create .cursor/ for non-Cursor users
- Single-file /ctx-work skill with dynamic tiers (over: Separate markdown files per stage, Static workflow without tiers) — dotctx handles filtering/budgeting; tiers adapt depth to actual preflight output; one file is simpler to maintain

## Conventions
# Conventions

## Patterns
<!-- [D] Derived from code analysis -->
- File naming: kebab-case for all source files (e.g., `open-loops.yaml`, `capsule.ts`) [D]
- Exports: named exports only — no default exports anywhere in the codebase [D]
- Command registration: each command file exports a `register<Name>(program: Command)` function [D]
- Barrel files: `src/index.ts` re-exports public API, `src/core/adapters/index.ts` re-exports adapters, `src/templates/index.ts` re-exports templates [D]
- Zod-first types: schemas defined in `types.ts` with Zod, TypeScript types derived via `z.infer<>` [D]
- ESM imports: all internal imports use `.js` extension (required for ESM + TypeScript bundler resolution) [D]
- Date format: ISO date string `YYYY-MM-DD` used everywhere (`.split('T')[0]` pattern) [D]
- CLI output: `picocolors` for terminal colors, `pc.green('✓')` for success, `pc.red()` for errors [D]
- Error handling: commands check `findCtxDir()` and exit early with error message if no `.ctx/` found [D]
- YAML I/O: centralized in `utils/yaml.ts` with `readYaml<T>()` / `writeYaml()` [D]
- Markdown tables: parsed manually in `loader.ts` — pipe-delimited, skipping header/separator rows [D]
- Mutation commands: call `autoCompile(ctxDir)` after writing, support `--no-compile` flag to skip
- MCP autocompile: use `autoCompile(ctxDir, { silent: true })` — never print to stdout in MCP context
- CLI version: read dynamically from `package.json` via `createRequire` — never hardcode
- Editor hook install: follows `installSkillsDuringInit` pattern — returns `string[] | null`, idempotent, merge-safe with existing config
- Multi-skill install: `SKILLS` array in `skill.ts` — each skill has filename, content, and description; `installSkills()` writes all in one pass
- Hook scripts: try direct binary → `node_modules/.bin/` → `npx --yes` (speed optimization, graceful fallback)

## Anti-patterns
<!-- [D] Inferred from codebase patterns -->
- Don't use default exports — this project uses named exports everywhere [D]
- Don't import from `node:*` without the `node:` prefix — this is an ESM project [D]
- Don't omit `.js` extension on relative imports — ESM resolution requires it [D]
- Don't add CommonJS output — the project is ESM-only (`"type": "module"`) [D]
- Don't use `console.log` in MCP server stdout — MCP uses stdio for communication, use `console.error` [D]
- Don't hardcode version strings — read from `package.json` at runtime
- Don't forget `autoCompile()` when adding new mutation commands

## AI failure modes
<!-- [D] Common issues AI models would hit in this codebase -->
- Models forget `.js` extensions on imports and write `from './loader'` instead of `from './loader.js'` [D]
- Models suggest `export default` instead of named exports [D]
- Models confuse the two entry points: `bin.ts` (CLI) vs `index.ts` (library API) [D]
- Models may add `console.log` in MCP server code, breaking stdio transport [D]
- Token counting is approximate (word-based heuristic, 1.3 tokens/word) — don't assume exact counts [D]
- The `capsule` and `preflight` keyword matching is substring-based — models may over-engineer it with regex [D]
- `loader.ts` parses markdown tables manually — don't replace with a markdown AST library unless requested [D]
- Models may forget to add `autoCompile()` call when creating new mutation commands
- Models may use `console.log` in autoCompile calls within MCP context — must use `{ silent: true }`
- Models may install Cursor hooks unconditionally — must check for `.cursor/` directory first
- Models may forget `exit 0` in hook scripts — hooks must never block the user


## Architecture
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
| `src/templates/` | [D] Scaffold templates for `init` and skill prompts (ctx-setup, ctx-work) |
| `src/utils/` | [D] Helpers: git, markdown parsing, token counting, YAML I/O, autocompile, editor hooks |
| `src/utils/autocompile.ts` | Auto-recompile all adapters after mutation commands |
| `src/utils/claude-hooks.ts` | Install Claude Code UserPromptSubmit hook during init |
| `src/utils/cursor-hooks.ts` | Install Cursor sessionStart hook during init |
| `src/__tests__/` | [D] Vitest unit tests |
| `.ctx/` | [D] The context directory this tool manages (also used on itself) |
| `.claude/commands/` | [D] Claude Code slash commands (ctx-setup.md, ctx-work.md skills) |
| `.claude/hooks/` | Claude Code hooks (preflight, post-commit, session-sync, landmine-guard, ripple-check) |
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
- `src/utils/claude-hooks.ts` → `src/commands/init.ts`
- `src/utils/cursor-hooks.ts` → `src/commands/init.ts`

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


## Vocabulary
- **capsule**: [D] A compiled, token-budgeted, task-specific context blob generated from `.ctx/` files — NOT a UI component or database concept
- **landmine**: [D] Code that looks wrong but is intentionally that way — a "don't touch" marker, NOT a bug or security issue
- **loop (open loop)**: [D] An unfinished thread of work with a TTL (time-to-live) — NOT a programming loop construct
- **preflight**: [D] A pre-coding checklist of relevant landmines, decisions, and ripple effects for a specific task — NOT a CORS preflight request
- **ripple map**: [D] A dependency graph showing which files are affected when a given file changes — used for impact analysis
- **adapter**: [D] An output format compiler that transforms CtxData into tool-specific files (CLAUDE.md, .cursorrules, etc.) — NOT a design pattern adapter in the GoF sense
- **push**: [D] Recording a session handoff note (preserving context for next session) — NOT git push
- **pull**: [D] Generating a task-specific context capsule — NOT git pull
- **freshness**: [D] Whether a `.ctx/` file has been updated recently (within the stale threshold) — staleness tracking
- **budget**: [D] Token limit for compiled context output — controls how much context fits in an AI's system prompt
- **`.ctxrc`**: [D] Configuration file inside `.ctx/` — controls budgets, adapter settings, priority order, and freshness thresholds
- **[D] tag**: [D] Marker prefix meaning "Derived" — indicates a value was AI-inferred and should be human-verified
- **autocompile**: Auto-recompilation of adapter output files (CLAUDE.md, .cursorrules, etc.) triggered after any mutation command
- **hook (git hook)**: A post-commit script that auto-runs `dotctx push --auto` and `dotctx compile --target all` — NOT a React hook
- **resource (MCP)**: A readable URI (ctx://context, ctx://current, ctx://landmines) exposed by the MCP server for passive context access
- **prompt (MCP)**: A named MCP prompt template (ctx_start_session) that combines capsule + preflight for session onboarding
- **editor hook**: A shell script installed into an editor's hook system (.claude/hooks/, .cursor/hooks/) that auto-injects dotctx context — NOT a React hook or git hook
- **UserPromptSubmit**: Claude Code hook event that fires on every user prompt — stdout is injected as context into the conversation
- **sessionStart**: Cursor hook event that fires when a new session begins — returns JSON with `additional_context` field
- **skill**: A markdown prompt file installed in `.claude/commands/` as a Claude Code slash command — NOT a programming skill or ability
- **ctx-work**: The `/ctx-work` slash command — a 6-stage context-aware development workflow (Triage → Scope → Plan → Build → Verify → Close) — NOT a CLI command

## Session Log
Last session (2026-02-19): Commits: 5eea11c feat: add dotctx audit command for context staleness detection; 00efeb2 feat: add /ctx-work context-aware development workflow skill; 6b48abb feat: add 3 new Claude Code hooks, check command, push --sync, and enhanced preflight

# AI Context Bootstrap

This project uses `.ctx/` for structured AI context management.

**Before starting any coding task**, run: `dotctx preflight --task "your task description"`
This checks for landmines, constraining decisions, and ripple effects relevant to your task.

For full task-specific context: `dotctx pull --task "your task description"`
To record a decision: `dotctx decide "choice" --over "alternatives" --why "reasoning"`
To mark intentional weirdness: `dotctx landmine "description" --file path:line`

Always check landmines before modifying code that looks wrong — it may be intentional.