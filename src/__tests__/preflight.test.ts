import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CtxData, CtxConfig } from '../types.js';

// Mock git helpers
vi.mock('../utils/git.js', () => ({
  isGitRepo: vi.fn(() => false),
  getGitBranch: vi.fn(() => 'main'),
  getFileLastModified: vi.fn(),
  getCommitCountAfter: vi.fn(() => 0),
  getFileModifiedAfter: vi.fn(() => false),
  getGitRoot: vi.fn(() => '/fake'),
}));

// Mock audit stale file warnings
vi.mock('../core/audit.js', () => ({
  getStaleFileWarnings: vi.fn(() => []),
}));

import { generatePreflight } from '../core/preflight.js';
import * as git from '../utils/git.js';
import * as audit from '../core/audit.js';

const DEFAULT_CONFIG: CtxConfig = {
  version: 1,
  budget: { default: 2000, adapters: {} },
  allocation: 'priority',
  priority_order: ['current', 'landmines'],
  freshness: {
    stale_threshold: '48h',
    file_stale_threshold: '30d',
    loop_default_ttl: '14d',
    max_sessions: 5,
  },
  adapters: {},
};

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

describe('generatePreflight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git.isGitRepo).mockReturnValue(false);
  });

  it('generates header with task name', () => {
    const result = generatePreflight(makeCtx(), 'fix auth bug');
    expect(result.formatted).toContain('Preflight');
    expect(result.formatted).toContain('fix auth bug');
  });

  it('shows lightweight output when nothing matches', () => {
    const result = generatePreflight(makeCtx(), 'completely unrelated task');
    expect(result.formatted).toContain('No warnings. Proceed.');
    expect(result.landmines).toHaveLength(0);
    expect(result.decisions).toHaveLength(0);
    expect(result.rippleMap).toHaveLength(0);
    expect(result.openLoops).toHaveLength(0);
  });

  it('includes footer with pull command when matches exist', () => {
    const ctx = makeCtx({
      landmines: [
        { description: 'console.error in MCP server', file: 'src/mcp/server.ts', why: 'stdio transport', date: '2026-01-01' },
      ],
    });
    const result = generatePreflight(ctx, 'MCP server');
    expect(result.formatted).toContain('dotctx pull --task');
  });

  it('keyword-matches relevant landmines', () => {
    const ctx = makeCtx({
      landmines: [
        { description: 'console.error in MCP server', file: 'src/mcp/server.ts', why: 'stdio transport', date: '2026-01-01' },
        { description: 'Weird enum values in types', file: 'src/types.ts', why: 'Legacy compat', date: '2026-01-01' },
      ],
    });

    const result = generatePreflight(ctx, 'fix MCP server issue');
    expect(result.landmines).toHaveLength(1);
    expect(result.landmines[0].description).toContain('MCP server');
    expect(result.formatted).toContain('Landmines');
    expect(result.formatted).toContain('DO NOT change');
  });

  it('keyword-matches relevant decisions', () => {
    const ctx = makeCtx({
      decisions: [
        { decision: 'Use Zod for validation', rejected: 'io-ts', why: 'Better DX', date: '2026-01-01' },
        { decision: 'Use PostgreSQL', rejected: 'MongoDB', why: 'Relational', date: '2026-01-01' },
      ],
    });

    const result = generatePreflight(ctx, 'update validation logic');
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].decision).toContain('Zod');
    expect(result.formatted).toContain('Constraining Decisions');
  });

  it('extracts ripple map entries matching task keywords', () => {
    const ctx = makeCtx({
      architecture: `# Architecture\n\n## Ripple map\n- \`src/core/loader.ts\` → \`src/commands/*\`, \`src/mcp/tools.ts\`\n- \`src/types.ts\` → almost every file\n\n## Other`,
    });

    const result = generatePreflight(ctx, 'change the loader');
    expect(result.rippleMap.length).toBeGreaterThan(0);
    expect(result.rippleMap.some(r => r.includes('loader'))).toBe(true);
    expect(result.formatted).toContain('Ripple Map');
  });

  it('includes files_touched from current in ripple check', () => {
    const ctx = makeCtx({
      current: {
        branch: 'main',
        task: 'refactor auth',
        state: 'in-progress',
        next_step: '',
        blocked_by: '',
        files_touched: ['src/core/auth.ts', 'src/utils/tokens.ts'],
        updated_at: new Date().toISOString().split('T')[0],
      },
    });

    const result = generatePreflight(ctx, 'update auth module');
    expect(result.rippleMap.some(r => r.includes('auth'))).toBe(true);
  });

  it('matches open loops by keyword', () => {
    const ctx = makeCtx({
      openLoops: [
        { id: 1, description: 'Need to add error handling to auth flow', created_at: '2026-02-01', ttl: '14d', status: 'open', context: 'Started during login refactor' },
        { id: 2, description: 'Update database migrations', created_at: '2026-02-01', ttl: '14d', status: 'open', context: '' },
      ],
    });

    const result = generatePreflight(ctx, 'fix auth error handling');
    expect(result.openLoops).toHaveLength(1);
    expect(result.openLoops[0].description).toContain('auth');
    expect(result.formatted).toContain('Related Open Loops');
  });

  it('skips closed loops', () => {
    const ctx = makeCtx({
      openLoops: [
        { id: 1, description: 'Auth error handling', created_at: '2026-02-01', ttl: '14d', status: 'closed', context: '' },
      ],
    });

    const result = generatePreflight(ctx, 'fix auth error handling');
    expect(result.openLoops).toHaveLength(0);
  });

  describe('brief mode', () => {
    it('omits decisions, ripple map, and open loops', () => {
      const ctx = makeCtx({
        landmines: [
          { description: 'console.error in serve command', file: 'src/commands/serve.ts', why: 'MCP stdio', date: '2026-01-01' },
        ],
        decisions: [
          { decision: 'ESM-only for serve', rejected: 'CJS', why: 'Modern Node', date: '2026-01-01' },
        ],
        openLoops: [
          { id: 1, description: 'Serve command needs refactoring', created_at: '2026-02-01', ttl: '14d', status: 'open', context: '' },
        ],
        architecture: `## Ripple map\n- \`src/commands/serve.ts\` → nothing\n\n## Other`,
      });

      const result = generatePreflight(ctx, 'update serve command', { brief: true });
      expect(result.formatted).toContain('Landmines');
      expect(result.formatted).not.toContain('Constraining Decisions');
      expect(result.formatted).not.toContain('Ripple Map');
      expect(result.formatted).not.toContain('Related Open Loops');
    });

    it('still includes health warnings in brief mode', () => {
      vi.mocked(audit.getStaleFileWarnings).mockReturnValue(['📁 1 .ctx/ file stale']);

      const result = generatePreflight(makeCtx(), 'some question', { brief: true, ctxDir: '/fake/.ctx' });
      expect(result.formatted).toContain('Context Health');
    });
  });

  describe('health warnings', () => {
    it('warns on stale current context', () => {
      const staleDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const ctx = makeCtx({
        current: {
          branch: 'main', task: 'old task', state: 'in-progress',
          next_step: '', blocked_by: '', files_touched: [],
          updated_at: staleDate,
        },
      });

      const result = generatePreflight(ctx, 'new task');
      expect(result.formatted).toContain('Context Health');
      expect(result.formatted).toContain('stale');
    });

    it('warns on branch mismatch', () => {
      vi.mocked(git.isGitRepo).mockReturnValue(true);
      vi.mocked(git.getGitBranch).mockReturnValue('feature/new');

      const ctx = makeCtx({
        current: {
          branch: 'main', task: 'task', state: 'in-progress',
          next_step: '', blocked_by: '', files_touched: [],
          updated_at: new Date().toISOString().split('T')[0],
        },
      });

      const result = generatePreflight(ctx, 'some task');
      expect(result.formatted).toContain('Branch mismatch');
      expect(result.formatted).toContain('feature/new');
    });

    it('warns on expired loops', () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const ctx = makeCtx({
        openLoops: [
          { id: 1, description: 'Old loop', created_at: oldDate, ttl: '14d', status: 'open', context: '' },
        ],
      });

      const result = generatePreflight(ctx, 'unrelated');
      expect(result.formatted).toContain('expired');
    });

    it('includes stale file warnings when ctxDir provided', () => {
      vi.mocked(audit.getStaleFileWarnings).mockReturnValue([
        '📁 2 .ctx/ files are stale. Run `/ctx-refresh` to review.',
      ]);

      const result = generatePreflight(makeCtx(), 'some task', { ctxDir: '/fake/.ctx' });
      expect(result.formatted).toContain('Context Health');
      expect(result.formatted).toContain('stale');
    });
  });

  it('accepts ctxDir as string for backwards compatibility', () => {
    const result = generatePreflight(makeCtx(), 'task', '/fake/.ctx');
    expect(result.formatted).toContain('Preflight Checklist');
  });
});
