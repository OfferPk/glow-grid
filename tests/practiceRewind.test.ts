import { beforeEach, describe, expect, it } from 'vitest';
import { createGame } from '../src/game/engine.ts';
import { GRID_SIZE } from '../src/game/pieces.ts';
import { mulberry32 } from '../src/game/rng.ts';

function installStorage(store: Map<string, string>): void {
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
}

function placeFirstAvailable(engine: ReturnType<typeof createGame>, row: number, col: number): void {
  const state = engine.getState();
  const trayIndex = state.tray.findIndex((slot) => slot !== null);
  if (trayIndex < 0) throw new Error('Expected a non-empty tray slot');
  const result = engine.place(trayIndex, row, col);
  if (!result.ok) throw new Error(`Expected a legal placement at ${row},${col}`);
}

function playGreedyUntilGameOver(engine: ReturnType<typeof createGame>): void {
  for (let turn = 0; turn < 100 && engine.getState().status === 'playing'; turn += 1) {
    const state = engine.getState();
    let placed = false;
    for (let trayIndex = 0; trayIndex < state.tray.length && !placed; trayIndex += 1) {
      if (!state.tray[trayIndex]) continue;
      for (let row = 0; row < GRID_SIZE && !placed; row += 1) {
        for (let col = 0; col < GRID_SIZE && !placed; col += 1) {
          placed = engine.place(trayIndex, row, col).ok;
        }
      }
    }
    if (!placed) return;
  }
}

describe('Practice Rewind engine', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    installStorage(store);
  });

  it('restores the full pre-placement gameplay state exactly and is one-use', () => {
    const engine = createGame({ skipPersist: true, rng: () => 0 });
    const before = engine.getState();

    expect(engine.canUndoPlacement()).toBe(false);
    expect(engine.undoLastPlacement()).toBeNull();
    expect(engine.place(0, 2, 2).ok).toBe(true);
    expect(engine.canUndoPlacement()).toBe(true);

    expect(engine.undoLastPlacement()).toEqual(before);
    expect(engine.getState()).toEqual(before);
    expect(engine.getPieceSequence()).toEqual(['DOT', 'DOT', 'DOT']);
    expect(engine.canUndoPlacement()).toBe(false);
    expect(engine.undoLastPlacement()).toBeNull();
  });

  it('undoes a tray refill and replays a different move with the same deterministic next tray', () => {
    const engine = createGame({ skipPersist: true, rng: () => 0 });
    const control = createGame({ skipPersist: true, rng: () => 0 });

    for (const [trayIndex, col] of [[0, 0], [1, 1]] as const) {
      expect(engine.place(trayIndex, 0, col).ok).toBe(true);
      expect(control.place(trayIndex, 0, col).ok).toBe(true);
    }
    const beforeThirdPlacement = engine.getState();
    expect(engine.place(2, 0, 2).ok).toBe(true);
    expect(engine.getPieceSequence()).toHaveLength(6);
    expect(engine.undoLastPlacement()).toEqual(beforeThirdPlacement);
    expect(engine.getPieceSequence()).toEqual(['DOT', 'DOT', 'DOT']);

    expect(engine.place(2, 1, 2).ok).toBe(true);
    expect(control.place(2, 1, 2).ok).toBe(true);
    expect(engine.getState()).toEqual(control.getState());
    expect(engine.getPieceSequence()).toEqual(control.getPieceSequence());
  });

  it.each(['endless', 'daily'] as const)(
    'rewinds a line clear in %s mode while leaving durable records and Best unchanged',
    (mode) => {
      store.set('glowgrid:v1:bestScore', '40');
      const engine = createGame({
        mode,
        dailyKey: mode === 'daily' ? '2026-10-02' : undefined,
        rng: () => 0,
      });

      for (let col = 0; col < GRID_SIZE - 1; col += 1) placeFirstAvailable(engine, 0, col);
      const beforeClear = engine.getState();
      expect(beforeClear.linesClearedTotal).toBe(0);
      expect(beforeClear.lastClear).toEqual({ rows: [], cols: [], cellsCleared: 0, mult: 1 });

      placeFirstAvailable(engine, 0, GRID_SIZE - 1);
      const afterClear = engine.getState();
      expect(afterClear.score).toBe(80);
      expect(afterClear.combo).toBe(1);
      expect(afterClear.linesClearedTotal).toBe(1);
      expect(afterClear.lastClear).toEqual({ rows: [0], cols: [], cellsCleared: 8, mult: 1 });
      expect(afterClear.bestScore).toBe(80);

      const durableAfterPlacement = [...store.entries()].sort(([a], [b]) => a.localeCompare(b));
      const restored = engine.undoLastPlacement();
      expect(restored).not.toBeNull();
      expect(restored!.grid).toEqual(beforeClear.grid);
      expect(restored!.tray).toEqual(beforeClear.tray);
      expect(restored!.score).toBe(beforeClear.score);
      expect(restored!.combo).toBe(beforeClear.combo);
      expect(restored!.comboPeak).toBe(beforeClear.comboPeak);
      expect(restored!.piecesPlaced).toBe(beforeClear.piecesPlaced);
      expect(restored!.linesClearedTotal).toBe(beforeClear.linesClearedTotal);
      expect(restored!.lastClear).toEqual(beforeClear.lastClear);
      // Best is intentionally monotonic even though the current score is rewound.
      expect(restored!.bestScore).toBe(80);
      expect(restored!.newBest).toBe(beforeClear.newBest);
      expect([...store.entries()].sort(([a], [b]) => a.localeCompare(b))).toEqual(durableAfterPlacement);
      if (mode === 'endless') {
        expect(store.get('glowgrid:v1:bestScore')).toBe('80');
      } else {
        expect(store.get('glowgrid:v1:bestScore')).toBe('40');
        expect(JSON.parse(store.get('glowgrid:v1:daily:2026-10-02')!)).toEqual({ score: 80, finished: false });
      }
    },
  );

  it('does not retain NEW BEST after rewinding below the preserved record', () => {
    store.set('glowgrid:v1:bestScore', '40');
    const engine = createGame({ mode: 'endless', rng: () => 0 });

    for (let col = 0; col < GRID_SIZE; col += 1) placeFirstAvailable(engine, 0, col);
    expect(engine.getState().score).toBe(80);
    expect(engine.getState().newBest).toBe(true);

    for (let col = 0; col < GRID_SIZE - 1; col += 1) placeFirstAvailable(engine, 1, col);
    const beforeSecondClear = engine.getState();
    expect(beforeSecondClear.score).toBe(80);
    expect(beforeSecondClear.bestScore).toBe(80);
    expect(beforeSecondClear.newBest).toBe(true);

    placeFirstAvailable(engine, 1, GRID_SIZE - 1);
    expect(engine.getState().score).toBe(160);
    expect(engine.getState().bestScore).toBe(160);
    const durableRecord = new Map(store);

    const restored = engine.undoLastPlacement();
    expect(restored?.score).toBe(80);
    expect(restored?.bestScore).toBe(160);
    expect(restored?.newBest).toBe(false);
    expect(store).toEqual(durableRecord);
  });

  it('clears the rewind boundary on restart without erasing the saved Best', () => {
    store.set('glowgrid:v1:bestScore', '25');
    const engine = createGame({ rng: () => 0 });
    expect(engine.place(0, 0, 0).ok).toBe(true);
    expect(engine.canUndoPlacement()).toBe(true);

    const beforeRestart = new Map(store);
    const restarted = engine.restart();
    expect(engine.canUndoPlacement()).toBe(false);
    expect(engine.undoLastPlacement()).toBeNull();
    expect(restarted.score).toBe(0);
    expect(restarted.piecesPlaced).toBe(0);
    expect(restarted.lastClear).toBeNull();
    expect(restarted.grid.flat().every((cell) => cell === null)).toBe(true);
    expect(restarted.bestScore).toBe(25);
    expect(store).toEqual(beforeRestart);
  });

  it('does not rewind across the game-over boundary', () => {
    const engine = createGame({ skipPersist: true, rng: mulberry32(1) });
    playGreedyUntilGameOver(engine);
    const gameOver = engine.getState();
    expect(gameOver.status).toBe('gameover');
    expect(engine.canUndoPlacement()).toBe(false);
    expect(engine.undoLastPlacement()).toBeNull();
    expect(engine.getState()).toEqual(gameOver);

    const restarted = engine.restart();
    expect(restarted.status).toBe('playing');
    expect(engine.canUndoPlacement()).toBe(false);
  });
});
