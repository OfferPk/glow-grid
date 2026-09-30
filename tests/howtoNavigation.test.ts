import { describe, expect, it } from 'vitest';
import { getHowtoReturnScreen } from '../src/ui/howtoNavigation';

describe('How-to navigation', () => {
  it('continues the selected game after first-run instructions', () => {
    expect(getHowtoReturnScreen('first-run-play')).toBe('play');
  });

  it('returns to Home when instructions were opened from Home', () => {
    expect(getHowtoReturnScreen('home')).toBe('home');
  });
});
