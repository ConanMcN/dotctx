import { countTokens, fitToBudget } from '../utils/tokens.js';
import { getPriority, PRIORITY_ORDER } from './precedence.js';
import { isStale } from './freshness.js';
import type { CtxData, CompiledContext, CompiledSection } from '../types.js';

interface SectionInput {
  name: string;
  content: string;
}

function buildSections(ctx: CtxData): SectionInput[] {
  const sections: SectionInput[] = [];

  // Current state
  if (ctx.current && ctx.current.task) {
    const currentLines = [
      `Branch: ${ctx.current.branch}`,
      `Task: ${ctx.current.task}`,
      `State: ${ctx.current.state}`,
      ctx.current.next_step ? `Next: ${ctx.current.next_step}` : '',
      ctx.current.blocked_by ? `Blocked by: ${ctx.current.blocked_by}` : '',
      ctx.current.files_touched.length ? `Files: ${ctx.current.files_touched.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    sections.push({ name: 'current', content: currentLines });
  }

  // Landmines
  if (ctx.landmines.length) {
    const lines = ctx.landmines.map(l =>
      `- ${l.description}${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`
    ).join('\n');
    sections.push({ name: 'landmines', content: lines });
  }

  // Decisions
  if (ctx.decisions.length) {
    const lines = ctx.decisions.map(d =>
      `- ${d.decision}${d.rejected ? ` (over: ${d.rejected})` : ''} — ${d.why}`
    ).join('\n');
    sections.push({ name: 'decisions', content: lines });
  }

  // Architecture (includes ripple map)
  if (ctx.architecture) {
    sections.push({ name: 'architecture', content: ctx.architecture });
  }

  // Open loops
  if (ctx.openLoops.length) {
    const open = ctx.openLoops.filter(l => l.status === 'open');
    if (open.length) {
      const lines = open.map(l => `- ${l.description}${l.context ? ` (${l.context})` : ''}`).join('\n');
      sections.push({ name: 'open_loops', content: lines });
    }
  }

  // Conventions
  if (ctx.conventions) {
    sections.push({ name: 'conventions', content: ctx.conventions });
  }

  // Vocabulary
  if (ctx.vocabulary.length) {
    const lines = ctx.vocabulary.map(v => `- **${v.term}**: ${v.definition}`).join('\n');
    sections.push({ name: 'vocabulary', content: lines });
  }

  // Session log (most recent)
  if (ctx.sessions.length) {
    const recent = ctx.sessions[0];
    const lines = [
      `Last session (${recent.date}): ${recent.summary}`,
      recent.next_step ? `Next: ${recent.next_step}` : '',
    ].filter(Boolean).join('\n');
    sections.push({ name: 'session_log', content: lines });
  }

  return sections;
}

export function compile(ctx: CtxData, budget: number): CompiledContext {
  const sections = buildSections(ctx);
  const compiled: CompiledSection[] = [];
  let remaining = budget;

  // Sort by priority
  const sorted = [...sections].sort((a, b) => getPriority(a.name) - getPriority(b.name));

  for (const section of sorted) {
    const tokens = countTokens(section.content);
    const priority = getPriority(section.name);

    // High-priority sections (current, landmines): uncapped
    if (priority <= 1) {
      if (tokens <= remaining) {
        compiled.push({ name: section.name, content: section.content, tokens, truncated: false });
        remaining -= tokens;
      } else {
        const { text, truncated } = fitToBudget(section.content, remaining);
        compiled.push({ name: section.name, content: text, tokens: remaining, truncated });
        remaining = 0;
      }
      continue;
    }

    if (remaining <= 0) break;

    // Cap-based allocation
    let capPercent: number;
    if (priority <= 2) capPercent = 0.3; // decisions
    else if (priority <= 3) capPercent = 0.2; // ripple_map / architecture
    else if (priority <= 4) capPercent = 0.15; // open_loops
    else capPercent = 0.5; // conventions, vocabulary, session_log — share remaining

    const cap = Math.floor(remaining * capPercent);
    const alloc = Math.min(tokens, cap, remaining);

    if (alloc > 0) {
      if (tokens <= alloc) {
        compiled.push({ name: section.name, content: section.content, tokens, truncated: false });
        remaining -= tokens;
      } else {
        const { text } = fitToBudget(section.content, alloc);
        compiled.push({ name: section.name, content: text, tokens: alloc, truncated: true });
        remaining -= alloc;
      }
    }
  }

  const totalTokens = compiled.reduce((sum, s) => sum + s.tokens, 0);
  return { sections: compiled, totalTokens, budget };
}
