import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { CTX_SETUP_SKILL, CTX_WORK_SKILL, CTX_WORK_DEEP_VERIFY, CTX_WORK_DEEP_CLOSE, CTX_REFRESH_SKILL } from '../templates/skill.js';

const SKILLS: { name: string; files: { filename: string; content: string }[]; description: string }[] = [
  { name: 'ctx-setup', files: [{ filename: 'SKILL.md', content: CTX_SETUP_SKILL }], description: 'Deep codebase scan to populate .ctx/ files' },
  { name: 'ctx-work', files: [
    { filename: 'SKILL.md', content: CTX_WORK_SKILL },
    { filename: 'deep-verify.md', content: CTX_WORK_DEEP_VERIFY },
    { filename: 'deep-close.md', content: CTX_WORK_DEEP_CLOSE },
  ], description: 'Context-aware development workflow' },
  { name: 'ctx-refresh', files: [{ filename: 'SKILL.md', content: CTX_REFRESH_SKILL }], description: 'Review and refresh stale context files' },
];

function installSkills(cwd: string): string[] {
  const skillsDir = path.join(cwd, '.claude', 'skills');
  const installed: string[] = [];
  for (const { name, files } of SKILLS) {
    const skillDir = path.join(skillsDir, name);
    fs.mkdirSync(skillDir, { recursive: true });
    for (const { filename, content } of files) {
      const p = path.join(skillDir, filename);
      fs.writeFileSync(p, content, 'utf-8');
      installed.push(p);
    }
  }
  return installed;
}

export function installSkillsDuringInit(cwd: string): string[] | null {
  try {
    const paths = installSkills(cwd);
    return paths.length > 0 ? paths : null;
  } catch {
    return null;
  }
}

export function registerSkill(program: Command): void {
  const skill = program
    .command('skill')
    .description('Manage dotctx skills (AI prompts)');

  skill
    .command('install')
    .description('Install dotctx skills as Claude Code slash commands')
    .option('--dir <path>', 'Target directory (defaults to cwd)')
    .action((opts) => {
      const cwd = opts.dir ? path.resolve(opts.dir) : process.cwd();

      installSkills(cwd);

      console.log(pc.green('✓ Skills installed'));
      console.log('');
      console.log(`  ${pc.dim('.claude/skills/')}`);
      for (const { name, description } of SKILLS) {
        console.log(`    ${pc.cyan(`/${name}`)}  — ${description}`);
      }
      console.log('');
      console.log(`  Use these slash commands in Claude Code.`);
      console.log(`  Or copy the SKILL.md contents into ChatGPT, Cursor, or Copilot Chat.`);
    });
}
