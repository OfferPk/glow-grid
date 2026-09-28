# QA Report R3 — GlowGrid

**Date:** 2026-09-21 18:34 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/glow-grid`  
**Prior:** `QA-REPORT-R2.md` (R2 **PASS**); Master: prior FAIL noise was roundRect export — claimed fixed with early-return  
**Scope:** Independent R3 re-verify (report only — no product source edits; no GitHub; no agent messages)  
**Overall:** **PASS**

---

## Summary

All Master R3 claims hold on the current tree:

| # | Claim | Result |
|---|--------|--------|
| 1 | `npm test` 29/29 | **PASS** |
| 2 | Build green | **PASS** |
| 3 | `roundRect` early-return (no IndexSizeError / export issues; tests cover it) | **PASS** |
| 4 | A2HS Home-only (not on Play — tray clear) | **PASS** |
| 5 | Window-level drag tray→board works | **PASS** |
| 6 | Daily score ≠ endless `bestScore` pollution | **PASS** |

**Security:** prior `SECURITY-REPORT.md` **PASS** — noted; not re-audited as a full security pass.

---

## Environment

| Item | Detail |
|------|--------|
| Runtime | `npm run preview -- --host 127.0.0.1 --port 4173` (production `dist/`) |
| Browser | Google Chrome + Puppeteer-core; viewport 390×844 and 360×640 |
| Zone | Asia/Karachi (PKT, UTC+5) |
| Methods | Read STATUS / BUILD / R2 notes; `npm test`; `npm run build`; live smoke (A2HS, drag, daily/endless storage, roundRect tiny-layout, PWA) |

---

## Gate evidence

### 1. `npm test` — 29/29

```text
Test Files  3 passed (3)
Tests       29 passed (29)
```

Files: `engine.test.ts` (20), `dragPlace.test.ts` (6), `canvasRoundRect.test.ts` (3).

### 2. `npm run build` — green

```text
tsc && vite build — success
PWA generateSW — 14 precache entries; dist/sw.js + workbox
```

Live: manifest `GlowGrid`, 3 icons, `display: standalone`, service worker registered (1).

---

## Claim evidence

### 3. roundRect early-return (GG-003)

**Code** (`src/render/canvas.ts`):

- `if (w < 1 || h < 1) { ctx.beginPath(); return; }` before `arcTo`
- `rr = Math.max(0, Math.min(r, w/2, h/2))`
- `drawBoard` skips when `cell < 2`

**Unit** (`tests/canvasRoundRect.test.ts` — 3/3):

- early-return on `w|h < 1` → `beginPath` only, **no** `arcTo` / `moveTo` / `rect`
- radius clamp to `min(r, w/2, h/2)`
- `rect` path when clamped radius is 0

**Live:** shrink board / dispatch `resize` → **no** `IndexSizeError` / roundRect page errors (`roundRectErrors: []`). Export is present and imported by tests (prior export FAIL noise resolved).

### 4. A2HS Home-only (GG-001)

| Check | Result |
|-------|--------|
| Home (onboarded, A2HS not dismissed) | Banner **shown** (`hidden: false`, `z-index: 3`) |
| Enter Endless | Banner **hidden** (`a2hsHidden: true`) |
| Tray hit-test (3 canvases) | `CANVAS`, `blocked: false` |
| Rotate hit-test | `#btn-rotate`, `blocked: false` |
| Tray `z-index` vs A2HS | tray `8` > a2hs `3` |
| `#btn-home` back to Home | A2HS shows again (`hidden: false`) |

Code: `startMode` → `hideA2hs()`; `maybeShowA2hs` Home-only (not Play/Howto).

### 5. Window-level drag tray→board (GG-002)

| Check | Result |
|-------|--------|
| Live CDP mouse drag tray0 → board | Board neon sample **4452 → 10672** (`placed: true`) |
| Source | No tray `setPointerCapture` (comments only); `attachWindowPointerDrag(window, …)` capture-phase |
| Unit | `tests/dragPlace.test.ts` 6/6 (`resolveTrayBoardDrop` + window pointer helpers) |

### 6. Daily ≠ endless bestScore pollution

| Check | Result |
|-------|--------|
| Unit `mode persistence isolation` | Endless → `glowgrid:v1:bestScore` only; daily → `glowgrid:v1:daily:{key}` only; game-over daily leaves endless best unchanged |
| Live | Seed `bestScore=888` → Play Daily → places → storage still **`888`**; daily key `glowgrid:v1:daily:2026-09-21` written |
| Code | `setBestScore` only when `mode === 'endless'`; daily uses `saveDailyRecord` |

---

## Smoke checklist (R3)

| Check | Result |
|-------|--------|
| `npm test` 29/29 | **PASS** |
| `npm run build` + PWA | **PASS** |
| roundRect early-return + tests | **PASS** |
| A2HS Home-only; tray/Rotate clear on Play | **PASS** |
| Drag tray→board | **PASS** |
| Daily vs endless bestScore isolation | **PASS** |
| 360×640 no horizontal scroll | **PASS** (`scrollWidth === clientWidth === 360`) |
| Manifest + SW | **PASS** |
| Security prior PASS | Noted |

---

## Residuals (non-blocking)

| ID | Sev | Note |
|----|-----|------|
| **GG-R2-010** | Low | First-run Play → How-to → **Got it** can return **Home** (must Play again). Unchanged from R2; not a High. |
| GG-006 | Low | Endless best still client-spoofable via `localStorage` (expected offline MVP). |
| GG-007–008 | Low | Tray refill policy / limited keyboard a11y — product choices. |

---

## Verdict

**PASS** — all six Master R3 claims hold; `npm test` **29/29**; build + PWA OK; roundRect early-return verified (code + unit + no live IndexSizeError); A2HS / drag / daily isolation reconfirmed; Security prior **PASS**.

Report only — no product code changes, no GitHub, no agent messages.
