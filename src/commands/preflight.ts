import { Command } from 'commander';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { generatePreflight } from '../core/preflight.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerPreflight(program: Command): void {
  program
    .command('preflight')
    .description('Pre-coding checklist — landmines, decisions, ripple map')
    .requiredOption('--task <description>', 'Task description')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const checklist = generatePreflight(ctx, opts.task);
      console.log(checklist.formatted);
    });
}
