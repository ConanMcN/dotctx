# Context Capsule
Task: general session
Generated: 2026-02-20

## Current State [A]
- Branch: main
- Task: Add /ctx-work skill and multi-skill refactor
- State: in-progress

## Landmines [A]
> Things that look wrong but are intentional — DO NOT change
- **[D] `console.error` instead of `console.log` in serve command** (src/commands/serve.ts:10) — [D] MCP server uses stdout for stdio transport — any console.log would corrupt the protocol
- **[D] `extractKeywords` function duplicated in capsule.ts and preflight.ts** (src/core/capsule.ts:6, src/core/preflight.ts:3) — [D] Intentional — these modules are independent and may diverge; extracting a shared util would create coupling
- **[D] `tokenizer.ts` re-exports from `utils/tokens.ts`** (src/core/tokenizer.ts) — [D] Part of the public core API surface — provides `allocateBudget()` alongside re-exported token utils
- **MCP server version hardcoded to `0.1.0` (differs from package version)** (src/mcp/server.ts:15) — MCP protocol version is intentionally decoupled from package version — MCP spec version, not release version
- **`autoCompile` uses `{ silent: true }` in MCP tools but not in CLI commands** (src/mcp/tools.ts) — MCP uses stdio — compile output would corrupt the protocol; CLI commands should show user feedback
- **Hook scripts always `exit 0` even on failure** (src/utils/claude-hooks.ts, src/utils/cursor-hooks.ts) — Hooks must never block the user — a failed preflight is better than a blocked prompt
- **Claude hook settings use absolute path for command** (src/utils/claude-hooks.ts) — Claude Code resolves hook commands from project root — absolute path ensures it works regardless of cwd

## Decisions [A]
- **Claude Code hook runs preflight per-prompt** (over: Session-start only, manual preflight) — UserPromptSubmit fires every prompt — task-specific context always fresh
- **Cursor hook runs capsule at session start** (over: Per-prompt hook) — Cursor's beforeSubmitPrompt can't inject context; sessionStart can via additional_context JSON

## Conventions [A]
# Conventions

## Patterns

## Anti-patterns

## AI failure modes


## Vocabulary [A]
- **push**: [D] Recording a session handoff note (preserving context for next session) — NOT git push
- **prompt (MCP)**: A named MCP prompt template (ctx_start_session) that combines capsule + preflight for session onboarding
- **sessionStart**: Cursor hook event that fires when a new session begins — returns JSON with `additional_context` field

## Last Session [D]
- 2026-02-19: Commits: e9b7354 chore: bump to 0.5.0; 79b1ee6 chore: recompile adapter outputs and update .ctx/ files; 5eea11c feat: add dotctx audit command for context staleness detection

## Stack [A]
- Language: TypeScript 5.7
- Build: tsup 8.4
