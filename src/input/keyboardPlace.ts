import { GRID_SIZE } from '../game/pieces.ts';

export type GridCursor = { row: number; col: number };

/** Start near the center so the preview has room for every current piece shape. */
export function centerGridCursor(gridSize = GRID_SIZE): GridCursor {
  const center = Math.floor((gridSize - 1) / 2);
  return { row: center, col: center };
}

/** Map the 1–3 tray shortcuts to zero-based tray slots. */
export function trayShortcutIndex(key: string, code = ''): number | null {
  const indexFor = (value: string): number | null => {
    switch (value) {
      case '1':
      case 'Digit1':
      case 'Numpad1':
        return 0;
      case '2':
      case 'Digit2':
      case 'Numpad2':
        return 1;
      case '3':
      case 'Digit3':
      case 'Numpad3':
        return 2;
      default:
        return null;
    }
  };

  return indexFor(key) ?? indexFor(code);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !('nodeType' in target) || (target as Node).nodeType !== 1) {
    return false;
  }
  const element = target as HTMLElement;
  return (
    element.isContentEditable ||
    element.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') !== null
  );
}

/**
 * Listen in document capture so shortcuts also work when the browser delivers
 * keydown at the document rather than bubbling from the focused canvas. Keep
 * text-entry controls and modified/repeating key presses out of game controls.
 */
export function attachTrayShortcutListener(
  documentTarget: Document,
  canSelect: (index: number) => boolean,
  onSelect: (index: number) => void,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (isEditableTarget(event.target) || isEditableTarget(documentTarget.activeElement)) return;

    const index = trayShortcutIndex(event.key, event.code);
    if (index === null || !canSelect(index)) return;

    event.preventDefault();
    onSelect(index);
  };

  documentTarget.addEventListener('keydown', onKeyDown, true);
  return () => documentTarget.removeEventListener('keydown', onKeyDown, true);
}

/** Listen for the optional one-step Practice Rewind shortcut (U). */
export function attachPracticeRewindShortcutListener(
  documentTarget: Document,
  canRewind: () => boolean,
  onRewind: () => void,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (isEditableTarget(event.target) || isEditableTarget(documentTarget.activeElement)) return;
    if (event.key.toLowerCase() !== 'u' || !canRewind()) return;

    event.preventDefault();
    onRewind();
  };

  documentTarget.addEventListener('keydown', onKeyDown, true);
  return () => documentTarget.removeEventListener('keydown', onKeyDown, true);
}

/** Move one cell with the arrow keys, clamping the preview to the board. */
export function moveGridCursor(
  cursor: GridCursor,
  key: string,
  gridSize = GRID_SIZE,
): GridCursor | null {
  let row = cursor.row;
  let col = cursor.col;
  switch (key) {
    case 'ArrowUp': row -= 1; break;
    case 'ArrowDown': row += 1; break;
    case 'ArrowLeft': col -= 1; break;
    case 'ArrowRight': col += 1; break;
    default: return null;
  }
  return {
    row: Math.max(0, Math.min(gridSize - 1, row)),
    col: Math.max(0, Math.min(gridSize - 1, col)),
  };
}

/** Escape cancels the active tray-piece selection. */
export function isCancelKey(key: string): boolean {
  return key === 'Escape';
}

/** Enter and Space confirm tray selection or place the selected piece. */
export function isConfirmKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
