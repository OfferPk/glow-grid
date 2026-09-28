import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clearAllPersist,
  saveDailyRecord,
  getDailyRecord,
} from '../src/game/persist';
import { homeDailyCta } from '../src/ui/homeDaily';

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
