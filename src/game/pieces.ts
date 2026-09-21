/** Polyomino piece definitions for GlowGrid (original neon IP). */

export const GRID_SIZE = 8;

export type Cell = { r: number; c: number };
export type PieceId = string;
export type PieceDef = { id: PieceId; cells: Cell[]; color: string };
export type Rot = 0 | 1 | 2 | 3;
export type Rotation = Rot;
export type TraySlot = { def: PieceDef; rotation: Rot } | null;

const CYAN = '#22d3ee';
const MAGENTA = '#e879f9';
const LIME = '#a3e635';
const VIOLET = '#a78bfa';
const ORANGE = '#fb923c';
const PINK = '#f472b6';
const TEAL = '#2dd4bf';
const YELLOW = '#facc15';

/** Normalize cells so min r/c = 0. */
export function normalize(cells: Cell[]): Cell[] {
  const minR = Math.min(...cells.map((x) => x.r));
  const minC = Math.min(...cells.map((x) => x.c));
  return cells.map(({ r, c }) => ({ r: r - minR, c: c - minC }));
}

/** Rotate 90° clockwise, then normalize. */
export function rotateCells(cells: Cell[]): Cell[] {
  return normalize(cells.map(({ r, c }) => ({ r: c, c: -r })));
}

export function cellsForRotation(def: PieceDef, rotation: Rot): Cell[] {
  let cells = def.cells.map((c) => ({ ...c }));
  for (let i = 0; i < rotation; i++) {
    cells = rotateCells(cells);
  }
  return cells;
}

/** Alias used by renderer. */
export function getPieceCells(def: PieceDef, rotation: Rot): Cell[] {
  return cellsForRotation(def, rotation);
}

export function pieceBounds(cells: Cell[]): { rows: number; cols: number } {
  return {
    rows: Math.max(...cells.map((x) => x.r)) + 1,
    cols: Math.max(...cells.map((x) => x.c)) + 1,
  };
}

export const PIECE_DEFS: PieceDef[] = [
  { id: 'DOT', cells: [{ r: 0, c: 0 }], color: CYAN },
  { id: 'I2', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }], color: MAGENTA },
  {
    id: 'I3',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ],
    color: LIME,
  },
  {
    id: 'I4',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ],
    color: VIOLET,
  },
  {
    id: 'O',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ],
    color: YELLOW,
  },
  {
    id: 'T',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 1, c: 1 },
    ],
    color: TEAL,
  },
  {
    id: 'L',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
      { r: 2, c: 1 },
    ],
    color: ORANGE,
  },
  {
    id: 'J',
    cells: [
      { r: 0, c: 1 },
      { r: 1, c: 1 },
      { r: 2, c: 1 },
      { r: 2, c: 0 },
    ],
    color: PINK,
  },
  {
    id: 'S',
    cells: [
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ],
    color: LIME,
  },
  {
    id: 'Z',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
    ],
    color: MAGENTA,
  },
  {
    id: 'L3',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ],
    color: CYAN,
  },
  {
    id: 'CORNER',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
    ],
    color: VIOLET,
  },
  {
    id: 'V3',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ],
    color: TEAL,
  },
  {
    id: 'PLUS',
    cells: [
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 1 },
    ],
    color: ORANGE,
  },
  {
    id: 'U',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 2 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
    ],
    color: PINK,
  },
  {
    id: 'RING',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 1, c: 0 },
      { r: 1, c: 2 },
      { r: 2, c: 0 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
    ],
    color: CYAN,
  },
];

export function getPieceById(id: PieceId): PieceDef {
  const found = PIECE_DEFS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown piece: ${id}`);
  return found;
}
