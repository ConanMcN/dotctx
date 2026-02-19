import fs from 'node:fs';
import path from 'node:path';
import type { CtxData, CtxConfig, FileStaleEntry, EntryDrift, RippleCoverageGap, AuditResult } from '../types.js';
import { getFileLastModified, getCommitCountAfter, isGitRepo } from '../utils/git.js';
import { parseDuration } from './freshness.js';
import { CLI_NAME } from '../constants.js';

const CTX_FILES = [
  'architecture.md',
  'conventions.md',
  'decisions.md',
  'landmines.md',
  'vocabulary.md',
  'current.yaml',
  'stack.yaml',
  'open-loops.yaml',
];

function getFileStaleness(ctxDir: string, thresholdMs: number): FileStaleEntry[] {
  const entries: FileStaleEntry[] = [];
  const now = Date.now();

  for (const file of CTX_FILES) {
    const filePath = path.join(ctxDir, file);
    if (!fs.existsSync(filePath)) continue;

    const lastModified = getFileLastModified(filePath);
    const daysAgo = lastModified
      ? Math.floor((now - lastModified.getTime()) / (24 * 60 * 60 * 1000))
      : -1;
    const isStale = lastModified
      ? (now - lastModified.getTime()) > thresholdMs
      : false;

    entries.push({ file, lastModified, daysAgo, isStale });
  }

  return entries;
}

function getEntryDrift(ctx: CtxData, ctxDir: string): EntryDrift[] {
  const drift: EntryDrift[] = [];
  const projectDir = path.dirname(ctxDir);

  for (const landmine of ctx.landmines) {
    if (!landmine.file || !landmine.date) continue;
    const filePath = landmine.file.split(':')[0]; // strip line number
    const fullPath = path.join(projectDir, filePath);
    if (!fs.existsSync(fullPath)) continue;

    const commits = getCommitCountAfter(fullPath, landmine.date);
    if (commits > 0) {
      drift.push({
        type: 'landmine',
        description: landmine.description,
        referencedFile: filePath,
        entryDate: landmine.date,
        commitsSinceEntry: commits,
      });
    }
  }

  for (const decision of ctx.decisions) {
    if (!decision.date) continue;
    // Decisions don't reference files directly, but we check if the decision
    // text mentions a file pattern that exists
    const fileMatch = decision.decision.match(/`([^`]+\.[a-z]+)`/);
    if (!fileMatch) continue;
    const filePath = fileMatch[1];
    const fullPath = path.join(projectDir, filePath);
    if (!fs.existsSync(fullPath)) continue;

    const commits = getCommitCountAfter(fullPath, decision.date);
    if (commits > 0) {
      drift.push({
        type: 'decision',
        description: decision.decision,
        referencedFile: filePath,
        entryDate: decision.date,
        commitsSinceEntry: commits,
      });
    }
  }

  return drift;
}

function getRippleCoverageGaps(ctx: CtxData, ctxDir: string): RippleCoverageGap[] {
  const gaps: RippleCoverageGap[] = [];
  const projectDir = path.dirname(ctxDir);

  // Extract paths mentioned in ripple map
  const ripplePaths = new Set<string>();
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
      if (inRipple && line.trim()) {
        // Extract backtick-quoted paths
        const matches = line.match(/`([^`]+)`/g);
        if (matches) {
          for (const m of matches) {
            ripplePaths.add(m.replace(/`/g, ''));
          }
        }
      }
    }
  }

  // Check ripple map paths still exist (skip glob patterns like src/commands/*)
  for (const p of ripplePaths) {
    if (p.includes('*') || p.includes('{')) continue;
    const fullPath = path.join(projectDir, p);
    if (!fs.existsSync(fullPath)) {
      gaps.push({ file: p, reason: 'Referenced in ripple map but file no longer exists' });
    }
  }

  // Scan core directories for files missing from ripple map
  const coreDirs = ['src/core', 'src/utils'];
  for (const dir of coreDirs) {
    const fullDir = path.join(projectDir, dir);
    if (!fs.existsSync(fullDir)) continue;
    try {
      const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
      for (const file of files) {
        const relPath = `${dir}/${file}`;
        if (!ripplePaths.has(relPath)) {
          gaps.push({ file: relPath, reason: 'Source file not tracked in ripple map' });
        }
      }
    } catch {
      // Directory not readable — skip
    }
  }

  return gaps;
}

function formatAudit(result: Omit<AuditResult, 'formatted'>): string {
  const lines: string[] = [];
  lines.push('# Context Audit\n');

  // File staleness
  const staleFiles = result.fileStale.filter(f => f.isStale);
  const freshFiles = result.fileStale.filter(f => !f.isStale);

  lines.push('## File Freshness\n');
  if (staleFiles.length) {
    for (const f of staleFiles) {
      lines.push(`  ⚠ ${f.file} — ${f.daysAgo}d ago (stale)`);
    }
  }
  if (freshFiles.length) {
    for (const f of freshFiles) {
      const age = f.daysAgo >= 0 ? `${f.daysAgo}d ago` : 'no git history';
      lines.push(`  ✓ ${f.file} — ${age}`);
    }
  }
  lines.push('');

  // Entry drift
  if (result.entryDrift.length) {
    lines.push('## Entry Drift\n');
    for (const d of result.entryDrift) {
      lines.push(`  ⚠ ${d.type}: "${d.description}" — ${d.referencedFile} changed ${d.commitsSinceEntry} time${d.commitsSinceEntry > 1 ? 's' : ''} since ${d.entryDate}`);
    }
    lines.push('');
  }

  // Ripple gaps
  if (result.rippleGaps.length) {
    const missing = result.rippleGaps.filter(g => g.reason.includes('no longer exists'));
    const untracked = result.rippleGaps.filter(g => g.reason.includes('not tracked'));

    lines.push('## Ripple Map Coverage\n');
    if (missing.length) {
      lines.push('  Missing files (referenced but deleted):');
      for (const g of missing) {
        lines.push(`    ✗ ${g.file}`);
      }
    }
    if (untracked.length) {
      lines.push('  Untracked files (in core dirs, not in ripple map):');
      for (const g of untracked) {
        lines.push(`    ? ${g.file}`);
      }
    }
    lines.push('');
  }

  // Summary
  lines.push(`---`);
  lines.push(result.summary);

  return lines.join('\n');
}

export function getStaleFileWarnings(ctxDir: string, thresholdDuration?: string): string[] {
  if (!isGitRepo()) return [];

  const thresholdMs = parseDuration(thresholdDuration || '30d');
  const entries = getFileStaleness(ctxDir, thresholdMs);
  const stale = entries.filter(e => e.isStale);

  if (!stale.length) return [];

  const fileList = stale.map(f => `${f.file} (${f.daysAgo}d)`).join(', ');
  return [`📋 ${stale.length} stale .ctx/ file${stale.length > 1 ? 's' : ''}: ${fileList} — run \`/ctx-refresh\` to review`];
}

export function getHealthSection(ctxDir: string, config: CtxConfig): string {
  if (!isGitRepo()) return '';

  const threshold = config.freshness?.file_stale_threshold || '30d';
  const thresholdMs = parseDuration(threshold);
  const entries = getFileStaleness(ctxDir, thresholdMs);
  const stale = entries.filter(e => e.isStale);

  if (!stale.length) return '';

  const fileList = stale.map(f => `${f.file} (${f.daysAgo}d)`).join(', ');
  return `## Context Health\n⚠ ${stale.length} stale file${stale.length > 1 ? 's' : ''}: ${fileList} — run \`/ctx-refresh\` to review`;
}

export function runAudit(ctx: CtxData, ctxDir: string): AuditResult {
  const threshold = ctx.config.freshness?.file_stale_threshold || '30d';
  const thresholdMs = parseDuration(threshold);

  // Phase 1: File staleness
  const fileStale = isGitRepo() ? getFileStaleness(ctxDir, thresholdMs) : [];

  // Phase 2: Entry drift
  const entryDrift = isGitRepo() ? getEntryDrift(ctx, ctxDir) : [];

  // Phase 3: Ripple map coverage
  const rippleGaps = getRippleCoverageGaps(ctx, ctxDir);

  // Summary
  const staleCount = fileStale.filter(f => f.isStale).length;
  const parts: string[] = [];
  if (staleCount) parts.push(`${staleCount} stale file${staleCount > 1 ? 's' : ''}`);
  if (entryDrift.length) parts.push(`${entryDrift.length} drifted entr${entryDrift.length > 1 ? 'ies' : 'y'}`);
  if (rippleGaps.length) parts.push(`${rippleGaps.length} ripple gap${rippleGaps.length > 1 ? 's' : ''}`);

  const summary = parts.length
    ? `Found: ${parts.join(', ')}. Run \`/ctx-refresh\` or \`${CLI_NAME} compile --target all\` after fixing.`
    : '✓ All context files are fresh. No drift or coverage gaps detected.';

  const partial = { fileStale, entryDrift, rippleGaps, summary };
  const formatted = formatAudit(partial);

  return { ...partial, formatted };
}
