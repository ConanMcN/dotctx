import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { CTX_SETUP_SKILL, CTX_WORK_SKILL } from '../templates/skill.js';

const SKILLS: { filename: string; content: string; description: string }[] = [
  { filename: 'ctx-setup.md', content: CTX_SETUP_SKILL, description: 'Deep codebase scan to populate .ctx/ files' },
  { filename: 'ctx-work.md', content: CTX_WORK_SKILL, description: 'Context-aware development workflow' },
];

function getSkillDir(cwd: string): string {
  return path.join(cwd, '.claude', 'commands');
}

function installSkills(cwd: string): string[] {
  const skillDir = getSkillDir(cwd);
  fs.mkdirSync(skillDir, { recursive: true });
  return SKILLS.map(({ filename, content }) => {
    const p = path.join(skillDir, filename);
    fs.writeFileSync(p, content, 'utf-8');
    return p;
  });
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
      console.log(`  ${pc.dim('.claude/commands/')}`);
      for (const { filename, description } of SKILLS) {
        const name = filename.replace('.md', '');
        console.log(`    ${pc.cyan(`/${name}`)}  — ${description}`);
      }
      console.log('');
      console.log(`  Use these slash commands in Claude Code.`);
      console.log(`  Or copy the file contents into ChatGPT, Cursor, or Copilot Chat.`);
    });
}
