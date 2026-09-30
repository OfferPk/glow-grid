import { describe, expect, it, vi } from 'vitest';
import { createGame, type Engine, type GameState } from '../src/game/engine.ts';
import { GRID_SIZE, PIECE_DEFS } from '../src/game/pieces.ts';
import { getGamesPlayed } from '../src/game/persist.ts';
import { mulberry32 } from '../src/game/rng.ts';
import { fillGameOver } from '../src/ui/overlays.ts';

function installSyntheticStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
  });
  return store;
}

function finishSyntheticRun(engine: Engine): GameState {
  for (let move = 0; move < 2_000; move++) {
    const state = engine.getState();
    if (state.status === 'gameover') return state;

    let placed = false;
    for (let trayIndex = 0; trayIndex < 3 && !placed; trayIndex++) {
      if (!engine.getState().tray[trayIndex]) continue;
      for (let rotation = 0; rotation < 4 && !placed; rotation++) {
        engine.setTrayRotation(trayIndex, rotation as 0 | 1 | 2 | 3);
        for (let row = 0; row < GRID_SIZE && !placed; row++) {
          for (let col = 0; col < GRID_SIZE && !placed; col++) {
            const result = engine.place(trayIndex, row, col);
            placed = result.ok;
          }
        }
      }
    }
    if (!placed) {
      const finalState = engine.getState();
      if (finalState.status === 'gameover') return finalState;
      throw new Error('Synthetic placement scan found no move before game-over');
    }
  }
  throw new Error('Synthetic run did not reach game-over within 2,000 placements');
}

function makeOverlay(): { element: HTMLElement; badge: { textContent: string; hidden: boolean } } {
  const fields = new Map<string, { textContent: string; hidden: boolean }>([
    ['[data-go-score]', { textContent: '', hidden: false }],
    ['[data-go-best]', { textContent: '', hidden: false }],
    ['[data-go-peak]', { textContent: '', hidden: false }],
    ['[data-go-newbest]', { textContent: '', hidden: true }],
  ]);
  return {
    element: {
      querySelector: (selector: string) => fields.get(selector) ?? null,
    } as unknown as HTMLElement,
    badge: fields.get('[data-go-newbest]')!,
  };
}

describe('synthetic Endless game-over → Retry audit', () => {
  it('starts fresh unseeded Endless draws after Retry without storing a seed', () => {
    const store = installSyntheticStorage();
    const draws = [0, 0, 0, 0.999, 0.999, 0.999];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => draws.shift() ?? 0);
    try {
      const engine = createGame({ mode: 'endless', skipPersist: true });
      const firstSequence = engine.getPieceSequence();
      expect(firstSequence).toEqual(Array(3).fill(PIECE_DEFS[0]!.id));

      const retry = engine.restart();
      expect(retry.status).toBe('playing');
      expect(engine.getPieceSequence()).toEqual(
        Array(3).fill(PIECE_DEFS[PIECE_DEFS.length - 1]!.id),
      );
      expect(engine.getPieceSequence()).not.toEqual(firstSequence);
      expect([...store.keys()].some((key) => key.toLowerCase().includes('seed'))).toBe(false);
    } finally {
      random.mockRestore();
    }
  });

  it('preserves the best and game count on Retry, and does not label a tied best as new', () => {
    const store = installSyntheticStorage();
    const seed = 0x13579bdf;
    const first = createGame({ mode: 'endless', rng: mulberry32(seed) });
    const firstEnd = finishSyntheticRun(first);
    expect(firstEnd.status).toBe('gameover');
    expect(firstEnd.score).toBeGreaterThan(0);
    expect(firstEnd.newBest).toBe(true);
    expect(store.get('glowgrid:v1:bestScore')).toBe(String(firstEnd.score));
    expect(getGamesPlayed()).toBe(1);

    const newRecordOverlay = makeOverlay();
    fillGameOver(newRecordOverlay.element, firstEnd);
    expect(newRecordOverlay.badge.hidden).toBe(false);

    const retry = first.restart();
    expect(retry.status).toBe('playing');
    expect(retry.score).toBe(0);
    expect(retry.bestScore).toBe(firstEnd.score);
    expect(retry.newBest).toBe(false);
    expect(retry.grid.every((row) => row.every((cell) => cell == null))).toBe(true);
    expect(getGamesPlayed()).toBe(1);

    // A fresh synthetic run with the same deterministic pieces ties the existing record.
    const tiedRun = createGame({ mode: 'endless', rng: mulberry32(seed) });
    const tiedEnd = finishSyntheticRun(tiedRun);
    expect(tiedEnd.score).toBe(firstEnd.score);
    expect(tiedEnd.bestScore).toBe(firstEnd.score);
    expect(store.get('glowgrid:v1:bestScore')).toBe(String(firstEnd.score));
    expect(getGamesPlayed()).toBe(2);

    const overlay = makeOverlay();
    fillGameOver(overlay.element, tiedEnd);
    expect(overlay.badge.hidden).toBe(true);
  });
});
