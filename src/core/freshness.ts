import type { OpenLoop } from '../types.js';

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(h|d|w|m)$/);
  if (!match) return 48 * 60 * 60 * 1000; // default 48h

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 48 * 60 * 60 * 1000;
  }
}

export function isStale(updatedAt: string | Date, thresholdHours: number = 48): boolean {
  if (!updatedAt) return true;
  const updated = new Date(updatedAt);
  if (isNaN(updated.getTime())) return true;
  const now = Date.now();
  const threshold = thresholdHours * 60 * 60 * 1000;
  return now - updated.getTime() > threshold;
}

export function getExpiringLoops(loops: OpenLoop[], defaultTtl: string = '14d'): OpenLoop[] {
  const now = Date.now();
  const warningWindow = 24 * 60 * 60 * 1000; // 24h

  return loops.filter(loop => {
    if (loop.status !== 'open') return false;
    const created = new Date(loop.created_at);
    if (isNaN(created.getTime())) return false;
    const ttlMs = parseDuration(loop.ttl || defaultTtl);
    const expiresAt = created.getTime() + ttlMs;
    return expiresAt - now <= warningWindow && expiresAt > now;
  });
}

export function getExpiredLoops(loops: OpenLoop[], defaultTtl: string = '14d'): OpenLoop[] {
  const now = Date.now();

  return loops.filter(loop => {
    if (loop.status !== 'open') return false;
    const created = new Date(loop.created_at);
    if (isNaN(created.getTime())) return false;
    const ttlMs = parseDuration(loop.ttl || defaultTtl);
    return now > created.getTime() + ttlMs;
  });
}
