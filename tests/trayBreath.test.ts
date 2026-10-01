// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss from 'postcss';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame, canPlace } from '../src/game/engine.ts';
import { GRID_SIZE } from '../src/game/pieces.ts';
import { createDailyRng } from '../src/game/rng.ts';
import { getSettings, setSettings } from '../src/game/persist.ts';
import {
  boardSizeWithCueClearance,
  positionTrayBreathCue,
  showTrayBreathCue,
  trayBreathPosition,
  trayWasRefreshed,
  TRAY_BREATH_DURATION_MS,
} from '../src/ui/trayBreath.ts';

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  localStorage.clear();
});

describe('Tray Breath preference', () => {
  it('defaults off and persists without overwriting the mute preference', () => {
    expect(getSettings()).toEqual({ muted: false, trayBreath: false });
    setSettings({ trayBreath: true });
    setSettings({ muted: true });
    expect(getSettings()).toEqual({ muted: true, trayBreath: true });
  });
});

describe('tray refresh observation', () => {
  it('detects only the transition from one remaining piece to a full new tray', () => {
    const engine = createGame({
      mode: 'daily',
      dailyKey: '2026-10-02',
      rng: () => 0,
      skipPersist: true,
    });
    let previous = engine.getState();
    const first = engine.place(0, 0, 0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(trayWasRefreshed(previous, first.state)).toBe(false);
    previous = first.state;

    const second = engine.place(1, 0, 1);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(trayWasRefreshed(previous, second.state)).toBe(false);
    previous = second.state;

    const third = engine.place(2, 0, 2);
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(trayWasRefreshed(previous, third.state)).toBe(true);
  });

  it('keeps deterministic seeded gameplay identical with the cue off or on', () => {
    function play(date: string, cueEnabled: boolean) {
      const engine = createGame({
        mode: 'daily',
        dailyKey: date,
        rng: createDailyRng(date),
        skipPersist: true,
      });
      const trace: Array<{
        placement: { trayIndex: number; row: number; col: number };
        placed: number;
        tray: Array<string | null>;
        score: number;
        combo: number;
        comboPeak: number;
        linesClearedTotal: number;
        lastClear: number;
        status: string;
      }> = [];
      let refreshes = 0;
      let cues = 0;
      const refreshedAt: number[] = [];

      for (let step = 0; step < 220; step++) {
        const previous = engine.getState();
        if (previous.status === 'gameover') break;
        let result: ReturnType<typeof engine.place> | null = null;
        let placement: { trayIndex: number; row: number; col: number } | null = null;
        for (let trayIndex = 0; trayIndex < previous.tray.length && !result; trayIndex++) {
          const slot = previous.tray[trayIndex];
          if (!slot) continue;
          for (let row = 0; row < GRID_SIZE && !result; row++) {
            for (let col = 0; col < GRID_SIZE && !result; col++) {
              if (canPlace(previous.grid, slot.def, slot.rotation, row, col)) {
                placement = { trayIndex, row, col };
                result = engine.place(trayIndex, row, col);
              }
            }
          }
        }
        if (!result || !result.ok) break;
        const refreshed = trayWasRefreshed(previous, result.state);
        if (refreshed) {
          refreshes++;
          refreshedAt.push(result.state.piecesPlaced);
          if (cueEnabled) cues++;
        }
        trace.push({
          placement: placement!,
          placed: result.state.piecesPlaced,
          tray: result.state.tray.map((slot) => slot?.def.id ?? null),
          score: result.state.score,
          combo: result.state.combo,
          comboPeak: result.state.comboPeak,
          linesClearedTotal: result.state.linesClearedTotal,
          lastClear: result.cellsCleared,
          status: result.state.status,
        });
      }
      return { trace, refreshes, refreshedAt, cues };
    }

    for (const date of ['2026-10-02', '2026-10-03', '2026-10-04']) {
      const off = play(date, false);
      const on = play(date, true);
      expect(on.trace).toEqual(off.trace);
      expect(on.refreshes).toBe(off.refreshes);
      expect(on.refreshedAt).toEqual(off.refreshedAt);
      expect(off.refreshes).toBeGreaterThan(0);
      expect(off.cues).toBe(0);
      expect(on.cues).toBe(on.refreshes);
      expect(off.trace.length).toBeGreaterThan(3);
      expect(off.trace.some((step) => step.lastClear > 0)).toBe(true);
      expect(off.trace.at(-1)?.score).toBeGreaterThan(0);
      expect(off.trace.some((step) => step.combo > 0)).toBe(true);
    }
  });
});

describe('cue position and lifecycle', () => {
  it('reserves an external ring gap when the play wrapper is height-constrained', () => {
    const size = boardSizeWithCueClearance(464, 449, 452);
    expect(size).toBe(420);
    expect((452 - size) / 2).toBeGreaterThanOrEqual(16);
    expect(boardSizeWithCueClearance(304, 388, 390)).toBe(304);

    const wrap = { left: 0, top: 0, right: 464, bottom: 452, width: 464, height: 452 };
    const board = { left: 22, top: 16, right: 442, bottom: 436, width: 420, height: 420 };
    const position = trayBreathPosition(board, wrap);
    expect(position.top + 14).toBeLessThanOrEqual(board.top);
    expect(position.top + 14).toBeLessThanOrEqual(wrap.height);
  });

  it('fits in a narrow 320px wrapper above the board without touching the tray area', () => {
    const wrap = { left: 0, top: 0, right: 320, bottom: 390, width: 320, height: 390 };
    const board = { left: 8, top: 24, right: 312, bottom: 328, width: 304, height: 304 };
    const position = trayBreathPosition(board, wrap);
    expect(position.left).toBeGreaterThanOrEqual(0);
    expect(position.left + 14).toBeLessThanOrEqual(320);
    expect(position.top + 14).toBeLessThanOrEqual(board.top - wrap.top);
    expect(position.top).toBeGreaterThanOrEqual(0);
  });

  it('keeps the three tray slots and Rotate control within a 320px play width', () => {
    const root = postcss.parse(readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8'));
    const narrow = root.nodes.find(
      (node) => node.type === 'atrule' && node.name === 'media' && node.params.trim() === '(max-width: 360px)',
    );
    expect(narrow?.type).toBe('atrule');
    if (!narrow || narrow.type !== 'atrule') return;
    const trayCanvas = narrow.nodes.find((node) => node.type === 'rule' && node.selector === '.tray-bar canvas');
    expect(trayCanvas?.type).toBe('rule');
    if (!trayCanvas || trayCanvas.type !== 'rule') return;
    expect(trayCanvas.nodes.find((node) => node.type === 'decl' && node.prop === 'width')?.value).toBe('64px');

    const rotate = root.nodes.find((node) => node.type === 'rule' && node.selector === '#btn-rotate');
    expect(rotate?.type).toBe('rule');
    if (!rotate || rotate.type !== 'rule') return;
    expect(rotate.nodes.find((node) => node.type === 'decl' && node.prop === 'min-width')?.value).toBe('64px');
    const controlsWidth = 3 * 64 + 64 + 3 * 0.45 * 16;
    expect(controlsWidth).toBeLessThanOrEqual(320 - 2 * 0.5 * 16);

    const cueLayer = root.nodes.find((node) => node.type === 'rule' && node.selector === '.tray-breath-cues');
    expect(cueLayer?.type).toBe('rule');
    if (!cueLayer || cueLayer.type !== 'rule') return;
    expect(cueLayer.nodes.find((node) => node.type === 'decl' && node.prop === 'position')?.value).toBe('absolute');
    expect(cueLayer.nodes.find((node) => node.type === 'decl' && node.prop === 'pointer-events')?.value).toBe('none');
  });

  it('shows each ring without intercepting input and removes it after ten seconds', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    container.hidden = true;
    const board = document.createElement('canvas');
    const wrap = document.createElement('div');
    Object.defineProperty(board, 'getBoundingClientRect', {
      value: () => ({ left: 8, top: 24, right: 312, bottom: 328, width: 304, height: 304 }),
    });
    Object.defineProperty(wrap, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 320, bottom: 390, width: 320, height: 390 }),
    });

    positionTrayBreathCue(container, board, wrap);
    expect(container.style.getPropertyValue('--tray-breath-left')).toBe('153px');
    expect(container.style.getPropertyValue('--tray-breath-top')).toBe('8px');
    showTrayBreathCue(container);
    expect(container.hidden).toBe(false);
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.firstElementChild?.className).toBe('tray-breath-ring');
    vi.advanceTimersByTime(TRAY_BREATH_DURATION_MS - 1);
    expect(container.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(container.hidden).toBe(true);
    expect(container.childElementCount).toBe(0);
  });

  it('uses one 4-second expansion and one 6-second contraction, but stays static under reduced motion', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');
    const root = postcss.parse(css);
    const animation = root.nodes.find(
      (node) => node.type === 'atrule' && node.name === 'keyframes' && node.params === 'trayBreath',
    );
    expect(animation?.type).toBe('atrule');
    if (!animation || animation.type !== 'atrule') return;
    expect(animation.nodes.map((node) => node.type === 'rule' ? node.selector : '')).toEqual(['0%', '40%', '100%']);

    const cueRule = root.nodes.find((node) => node.type === 'rule' && node.selector === '.tray-breath-ring');
    expect(cueRule?.type).toBe('rule');
    if (!cueRule || cueRule.type !== 'rule') return;
    expect(cueRule.nodes.find((node) => node.type === 'decl' && node.prop === 'animation')?.value).toBe('trayBreath 10s linear both');
    expect(cueRule.nodes.find((node) => node.type === 'decl' && node.prop === 'pointer-events')?.value).toBe('none');

    const reducedMotion = root.nodes.find(
      (node) => node.type === 'atrule' && node.name === 'media' && node.params.trim() === '(prefers-reduced-motion: reduce)',
    );
    expect(reducedMotion?.type).toBe('atrule');
    if (!reducedMotion || reducedMotion.type !== 'atrule') return;
    const staticCue = reducedMotion.nodes.find(
      (node) => node.type === 'rule' && node.selector === '.tray-breath-ring',
    );
    expect(staticCue?.type).toBe('rule');
    if (!staticCue || staticCue.type !== 'rule') return;
    expect(staticCue.nodes.find((node) => node.type === 'decl' && node.prop === 'animation')?.value).toBe('none');
    expect(staticCue.nodes.find((node) => node.type === 'decl' && node.prop === 'transform')?.value).toBe('scale(1)');
  });
});
