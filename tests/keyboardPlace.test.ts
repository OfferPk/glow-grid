// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  attachPracticeRewindShortcutListener,
  attachTrayShortcutListener,
  centerGridCursor,
  isCancelKey,
  isConfirmKey,
  moveGridCursor,
  trayShortcutIndex,
} from '../src/input/keyboardPlace';

const cleanups: Array<() => void> = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.innerHTML = '';
});

function installShortcutListener() {
  const state = {
    playing: true,
    playVisible: true,
    tray: [true, true, true],
  };
  const selected: number[] = [];
  cleanups.push(
    attachTrayShortcutListener(
      document,
      (index) => state.playing && state.playVisible && Boolean(state.tray[index]),
      (index) => selected.push(index),
    ),
  );
  return { state, selected };
}

function keydown(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('keyboard board placement', () => {
  it('uses U to rewind only while a placement is undoable', () => {
    let canRewind = false;
    let rewinds = 0;
    cleanups.push(
      attachPracticeRewindShortcutListener(
        document,
        () => canRewind,
        () => { rewinds += 1; },
      ),
    );

    const unavailable = keydown(document.body, 'u');
    expect(unavailable.defaultPrevented).toBe(false);
    expect(rewinds).toBe(0);

    canRewind = true;
    const rewind = keydown(document.body, 'U');
    expect(rewind.defaultPrevented).toBe(true);
    expect(rewinds).toBe(1);

    const modified = keydown(document.body, 'u', { ctrlKey: true });
    expect(modified.defaultPrevented).toBe(false);
    expect(rewinds).toBe(1);
  });

  it('does not trigger rewind from an editable field or a repeated keydown', () => {
    let rewinds = 0;
    cleanups.push(
      attachPracticeRewindShortcutListener(
        document,
        () => true,
        () => { rewinds += 1; },
      ),
    );
    document.body.innerHTML = '<input id="editor">';
    const editor = document.getElementById('editor')!;
    editor.focus();
    expect(keydown(editor, 'u').defaultPrevented).toBe(false);
    expect(keydown(document.body, 'u', { repeat: true }).defaultPrevented).toBe(false);
    expect(rewinds).toBe(0);
  });

  it('starts the preview near the center of the 8×8 board', () => {
    expect(centerGridCursor()).toEqual({ row: 3, col: 3 });
  });

  it.each([
    ['ArrowUp', { row: 2, col: 3 }],
    ['ArrowDown', { row: 4, col: 3 }],
    ['ArrowLeft', { row: 3, col: 2 }],
    ['ArrowRight', { row: 3, col: 4 }],
  ])('moves one cell for %s', (key, expected) => {
    expect(moveGridCursor({ row: 3, col: 3 }, key)).toEqual(expected);
  });

  it('clamps movement at every board edge', () => {
    expect(moveGridCursor({ row: 0, col: 0 }, 'ArrowUp')).toEqual({ row: 0, col: 0 });
    expect(moveGridCursor({ row: 0, col: 0 }, 'ArrowLeft')).toEqual({ row: 0, col: 0 });
    expect(moveGridCursor({ row: 7, col: 7 }, 'ArrowDown')).toEqual({ row: 7, col: 7 });
    expect(moveGridCursor({ row: 7, col: 7 }, 'ArrowRight')).toEqual({ row: 7, col: 7 });
  });

  it('ignores keys that do not move the board cursor', () => {
    expect(moveGridCursor({ row: 3, col: 3 }, 'Escape')).toBeNull();
  });

  it.each(['Enter', ' ', 'Spacebar'])('accepts %j as a confirm key', (key) => {
    expect(isConfirmKey(key)).toBe(true);
  });

  it('accepts Escape as a selection-cancel key', () => {
    expect(isCancelKey('Escape')).toBe(true);
    expect(isCancelKey('Enter')).toBe(false);
  });

  it('does not treat unrelated keys as confirmation', () => {
    expect(isConfirmKey('Tab')).toBe(false);
    expect(isConfirmKey('r')).toBe(false);
  });

  it.each([
    ['1', 0],
    ['2', 1],
    ['3', 2],
  ])('maps tray shortcut %s to slot %i', (key, slot) => {
    expect(trayShortcutIndex(key)).toBe(slot);
  });

  it.each([
    ['Digit1', 0],
    ['Digit2', 1],
    ['Digit3', 2],
    ['Numpad1', 0],
    ['Numpad2', 1],
    ['Numpad3', 2],
  ])('maps physical key code %s to slot %i when key is unidentified', (code, slot) => {
    expect(trayShortcutIndex('Unidentified', code)).toBe(slot);
  });

  it.each(['0', '4', 'Escape', 'r', 'ArrowLeft'])('ignores non-tray shortcut %s', (key) => {
    expect(trayShortcutIndex(key)).toBeNull();
  });

  it.each([
    ['1', 0],
    ['2', 1],
    ['3', 2],
  ])('key %s selects tray slot %i from an actual keydown event', (key, slot) => {
    const { selected } = installShortcutListener();
    const event = keydown(document.body, key);

    expect(selected).toEqual([slot]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('accepts number shortcuts while the game board has keyboard focus', () => {
    const { selected } = installShortcutListener();
    document.body.innerHTML = '<canvas id="board" tabindex="0"></canvas>';
    const board = document.getElementById('board')!;
    board.focus();
    const event = keydown(board, '1');

    expect(document.activeElement).toBe(board);
    expect(selected).toEqual([0]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('handles a non-bubbling keydown dispatched at document capture', () => {
    const { selected } = installShortcutListener();
    const event = keydown(document, '2', { bubbles: false });

    expect(selected).toEqual([1]);
    expect(event.defaultPrevented).toBe(true);
  });

  it('uses the physical key code when key is Unidentified', () => {
    const { selected } = installShortcutListener();
    const event = keydown(document, 'Unidentified', { code: 'Digit3', bubbles: false });

    expect(selected).toEqual([2]);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ['input', '<input id="editor">'],
    ['textarea', '<textarea id="editor"></textarea>'],
    ['select', '<select id="editor"><option>One</option></select>'],
    ['contenteditable', '<div id="editor" contenteditable="true"><span>text</span></div>'],
  ])('does not consume shortcut keys from a focused %s', (_name, markup) => {
    const { selected } = installShortcutListener();
    document.body.innerHTML = markup;
    const editor = document.getElementById('editor')!;
    editor.focus();
    const event = keydown(editor, '1');

    expect(selected).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('honors editable focus even when the browser targets document directly', () => {
    const { selected } = installShortcutListener();
    document.body.innerHTML = '<input id="editor">';
    document.getElementById('editor')!.focus();
    const event = keydown(document, '1', { bubbles: false });

    expect(selected).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it.each([
    ['alt', { altKey: true }],
    ['control', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['repeat', { repeat: true }],
  ])('ignores %s-modified or repeated keydown', (_name, init) => {
    const { selected } = installShortcutListener();
    const event = keydown(document.body, '1', init);

    expect(selected).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores shortcuts when play is inactive, hidden, or the tray slot is empty', () => {
    const { state, selected } = installShortcutListener();

    state.playing = false;
    keydown(document.body, '1');
    state.playing = true;

    state.playVisible = false;
    keydown(document.body, '2');
    state.playVisible = true;

    state.tray[2] = false;
    const emptySlotEvent = keydown(document.body, '3');

    expect(selected).toEqual([]);
    expect(emptySlotEvent.defaultPrevented).toBe(false);
  });
});
