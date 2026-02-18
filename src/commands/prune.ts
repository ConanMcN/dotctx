import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { writeYaml } from '../utils/yaml.js';
import { getExpiredLoops } from '../core/freshness.js';
import { autoCompile } from '../utils/autocompile.js';

export function registerPrune(program: Command): void {
  program
    .command('prune')
    .description('Remove expired items and old sessions')
    .option('--dry-run', 'Show what would be removed without removing')
    .option('--no-compile', 'Skip auto-compile after pruning')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red('No .ctx/ directory found. Run `aictx init` first.'));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const ttl = ctx.config.freshness.loop_default_ttl;
      let pruned = 0;

      // Prune expired loops
      const expired = getExpiredLoops(ctx.openLoops, ttl);
      if (expired.length) {
        console.log(pc.bold('  Expired loops:'));
        for (const l of expired) {
          console.log(`    - #${l.id}: ${l.description}`);
        }

        if (!opts.dryRun) {
          const remaining = ctx.openLoops.filter(l => !expired.includes(l));
          writeYaml(path.join(ctxDir, 'open-loops.yaml'), { loops: remaining });
          pruned += expired.length;
        }
      }

      // Prune old sessions
      const sessionsDir = path.join(ctxDir, 'sessions');
      try {
        const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.yaml')).sort().reverse();
        const maxSessions = ctx.config.freshness.max_sessions || 5;
        const toRemove = files.slice(maxSessions);

        if (toRemove.length) {
          console.log(pc.bold('  Old sessions:'));
          for (const f of toRemove) {
            console.log(`    - ${f}`);
          }

          if (!opts.dryRun) {
            for (const f of toRemove) {
              fs.unlinkSync(path.join(sessionsDir, f));
            }
            pruned += toRemove.length;
          }
        }
      } catch {
        // No sessions dir
      }

      if (opts.dryRun) {
        console.log(pc.dim('\n  (dry run — nothing removed)'));
      } else if (pruned) {
        console.log(pc.green(`\n  ✓ Pruned ${pruned} item(s)`));
        if (opts.compile !== false) {
          autoCompile(ctxDir);
        }
      } else {
        console.log(pc.dim('  Nothing to prune.'));
      }
    });
}
