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
