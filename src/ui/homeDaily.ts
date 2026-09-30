/** Pure helpers for Home daily CTA after complete (post-v0.1.0 improve). */

export type HomeDailyCta = {
  /** Button label text for #daily-label */
  label: string;
  /** Secondary meta / teaser line for #daily-meta */
  meta: string;
  /** Click routes to endless when finished, else daily seed play */
  action: 'daily' | 'endless';
};

/** Milliseconds until the next midnight in the game's fixed UTC+5 daily zone. */
export function millisecondsUntilNextKarachiMidnight(now: Date = new Date()): number {
  const karachi = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const nextMidnightUtc =
    Date.UTC(
      karachi.getUTCFullYear(),
      karachi.getUTCMonth(),
      karachi.getUTCDate() + 1,
    ) -
    5 * 60 * 60 * 1000;
  return Math.max(0, nextMidnightUtc - now.getTime());
}

/**
 * Home daily button + meta after refresh.
 * Does not touch PKT seed math — only presentation based on finished flag.
 */
export function homeDailyCta(dailyKey: string, finished: boolean): HomeDailyCta {
  if (finished) {
    return {
      label: 'Daily ✓ · Play endless',
      meta: 'Next daily after midnight PKT',
      action: 'endless',
    };
  }
  return {
    label: 'Daily Challenge',
    meta: `Daily # ${dailyKey} (PKT)`,
    action: 'daily',
  };
}
