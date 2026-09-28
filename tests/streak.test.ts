import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearAllPersist,
  getStreak,
  recordDailyComplete,
  shiftDailyKey,
} from '../src/game/persist';
import { dailyKeyKarachi } from '../src/game/rng';

/** Minimal localStorage for node vitest env. */
function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('shiftDailyKey', () => {
  it('shifts civil YYYY-MM-DD by calendar days', () => {
    expect(shiftDailyKey('2026-09-28', -1)).toBe('2026-09-27');
    expect(shiftDailyKey('2026-09-28', 1)).toBe('2026-09-29');
    expect(shiftDailyKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDailyKey('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('daily streak (PKT)', () => {
  beforeEach(() => {
    installMemoryStorage();
    clearAllPersist();
  });

  afterEach(() => {
    clearAllPersist();
  });

  it('starts at 1 on first complete', () => {
    const s = recordDailyComplete('2026-09-28');
    expect(s).toEqual({ count: 1, lastCompletedKey: '2026-09-28' });
    expect(getStreak()).toEqual(s);
  });

  it('increments on consecutive PKT days', () => {
    recordDailyComplete('2026-09-26');
    expect(recordDailyComplete('2026-09-27').count).toBe(2);
    expect(recordDailyComplete('2026-09-28').count).toBe(3);
    expect(getStreak()).toEqual({ count: 3, lastCompletedKey: '2026-09-28' });
  });

  it('resets to 1 after a skipped day', () => {
    recordDailyComplete('2026-09-26');
    recordDailyComplete('2026-09-27');
    // skip 2026-09-28
    const s = recordDailyComplete('2026-09-29');
    expect(s).toEqual({ count: 1, lastCompletedKey: '2026-09-29' });
  });

  it('same-day re-complete is idempotent (no double bump)', () => {
    recordDailyComplete('2026-09-28');
    expect(recordDailyComplete('2026-09-28')).toEqual({
      count: 1,
      lastCompletedKey: '2026-09-28',
    });
    recordDailyComplete('2026-09-29');
    expect(recordDailyComplete('2026-09-29').count).toBe(2);
  });

  it('does not decay streak merely from reading (break only on next complete)', () => {
    recordDailyComplete('2026-09-26');
    // "open app" days later — getStreak unchanged
    expect(getStreak().count).toBe(1);
    expect(getStreak().lastCompletedKey).toBe('2026-09-26');
  });

  it('PKT key boundaries: consecutive across UTC midnight that is still same/next PKT day', () => {
    // 2026-09-27 22:00 UTC = 2026-09-28 03:00 PKT
    const k1 = dailyKeyKarachi(new Date('2026-09-27T22:00:00Z'));
    expect(k1).toBe('2026-09-28');
    const k0 = shiftDailyKey(k1, -1);
    expect(k0).toBe('2026-09-27');
    recordDailyComplete(k0);
    // 2026-09-28 20:00 UTC = 2026-09-29 01:00 PKT
    const k2 = dailyKeyKarachi(new Date('2026-09-28T20:00:00Z'));
    expect(k2).toBe('2026-09-29');
    expect(recordDailyComplete(k1).count).toBe(2);
    expect(recordDailyComplete(k2).count).toBe(3);
  });
});
