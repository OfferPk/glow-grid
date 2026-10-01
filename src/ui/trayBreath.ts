import type { GameState } from '../game/engine';

export const TRAY_BREATH_DURATION_MS = 10_000;
const RING_SIZE = 14;
const RING_GAP = 2;

type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>;
type TraySnapshot = Pick<GameState, 'tray'>;

/** Keep one ring and a small gap above the centered board whenever the wrapper permits it. */
export function boardSizeWithCueClearance(byWidth: number, byHeight: number, wrapHeight: number): number {
  const cueSpace = RING_SIZE + RING_GAP;
  const maxByWrap =
    wrapHeight >= cueSpace * 2
      ? wrapHeight - cueSpace * 2
      : Math.min(byWidth, byHeight || byWidth);
  return Math.max(0, Math.min(byWidth, byHeight || byWidth, maxByWrap));
}

/** True only when the last live tray piece was used and a fresh three-piece tray appeared. */
export function trayWasRefreshed(previous: TraySnapshot, next: TraySnapshot): boolean {
  return (
    previous.tray.filter((slot) => slot !== null).length === 1 &&
    next.tray.length === 3 &&
    next.tray.every((slot) => slot !== null)
  );
}

/** Place the cue in the largest available vertical gap, fully outside the board when space allows. */
export function trayBreathPosition(board: Rect, wrap: Rect): { left: number; top: number } {
  const topGap = board.top - wrap.top;
  const bottomGap = wrap.bottom - board.bottom;
  const centeredLeft = board.left - wrap.left + (board.width - RING_SIZE) / 2;
  const left = Math.max(0, Math.min(wrap.width - RING_SIZE, centeredLeft));
  let top: number;

  if (topGap >= RING_SIZE + RING_GAP) {
    top = board.top - wrap.top - RING_SIZE - RING_GAP;
  } else if (bottomGap >= RING_SIZE + RING_GAP) {
    top = board.bottom - wrap.top + RING_GAP;
  } else {
    // Extremely short viewports may have no free gap; stay within the board wrapper
    // rather than covering the tray controls below it.
    top = Math.max(0, Math.min(wrap.height - RING_SIZE, board.top - wrap.top));
  }
  return { left, top };
}

/** Cache the cue's position during layout, not in the placement/input event path. */
export function positionTrayBreathCue(
  container: HTMLElement,
  board: HTMLElement,
  wrap: HTMLElement,
): void {
  const position = trayBreathPosition(board.getBoundingClientRect(), wrap.getBoundingClientRect());
  container.style.setProperty('--tray-breath-left', `${position.left}px`);
  container.style.setProperty('--tray-breath-top', `${position.top}px`);
}

/** Add one non-interactive visual cue. CSS supplies motion; removal never blocks input. */
export function showTrayBreathCue(container: HTMLElement): void {
  const ring = document.createElement('span');
  ring.className = 'tray-breath-ring';
  ring.setAttribute('aria-hidden', 'true');
  container.hidden = false;
  container.append(ring);

  const remove = (): void => {
    ring.remove();
    if (container.childElementCount === 0) container.hidden = true;
  };
  ring.addEventListener('animationend', remove, { once: true });
  // Reduced-motion CSS disables animationend, so this timer also clears static cues.
  window.setTimeout(remove, TRAY_BREATH_DURATION_MS);
}
