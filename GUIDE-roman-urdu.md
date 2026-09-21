# GlowGrid — Istemaal Guide (Roman Urdu)

> Factory rule: har published project mein yeh file `GUIDE-roman-urdu.md` ke naam se zaroori hai.

## 1. Yeh project kya hai?

GlowGrid ek chhota **neon puzzle game** hai. Aap glowing block shapes grid pe rakhte ho, poori **row** ya **column** clear karte ho, aur **combo** se zyada score banate ho. Browser mein chalta hai, **offline** bhi (PWA). Account / login ki zaroorat nahi.

## 2. Kahan se download karein?

- Project path (factory): `/workspace/factory/projects/glow-grid`
- GitHub / ZIP: Master publish karein to yahan link update hoga
- Local build: `npm run build` ke baad `dist/` folder static host pe deploy

## 3. Pehle kya chahiye? (requirements)

- **Node.js** 20+ (dev / build ke liye)
- Modern browser: Chrome / Edge / Firefox / Safari (mobile OK)
- Install (optional): browser → Add to Home Screen

## 4. Install + Run (step-by-step)

1. Terminal kholo aur project folder mein jao:
   ```bash
   cd /workspace/factory/projects/glow-grid
   ```
2. Dependencies:
   ```bash
   npm install
   ```
3. Dev server:
   ```bash
   npm run dev
   ```
4. Browser mein URL kholo (jaise `http://localhost:5173`)
5. Production build:
   ```bash
   npm test && npm run build
   npm run preview
   ```

## 5. Demo login (agar ho)

**Nahi chahiye.** GlowGrid mein koi login / demo account nahi — seedha Play.

| Role | Email | Password |
|------|-------|----------|
| — | — | — |

## 6. Features — har ek kya karta hai

### Play Endless
- **Kahan:** Home → **Play Endless**
- **Kaise:** 3 pieces tray se drag / tap karke grid pe rakho; Rotate se ghumao
- **Result:** Score badhega; best score save hoga

### Daily Challenge
- **Kahan:** Home → **Daily Challenge** (PKT date dikhegi)
- **Kaise:** Wahi rules; pieces sequence us din ke seed se same hoti hai (Asia/Karachi UTC+5)
- **Result:** Roz ka fair challenge; daily best local save

### Clear rows & columns
- **Kahan:** Play board
- **Kaise:** Poori row YA column bharo — clear flash dikhega
- **Result:** Cells hat jati hain (**gravity nahi** — blocks neeche nahi girte)

### Combos
- **Kahan:** HUD mein Combo
- **Kaise:** Lagatar placements pe clear karte raho
- **Result:** Multiplier max ×5; combo pop text

### Mute / haptics
- **Kahan:** Home ya Play pe mute button
- **Kaise:** Toggle
- **Result:** Vibration band; setting localStorage mein rehti hai

### Share
- **Kahan:** Game Over → Share
- **Kaise:** Web Share API ya clipboard
- **Result:** Score text WhatsApp / friends ko bhejne ke liye

### Install (A2HS)
- **Kahan:** Pehli baar hint bar
- **Kaise:** Browser menu → Add to Home Screen
- **Result:** App jaisi icon; offline play after first load

## 7. Common masail (troubleshooting)

- **Board click nahi hota:** Pehle tray se piece select / drag karo
- **Daily alag pieces?** Date change (PKT midnight UTC+5) — same day same seed
- **Score save nahi:** Private/incognito mein localStorage clear ho sakta hai
- **PWA install nahi:** HTTPS ya localhost chahiye; Safari mein Share → Add to Home Screen
- **Build fail:** `npm install` phir `npm test && npm run build`

## 8. Security / privacy tips

- Koi server account nahi — data sirf aapke device ke `localStorage` mein (`glowgrid:v1:*`)
- Share text mein personal info mat daalo
- Public Wi‑Fi pe bhi game local hai; pehli load ke baad offline chal sakta hai

## 9. Agla update

- Themes / revive ads (post-MVP PRD)
- Analytics optional later
