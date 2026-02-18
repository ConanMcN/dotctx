import { Command } from 'commander';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { appendToFile } from '../utils/markdown.js';
import { autoCompile } from '../utils/autocompile.js';

export function registerLandmine(program: Command): void {
  program
    .command('landmine <description>')
    .description('Mark something as intentionally weird — DO NOT change')
    .option('--file <path>', 'File path and optional line number (e.g., src/auth.ts:42)')
    .option('--why <reason>', 'Why it is intentional')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action((description, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red('No .ctx/ directory found. Run `aictx init` first.'));
        process.exit(1);
      }

      const date = new Date().toISOString().split('T')[0];
      const row = `| ${description} | ${opts.file || ''} | ${opts.why || ''} | ${date} |`;
      appendToFile(path.join(ctxDir, 'landmines.md'), row);

      console.log(pc.green(`✓ Landmine marked: ${description}`));

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });
}
