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

## Development Workflow

Follow this posture automatically for every coding task — no need to invoke \`/ctx-work\` unless you want full ceremony:

1. **Read preflight output** (auto-injected each prompt) — respect all landmines and constraining decisions shown
2. **Conventions are hard constraints** — anti-patterns and AI failure modes listed above are things you MUST avoid, not suggestions
3. **Plan before multi-file changes** — if your changes affect 3+ files, state your approach before implementing
4. **Landmines are sacred** — if preflight warns about a file, or code looks wrong, check landmines before "fixing" it
5. **Verify after implementation** — run the project's test suite and type-checker before considering work done
6. **Record what you learned** — new architectural choices: \`dotctx decide\`; intentional oddities: \`dotctx landmine\`
7. **Stale context warnings are informational** — note them but don't block work; suggest \`/ctx-refresh\` if relevant

For detailed 6-stage workflow with tiered verification: \`/ctx-work <task>\`
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
