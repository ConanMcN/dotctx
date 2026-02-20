# Project Guidelines

## Current
Branch: main
Task: Add /ctx-work skill and multi-skill refactor
State: in-progress
Files: claude/hooks/dotctx-preflight.sh, .ctx/architecture.md, .ctx/capsule.md, .ctx/conventions.md, .ctx/current.yaml, .ctx/decisions.md, .ctx/resume.txt, .ctx/vocabulary.md, .cursorrules, .github/copilot-instructions.md, CLAUDE.md, README.md, src/bin.ts, src/commands/preflight.ts, src/core/adapters/claude.ts, src/core/adapters/copilot.ts, src/core/adapters/cursor.ts, src/core/preflight.ts, src/index.ts, src/mcp/tools.ts, src/utils/claude-hooks.ts, .ctx/sessions/2026-02-19T17-45-43.yaml, .ctx/sessions/2026-02-19T17-46-48.yaml, .ctx/sessions/2026-02-19T17-47-22.yaml, src/commands/doctor.ts

## Landmines
- [D] `console.error` instead of `console.log` in serve command (src/commands/serve.ts:10) — [D] MCP server uses stdout for stdio transport — any console.log would corrupt the protocol
- [D] `extractKeywords` function duplicated in capsule.ts and preflight.ts (src/core/capsule.ts:6, src/core/preflight.ts:3) — [D] Intentional — these modules are independent and may diverge; extracting a shared util would create coupling
- [D] `tokenizer.ts` re-exports from `utils/tokens.ts` (src/core/tokenizer.ts) — [D] Part of the public core API surface — provides `allocateBudget()` alongside re-exported token utils
- MCP server version hardcoded to `0.1.0` (differs from package version) (src/mcp/server.ts:15) — MCP protocol version is intentionally decoupled from package version — MCP spec version, not release version
- `autoCompile` uses `{ silent: true }` in MCP tools but not in CLI commands (src/mcp/tools.ts) — MCP uses stdio — compile output would corrupt the protocol; CLI commands should show user feedback
- Hook scripts always `exit 0` even on failure (src/utils/claude-hooks.ts, src/utils/cursor-hooks.ts) — Hooks must never block the user — a failed preflight is better than a blocked prompt
- Claude hook settings use absolute path for command (src/utils/claude-hooks.ts) — Claude Code resolves hook commands from project root — absolute path ensures it works regardless of cwd

## Decisions
- ESM-only package (`"type": "module"`) (over: CJS, dual CJS+ESM) — [D] Simpler build, modern Node.js, aligns with MCP SDK - Zod for schema validation (over: io-ts, Ajv, manual validation) — [D] Co-locates schema + type derivation, good DX with `.parse()` - commander for CLI (over: yargs, oclif, citty) — [D] Lightweight, well-known, subcommand support - tsup for bundling (over: esbuild direct, Rollup, tsc-only) — [D] Zero-config TS→ESM, handles shims and DTS generation - Word-based token approximation (1.3x) (over: tiktoken, exact BPE counting) — [D] Zero dependencies, fast, good enough for budget allocation - File-based context (`.ctx/` directory) (over: Database, JSON single-file, API) — [D] Git-trackable, human-editable, tool-agnostic, zero infrastructure - Manual markdown table parsing (over: remark, markdown-it, unified) — [D] Tables are simple/predictable, avoids heavy AST dependency - Renamed package to `dotctx` (over: Keep `aictx`) — [D] `aictx` was taken on npm; `dotctx` reflects the `.ctx/` convention - Dual bin names (`dotctx` + `aictx`) (over: Single name only) — [D] `aictx` alias preserved for backwards compatibility - Priority-based token allocation (over: Equal allocation, percentage-based) — [D] Critical sections (current, landmines) get uncapped space, lower-priority sections share remainder - Adapter pattern for output formats (over: Single output, template strings) — [D] Each AI tool (Claude, Cursor, Copilot) has different conventions; adapters encapsulate format differences - Auto-compile after mutations (over: Manual compile only, file watchers) — Keeps context files in sync without extra steps; --no-compile escape hatch for hooks/scripts - Git hook uses `npx --yes` with `exit 0` (over: Direct binary path, husky) — Works whether installed globally or locally; never blocks commits - MCP resources for passive context (over: Tools-only MCP) — Resources let MCP clients

[...truncated to fit budget]

## Conventions
# Conventions ## Patterns <!-- [D] Derived from code analysis --> - File naming: kebab-case for all source files (e.g., `open-loops.yaml`, `capsule.ts`) [D] - Exports: named exports only — no default exports anywhere in the codebase [D] - Command registration: each command file exports a `register<Name>(program: Command)` function [D] - Barrel files: `src/index.ts` re-exports public API, `src/core/adapters/index.ts` re-exports adapters, `src/templates/index.ts` re-exports templates [D] - Zod-first types: schemas defined in `types.ts` with Zod, TypeScript types derived via `z.infer<>` [D] - ESM imports: all internal imports use `.js` extension (required for ESM + TypeScript bundler resolution) [D] - Date format: ISO date string `YYYY-MM-DD` used everywhere (`.split('T')[0]` pattern) [D] - CLI output: `picocolors` for terminal colors, `pc.green('✓')` for success, `pc.red()` for errors [D] - Error handling: commands check `findCtxDir()` and exit early with error message if no `.ctx/` found [D] - YAML I/O: centralized in `utils/yaml.ts` with `readYaml<T>()` / `writeYaml()` [D] - Markdown tables: parsed manually in `loader.ts` — pipe-delimited, skipping header/separator rows [D] - Mutation commands: call `autoCompile(ctxDir)` after writing, support `--no-compile` flag to skip - MCP autocompile: use `autoCompile(ctxDir, { silent: true })` — never print to stdout in MCP context - CLI version: read dynamically from `package.json` via `createRequire` — never hardcode - Editor hook install: follows `installSkillsDuringInit` pattern — returns `string[] | null`, idempotent, merge-safe with existing config - Multi-skill install: `SKILLS` array in `skill.ts` — each skill has filename, content, and description; `installSkills()` writes all in one pass - Hook scripts: try direct binary → `node_modules/.bin/` → `npx --yes` (speed optimization, graceful fallback) - Health section in autocompile: appended outside token budget system (~50 tokens, fixed size) — only when stale files detected [D] - Audit is read-only: `runAudit()` never writes files — detection and reporting only; `/ctx-refresh` guides fixes [D] ## Anti-patterns <!-- [D] Inferred from codebase patterns --> - Don't use default exports — this project uses named exports everywhere [D] - Don't import from `node:*` without

[...truncated to fit budget]

## Architecture
# Architecture ## Key paths <!-- [D] Derived from directory scan --> | Path | Purpose | |------|---------| | `src/bin.ts` | [D] CLI entry point — registers all commander commands, reads version from package.json | | `src/index.ts` | [D] Library entry point — public API exports | | `src/types.ts` | [D] All Zod schemas, TypeScript types, and interfaces | | `src/commands/` | [D] CLI command handlers (one file per command, `register*` pattern) | | `src/commands/hooks.ts` | Git hook install/uninstall (post-commit) | | `src/core/` | [D] Core logic: compiler, capsule generator, loader, precedence, freshness, audit | | `src/core/adapters/` | [D] Output adapters: claude, cursor, copilot, system | | `src/mcp/` | [D] MCP server (stdio transport), tools, resources, and prompts | | `src/templates/` | [D] Scaffold templates for `init` and skill prompts (ctx-setup, ctx-work, ctx-refresh) | | `src/utils/` | [D] Helpers: git, markdown parsing, token counting, YAML I/O, autocompile, editor hooks | | `src/utils/autocompile.ts` | Auto-recompile all adapters after mutation commands |

[...truncated to fit budget]

## Vocabulary
- **capsule**: [D] A compiled, token-budgeted, task-specific context blob generated from `.ctx/` files — NOT a UI component or database concept - **landmine**: [D] Code that looks wrong but is intentionally that way — a "don't touch" marker, NOT a bug or security issue - **loop (open loop)**: [D] An unfinished thread of work with a TTL (time-to-live) — NOT a programming loop construct - **preflight**: [D] A pre-coding checklist of relevant landmines, decisions, and ripple effects for a specific

[...truncated to fit budget]

## Session Log
Last session (2026-02-19): Commits: e9b7354 chore: bump to 0.5.0; 79b1ee6 chore: recompile adapter outputs and update .ctx/ files; 5eea11c feat: add dotctx audit command for context staleness detection

## AI Context
This project uses `.ctx/` for structured context.
**Before starting any coding task**, run: `dotctx preflight --task "..."` to check for landmines and constraints.
For full context: `dotctx pull --task "..."`
Check `.ctx/landmines.md` before changing code that looks wrong.

## Development Workflow
Follow this automatically — no need to invoke /ctx-work unless you want full ceremony:
1. **Read preflight output** (auto-injected) — respect all landmines and constraining decisions
2. **Conventions are hard constraints** — anti-patterns listed above are things you MUST avoid
3. **Plan before multi-file changes** — state your approach if touching 3+ files
4. **Landmines are sacred** — check before "fixing" code that looks wrong
5. **Verify** — run tests and type-checker before considering work done
6. **Record decisions** — `dotctx decide` for choices; `dotctx landmine` for intentional oddities