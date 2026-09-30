// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyClearScore } from '../src/game/score.ts';
import type { GameState } from '../src/game/engine.ts';
import { showComboPop, updateHud } from '../src/ui/hud.ts';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('reduced-motion combo feedback', () => {
  it('disables only the combo popup animation and keeps it in a static position', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');
    const stylesheet = postcss.parse(css);
    const reducedMotion = stylesheet.nodes.find(
      (node) =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params.trim() === '(prefers-reduced-motion: reduce)',
    );

    expect(reducedMotion?.type).toBe('atrule');
    if (!reducedMotion || reducedMotion.type !== 'atrule') return;
    const popup = reducedMotion.nodes.find(
      (node) => node.type === 'rule' && node.selector === '.combo-pop.pop',
    );

    expect(popup?.type).toBe('rule');
    if (!popup || popup.type !== 'rule') return;
    expect(popup.nodes.find((node) => node.type === 'decl' && node.prop === 'animation')?.value).toBe('none');
    expect(popup.nodes.find((node) => node.type === 'decl' && node.prop === 'opacity')?.value).toBe('1');
    expect(popup.nodes.find((node) => node.type === 'decl' && node.prop === 'transform')?.value).toBe('translate(-50%, 0)');
  });

  it('keeps the combo cue visible for 700 ms without animation when motion is reduced', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }),
    );
    const popup = document.createElement('div');

    showComboPop(popup, 'COMBO x2 +160');
    expect(popup.textContent).toBe('COMBO x2 +160');
    expect(popup.classList.contains('pop')).toBe(true);
    vi.advanceTimersByTime(699);
    expect(popup.classList.contains('pop')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(popup.classList.contains('pop')).toBe(false);
  });

  it('leaves score, multiplier, and visible combo feedback unchanged', () => {
    const first = applyClearScore(0, 8);
    const second = applyClearScore(first.newCombo, 8);
    expect(first).toEqual({ scoreDelta: 80, newCombo: 1, mult: 1 });
    expect(second).toEqual({ scoreDelta: 160, newCombo: 2, mult: 2 });

    const hud = document.createElement('div');
    hud.innerHTML = '<span data-score></span><span data-best></span><span data-combo></span><span data-mode></span>';
    updateHud(hud, {
      score: first.scoreDelta + second.scoreDelta,
      bestScore: 0,
      combo: second.newCombo,
      mode: 'endless',
      dailyKey: null,
    } as unknown as GameState);

    expect(hud.querySelector('[data-score]')?.textContent).toBe('240');
    expect(hud.querySelector('[data-combo]')?.textContent).toBe('x2');
    expect(hud.querySelector('[data-combo]')?.classList.contains('hot')).toBe(true);
  });
});
