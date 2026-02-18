# Decisions

<!-- Format: | Decision | Rejected alternatives | Why | Date | -->
| Decision | Rejected | Why | Date |
|----------|----------|-----|------|
| ESM-only package (`"type": "module"`) | CJS, dual CJS+ESM | [D] Simpler build, modern Node.js, aligns with MCP SDK | 2026-02-18 |
| Zod for schema validation | io-ts, Ajv, manual validation | [D] Co-locates schema + type derivation, good DX with `.parse()` | 2026-02-18 |
| commander for CLI | yargs, oclif, citty | [D] Lightweight, well-known, subcommand support | 2026-02-18 |
| tsup for bundling | esbuild direct, Rollup, tsc-only | [D] Zero-config TS→ESM, handles shims and DTS generation | 2026-02-18 |
| Word-based token approximation (1.3x) | tiktoken, exact BPE counting | [D] Zero dependencies, fast, good enough for budget allocation | 2026-02-18 |
| File-based context (`.ctx/` directory) | Database, JSON single-file, API | [D] Git-trackable, human-editable, tool-agnostic, zero infrastructure | 2026-02-18 |
| Manual markdown table parsing | remark, markdown-it, unified | [D] Tables are simple/predictable, avoids heavy AST dependency | 2026-02-18 |
| Renamed package to `dotctx` | Keep `aictx` | [D] `aictx` was taken on npm; `dotctx` reflects the `.ctx/` convention | 2026-02-18 |
| Dual bin names (`dotctx` + `aictx`) | Single name only | [D] `aictx` alias preserved for backwards compatibility | 2026-02-18 |
| Priority-based token allocation | Equal allocation, percentage-based | [D] Critical sections (current, landmines) get uncapped space, lower-priority sections share remainder | 2026-02-18 |
| Adapter pattern for output formats | Single output, template strings | [D] Each AI tool (Claude, Cursor, Copilot) has different conventions; adapters encapsulate format differences | 2026-02-18 |
| Auto-compile after mutations | Manual compile only, file watchers | Keeps context files in sync without extra steps; --no-compile escape hatch for hooks/scripts | 2026-02-18 |
| Git hook uses `npx --yes` with `exit 0` | Direct binary path, husky | Works whether installed globally or locally; never blocks commits | 2026-02-18 |
| MCP resources for passive context | Tools-only MCP | Resources let MCP clients auto-read context without explicit tool calls | 2026-02-18 |
| Dynamic CLI version from package.json | Hardcoded version string | Prevents version drift between package.json and CLI --version output | 2026-02-18 |
