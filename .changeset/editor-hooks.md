---
"dotctx": patch
---

Auto-install editor hooks during `dotctx init`

- Claude Code: installs `UserPromptSubmit` hook that runs `dotctx preflight` on every prompt
- Cursor: installs `sessionStart` hook that injects context capsule (only if `.cursor/` exists)
- Both hooks are idempotent and merge-safe with existing settings
