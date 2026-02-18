import { loadContext, findCtxDir } from './loader.js';
import { compile } from './compiler.js';
import { countTokens, fitToBudget } from '../utils/tokens.js';
import type { CtxData, Capsule, Decision, Landmine, OpenLoop, VocabEntry } from '../types.js';

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-_/\\|]+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'this', 'that', 'with', 'from', 'are', 'was', 'has', 'have'].includes(w));
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function filterRelevant<T>(items: T[], getText: (item: T) => string, keywords: string[]): T[] {
  return items.filter(item => matchesKeywords(getText(item), keywords));
}

export function generateCapsule(ctx: CtxData, task: string, budget: number): Capsule {
  const keywords = extractKeywords(task);
  const lines: string[] = [];

  // Header
  lines.push(`# Context Capsule`);
  lines.push(`Task: ${task}`);
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // Current state [A]
  if (ctx.current && ctx.current.task) {
    lines.push('## Current State [A]');
    lines.push(`- Branch: ${ctx.current.branch}`);
    lines.push(`- Task: ${ctx.current.task}`);
    lines.push(`- State: ${ctx.current.state}`);
    if (ctx.current.next_step) lines.push(`- Next: ${ctx.current.next_step}`);
    if (ctx.current.blocked_by) lines.push(`- Blocked by: ${ctx.current.blocked_by}`);
    lines.push('');
  }

  // Relevant landmines [A]
  const relevantLandmines = filterRelevant(ctx.landmines, l => `${l.description} ${l.file} ${l.why}`, keywords);
  if (relevantLandmines.length) {
    lines.push('## Landmines [A]');
    lines.push('> Things that look wrong but are intentional — DO NOT change');
    for (const l of relevantLandmines) {
      lines.push(`- **${l.description}**${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`);
    }
    lines.push('');
  } else if (ctx.landmines.length) {
    // Include all if none match specifically
    lines.push('## Landmines [A]');
    lines.push('> Things that look wrong but are intentional — DO NOT change');
    for (const l of ctx.landmines) {
      lines.push(`- **${l.description}**${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`);
    }
    lines.push('');
  }

  // Relevant decisions [A]
  const relevantDecisions = filterRelevant(ctx.decisions, d => `${d.decision} ${d.rejected} ${d.why}`, keywords);
  const decisionsToShow = relevantDecisions.length ? relevantDecisions : ctx.decisions.slice(0, 10);
  if (decisionsToShow.length) {
    lines.push('## Decisions [A]');
    for (const d of decisionsToShow) {
      lines.push(`- **${d.decision}**${d.rejected ? ` (over: ${d.rejected})` : ''} — ${d.why}`);
    }
    lines.push('');
  }

  // Relevant conventions [A]
  if (ctx.conventions) {
    lines.push('## Conventions [A]');
    // If we have keywords, try to extract relevant sections
    const conventionLines = ctx.conventions.split('\n');
    const relevant = conventionLines.filter(line =>
      line.startsWith('#') || matchesKeywords(line, keywords) || line.trim() === ''
    );
    lines.push(relevant.length > 3 ? relevant.join('\n') : ctx.conventions);
    lines.push('');
  }

  // Open loops [A]
  const relevantLoops = filterRelevant(
    ctx.openLoops.filter(l => l.status === 'open'),
    l => `${l.description} ${l.context}`,
    keywords
  );
  if (relevantLoops.length) {
    lines.push('## Open Loops [A]');
    for (const l of relevantLoops) {
      lines.push(`- ${l.description}${l.context ? ` — ${l.context}` : ''}`);
    }
    lines.push('');
  }

  // Vocabulary [A]
  const relevantVocab = filterRelevant(ctx.vocabulary, v => `${v.term} ${v.definition}`, keywords);
  if (relevantVocab.length) {
    lines.push('## Vocabulary [A]');
    for (const v of relevantVocab) {
      lines.push(`- **${v.term}**: ${v.definition}`);
    }
    lines.push('');
  }

  // Session context [D]
  if (ctx.sessions.length) {
    const recent = ctx.sessions[0];
    lines.push('## Last Session [D]');
    lines.push(`- ${recent.date}: ${recent.summary}`);
    if (recent.next_step) lines.push(`- Next: ${recent.next_step}`);
    lines.push('');
  }

  // Stack info [A]
  if (ctx.stack && ctx.stack.name) {
    lines.push('## Stack [A]');
    if (ctx.stack.language.length) lines.push(`- Language: ${ctx.stack.language.join(', ')}`);
    if (ctx.stack.framework.length) lines.push(`- Framework: ${ctx.stack.framework.join(', ')}`);
    if (ctx.stack.build.length) lines.push(`- Build: ${ctx.stack.build.join(', ')}`);
    lines.push('');
  }

  let markdown = lines.join('\n');

  // Fit to budget
  const tokens = countTokens(markdown);
  if (tokens > budget) {
    const result = fitToBudget(markdown, budget);
    markdown = result.text;
  }

  // Generate resume (~50 tokens)
  const resumeParts: string[] = [];
  if (ctx.current?.task) resumeParts.push(`Working on: ${ctx.current.task}.`);
  if (ctx.current?.state) resumeParts.push(`State: ${ctx.current.state}.`);
  if (ctx.current?.next_step) resumeParts.push(`Next: ${ctx.current.next_step}.`);
  if (ctx.landmines.length) resumeParts.push(`${ctx.landmines.length} landmine(s) — check .ctx/landmines.md.`);
  if (ctx.sessions.length) resumeParts.push(`Last session: ${ctx.sessions[0].summary}`);
  const resume = fitToBudget(resumeParts.join(' '), 50).text;

  return { markdown, resume, tokens: countTokens(markdown) };
}
