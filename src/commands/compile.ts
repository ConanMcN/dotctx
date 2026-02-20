import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { getAdapter, getAllAdapters } from '../core/adapters/index.js';
import { countTokens } from '../utils/tokens.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerCompile(program: Command): void {
  program
    .command('compile')
    .description('Compile context for a specific AI tool')
    .requiredOption('--target <tool>', 'Target tool: claude, cursor, copilot, system, all')
    .option('--stdout', 'Print to stdout instead of writing files')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const projectDir = path.dirname(ctxDir);
      const targets = opts.target === 'all'
        ? getAllAdapters().filter(a => a.outputPath)
        : [getAdapter(opts.target)].filter(Boolean);

      if (!targets.length) {
        console.log(pc.red(`Unknown target: ${opts.target}. Use: claude, cursor, copilot, system, all`));
        process.exit(1);
      }

      for (const adapter of targets) {
        if (!adapter) continue;
        const output = adapter.compile(ctx);

        if (opts.stdout || !adapter.outputPath) {
          console.log(output);
        } else {
          const outputPath = path.join(projectDir, adapter.outputPath);
          const outputDir = path.dirname(outputPath);
          fs.mkdirSync(outputDir, { recursive: true });
          fs.writeFileSync(outputPath, output, 'utf-8');
          const tokens = countTokens(output);
          console.log(pc.green(`✓ ${adapter.name} → ${adapter.outputPath}`) + pc.dim(` (~${tokens} tokens)`));
        }
      }
    });
}
