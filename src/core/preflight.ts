import type { CtxData, PreflightChecklist, Decision, Landmine, OpenLoop } from '../types.js';
import { CLI_NAME } from '../constants.js';
import { getExpiredLoops, parseDuration } from './freshness.js';
import { isGitRepo, getGitBranch } from '../utils/git.js';

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

  // Context Health checks (always-on, not keyword-dependent)
  const healthWarnings: string[] = [];

  // Stale context warning
  if (ctx.current?.updated_at) {
    const staleThreshold = ctx.config.freshness?.stale_threshold || '48h';
    const thresholdMs = parseDuration(staleThreshold);
    const updated = new Date(ctx.current.updated_at);
    if (!isNaN(updated.getTime()) && Date.now() - updated.getTime() > thresholdMs) {
      const daysAgo = Math.floor((Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000));
      healthWarnings.push(`⚠️ Current context is stale (last updated ${daysAgo} days ago). Run \`${CLI_NAME} push\` to refresh.`);
    }
  }

  // Expired loops warning
  const defaultTtl = ctx.config.freshness?.loop_default_ttl || '14d';
  const expired = getExpiredLoops(ctx.openLoops, defaultTtl);
  if (expired.length) {
    healthWarnings.push(`⏰ ${expired.length} open loop${expired.length > 1 ? 's have' : ' has'} expired and need${expired.length > 1 ? '' : 's'} resolution.`);
  }

  // Branch mismatch warning
  if (isGitRepo() && ctx.current?.branch) {
    const gitBranch = getGitBranch();
    if (gitBranch && gitBranch !== ctx.current.branch) {
      healthWarnings.push(`🔀 Branch mismatch: git is on \`${gitBranch}\` but current.yaml says \`${ctx.current.branch}\`. Context may be from a different branch.`);
    }
  }

  // Format output
  const lines: string[] = [];
  lines.push(`# Preflight Checklist: ${task}`);
  lines.push('');

  if (healthWarnings.length) {
    lines.push('## Context Health');
    for (const w of healthWarnings) {
      lines.push(`  - ${w}`);
    }
    lines.push('');
  }

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
