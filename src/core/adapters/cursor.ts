import { compile } from '../compiler.js';
import type { CtxData } from '../../types.js';

const BOOTSTRAP = `
# AI Context
This project uses .ctx/ for structured context.
**Before starting any coding task**, run: \`dotctx preflight --task "..."\` to check for landmines and constraints.
For full context: \`dotctx pull --task "..."\`
Check .ctx/landmines.md before changing code that looks wrong.

# Development Workflow
Follow this automatically — no need to invoke /ctx-work unless you want full ceremony:
1. **Read preflight output** (auto-injected) — respect all landmines and constraining decisions
2. **Conventions are hard constraints** — anti-patterns listed above are things you MUST avoid
3. **Plan before multi-file changes** — state your approach if touching 3+ files
4. **Landmines are sacred** — check before "fixing" code that looks wrong
5. **Verify** — run tests and type-checker before considering work done
6. **Record decisions** — \`dotctx decide\` for choices; \`dotctx landmine\` for intentional oddities
`.trim();

export function compileForCursor(ctx: CtxData, budget?: number): string {
  const effectiveBudget = budget || ctx.config.budget.adapters?.cursor || ctx.config.budget.default;
  const compiled = compile(ctx, effectiveBudget);

  const lines: string[] = [];

  for (const section of compiled.sections) {
    const title = section.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    lines.push(`# ${title}`);
    lines.push(section.content);
    lines.push('');
  }

  if (ctx.config.adapters?.cursor?.include_bootstrap !== false) {
    lines.push(BOOTSTRAP);
  }

  return lines.join('\n');
}
