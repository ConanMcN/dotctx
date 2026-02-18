import { compileForClaude } from './claude.js';
import { compileForCursor } from './cursor.js';
import { compileForCopilot } from './copilot.js';
import { compileForSystem } from './system.js';
import type { Adapter, CtxData } from '../../types.js';

const adapters: Record<string, Adapter> = {
  claude: {
    name: 'claude',
    compile: compileForClaude,
    outputPath: 'CLAUDE.md',
  },
  cursor: {
    name: 'cursor',
    compile: compileForCursor,
    outputPath: '.cursorrules',
  },
  copilot: {
    name: 'copilot',
    compile: compileForCopilot,
    outputPath: '.github/copilot-instructions.md',
  },
  system: {
    name: 'system',
    compile: compileForSystem,
    outputPath: '',
  },
};

export function getAdapter(target: string): Adapter | undefined {
  return adapters[target];
}

export function getAllAdapters(): Adapter[] {
  return Object.values(adapters);
}

export function getAdapterNames(): string[] {
  return Object.keys(adapters);
}
