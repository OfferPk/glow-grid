# GlowGrid

**Neon block-clear puzzle PWA** — place glowing polyominoes on an 8×8 grid, clear full rows and columns, ride combo streaks. Offline-capable, no accounts.

> Roman Urdu guide: **[GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md)**

## Stack

- Vite + TypeScript
- HTML Canvas 2D
- vite-plugin-pwa (service worker + manifest)
- localStorage persistence
- Vitest unit tests

## Quick start

```bash
cd /workspace/factory/projects/glow-grid
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

```bash
npm test          # vitest
npm run build     # tsc + vite build → dist/
npm run preview   # serve production build
```

## Play

| Mode | Description |
|------|-------------|
| **Endless** | Random pieces, chase high score |
| **Daily Challenge** | Same seeded bag for everyone on a given **Asia/Karachi (UTC+5)** calendar day |

Controls:

- **Drag** a tray piece onto the board, or **tap piece → tap cell**
- **Rotate** button or **R** key
- Mute toggles sound/haptics (`navigator.vibrate`)

## Scoring (locked)

```
cellsCleared = cells removed this placement
if cellsCleared == 0: combo = 0; score += 0
else: combo += 1; mult = min(5, 1 + floor(combo/2)); score += cellsCleared * 10 * mult
```

Clears are **static** (no gravity).

## Project layout

```
src/game/     engine, pieces, rng, score, persist
src/render/   canvas board + tray
src/ui/       HUD + overlays helpers
tests/        vitest engine coverage
public/       icons, manifest, favicon
```

## Docs

- [PRODUCT.md](./PRODUCT.md) — product summary
- [STATUS.md](./STATUS.md) — build status
- [GUIDE-roman-urdu.md](./GUIDE-roman-urdu.md) — install & play (Roman Urdu)

## License / IP

Original neon puzzle IP. Not affiliated with Block Blast or any commercial block-clear title.
