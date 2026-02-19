import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createTools } from './tools.js';
import { findCtxDir, loadContext } from '../core/loader.js';
import { compileForSystem } from '../core/adapters/system.js';
import { generateCapsule } from '../core/capsule.js';
import { generatePreflight } from '../core/preflight.js';
import yaml from 'js-yaml';

export async function startMcpServer(): Promise<void> {
  const ctxDir = findCtxDir() || '.ctx';
  const tools = createTools(ctxDir);

  const server = new Server(
    { name: 'dotctx', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // --- Tools ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      return { content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }] };
    }
    return tool.handler((request.params.arguments || {}) as Record<string, unknown>);
  });

  // --- Resources ---

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'ctx://context',
        name: 'Full compiled context',
        description: 'Complete compiled project context from .ctx/ directory',
        mimeType: 'text/plain',
      },
      {
        uri: 'ctx://current',
        name: 'Current state',
        description: 'Current work-in-progress state (branch, task, status)',
        mimeType: 'text/yaml',
      },
      {
        uri: 'ctx://landmines',
        name: 'Landmines',
        description: 'Things that look wrong but are intentional — DO NOT change',
        mimeType: 'text/plain',
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const ctx = loadContext(ctxDir);

    if (uri === 'ctx://context') {
      const output = compileForSystem(ctx);
      return {
        contents: [{ uri, mimeType: 'text/plain', text: output }],
      };
    }

    if (uri === 'ctx://current') {
      const text = ctx.current
        ? yaml.dump(ctx.current, { lineWidth: -1 })
        : 'No current state set. Run `dotctx push` to record state.';
      return {
        contents: [{ uri, mimeType: 'text/yaml', text }],
      };
    }

    if (uri === 'ctx://landmines') {
      const text = ctx.landmines.length
        ? ctx.landmines.map(l =>
            `- ${l.description}${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`
          ).join('\n')
        : 'No landmines recorded.';
      return {
        contents: [{ uri, mimeType: 'text/plain', text }],
      };
    }

    return {
      contents: [{ uri, mimeType: 'text/plain', text: `Unknown resource: ${uri}` }],
    };
  });

  // --- Prompts ---

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'ctx_start_session',
        description: 'Start a coding session with full project context. Combines a task-specific capsule with a preflight checklist.',
        arguments: [
          {
            name: 'task',
            description: 'Description of the task you are about to work on',
            required: true,
          },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const name = request.params.name;

    if (name === 'ctx_start_session') {
      const task = (request.params.arguments?.task as string) || 'general development';
      const ctx = loadContext(ctxDir);
      const capsule = generateCapsule(ctx, task, ctx.config.budget.default);
      const preflight = generatePreflight(ctx, task, ctxDir);

      return {
        description: `Session context for: ${task}`,
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `${capsule.markdown}\n\n---\n\n${preflight.formatted}`,
            },
          },
        ],
      };
    }

    return {
      description: 'Unknown prompt',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Unknown prompt: ${name}`,
          },
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
