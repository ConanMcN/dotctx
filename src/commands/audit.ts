import { Command } from 'commander';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { runAudit } from '../core/audit.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerAudit(program: Command): void {
  program
    .command('audit')
    .description('Audit context freshness — stale files, drifted entries, ripple gaps')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const result = runAudit(ctx, ctxDir);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      // Colorize the formatted output
      const lines = result.formatted.split('\n');
      for (const line of lines) {
        if (line.startsWith('# ') || line.startsWith('## ')) {
          console.log(pc.bold(line));
        } else if (line.includes('⚠')) {
          console.log(pc.yellow(line));
        } else if (line.includes('✗')) {
          console.log(pc.red(line));
        } else if (line.includes('✓')) {
          console.log(pc.green(line));
        } else if (line.includes('?')) {
          console.log(pc.dim(line));
        } else {
          console.log(line);
        }
      }
    });
}
