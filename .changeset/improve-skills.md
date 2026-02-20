---
"dotctx": minor
---

Improve skills with frontmatter, progressive disclosure, and .claude/skills/ migration

- Add YAML frontmatter to all 3 skills (disable-model-invocation, argument-hint)
- Promote rules to top of ctx-setup and ctx-work for better visibility
- Add XML-delimited tier-signals and summary-template in ctx-work
- Migrate skills from .claude/commands/ to .claude/skills/ directory structure
- Split ctx-work Deep tier into linked files (deep-verify.md, deep-close.md) for progressive disclosure
- Make verify instructions package-manager-agnostic (detect from lockfiles instead of hardcoding npm)
- Upgrade command now cleans up legacy .claude/commands/ctx-*.md files
- Doctor checks .claude/skills/ with fallback to legacy .claude/commands/
