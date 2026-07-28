# ExcerLock Dashboard — Design Spec (v1 draft)

> Synthesized 2026-07-22 from web research on best-in-class screen-time and fitness dashboards (Opal, Steppin, WHOOP, Apple Activity Rings, Duolingo, Gentler Streak, Strava-redesign backlash, NN/g, Apple HIG/Liquid Glass) + the ExcerLock PRD (`../excerlock-app-prd.md`).

---

## 1. Governing principles (evidence-backed)

1. **One hero metric: time balance remaining.** Biggest element, readable in <1s. (Opal's Focus Score, WHOOP's Recovery, Duolingo's streak all lead with one number.)
2. **Balance rendered as a depleting ring + digits**, not digits alone — Apple-rings closure effect makes fill/empty state pre-attentive. Tabular numerals so the countdown doesn't jitter.
3. **The earn↔spend exchange rate must be legible on the home screen.** Every earn card shows its payout ("Gym visit → +45 min"). Steppin's whole value prop is this legibility.
4. **Hard cap on Tier 1 content:** hero balance + 2–3 earn-goal rings + streak chip. Everything else is one tap away (WHOOP's 3-tier progressive disclosure; the anti-example is Gentler Streak's overwhelming home and Strava burying core content).
5. **Strict semantic color, learned once:** green = earned/available, amber = draining/low, red = blocked/empty, reused on every screen (WHOOP's 3-color system). OLED-dark base, hero on a **solid** high-contrast surface — Liquid Glass for chrome only (NN/g legibility warning).
6. **Streak with forgiveness.** Prominent streak (loss aversion) + the PRD's sick-token cushion made visible so a miss never silently nukes months (Duolingo Streak Freeze lesson).
7. **Kind, action-forward tone.** The model is restrictive; the copy must never scold (PRD bans guilt language). Zero-balance is a prompt to earn, not a dead end.
8. **The dashboard is the control surface.** Check in, claim earned time, and jump to a goal directly from home (Opal's tap-to-reclassify lesson).
9. **Surface verified proof-of-effort.** Every payout shows its evidence ("Apple Health: 10,247 steps ✓"). Verification builds trust in an app that takes things away (Forfeit).
10. **Primary CTA bottom-anchored AND visually dominant** (thumb-zone research + user expectation).

---

## 2. Tier 1 — the home screen (top → bottom)

### A. Status strip (thin, top)
- Day type chip: Active / Rest / Custom / Vacation (calm styling on non-active days).
- Streak chip: flame + integer, fixed top-right position. Shows shield icon when a sick token is armed.

### B. HERO — Time Balance ring
- Large ring, center-top third. Inside: remaining time in `H:MM` (tabular), small "of X today" beneath.
- Ring drains as locked apps are used; color walks green → amber → red thresholds.
- Sub-states:
  - **Unlimited reward active:** ring turns full/glowing, label "Unlocked until 9:00 PM" — countdown replaces balance.
  - **Full Lock (base = 0):** ring starts empty/red, label "Locked — earn to unlock" (this is the product's headline mode, so it must look intentional, not broken).
  - **Outside lock window / rest day:** ring desaturated, "No limits right now."
- Tap → Tier 2 (today's ledger: every drain and earn event, itemized).

### C. Earn row — "Ways to earn right now" (2–3 cards max)
One card per enabled trigger, each showing live progress + payout:
- **Gym card:** distance/state aware — idle: "Gym visit → +45 min"; at gym: turns into the check-in CTA; cooldown running: neutral progress ("Confirming presence… 3:12").
- **Goal cards** (run / steps / calories etc.): mini progress ring + "6,240 / 10,000 steps → +20 min" straight from Apple Health.
- Completed-but-unclaimed goal: card pulses "Claim +20 min."
- More than 3 enabled triggers → show nearest-to-completion 3, "All goals" link.

### D. Primary CTA (bottom-anchored, thumb zone, ≥48pt)
Context-dependent, one at a time:
1. Unclaimed earn detected → **"Claim your earned time"** (highest priority — this is the PRD's claim-on-open moment).
2. At a saved gym → **"Check in"**.
3. Otherwise → **"Earn time"** (opens the earn sheet listing triggers).

### E. Below the fold (allowed, in order)
- Time reclaimed this week ("ExcerLock saved you 4h 20m") — the shareable identity metric, framed as a growing win, never a scold.
- Mini 7-day heat strip → Tier 2 stats.
- Nothing else. No tips, no promos above or between the above (anti-Strava rule).

## 3. The claim moment (app-open interstitial)
Because detection is claim-on-open, app-open with a pending verified earn shows a celebration sheet **before** the dashboard: evidence line ("Run 2.1 mi ✓ recorded by Apple Watch"), payout animation into the hero ring, haptic. This is the app's single most rewarding interaction — invest animation budget here (Opal's "experience, not a tool").

## 4. State matrix (what changes per user/day state)

| State | Hero | Earn row | CTA |
|---|---|---|---|
| Active, balance healthy | Green ring, countdown | Live goal progress | Earn time |
| Active, balance low | Amber ring | Same, nearest goal highlighted | Earn time |
| Active, balance zero | Red empty ring, "Shields up" | Becomes the main content | Earn time (prominent) |
| Full Lock morning | Red ring, "Earn to unlock" | Main content | Earn time |
| Unclaimed earn | Any | Pulsing claim card | Claim your earned time |
| At gym | Any | Gym card active | Check in |
| Unlimited active | Glowing ring + until-time | Collapsed ("done for today ✓") | none / secondary |
| Rest day | Desaturated, "Rest day" | Hidden or optional | none |
| Vacation/sick | Paused styling, streak frozen note | Hidden | none |

## 5. Tier 2 / Tier 3 (one tap away — not on home)
- **Tier 2:** today's ledger; stats (calendar heat map, per-source breakdown, time reclaimed history, milestones); streak detail with policy/sick tokens.
- **Tier 3:** rules engine (schedules, presets, gyms, goals config), app group picker, notifications — settings, never surfaced on home.

## 6. Visual direction (from design-system pass — to be refined)
- OLED dark-first; solid surfaces `#121212–#1E1E1E`, off-white text, desaturated accents; WCAG AA in dark checked independently.
- Accent family: earn-green + streak-amber + blocked-red (semantic, tokenized).
- Athletic condensed display type for the hero number (e.g. Barlow Condensed) + neutral body; tabular figures for all timers.
- Motion: spring-based, 150–300ms; the ring drain/refill and claim payout are the two signature animations. Respect reduced-motion.
- SVG icon set (Lucide/SF Symbols), one stroke weight; no emoji as icons.

## 7. Open design questions
- Does the streak chip live in the status strip or fused to the hero ring?
- Full Lock morning: red-empty vs. neutral-"quest" styling (red may read as error before any failure occurred).
- Whether the earn sheet (CTA target) duplicates the earn row or extends it.
- Widget/Lock-Screen ring (post-v1, but the ring design should be widget-ready from day one).
