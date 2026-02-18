import { Command } from 'commander';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { appendToFile } from '../utils/markdown.js';
import { autoCompile } from '../utils/autocompile.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerDecide(program: Command): void {
  program
    .command('decide <decision>')
    .description('Record an architectural or implementation decision')
    .option('--over <alternatives>', 'Rejected alternatives (comma-separated)')
    .option('--why <reason>', 'Why this decision was made')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action((decision, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const date = new Date().toISOString().split('T')[0];
      const row = `| ${decision} | ${opts.over || ''} | ${opts.why || ''} | ${date} |`;
      appendToFile(path.join(ctxDir, 'decisions.md'), row);

      console.log(pc.green(`✓ Decision recorded: ${decision}`));

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });
}
