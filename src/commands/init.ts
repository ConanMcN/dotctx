import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { TEMPLATES } from '../templates/index.js';
import { findCtxDir } from '../core/loader.js';
import { installSkillDuringInit } from './skill.js';
import {
  installClaudeHookDuringInit,
  installClaudePostCommitHook,
  installClaudeSessionSyncHook,
  installClaudeLandmineGuardHook,
  installClaudeRippleCheckHook,
} from '../utils/claude-hooks.js';
import { installCursorHookDuringInit } from '../utils/cursor-hooks.js';

function detectStack(projectDir: string): { language: string[]; framework: string[]; build: string[]; test: string[] } {
  const result = { language: [] as string[], framework: [] as string[], build: [] as string[], test: [] as string[] };

  // Check package.json
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    result.language.push('TypeScript/JavaScript');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Frameworks
      if (allDeps['next']) result.framework.push('Next.js');
      if (allDeps['react']) result.framework.push('React');
      if (allDeps['vue']) result.framework.push('Vue');
      if (allDeps['svelte'] || allDeps['@sveltejs/kit']) result.framework.push('Svelte');
      if (allDeps['express']) result.framework.push('Express');
      if (allDeps['fastify']) result.framework.push('Fastify');
      if (allDeps['hono']) result.framework.push('Hono');

      // Build tools
      if (allDeps['tsup']) result.build.push('tsup');
      if (allDeps['vite']) result.build.push('Vite');
      if (allDeps['webpack']) result.build.push('webpack');
      if (allDeps['esbuild']) result.build.push('esbuild');
      if (allDeps['turbo'] || allDeps['turbo']) result.build.push('Turborepo');

      // Test
      if (allDeps['vitest']) result.test.push('Vitest');
      if (allDeps['jest']) result.test.push('Jest');
      if (allDeps['playwright'] || allDeps['@playwright/test']) result.test.push('Playwright');
      if (allDeps['cypress']) result.test.push('Cypress');
    } catch { /* ignore parse errors */ }
  }

  // Python
  if (fs.existsSync(path.join(projectDir, 'pyproject.toml')) || fs.existsSync(path.join(projectDir, 'setup.py'))) {
    result.language.push('Python');
  }

  // Go
  if (fs.existsSync(path.join(projectDir, 'go.mod'))) {
    result.language.push('Go');
  }

  // Rust
  if (fs.existsSync(path.join(projectDir, 'Cargo.toml'))) {
    result.language.push('Rust');
  }

  return result;
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize .ctx/ directory with template files')
    .option('--scan', 'Auto-detect project stack from config files')
    .option('--force', 'Overwrite existing .ctx/ directory')
    .action(async (opts) => {
      const cwd = process.cwd();
      const ctxDir = path.join(cwd, '.ctx');

      if (fs.existsSync(ctxDir) && !opts.force) {
        console.log(pc.yellow('.ctx/ directory already exists. Use --force to overwrite.'));
        return;
      }

      // Create .ctx/ directory
      fs.mkdirSync(ctxDir, { recursive: true });
      fs.mkdirSync(path.join(ctxDir, 'sessions'), { recursive: true });

      // Write template files
      for (const [key, template] of Object.entries(TEMPLATES)) {
        const filePath = path.join(ctxDir, template.filename);
        let content = template.content;

        // If scanning, inject detected stack
        if (opts.scan && key === 'stack') {
          const stack = detectStack(cwd);
          const yaml = await import('js-yaml');
          content = yaml.dump({
            name: path.basename(cwd),
            ...stack,
            deploy: '',
            notes: '',
            updated_at: new Date().toISOString().split('T')[0],
          }, { lineWidth: -1 });
          content = `# Project stack — tech, tooling, environments\n${content}`;
        }

        fs.writeFileSync(filePath, content, 'utf-8');
      }

      console.log(pc.green('✓ Initialized .ctx/ directory'));
      console.log('');
      console.log('  Created:');
      for (const template of Object.values(TEMPLATES)) {
        console.log(`    ${pc.dim('.ctx/')}${template.filename}`);
      }
      console.log(`    ${pc.dim('.ctx/')}sessions/`);
      console.log('');

      if (opts.scan) {
        const stack = detectStack(cwd);
        if (stack.language.length || stack.framework.length) {
          console.log(pc.blue('  Detected stack:'));
          if (stack.language.length) console.log(`    Language: ${stack.language.join(', ')}`);
          if (stack.framework.length) console.log(`    Framework: ${stack.framework.join(', ')}`);
          if (stack.build.length) console.log(`    Build: ${stack.build.join(', ')}`);
          if (stack.test.length) console.log(`    Test: ${stack.test.join(', ')}`);
          console.log('');
        }
      }

      // Install the ctx-setup skill as a Claude Code slash command
      const skillPath = installSkillDuringInit(cwd);
      if (skillPath) {
        console.log(`  ${pc.green('✓')} Skill installed: ${pc.dim('.claude/commands/')}ctx-setup.md`);
        console.log(`    Use ${pc.cyan('/ctx-setup')} in Claude Code to auto-populate .ctx/ files.`);
        console.log('');
      }

      // Install Claude Code hooks (always — .claude/ already exists from skill install)
      const claudeHookPath = installClaudeHookDuringInit(cwd);
      if (claudeHookPath) {
        console.log(`  ${pc.green('✓')} Claude Code hook: ${pc.dim('.claude/hooks/')}dotctx-preflight.sh`);
        console.log(`    Preflight runs automatically on every prompt.`);
        console.log('');
      }

      const postCommitHookPath = installClaudePostCommitHook(cwd);
      if (postCommitHookPath) {
        console.log(`  ${pc.green('✓')} Claude Code hook: ${pc.dim('.claude/hooks/')}dotctx-post-commit.sh`);
        console.log(`    Auto-pushes context after git commit.`);
        console.log('');
      }

      const sessionSyncHookPath = installClaudeSessionSyncHook(cwd);
      if (sessionSyncHookPath) {
        console.log(`  ${pc.green('✓')} Claude Code hook: ${pc.dim('.claude/hooks/')}dotctx-session-sync.sh`);
        console.log(`    Syncs current.yaml when Claude finishes responding.`);
        console.log('');
      }

      const landmineGuardHookPath = installClaudeLandmineGuardHook(cwd);
      if (landmineGuardHookPath) {
        console.log(`  ${pc.green('✓')} Claude Code hook: ${pc.dim('.claude/hooks/')}dotctx-landmine-guard.sh`);
        console.log(`    Warns about landmines before file edits.`);
        console.log('');
      }

      const rippleCheckHookPath = installClaudeRippleCheckHook(cwd);
      if (rippleCheckHookPath) {
        console.log(`  ${pc.green('✓')} Claude Code hook: ${pc.dim('.claude/hooks/')}dotctx-ripple-check.sh`);
        console.log(`    Shows ripple effects after file edits.`);
        console.log('');
      }

      // Install Cursor hook (only if .cursor/ already exists)
      if (fs.existsSync(path.join(cwd, '.cursor'))) {
        const cursorHookPath = installCursorHookDuringInit(cwd);
        if (cursorHookPath) {
          console.log(`  ${pc.green('✓')} Cursor hook: ${pc.dim('.cursor/hooks/')}dotctx-session-start.sh`);
          console.log(`    Context capsule injected at session start.`);
          console.log('');
        }
      }

      console.log(`  Next: Run ${pc.cyan('/ctx-setup')} in Claude Code, or edit ${pc.cyan('.ctx/stack.yaml')} manually.`);

      // Suggest dev dependency if package.json exists
      const pkgPath = path.join(cwd, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const devDeps = pkg.devDependencies || {};
          if (!devDeps['dotctx']) {
            console.log('');
            console.log(`  ${pc.blue('Tip:')} Add dotctx as a dev dependency for your team:`);
            console.log(`    ${pc.cyan('npm install --save-dev dotctx')}`);
          }
        } catch { /* ignore parse errors */ }
      }
    });
}
