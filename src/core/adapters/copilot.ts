import { compile } from '../compiler.js';
import type { CtxData } from '../../types.js';

const BOOTSTRAP = `
## AI Context
This project uses \`.ctx/\` for structured context. Run \`aictx pull --task "..."\` for task-specific context.
Check \`.ctx/landmines.md\` before changing code that looks wrong.
`.trim();

export function compileForCopilot(ctx: CtxData, budget?: number): string {
  const effectiveBudget = budget || ctx.config.budget.adapters?.copilot || ctx.config.budget.default;
  const compiled = compile(ctx, effectiveBudget);

  const lines: string[] = [];
  lines.push('# Project Guidelines');
  lines.push('');

  for (const section of compiled.sections) {
    const title = section.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    lines.push(`## ${title}`);
    lines.push(section.content);
    lines.push('');
  }

  if (ctx.config.adapters?.copilot?.include_bootstrap !== false) {
    lines.push(BOOTSTRAP);
  }

  return lines.join('\n');
}
