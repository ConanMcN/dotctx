import { Command } from 'commander';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { appendToFile } from '../utils/markdown.js';

export function registerVocab(program: Command): void {
  program
    .command('vocab <term> <definition>')
    .description('Add a domain term that AI models misinterpret')
    .action((term, definition) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red('No .ctx/ directory found. Run `aictx init` first.'));
        process.exit(1);
      }

      const row = `| ${term} | ${definition} |`;
      appendToFile(path.join(ctxDir, 'vocabulary.md'), row);

      console.log(pc.green(`✓ Vocabulary added: ${term}`));
    });
}
