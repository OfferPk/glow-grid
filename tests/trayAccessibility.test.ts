import { describe, expect, it } from 'vitest';
import { getPieceById } from '../src/game/pieces';
import { trayPieceAriaLabel } from '../src/ui/trayAccessibility';

describe('tray piece accessibility labels', () => {
  it('describes an empty tray slot without implying it can be played', () => {
    expect(trayPieceAriaLabel(1, null)).toBe('Piece 2, empty');
  });

  it('names the piece shape and number of blocks', () => {
    expect(
      trayPieceAriaLabel(0, {
        def: getPieceById('T'),
        rotation: 0,
      }),
    ).toBe('Piece 1, T shape, 4 blocks, unrotated');
  });

  it('updates its description when the piece is rotated', () => {
    expect(
      trayPieceAriaLabel(2, {
        def: getPieceById('DOT'),
        rotation: 1,
      }),
    ).toBe('Piece 3, single block, 1 block, rotated once clockwise');
  });
});
