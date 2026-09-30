import './style.css';
import { createGame, type Engine, type GameState } from './game/engine';
import { dailyKeyKarachi } from './game/rng';
import {
  getBestScore,
  getDailyRecord,
  getSettings,
  getStreak,
  isOnboarded,
  setOnboarded,
  setSettings,
} from './game/persist';
import {
  homeDailyCta,
  millisecondsUntilNextKarachiMidnight,
} from './ui/homeDaily';
import { getHowtoReturnScreen, type HowtoEntry } from './ui/howtoNavigation';
import {
  drawBoard,
  drawTraySlot,
  resizeCanvas,
  type ClearFlash,
  type HoverPreview,
} from './render/canvas';
import { showComboPop, updateHud } from './ui/hud';
import {
  bindHomeButton,
  bindRetryButton,
  fillGameOver,
  showScreen,
  tryShare,
} from './ui/overlays';
import { attachWindowPointerDrag, resolveTrayBoardDrop } from './input/dragPlace';
import { centerGridCursor, isConfirmKey, moveGridCursor } from './input/keyboardPlace';

let engine: Engine = createGame({ mode: 'endless' });
let selectedTray: number | null = null;
let keyboardCursor = centerGridCursor();
let cellSize = 40;
let flash: ClearFlash | null = null;
let hover: HoverPreview = null;
let muted = getSettings().muted;
let dragTray: number | null = null;
let pointerPlaced = false;
let howtoEntry: HowtoEntry = 'home';

const board = document.getElementById('board') as HTMLCanvasElement;
const hud = document.getElementById('hud')!;
const comboPop = document.getElementById('combo-pop')!;
const keyboardStatus = document.getElementById('keyboard-status')!;
const gameover = document.getElementById('gameover')!;
const trayCanvases = [
  ...document.querySelectorAll<HTMLCanvasElement>('[data-tray]'),
].sort((a, b) => Number(a.dataset.tray) - Number(b.dataset.tray));

function state(): GameState {
  return engine.getState();
}

function vibrate(ms: number): void {
  if (muted) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

function updateMuteButtons(): void {
  const home = document.getElementById('btn-mute-home');
  const play = document.getElementById('btn-mute');
  if (home) home.textContent = muted ? '🔇 Muted' : '🔊 Sound';
  if (play) play.textContent = muted ? '🔇' : '🔊';
}

function layout(): void {
  const wrap = board.parentElement!;
  const byWidth = Math.floor(wrap.clientWidth);
  const byVh = Math.floor(window.innerHeight * 0.72);
  const css = Math.max(0, Math.min(byWidth, byVh || byWidth));
  const { cell } = resizeCanvas(board, css);
  const live = board.getBoundingClientRect().width;
  cellSize = live > 0 ? live / 8 : cell;
  render();
}

function render(): void {
  const st = state();
  const ctx = board.getContext('2d')!;
  drawBoard(ctx, st, cellSize, flash, hover, performance.now());
  trayCanvases.forEach((cv, i) => {
    cv.setAttribute('aria-pressed', String(selectedTray === i));
    cv.setAttribute('aria-disabled', String(st.tray[i] === null));
    drawTraySlot(cv, st.tray[i]!, selectedTray === i);
  });
  updateHud(hud, st);
  if (st.status === 'gameover') {
    fillGameOver(gameover, st);
    gameover.hidden = false;
  }
}

function onPlaceSuccess(prev: GameState, next: GameState, cellsCleared: number): void {
  selectedTray = null;
  if (cellsCleared > 0 && next.lastClear) {
    const gained = cellsCleared * 10 * (next.lastClear.mult || 1);
    flash = {
      rows: next.lastClear.rows,
      cols: next.lastClear.cols,
      until: performance.now() + 280,
    };
    showComboPop(
      comboPop,
      next.combo >= 2 ? `COMBO x${next.combo} +${gained}` : `+${gained}`,
    );
    vibrate(next.combo >= 2 ? 30 : 15);
    requestAnimationFrame(function tick(now) {
      render();
      if (flash && now < flash.until) requestAnimationFrame(tick);
      else flash = null;
    });
  }
  if (next.status === 'gameover' && prev.status !== 'gameover') {
    vibrate(40);
  }
  render();
}

function attemptPlace(trayIndex: number, row: number, col: number): boolean {
  const prev = state();
  const result = engine.place(trayIndex, row, col);
  if (result.ok) {
    onPlaceSuccess(prev, result.state, result.cellsCleared);
    return true;
  }
  render();
  return false;
}

function announceKeyboard(message: string): void {
  keyboardStatus.textContent = message;
}

/** Keyboard piece selection moves focus to the board for immediate placement navigation. */
function selectTrayForKeyboard(index: number): void {
  if (state().status !== 'playing' || !state().tray[index]) return;
  selectedTray = index;
  keyboardCursor = centerGridCursor();
  hover = { trayIndex: index, row: keyboardCursor.row, col: keyboardCursor.col };
  render();
  board.focus();
  announceKeyboard(
    `Piece ${index + 1} selected. Preview at row ${keyboardCursor.row + 1}, column ${keyboardCursor.col + 1}. Use arrow keys to move it, then Enter or Space to place.`,
  );
}

function startMode(mode: 'endless' | 'daily'): void {
  engine = createGame({
    mode,
    dailyKey: mode === 'daily' ? dailyKeyKarachi() : undefined,
  });
  selectedTray = null;
  keyboardCursor = centerGridCursor();
  gameover.hidden = true;
  flash = null;
  hover = null;
  hideA2hs();
  showScreen('play');
  layout();
  if (!isOnboarded()) {
    howtoEntry = 'first-run-play';
    showScreen('howto');
  }
}

function boardRect(): DOMRect {
  return board.getBoundingClientRect();
}

function updateDragHover(clientX: number, clientY: number): void {
  const idx = dragTray ?? selectedTray;
  if (idx === null) {
    hover = null;
    return;
  }
  const drop = resolveTrayBoardDrop(idx, boardRect(), clientX, clientY, cellSize);
  hover = drop
    ? { trayIndex: drop.trayIndex, row: drop.row, col: drop.col }
    : null;
  render();
}

/** Finish an active tray→board drag (window-tracked pointer). */
function finishDrag(clientX: number, clientY: number): void {
  const idx = dragTray;
  if (idx !== null) {
    const drop = resolveTrayBoardDrop(idx, boardRect(), clientX, clientY, cellSize);
    if (drop) {
      pointerPlaced = attemptPlace(drop.trayIndex, drop.row, drop.col);
    }
  }
  dragTray = null;
  hover = null;
  render();
}

function cancelDrag(): void {
  dragTray = null;
  hover = null;
  render();
}

/** Detach for active window-tracked tray→board drag (GG-002). */
let detachActiveDrag: (() => void) | null = null;

function beginTrayDrag(trayIndex: number, e: PointerEvent): void {
  // End any prior drag session
  detachActiveDrag?.();
  detachActiveDrag = null;
  selectedTray = trayIndex;
  dragTray = trayIndex;
  pointerPlaced = false;
  // Do NOT setPointerCapture on tray — track on window so board hit-test works.
  detachActiveDrag = attachWindowPointerDrag(window, e.pointerId, {
    onMove: (x, y) => {
      if (dragTray === null) return;
      updateDragHover(x, y);
    },
    onUp: (x, y) => {
      detachActiveDrag = null;
      try {
        const el = e.currentTarget as Element | null;
        if (el && 'hasPointerCapture' in el && (el as Element & { hasPointerCapture(id: number): boolean }).hasPointerCapture(e.pointerId)) {
          (el as Element & { releasePointerCapture(id: number): void }).releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      finishDrag(x, y);
    },
    onCancel: () => {
      detachActiveDrag = null;
      cancelDrag();
    },
  });
  render();
}

// Board: tap-selected piece preview + place (tap path).
board.addEventListener('pointerdown', (e) => {
  if (state().status !== 'playing') return;
  if (dragTray !== null) return;
  pointerPlaced = false;
  if (selectedTray === null) return;
  updateDragHover(e.clientX, e.clientY);
});

board.addEventListener('pointermove', (e) => {
  if (dragTray !== null) return;
  if (selectedTray === null) return;
  updateDragHover(e.clientX, e.clientY);
});

board.addEventListener('pointerup', (e) => {
  if (dragTray !== null) return;
  if (selectedTray === null) return;
  const drop = resolveTrayBoardDrop(selectedTray, boardRect(), e.clientX, e.clientY, cellSize);
  if (drop) {
    pointerPlaced = attemptPlace(drop.trayIndex, drop.row, drop.col);
  }
  hover = null;
  render();
});

board.addEventListener('pointercancel', () => {
  if (dragTray !== null) return;
  hover = null;
  render();
});

board.addEventListener('keydown', (e) => {
  if (state().status !== 'playing' || selectedTray === null || !state().tray[selectedTray]) return;
  const nextCursor = moveGridCursor(keyboardCursor, e.key);
  if (nextCursor) {
    e.preventDefault();
    keyboardCursor = nextCursor;
    hover = {
      trayIndex: selectedTray,
      row: keyboardCursor.row,
      col: keyboardCursor.col,
    };
    render();
    announceKeyboard(`Placement preview at row ${keyboardCursor.row + 1}, column ${keyboardCursor.col + 1}.`);
    return;
  }
  if (isConfirmKey(e.key)) {
    e.preventDefault();
    const trayIndex = selectedTray;
    const placed = attemptPlace(trayIndex, keyboardCursor.row, keyboardCursor.col);
    if (placed) {
      hover = null;
      render();
    }
    announceKeyboard(
      placed
        ? `Piece ${trayIndex + 1} placed.`
        : `That placement does not fit. Move the preview with the arrow keys and try again.`,
    );
  }
});

// Tray: pointerdown starts window-tracked drag; tap still selects.
trayCanvases.forEach((cv, i) => {
  cv.addEventListener('pointerdown', (e) => {
    if (state().status !== 'playing' || !state().tray[i]) return;
    e.preventDefault();
    beginTrayDrag(i, e);
  });
  cv.addEventListener('click', () => {
    if (state().status !== 'playing' || !state().tray[i]) return;
    selectedTray = i;
    render();
  });
  cv.addEventListener('keydown', (e) => {
    if (!isConfirmKey(e.key)) return;
    e.preventDefault();
    selectTrayForKeyboard(i);
  });
});

document.getElementById('btn-rotate')!.addEventListener('click', () => {
  if (selectedTray === null) {
    const st = state();
    const first = st.tray.findIndex((s) => s != null);
    if (first >= 0) selectedTray = first;
  }
  if (selectedTray !== null) {
    engine.rotateTraySlot(selectedTray);
    render();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    const playScreen = document.querySelector<HTMLElement>('[data-screen="play"]');
    if (playScreen?.hidden || state().status !== 'playing') return;
    if (selectedTray === null) {
      const first = state().tray.findIndex((s) => s != null);
      if (first >= 0) {
        selectedTray = first;
        keyboardCursor = centerGridCursor();
        hover = { trayIndex: first, row: keyboardCursor.row, col: keyboardCursor.col };
      }
    }
    if (selectedTray !== null) {
      e.preventDefault();
      engine.rotateTraySlot(selectedTray);
      render();
      announceKeyboard(`Piece ${selectedTray + 1} rotated.`);
    }
  }
});

function toggleMute(): void {
  muted = !muted;
  setSettings({ muted });
  updateMuteButtons();
}

document.getElementById('btn-mute')!.addEventListener('click', toggleMute);
document.getElementById('btn-mute-home')!.addEventListener('click', toggleMute);
document.getElementById('btn-endless')!.addEventListener('click', () => startMode('endless'));
document.getElementById('btn-daily')!.addEventListener('click', () => {
  refreshHome();
  const action = (document.getElementById('btn-daily') as HTMLButtonElement).dataset.action;
  startMode(action === 'endless' ? 'endless' : 'daily');
});
document.getElementById('btn-howto')!.addEventListener('click', () => {
  howtoEntry = 'home';
  showScreen('howto');
});
document.getElementById('btn-howto-ok')!.addEventListener('click', () => {
  const destination = getHowtoReturnScreen(howtoEntry);
  howtoEntry = 'home';
  setOnboarded(true);
  if (destination === 'play') {
    hideA2hs();
    showScreen('play');
    layout();
  } else {
    showScreen('home');
    maybeShowA2hs();
  }
});

function returnHome(): void {
  gameover.hidden = true;
  refreshHome();
  showScreen('home');
  maybeShowA2hs();
}

const homePrimaryCta = document.getElementById('btn-endless')!;
bindHomeButton(document.getElementById('btn-home')!, homePrimaryCta, returnHome);

bindRetryButton(document.getElementById('btn-retry')!, board, () => {
  engine.restart();
  selectedTray = null;
  gameover.hidden = true;
  flash = null;
  layout();
});

bindHomeButton(document.getElementById('btn-go-home')!, homePrimaryCta, returnHome);

document.getElementById('btn-share')!.addEventListener('click', () => {
  void tryShare(state());
});

function refreshHome(): void {
  const best = document.getElementById('home-best');
  if (best) best.textContent = String(getBestScore());
  const key = dailyKeyKarachi();
  const finished = Boolean(getDailyRecord(key)?.finished);
  const cta = homeDailyCta(key, finished);
  const daily = document.getElementById('daily-label');
  if (daily) daily.textContent = cta.label;
  const meta = document.getElementById('daily-meta');
  if (meta) meta.textContent = cta.meta;
  const dailyBtn = document.getElementById('btn-daily') as HTMLButtonElement | null;
  if (dailyBtn) dailyBtn.dataset.action = cta.action;
  const streak = getStreak();
  const streakEl = document.getElementById('home-streak');
  const streakCount = document.getElementById('streak-count');
  if (streakEl && streakCount) {
    if (streak.count >= 1) {
      streakEl.hidden = false;
      streakCount.textContent = String(streak.count);
    } else {
      streakEl.hidden = true;
    }
  }
  updateMuteButtons();
}

function refreshHomeIfVisible(): void {
  const home = document.querySelector<HTMLElement>('[data-screen="home"]');
  if (!document.hidden && home && !home.hidden) refreshHome();
}

function scheduleDailyHomeRefresh(): void {
  const delay = millisecondsUntilNextKarachiMidnight(new Date());
  window.setTimeout(() => {
    refreshHomeIfVisible();
    scheduleDailyHomeRefresh();
  }, delay + 25);
}

window.addEventListener('focus', refreshHomeIfVisible);
document.addEventListener('visibilitychange', refreshHomeIfVisible);

const a2hs = document.getElementById('a2hs')!;
document.getElementById('a2hs-ok')!.addEventListener('click', () => {
  a2hs.hidden = true;
  try {
    sessionStorage.setItem('glowgrid:a2hs', '1');
  } catch {
    /* ignore */
  }
});

function hideA2hs(): void {
  a2hs.hidden = true;
}

/** Show A2HS only on Home — never during Play/Howto (GG-001). */
function maybeShowA2hs(): void {
  try {
    if (sessionStorage.getItem('glowgrid:a2hs')) {
      hideA2hs();
      return;
    }
  } catch {
    hideA2hs();
    return;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    hideA2hs();
    return;
  }
  // Home-only — never during Play/Howto so tray + Rotate stay hittable (GG-001).
  const home = document.querySelector<HTMLElement>('[data-screen="home"]');
  const play = document.querySelector<HTMLElement>('[data-screen="play"]');
  const howto = document.querySelector<HTMLElement>('[data-screen="howto"]');
  const onHome = Boolean(home && !home.hidden);
  const onPlay = Boolean(play && !play.hidden);
  const onHowto = Boolean(howto && !howto.hidden);
  if (!onHome || onPlay || onHowto) {
    hideA2hs();
    return;
  }
  a2hs.hidden = false;
}

window.addEventListener('resize', layout);
refreshHome();
showScreen('home');
maybeShowA2hs();
scheduleDailyHomeRefresh();

async function registerSW(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch {
    /* dev without virtual module */
  }
}
void registerSW();

// Tap-cell fallback when piece selected (if pointerup didn't place)
board.addEventListener('click', (e) => {
  if (pointerPlaced) return;
  if (selectedTray === null || state().status !== 'playing') return;
  const drop = resolveTrayBoardDrop(selectedTray, boardRect(), e.clientX, e.clientY, cellSize);
  if (!drop) return;
  attemptPlace(drop.trayIndex, drop.row, drop.col);
});

(window as unknown as { __glow?: unknown }).__glow = {
  getState: () => state(),
  engine: () => engine,
};
