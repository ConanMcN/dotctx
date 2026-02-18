import { describe, it, expect } from 'vitest';
import { countTokens, fitToBudget } from '../utils/tokens.js';

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0);
  });

  it('counts tokens as words * 1.3 (rounded up)', () => {
    expect(countTokens('hello world')).toBe(3); // 2 * 1.3 = 2.6 → 3
  });

  it('handles multi-word text', () => {
    expect(countTokens('the quick brown fox jumps')).toBe(7); // 5 * 1.3 = 6.5 → 7
  });

  it('ignores extra whitespace', () => {
    expect(countTokens('  hello   world  ')).toBe(3);
  });
});

describe('fitToBudget', () => {
  it('returns full text if within budget', () => {
    const result = fitToBudget('hello world', 100);
    expect(result.text).toBe('hello world');
    expect(result.truncated).toBe(false);
  });

  it('truncates text exceeding budget', () => {
    const longText = Array(100).fill('word').join(' ');
    const result = fitToBudget(longText, 10);
    expect(result.truncated).toBe(true);
    expect(result.text).toContain('[...truncated to fit budget]');
    expect(countTokens(result.text)).toBeLessThanOrEqual(15); // some tolerance for the truncation message
  });
});
