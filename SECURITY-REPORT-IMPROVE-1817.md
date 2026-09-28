# GlowGrid Security Review — IMPROVE (post-v0.1.0)

**Date:** 2026-09-28 18:18 PKT (UTC+05:00)  
**HEAD:** `bdfdaeb` — feat: daily complete Home CTA + PKT streak + docs hygiene  
**Scope:** `/workspace/factory/projects/glow-grid` IMPROVE delta (Home daily CTA + PKT streak persistence + docs hygiene); Pages base `/glow-grid/`  
**Prior:** `SECURITY-REPORT.md` **PASS** (MVP) — still OK; no regression  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Verdict:** **PASS — no security ship blockers identified.**

Reviewer did **not** edit product code and did **not** `git push`.

---

## Ship blockers

| # | Blocker | Status |
|---|---|---|
| — | None | — |

**Ship blockers:** none.

---

## Focus findings (Master)

### 1. Streak localStorage integrity — PASS

| Check | Evidence | Outcome |
|---|---|---|
| Key namespace | `src/game/persist.ts:3` `PREFIX = 'glowgrid:v1:'`; streak under `glowgrid:v1:streak` via `writeRaw('streak', …)` (`:136–137`) | Fixed prefix; try/catch on read/write (`:16–31`) |
| Coerce / clamp `count` | `getStreak` (`:119–133`): `Number(parsed.count)` then `Number.isFinite(count) && count > 0 ? Math.floor(count) : 0` — rejects `NaN`/`Infinity`/negatives/non-numbers | Safe numeric |
| `lastCompletedKey` type | `:125–126` only accepts `typeof === 'string'`, else `''`; JSON parse in try/catch | No object/prototype pollution into typed shape |
| Not rendered as HTML | `src/main.ts:350–356` only `streakCount.textContent = String(streak.count)`; `lastCompletedKey` never enters DOM | Raw JSON not trusted for HTML |
| PKT / timezone abuse | `dailyKeyKarachi` (`src/game/rng.ts:35–42`) builds YYYY-MM-DD from fixed UTC+5 math — no stored TZ string. `shiftDailyKey` (`persist.ts:106–116`) civil UTC date arithmetic; malformed keys yield non-matching strings (e.g. `NaN-NaN-NaN`), not injectable HTML | No injection via TZ |
| Write path | `recordDailyComplete` (`:145–156`) only writes `{ count, lastCompletedKey: dailyKey }` where `dailyKey` comes from engine/RNG civil key (`engine.ts:271–274`) | App-authored keys on write |

**Note (non-blocking):** `lastCompletedKey` is not regex-clamped to `YYYY-MM-DD` on read; a locally tampered string can only skew streak continuity (client-controlled integrity, same class as prior score tampering). It is never used as HTML.

### 2. Daily CTA XSS — PASS

| Check | Evidence | Outcome |
|---|---|---|
| CTA copy | `src/ui/homeDaily.ts:16–28` — finished path returns **static** label/meta; incomplete meta interpolates `dailyKey` only into a string return | No DOM APIs in helper |
| DOM sinks | `src/main.ts:344–347` `daily.textContent = cta.label`; `meta.textContent = cta.meta` | textContent only |
| Action routing | `cta.action` is `'daily' \| 'endless'` (`homeDaily.ts:9`); `main.ts:349` sets `dataset.action`; click (`:294–296`) treats only `=== 'endless'` as endless, else daily | Closed set |
| Project-wide XSS sinks | Repo scan: no `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `eval` / `new Function` in `src/` | Still clean |

### 3. Offline-only (IMPROVE) — PASS

| Check | Evidence | Outcome |
|---|---|---|
| No new network clients | IMPROVE touch set (`persist.ts`, `homeDaily.ts`, `main.ts` refreshHome/CTA, `engine.ts` streak hook, tests, docs/CSS/HTML) adds no `fetch`, XHR, `sendBeacon`, AdMob, analytics | Offline preserved |
| PWA | `vite.config.ts` Workbox `globPatterns` precache only; `base: '/glow-grid/'`; `registerSW` via `virtual:pwa-register` (`main.ts:412–420`) unchanged pattern | Still offline-capable PWA |
| App deps | `package.json`: **no** runtime `dependencies`; production audit clean | No new supply-chain network surface |

---

## Gate checklist (RELEASE_GATE.md)

1. **Authn / sessions** — N/A (no login). GUIDE demo table empty (`GUIDE-roman-urdu.md:46–48`).  
2. **Authz / IDOR** — N/A (no server / privileged routes).  
3. **Secrets & config** — PASS; no `.env`; no API keys/tokens/credentials in source.  
4. **API surface** — none.  
5. **Injection (XSS)** — PASS (see Focus 2).  
6. **Uploads / files** — N/A.  
7. **Dependencies** — `npm audit --omit=dev`: **0 vulnerabilities**. Full audit still flags **dev-only** Vitest nested tree (3 moderate / 1 high / 1 critical) — same class as prior MVP note; not in production bundle.  
8. **Logging / leakage** — no sensitive logging added.  
9. **Transport** — static Pages PWA; no app cookies/auth.  
10. **Admin / debug** — `__glow` debug hook pre-existing (`main.ts:431–434`); no new privileged surface.

---

## Commands / evidence

| Command | Result |
|---|---|
| `git rev-parse HEAD` | `bdfdaebfaf16b3630ab20c103b64883d55f9b266` |
| `npm test` | **39/39** passed (5 files) |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Product code edits | **None** |
| `git push` | **Not performed** (local `main` remains ahead 1 of `origin/main`) |

---

## Prior Still OK

MVP `SECURITY-REPORT.md` PASS items remain true under IMPROVE:

- No secrets / credentials  
- Production dependency audit clean  
- No unsafe HTML sinks; dynamic UI via `textContent`  
- localStorage under `glowgrid:v1:*` only; session A2HS flag only  
- No application API / auth / AdMob  

Client-local score/streak tampering remains an expected offline integrity limit, not a ship blocker.

---

## Notes (non-blocking)

1. Streak / daily records are client-writable; there is no server trust boundary.  
2. Prefer optional future hardening: clamp `lastCompletedKey` to `/^\d{4}-\d{2}-\d{2}$/` and cap `count` (e.g. `Math.min(floor, 1e6)`) on read — defense-in-depth only.  
3. Plan separate Vitest/Vite **devDependency** upgrade for nested audit noise; do not expose Vitest to untrusted networks.

---

## Sign-off

**Security Reviewer:** PASS  
**IMPROVE HEAD `bdfdaeb`:** cleared for QA / publish pipeline from a security perspective (no ship blockers).  
**Actions forbidden by this review and not taken:** product code edits; `git push`.
