import { compile } from '../compiler.js';
import type { CtxData } from '../../types.js';

const BOOTSTRAP = `
# AI Context Bootstrap

This project uses \`.ctx/\` for structured AI context management.

**Before starting any coding task**, run: \`dotctx preflight --task "your task description"\`
This checks for landmines, constraining decisions, and ripple effects relevant to your task.

For full task-specific context: \`dotctx pull --task "your task description"\`
To record a decision: \`dotctx decide "choice" --over "alternatives" --why "reasoning"\`
To mark intentional weirdness: \`dotctx landmine "description" --file path:line\`

Always check landmines before modifying code that looks wrong — it may be intentional.
`.trim();

export function compileForClaude(ctx: CtxData, budget?: number): string {
  const effectiveBudget = budget || ctx.config.budget.adapters?.claude || ctx.config.budget.default;
  const compiled = compile(ctx, effectiveBudget);

  const lines: string[] = [];
  lines.push('# Project Context');
  lines.push('');

  for (const section of compiled.sections) {
    const title = section.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    lines.push(`## ${title}`);
    lines.push(section.content);
    if (section.truncated) lines.push('_(truncated)_');
    lines.push('');
  }

  if (ctx.config.adapters?.claude?.include_bootstrap !== false) {
    lines.push(BOOTSTRAP);
  }

  return lines.join('\n');
}
