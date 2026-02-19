# ctx-refresh — Review and refresh stale context

Run the audit to see what's stale:

```bash
dotctx audit
```

For each stale file, read the current .ctx/ content and the relevant source code, then propose updates:

1. **architecture.md** — Re-scan directory structure, verify ripple map entries still exist, check for new files in core paths not in ripple map
2. **conventions.md** — Compare patterns against recent code, verify anti-patterns still apply, check if new patterns emerged
3. **decisions.md** — Verify decisions still apply, check if referenced alternatives are still relevant
4. **landmines.md** — Verify landmine code still exists at referenced locations, check if the "weird" code is still there
5. **vocabulary.md** — Check if terms are still used in codebase, add any new domain terms

For structured entries use mutation commands:
- `dotctx decide ...` / `dotctx landmine ...` / `dotctx vocab ...`

For architecture.md and conventions.md, edit directly.

Tag any AI-inferred updates with [D]. Recompile when done:

```bash
dotctx compile --target all
```
