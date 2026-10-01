import { describe, expect, it } from 'vitest';
import { announceClear, formatClearAnnouncement } from '../src/ui/clearAnnouncement.ts';
import { createGame } from '../src/game/engine.ts';
import type { GameState } from '../src/game/engine.ts';

function nextState(
  score: number,
  combo: number,
  rows: number[],
  cols: number[],
  cellsCleared: number,
  mult: number,
): Pick<GameState, 'score' | 'combo' | 'lastClear'> {
  return {
    score,
    combo,
    lastClear: { rows, cols, cellsCleared, mult },
  };
}

describe('clear announcements', () => {
  it('does not announce a placement with no cleared lines', () => {
    const status = { textContent: '' };
    const quietMove = nextState(0, 0, [], [], 0, 1);

    expect(formatClearAnnouncement({ score: 0 }, quietMove)).toBeNull();
    expect(announceClear(status, { score: 0 }, quietMove)).toBeNull();
    expect(status.textContent).toBe('');
  });

  it('keeps a synthetic no-clear gameplay sequence silent, then announces its completed row', () => {
    const game = createGame({ skipPersist: true, rng: () => 0 });
    const status = { textContent: '' };
    let previous = game.getState();

    for (let column = 0; column < 7; column++) {
      const trayIndex = previous.tray.findIndex((slot) => slot !== null);
      const result = game.place(trayIndex, 0, column);
      if (!result.ok) throw new Error('Expected a legal synthetic DOT placement');

      expect(result.cellsCleared).toBe(0);
      expect(announceClear(status, previous, result.state)).toBeNull();
      expect(status.textContent).toBe('');
      previous = result.state;
    }

    const trayIndex = previous.tray.findIndex((slot) => slot !== null);
    const result = game.place(trayIndex, 0, 7);
    if (!result.ok) throw new Error('Expected the final synthetic DOT placement to be legal');

    expect(result.cellsCleared).toBe(8);
    expect(announceClear(status, previous, result.state)).toBe(
      '1 line cleared (1 row). 80 points earned. Score: 80. Combo: 1; score multiplier: ×1.',
    );
  });

  it('announces a single row clear with points, total score, and combo', () => {
    const status = { textContent: '' };
    const result = nextState(80, 1, [2], [], 8, 1);

    expect(announceClear(status, { score: 0 }, result)).toBe(
      '1 line cleared (1 row). 80 points earned. Score: 80. Combo: 1; score multiplier: ×1.',
    );
    expect(status.textContent).toBe(
      '1 line cleared (1 row). 80 points earned. Score: 80. Combo: 1; score multiplier: ×1.',
    );
  });

  it('announces a single column clear using column wording', () => {
    expect(
      formatClearAnnouncement(
        { score: 120 },
        nextState(200, 2, [], [5], 8, 2),
      ),
    ).toBe(
      '1 line cleared (1 column). 80 points earned. Score: 200. Combo: 2; score multiplier: ×2.',
    );
  });

  it('counts multiple row and column clears and reports the applied multiplier', () => {
    const result = nextState(400, 2, [1], [6], 15, 2);

    expect(formatClearAnnouncement({ score: 100 }, result)).toBe(
      '2 lines cleared (1 row and 1 column). 300 points earned. Score: 400. Combo: 2; score multiplier: ×2.',
    );
  });

  it('counts multiple clears in the same direction', () => {
    expect(
      formatClearAnnouncement(
        { score: 40 },
        nextState(200, 1, [0, 1], [], 16, 1),
      ),
    ).toBe(
      '2 lines cleared (2 rows). 160 points earned. Score: 200. Combo: 1; score multiplier: ×1.',
    );
  });
});
