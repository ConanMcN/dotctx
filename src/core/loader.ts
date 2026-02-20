import path from 'node:path';
import fs from 'node:fs';
import { readYaml } from '../utils/yaml.js';
import { readMarkdown } from '../utils/markdown.js';
import {
  type CtxData, type Decision, type Landmine, type VocabEntry, type SessionNote, type OpenLoop,
  stackConfigSchema, currentStateSchema, ctxConfigSchema, DEFAULT_CONFIG,
} from '../types.js';

const CTX_DIR = '.ctx';

export function findCtxDir(startDir?: string): string | null {
  let dir = startDir || process.cwd();
  while (true) {
    const candidate = path.join(dir, CTX_DIR);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadContext(ctxDir?: string): CtxData {
  const dir = ctxDir || findCtxDir();
  if (!dir) {
    return {
      stack: null, current: null, openLoops: [], architecture: '',
      conventions: '', decisions: [], landmines: [], vocabulary: [],
      sessions: [], config: DEFAULT_CONFIG,
    };
  }

  // Stack
  const rawStack = readYaml<Record<string, unknown>>(path.join(dir, 'stack.yaml'));
  const stack = rawStack ? stackConfigSchema.parse(rawStack) : null;

  // Current
  const rawCurrent = readYaml<Record<string, unknown>>(path.join(dir, 'current.yaml'));
  const current = rawCurrent ? currentStateSchema.parse(rawCurrent) : null;

  // Open loops
  const rawLoops = readYaml<{ loops?: unknown[] }>(path.join(dir, 'open-loops.yaml'));
  const openLoops: OpenLoop[] = (rawLoops?.loops || []).map((l: any) => ({
    id: l.id ?? 0,
    description: l.description ?? '',
    created_at: l.created_at ?? '',
    ttl: l.ttl ?? '14d',
    status: l.status ?? 'open',
    context: l.context ?? '',
  }));

  // Markdown files
  const architecture = readMarkdown(path.join(dir, 'architecture.md'));
  const conventions = readMarkdown(path.join(dir, 'conventions.md'));

  // Decisions (parse from markdown table)
  const decisionsContent = readMarkdown(path.join(dir, 'decisions.md'));
  const decisions = parseDecisionsTable(decisionsContent);

  // Landmines (parse from markdown)
  const landminesContent = readMarkdown(path.join(dir, 'landmines.md'));
  const landmines = parseLandmines(landminesContent);

  // Vocabulary (parse from markdown table)
  const vocabContent = readMarkdown(path.join(dir, 'vocabulary.md'));
  const vocabulary = parseVocabTable(vocabContent);

  // Sessions
  const sessionsDir = path.join(dir, 'sessions');
  const sessions = loadSessions(sessionsDir);

  // Config
  const rawConfig = readYaml<Record<string, unknown>>(path.join(dir, '.ctxrc'));
  const config = rawConfig ? ctxConfigSchema.parse(rawConfig) : DEFAULT_CONFIG;

  return { stack, current, openLoops, architecture, conventions, decisions, landmines, vocabulary, sessions, config };
}

function parseDecisionsTable(content: string): Decision[] {
  const decisions: Decision[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip headers and separator lines
    if (!line.startsWith('|') || line.includes('---') || line.toLowerCase().includes('decision')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 4) {
      decisions.push({ decision: cells[0], rejected: cells[1], why: cells[2], date: cells[3] });
    }
  }
  return decisions;
}

function parseLandmines(content: string): Landmine[] {
  const landmines: Landmine[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---') || line.toLowerCase().includes('description')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      const severity = cells[4]?.toLowerCase();
      landmines.push({
        description: cells[0],
        file: cells[1] || '',
        why: cells[2] || '',
        date: cells[3] || '',
        severity: severity === 'critical' || severity === 'info' ? severity : 'warning',
      });
    }
  }
  // Also parse bullet-point format
  for (const line of lines) {
    const match = line.match(/^[-*]\s+(.+)/);
    if (match && !line.includes('Format:') && !line.includes('DON\'T touch')) {
      const parts = match[1].split('—').map(s => s.trim());
      landmines.push({
        description: parts[0],
        file: '', why: parts[1] || '', date: '', severity: 'warning',
      });
    }
  }
  return landmines;
}

function parseVocabTable(content: string): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('---') || line.toLowerCase().includes('term')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 2) {
      entries.push({ term: cells[0], definition: cells[1] });
    }
  }
  return entries;
}

function loadSessions(sessionsDir: string): SessionNote[] {
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.yaml')).sort().reverse();
    return files.slice(0, 5).map(f => {
      const data = readYaml<Record<string, unknown>>(path.join(sessionsDir, f));
      return {
        id: (data?.id as string) || f.replace('.yaml', ''),
        date: (data?.date as string) || '',
        summary: (data?.summary as string) || '',
        state: (data?.state as string) || '',
        next_step: (data?.next_step as string) || '',
        files_touched: (data?.files_touched as string[]) || [],
        landmines_added: (data?.landmines_added as string[]) || [],
        loops_added: (data?.loops_added as string[]) || [],
      };
    });
  } catch {
    return [];
  }
}
