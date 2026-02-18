import { describe, it, expect } from 'vitest';
import { getPriority, sortByPriority, PRIORITY_ORDER } from '../core/precedence.js';

describe('precedence', () => {
  it('current has highest priority (0)', () => {
    expect(getPriority('current')).toBe(0);
  });

  it('landmines have second highest priority (1)', () => {
    expect(getPriority('landmines')).toBe(1);
  });

  it('unknown sections have lowest priority', () => {
    expect(getPriority('unknown')).toBe(PRIORITY_ORDER.length);
  });

  it('sorts items by priority', () => {
    const items = [
      { name: 'conventions', value: 1 },
      { name: 'current', value: 2 },
      { name: 'landmines', value: 3 },
    ];

    const sorted = sortByPriority(items, i => i.name);
    expect(sorted[0].name).toBe('current');
    expect(sorted[1].name).toBe('landmines');
    expect(sorted[2].name).toBe('conventions');
  });
});
