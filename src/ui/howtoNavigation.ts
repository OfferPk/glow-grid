export type HowtoEntry = 'home' | 'first-run-play';
export type HowtoReturnScreen = 'home' | 'play';

/** Return to the game only when How-to interrupted a first-run game start. */
export function getHowtoReturnScreen(entry: HowtoEntry): HowtoReturnScreen {
  return entry === 'first-run-play' ? 'play' : 'home';
}
