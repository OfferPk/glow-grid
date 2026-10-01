import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPlacementFeedback,
  INVALID_PLACEMENT_MESSAGE,
} from '../src/ui/placementFeedback';

describe('placement feedback', () => {
  afterEach(() => vi.useRealTimers());

  it('shows an invalid-placement message and hides it after the brief timeout', () => {
    vi.useFakeTimers();
    const target = { hidden: true, textContent: '' };
    const feedback = createPlacementFeedback(target, 2_200);

    feedback.show(INVALID_PLACEMENT_MESSAGE);

    expect(target.hidden).toBe(false);
    expect(target.textContent).toBe(
      'That spot is blocked or outside the board. Try a different cell.',
    );
    vi.advanceTimersByTime(2_200);
    expect(target.hidden).toBe(true);
    expect(target.textContent).toBe('');
  });

  it('replaces an earlier timeout and can clear immediately', () => {
    vi.useFakeTimers();
    const target = { hidden: true, textContent: '' };
    const feedback = createPlacementFeedback(target, 2_200);

    feedback.show('First message');
    vi.advanceTimersByTime(1_500);
    feedback.show('Second message');
    vi.advanceTimersByTime(800);
    expect(target.textContent).toBe('Second message');
    expect(target.hidden).toBe(false);

    feedback.clear();
    expect(target.hidden).toBe(true);
    expect(target.textContent).toBe('');
    vi.advanceTimersByTime(2_200);
    expect(target.hidden).toBe(true);
  });
});
