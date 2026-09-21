/** Seeded PRNG (mulberry32) + Asia/Karachi daily key helpers. */

/** Hash string to uint32 (FNV-1a inspired mix). */
export function hashStringToUint32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32 — returns float in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calendar date YYYY-MM-DD in Asia/Karachi (UTC+5).
 * Uses explicit offset — not browser-local — for testability.
 */
export function dailyKeyKarachi(now: Date = new Date()): string {
  const utcMs = now.getTime();
  const karachiMs = utcMs + 5 * 60 * 60 * 1000;
  const d = new Date(karachiMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailySeed(dailyKey: string): number {
  return hashStringToUint32(`glowgrid-daily|${dailyKey}`);
}

export function createDailyRng(dailyKey: string): () => number {
  return mulberry32(dailySeed(dailyKey));
}

export type RngFn = () => number;

export function createEndlessRng(): RngFn {
  return () => Math.random();
}
