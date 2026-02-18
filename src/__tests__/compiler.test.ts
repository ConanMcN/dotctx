import { describe, it, expect } from 'vitest';
import { compile } from '../core/compiler.js';
import type { CtxData } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';

function makeCtx(overrides: Partial<CtxData> = {}): CtxData {
  return {
    stack: null,
    current: null,
    openLoops: [],
    architecture: '',
    conventions: '',
    decisions: [],
    landmines: [],
    vocabulary: [],
    sessions: [],
    config: DEFAULT_CONFIG,
    ...overrides,
  };
}

describe('compile', () => {
  it('returns empty sections for empty context', () => {
    const result = compile(makeCtx(), 2000);
    expect(result.sections).toHaveLength(0);
    expect(result.totalTokens).toBe(0);
    expect(result.budget).toBe(2000);
  });

  it('includes landmines with high priority', () => {
    const result = compile(makeCtx({
      landmines: [
        { description: 'Do not change this', file: 'src/foo.ts', why: 'Legacy API', date: '2026-01-01' },
      ],
    }), 2000);

    const landmineSection = result.sections.find(s => s.name === 'landmines');
    expect(landmineSection).toBeDefined();
    expect(landmineSection!.content).toContain('Do not change this');
  });

  it('includes current state before other sections', () => {
    const result = compile(makeCtx({
      current: {
        branch: 'feat/auth',
        task: 'Fix login bug',
        state: 'in-progress',
        next_step: 'Add tests',
        blocked_by: '',
        files_touched: ['src/auth.ts'],
        updated_at: '2026-02-18',
      },
      decisions: [
        { decision: 'Use JWT', rejected: 'sessions', why: 'Stateless', date: '2026-01-01' },
      ],
    }), 2000);

    expect(result.sections[0].name).toBe('current');
    expect(result.sections[0].content).toContain('Fix login bug');
  });

  it('respects token budget', () => {
    const longConventions = Array(500).fill('Follow the standard patterns for code organization.').join('\n');
    const result = compile(makeCtx({
      conventions: longConventions,
      landmines: [
        { description: 'Important', file: '', why: '', date: '' },
      ],
    }), 50);

    expect(result.totalTokens).toBeLessThanOrEqual(55); // small tolerance
  });

  it('does not truncate high-priority sections unnecessarily', () => {
    const result = compile(makeCtx({
      landmines: [
        { description: 'Mine 1', file: '', why: 'Reason 1', date: '' },
        { description: 'Mine 2', file: '', why: 'Reason 2', date: '' },
      ],
    }), 2000);

    const section = result.sections.find(s => s.name === 'landmines');
    expect(section?.truncated).toBe(false);
  });
});
