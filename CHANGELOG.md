# dotctx

## 0.8.0

### Minor Changes

- c091206: Add context curation features: lighter preflight, token reporting, why command, diff command, and landmine severity

  - Lighter preflight: when no matches and no health warnings, output 2 lines instead of full format
  - Token reporting: preflight appends token count, compile shows per-adapter token counts
  - `dotctx why <file>`: aggregates landmines, decisions, ripple map, and conventions for a file
  - `dotctx diff`: shows what changed between sessions with git-based .ctx/ change tracking
  - Landmine severity: optional `--severity critical|warning|info` flag, preflight sorts critical first

## 0.7.0

### Minor Changes

- 2d49846: Improve skills with frontmatter, progressive disclosure, and .claude/skills/ migration

  - Add YAML frontmatter to all 3 skills (disable-model-invocation, argument-hint)
  - Promote rules to top of ctx-setup and ctx-work for better visibility
  - Add XML-delimited tier-signals and summary-template in ctx-work
  - Migrate skills from .claude/commands/ to .claude/skills/ directory structure
  - Split ctx-work Deep tier into linked files (deep-verify.md, deep-close.md) for progressive disclosure
  - Make verify instructions package-manager-agnostic (detect from lockfiles instead of hardcoding npm)
  - Upgrade command now cleans up legacy .claude/commands/ctx-\*.md files
  - Doctor checks .claude/skills/ with fallback to legacy .claude/commands/
