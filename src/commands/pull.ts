import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { generateCapsule } from '../core/capsule.js';

export function registerPull(program: Command): void {
  program
    .command('pull')
    .description('Generate a task-specific context capsule')
    .requiredOption('--task <description>', 'Task description')
    .option('--budget <tokens>', 'Token budget', '0')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red('No .ctx/ directory found. Run `aictx init` first.'));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const budget = parseInt(opts.budget, 10) || ctx.config.budget.default;
      const capsule = generateCapsule(ctx, opts.task, budget);

      // Write capsule.md
      const capsulePath = path.join(ctxDir, 'capsule.md');
      fs.writeFileSync(capsulePath, capsule.markdown, 'utf-8');

      // Write resume.txt
      const resumePath = path.join(ctxDir, 'resume.txt');
      fs.writeFileSync(resumePath, capsule.resume, 'utf-8');

      console.log(pc.green('✓ Generated context capsule'));
      console.log(`  Tokens: ${capsule.tokens}/${budget}`);
      console.log(`  ${pc.dim(capsulePath)}`);
      console.log(`  ${pc.dim(resumePath)}`);
    });
}
