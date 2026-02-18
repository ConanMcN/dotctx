# ctx-setup — Deep Codebase Scan & Context Population

You are about to perform a deep scan of this codebase and populate the `.ctx/` directory with inferred context. Every value you write is tagged `[D]` (derived) so the developer knows it was AI-inferred and should be verified.

## Step 1: Ensure .ctx/ exists

Check if `.ctx/` directory exists. If not, run:

```bash
dotctx init --scan
```

## Step 2: Read key project files

Gather context by reading these files (skip any that don't exist):

**Package & config:**
- `package.json` (and any `packages/*/package.json`, `apps/*/package.json` for monorepos)
- `tsconfig.json`, `tsconfig.*.json`
- Build configs: `vite.config.*`, `next.config.*`, `webpack.config.*`, `tsup.config.*`, `turbo.json`
- `Cargo.toml`, `go.mod`, `pyproject.toml`, `Gemfile` (non-JS ecosystems)

**Existing context & docs:**
- `README.md`, `CONTRIBUTING.md`
- `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`
- `.ctx/*` (any already-populated context)
- `docs/` or `documentation/` directory (scan titles/headings)

**Structure & history:**
- Directory tree (top 2 levels): `find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*'`
- Source file patterns: `find . -maxdepth 3 -type f -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.rs' | head -50`
- Recent git history: `git log --oneline -10`
- Current branch: `git branch --show-current`

## Step 3: Populate .ctx/ files

For each file below, analyze what you've read and write content. Tag every AI-inferred value with `[D]` prefix. Use the dotctx CLI commands where available, and direct file writes for structured content.

### 3a. stack.yaml

Write the full technology stack. Example format:

```yaml
# Project stack — tech, tooling, environments
name: "my-project" # [D]
language:
  - "TypeScript" # [D]
  - "SCSS" # [D]
framework:
  - "React" # [D]
  - "Next.js 14" # [D]
build:
  - "tsup" # [D]
  - "Turborepo" # [D]
test:
  - "Vitest" # [D]
  - "Playwright" # [D]
deploy: "Vercel" # [D]
notes: "Monorepo with 3 packages" # [D]
updated_at: "YYYY-MM-DD"
```

Include version numbers where you can detect them from package.json or lock files.

### 3b. architecture.md

Map the codebase structure:

```markdown
# Architecture

## Key paths
<!-- [D] Derived from directory scan -->
| Path | Purpose |
|------|---------|
| `src/components/` | [D] UI component library |
| `src/lib/` | [D] Shared utilities and helpers |
| ... | ... |

## Ripple map
<!-- [D] Derived from import analysis -->
<!-- Format: `path/to/file` → `affected/file1`, `affected/file2` -->
- `src/lib/auth.ts` → `src/components/Login.tsx`, `src/middleware.ts` [D]

## Dependency flow
<!-- [D] Derived from imports and architecture -->
```

For the ripple map, trace key imports to understand what changes cascade where. Focus on the 5-10 most connected files.

### 3c. conventions.md

Identify patterns from the code:

```markdown
# Conventions

## Patterns
<!-- [D] Derived from code analysis -->
- File naming: kebab-case for files, PascalCase for components [D]
- Exports: barrel files (index.ts) in each directory [D]
- State management: React Context + custom hooks [D]
- Styling: CSS Modules with `.module.scss` extension [D]

## Anti-patterns
<!-- [D] Inferred from codebase patterns -->
- Don't use default exports — this project uses named exports everywhere [D]
- Don't import from nested paths — use barrel exports [D]

## AI failure modes
<!-- [D] Common issues AI models would hit in this codebase -->
- Models often suggest `className` strings instead of CSS Module imports [D]
- The compound component pattern (e.g. Card.Header) gets broken by AI refactors [D]
```

### 3d. decisions.md

Extract decisions from README, docs, comments, and commit messages:

```bash
dotctx decide "Chose TypeScript over JavaScript" --why "Type safety for public API, better DX with autocomplete" --rejected "JavaScript, Flow"
dotctx decide "Monorepo with Turborepo" --why "Shared types, atomic commits, single CI" --rejected "Separate repos, Nx"
```

Look for decision signals: "we chose", "decided to", "instead of", "rather than", "trade-off", config comments explaining why.

### 3e. landmines.md

Scan for intentional oddities:

```bash
# Search for markers
grep -rn "TODO\|HACK\|FIXME\|WORKAROUND\|XXX\|NOTE.*intentional\|eslint-disable\|@ts-ignore\|@ts-expect-error" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rs' . | head -30
```

For each finding, use the CLI:

```bash
dotctx landmine "Intentional any cast in serializer" --file "src/core/serializer.ts" --why "Generic type too complex for TS inference, runtime validated with zod"
```

### 3f. vocabulary.md

Identify domain-specific terms that AI models would misinterpret:

```bash
dotctx vocab "fragment" "A component definition file (.fragment.tsx) containing metadata, props, and render variants — NOT a React Fragment"
dotctx vocab "capsule" "A compiled, token-budgeted context blob that adapters inject into AI system prompts"
```

Look for: custom terminology in README/docs, type names that shadow common terms, abbreviated names, project-specific jargon.

### 3g. current.yaml

Set from current git state:

```yaml
# Current work-in-progress
branch: "main" # [D] from git branch
task: "" # [D] infer from recent commits if possible
state: "starting" # [D]
next_step: "" # [D]
blocked_by: ""
files_touched: [] # [D] from git diff --name-only HEAD~3
updated_at: "YYYY-MM-DD"
```

## Step 4: Compile adapter outputs

Run the compiler to generate tool-specific context files:

```bash
dotctx compile --target all
```

## Step 5: Status summary

Run and display the status:

```bash
dotctx status
```

## Step 6: Report

Print a summary of what was done:

```
✓ ctx-setup complete

Populated:
  .ctx/stack.yaml        — languages, frameworks, build tools
  .ctx/architecture.md   — key paths, ripple map, dependency flow
  .ctx/conventions.md    — patterns, anti-patterns, AI failure modes
  .ctx/decisions.md      — N decisions extracted
  .ctx/landmines.md      — N landmines found
  .ctx/vocabulary.md     — N terms defined
  .ctx/current.yaml      — current branch and work state

All values tagged [D] are AI-derived. Review and verify them.
Next: Edit any [D] values that need correction, then run `dotctx compile --target all`.
```

## Important notes

- **Be thorough but honest**: If you can't determine something, leave it empty rather than guessing.
- **Tag everything with [D]**: Every value you infer gets the `[D]` marker so users know what to verify.
- **Preserve existing content**: If a .ctx/ file already has human-written content (no `[D]` tag), don't overwrite it. Append new derived content below.
- **Monorepo awareness**: For monorepos, document the workspace structure in architecture.md and note per-package stacks.
- **Be specific**: Don't write generic advice. Reference actual files, actual patterns, actual terms from this specific codebase.
