# QA Report — GlowGrid MVP

**Date:** 2026-09-21 18:23 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/glow-grid`  
**PRD:** `/workspace/factory/research/PRD-game-mvp.md`  
**Brief:** `/workspace/factory/inbox/BUILD-glow-grid.md`  
**QA:** Independent pass (report only — product source not modified; no GitHub push; no agent messages)  
**Overall:** **FAIL**

---

## Summary

Automated gates match the claim: **`npm test` 17/17** and **`npm run build` green** (tsc + Vite + vite-plugin-pwa SW). Core engine logic (8×8, place/clear static, rotate, combo formula, daily Asia/Karachi seed, game-over detection), mute persistence, offline SW shell, daily HUD date, and neon **GlowGrid** branding look sound.

**Ship blockers:** two **High** interaction defects — (1) first-run A2HS banner occludes the entire piece tray + Rotate; (2) drag-and-drop never delivers pointermove/up to the board because tray `setPointerCapture` swallows the gesture. Tap-piece → tap-cell works **after** dismissing A2HS. Fix Highs before READY TO PUBLISH.

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High     | 2 |
| Medium   | 3 |
| Low      | 4 |

---

## Environment

| Item | Detail |
|------|--------|
| Runtime | `npm run preview -- --host 127.0.0.1 --port 4173` (production `dist/`) |
| Browser | Google Chrome 151 headless + Puppeteer; viewport 390×844 and 360×640 |
| Methods | Read PRD/README/GUIDE/engine/PWA; `npm test`; `npm run build`; UI smoke; localStorage cheat probe; offline reload; icon PNG decode |
| Zone | Box/user Asia/Karachi (UTC+5); report times PKT |

---

## Automation

| Check | Result |
|-------|--------|
| `npm test` | **17/17 passed** (`tests/engine.test.ts`, vitest 2.1.9) |
| `npm run build` | **success** — `tsc && vite build`; PWA generateSW, **14 precache entries** (`dist/sw.js`) |

---

## Smoke checklist

| Check | Result |
|-------|--------|
| Home branding “GlowGrid” + neon panel | PASS |
| Daily label `Daily # 2026-09-21 (PKT)` | PASS |
| Endless / Daily start → 8×8 board + 3 tray slots | PASS |
| Tap piece → tap cell place (after A2HS dismiss) | PASS |
| Drag tray → board place | **FAIL** (GG-002) |
| First-run A2HS vs tray hit-targets | **FAIL** (GG-001) |
| Engine place / OOB reject / rotate / game-over | PASS (via `__glow` + unit tests) |
| Row/col clear + score formula (`cells*10*mult`) | PASS (engine + live clears observed) |
| Combo reset on non-clear | PASS (unit + engine) |
| High score `localStorage` read/write | PASS (also trivially spoofable — GG-006) |
| Mute persists across reload | PASS (`glowgrid:v1:settings`) |
| Daily seed identical across two sessions same key | PASS |
| `dailyKeyKarachi` UTC+5 boundary (unit) | PASS |
| 360×640 no horizontal scroll | PASS (`scrollWidth === clientWidth`) |
| Manifest + icons 192/512 + SW ready | PASS (installability signals) |
| Offline reload after SW | PASS (logo/title still render) |
| GUIDE-roman-urdu.md + README link | PASS |
| Console clean on happy-path play | **FAIL** under zero-width resize (GG-003); clean on normal desktop layout |

---

## Findings

| ID | Severity | Title | Repro | Fix request |
|----|----------|-------|-------|-------------|
| **GG-001** | **High** | A2HS banner covers tray + Rotate (z-index 30) | Fresh session (no `sessionStorage glowgrid:a2hs`); Play Endless; `elementFromPoint` on all three `[data-tray]` centers and `#btn-rotate` hits `#a2hs` / children (`blocked: true`). Tray tops ~748px, banner top ~773px on 390×844. | Pin A2HS above chrome or below safe tray area (`bottom` clear of `.tray-bar`); lower z-index under controls **or** auto-dismiss / defer until Home; add smoke assert tray centers not covered when banner shown. |
| **GG-002** | **High** | Drag-and-drop broken — tray `setPointerCapture` keeps move/up on tray | `pointerdown` on tray → drag to board → `pointerup`: capture log shows only `tray` pointermove/up; **zero** board events; piece not placed. PRD §5.3 lists drag as primary. | While dragging, listen on `window`/`document` for `pointermove`/`pointerup` (or release capture and use `elementFromPoint`); on up over board, call `attemptPlace`. Keep tap-tap fallback. Add a Playwright/Puppeteer drag test. |
| **GG-003** | **Medium** | `roundRect` → `arcTo` **IndexSizeError** when cell size &lt; 2px | Force `.board-wrap` width/height `0` + `resize`, or any layout where `cell - pad*2 &lt; 0`: `CanvasRenderingContext2D.arcTo` radius −1. Violates PRD acceptance #13 if it hits real devices during orientation/keyboard chrome. | In `src/render/canvas.ts` `roundRect`, clamp `rr = Math.max(0, Math.min(r, w/2, h/2))` and **return early** if `w &lt; 1 \|\| h &lt; 1`; skip `drawBoard` when `cell &lt; 2`. |
| **GG-004** | **Medium** | PWA PNG icons are solid `#22d3ee`, not the 4-tile SVG mark | Decode: `icon-192.png` / `icon-512.png` are 192²/512² RGB with **one** color `22d3ee`. `public/icons/icon.svg` is the intended cyan/magenta/lime/violet grid. Maskable entry reuses the flat 512. | Rasterize `icon.svg` (or equivalent) to 192 + 512 PNG (any + maskable with safe padding); keep unique GlowGrid mark. |
| **GG-005** | **Medium** | Leftover Vite scaffold `public/icons.svg` (Discord/GitHub/Bluesky symbols) shipped + precached | File present in `dist/`; SW precache lists `icons.svg`. Not game IP theft, but clutter / wrong brand surface. | Delete unused `public/icons.svg` (and references) or replace with GlowGrid-only sprites; rebuild so SW drops it. |
| **GG-006** | **Low** | High score trivially cheatable via `localStorage` | `localStorage.setItem('glowgrid:v1:bestScore','999999')` → Home Best shows `999999`. Expected for offline single-player; still a “score cheating” hunt item. | Document as trusted-client; optional post-MVP integrity (hash) if share/leaderboard added. No MVP blocker. |
| **GG-007** | **Low** | Tray refills only when all 3 slots empty | After one `place`, tray has `nulls: 1` / `nonNull: 2`. Genre-standard (Block-clear bag-of-3); PRD core-loop wording (“always has up to 3”) is ambiguous. | Confirm with Master: keep bag-of-3 **or** refill to 3 after each place; update PRD + GUIDE to match; add unit test for chosen policy. |
| **GG-008** | **Low** | Limited keyboard a11y — only `R` rotates; no keyboard place | Canvas tray/board have `aria-label` but no focusable cell grid / key placement. | Post-MVP: focusable tray slots + arrow/confirm place; or document touch/mouse-only MVP. |
| **GG-009** | **Low** | Deprecated Apple PWA meta warning | Console: `apple-mobile-web-app-capable` deprecated; prefer `mobile-web-app-capable`. | Add `<meta name="mobile-web-app-capable" content="yes">` alongside Apple meta in `index.html`. |

### Code anchors

- GG-001: `src/style.css` (`.a2hs` `z-index: 30; bottom: 12px`); `src/main.ts` `maybeShowA2hs`
- GG-002: `src/main.ts` tray `setPointerCapture` (~L182); board handlers only on `#board` (~L134–175)
- GG-003: `src/render/canvas.ts` `roundRect` / `drawBoard` (`cell - pad * 2`)
- GG-004/005: `public/icons/icon-*.png`, `public/icons/icon.svg`, `public/icons.svg`
- Daily TZ: `src/game/rng.ts` `dailyKeyKarachi` (explicit UTC+5) — OK
- Persist keys: `src/game/persist.ts` `glowgrid:v1:*` — OK

---

## Originality / IP note

- **Name & chrome:** “GlowGrid” only; README disclaimer not affiliated with Block Blast / commercial block-clear titles.  
- **Assets:** Original neon palette (`#0b1020`, cyan/magenta/lime); SVG mark is a simple 2×2 rounded tile grid — **not** a copy of Block Blast / Woodoku / Hungry Studio art, fonts, or SFX.  
- **Risk:** Genre inspiration is explicit in PRD (OK internally). Public marketing should stay “original neon puzzle,” not competitor trademarks. Solid cyan PNGs are unfinished, not infringing. Leftover Vite social `icons.svg` is unrelated third-party-ish scaffold vectors — remove for cleanliness (GG-005).  
- **Verdict:** **No trademark-clone blocker** found in branding/assets reviewed.

---

## What passed (do not regress)

- Locked score formula in `score.ts` + tests (mult cap ×5, combo reset).  
- Static clears (no gravity).  
- Seeded daily bag `glowgrid-daily\|YYYY-MM-DD` + Karachi calendar key.  
- Game-over when no tray piece fits any rotation (engine path).  
- PWA: `manifest.webmanifest`, SW precache, offline shell after first load.  
- GUIDE-roman-urdu.md complete + linked from README.

---

## Verdict

**FAIL** — fix **GG-001** and **GG-002** (High) before READY; address **GG-003–005** (Medium) before public/GitHub publish. Re-run UI smoke (drag + first-run A2HS + 360×640) after fixes.
