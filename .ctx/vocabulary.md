# Vocabulary

<!-- Domain terms that AI models frequently misinterpret -->
| Term | Definition |
|------|------------|
| capsule | [D] A compiled, token-budgeted, task-specific context blob generated from `.ctx/` files — NOT a UI component or database concept |
| landmine | [D] Code that looks wrong but is intentionally that way — a "don't touch" marker, NOT a bug or security issue |
| loop (open loop) | [D] An unfinished thread of work with a TTL (time-to-live) — NOT a programming loop construct |
| preflight | [D] A pre-coding checklist of relevant landmines, decisions, and ripple effects for a specific task — NOT a CORS preflight request |
| ripple map | [D] A dependency graph showing which files are affected when a given file changes — used for impact analysis |
| adapter | [D] An output format compiler that transforms CtxData into tool-specific files (CLAUDE.md, .cursorrules, etc.) — NOT a design pattern adapter in the GoF sense |
| push | [D] Recording a session handoff note (preserving context for next session) — NOT git push |
| pull | [D] Generating a task-specific context capsule — NOT git pull |
| freshness | [D] Whether a `.ctx/` file has been updated recently (within the stale threshold) — staleness tracking |
| budget | [D] Token limit for compiled context output — controls how much context fits in an AI's system prompt |
| `.ctxrc` | [D] Configuration file inside `.ctx/` — controls budgets, adapter settings, priority order, and freshness thresholds |
| [D] tag | [D] Marker prefix meaning "Derived" — indicates a value was AI-inferred and should be human-verified |
| autocompile | Auto-recompilation of adapter output files (CLAUDE.md, .cursorrules, etc.) triggered after any mutation command |
| hook (git hook) | A post-commit script that auto-runs `dotctx push --auto` and `dotctx compile --target all` — NOT a React hook |
| resource (MCP) | A readable URI (ctx://context, ctx://current, ctx://landmines) exposed by the MCP server for passive context access |
| prompt (MCP) | A named MCP prompt template (ctx_start_session) that combines capsule + preflight for session onboarding |
| editor hook | A shell script installed into an editor's hook system (.claude/hooks/, .cursor/hooks/) that auto-injects dotctx context — NOT a React hook or git hook |
| UserPromptSubmit | Claude Code hook event that fires on every user prompt — stdout is injected as context into the conversation |
| sessionStart | Cursor hook event that fires when a new session begins — returns JSON with `additional_context` field |
| skill | A markdown prompt file installed in `.claude/skills/<name>/SKILL.md` as a Claude Code slash command — supports linked files for progressive disclosure — NOT a programming skill or ability |
| ctx-work | The `/ctx-work` slash command — a 6-stage context-aware development workflow (Triage → Scope → Plan → Build → Verify → Close) — NOT a CLI command |
| tier (quick/standard/deep) | Task complexity classification determined by preflight output — controls depth of scoping, planning, verification, and close stages |
| audit | A read-only analysis of .ctx/ file freshness, entry drift, and ripple map coverage — NOT a security audit |
| context health | A summary section appended to compiled output showing stale .ctx/ files — only appears when staleness is detected |
| entry drift | When a landmine or decision references a source file that has changed since the entry was recorded — signals the entry may need review |
| file staleness | Git-based age of a .ctx/ file measured against file_stale_threshold (default 30d) — NOT the same as current.yaml staleness which uses stale_threshold |
| ctx-refresh | The /ctx-refresh slash command — guides AI through reviewing and updating stale .ctx/ files flagged by audit — NOT a CLI command |
| progressive disclosure | Splitting a skill into an orchestrator SKILL.md plus linked reference files (e.g. deep-verify.md) that are only loaded when the task tier requires them — reduces per-invocation token cost for simpler tasks |
