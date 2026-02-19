import { Command } from 'commander';
import path from 'node:path';
import { loadContext, findCtxDir } from '../core/loader.js';
import { getGitRoot } from '../utils/git.js';

function normalizePath(filePath: string): string {
  // Strip leading ./ and make relative
  let normalized = filePath.replace(/^\.\//, '');
  // If absolute, make relative to git root or cwd
  if (path.isAbsolute(normalized)) {
    const root = getGitRoot() || process.cwd();
    normalized = path.relative(root, normalized);
  }
  return normalized;
}

export function registerCheck(program: Command): void {
  program
    .command('check <file>')
    .description('Check a file for landmines and ripple effects')
    .option('--landmines', 'Only show landmine warnings')
    .option('--ripple', 'Only show ripple map entries')
    .action((file, opts) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        // Silent exit — hooks should not error
        return;
      }

      const ctx = loadContext(ctxDir);
      const normalized = normalizePath(file);
      const lines: string[] = [];

      // Landmine matching
      if (!opts.ripple) {
        for (const l of ctx.landmines) {
          const landmineFile = l.file.replace(/:\d+$/, '').replace(/^\.\//, '');
          if (!landmineFile) continue;
          if (normalized === landmineFile || normalized.includes(landmineFile) || landmineFile.includes(normalized)) {
            lines.push(`⚠️ LANDMINE: ${l.description}${l.file ? ` (${l.file})` : ''}${l.why ? ` — ${l.why}` : ''}`);
          }
        }
      }

      // Ripple map matching
      if (!opts.landmines && ctx.architecture) {
        const archLines = ctx.architecture.split('\n');
        let inRipple = false;
        for (const line of archLines) {
          if (line.includes('Ripple map') || line.includes('ripple map')) {
            inRipple = true;
            continue;
          }
          if (inRipple && line.startsWith('#')) {
            inRipple = false;
            continue;
          }
          if (inRipple && line.trim()) {
            // Extract the source file from backticks: `src/foo.ts` → ...
            const backtickMatch = line.match(/`([^`]+)`/);
            const sourceFile = backtickMatch ? backtickMatch[1].replace(/^\.\//, '') : '';
            if (sourceFile && (normalized === sourceFile || normalized.includes(sourceFile) || sourceFile.includes(normalized))) {
              lines.push(`📍 RIPPLE: ${line.trim().replace(/^[-*]\s*/, '')}`);
            }
          }
        }
      }

      if (lines.length) {
        console.log(lines.join('\n'));
      }
    });
}
