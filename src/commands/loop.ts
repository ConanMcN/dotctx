import { Command } from 'commander';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { writeYaml } from '../utils/yaml.js';
import { parseDuration, isStale, getExpiredLoops, getExpiringLoops } from '../core/freshness.js';
import { autoCompile } from '../utils/autocompile.js';
import { NO_CTX_DIR_MSG } from '../constants.js';
import type { OpenLoop } from '../types.js';

export function registerLoop(program: Command): void {
  const loop = program
    .command('loop')
    .description('Manage open loops (hanging threads)');

  loop
    .command('add')
    .description('Add a new open loop')
    .argument('<description>', 'What needs to be done')
    .option('--ttl <duration>', 'Time-to-live (e.g., 7d, 48h)', '14d')
    .option('--context <text>', 'Additional context')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action((description, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const maxId = ctx.openLoops.reduce((max, l) => Math.max(max, l.id), 0);
      const newLoop: OpenLoop = {
        id: maxId + 1,
        description,
        created_at: new Date().toISOString().split('T')[0],
        ttl: opts.ttl,
        status: 'open',
        context: opts.context || '',
      };

      const loops = [...ctx.openLoops, newLoop];
      writeYaml(path.join(ctxDir, 'open-loops.yaml'), { loops });

      console.log(pc.green(`✓ Loop #${newLoop.id} added: ${description}`));

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });

  loop
    .command('resolve')
    .description('Mark a loop as resolved')
    .argument('<id>', 'Loop ID')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action((id, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const loop = ctx.openLoops.find(l => l.id === parseInt(id, 10));
      if (!loop) {
        console.log(pc.red(`Loop #${id} not found.`));
        return;
      }

      loop.status = 'resolved';
      writeYaml(path.join(ctxDir, 'open-loops.yaml'), { loops: ctx.openLoops });

      console.log(pc.green(`✓ Loop #${id} resolved: ${loop.description}`));

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });

  loop
    .command('list')
    .description('List open loops')
    .option('--all', 'Include resolved loops')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const loops = opts.all
        ? ctx.openLoops
        : ctx.openLoops.filter(l => l.status === 'open');

      if (!loops.length) {
        console.log(pc.dim('No open loops.'));
        return;
      }

      const ttl = ctx.config.freshness.loop_default_ttl;
      const expiring = getExpiringLoops(loops, ttl);
      const expired = getExpiredLoops(loops, ttl);

      for (const l of loops) {
        const status = l.status === 'resolved'
          ? pc.dim('[resolved]')
          : expired.includes(l) ? pc.red('[expired]')
          : expiring.includes(l) ? pc.yellow('[expiring]')
          : pc.green('[open]');

        console.log(`  #${l.id} ${status} ${l.description}`);
        if (l.context) console.log(`     ${pc.dim(l.context)}`);
      }
    });
}
