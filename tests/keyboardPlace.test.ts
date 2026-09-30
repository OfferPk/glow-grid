import { describe, expect, it } from 'vitest';
import { centerGridCursor, isConfirmKey, moveGridCursor } from '../src/input/keyboardPlace';

describe('keyboard board placement', () => {
  it('starts the preview near the center of the 8×8 board', () => {
    expect(centerGridCursor()).toEqual({ row: 3, col: 3 });
  });

  it.each([
    ['ArrowUp', { row: 2, col: 3 }],
    ['ArrowDown', { row: 4, col: 3 }],
    ['ArrowLeft', { row: 3, col: 2 }],
    ['ArrowRight', { row: 3, col: 4 }],
  ])('moves one cell for %s', (key, expected) => {
    expect(moveGridCursor({ row: 3, col: 3 }, key)).toEqual(expected);
  });

  it('clamps movement at every board edge', () => {
    expect(moveGridCursor({ row: 0, col: 0 }, 'ArrowUp')).toEqual({ row: 0, col: 0 });
    expect(moveGridCursor({ row: 0, col: 0 }, 'ArrowLeft')).toEqual({ row: 0, col: 0 });
    expect(moveGridCursor({ row: 7, col: 7 }, 'ArrowDown')).toEqual({ row: 7, col: 7 });
    expect(moveGridCursor({ row: 7, col: 7 }, 'ArrowRight')).toEqual({ row: 7, col: 7 });
  });

  it('ignores keys that do not move the board cursor', () => {
    expect(moveGridCursor({ row: 3, col: 3 }, 'Escape')).toBeNull();
  });

  it.each(['Enter', ' ', 'Spacebar'])('accepts %j as a confirm key', (key) => {
    expect(isConfirmKey(key)).toBe(true);
  });

  it('does not treat unrelated keys as confirmation', () => {
    expect(isConfirmKey('Tab')).toBe(false);
    expect(isConfirmKey('r')).toBe(false);
  });
});
