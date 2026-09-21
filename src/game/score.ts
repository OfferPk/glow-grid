/** Locked scoring formula for GlowGrid MVP. */

export const CELL_POINTS = 10;
export const MAX_MULT = 5;

export type ScoreResult = {
  scoreDelta: number;
  newCombo: number;
  mult: number;
};

/**
 * cellsCleared = cells removed this placement
 * if 0: combo = 0; score += 0
 * else: combo += 1; mult = min(5, 1 + floor(combo/2)); score += cellsCleared * 10 * mult
 */
export function applyClearScore(
  currentCombo: number,
  cellsCleared: number,
): ScoreResult {
  if (cellsCleared <= 0) {
    return { scoreDelta: 0, newCombo: 0, mult: 1 };
  }
  const newCombo = currentCombo + 1;
  const mult = Math.min(MAX_MULT, 1 + Math.floor(newCombo / 2));
  const scoreDelta = cellsCleared * CELL_POINTS * mult;
  return { scoreDelta, newCombo, mult };
}
