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
- Health section in autocompile: appended outside token budget system (~50 tokens, fixed size) — only when stale files detected [D]
- Audit is read-only: `runAudit()` never writes files — detection and reporting only; `/ctx-refresh` guides fixes [D]

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
