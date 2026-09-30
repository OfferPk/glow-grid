import type { GameState } from '../game/engine';

const COMBO_POP_DURATION_MS = 700;
const reducedMotionTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function updateHud(root: HTMLElement, state: GameState): void {
  const score = root.querySelector('[data-score]') as HTMLElement | null;
  const best = root.querySelector('[data-best]') as HTMLElement | null;
  const combo = root.querySelector('[data-combo]') as HTMLElement | null;
  const mode = root.querySelector('[data-mode]') as HTMLElement | null;
  if (score) score.textContent = String(state.score);
  if (best) best.textContent = String(state.bestScore);
  if (combo) {
    combo.textContent = state.combo > 0 ? `x${state.combo}` : '—';
    combo.classList.toggle('hot', state.combo >= 2);
  }
  if (mode) {
    if (state.mode === 'daily' && state.dailyKey) {
      mode.textContent = `Daily ${state.dailyKey}`;
      mode.classList.add('daily');
    } else {
      mode.textContent = 'Endless';
      mode.classList.remove('daily');
    }
  }
}

export function showComboPop(el: HTMLElement, text: string): void {
  const existingTimer = reducedMotionTimers.get(el);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
    reducedMotionTimers.delete(el);
  }
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    reducedMotionTimers.set(
      el,
      setTimeout(() => {
        el.classList.remove('pop');
        reducedMotionTimers.delete(el);
      }, COMBO_POP_DURATION_MS),
    );
  }
}
