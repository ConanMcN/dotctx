import type { CtxData, PreflightChecklist, Decision, Landmine, OpenLoop } from '../types.js';
import { CLI_NAME } from '../constants.js';

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-_/\\|]+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'this', 'that', 'with', 'from', 'are', 'was', 'has', 'have'].includes(w));
}

function matches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

export function generatePreflight(ctx: CtxData, task: string): PreflightChecklist {
  const keywords = extractKeywords(task);

  // Find relevant landmines
  const landmines = ctx.landmines.filter(l =>
    matches(`${l.description} ${l.file} ${l.why}`, keywords)
  );

  // Find relevant decisions
  const decisions = ctx.decisions.filter(d =>
    matches(`${d.decision} ${d.rejected} ${d.why}`, keywords)
  );

  // Find ripple map entries from architecture
  const rippleMap: string[] = [];
  if (ctx.architecture) {
    const lines = ctx.architecture.split('\n');
    let inRipple = false;
    for (const line of lines) {
      if (line.includes('Ripple map') || line.includes('ripple map')) {
        inRipple = true;
        continue;
      }
      if (inRipple && line.startsWith('#')) {
        inRipple = false;
        continue;
      }
      if (inRipple && line.trim() && matches(line, keywords)) {
        rippleMap.push(line.trim());
      }
    }
  }

  // Also check files_touched from current for ripple
  if (ctx.current?.files_touched) {
    for (const file of ctx.current.files_touched) {
      if (matches(file, keywords) && !rippleMap.includes(file)) {
        rippleMap.push(file);
      }
    }
  }

  // Find relevant open loops
  const openLoops = ctx.openLoops
    .filter(l => l.status === 'open')
    .filter(l => matches(`${l.description} ${l.context}`, keywords));

  // Format output
  const lines: string[] = [];
  lines.push(`# Preflight Checklist: ${task}`);
  lines.push('');

  if (landmines.length) {
    lines.push('## Landmines');
    lines.push('> These look wrong but are intentional — DO NOT change');
    for (const l of landmines) {
      lines.push(`  - ${l.description}${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`);
    }
    lines.push('');
  }

  if (decisions.length) {
    lines.push('## Constraining Decisions');
    for (const d of decisions) {
      lines.push(`  - ${d.decision}${d.rejected ? ` (rejected: ${d.rejected})` : ''} — ${d.why}`);
    }
    lines.push('');
  }

  if (rippleMap.length) {
    lines.push('## Ripple Map');
    lines.push('> Changes here may affect:');
    for (const r of rippleMap) {
      lines.push(`  - ${r}`);
    }
    lines.push('');
  }

  if (openLoops.length) {
    lines.push('## Related Open Loops');
    for (const l of openLoops) {
      lines.push(`  - ${l.description}${l.context ? ` (${l.context})` : ''}`);
    }
    lines.push('');
  }

  if (!landmines.length && !decisions.length && !rippleMap.length && !openLoops.length) {
    lines.push('No specific warnings found for this task. Proceed with standard practices.');
    lines.push('');
  }

  lines.push('---');
  lines.push(`Run \`${CLI_NAME} pull --task "..." \` for full context capsule.`);

  return {
    landmines,
    decisions,
    rippleMap,
    openLoops,
    formatted: lines.join('\n'),
  };
}
