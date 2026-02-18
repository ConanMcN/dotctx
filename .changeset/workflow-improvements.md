---
"dotctx": minor
---

Add workflow improvements: auto-compile after mutations, git hooks, MCP resources/prompts, dev dependency tip

- Mutation commands (decide, landmine, vocab, loop, push, prune) now auto-compile context files after changes
- All mutation commands support `--no-compile` flag to skip auto-compilation
- New `dotctx hooks install/uninstall` command for git post-commit hook integration
- MCP server exposes resources (ctx://context, ctx://current, ctx://landmines) and a `ctx_start_session` prompt
- `dotctx init` suggests adding dotctx as a dev dependency when package.json exists
- Expanded README with workflow docs, git hooks, MCP setup, and commands reference
