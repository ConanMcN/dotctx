import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CtxData, CtxConfig } from '../types.js';

// Mock git helpers
vi.mock('../utils/git.js', () => ({
  isGitRepo: vi.fn(() => true),
  getGitBranch: vi.fn(() => 'main'),
  getFileLastModified: vi.fn(),
  getCommitCountAfter: vi.fn(() => 0),
  getFileModifiedAfter: vi.fn(() => false),
  getGitRoot: vi.fn(() => '/fake'),
}));

// Mock fs
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readdirSync: vi.fn(() => []),
  },
}));

import { getStaleFileWarnings, getHealthSection, runAudit } from '../core/audit.js';
import * as git from '../utils/git.js';
import fs from 'node:fs';

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

describe('getStaleFileWarnings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns warnings for old files', () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(oldDate);

    const warnings = getStaleFileWarnings('/fake/.ctx', '30d');
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('stale');
    expect(warnings[0]).toContain('/ctx-refresh');
  });

  it('returns empty for fresh files', () => {
    const freshDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(freshDate);

    const warnings = getStaleFileWarnings('/fake/.ctx', '30d');
    expect(warnings).toHaveLength(0);
  });

  it('returns empty when not a git repo', () => {
    vi.mocked(git.isGitRepo).mockReturnValue(false);

    const warnings = getStaleFileWarnings('/fake/.ctx', '30d');
    expect(warnings).toHaveLength(0);
  });
});

describe('getHealthSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git.isGitRepo).mockReturnValue(true);
  });

  it('returns section when stale files exist', () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(oldDate);

    const section = getHealthSection('/fake/.ctx', DEFAULT_CONFIG);
    expect(section).toContain('Context Health');
    expect(section).toContain('stale');
  });

  it('returns empty string when all fresh', () => {
    const freshDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(freshDate);

    const section = getHealthSection('/fake/.ctx', DEFAULT_CONFIG);
    expect(section).toBe('');
  });
});

describe('runAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(git.isGitRepo).mockReturnValue(true);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
  });

  it('detects stale files', () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(oldDate);

    const result = runAudit(makeCtx(), '/fake/.ctx');
    const stale = result.fileStale.filter(f => f.isStale);
    expect(stale.length).toBeGreaterThan(0);
    expect(result.summary).toContain('stale');
  });

  it('detects entry drift for landmines', () => {
    const freshDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(freshDate);
    vi.mocked(git.getCommitCountAfter).mockReturnValue(3);

    const ctx = makeCtx({
      landmines: [
        { description: 'Test landmine', file: 'src/core/loader.ts:10', why: 'testing', date: '2025-01-01' },
      ],
    });

    const result = runAudit(ctx, '/fake/.ctx');
    expect(result.entryDrift.length).toBe(1);
    expect(result.entryDrift[0].type).toBe('landmine');
    expect(result.entryDrift[0].commitsSinceEntry).toBe(3);
  });

  it('reports clean when everything is fresh', () => {
    const freshDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(freshDate);
    vi.mocked(git.getCommitCountAfter).mockReturnValue(0);

    const result = runAudit(makeCtx(), '/fake/.ctx');
    expect(result.summary).toContain('✓');
    expect(result.summary).toContain('fresh');
  });

  it('handles non-git repos gracefully', () => {
    vi.mocked(git.isGitRepo).mockReturnValue(false);

    const result = runAudit(makeCtx(), '/fake/.ctx');
    expect(result.fileStale).toHaveLength(0);
    expect(result.entryDrift).toHaveLength(0);
  });

  it('detects ripple gaps for missing files', () => {
    const freshDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    vi.mocked(git.getFileLastModified).mockReturnValue(freshDate);
    // First call for .ctx/ files = true, then false for ripple map referenced files
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (String(p).includes('nonexistent')) return false;
      return true;
    });

    const ctx = makeCtx({
      architecture: `# Architecture\n\n## Ripple map\n- \`src/nonexistent.ts\` → \`src/other.ts\`\n\n## Dependency flow`,
    });

    const result = runAudit(ctx, '/fake/.ctx');
    const missing = result.rippleGaps.filter(g => g.reason.includes('no longer exists'));
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].file).toBe('src/nonexistent.ts');
  });
});
