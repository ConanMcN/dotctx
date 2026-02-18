---
"dotctx": patch
---

Fix bootstrap instructions: rename aictx to dotctx, make proactive

- All adapter bootstrap sections now reference `dotctx` instead of `aictx`
- Bootstrap instructs AI to run `dotctx preflight` before starting tasks (proactive, not passive)
- Updated .ctx/ context files to reflect v0.2.x features
