/** Canvas 2D renderer for GlowGrid board + tray previews. */

import {
  absoluteCells,
  canPlace,
  previewClears,
  type GameState,
} from '../game/engine';
import { GRID_SIZE, getPieceCells, type TraySlot } from '../game/pieces';
import { cellFromClientPoint } from '../input/dragPlace';

export { cellFromClientPoint };

const BG = '#0b1020';
const GRID_LINE = '#1e293b';
const EMPTY_CELL = '#111827';
const GLOW_FLASH = 'rgba(34, 211, 238, 0.45)';
const PREVIEW_OK = 'rgba(163, 230, 53, 0.35)';
const PREVIEW_BAD = 'rgba(251, 113, 133, 0.35)';
const PREVIEW_CLEAR = 'rgba(250, 204, 21, 0.18)';

export type ClearFlash = {
  rows: number[];
  cols: number[];
  until: number;
};

export type HoverPreview = {
  trayIndex: number;
  row: number;
  col: number;
} | null;

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  cssSize: number,
): { cell: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cell = cssSize / GRID_SIZE;
  return { cell, dpr };
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: number,
  flash: ClearFlash | null,
  hover: HoverPreview,
  now: number,
): void {
  // GG-003: skip draw when cells are too small (orientation / collapse).
  if (cell < 2) {
    ctx.clearRect(0, 0, Math.max(0, cell * GRID_SIZE), Math.max(0, cell * GRID_SIZE));
    return;
  }

  const size = cell * GRID_SIZE;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  const pad = 1;
  const glass = cell - pad * 2;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = c * cell;
      const y = r * cell;
      const color = state.grid[r]![c];
      ctx.fillStyle = color ?? EMPTY_CELL;
      roundRect(ctx, x + pad, y + pad, glass, glass, 4);
      ctx.fill();
      if (color) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(size, i * cell);
    ctx.stroke();
  }

  if (flash && now < flash.until) {
    const t = 1 - (flash.until - now) / 280;
    const alpha = 0.55 * (1 - t);
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`;
    for (const r of flash.rows) ctx.fillRect(0, r * cell, size, cell);
    for (const c of flash.cols) ctx.fillRect(c * cell, 0, cell, size);
    void GLOW_FLASH;
  }

  if (hover && state.status === 'playing') {
    const slot = state.tray[hover.trayIndex];
    if (slot) {
      const ok = canPlace(
        state.grid,
        slot.def,
        slot.rotation,
        hover.row,
        hover.col,
      );
      const cells = absoluteCells(
        slot.def,
        slot.rotation,
        hover.row,
        hover.col,
      );
      if (ok) {
        const projected = previewClears(
          state.grid,
          slot.def,
          slot.rotation,
          hover.row,
          hover.col,
        );
        if (projected) {
          ctx.fillStyle = PREVIEW_CLEAR;
          for (const r of projected.rows) ctx.fillRect(0, r * cell, size, cell);
          for (const c of projected.cols) ctx.fillRect(c * cell, 0, cell, size);
        }
      }
      ctx.fillStyle = ok ? PREVIEW_OK : PREVIEW_BAD;
      for (const { r, c } of cells) {
        if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) continue;
        roundRect(ctx, c * cell + pad, r * cell + pad, glass, glass, 4);
        ctx.fill();
      }
    }
  }
}

export function drawTraySlot(
  canvas: HTMLCanvasElement,
  slot: TraySlot,
  selected: boolean,
): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = canvas.clientWidth || 72;
  canvas.width = Math.floor(css * dpr);
  canvas.height = Math.floor(css * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, css, css);
  ctx.fillStyle = selected ? '#1e293b' : '#0f172a';
  roundRect(ctx, 0, 0, css, css, 10);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (!slot) return;
  const cells = getPieceCells(slot.def, slot.rotation);
  const maxR = Math.max(...cells.map((c) => c.r));
  const maxC = Math.max(...cells.map((c) => c.c));
  const rows = maxR + 1;
  const cols = maxC + 1;
  const margin = 10;
  const cell = Math.min((css - margin * 2) / cols, (css - margin * 2) / rows);
  const ox = (css - cols * cell) / 2;
  const oy = (css - rows * cell) / 2;
  for (const { r, c } of cells) {
    ctx.fillStyle = slot.def.color;
    roundRect(ctx, ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2, 3);
    ctx.fill();
  }
}

/** GG-003: clamp radius; empty path when w/h < 1 to avoid arcTo IndexSizeError. */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (w < 1 || h < 1) {
    ctx.beginPath();
    return;
  }
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (rr <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function cellFromPointer(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  cell: number,
): { row: number; col: number } | null {
  return cellFromClientPoint(
    canvas.getBoundingClientRect(),
    clientX,
    clientY,
    cell,
  );
}
