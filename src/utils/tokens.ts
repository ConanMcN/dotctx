const TOKENS_PER_WORD = 1.3;

export function countTokens(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * TOKENS_PER_WORD);
}

export function fitToBudget(text: string, budget: number): { text: string; truncated: boolean } {
  const tokens = countTokens(text);
  if (tokens <= budget) return { text, truncated: false };

  const words = text.split(/\s+/).filter(Boolean);
  const targetWords = Math.floor(budget / TOKENS_PER_WORD);
  const truncated = words.slice(0, targetWords).join(' ');
  return { text: truncated + '\n\n[...truncated to fit budget]', truncated: true };
}
