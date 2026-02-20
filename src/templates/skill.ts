/**
 * The ctx-setup skill prompt — a model-agnostic markdown prompt that instructs
 * any AI model to perform a deep codebase scan and populate all .ctx/ files.
 *
 * Designed to work as:
 * - A Claude Code slash command (/ctx-setup)
 * - A copy-pasteable prompt for ChatGPT, Cursor, Copilot Chat, etc.
 */
export const CTX_SETUP_SKILL = `---
disable-model-invocation: true
---

# ctx-setup — Deep Codebase Scan & Context Population

You are about to perform a deep scan of this codebase and populate the \`.ctx/\` directory with inferred context. Every value you write is tagged \`[D]\` (derived) so the developer knows it was AI-inferred and should be verified.

## Step 1: Ensure .ctx/ exists

Check if \`.ctx/\` directory exists. If not, run:

\`\`\`bash
dotctx init --scan
\`\`\`

## Rules

- **Be thorough but honest**: If you can't determine something, leave it empty rather than guessing.
- **Tag everything with [D]**: Every value you infer gets the \`[D]\` marker so users know what to verify.
- **Preserve existing content**: If a .ctx/ file already has human-written content (no \`[D]\` tag), don't overwrite it. Append new derived content below.
- **Monorepo awareness**: For monorepos, document the workspace structure in architecture.md and note per-package stacks.
- **Be specific**: Don't write generic advice. Reference actual files, actual patterns, actual terms from this specific codebase.

## Step 2: Read key project files

Gather context by reading these files (skip any that don't exist):

**Package & config:**
- \`package.json\` (and any \`packages/*/package.json\`, \`apps/*/package.json\` for monorepos)
- \`tsconfig.json\`, \`tsconfig.*.json\`
- Build configs: \`vite.config.*\`, \`next.config.*\`, \`webpack.config.*\`, \`tsup.config.*\`, \`turbo.json\`
- \`Cargo.toml\`, \`go.mod\`, \`pyproject.toml\`, \`Gemfile\` (non-JS ecosystems)

**Existing context & docs:**
- \`README.md\`, \`CONTRIBUTING.md\`
- \`CLAUDE.md\`, \`.cursorrules\`, \`.github/copilot-instructions.md\`
- \`.ctx/*\` (any already-populated context)
- \`docs/\` or \`documentation/\` directory (scan titles/headings)

**Structure & history:**
- Directory tree (top 2 levels): \`find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*'\`
- Source file patterns: \`find . -maxdepth 3 -type f -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.rs' | head -50\`
- Recent git history: \`git log --oneline -10\`
- Current branch: \`git branch --show-current\`

## Step 3: Populate .ctx/ files

For each file below, analyze what you've read and write content. Tag every AI-inferred value with \`[D]\` prefix. Use the dotctx CLI commands where available, and direct file writes for structured content.

### 3a. stack.yaml

Write the full technology stack. Example format:

\`\`\`yaml
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
\`\`\`

Include version numbers where you can detect them from package.json or lock files.

### 3b. architecture.md

Map the codebase structure:

\`\`\`markdown
# Architecture

## Key paths
<!-- [D] Derived from directory scan -->
| Path | Purpose |
|------|---------|
| \`src/components/\` | [D] UI component library |
| \`src/lib/\` | [D] Shared utilities and helpers |
| ... | ... |

## Ripple map
<!-- [D] Derived from import analysis -->
<!-- Format: \`path/to/file\` → \`affected/file1\`, \`affected/file2\` -->
- \`src/lib/auth.ts\` → \`src/components/Login.tsx\`, \`src/middleware.ts\` [D]

## Dependency flow
<!-- [D] Derived from imports and architecture -->
\`\`\`

For the ripple map, trace key imports to understand what changes cascade where. Focus on the 5-10 most connected files.

### 3c. conventions.md

Identify patterns from the code:

\`\`\`markdown
# Conventions

## Patterns
<!-- [D] Derived from code analysis -->
- File naming: kebab-case for files, PascalCase for components [D]
- Exports: barrel files (index.ts) in each directory [D]
- State management: React Context + custom hooks [D]
- Styling: CSS Modules with \`.module.scss\` extension [D]

## Anti-patterns
<!-- [D] Inferred from codebase patterns -->
- Don't use default exports — this project uses named exports everywhere [D]
- Don't import from nested paths — use barrel exports [D]

## AI failure modes
<!-- [D] Common issues AI models would hit in this codebase -->
- Models often suggest \`className\` strings instead of CSS Module imports [D]
- The compound component pattern (e.g. Card.Header) gets broken by AI refactors [D]
\`\`\`

### 3d. decisions.md

Extract decisions from README, docs, comments, and commit messages:

\`\`\`bash
dotctx decide "Chose TypeScript over JavaScript" --why "Type safety for public API, better DX with autocomplete" --rejected "JavaScript, Flow"
dotctx decide "Monorepo with Turborepo" --why "Shared types, atomic commits, single CI" --rejected "Separate repos, Nx"
\`\`\`

Look for decision signals: "we chose", "decided to", "instead of", "rather than", "trade-off", config comments explaining why.

### 3e. landmines.md

Scan for intentional oddities:

\`\`\`bash
# Search for markers
grep -rn "TODO\\|HACK\\|FIXME\\|WORKAROUND\\|XXX\\|NOTE.*intentional\\|eslint-disable\\|@ts-ignore\\|@ts-expect-error" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.py' --include='*.go' --include='*.rs' . | head -30
\`\`\`

For each finding, use the CLI:

\`\`\`bash
dotctx landmine "Intentional any cast in serializer" --file "src/core/serializer.ts" --why "Generic type too complex for TS inference, runtime validated with zod"
\`\`\`

### 3f. vocabulary.md

Identify domain-specific terms that AI models would misinterpret:

\`\`\`bash
dotctx vocab "fragment" "A component definition file (.fragment.tsx) containing metadata, props, and render variants — NOT a React Fragment"
dotctx vocab "capsule" "A compiled, token-budgeted context blob that adapters inject into AI system prompts"
\`\`\`

Look for: custom terminology in README/docs, type names that shadow common terms, abbreviated names, project-specific jargon.

### 3g. current.yaml

Set from current git state:

\`\`\`yaml
# Current work-in-progress
branch: "main" # [D] from git branch
task: "" # [D] infer from recent commits if possible
state: "starting" # [D]
next_step: "" # [D]
blocked_by: ""
files_touched: [] # [D] from git diff --name-only HEAD~3
updated_at: "YYYY-MM-DD"
\`\`\`

## Step 4: Compile adapter outputs

Run the compiler to generate tool-specific context files:

\`\`\`bash
dotctx compile --target all
\`\`\`

## Step 5: Status summary

Run and display the status:

\`\`\`bash
dotctx status
\`\`\`

## Step 6: Report

Print a summary of what was done:

\`\`\`
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
Next: Edit any [D] values that need correction, then run \`dotctx compile --target all\`.
\`\`\`
`;

/**
 * The ctx-work skill prompt — a context-aware development workflow that uses
 * dotctx preflight, pull, and hooks to guide AI through structured task execution.
 *
 * Designed for Claude Code slash command (/ctx-work <task description>).
 * Uses $ARGUMENTS for task text injection.
 *
 * 6 stages: Triage → Scope → Plan → Build → Verify → Close
 * 3 tiers: quick / standard / deep (classified dynamically by preflight output)
 */
export const CTX_WORK_SKILL = `---
argument-hint: <task description>
---

# ctx-work — Context-aware development workflow

You are about to work on a task using structured, context-aware development. This workflow uses dotctx to inject project-specific warnings, conventions, and dependencies at every stage — so you never miss a landmine, break a ripple, or violate a convention.

**Task:** $ARGUMENTS

## Rules

- **Trust the hooks** — landmine guard and ripple check fire automatically. Don't duplicate their work.
- **Respect the tier** — don't over-engineer a quick fix or under-verify a deep change.
- **Conventions are constraints** — anti-patterns and AI failure modes from .ctx/conventions.md are things you MUST avoid, not suggestions.
- **Landmines are sacred** — if preflight or the landmine guard warns about a file, read the landmine entry before touching it.
- **Continue tasks** — if the task mentions "continue" or current.yaml shows related work, read session history for continuity.
- **When in doubt, tier up** — it's better to over-verify than to miss a ripple effect.

---

## Stage 1: Triage

Run preflight to understand what this task touches:

\`\`\`bash
dotctx preflight --task "$ARGUMENTS"
\`\`\`

**Classify the task tier based on preflight output:**

<tier-signals>
| Signal | Quick | Standard | Deep |
|--------|-------|----------|------|
| Landmines found | 0 | 1–2 | 3+ |
| Ripple map entries | 0–1 | 2–4 | 5+ |
| Constraining decisions | 0 | 1–2 | 3+ |
| Files likely touched | 1–2 | 3–5 | 6+ |
| Open loops related | 0 | 0–1 | 2+ |
</tier-signals>

**Use the highest tier triggered by any signal.** If unsure, go one tier up.

Print your classification:
\`\`\`
Tier: [quick|standard|deep]
Reason: [which signals triggered this tier]
\`\`\`

---

## Stage 2: Scope

Gather context proportional to the task tier.

### Quick
Preflight output from Stage 1 is sufficient. Proceed to Plan.

### Standard
Generate a task-specific context capsule:

\`\`\`bash
dotctx pull --task "$ARGUMENTS"
\`\`\`

Read the capsule output. Note any conventions, anti-patterns, or AI failure modes mentioned.

### Deep
Everything from Standard, plus read the architecture and conventions directly:

\`\`\`bash
cat .ctx/architecture.md
cat .ctx/conventions.md
\`\`\`

Also check for related open loops:

\`\`\`bash
dotctx loop list
\`\`\`

Check current work state:

\`\`\`bash
cat .ctx/current.yaml
\`\`\`

If current.yaml shows related in-progress work or the task mentions "continue", read the latest session notes:

\`\`\`bash
ls -t .ctx/sessions/ | head -3
\`\`\`

Read the most recent session file(s) for context continuity.

---

## Stage 3: Plan

Create a plan proportional to the tier.

### Quick
State your approach in one sentence. No confirmation needed — proceed directly to Build.

### Standard
Write a brief plan:
- What files you'll modify (cross-reference with the ripple map)
- Key changes in each file
- Any landmines or decisions to respect

Proceed to Build unless the plan involves more than 5 files — in that case, confirm with the user before proceeding.

### Deep
Write a detailed plan:
- Files to modify with specific changes
- Ripple effects to verify after changes
- Landmines to avoid
- Decisions that constrain the approach
- Conventions to follow
- Open loops that might be affected

**Wait for user confirmation before proceeding to Build.** Present the plan clearly and ask: "Does this plan look right? Should I proceed?"

---

## Stage 4: Build

Implement the changes.

### Hooks are active — use them, don't duplicate them

The following hooks fire automatically during your work:
- **Landmine guard** (PreToolUse: Write/Edit) — warns before you edit files with known landmines
- **Ripple check** (PostToolUse: Write/Edit) — shows downstream effects after file edits
- **Preflight** (UserPromptSubmit) — refreshes context on each prompt

**When a hook fires:**
- READ the hook output carefully
- ACT on warnings (e.g., if landmine guard warns about a file, check the landmine before editing)
- Do NOT re-run \`dotctx preflight\` or \`dotctx check\` manually — the hooks handle this

### During implementation

- Follow conventions from the Scope stage (especially anti-patterns and AI failure modes)
- Respect all constraining decisions surfaced by preflight
- If you discover something that looks wrong but might be intentional, check landmines before "fixing" it:
  \`\`\`bash
  dotctx preflight --task "check landmine for [file]"
  \`\`\`
- If you make an architectural choice not covered by existing decisions, note it for the Close stage

---

## Stage 5: Verify

Verify proportional to the tier.

### Quick
Re-read the modified file(s) to confirm correctness. Check for obvious issues.

### Standard
Run the project's test suite using its package manager (check for \`bun.lockb\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, or \`package-lock.json\` to determine the runner).

If tests fail, fix them before proceeding. If the project uses TypeScript, also run \`tsc --noEmit\` via the package runner.

### Deep
Everything from Standard, plus full verification. Read \`deep-verify.md\` for detailed procedures including ripple verification, full test suite, type checking, and lint.

---

## Stage 6: Close

Wrap up proportional to the tier.

### Quick
No close steps needed. You're done.

### Standard
Sync the session state:

\`\`\`bash
dotctx push --sync
\`\`\`

If preflight showed stale context warnings, consider running \`/ctx-refresh\` after syncing.

### Deep
Record everything for the next session. Read \`deep-close.md\` for full close procedures including recording decisions, marking landmines, resolving loops, syncing state, and running audit.

---

## Summary

Print a brief summary of what was done:

<summary-template>
✓ ctx-work complete

Task: $ARGUMENTS
Tier: [quick|standard|deep]

Changes:
  [list of files modified with brief description]

[If standard/deep:]
Verification: [pass/fail summary]

[If deep:]
Recorded: [N decisions, N landmines, N loops resolved, N loops added]
</summary-template>
`;

/**
 * Deep tier verification procedures — loaded on-demand when ctx-work
 * classifies a task as Deep tier. Saves ~300 tokens on Quick/Standard.
 */
export const CTX_WORK_DEEP_VERIFY = `# Deep Tier — Stage 5: Verification

Everything from Standard tier, plus:

1. **Ripple verification** — For each file in the ripple map that your changes affect, verify the downstream files still work correctly:
   \`\`\`bash
   dotctx preflight --task "verify ripple effects of changes to [files changed]"
   \`\`\`

2. **Full test suite** — Run the complete test suite (not just related tests) using the project's package manager.

3. **Type check** — Verify no type errors were introduced by running \`tsc --noEmit\` via the package runner.

4. **Lint** (if available) — Run the project's lint command. Skip gracefully if no lint script exists.

Report verification results clearly:
\`\`\`
Verification:
  Tests: [pass/fail]
  Types: [pass/fail]
  Ripple check: [clean/issues found]
\`\`\`
`;

/**
 * Deep tier close procedures — loaded on-demand when ctx-work
 * classifies a task as Deep tier. Saves ~400 tokens on Quick/Standard.
 */
export const CTX_WORK_DEEP_CLOSE = `# Deep Tier — Stage 6: Close

Record everything for the next session:

1. **Record new decisions** made during implementation:
   \`\`\`bash
   dotctx decide "<decision>" --over "<alternatives>" --why "<reasoning>"
   \`\`\`

2. **Mark new landmines** if you wrote code that looks wrong but is intentional:
   \`\`\`bash
   dotctx landmine "<description>" --file "<path:line>" --why "<reason>"
   \`\`\`

3. **Resolve related open loops** that this task addressed:
   \`\`\`bash
   dotctx loop resolve <id>
   \`\`\`

4. **Add new open loops** for follow-up work discovered during implementation:
   \`\`\`bash
   dotctx loop add "<description>" --ttl 14d
   \`\`\`

5. **Sync session state:**
   \`\`\`bash
   dotctx push --sync
   \`\`\`

6. **Recompile context** (if mutations were made above):
   \`\`\`bash
   dotctx compile --target all
   \`\`\`

7. **Check for stale context** — run audit and refresh if needed:
   \`\`\`bash
   dotctx audit
   \`\`\`
   If any files are flagged as stale and your task touched related areas, review and update them now.
   Use dotctx mutation commands for structured updates, or edit markdown files directly for architecture/conventions.
`;

/**
 * The ctx-refresh skill prompt — guides AI through reviewing and refreshing
 * stale .ctx/ files flagged by `dotctx audit`.
 *
 * Designed for Claude Code slash command (/ctx-refresh).
 */
export const CTX_REFRESH_SKILL = `---
disable-model-invocation: true
---

# ctx-refresh — Review and refresh stale context

Run the audit to see what's stale:

\`\`\`bash
dotctx audit
\`\`\`

For each stale file, read the current .ctx/ content and the relevant source code, then propose updates:

1. **architecture.md** — Re-scan directory structure, verify ripple map entries still exist, check for new files in core paths not in ripple map
2. **conventions.md** — Compare patterns against recent code, verify anti-patterns still apply, check if new patterns emerged
3. **decisions.md** — Verify decisions still apply, check if referenced alternatives are still relevant
4. **landmines.md** — Verify landmine code still exists at referenced locations, check if the "weird" code is still there
5. **vocabulary.md** — Check if terms are still used in codebase, add any new domain terms

For structured entries use mutation commands:
- \`dotctx decide ...\` / \`dotctx landmine ...\` / \`dotctx vocab ...\`

For architecture.md and conventions.md, edit directly.

Tag any AI-inferred updates with [D]. Recompile when done:

\`\`\`bash
dotctx compile --target all
\`\`\`
`;
