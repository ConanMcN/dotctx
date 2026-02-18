export { countTokens, fitToBudget } from '../utils/tokens.js';

export function allocateBudget(
  totalBudget: number,
  sections: { name: string; content: string; tokens: number; priority: number }[]
): Map<string, number> {
  const sorted = [...sections].sort((a, b) => a.priority - b.priority);
  const allocation = new Map<string, number>();
  let remaining = totalBudget;

  for (const section of sorted) {
    // High-priority sections (priority 0-1): uncapped, get what they need
    if (section.priority <= 1) {
      const alloc = Math.min(section.tokens, remaining);
      allocation.set(section.name, alloc);
      remaining -= alloc;
      continue;
    }

    // Cap-based allocation for medium priority
    const capPercent = section.priority <= 3 ? 0.3 : section.priority <= 5 ? 0.2 : 0.15;
    const cap = Math.floor(remaining * capPercent);
    const alloc = Math.min(section.tokens, cap, remaining);
    allocation.set(section.name, alloc);
    remaining -= alloc;
  }

  return allocation;
}
