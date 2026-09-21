import { describe, it, expect } from 'vitest';
import {
  attachWindowPointerDrag,
  cellFromClientPoint,
  resolveTrayBoardDrop,
} from '../src/input/dragPlace.ts';
import { createGame } from '../src/game/engine.ts';

describe('tray→board drag placement', () => {
  const boardRect = { left: 100, top: 50, width: 320, height: 320 };
  const cellSize = 40; // 320 / 8

  it('cellFromClientPoint maps pointer to row/col inside board', () => {
    // top-left cell
    expect(cellFromClientPoint(boardRect, 100 + 5, 50 + 5, cellSize)).toEqual({
      row: 0,
      col: 0,
    });
    // near bottom-right
    expect(
      cellFromClientPoint(boardRect, 100 + 319, 50 + 319, cellSize),
    ).toEqual({ row: 7, col: 7 });
  });

  it('cellFromClientPoint returns null outside board', () => {
    expect(cellFromClientPoint(boardRect, 50, 50, cellSize)).toBeNull();
    expect(cellFromClientPoint(boardRect, 100 + 400, 50 + 10, cellSize)).toBeNull();
  });

  it('resolveTrayBoardDrop requires active tray drag + valid cell', () => {
    expect(
      resolveTrayBoardDrop(null, boardRect, 120, 70, cellSize),
    ).toBeNull();
    expect(
      resolveTrayBoardDrop(1, boardRect, 10, 10, cellSize),
    ).toBeNull();
    expect(resolveTrayBoardDrop(2, boardRect, 100 + 45, 50 + 85, cellSize)).toEqual({
      trayIndex: 2,
      row: 2,
      col: 1,
    });
  });

  it('resolved drop feeds engine.place end-to-end (tray→board path)', () => {
    const eng = createGame({ skipPersist: true, rng: () => 0 });
    const drop = resolveTrayBoardDrop(0, boardRect, 100 + 5, 50 + 5, cellSize);
    expect(drop).not.toBeNull();
    const result = eng.place(drop!.trayIndex, drop!.row, drop!.col);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.grid[0]![0]).not.toBeNull();
      expect(result.state.tray[0]).toBeNull();
    }
  });

  it('missed drop (pointer off board) does not place', () => {
    const eng = createGame({ skipPersist: true, rng: () => 0 });
    const before = eng.getState();
    const drop = resolveTrayBoardDrop(0, boardRect, 0, 0, cellSize);
    expect(drop).toBeNull();
    // UI would skip place — state unchanged
    expect(eng.getState().piecesPlaced).toBe(before.piecesPlaced);
    expect(eng.getState().tray[0]).not.toBeNull();
  });
});


describe('attachWindowPointerDrag (GG-002 window tracking)', () => {
  it('routes move/up on target without requiring element capture', () => {
    const listeners = new Map<string, Set<(e: { pointerId: number; clientX: number; clientY: number }) => void>>();
    const target = {
      addEventListener(
        type: string,
        fn: (e: { pointerId: number; clientX: number; clientY: number }) => void,
        _opts?: unknown,
      ) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(
        type: string,
        fn: (e: { pointerId: number; clientX: number; clientY: number }) => void,
        _opts?: unknown,
      ) {
        listeners.get(type)?.delete(fn);
      },
    };
    const moves: Array<[number, number]> = [];
    let up: [number, number] | null = null;
    const detach = attachWindowPointerDrag(target, 7, {
      onMove: (x, y) => moves.push([x, y]),
      onUp: (x, y) => {
        up = [x, y];
      },
      onCancel: () => {},
    });
    // simulate window pointermove far from tray
    for (const fn of listeners.get('pointermove')!) {
      fn({ pointerId: 7, clientX: 150, clientY: 80 });
    }
    for (const fn of listeners.get('pointerup')!) {
      fn({ pointerId: 7, clientX: 160, clientY: 90 });
    }
    expect(moves).toEqual([[150, 80]]);
    expect(up).toEqual([160, 90]);
    // listeners cleaned after up
    expect(listeners.get('pointermove')!.size).toBe(0);
    detach(); // idempotent
  });
});
