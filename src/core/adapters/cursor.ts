import { compile } from '../compiler.js';
import type { CtxData } from '../../types.js';

const BOOTSTRAP = `
# AI Context
This project uses .ctx/ for structured context.
**Before starting any coding task**, run: \`dotctx preflight --task "..."\` to check for landmines and constraints.
For full context: \`dotctx pull --task "..."\`
Check .ctx/landmines.md before changing code that looks wrong.
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
