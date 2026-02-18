import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { CTX_SETUP_SKILL } from '../templates/skill.js';

const SKILL_FILENAME = 'ctx-setup.md';

function getSkillDir(cwd: string): string {
  return path.join(cwd, '.claude', 'commands');
}

function installSkill(cwd: string): { path: string; created: boolean } {
  const skillDir = getSkillDir(cwd);
  const skillPath = path.join(skillDir, SKILL_FILENAME);

  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillPath, CTX_SETUP_SKILL, 'utf-8');

  return { path: skillPath, created: true };
}

export function installSkillDuringInit(cwd: string): string | null {
  try {
    const result = installSkill(cwd);
    return result.path;
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
    .description('Install the ctx-setup skill as a Claude Code slash command')
    .option('--dir <path>', 'Target directory (defaults to cwd)')
    .action((opts) => {
      const cwd = opts.dir ? path.resolve(opts.dir) : process.cwd();

      const result = installSkill(cwd);

      console.log(pc.green('✓ Skill installed'));
      console.log('');
      console.log(`  ${pc.dim('.claude/commands/')}${SKILL_FILENAME}`);
      console.log('');
      console.log(`  Use ${pc.cyan('/ctx-setup')} in Claude Code to run a deep codebase scan.`);
      console.log(`  Or copy the file contents into ChatGPT, Cursor, or Copilot Chat.`);
    });
}
