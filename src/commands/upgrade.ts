import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir } from '../core/loader.js';
import { NO_CTX_DIR_MSG } from '../constants.js';
import { upgradeClaudeHooks } from '../utils/claude-hooks.js';
import { upgradeCursorHooks } from '../utils/cursor-hooks.js';
import { installSkillsDuringInit } from './skill.js';
import { readYaml, writeYaml } from '../utils/yaml.js';

const HOOK_MARKER = '# dotctx: auto-update context after commit';

const GIT_HOOK_SCRIPT = `#!/bin/sh
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

function mergeCtxrc(ctxDir: string): string[] {
  const changes: string[] = [];
  const ctxrcPath = path.join(ctxDir, '.ctxrc');
  const raw = readYaml<Record<string, unknown>>(ctxrcPath);
  if (!raw) return changes;

  const budget = raw.budget as Record<string, unknown> | undefined;
  const adapters = budget?.adapters as Record<string, number> | undefined;

  if (adapters && adapters.claude === 3000) {
    adapters.claude = 4000;
    writeYaml(ctxrcPath, raw);
    changes.push('Bumped budget.adapters.claude from 3000 to 4000');
  }

  return changes;
}

function upgradeGitHooks(): string[] {
  const changes: string[] = [];
  const gitDir = findGitDir();
  if (!gitDir) return changes;

  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'post-commit');

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf-8');
    if (existing.includes(HOOK_MARKER)) {
      return changes;
    }
    fs.appendFileSync(hookPath, `\n${GIT_HOOK_SCRIPT}`, 'utf-8');
  } else {
    fs.writeFileSync(hookPath, GIT_HOOK_SCRIPT, 'utf-8');
  }

  fs.chmodSync(hookPath, 0o755);
  changes.push('Installed git post-commit hook');
  return changes;
}

export function registerUpgrade(program: Command): void {
  program
    .command('upgrade')
    .description('Upgrade hooks, scripts, skill, and .ctxrc without touching .ctx/ content')
    .option('--git-hooks', 'Also update git post-commit hook')
    .option('--dry-run', 'Show what would change without making changes')
    .action((opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const cwd = process.cwd();
      const allChanges: { section: string; items: string[] }[] = [];

      if (opts.dryRun) {
        console.log(pc.blue('Dry run — no changes will be made.\n'));
      }

      // Claude Code hooks
      if (!opts.dryRun) {
        const claudeChanges = upgradeClaudeHooks(cwd);
        if (claudeChanges.length) allChanges.push({ section: 'Claude Code hooks', items: claudeChanges });
      } else {
        allChanges.push({ section: 'Claude Code hooks', items: [
          'Would update dotctx-preflight.sh',
          'Would update dotctx-post-commit.sh',
          'Would update dotctx-session-sync.sh',
          'Would update dotctx-landmine-guard.sh',
          'Would update dotctx-ripple-check.sh',
          'Would ensure UserPromptSubmit registration',
          'Would ensure PostToolUse (Bash) registration',
          'Would ensure Stop registration',
          'Would ensure PreToolUse (Write|Edit) registration',
          'Would ensure PostToolUse (Write|Edit) registration',
        ] });
      }

      // Cursor hooks
      if (!opts.dryRun) {
        const cursorChanges = upgradeCursorHooks(cwd);
        if (cursorChanges.length) allChanges.push({ section: 'Cursor hooks', items: cursorChanges });
      } else if (fs.existsSync(path.join(cwd, '.cursor'))) {
        allChanges.push({ section: 'Cursor hooks', items: [
          'Would update dotctx-session-start.sh',
          'Would ensure sessionStart registration',
        ] });
      }

      // Skills (migrate to .claude/skills/ and clean up legacy .claude/commands/ctx-*.md)
      if (!opts.dryRun) {
        const skillPaths = installSkillsDuringInit(cwd);
        const skillChanges: string[] = [];
        if (skillPaths) {
          skillChanges.push('Installed skills to .claude/skills/');
        }
        // Remove legacy .claude/commands/ctx-*.md files
        const legacySkills = ['ctx-setup.md', 'ctx-work.md', 'ctx-refresh.md'];
        const legacyDir = path.join(cwd, '.claude', 'commands');
        for (const f of legacySkills) {
          const legacyPath = path.join(legacyDir, f);
          if (fs.existsSync(legacyPath)) {
            fs.unlinkSync(legacyPath);
            skillChanges.push(`Removed legacy ${f} from .claude/commands/`);
          }
        }
        // Remove .claude/commands/ if empty after cleanup
        if (fs.existsSync(legacyDir)) {
          const remaining = fs.readdirSync(legacyDir);
          if (remaining.length === 0) {
            fs.rmdirSync(legacyDir);
            skillChanges.push('Removed empty .claude/commands/ directory');
          }
        }
        if (skillChanges.length) allChanges.push({ section: 'Skills', items: skillChanges });
      } else {
        const dryItems = ['Would install skills to .claude/skills/'];
        const legacySkills = ['ctx-setup.md', 'ctx-work.md', 'ctx-refresh.md'];
        const legacyDir = path.join(cwd, '.claude', 'commands');
        for (const f of legacySkills) {
          if (fs.existsSync(path.join(legacyDir, f))) {
            dryItems.push(`Would remove legacy ${f} from .claude/commands/`);
          }
        }
        allChanges.push({ section: 'Skills', items: dryItems });
      }

      // .ctxrc budget merge
      if (!opts.dryRun) {
        const ctxrcChanges = mergeCtxrc(ctxDir);
        if (ctxrcChanges.length) allChanges.push({ section: '.ctxrc', items: ctxrcChanges });
      } else {
        const raw = readYaml<Record<string, unknown>>(path.join(ctxDir, '.ctxrc'));
        const budget = raw?.budget as Record<string, unknown> | undefined;
        const adapters = budget?.adapters as Record<string, number> | undefined;
        if (adapters?.claude === 3000) {
          allChanges.push({ section: '.ctxrc', items: ['Would bump budget.adapters.claude from 3000 to 4000'] });
        }
      }

      // Git hooks (optional)
      if (opts.gitHooks) {
        if (!opts.dryRun) {
          const gitChanges = upgradeGitHooks();
          if (gitChanges.length) allChanges.push({ section: 'Git hooks', items: gitChanges });
        } else {
          allChanges.push({ section: 'Git hooks', items: ['Would install/update git post-commit hook'] });
        }
      }

      // Print summary
      if (allChanges.length === 0) {
        console.log(pc.green('✓ Everything is up to date.'));
        return;
      }

      console.log(opts.dryRun ? pc.blue('Changes that would be made:\n') : pc.green('✓ Upgrade complete\n'));

      for (const { section, items } of allChanges) {
        console.log(`  ${pc.bold(section)}`);
        for (const item of items) {
          console.log(`    ${opts.dryRun ? pc.dim('→') : pc.green('✓')} ${item}`);
        }
        console.log('');
      }
    });
}
