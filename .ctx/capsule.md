# Context Capsule
Task: update .ctx/ context files to reflect the /ctx-work skill addition and multi-skill refactor
Generated: 2026-02-19

## Current State [A]
- Branch: main
- Task: Auto-install editor hooks during dotctx init
- State: in-progress

## Landmines [A]
> Things that look wrong but are intentional — DO NOT change
- **Claude hook settings use absolute path for command** (src/utils/claude-hooks.ts) — Claude Code resolves hook commands from project root — absolute path ensures it works regardless of cwd

## Decisions [A]
- **File-based context (`.ctx/` directory)** (over: Database, JSON single-file, API) — [D] Git-trackable, human-editable, tool-agnostic, zero infrastructure
- **Renamed package to `dotctx`** (over: Keep `aictx`) — [D] `aictx` was taken on npm; `dotctx` reflects the `.ctx/` convention
- **Dual bin names (`dotctx` + `aictx`)** (over: Single name only) — [D] `aictx` alias preserved for backwards compatibility
- **Auto-compile after mutations** (over: Manual compile only, file watchers) — Keeps context files in sync without extra steps; --no-compile escape hatch for hooks/scripts
- **Git hook uses `npx --yes` with `exit 0`** (over: Direct binary path, husky) — Works whether installed globally or locally; never blocks commits
- **MCP resources for passive context** (over: Tools-only MCP) — Resources let MCP clients auto-read context without explicit tool calls
- **Auto-install editor hooks during init** (over: Manual hook setup, separate CLI command) — Removes agent from the loop — context injected automatically via editor hooks
- **Claude Code hook runs preflight per-prompt** (over: Session-start only, manual preflight) — UserPromptSubmit fires every prompt — task-specific context always fresh
- **Cursor hook runs capsule at session start** (over: Per-prompt hook) — Cursor's beforeSubmitPrompt can't inject context; sessionStart can via additional_context JSON

## Conventions [A]
# Conventions

## Patterns
- File naming: kebab-case for all source files (e.g., `open-loops.yaml`, `capsule.ts`) [D]
- Barrel files: `src/index.ts` re-exports public API, `src/core/adapters/index.ts` re-exports adapters, `src/templates/index.ts` re-exports templates [D]
- Error handling: commands check `findCtxDir()` and exit early with error message if no `.ctx/` found [D]
- Mutation commands: call `autoCompile(ctxDir)` after writing, support `--no-compile` flag to skip
- MCP autocompile: use `autoCompile(ctxDir, { silent: true })` — never print to stdout in MCP context
- Editor hook install: follows `installSkillDuringInit` pattern — returns `string | null`, idempotent, merge-safe with existing config

## Anti-patterns

## AI failure modes
- Models may use `console.log` in autoCompile calls within MCP context — must use `{ silent: true }`


## Vocabulary [A]
- **capsule**: [D] A compiled, token-budgeted, task-specific context blob generated from `.ctx/` files — NOT a UI component or database concept
- **loop (open loop)**: [D] An unfinished thread of work with a TTL (time-to-live) — NOT a programming loop construct
- **ripple map**: [D] A dependency graph showing which files are affected when a given file changes — used for impact analysis
- **adapter**: [D] An output format compiler that transforms CtxData into tool-specific files (CLAUDE.md, .cursorrules, etc.) — NOT a design pattern adapter in the GoF sense
- **push**: [D] Recording a session handoff note (preserving context for next session) — NOT git push
- **pull**: [D] Generating a task-specific context capsule — NOT git pull
- **freshness**: [D] Whether a `.ctx/` file has been updated recently (within the stale threshold) — staleness tracking
- **budget**: [D] Token limit for compiled context output — controls how much context fits in an AI's system prompt
- **`.ctxrc`**: [D] Configuration file inside `.ctx/` — controls budgets, adapter settings, priority order, and freshness thresholds
- **autocompile**: Auto-recompilation of adapter output files (CLAUDE.md, .cursorrules, etc.) triggered after any mutation command
- **hook (git hook)**: A post-commit script that auto-runs `dotctx push --auto` and `dotctx compile --target all` — NOT a React hook
- **resource (MCP)**: A readable URI (ctx://context, ctx://current, ctx://landmines) exposed by the MCP server for passive context access
- **prompt (MCP)**: A named MCP prompt template (ctx_start_session) that combines capsule + preflight for session onboarding
- **editor hook**: A shell script installed into an editor's hook system (.claude/hooks/, .cursor/hooks/) that auto-injects dotctx context — NOT a React hook or git hook
- **UserPromptSubmit**: Claude Code hook event that fires on every user prompt — stdout is injected as context into the conversation
- **sessionStart**: Cursor hook event that fires when a new session begins — returns JSON with `additional_context` field

## Last Session [D]
- 2026-02-19: Commits: a45fefb fix: use new Claude Code hooks format with nested matcher groups; cf8aa73 chore: bump to 0.2.5; 776688c docs: add editor hooks section to README

## Stack [A]
- Language: TypeScript 5.7
- Build: tsup 8.4
