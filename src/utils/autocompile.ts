import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadContext } from '../core/loader.js';
import { getAllAdapters } from '../core/adapters/index.js';

export function autoCompile(ctxDir: string, opts?: { silent?: boolean }): void {
  const ctx = loadContext(ctxDir);
  const projectDir = path.dirname(ctxDir);
  const adapters = getAllAdapters().filter(a => a.outputPath);
  const compiled: string[] = [];

  for (const adapter of adapters) {
    const output = adapter.compile(ctx);
    const outputPath = path.join(projectDir, adapter.outputPath);
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, output, 'utf-8');
    compiled.push(adapter.outputPath);
  }

  if (!opts?.silent && compiled.length) {
    console.log(pc.green(`✓ Recompiled: ${compiled.join(', ')}`));
  }
}
