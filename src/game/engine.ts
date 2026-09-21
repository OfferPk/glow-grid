/**
 * GlowGrid pure game engine — framework-agnostic, unit-testable.
 */

import {
  GRID_SIZE,
  PIECE_DEFS,
  cellsForRotation,
  type Cell,
  type PieceDef,
  type Rot,
  type TraySlot,
} from './pieces.ts';
import { applyClearScore } from './score.ts';
import {
  createDailyRng,
  createEndlessRng,
  dailyKeyKarachi,
  type RngFn,
} from './rng.ts';
import {
  getBestScore,
  setBestScore,
  getDailyRecord,
  incrementGamesPlayed,
  saveDailyRecord,
} from './persist.ts';

export type GameMode = 'endless' | 'daily';
export type GameStatus = 'playing' | 'gameover';

export type GameState = {
  grid: (string | null)[][];
  tray: [TraySlot, TraySlot, TraySlot];
  score: number;
  combo: number;
  comboPeak: number;
  bestScore: number;
  status: GameStatus;
  mode: GameMode;
  dailyKey: string | null;
  piecesPlaced: number;
  linesClearedTotal: number;
  lastClear: { rows: number[]; cols: number[]; cellsCleared: number; mult: number } | null;
};

export type PlaceResult =
  | { ok: true; state: GameState; cellsCleared: number; mult: number }
  | { ok: false; reason: 'invalid' | 'gameover' };

function emptyGrid(): (string | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map((row) => row.slice());
}

function cloneTray(tray: [TraySlot, TraySlot, TraySlot]): [TraySlot, TraySlot, TraySlot] {
  return tray.map((s) =>
    s ? { def: s.def, rotation: s.rotation } : null,
  ) as [TraySlot, TraySlot, TraySlot];
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    grid: cloneGrid(state.grid),
    tray: cloneTray(state.tray),
    lastClear: state.lastClear
      ? {
          rows: [...state.lastClear.rows],
          cols: [...state.lastClear.cols],
          cellsCleared: state.lastClear.cellsCleared,
          mult: state.lastClear.mult,
        }
      : null,
  };
}

function pickPiece(rng: RngFn): PieceDef {
  const i = Math.floor(rng() * PIECE_DEFS.length) % PIECE_DEFS.length;
  return PIECE_DEFS[i]!;
}


function trayAllEmpty(tray: [TraySlot, TraySlot, TraySlot]): boolean {
  return tray.every((s) => s == null);
}

export function absoluteCells(
  def: PieceDef,
  rotation: Rot,
  originR: number,
  originC: number,
): Cell[] {
  return cellsForRotation(def, rotation).map(({ r, c }) => ({
    r: originR + r,
    c: originC + c,
  }));
}

export function canPlace(
  grid: (string | null)[][],
  def: PieceDef,
  rotation: Rot,
  originR: number,
  originC: number,
): boolean {
  const cells = absoluteCells(def, rotation, originR, originC);
  for (const { r, c } of cells) {
    if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) return false;
    if (grid[r]![c] != null) return false;
  }
  return true;
}

export function pieceFitsAnywhere(
  grid: (string | null)[][],
  def: PieceDef,
): boolean {
  for (let rot = 0; rot < 4; rot++) {
    const r0 = rot as Rot;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlace(grid, def, r0, r, c)) return true;
      }
    }
  }
  return false;
}

export function anyTrayPieceFits(
  grid: (string | null)[][],
  tray: [TraySlot, TraySlot, TraySlot],
): boolean {
  for (const slot of tray) {
    if (slot && pieceFitsAnywhere(grid, slot.def)) return true;
  }
  return false;
}

/**
 * Find full rows and columns. Static clear — no gravity.
 * Cells on both a full row and full col count once.
 */
export function findClears(grid: (string | null)[][]): {
  rows: number[];
  cols: number[];
  cellSet: Set<string>;
} {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r]!.every((cell) => cell != null)) rows.push(r);
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r]![c] == null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(c);
  }
  const cellSet = new Set<string>();
  for (const r of rows) {
    for (let c = 0; c < GRID_SIZE; c++) cellSet.add(`${r},${c}`);
  }
  for (const c of cols) {
    for (let r = 0; r < GRID_SIZE; r++) cellSet.add(`${r},${c}`);
  }
  return { rows, cols, cellSet };
}

export function applyClears(
  grid: (string | null)[][],
  cellSet: Set<string>,
): (string | null)[][] {
  const next = cloneGrid(grid);
  for (const key of cellSet) {
    const [rs, cs] = key.split(',');
    const r = Number(rs);
    const c = Number(cs);
    next[r]![c] = null;
  }
  return next;
}

export type Engine = {
  getState: () => GameState;
  /** Peek next N piece ids from the bag (for tests) without mutating play state permanently — uses internal rng copy via sequence log. */
  getPieceSequence: () => string[];
  rotateTraySlot: (index: number) => GameState;
  setTrayRotation: (index: number, rotation: Rot) => GameState;
  place: (trayIndex: number, originR: number, originC: number) => PlaceResult;
  restart: () => GameState;
};

export type CreateGameOptions = {
  mode?: GameMode;
  dailyKey?: string;
  /** Inject RNG for tests */
  rng?: RngFn;
  /** Initial best score override */
  bestScore?: number;
  /** Skip persist side-effects (tests) */
  skipPersist?: boolean;
};

export function createGame(opts: CreateGameOptions = {}): Engine {
  const mode: GameMode = opts.mode ?? 'endless';
  const dailyKey =
    mode === 'daily' ? (opts.dailyKey ?? dailyKeyKarachi()) : null;

  let rng: RngFn =
    opts.rng ??
    (mode === 'daily' && dailyKey
      ? createDailyRng(dailyKey)
      : createEndlessRng());

  const pieceSequence: string[] = [];
  const trackedPick = (): PieceDef => {
    const p = pickPiece(rng);
    pieceSequence.push(p.id);
    return p;
  };

  const trackedFill = (): [TraySlot, TraySlot, TraySlot] => [
    { def: trackedPick(), rotation: 0 },
    { def: trackedPick(), rotation: 0 },
    { def: trackedPick(), rotation: 0 },
  ];

  const initialBest = (): number => {
    if (opts.bestScore != null) return opts.bestScore;
    if (opts.skipPersist) return 0;
    if (mode === 'daily' && dailyKey) {
      return getDailyRecord(dailyKey)?.score ?? 0;
    }
    return getBestScore();
  };

  let state: GameState = {
    grid: emptyGrid(),
    tray: trackedFill(),
    score: 0,
    combo: 0,
    comboPeak: 0,
    bestScore: initialBest(),
    status: 'playing',
    mode,
    dailyKey,
    piecesPlaced: 0,
    linesClearedTotal: 0,
    lastClear: null,
  };

  const finishIfNeeded = (): void => {
    if (state.status !== 'playing') return;
    if (!anyTrayPieceFits(state.grid, state.tray)) {
      state = { ...state, status: 'gameover' };
      if (!opts.skipPersist) {
        if (mode === 'endless') {
          setBestScore(state.score);
          state.bestScore = Math.max(state.bestScore, state.score);
        } else if (mode === 'daily' && dailyKey) {
          // Daily only touches glowgrid:v1:daily:{key} — never setBestScore / endless key.
          saveDailyRecord(dailyKey, state.score, true);
          state.bestScore = Math.max(state.bestScore, state.score);
        }
        incrementGamesPlayed();
      } else {
        // skipPersist: in-memory display best only (no localStorage writes)
        state.bestScore = Math.max(state.bestScore, state.score);
      }
    }
  };

  const api: Engine = {
    getState: () => cloneState(state),
    getPieceSequence: () => [...pieceSequence],

    rotateTraySlot(index: number): GameState {
      if (state.status !== 'playing') return cloneState(state);
      const slot = state.tray[index];
      if (!slot) return cloneState(state);
      const nextRot = ((slot.rotation + 1) % 4) as Rot;
      const tray = cloneTray(state.tray);
      tray[index] = { def: slot.def, rotation: nextRot };
      state = { ...state, tray };
      return cloneState(state);
    },

    setTrayRotation(index: number, rotation: Rot): GameState {
      if (state.status !== 'playing') return cloneState(state);
      const slot = state.tray[index];
      if (!slot) return cloneState(state);
      const tray = cloneTray(state.tray);
      tray[index] = { def: slot.def, rotation };
      state = { ...state, tray };
      return cloneState(state);
    },

    place(trayIndex: number, originR: number, originC: number): PlaceResult {
      if (state.status !== 'playing') {
        return { ok: false, reason: 'gameover' };
      }
      const slot = state.tray[trayIndex];
      if (!slot) return { ok: false, reason: 'invalid' };
      if (!canPlace(state.grid, slot.def, slot.rotation, originR, originC)) {
        return { ok: false, reason: 'invalid' };
      }

      let grid = cloneGrid(state.grid);
      const cells = absoluteCells(slot.def, slot.rotation, originR, originC);
      for (const { r, c } of cells) {
        grid[r]![c] = slot.def.color;
      }

      const { rows, cols, cellSet } = findClears(grid);
      const cellsCleared = cellSet.size;
      grid = applyClears(grid, cellSet);

      const { scoreDelta, newCombo, mult } = applyClearScore(
        state.combo,
        cellsCleared,
      );

      const tray = cloneTray(state.tray);
      tray[trayIndex] = null;

      let nextTray = tray;
      if (trayAllEmpty(tray)) {
        nextTray = trackedFill();
      }

      const comboPeak = Math.max(state.comboPeak, newCombo);
      state = {
        ...state,
        grid,
        tray: nextTray,
        score: state.score + scoreDelta,
        combo: newCombo,
        comboPeak,
        piecesPlaced: state.piecesPlaced + 1,
        linesClearedTotal:
          state.linesClearedTotal + rows.length + cols.length,
        lastClear:
          cellsCleared > 0
            ? { rows, cols, cellsCleared, mult }
            : { rows: [], cols: [], cellsCleared: 0, mult: 1 },
        bestScore: Math.max(state.bestScore, state.score + scoreDelta),
      };

      // Persist live bests with mode-isolated keys (endless vs daily).
      if (!opts.skipPersist) {
        if (mode === 'endless') {
          if (state.score > getBestScore()) setBestScore(state.score);
        } else if (mode === 'daily' && dailyKey) {
          saveDailyRecord(dailyKey, state.score, false);
        }
      }

      finishIfNeeded();
      return {
        ok: true,
        state: cloneState(state),
        cellsCleared,
        mult,
      };
    },

    restart(): GameState {
      rng =
        opts.rng ??
        (mode === 'daily' && dailyKey
          ? createDailyRng(dailyKey)
          : createEndlessRng());
      pieceSequence.length = 0;
      // rebind trackedFill's rng closure — recreate by reassigning via local
      // Since trackedPick closes over `rng` let variable, restart reassigns rng — OK.
      const restartedBest = (): number => {
        if (opts.bestScore != null) return opts.bestScore;
        if (opts.skipPersist) return state.bestScore;
        if (mode === 'daily' && dailyKey) {
          return getDailyRecord(dailyKey)?.score ?? 0;
        }
        return getBestScore();
      };
      state = {
        grid: emptyGrid(),
        tray: trackedFill(),
        score: 0,
        combo: 0,
        comboPeak: 0,
        bestScore: restartedBest(),
        status: 'playing',
        mode,
        dailyKey,
        piecesPlaced: 0,
        linesClearedTotal: 0,
        lastClear: null,
      };
      return cloneState(state);
    },
  };

  return api;
}

/** Draw N piece ids from a fresh daily bag (for sequence tests). */
export function drawPieceIds(rng: RngFn, count: number): string[] {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * PIECE_DEFS.length) % PIECE_DEFS.length;
    ids.push(PIECE_DEFS[idx]!.id);
  }
  return ids;
}
