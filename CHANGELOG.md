# Changelog

## Unreleased

### Projected clear preview
- Valid placement previews now softly highlight any row or column they would clear before the piece is placed.

### Placement feedback
- Rejected placements now show a brief, static status message that is announced to assistive technology and behaves consistently for pointer and keyboard play.

### Keyboard placement (GG-008)
- Keyboard users can focus a tray piece, move its board preview with the arrow keys, and place it with Enter or Space; R rotates the selected piece.
- Added focus indicators, live placement announcements, and regression tests for cursor movement and confirmation keys.

### First-run tutorial handoff
- Tapping **Got it** after starting Endless or Daily now continues directly into that game; opening How to play from Home still returns Home.
- Added regression coverage for both tutorial entry paths.

## [0.1.1] — 2026-09-28

### Daily complete UX on Home
- When today’s PKT daily is `finished`, Home `#daily-label` → `Daily ✓ · Play endless`; meta `Next daily after midnight PKT`; click starts **endless** (no same-seed re-entry)
- Incomplete: keep `Daily Challenge` + `Daily # {key} (PKT)` ready state
- Pure helper `homeDailyCta` + vitest; PKT `dailyKeyKarachi` / seed math unchanged

### Daily streak (PKT)
- On daily finished, persist `glowgrid:v1:streak` `{ count, lastCompletedKey }`
- Consecutive Asia/Karachi calendar days → +1; skipped day → reset to 1 on next complete; same-day idempotent; cold open / visit does not break streak
- Home shows `Streak: N` when count ≥ 1 (hidden at 0)
- Vitest: consecutive, skip-day reset, same-day idempotent, PKT key boundaries

### Docs / gate hygiene
- STATUS: document QA PASS R3 + Security PASS; this Unreleased pack → **READY_FOR_QA**
- CHANGELOG added with `[0.1.0]` ship notes

## [0.1.0] — 2026-09-21

- MVP: neon 8×8 block-clear PWA (Vite + TS + Canvas + vite-plugin-pwa)
- Endless + Daily Challenge (Asia/Karachi seeded bag); combo clears; localStorage persist
- Drag + tap-tap place; rotate; share; howto; A2HS tip
- R3 QA fixes: A2HS Home-only, window pointer drag, roundRect clamp, PNG icons
- Pages base `/glow-grid/`; no ads / IAP
