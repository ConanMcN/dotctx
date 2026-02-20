---
"dotctx": minor
---

Add context curation features: lighter preflight, token reporting, why command, diff command, and landmine severity

- Lighter preflight: when no matches and no health warnings, output 2 lines instead of full format
- Token reporting: preflight appends token count, compile shows per-adapter token counts
- `dotctx why <file>`: aggregates landmines, decisions, ripple map, and conventions for a file
- `dotctx diff`: shows what changed between sessions with git-based .ctx/ change tracking
- Landmine severity: optional `--severity critical|warning|info` flag, preflight sorts critical first
