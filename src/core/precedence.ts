export const PRIORITY_ORDER = [
  'current',
  'landmines',
  'decisions',
  'ripple_map',
  'open_loops',
  'conventions',
  'architecture',
  'vocabulary',
  'session_log',
] as const;

export type SectionName = (typeof PRIORITY_ORDER)[number];

export function getPriority(sectionName: string): number {
  const index = PRIORITY_ORDER.indexOf(sectionName as SectionName);
  return index === -1 ? PRIORITY_ORDER.length : index;
}

export function sortByPriority<T>(items: T[], getSection: (item: T) => string): T[] {
  return [...items].sort((a, b) => getPriority(getSection(a)) - getPriority(getSection(b)));
}
