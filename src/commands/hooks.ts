import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

const HOOK_MARKER = '# dotctx: auto-update context after commit';

const HOOK_SCRIPT = `#!/bin/sh
${HOOK_MARKER}
command -v npx >/dev/null 2>&1 || exit 0
npx --yes dotctx push --auto --no-compile 2>/dev/null
npx --yes dotctx compile --target all 2>/dev/null
exit 0
`;

function findGitDir(): string | null {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, '.git');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function registerHooks(program: Command): void {
  const hooks = program
    .command('hooks')
    .description('Manage git hooks for auto-context updates');

  hooks
    .command('install')
    .description('Install post-commit hook for auto-context updates')
    .action(() => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const gitDir = findGitDir();
      if (!gitDir) {
        console.log(pc.red('Not a git repository. Run `git init` first.'));
        process.exit(1);
      }

      const hooksDir = path.join(gitDir, 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      const hookPath = path.join(hooksDir, 'post-commit');

      if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, 'utf-8');
        if (existing.includes(HOOK_MARKER)) {
          console.log(pc.yellow('dotctx post-commit hook is already installed.'));
          return;
        }
        // Append to existing hook
        fs.appendFileSync(hookPath, `\n${HOOK_SCRIPT}`, 'utf-8');
      } else {
        fs.writeFileSync(hookPath, HOOK_SCRIPT, 'utf-8');
      }

      fs.chmodSync(hookPath, 0o755);
      console.log(pc.green('✓ Installed post-commit hook'));
      console.log(`  ${pc.dim(hookPath)}`);
    });

  hooks
    .command('uninstall')
    .description('Remove the dotctx post-commit hook')
    .action(() => {
      const gitDir = findGitDir();
      if (!gitDir) {
        console.log(pc.red('Not a git repository.'));
        process.exit(1);
      }

      const hookPath = path.join(gitDir, 'hooks', 'post-commit');
      if (!fs.existsSync(hookPath)) {
        console.log(pc.dim('No post-commit hook found.'));
        return;
      }

      const content = fs.readFileSync(hookPath, 'utf-8');
      if (!content.includes(HOOK_MARKER)) {
        console.log(pc.dim('No dotctx hook found in post-commit.'));
        return;
      }

      // Remove the dotctx section
      const lines = content.split('\n');
      const filtered: string[] = [];
      let skipping = false;

      for (const line of lines) {
        if (line.includes(HOOK_MARKER)) {
          skipping = true;
          continue;
        }
        if (skipping && line === 'exit 0') {
          skipping = false;
          continue;
        }
        if (!skipping) {
          filtered.push(line);
        }
      }

      const remaining = filtered.join('\n').trim();
      if (!remaining || remaining === '#!/bin/sh') {
        fs.unlinkSync(hookPath);
        console.log(pc.green('✓ Removed post-commit hook'));
      } else {
        fs.writeFileSync(hookPath, remaining + '\n', 'utf-8');
        console.log(pc.green('✓ Removed dotctx section from post-commit hook'));
      }
    });
}
