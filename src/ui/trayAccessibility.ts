import type { PieceId, Rot, TraySlot } from '../game/pieces';

const SHAPE_LABELS: Record<PieceId, string> = {
  DOT: 'single block',
  I2: 'two-block line',
  I3: 'three-block line',
  I4: 'four-block line',
  O: 'square',
  T: 'T shape',
  L: 'L shape',
  J: 'reverse L shape',
  S: 'S zigzag',
  Z: 'Z zigzag',
  L3: 'small L shape',
  CORNER: 'three-block corner',
  V3: 'three-block line',
  PLUS: 'plus shape',
  U: 'U shape',
  RING: 'hollow square',
};

const ROTATION_LABELS: Record<Rot, string> = {
  0: 'unrotated',
  1: 'rotated once clockwise',
  2: 'rotated twice clockwise',
  3: 'rotated three times clockwise',
};

/** Describe the current tray contents for assistive technology. */
export function trayPieceAriaLabel(index: number, slot: TraySlot): string {
  const pieceNumber = index + 1;
  if (!slot) return `Piece ${pieceNumber}, empty`;

  const shape = SHAPE_LABELS[slot.def.id] ?? `${slot.def.id} shape`;
  const blockCount = slot.def.cells.length;
  const blocks = `${blockCount} ${blockCount === 1 ? 'block' : 'blocks'}`;
  return `Piece ${pieceNumber}, ${shape}, ${blocks}, ${ROTATION_LABELS[slot.rotation]}`;
}
