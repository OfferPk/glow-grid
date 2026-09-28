# QA Report — GlowGrid Unreleased IMPROVE (post v0.1.0)

**Date:** 2026-09-28 18:18 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/glow-grid`  
**SHA:** `bdfdaeb` (`feat: daily complete Home CTA + PKT streak + docs hygiene`)  
**Prior:** `QA-REPORT-R3.md` (v0.1.0 **PASS**); brief `inbox/IMPROVE-glow-grid-20260928-1808.md`  
**Scope:** REPORT ONLY — no product source edits; no GitHub push; no agent messages  
**Overall:** **PASS**

---

## Summary

All three Master Unreleased IMPROVE claims hold. `npm test` **39/39**; `npm run build` green; Pages `base: '/glow-grid/'` intact. No new P0/P1.

| # | Master item | Result |
|---|-------------|--------|
| 1 | Daily ✓ → Play endless + next daily after midnight PKT | **PASS** |
| 2 | PKT streak (`glowgrid:v1:streak`; Home Streak when ≥1) | **PASS** |
| 3 | STATUS/CHANGELOG hygiene only | **PASS** |

---

## Environment

| Item | Detail |
|------|--------|
| Zone | Asia/Karachi (PKT, UTC+5) — box clock |
| Unit | `vitest run` — 5 files / 39 tests |
| Build | `tsc && vite build` + PWA `generateSW` (14 precache) |
| Live | `npm run preview` → `http://127.0.0.1:4174/glow-grid/` (4173 occupied by another app) |
| Browser | Google Chrome headless + puppeteer-core; viewport 390×844 |
| Methods | Read STATUS/CHANGELOG/source; unit gates; live localStorage seed + DOM smoke |

---

## Gates

### `npm test` — 39/39

```text
✓ tests/homeDaily.test.ts (3)
✓ tests/streak.test.ts (7)
✓ tests/dragPlace.test.ts (6)
✓ tests/canvasRoundRect.test.ts (3)
✓ tests/engine.test.ts (20)
Test Files  5 passed (5)
Tests       39 passed (39)
```

(29 prior R3 + 3 homeDaily + 7 streak.)

### `npm run build` — green

```text
tsc && vite build — success
PWA generateSW — 14 precache entries (60.75 KiB); dist/sw.js + workbox
base: '/glow-grid/' (vite.config.ts L6) — unchanged
```

Live URL served at `/glow-grid/`.

---

## Master item evidence

### 1. Daily ✓ → Play endless + midnight teaser — **PASS**

**Code**

- `src/ui/homeDaily.ts` `homeDailyCta(key, finished)`:
  - finished → label `Daily ✓ · Play endless`, meta `Next daily after midnight PKT`, `action: 'endless'`
  - incomplete → `Daily Challenge` / `Daily # {key} (PKT)` / `action: 'daily'`
- `src/main.ts` `refreshHome`: drives `#daily-label`, `#daily-meta`, `#btn-daily.dataset.action` from CTA
- `#btn-daily` click: `startMode(action === 'endless' ? 'endless' : 'daily')` — no same-seed re-entry when finished
- `dailyKeyKarachi` / seed math untouched (engine + rng tests still assert UTC+5 PKT keys)

**Unit** (`tests/homeDaily.test.ts` 3/3): incomplete / finished / persist→CTA refresh cases.

**Live** (PKT key `2026-09-28`, preview `:4174/glow-grid/`):

| State | Evidence |
|-------|----------|
| Clean / incomplete | label `Daily Challenge`; meta `Daily # 2026-09-28 (PKT)`; `dataset.action=daily` |
| Seed `glowgrid:v1:daily:2026-09-28` `{finished:true}` | label `Daily ✓ · Play endless`; meta `Next daily after midnight PKT`; `action=endless` |
| Click `#btn-daily` after finished | Play screen shown; HUD mode badge **`Endless`** (howto skipped via onboarded) |

### 2. PKT streak (`glowgrid:v1:streak`; Home when ≥1) — **PASS**

**Code**

- `persist.PREFIX = 'glowgrid:v1:'` + `writeRaw('streak', …)` → storage key **`glowgrid:v1:streak`** `{ count, lastCompletedKey }`
- `recordDailyComplete`: same-day idempotent; +1 if yesterday PKT consecutive; else reset to 1; cold `getStreak` does not decay
- Engine daily game-over: `saveDailyRecord(..., true)` then `recordDailyComplete(dailyKey)` (`src/game/engine.ts` finishIfNeeded)
- Home: `#home-streak` shown when `count >= 1`, hidden at 0 (`refreshHome`)

**Unit** (`tests/streak.test.ts` 7/7): first complete; consecutive; skip-day reset; same-day idempotent; read-only no break; `shiftDailyKey`; PKT UTC-midnight boundaries via `dailyKeyKarachi`.

**Live**

| Seed | UI |
|------|-----|
| streak `{count:3, lastCompletedKey: today}` | `#home-streak` **visible**; text `Streak: 3` |
| streak `{count:0}` | `#home-streak` **hidden** |
| storage keys present | `glowgrid:v1:streak`, `glowgrid:v1:daily:2026-09-28` |

### 3. STATUS / CHANGELOG hygiene — **PASS**

| Doc | Check |
|-----|--------|
| `STATUS.md` | Documents prior R3 QA **PASS** + Security **PASS**; Unreleased IMPROVE pack listed; gate `READY_FOR_QA` for this pack (not stuck on `READY_FOR_QA_R3`); notes `base /glow-grid/`; Updated 2026-09-28T18:15:32+05:00 PKT |
| `CHANGELOG.md` | `## Unreleased` covers Daily complete UX + streak + docs; `## [0.1.0] — 2026-09-21` ship notes present |
| Hygiene-only | Docs describe the pack; no ads/IAP/base change; no gameplay beyond stated CTA/streak |

---

## Residuals (non-blocking; prior / Low)

| ID | Sev | Note |
|----|-----|------|
| **GG-R2-010** | Low | First-run Play → How-to → Got it can return Home (must Play again). Unchanged from R3; not P0/P1. |
| GG-006 | Low | Endless best still client-spoofable via localStorage (offline MVP). |
| GG-007–008 | Low | Tray refill / limited keyboard a11y — product choices. |

**No new P0/P1** found in this Unreleased pack.

---

## Verdict

**PASS** — Master items 1–3 hold (code + unit + live); `npm test` **39/39**; build + PWA OK; `base: '/glow-grid/'` intact; STATUS/CHANGELOG hygiene OK; no new P0/P1.

**CLEAR from QA** for this Unreleased IMPROVE pack (post v0.1.0). Next gate: publish/monitor (or tag) per Master — out of QA scope.

Report only — no product code changes, no GitHub, no agent messages.
