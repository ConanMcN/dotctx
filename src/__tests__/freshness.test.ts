import { describe, it, expect } from 'vitest';
import { parseDuration, isStale, getExpiredLoops, getExpiringLoops } from '../core/freshness.js';
import type { OpenLoop } from '../types.js';

describe('parseDuration', () => {
  it('parses hours', () => {
    expect(parseDuration('48h')).toBe(48 * 60 * 60 * 1000);
  });

  it('parses days', () => {
    expect(parseDuration('14d')).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('parses weeks', () => {
    expect(parseDuration('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
  });

  it('returns default for invalid input', () => {
    expect(parseDuration('invalid')).toBe(48 * 60 * 60 * 1000);
  });
});

describe('isStale', () => {
  it('returns true for empty date', () => {
    expect(isStale('', 48)).toBe(true);
  });

  it('returns false for recent date', () => {
    const recent = new Date(Date.now() - 1000).toISOString();
    expect(isStale(recent, 48)).toBe(false);
  });

  it('returns true for old date', () => {
    const old = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(isStale(old, 48)).toBe(true);
  });
});

describe('getExpiredLoops', () => {
  it('returns loops past their TTL', () => {
    const loops: OpenLoop[] = [
      {
        id: 1,
        description: 'expired loop',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ttl: '14d',
        status: 'open',
        context: '',
      },
      {
        id: 2,
        description: 'fresh loop',
        created_at: new Date().toISOString(),
        ttl: '14d',
        status: 'open',
        context: '',
      },
    ];

    const expired = getExpiredLoops(loops, '14d');
    expect(expired).toHaveLength(1);
    expect(expired[0].id).toBe(1);
  });

  it('ignores resolved loops', () => {
    const loops: OpenLoop[] = [
      {
        id: 1,
        description: 'resolved expired loop',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ttl: '14d',
        status: 'resolved',
        context: '',
      },
    ];

    expect(getExpiredLoops(loops, '14d')).toHaveLength(0);
  });
});

describe('getExpiringLoops', () => {
  it('returns loops expiring within 24h', () => {
    // Create a loop that was created 13 days and 12 hours ago (expires in 12h with 14d TTL)
    const loops: OpenLoop[] = [
      {
        id: 1,
        description: 'expiring soon',
        created_at: new Date(Date.now() - (13.5 * 24 * 60 * 60 * 1000)).toISOString(),
        ttl: '14d',
        status: 'open',
        context: '',
      },
    ];

    const expiring = getExpiringLoops(loops, '14d');
    expect(expiring).toHaveLength(1);
  });
});
