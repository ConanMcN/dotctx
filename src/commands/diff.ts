import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { readYaml } from '../utils/yaml.js';
import { NO_CTX_DIR_MSG } from '../constants.js';
import { isGitRepo } from '../utils/git.js';
import { execSync } from 'node:child_process';

interface SessionData {
  id: string;
  date: string;
  summary: string;
  state: string;
  next_step: string;
  files_touched: string[];
  landmines_added: string[];
  loops_added: string[];
}

function getCtxGitChanges(ctxDir: string, sinceDate: string): string[] {
  if (!isGitRepo()) return [];
  try {
    const output = execSync(
      `git log --since="${sinceDate}" --name-only --pretty=format: -- "${ctxDir}"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (!output) return [];
    const files = [...new Set(output.split('\n').filter(Boolean))];
    return files.map(f => path.relative(path.dirname(ctxDir), f));
  } catch {
    return [];
  }
}

export function registerDiff(program: Command): void {
  program
    .command('diff')
    .description('Show what changed in .ctx/ since the last session')
    .option('--sessions <n>', 'Compare last N sessions (default: 2)', '2')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const sessionsDir = path.join(ctxDir, 'sessions');
      if (!fs.existsSync(sessionsDir)) {
        console.log(pc.dim('No sessions found.'));
        return;
      }

      const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.yaml'))
        .sort()
        .reverse();

      const count = Math.min(parseInt(opts.sessions, 10) || 2, files.length);
      if (files.length < 1) {
        console.log(pc.dim('No sessions found.'));
        return;
      }

      const sessions: SessionData[] = files.slice(0, count).map(f => {
        const data = readYaml<Record<string, unknown>>(path.join(sessionsDir, f));
        return {
          id: (data?.id as string) || f.replace('.yaml', ''),
          date: (data?.date as string) || '',
          summary: (data?.summary as string) || '',
          state: (data?.state as string) || '',
          next_step: (data?.next_step as string) || '',
          files_touched: (data?.files_touched as string[]) || [],
          landmines_added: (data?.landmines_added as string[]) || [],
          loops_added: (data?.loops_added as string[]) || [],
        };
      });

      const latest = sessions[0];
      const previous = sessions.length > 1 ? sessions[1] : null;

      console.log('');
      console.log(pc.bold('dotctx diff'));
      console.log('');

      // Latest session summary
      console.log(`  ${pc.cyan('Latest session:')} ${latest.date || latest.id}`);
      if (latest.summary) console.log(`    ${latest.summary}`);
      if (latest.state) console.log(`    State: ${latest.state}`);
      if (latest.next_step) console.log(`    Next: ${latest.next_step}`);
      console.log('');

      // What changed
      const changes: string[] = [];

      if (latest.files_touched.length) {
        changes.push(`  ${pc.green('Files touched:')} ${latest.files_touched.join(', ')}`);
      }
      if (latest.landmines_added.length) {
        changes.push(`  ${pc.yellow('Landmines added:')} ${latest.landmines_added.length}`);
      }
      if (latest.loops_added.length) {
        changes.push(`  ${pc.blue('Loops added:')} ${latest.loops_added.length}`);
      }

      // Git-based .ctx/ file changes since previous session
      if (previous?.date) {
        const ctxChanges = getCtxGitChanges(ctxDir, previous.date);
        if (ctxChanges.length) {
          changes.push(`  ${pc.magenta('Context files changed since previous session:')}`);
          for (const f of ctxChanges) {
            changes.push(`    ${f}`);
          }
        }
      }

      if (changes.length) {
        console.log(pc.bold('  Changes:'));
        for (const c of changes) console.log(c);
      } else {
        console.log(pc.dim('  No changes recorded.'));
      }

      // Previous session for comparison
      if (previous) {
        console.log('');
        console.log(`  ${pc.dim('Previous session:')} ${previous.date || previous.id}`);
        if (previous.summary) console.log(`    ${pc.dim(previous.summary)}`);
      }

      console.log('');
    });
}
