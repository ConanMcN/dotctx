export { CTX_SETUP_SKILL } from './skill.js';

export const TEMPLATES: Record<string, { filename: string; content: string }> = {
  stack: {
    filename: 'stack.yaml',
    content: `# Project stack — tech, tooling, environments
name: ""
language: []
framework: []
build: []
test: []
deploy: ""
notes: ""
updated_at: ""
`,
  },
  current: {
    filename: 'current.yaml',
    content: `# Current work-in-progress
branch: ""
task: ""
state: "" # starting | in-progress | blocked | reviewing | done
next_step: ""
blocked_by: ""
files_touched: []
updated_at: ""
`,
  },
  openLoops: {
    filename: 'open-loops.yaml',
    content: `# Open threads — things started but not finished
# Each loop has a TTL (time-to-live) after which it's flagged for review
loops: []
# Example:
# - id: 1
#   description: "Need to add error handling to auth flow"
#   created_at: "2026-02-18"
#   ttl: "14d"
#   status: open
#   context: "Started during login refactor"
`,
  },
  architecture: {
    filename: 'architecture.md',
    content: `# Architecture

## Key paths
<!-- Map the important directories and their purposes -->

## Ripple map
<!-- File A changes → what else might break -->
<!-- Format: \`path/to/file\` → \`affected/file1\`, \`affected/file2\` -->

## Dependency flow
<!-- How data/control flows through the system -->
`,
  },
  conventions: {
    filename: 'conventions.md',
    content: `# Conventions

## Patterns
<!-- Established patterns to follow -->

## Anti-patterns
<!-- Things that look right but are wrong here -->

## AI failure modes
<!-- Common mistakes AI models make in this codebase -->
`,
  },
  decisions: {
    filename: 'decisions.md',
    content: `# Decisions

<!-- Format: | Decision | Rejected alternatives | Why | Date | -->
| Decision | Rejected | Why | Date |
|----------|----------|-----|------|
`,
  },
  landmines: {
    filename: 'landmines.md',
    content: `# Landmines

<!-- Things that look wrong but are intentional — DON'T touch -->
<!-- Format: | Description | File | Why | Date | -->
| Description | File | Why | Date |
|-------------|------|-----|------|
`,
  },
  vocabulary: {
    filename: 'vocabulary.md',
    content: `# Vocabulary

<!-- Domain terms that AI models frequently misinterpret -->
| Term | Definition |
|------|------------|
`,
  },
  ctxrc: {
    filename: '.ctxrc',
    content: `version: 1

budget:
  default: 2000
  adapters:
    claude: 3000
    cursor: 2000
    copilot: 1500

allocation: priority
priority_order:
  - current
  - landmines
  - decisions
  - ripple_map
  - open_loops
  - conventions
  - architecture
  - vocabulary
  - session_log

freshness:
  stale_threshold: 48h
  loop_default_ttl: 14d
  max_sessions: 5

adapters:
  claude:
    output: CLAUDE.md
    include_bootstrap: true
  cursor:
    output: .cursorrules
    include_bootstrap: true
  copilot:
    output: .github/copilot-instructions.md
    include_bootstrap: true
`,
  },
};
