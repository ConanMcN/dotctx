import { describe, it, expect } from 'vitest';
import { generateCapsule } from '../core/capsule.js';
import type { CtxData } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';
import { countTokens } from '../utils/tokens.js';

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

describe('generateCapsule', () => {
  it('generates markdown with task header', () => {
    const capsule = generateCapsule(makeCtx(), 'fix auth bug', 2000);
    expect(capsule.markdown).toContain('# Context Capsule');
    expect(capsule.markdown).toContain('fix auth bug');
  });

  it('keyword-matches relevant decisions', () => {
    const capsule = generateCapsule(
      makeCtx({
        decisions: [
          { decision: 'Use JWT for authentication', rejected: 'sessions', why: 'Stateless', date: '2026-01-01' },
          { decision: 'Use PostgreSQL', rejected: 'MongoDB', why: 'Relational data', date: '2026-01-01' },
        ],
      }),
      'fix authentication bug',
      2000,
    );

    expect(capsule.markdown).toContain('Use JWT for authentication');
  });

  it('includes all landmines even when no keyword match', () => {
    const capsule = generateCapsule(
      makeCtx({
        landmines: [
          { description: 'Weird enum values', file: 'src/types.ts', why: 'Legacy', date: '' },
        ],
      }),
      'unrelated task',
      2000,
    );

    expect(capsule.markdown).toContain('Weird enum values');
  });

  it('generates resume text', () => {
    const capsule = generateCapsule(
      makeCtx({
        current: {
          branch: 'feat/auth',
          task: 'Fix login',
          state: 'in-progress',
          next_step: 'Add tests',
          blocked_by: '',
          files_touched: [],
          updated_at: '',
        },
      }),
      'fix login',
      2000,
    );

    expect(capsule.resume).toBeTruthy();
    expect(capsule.resume.length).toBeGreaterThan(0);
  });

  it('respects budget', () => {
    const capsule = generateCapsule(
      makeCtx({
        conventions: Array(200).fill('Follow standard patterns for all modules.').join('\n'),
        decisions: Array(20).fill(null).map((_, i) => ({
          decision: `Decision ${i}`,
          rejected: `Alternative ${i}`,
          why: `Reason ${i} with extra detail`,
          date: '2026-01-01',
        })),
      }),
      'general task',
      100,
    );

    expect(capsule.tokens).toBeLessThanOrEqual(110); // small tolerance
  });

  it('tags sections with [A] or [D]', () => {
    const capsule = generateCapsule(
      makeCtx({
        landmines: [{ description: 'Test', file: '', why: '', date: '' }],
        sessions: [{
          id: '1', date: '2026-02-18', summary: 'Did stuff',
          state: '', next_step: '', files_touched: [],
          landmines_added: [], loops_added: [],
        }],
      }),
      'test',
      2000,
    );

    expect(capsule.markdown).toContain('[A]');
    expect(capsule.markdown).toContain('[D]');
  });
});
