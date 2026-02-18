import { loadContext } from '../core/loader.js';
import { generateCapsule } from '../core/capsule.js';
import { generatePreflight } from '../core/preflight.js';
import type { CtxData } from '../types.js';
import { writeYaml } from '../utils/yaml.js';
import { appendToFile } from '../utils/markdown.js';
import { autoCompile } from '../utils/autocompile.js';
import path from 'node:path';
import fs from 'node:fs';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function createTools(ctxDir: string): ToolDefinition[] {
  return [
    {
      name: 'ctx_pull',
      description: 'Generate a task-specific context capsule from .ctx/ directory. Call this at the start of any coding task to get relevant context including landmines, decisions, conventions, and architecture notes.',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Description of the task you are about to work on' },
          budget: { type: 'string', description: 'Token budget for the capsule (default: from .ctxrc or 2000)' },
        },
        required: ['task'],
      },
      handler: async (args) => {
        const ctx = loadContext(ctxDir);
        const budget = args.budget ? parseInt(args.budget as string, 10) : ctx.config.budget.default;
        const capsule = generateCapsule(ctx, args.task as string, budget);
        return textResult(capsule.markdown);
      },
    },
    {
      name: 'ctx_preflight',
      description: 'Get a pre-coding checklist for a task. Shows relevant landmines (things that look wrong but are intentional), constraining decisions, ripple map for likely-touched files, and related open loops. Call this before making changes.',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Description of the task you are about to work on' },
        },
        required: ['task'],
      },
      handler: async (args) => {
        const ctx = loadContext(ctxDir);
        const checklist = generatePreflight(ctx, args.task as string);
        return textResult(checklist.formatted);
      },
    },
    {
      name: 'ctx_push',
      description: 'Record a session handoff note. Call this when finishing a coding session to preserve context for the next session.',
      inputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'What was accomplished in this session' },
          state: { type: 'string', description: 'Current state: starting, in-progress, blocked, reviewing, done' },
          next_step: { type: 'string', description: 'What should be done next' },
        },
        required: ['summary'],
      },
      handler: async (args) => {
        const ctx = loadContext(ctxDir);
        const sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sessionsDir = path.join(ctxDir, 'sessions');
        fs.mkdirSync(sessionsDir, { recursive: true });

        const sessionData = {
          id: sessionId,
          date: new Date().toISOString().split('T')[0],
          summary: args.summary as string,
          state: (args.state as string) || 'in-progress',
          next_step: (args.next_step as string) || '',
          files_touched: ctx.current?.files_touched || [],
        };

        writeYaml(path.join(sessionsDir, `${sessionId}.yaml`), sessionData);

        // Update current.yaml
        if (ctx.current) {
          const currentPath = path.join(ctxDir, 'current.yaml');
          writeYaml(currentPath, {
            ...ctx.current,
            state: (args.state as string) || ctx.current.state,
            next_step: (args.next_step as string) || ctx.current.next_step,
            updated_at: new Date().toISOString().split('T')[0],
          });
        }

        autoCompile(ctxDir, { silent: true });
        return textResult(`Session note saved: ${sessionId}`);
      },
    },
    {
      name: 'ctx_decide',
      description: 'Record an architectural or implementation decision. Call this when making a significant choice that future sessions should know about.',
      inputSchema: {
        type: 'object',
        properties: {
          decision: { type: 'string', description: 'The decision made' },
          rejected: { type: 'string', description: 'Alternatives that were rejected (comma-separated)' },
          why: { type: 'string', description: 'Why this decision was made' },
        },
        required: ['decision', 'why'],
      },
      handler: async (args) => {
        const date = new Date().toISOString().split('T')[0];
        const row = `| ${args.decision} | ${(args.rejected as string) || ''} | ${args.why} | ${date} |`;
        appendToFile(path.join(ctxDir, 'decisions.md'), row);
        autoCompile(ctxDir, { silent: true });
        return textResult(`Decision recorded: ${args.decision}`);
      },
    },
    {
      name: 'ctx_landmine',
      description: 'Mark something as intentionally weird — it looks wrong but should NOT be changed. Call this when you notice code that appears incorrect but is deliberately that way.',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What looks wrong' },
          file: { type: 'string', description: 'File path and optional line number (e.g., src/auth.ts:42)' },
          why: { type: 'string', description: 'Why it is intentional' },
        },
        required: ['description'],
      },
      handler: async (args) => {
        const date = new Date().toISOString().split('T')[0];
        const row = `| ${args.description} | ${(args.file as string) || ''} | ${(args.why as string) || ''} | ${date} |`;
        appendToFile(path.join(ctxDir, 'landmines.md'), row);
        autoCompile(ctxDir, { silent: true });
        return textResult(`Landmine marked: ${args.description}`);
      },
    },
  ];
}
