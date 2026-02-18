import { z } from 'zod';

// Zod schemas
export const stackConfigSchema = z.object({
  name: z.string().default(''),
  language: z.array(z.string()).default([]),
  framework: z.array(z.string()).default([]),
  build: z.array(z.string()).default([]),
  test: z.array(z.string()).default([]),
  deploy: z.string().default(''),
  notes: z.string().default(''),
  updated_at: z.string().default(''),
});

export const currentStateSchema = z.object({
  branch: z.string().default(''),
  task: z.string().default(''),
  state: z.enum(['starting', 'in-progress', 'blocked', 'reviewing', 'done', '']).default(''),
  next_step: z.string().default(''),
  blocked_by: z.string().default(''),
  files_touched: z.array(z.string()).default([]),
  updated_at: z.string().default(''),
});

export const openLoopSchema = z.object({
  id: z.number(),
  description: z.string(),
  created_at: z.string(),
  ttl: z.string().default('14d'),
  status: z.enum(['open', 'resolved']).default('open'),
  context: z.string().default(''),
});

export const decisionSchema = z.object({
  decision: z.string(),
  rejected: z.string().default(''),
  why: z.string().default(''),
  date: z.string(),
});

export const landmineSchema = z.object({
  description: z.string(),
  file: z.string().default(''),
  why: z.string().default(''),
  date: z.string(),
});

export const vocabEntrySchema = z.object({
  term: z.string(),
  definition: z.string(),
});

export const sessionNoteSchema = z.object({
  id: z.string(),
  date: z.string(),
  summary: z.string(),
  state: z.string().default(''),
  next_step: z.string().default(''),
  files_touched: z.array(z.string()).default([]),
  landmines_added: z.array(z.string()).default([]),
  loops_added: z.array(z.string()).default([]),
});

export const ctxConfigSchema = z.object({
  version: z.number().default(1),
  budget: z.object({
    default: z.number().default(2000),
    adapters: z.record(z.number()).default({}),
  }).default({}),
  allocation: z.string().default('priority'),
  priority_order: z.array(z.string()).default([
    'current', 'landmines', 'decisions', 'ripple_map',
    'open_loops', 'conventions', 'architecture', 'vocabulary', 'session_log',
  ]),
  freshness: z.object({
    stale_threshold: z.string().default('48h'),
    loop_default_ttl: z.string().default('14d'),
    max_sessions: z.number().default(5),
  }).default({}),
  adapters: z.record(z.object({
    output: z.string(),
    include_bootstrap: z.boolean().default(true),
  })).default({}),
});

// TypeScript types derived from schemas
export type StackConfig = z.infer<typeof stackConfigSchema>;
export type CurrentState = z.infer<typeof currentStateSchema>;
export type OpenLoop = z.infer<typeof openLoopSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type Landmine = z.infer<typeof landmineSchema>;
export type VocabEntry = z.infer<typeof vocabEntrySchema>;
export type SessionNote = z.infer<typeof sessionNoteSchema>;
export type CtxConfig = z.infer<typeof ctxConfigSchema>;

export interface Section {
  level: number;
  title: string;
  content: string;
}

export interface CtxData {
  stack: StackConfig | null;
  current: CurrentState | null;
  openLoops: OpenLoop[];
  architecture: string;
  conventions: string;
  decisions: Decision[];
  landmines: Landmine[];
  vocabulary: VocabEntry[];
  sessions: SessionNote[];
  config: CtxConfig;
}

export interface CompiledSection {
  name: string;
  content: string;
  tokens: number;
  truncated: boolean;
}

export interface CompiledContext {
  sections: CompiledSection[];
  totalTokens: number;
  budget: number;
}

export interface Capsule {
  markdown: string;
  resume: string;
  tokens: number;
}

export interface PreflightChecklist {
  landmines: Landmine[];
  decisions: Decision[];
  rippleMap: string[];
  openLoops: OpenLoop[];
  formatted: string;
}

export interface Adapter {
  name: string;
  compile: (ctx: CtxData, budget?: number) => string;
  outputPath: string;
}

export const DEFAULT_CONFIG: CtxConfig = ctxConfigSchema.parse({});
