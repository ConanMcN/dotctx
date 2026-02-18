import { compile } from '../compiler.js';
import type { CtxData } from '../../types.js';

export function compileForSystem(ctx: CtxData, budget?: number): string {
  const effectiveBudget = budget || ctx.config.budget.default;
  const compiled = compile(ctx, effectiveBudget);

  const lines: string[] = [];
  lines.push('=== PROJECT CONTEXT ===');
  lines.push('');

  for (const section of compiled.sections) {
    const title = section.name.replace(/_/g, ' ').toUpperCase();
    lines.push(`--- ${title} ---`);
    lines.push(section.content);
    lines.push('');
  }

  return lines.join('\n');
}
