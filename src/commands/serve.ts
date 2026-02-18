import { Command } from 'commander';
import pc from 'picocolors';

export function registerServe(program: Command): void {
  program
    .command('serve')
    .description('Start MCP server (stdio transport)')
    .action(async () => {
      // Don't log to stdout since MCP uses it for communication
      console.error(pc.dim('Starting aictx MCP server...'));
      const { startMcpServer } = await import('../mcp/server.js');
      await startMcpServer();
    });
}
