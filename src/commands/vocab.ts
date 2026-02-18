import { Command } from 'commander';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { appendToFile } from '../utils/markdown.js';
import { autoCompile } from '../utils/autocompile.js';

export function registerVocab(program: Command): void {
  program
    .command('vocab <term> <definition>')
    .description('Add a domain term that AI models misinterpret')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action((term, definition, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red('No .ctx/ directory found. Run `aictx init` first.'));
        process.exit(1);
      }

      const row = `| ${term} | ${definition} |`;
      appendToFile(path.join(ctxDir, 'vocabulary.md'), row);

      console.log(pc.green(`✓ Vocabulary added: ${term}`));

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });
}
