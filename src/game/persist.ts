/** localStorage persistence — keys glowgrid:v1:* */

const PREFIX = 'glowgrid:v1:';

export type Settings = { muted: boolean };
export type DailyRecord = { score: number; finished: boolean };

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* ignore quota */
  }
}

export function getBestScore(): number {
  const v = readRaw('bestScore');
  const n = v == null ? 0 : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function setBestScore(score: number): void {
  const prev = getBestScore();
  if (score > prev) writeRaw('bestScore', String(score));
}

export function getGamesPlayed(): number {
  const v = readRaw('gamesPlayed');
  const n = v == null ? 0 : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function incrementGamesPlayed(): number {
  const n = getGamesPlayed() + 1;
  writeRaw('gamesPlayed', String(n));
  return n;
}

export function getSettings(): Settings {
  const raw = readRaw('settings');
  if (!raw) return { muted: false };
  try {
    const parsed = JSON.parse(raw) as Settings;
    return { muted: Boolean(parsed.muted) };
  } catch {
    return { muted: false };
  }
}

export function setSettings(settings: Settings): void {
  writeRaw('settings', JSON.stringify(settings));
}

export function getDailyRecord(dailyKey: string): DailyRecord | null {
  const raw = readRaw(`daily:${dailyKey}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyRecord;
  } catch {
    return null;
  }
}

/** Store best score for the day; allow retries but keep best. */
export function saveDailyRecord(dailyKey: string, score: number, finished: boolean): void {
  const prev = getDailyRecord(dailyKey);
  const best = prev ? Math.max(prev.score, score) : score;
  writeRaw(`daily:${dailyKey}`, JSON.stringify({ score: best, finished: finished || Boolean(prev?.finished) }));
}

export function isOnboarded(): boolean {
  return readRaw('onboarded') === 'true';
}

export function setOnboarded(value = true): void {
  writeRaw('onboarded', value ? 'true' : 'false');
}

export type Streak = {
  count: number;
  lastCompletedKey: string;
};

/**
 * Shift a YYYY-MM-DD civil date by deltaDays (calendar days).
 * Daily keys are Asia/Karachi calendar dates — treat as civil, not UTC instants.
 */
export function shiftDailyKey(key: string, deltaDays: number): string {
  const parts = key.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getStreak(): Streak {
  const raw = readRaw('streak');
  if (!raw) return { count: 0, lastCompletedKey: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<Streak>;
    const count = Number(parsed.count);
    const lastCompletedKey =
      typeof parsed.lastCompletedKey === 'string' ? parsed.lastCompletedKey : '';
    return {
      count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
      lastCompletedKey,
    };
  } catch {
    return { count: 0, lastCompletedKey: '' };
  }
}

function writeStreak(streak: Streak): void {
  writeRaw('streak', JSON.stringify(streak));
}

/**
 * On daily finished: if yesterday (PKT calendar) was the last completed day → streak+1,
 * else reset to 1. Same-day re-complete is idempotent (does not bump again).
 * Missing a day breaks streak only on the next complete — not on app open.
 */
export function recordDailyComplete(dailyKey: string): Streak {
  const prev = getStreak();
  if (prev.lastCompletedKey === dailyKey && prev.count >= 1) {
    return prev;
  }
  const yesterday = shiftDailyKey(dailyKey, -1);
  const next: Streak =
    prev.lastCompletedKey === yesterday && prev.count >= 1
      ? { count: prev.count + 1, lastCompletedKey: dailyKey }
      : { count: 1, lastCompletedKey: dailyKey };
  writeStreak(next);
  return next;
}

/** Test helper — clear all glowgrid keys. */
export function clearAllPersist(): void {
  if (!canUseStorage()) return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
}
