import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { countTokens } from '../utils/tokens.js';
import { isStale, getExpiredLoops, getExpiringLoops } from '../core/freshness.js';
import { getStaleFileWarnings } from '../core/audit.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerStatus(program: Command): void {
  program
    .command('status')
    .description('Show context status — token usage, staleness, TTL warnings')
    .action(() => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);

      console.log(pc.bold('\n  Context Status\n'));

      // Token counts per file
      console.log(pc.bold('  Token usage:'));
      const files = [
        'stack.yaml', 'current.yaml', 'open-loops.yaml',
        'architecture.md', 'conventions.md', 'decisions.md',
        'landmines.md', 'vocabulary.md', '.ctxrc',
      ];

      let totalTokens = 0;
      for (const file of files) {
        const filePath = path.join(ctxDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const tokens = countTokens(content);
          totalTokens += tokens;
          console.log(`    ${file.padEnd(22)} ${String(tokens).padStart(5)} tokens`);
        } catch {
          console.log(`    ${file.padEnd(22)} ${pc.dim('—')}`);
        }
      }

      // Session files
      const sessionsDir = path.join(ctxDir, 'sessions');
      try {
        const sessionFiles = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.yaml'));
        let sessionTokens = 0;
        for (const f of sessionFiles) {
          const content = fs.readFileSync(path.join(sessionsDir, f), 'utf-8');
          sessionTokens += countTokens(content);
        }
        totalTokens += sessionTokens;
        console.log(`    sessions/ (${sessionFiles.length})${' '.repeat(Math.max(0, 14 - String(sessionFiles.length).length))} ${String(sessionTokens).padStart(5)} tokens`);
      } catch {
        console.log(`    sessions/              ${pc.dim('—')}`);
      }

      console.log(`    ${'─'.repeat(32)}`);
      console.log(`    ${'Total'.padEnd(22)} ${String(totalTokens).padStart(5)} tokens`);
      console.log(`    Budget: ${ctx.config.budget.default}`);
      console.log('');

      // Staleness
      const staleThreshold = parseInt(ctx.config.freshness.stale_threshold) || 48;
      const staleItems: string[] = [];

      if (ctx.current?.updated_at && isStale(ctx.current.updated_at, staleThreshold)) {
        staleItems.push('current.yaml');
      }
      if (ctx.stack?.updated_at && isStale(ctx.stack.updated_at, staleThreshold)) {
        staleItems.push('stack.yaml');
      }

      if (staleItems.length) {
        console.log(pc.yellow(`  ⚠ Stale (>${staleThreshold}h):`));
        for (const item of staleItems) {
          console.log(`    - ${item}`);
        }
        console.log('');
      }

      // File freshness (git-based)
      const fileThreshold = ctx.config.freshness?.file_stale_threshold || '30d';
      const staleWarnings = getStaleFileWarnings(ctxDir, fileThreshold);
      if (staleWarnings.length) {
        console.log(pc.yellow(`  ⚠ File freshness:`));
        for (const w of staleWarnings) {
          console.log(`    ${w}`);
        }
        console.log('');
      }

      // Open loops
      const openLoops = ctx.openLoops.filter(l => l.status === 'open');
      const ttl = ctx.config.freshness.loop_default_ttl;
      const expiring = getExpiringLoops(openLoops, ttl);
      const expired = getExpiredLoops(openLoops, ttl);

      if (expired.length) {
        console.log(pc.red(`  ✗ Expired loops (${expired.length}):`));
        for (const l of expired) {
          console.log(`    - #${l.id}: ${l.description}`);
        }
        console.log('');
      }

      if (expiring.length) {
        console.log(pc.yellow(`  ⚠ Expiring soon (${expiring.length}):`));
        for (const l of expiring) {
          console.log(`    - #${l.id}: ${l.description}`);
        }
        console.log('');
      }

      if (openLoops.length && !expired.length && !expiring.length) {
        console.log(pc.green(`  ✓ ${openLoops.length} open loop(s), all within TTL`));
        console.log('');
      }
    });
}
