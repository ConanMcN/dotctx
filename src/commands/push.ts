import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { writeYaml } from '../utils/yaml.js';
import { isGitRepo, getGitBranch, getGitDiff, getRecentCommits } from '../utils/git.js';
import { autoCompile } from '../utils/autocompile.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerPush(program: Command): void {
  program
    .command('push')
    .description('Record a session handoff note')
    .option('--auto', 'Auto-generate from git state')
    .option('--no-compile', 'Skip auto-compile after recording')
    .action(async (opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const sessionsDir = path.join(ctxDir, 'sessions');
      fs.mkdirSync(sessionsDir, { recursive: true });

      const sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let summary: string;
      let state: string;
      let nextStep: string;
      let filesTouched: string[] = [];

      if (opts.auto) {
        // Auto-generate from git
        const branch = isGitRepo() ? getGitBranch() : '';
        const diff = isGitRepo() ? getGitDiff() : '';
        const commits = isGitRepo() ? getRecentCommits(3) : [];

        summary = commits.length
          ? `Commits: ${commits.join('; ')}`
          : 'No recent commits';
        state = 'in-progress';
        nextStep = '';

        // Extract files from diff
        if (diff) {
          filesTouched = diff.split('\n')
            .filter(line => line.includes('|'))
            .map(line => line.split('|')[0].trim())
            .filter(Boolean);
        }

        // Update current.yaml
        const currentPath = path.join(ctxDir, 'current.yaml');
        writeYaml(currentPath, {
          branch,
          task: ctx.current?.task || '',
          state,
          next_step: nextStep,
          blocked_by: '',
          files_touched: filesTouched,
          updated_at: new Date().toISOString().split('T')[0],
        });
      } else {
        // Interactive mode
        const { input, select } = await import('@inquirer/prompts');

        summary = await input({ message: 'What did you work on?' });
        state = await select({
          message: 'Current state?',
          choices: [
            { name: 'In progress', value: 'in-progress' },
            { name: 'Blocked', value: 'blocked' },
            { name: 'Reviewing', value: 'reviewing' },
            { name: 'Done', value: 'done' },
          ],
        });
        nextStep = await input({ message: 'What should be done next? (optional)', default: '' });

        // Update current.yaml
        const currentPath = path.join(ctxDir, 'current.yaml');
        writeYaml(currentPath, {
          branch: isGitRepo() ? getGitBranch() : ctx.current?.branch || '',
          task: ctx.current?.task || summary,
          state,
          next_step: nextStep,
          blocked_by: '',
          files_touched: ctx.current?.files_touched || [],
          updated_at: new Date().toISOString().split('T')[0],
        });
      }

      // Write session note
      const sessionData = {
        id: sessionId,
        date: new Date().toISOString().split('T')[0],
        summary,
        state,
        next_step: nextStep,
        files_touched: filesTouched,
      };

      writeYaml(path.join(sessionsDir, `${sessionId}.yaml`), sessionData);

      console.log(pc.green(`✓ Session note saved: ${sessionId}`));
      if (opts.auto) {
        console.log(`  Files touched: ${filesTouched.length}`);
      }

      if (opts.compile !== false) {
        autoCompile(ctxDir);
      }
    });
}
