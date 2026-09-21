# GlowGrid — Status

**Status:** READY_FOR_QA_R3  
**Updated:** 2026-09-21T18:31:07+05:00 (PKT)  
**Assignee:** Software Engineer 4

## Gates

| Gate | Result |
|------|--------|
| `npm test` | **29/29 passed** (engine + drag window tracking + roundRect clamp) |
| `npm run build` | **green** (tsc + vite + PWA SW; no `icons.svg` in precache) |

## QA fixes (R3 — 2026-09-21)

1. **GG-001 A2HS** — Shown only on Home (`maybeShowA2hs`); hidden on Play/Howto; CSS `z-index: 3` under `.tray-bar` / `#btn-rotate` (`z-index: 8`).
2. **GG-002 Drag** — No tray `setPointerCapture`; `attachWindowPointerDrag(window, …)` with **capture-phase** `pointermove`/`up`/`cancel`; drop via `resolveTrayBoardDrop`. Tap-tap kept. Unit-tested.
3. **GG-003 roundRect** — `rr = max(0, min(r, w/2, h/2))`; empty `beginPath` when `w|h < 1`; skip `drawBoard` when `cell < 2`.
4. **GG-004/005 Icons** — 4-tile SVG mark rasterized to `icon-192.png` / `icon-512.png` + `icon-512-maskable.png`; deleted leftover `public/icons.svg`.
5. **Daily vs endless bestScore** — Kept: endless → `glowgrid:v1:bestScore`; daily → `glowgrid:v1:daily:{key}` only (engine + isolation tests).

## Notes

- Original neon IP; no Block Blast assets  
- No git push / GitHub publish (per brief)  
- Path: `/workspace/factory/projects/glow-grid`
