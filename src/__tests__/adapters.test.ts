import { describe, it, expect } from 'vitest';
import { compileForClaude } from '../core/adapters/claude.js';
import { compileForCursor } from '../core/adapters/cursor.js';
import { compileForCopilot } from '../core/adapters/copilot.js';
import { compileForSystem } from '../core/adapters/system.js';
import { getAdapter, getAllAdapters, getAdapterNames } from '../core/adapters/index.js';
import type { CtxData } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

function makeCtx(overrides: Partial<CtxData> = {}): CtxData {
  return {
    stack: null,
    current: null,
    openLoops: [],
    architecture: '',
    conventions: '',
    decisions: [
      { decision: 'Use TypeScript', rejected: 'JavaScript', why: 'Type safety', date: '2026-01-01' },
    ],
    landmines: [
      { description: 'Legacy format', file: 'src/data.ts', why: 'API compat', date: '2026-01-01' },
    ],
    vocabulary: [],
    sessions: [],
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

describe('Claude adapter', () => {
  it('produces markdown with project context heading', () => {
    const output = compileForClaude(makeCtx());
    expect(output).toContain('# Project Context');
  });

  it('includes bootstrap instruction', () => {
    const output = compileForClaude(makeCtx());
    expect(output).toContain('dotctx preflight');
    expect(output).toContain('.ctx/');
  });

  it('includes landmines and decisions', () => {
    const output = compileForClaude(makeCtx());
    expect(output).toContain('Legacy format');
    expect(output).toContain('Use TypeScript');
  });
});

describe('Cursor adapter', () => {
  it('produces output with sections', () => {
    const output = compileForCursor(makeCtx());
    expect(output).toContain('Landmines');
    expect(output).toContain('Decisions');
  });

  it('includes bootstrap', () => {
    const output = compileForCursor(makeCtx());
    expect(output).toContain('dotctx preflight');
  });
});

describe('Copilot adapter', () => {
  it('produces output with guidelines heading', () => {
    const output = compileForCopilot(makeCtx());
    expect(output).toContain('# Project Guidelines');
  });
});

describe('System adapter', () => {
  it('produces plain-text output', () => {
    const output = compileForSystem(makeCtx());
    expect(output).toContain('=== PROJECT CONTEXT ===');
    expect(output).toContain('LANDMINES');
  });
});

describe('Adapter registry', () => {
  it('returns claude adapter', () => {
    const adapter = getAdapter('claude');
    expect(adapter).toBeDefined();
    expect(adapter!.name).toBe('claude');
    expect(adapter!.outputPath).toBe('CLAUDE.md');
  });

  it('returns undefined for unknown adapter', () => {
    expect(getAdapter('unknown')).toBeUndefined();
  });

  it('lists all adapters', () => {
    expect(getAllAdapters().length).toBe(4);
  });

  it('lists adapter names', () => {
    const names = getAdapterNames();
    expect(names).toContain('claude');
    expect(names).toContain('cursor');
    expect(names).toContain('copilot');
    expect(names).toContain('system');
  });
});
