import type { GameState } from '../game/engine';

export function showScreen(id: string): void {
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach((el) => {
    el.hidden = el.dataset.screen !== id;
  });
}

/** Run Retry, then return focus to the playable board after the overlay is hidden. */
export function bindRetryButton(
  retryButton: HTMLElement,
  board: HTMLElement,
  onRetry: () => void,
): void {
  retryButton.addEventListener('click', () => {
    onRetry();
    board.focus();
  });
}

export function fillGameOver(overlay: HTMLElement, state: GameState): void {
  const score = overlay.querySelector('[data-go-score]');
  const best = overlay.querySelector('[data-go-best]');
  const peak = overlay.querySelector('[data-go-peak]');
  const badge = overlay.querySelector('[data-go-newbest]') as HTMLElement | null;
  if (score) score.textContent = String(state.score);
  if (best) best.textContent = String(state.bestScore);
  if (peak) peak.textContent = String(state.comboPeak);
  const isNew = state.score > 0 && state.newBest;
  if (badge) badge.hidden = !isNew;
}

export function shareText(state: GameState): string {
  if (state.mode === 'daily' && state.dailyKey) {
    return `GlowGrid Daily ${state.dailyKey} — I scored ${state.score.toLocaleString()} (combo x${state.comboPeak}) 🟩⚡`;
  }
  return `GlowGrid — I scored ${state.score.toLocaleString()} (combo x${state.comboPeak}) 🟩⚡`;
}

export async function tryShare(state: GameState): Promise<void> {
  const text = shareText(state);
  if (navigator.share) {
    try {
      await navigator.share({ title: 'GlowGrid', text });
      return;
    } catch {
      /* cancelled */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}
