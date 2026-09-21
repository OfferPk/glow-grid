/**
 * Tray→board drag placement helpers (pure / DOMRect-based for tests).
 */

import { GRID_SIZE } from '../game/pieces.ts';

export type BoardCell = { row: number; col: number };

/** Hit-test a board rectangle (CSS pixels) to a grid cell. */
export function cellFromClientPoint(
  boardRect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  cellSize: number,
): BoardCell | null {
  const x = clientX - boardRect.left;
  const y = clientY - boardRect.top;
  if (x < 0 || y < 0 || x >= boardRect.width || y >= boardRect.height) return null;
  if (cellSize <= 0) return null;
  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);
  if (row < 0 || col < 0 || row >= GRID_SIZE || col >= GRID_SIZE) return null;
  return { row, col };
}

/**
 * Resolve a tray→board drop. When dragTrayIndex is set and the pointer is over
 * a valid board cell, returns place args; otherwise null (cancel / miss).
 */
export function resolveTrayBoardDrop(
  dragTrayIndex: number | null,
  boardRect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  cellSize: number,
): { trayIndex: number; row: number; col: number } | null {
  if (dragTrayIndex === null) return null;
  const cell = cellFromClientPoint(boardRect, clientX, clientY, cellSize);
  if (!cell) return null;
  return { trayIndex: dragTrayIndex, row: cell.row, col: cell.col };
}


/**
 * Window/document tracking contract for tray→board drag (GG-002).
 * Attach move/up/cancel on `target` (prefer window); do not use tray setPointerCapture.
 */
export type WindowDragHandlers = {
  onMove: (clientX: number, clientY: number) => void;
  onUp: (clientX: number, clientY: number) => void;
  onCancel: () => void;
};

export function attachWindowPointerDrag(
  target: EventTarget,
  pointerId: number,
  handlers: WindowDragHandlers,
): () => void {
  const onMove = (ev: Event) => {
    const e = ev as PointerEvent;
    if (e.pointerId !== pointerId) return;
    handlers.onMove(e.clientX, e.clientY);
  };
  const onUp = (ev: Event) => {
    const e = ev as PointerEvent;
    if (e.pointerId !== pointerId) return;
    detach();
    handlers.onUp(e.clientX, e.clientY);
  };
  const onCancel = (ev: Event) => {
    const e = ev as PointerEvent;
    if (e.pointerId !== pointerId) return;
    detach();
    handlers.onCancel();
  };
  const opts: AddEventListenerOptions = { capture: true };
  function detach(): void {
    target.removeEventListener('pointermove', onMove, opts);
    target.removeEventListener('pointerup', onUp, opts);
    target.removeEventListener('pointercancel', onCancel, opts);
  }
  // Capture phase so move/up reach window even when pointer is over the board
  // (and without tray setPointerCapture — GG-002).
  target.addEventListener('pointermove', onMove, opts);
  target.addEventListener('pointerup', onUp, opts);
  target.addEventListener('pointercancel', onCancel, opts);
  return detach;
}
