import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearAllPersist,
  saveDailyRecord,
  getDailyRecord,
} from '../src/game/persist';
import { dailyKeyKarachi } from '../src/game/rng';
import {
  homeDailyCta,
  millisecondsUntilNextKarachiMidnight,
} from '../src/ui/homeDaily';

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

describe('home daily CTA after complete', () => {
  beforeEach(() => {
    installMemoryStorage();
    clearAllPersist();
  });

  afterEach(() => {
    clearAllPersist();
  });

  it('incomplete: Daily Challenge + Daily # key (PKT) + daily action', () => {
    const cta = homeDailyCta('2026-09-28', false);
    expect(cta.label).toBe('Daily Challenge');
    expect(cta.meta).toBe('Daily # 2026-09-28 (PKT)');
    expect(cta.action).toBe('daily');
  });

  it('finished: Daily ✓ · Play endless + midnight teaser + endless action', () => {
    const cta = homeDailyCta('2026-09-28', true);
    expect(cta.label).toBe('Daily ✓ · Play endless');
    expect(cta.meta).toBe('Next daily after midnight PKT');
    expect(cta.action).toBe('endless');
  });

  it('offers the new Daily after the previous PKT day was completed', () => {
    saveDailyRecord('2026-09-30', 300, true);
    const currentKey = dailyKeyKarachi(new Date('2026-09-30T19:01:00.000Z'));
    expect(currentKey).toBe('2026-10-01');
    expect(getDailyRecord(currentKey)).toBeNull();

    const cta = homeDailyCta(currentKey, Boolean(getDailyRecord(currentKey)?.finished));
    expect(cta.label).toBe('Daily Challenge');
    expect(cta.meta).toBe('Daily # 2026-10-01 (PKT)');
    expect(cta.action).toBe('daily');
  });

  it('schedules the Home refresh at the next Karachi midnight', () => {
    expect(
      millisecondsUntilNextKarachiMidnight(new Date('2026-09-30T18:59:00.000Z')),
    ).toBe(60_000);
    expect(
      millisecondsUntilNextKarachiMidnight(new Date('2026-09-30T19:00:00.000Z')),
    ).toBe(24 * 60 * 60 * 1000);
  });

  it('refreshHome case: finished from persist drives completed CTA', () => {
    const key = '2026-09-28';
    expect(getDailyRecord(key)).toBeNull();
    expect(homeDailyCta(key, Boolean(getDailyRecord(key)?.finished)).label).toBe(
      'Daily Challenge',
    );

    saveDailyRecord(key, 120, true);
    const rec = getDailyRecord(key);
    expect(rec?.finished).toBe(true);
    const cta = homeDailyCta(key, Boolean(rec?.finished));
    expect(cta.label).toBe('Daily ✓ · Play endless');
    expect(cta.meta).toBe('Next daily after midnight PKT');
    expect(cta.action).toBe('endless');
  });
});
