export const INVALID_PLACEMENT_MESSAGE =
  'That spot is blocked or outside the board. Try a different cell.';

const DEFAULT_DURATION_MS = 2_200;

/** Show a brief, non-animated status message and replace stale timers safely. */
export function createPlacementFeedback(
  target: Pick<HTMLElement, 'hidden' | 'textContent'>,
  durationMs = DEFAULT_DURATION_MS,
): { show: (message: string) => void; clear: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    target.hidden = true;
    target.textContent = '';
  };

  const show = (message: string): void => {
    if (timer !== undefined) clearTimeout(timer);
    target.textContent = message;
    target.hidden = false;
    timer = setTimeout(clear, durationMs);
  };

  return { show, clear };
}
