# Landmines

<!-- Things that look wrong but are intentional — DON'T touch -->
<!-- Format: | Description | File | Why | Date | -->
| Description | File | Why | Date |
|-------------|------|-----|------|
| [D] `console.error` instead of `console.log` in serve command | src/commands/serve.ts:10 | [D] MCP server uses stdout for stdio transport — any console.log would corrupt the protocol | 2026-02-18 |
| [D] `extractKeywords` function duplicated in capsule.ts and preflight.ts | src/core/capsule.ts:6, src/core/preflight.ts:3 | [D] Intentional — these modules are independent and may diverge; extracting a shared util would create coupling | 2026-02-18 |
| [D] `tokenizer.ts` re-exports from `utils/tokens.ts` | src/core/tokenizer.ts | [D] Part of the public core API surface — provides `allocateBudget()` alongside re-exported token utils | 2026-02-18 |
| [D] Loader parses both table format AND bullet-point format for landmines | src/core/loader.ts:108-118 | [D] Supports both `\| desc \| file \|` table rows and `- description — reason` bullet points for flexibility | 2026-02-18 |
| MCP server version hardcoded to `0.1.0` (differs from package version) | src/mcp/server.ts:23 | MCP protocol version is intentionally decoupled from package version — MCP spec version, not release version | 2026-02-20 |
| `autoCompile` uses `{ silent: true }` in MCP tools but not in CLI commands | src/mcp/tools.ts | MCP uses stdio — compile output would corrupt the protocol; CLI commands should show user feedback | 2026-02-20 |
| Hook scripts always `exit 0` even on failure | src/utils/claude-hooks.ts, src/utils/cursor-hooks.ts | Hooks must never block the user — a failed preflight is better than a blocked prompt | 2026-02-20 |
| Claude hook settings use absolute path for command | src/utils/claude-hooks.ts | Claude Code resolves hook commands from project root — absolute path ensures it works regardless of cwd | 2026-02-20 |
