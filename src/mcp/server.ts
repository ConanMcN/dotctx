import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createTools } from './tools.js';
import { findCtxDir } from '../core/loader.js';

export async function startMcpServer(): Promise<void> {
  const ctxDir = findCtxDir() || '.ctx';
  const tools = createTools(ctxDir);

  const server = new Server(
    { name: 'dotctx', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

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

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
