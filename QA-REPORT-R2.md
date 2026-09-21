# QA Report R2 — GlowGrid

**Date:** 2026-09-21 18:30 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/glow-grid`  
**Prior:** `QA-REPORT.md` (R1 **FAIL** — GG-001 A2HS occlusion, GG-002 drag broken)  
**Scope:** Independent R2 re-verify (report only — no product source edits; no GitHub push; no agent messages)  
**Overall:** **PASS**

---

## Summary

Master claims and R1 Highs are closed on the current tree:

| Claim / High | Result |
|--------------|--------|
| Daily does **not** write endless `bestScore` | **PASS** |
| Tray→board drag works | **PASS** (GG-002 closed) |
| `npm test` current count | **29/29 passed** |
| `npm run build` + PWA | **PASS** (tsc + Vite + generateSW, 14 precache) |
| GG-001 A2HS must not block tray/Rotate | **PASS** (hidden on Play; hit-targets clear) |

**Security:** prior `SECURITY-REPORT.md` **PASS** — no security ship blockers; noted, not re-audited as a full security pass.

---

## Environment

| Item | Detail |
|------|--------|
| Runtime | `npm run preview -- --host 127.0.0.1 --port 4173` (production `dist/`) |
| Browser | Google Chrome 151 + Puppeteer-core; viewport 390×844 and 360×640 |
| Zone | Asia/Karachi (PKT, UTC+5) |
| Methods | Read STATUS/FIX paths; `npm test`; `npm run build`; live smoke (A2HS, drag, daily/endless storage, PWA, layout) |

---

## Highs table (R1 → R2)

| ID | R1 | R2 | Evidence |
|----|----|----|----------|
| **GG-001** | **FAIL** — A2HS `z-index:30` covered tray + Rotate (`elementFromPoint` → `#a2hs`) | **PASS** | `startMode` / `maybeShowA2hs` hide A2HS on Play. Live 390×844: `a2hsHidden: true`, tray centers hit `CANVAS0/1/2`, Rotate hits `#btn-rotate`, `blocked: false`. |
| **GG-002** | **FAIL** — tray `setPointerCapture` never placed on board | **PASS** | Live mouse drag tray→board: filled cells `0→3`, tray nulls `1`. Unit: `tests/dragPlace.test.ts` (resolveTrayBoardDrop + window pointer drag helpers). |

---

## Master claim evidence

### 1. Daily does not write endless `bestScore`

- **Unit:** `tests/engine.test.ts` → `mode persistence isolation`  
  - endless updates `glowgrid:v1:bestScore` only  
  - daily writes only `glowgrid:v1:daily:{key}` and leaves endless best unchanged (incl. game-over)
- **Live:** seed `glowgrid:v1:bestScore=888` → Play Daily → places/gameover → storage still `888`; daily key written (`glowgrid:v1:daily:2026-09-21`).
- **Code:** `src/game/engine.ts` — `setBestScore` only when `mode === 'endless'`; daily uses `saveDailyRecord`.

### 2. Tray→board drag

- Live CDP mouse drag placed piece (see GG-002).
- Tap-piece → tap-cell still works (R1 regression check retained).

### 3. `npm test`

```text
Test Files  3 passed (3)
Tests       29 passed (29)
```

Files: `engine.test.ts` (20), `dragPlace.test.ts` (6), `canvasRoundRect.test.ts` (3).

### 4. Build + PWA

```text
tsc && vite build — success
PWA generateSW — 14 precache entries; dist/sw.js + workbox
```

Live: manifest `GlowGrid`, 3 icons, `display: standalone`, service worker registered.

### 5. GG-001 re-check

A2HS still shows on **Home** when onboarded and not dismissed (expected). On entering Endless/Daily, banner is hidden; tray and Rotate receive hits without dismissing OK.

---

## Smoke checklist (R2)

| Check | Result |
|-------|--------|
| Home branding GlowGrid + Daily # 2026-09-21 (PKT) | PASS |
| Endless / Daily → 8×8 + 3 tray | PASS |
| A2HS on Play vs tray/Rotate | **PASS** (GG-001) |
| Drag tray→board | **PASS** (GG-002) |
| Daily vs endless bestScore isolation | **PASS** |
| Endless raises `bestScore` when score > prior | PASS (live score 80 → best 80) |
| Mute / persist keys namespace `glowgrid:v1:*` | PASS (prior + code) |
| 360×640 no horizontal scroll | PASS (`scrollWidth === clientWidth === 360`) |
| Manifest + SW | PASS |
| GUIDE-roman-urdu.md + README link | PASS (unchanged presence) |
| Security prior PASS | Noted |

---

## Residuals (non-blocking)

| ID | Sev | Note |
|----|-----|------|
| **GG-R2-010** | Low | Fresh session: Play → How-to → **Got it** returns **Home** (play screen was hidden by howto), so user must tap Play again. `btn-howto-ok` only resumes play if play section is already unhidden. Prefer: remember pending mode and `showScreen('play')` after Got it. |
| GG-006 | Low | Endless best still client-spoofable via `localStorage` (expected offline MVP; prior note). |
| GG-007–008 | Low | Tray bag-of-3 refill policy / limited keyboard a11y — unchanged product choices from R1. |

R1 Mediums **GG-003** (roundRect clamp + tests), **GG-004** (multi-color PNG icons), **GG-005** (scaffold `icons.svg` removed from public/dist), **GG-009** (`mobile-web-app-capable` meta) appear addressed in current tree — not re-opened.

---

## Verdict

**PASS** — R1 Highs **GG-001** and **GG-002** closed; master claims hold; `npm test` **29/29**; build + PWA OK; Security prior **PASS**. Residual howto→Home is Low only — not a High ship blocker.

Re-queue only if Master wants GG-R2-010 fixed before publish; otherwise READY from QA R2 perspective.
