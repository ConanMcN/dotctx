import { Command } from 'commander';
import pc from 'picocolors';
import { loadContext, findCtxDir } from '../core/loader.js';
import { NO_CTX_DIR_MSG } from '../constants.js';

export function registerWhy(program: Command): void {
  program
    .command('why <file>')
    .description('Explain why a file is the way it is — aggregates landmines, decisions, ripple map, and conventions')
    .action((file) => {
      const ctxDir = findCtxDir();
      if (!ctxDir) {
        console.log(pc.red(NO_CTX_DIR_MSG));
        process.exit(1);
      }

      const ctx = loadContext(ctxDir);
      const lower = file.toLowerCase();
      const sections: string[] = [];

      // Landmines referencing this file
      const landmines = ctx.landmines.filter(l =>
        l.file.toLowerCase().includes(lower) ||
        l.description.toLowerCase().includes(lower)
      );
      if (landmines.length) {
        sections.push(`## Landmines\n${landmines.map(l => {
          const tag = l.severity === 'critical' ? '🔴 ' : l.severity === 'info' ? 'ℹ️ ' : '';
          return `  ${tag}${l.description}${l.file ? ` (${l.file})` : ''}${l.why ? `\n    → ${l.why}` : ''}`;
        }).join('\n')}`);
      }

      // Decisions mentioning this file
      const decisions = ctx.decisions.filter(d =>
        d.decision.toLowerCase().includes(lower) ||
        d.why.toLowerCase().includes(lower) ||
        d.rejected.toLowerCase().includes(lower)
      );
      if (decisions.length) {
        sections.push(`## Decisions\n${decisions.map(d =>
          `  ${d.decision}${d.rejected ? ` (over: ${d.rejected})` : ''}\n    → ${d.why}`
        ).join('\n')}`);
      }

      // Ripple map entries
      const rippleEntries: string[] = [];
      if (ctx.architecture) {
        const lines = ctx.architecture.split('\n');
        let inRipple = false;
        for (const line of lines) {
          if (line.includes('Ripple map') || line.includes('ripple map')) { inRipple = true; continue; }
          if (inRipple && line.startsWith('#')) { inRipple = false; continue; }
          if (inRipple && line.trim() && line.toLowerCase().includes(lower)) {
            rippleEntries.push(`  ${line.trim()}`);
          }
        }
      }
      if (rippleEntries.length) {
        sections.push(`## Ripple Map\n${rippleEntries.join('\n')}`);
      }

      // Conventions mentioning this file
      const conventionLines: string[] = [];
      if (ctx.conventions) {
        for (const line of ctx.conventions.split('\n')) {
          if (line.trim() && line.toLowerCase().includes(lower) && !line.startsWith('#')) {
            conventionLines.push(`  ${line.trim()}`);
          }
        }
      }
      if (conventionLines.length) {
        sections.push(`## Conventions\n${conventionLines.join('\n')}`);
      }

      if (!sections.length) {
        console.log(pc.dim(`No context found for "${file}".`));
        return;
      }

      console.log(`\n${pc.bold(`Why: ${file}`)}\n`);
      console.log(sections.join('\n\n'));
      console.log('');
    });
}
