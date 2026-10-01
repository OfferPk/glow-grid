import type { GameState } from '../game/engine';

type PreviousScore = Pick<GameState, 'score'>;
type ClearResult = Pick<GameState, 'score' | 'combo' | 'lastClear'>;

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** Format the result of a placement that cleared one or more rows or columns. */
export function formatClearAnnouncement(
  previous: PreviousScore,
  next: ClearResult,
): string | null {
  const rows = next.lastClear?.rows.length ?? 0;
  const columns = next.lastClear?.cols.length ?? 0;
  const lineCount = rows + columns;
  if (lineCount === 0) return null;

  const details: string[] = [];
  if (rows > 0) details.push(`${rows} ${plural(rows, 'row', 'rows')}`);
  if (columns > 0) {
    details.push(`${columns} ${plural(columns, 'column', 'columns')}`);
  }

  const pointsEarned = next.score - previous.score;
  const multiplier = next.lastClear?.mult ?? 1;
  return `${lineCount} ${plural(lineCount, 'line', 'lines')} cleared (${details.join(' and ')}). ` +
    `${pointsEarned} ${plural(pointsEarned, 'point', 'points')} earned. ` +
    `Score: ${next.score}. Combo: ${next.combo}; score multiplier: ×${multiplier}.`;
}

/** Update an existing polite status region only when a line was cleared. */
export function announceClear(
  target: Pick<HTMLElement, 'textContent'>,
  previous: PreviousScore,
  next: ClearResult,
): string | null {
  const message = formatClearAnnouncement(previous, next);
  if (message !== null) target.textContent = message;
  return message;
}
