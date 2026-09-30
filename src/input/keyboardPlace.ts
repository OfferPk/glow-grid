import { GRID_SIZE } from '../game/pieces.ts';

export type GridCursor = { row: number; col: number };

/** Start near the center so the preview has room for every current piece shape. */
export function centerGridCursor(gridSize = GRID_SIZE): GridCursor {
  const center = Math.floor((gridSize - 1) / 2);
  return { row: center, col: center };
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

/** Enter and Space confirm tray selection or place the selected piece. */
export function isConfirmKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
