import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { findCtxDir, loadContext } from '../core/loader.js';
import { runAudit } from '../core/audit.js';

interface Check {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail?: string;
}

const CTX_FILES = [
  'stack.yaml',
  'current.yaml',
  'open-loops.yaml',
  'architecture.md',
  'conventions.md',
  'decisions.md',
  'landmines.md',
  'vocabulary.md',
  '.ctxrc',
];

const CLAUDE_HOOKS = [
  { file: 'dotctx-preflight.sh', event: 'UserPromptSubmit' },
  { file: 'dotctx-post-commit.sh', event: 'PostToolUse' },
  { file: 'dotctx-session-sync.sh', event: 'Stop' },
  { file: 'dotctx-landmine-guard.sh', event: 'PreToolUse' },
  { file: 'dotctx-ripple-check.sh', event: 'PostToolUse' },
];

const SKILLS = [
  'ctx-setup',
  'ctx-work',
  'ctx-refresh',
];

const ADAPTERS: { target: string; output: string }[] = [
  { target: 'claude', output: 'CLAUDE.md' },
  { target: 'cursor', output: '.cursorrules' },
  { target: 'copilot', output: '.github/copilot-instructions.md' },
];

function checkCtxDir(cwd: string): Check {
  const ctxDir = findCtxDir(cwd);
  if (!ctxDir) {
    return { label: '.ctx/ directory', status: 'fail', detail: 'Not found. Run `dotctx init` to create it.' };
  }
  return { label: '.ctx/ directory', status: 'pass' };
}

function checkCtxFiles(ctxDir: string): Check {
  const existing = CTX_FILES.filter(f => fs.existsSync(path.join(ctxDir, f)));
  const missing = CTX_FILES.filter(f => !fs.existsSync(path.join(ctxDir, f)));

  if (missing.length === 0) {
    return { label: `Context files (${existing.length}/${CTX_FILES.length})`, status: 'pass' };
  }
  if (missing.length <= 2) {
    return { label: `Context files (${existing.length}/${CTX_FILES.length})`, status: 'warn', detail: `Missing: ${missing.join(', ')}` };
  }
  return { label: `Context files (${existing.length}/${CTX_FILES.length})`, status: 'fail', detail: `Missing: ${missing.join(', ')}. Run \`dotctx init --scan\`` };
}

function checkCtxPopulated(ctxDir: string): Check {
  let populated = 0;
  let empty = 0;
  const emptyFiles: string[] = [];

  for (const f of CTX_FILES) {
    const filePath = path.join(ctxDir, f);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    // Consider a file "empty" if it only has template headers/comments
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('<!--'));
    if (lines.length <= 1) {
      empty++;
      emptyFiles.push(f);
    } else {
      populated++;
    }
  }

  if (empty === 0) {
    return { label: `Files populated (${populated} with content)`, status: 'pass' };
  }
  return { label: `Files populated (${populated} with content, ${empty} empty)`, status: 'warn', detail: `Empty: ${emptyFiles.join(', ')}. Run /ctx-setup to populate` };
}

function checkClaudeHooks(cwd: string): Check {
  const hooksDir = path.join(cwd, '.claude', 'hooks');
  const settingsPath = path.join(cwd, '.claude', 'settings.json');

  if (!fs.existsSync(hooksDir)) {
    return { label: 'Claude Code hooks', status: 'fail', detail: 'No .claude/hooks/ directory. Run `dotctx init`' };
  }

  const installed = CLAUDE_HOOKS.filter(h => fs.existsSync(path.join(hooksDir, h.file)));
  const missing = CLAUDE_HOOKS.filter(h => !fs.existsSync(path.join(hooksDir, h.file)));

  if (missing.length > 0) {
    return {
      label: `Claude Code hooks (${installed.length}/${CLAUDE_HOOKS.length})`,
      status: 'warn',
      detail: `Missing: ${missing.map(h => h.file).join(', ')}. Run \`dotctx upgrade\``,
    };
  }

  // Check settings.json registration
  if (!fs.existsSync(settingsPath)) {
    return {
      label: `Claude Code hooks (${installed.length}/${CLAUDE_HOOKS.length})`,
      status: 'warn',
      detail: 'Hook scripts exist but not registered in settings.json. Run `dotctx upgrade`',
    };
  }

  return { label: `Claude Code hooks (${installed.length}/${CLAUDE_HOOKS.length})`, status: 'pass' };
}

function checkCursorHooks(cwd: string): Check {
  const cursorDir = path.join(cwd, '.cursor');
  if (!fs.existsSync(cursorDir)) {
    return { label: 'Cursor hooks', status: 'pass', detail: 'No .cursor/ directory (not using Cursor)' };
  }

  const hookPath = path.join(cursorDir, 'hooks', 'dotctx-session-start.sh');
  if (fs.existsSync(hookPath)) {
    return { label: 'Cursor hooks (1/1)', status: 'pass' };
  }
  return { label: 'Cursor hooks (0/1)', status: 'warn', detail: 'Missing dotctx-session-start.sh. Run `dotctx upgrade`' };
}

function checkSkills(cwd: string): Check {
  const skillsDir = path.join(cwd, '.claude', 'skills');
  const legacyDir = path.join(cwd, '.claude', 'commands');

  // Check modern .claude/skills/ first, fall back to legacy .claude/commands/
  const useModern = fs.existsSync(skillsDir);
  const useLegacy = !useModern && fs.existsSync(legacyDir);

  if (!useModern && !useLegacy) {
    return { label: 'Skills', status: 'fail', detail: 'No .claude/skills/ directory. Run `dotctx init`' };
  }

  const installed = SKILLS.filter(s =>
    (useModern && fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))) ||
    (useLegacy && fs.existsSync(path.join(legacyDir, `${s}.md`)))
  );
  const missing = SKILLS.filter(s =>
    !(useModern && fs.existsSync(path.join(skillsDir, s, 'SKILL.md'))) &&
    !(useLegacy && fs.existsSync(path.join(legacyDir, `${s}.md`)))
  );

  if (missing.length > 0) {
    return {
      label: `Skills (${installed.length}/${SKILLS.length})`,
      status: 'warn',
      detail: `Missing: ${missing.map(s => `/${s}`).join(', ')}. Run \`dotctx skill install\``,
    };
  }

  if (useLegacy) {
    return {
      label: `Skills (${installed.length}/${SKILLS.length})`,
      status: 'warn',
      detail: 'Using legacy .claude/commands/ format. Run `dotctx upgrade` to migrate to .claude/skills/',
    };
  }

  return { label: `Skills (${installed.length}/${SKILLS.length})`, status: 'pass' };
}

function checkAdapters(cwd: string, ctxDir: string): Check {
  const existing: string[] = [];
  const missing: string[] = [];
  const stale: string[] = [];

  for (const a of ADAPTERS) {
    const outputPath = path.join(cwd, a.output);
    if (!fs.existsSync(outputPath)) {
      missing.push(a.target);
      continue;
    }
    existing.push(a.target);

    // Check if any .ctx/ file is newer than the adapter output
    const outputMtime = fs.statSync(outputPath).mtimeMs;
    for (const f of CTX_FILES) {
      const ctxFilePath = path.join(ctxDir, f);
      if (fs.existsSync(ctxFilePath) && fs.statSync(ctxFilePath).mtimeMs > outputMtime) {
        stale.push(a.target);
        break;
      }
    }
  }

  if (missing.length === ADAPTERS.length) {
    return { label: 'Adapter outputs', status: 'fail', detail: 'No compiled outputs. Run `dotctx compile --target all`' };
  }

  if (stale.length > 0) {
    return {
      label: `Adapter outputs (${existing.length} compiled, ${stale.length} stale)`,
      status: 'warn',
      detail: `Stale: ${stale.join(', ')}. Run \`dotctx compile --target all\``,
    };
  }

  return { label: `Adapter outputs (${existing.length} compiled)`, status: 'pass' };
}

function checkGitHook(cwd: string): Check {
  const hookPath = path.join(cwd, '.git', 'hooks', 'post-commit');
  if (!fs.existsSync(hookPath)) {
    return { label: 'Git post-commit hook', status: 'warn', detail: 'Not installed. Run `dotctx hooks install`' };
  }
  const content = fs.readFileSync(hookPath, 'utf-8');
  if (content.includes('dotctx')) {
    return { label: 'Git post-commit hook', status: 'pass' };
  }
  return { label: 'Git post-commit hook', status: 'warn', detail: 'Hook exists but doesn\'t reference dotctx' };
}

function checkStaleness(ctxDir: string): Check {
  try {
    const ctx = loadContext(ctxDir);
    const audit = runAudit(ctx, ctxDir);
    const staleCount = audit.fileStale.filter(f => f.isStale).length;
    const driftCount = audit.entryDrift.length;

    if (staleCount === 0 && driftCount === 0) {
      return { label: 'Context freshness', status: 'pass' };
    }

    const parts: string[] = [];
    if (staleCount > 0) parts.push(`${staleCount} stale file${staleCount > 1 ? 's' : ''}`);
    if (driftCount > 0) parts.push(`${driftCount} drifted entr${driftCount > 1 ? 'ies' : 'y'}`);
    return {
      label: `Context freshness (${parts.join(', ')})`,
      status: 'warn',
      detail: 'Run `dotctx audit` for details',
    };
  } catch {
    return { label: 'Context freshness', status: 'warn', detail: 'Could not run audit' };
  }
}

function formatCheck(check: Check): string {
  const icon = check.status === 'pass' ? pc.green('✓') : check.status === 'warn' ? pc.yellow('⚠') : pc.red('✗');
  let line = `  ${icon} ${check.label}`;
  if (check.detail) {
    line += `\n    ${pc.dim(check.detail)}`;
  }
  return line;
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor')
    .description('Check dotctx setup — hooks, skills, adapters, freshness')
    .action(() => {
      const cwd = process.cwd();
      const ctxDir = findCtxDir(cwd);

      console.log('');
      console.log(pc.bold('dotctx doctor'));
      console.log('');

      const checks: Check[] = [];

      // Core checks
      checks.push(checkCtxDir(cwd));

      if (ctxDir) {
        checks.push(checkCtxFiles(ctxDir));
        checks.push(checkCtxPopulated(ctxDir));
      }

      // Hooks & skills
      checks.push(checkClaudeHooks(cwd));
      checks.push(checkCursorHooks(cwd));
      checks.push(checkSkills(cwd));

      // Outputs
      if (ctxDir) {
        checks.push(checkAdapters(cwd, ctxDir));
      }

      // Git
      checks.push(checkGitHook(cwd));

      // Freshness
      if (ctxDir) {
        checks.push(checkStaleness(ctxDir));
      }

      for (const check of checks) {
        console.log(formatCheck(check));
      }

      console.log('');

      const passCount = checks.filter(c => c.status === 'pass').length;
      const warnCount = checks.filter(c => c.status === 'warn').length;
      const failCount = checks.filter(c => c.status === 'fail').length;

      if (failCount > 0) {
        console.log(pc.red(`  ${failCount} issue${failCount > 1 ? 's' : ''} found. Run the suggested commands to fix.`));
      } else if (warnCount > 0) {
        console.log(pc.yellow(`  ${warnCount} warning${warnCount > 1 ? 's' : ''}. Everything works but could be improved.`));
      } else {
        console.log(pc.green('  All checks passed. dotctx is fully configured.'));
      }

      console.log('');
    });
}
