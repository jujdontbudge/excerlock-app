# ExcerLock Visual Style Guide — Pillow DNA, Orange Theme

> Source: forensic study of all 262 Pillow (iOS sleep tracker) screens in `reference/pillow/`.
> Rule: **replicate Pillow's system exactly; swap the purple theme for orange.** Every token below states Pillow's original → ExcerLock's orange equivalent.

---

## 1. The core visual DNA (what makes Pillow look like Pillow)

1. **Full-bleed vertical gradient background** on every screen — deep near-black at top flowing into a saturated brand color at the bottom. Never flat, never pure black (except alarm/night screens which go near-black with a faint tint).
2. **One signature multi-stop gradient** (purple → magenta → orange in the logo, Discover cards, icon chips). Used sparingly as the "brand moment," not everywhere.
3. **Translucent white cards** (~6–10% white) over the gradient, radius ~16–20, **no borders** — hierarchy comes from layered translucency, not strokes.
4. **Pill buttons**: solid brand-color pill for primary in-content actions; **solid white pill** for the big screen-level action ("Next", "Done", "I accept") sitting near the bottom.
5. **A second "energy" accent** reserved for urgency/attention (in Pillow: orange — Snooze, countdown warnings, "What's included →", In-Progress chips, the Check button). Never used for primary chrome.
6. **Bright categorical data colors** on dark: Awake=orange, REM=magenta/pink, Light=green, Deep=blue — fat **rounded** bars, colored dot legends beneath.
7. **Big rounded numerals** for the hero number (8.00 AM style — SF Pro Rounded/light, huge, white), tiny unit suffixes.
8. **Ring motifs** for live states: sleep-progress ring, orange "shake to deactivate" ring — thick stroke, rounded caps, glow-ish.
9. **White tab bar** (5 items) even though the app is dark — monochrome gray glyphs, selected = brand color. Home indicator area stays white.
10. **Circular icon chips** to open every explainer/onboarding screen: a big circle in translucent brand tint containing a filled glyph, centered above title + body + CTA.
11. **iOS-native everything**: white alerts, white wheel pickers on cards, native sheets with grabber, green iOS toggles, segmented controls (white selected pill on translucent track).
12. **Photographic content cards** with dark gradient overlays, tiny uppercase category labels (MEDITATION / MUSIC / STORY), NEW badge, horizontal carousels with VIEW ALL chip.
13. **Light cards inside dark app** for "content items" (Discover tips/challenges are white cards with gradient hero images) — deliberate contrast pop.
14. **Generous calm spacing**: ~16pt side margins, large title at top-left OR centered sheet title, everything vertically roomy.

## 2. Color tokens — purple → orange mapping

| Token | Pillow (purple) | ExcerLock (orange) |
|---|---|---|
| `bg-top` | #16101F near-black indigo | **#1A0F06** near-black warm umber |
| `bg-bottom` | #6D28D9 saturated purple | **#C2570A** burnt orange |
| `bg-detail` (stats/detail screens, more muted) | #2A1745 | **#33200D** |
| `bg-night` (lock/alarm live screens) | #0D0A14 + tint | **#120C05** + tint |
| `primary` (buttons, selected states, tab active) | #7C3AED violet | **#F97316** orange |
| `primary-pressed` | #6D28D9 | **#EA580C** |
| `on-primary` | #FFFFFF | #FFFFFF |
| `accent-energy` (urgency, countdowns, links, progress) | #F97316 orange | **#8B5CF6 violet** (role swap) — use for "claim/boost" moments |
| `card` | rgba(255,255,255,0.08) | same |
| `card-elevated` | rgba(255,255,255,0.12) | same |
| `pill-screen-cta` | #FFFFFF (black text) | same |
| `success / earn` | iOS green #34C759 | same — "time earned" green |
| `danger / destructive` | #EF4444 / pink-red | same — shields-up red |
| `text-primary` | #FFFFFF | same |
| `text-secondary` | lavender-white 60% | **warm white 60% (#FFF8F0 @ 60%)** |
| `signature-gradient` | purple→magenta→orange | **orange→amber→magenta** (#F97316 → #FBBF24 → #EC4899) |
| Data categorical | orange/pink/green/blue | keep: **amber #F59E0B, pink #EC4899, green #22C55E, blue #3B82F6** (map to app-usage/earn types) |

Contrast rule: hero numerals and body text always sit on the darker half of the gradient or on a card; check AA in both halves.

## 3. Typography (copy Pillow exactly)

- System: **SF Pro** (Text/Display), SF Pro **Rounded** for hero numerals.
- Hero numeral (balance countdown, alarm clock): Rounded, Light/Regular, ~72–96pt, white, tiny AM/PM-style suffix in ~17pt.
- Screen titles: Bold 28–34pt white, top-left ("Sleep Aid", "Discover", "Trends") or centered 17pt semibold for sheet titles.
- Card titles 17pt semibold; body 15pt regular at 60–70% white; caption/labels 13pt.
- Emphasis lines inside body text use the energy accent color (Pillow does orange bold inline warnings).
- Tabular figures for all timers/counters.

## 4. Component specs (from the screens)

- **Primary pill button**: full-width minus 32pt, height ~50pt, radius 25, solid `primary`, white 17pt semibold label. Arrow suffix (→) on continue-style CTAs.
- **White screen CTA**: same geometry, white bg, near-black label ("Next", "I accept", "Done").
- **Secondary pill**: translucent white 10% bg, white label ("Skip", "Cancel").
- **Circular nav buttons**: onboarding questionnaires use round 44pt `primary` circles with ←/→ glyphs, bottom corners.
- **Option list rows** (questionnaire): full-width cards, radius 12, translucent; **selected = solid `primary` fill** with white text.
- **Settings rows**: plain rows on bg, 17pt white label, chevron, subtitle 13pt 50% white; grouped under 13pt uppercase section headers ("SLEEP TRACKING", "NOTIFICATIONS").
- **Toggles**: iOS green. **Pickers/alerts**: native white on floating card.
- **Segmented control** (Week/Month/Year): translucent track, white selected pill, black selected text.
- **Ring (live state)**: ~8–10pt stroke, rounded caps, brand color on 15% white track, optional trailing dot; center = icon or numeral.
- **Charts**: fat rounded vertical bars (width ≈ 40% of slot), no gridlines except faint dotted baselines, value labels right-aligned ("5h 9m"), dot legends below, "Compared with ▾" dropdown row card.
- **Carousel content card**: 4:5-ish photo, radius 16, dark bottom gradient, caption ("MEDITATION / The Breath of Fall / 7 min"), star favorite, NEW badge chip in `primary`.
- **Tab bar**: white bg, 5 filled glyphs, gray inactive #9CA3AF, active `primary`.
- **Chips**: filter chips ("All", "Saved", "Tips") — selected solid `primary`, unselected translucent outline-less.
- **Banner cards** (What's new, Finish setup): translucent card + leading circular icon chip + title + one-liner + X dismiss.
- **Empty states**: centered icon, short title, 60% white body ("No favorites added.").
- **Confirm-destructive**: native white alert, red Delete, or dark sheet listing "Delete all" in red.

## 5. Screen archetypes to reuse for ExcerLock

| Pillow archetype | ExcerLock use |
|---|---|
| Diary home: week dots → big ring → stat banners | Dashboard: streak/week strip → balance ring → earn cards |
| Alarm preset card ("Rise and shine", toggles, big 8.00 AM) | Lock-schedule preset editor (base allowance, lock window) |
| Live night screen (near-black, huge clock, Snooze orange) | Shields-up / Full-Lock live screen ("Locked — earn to unlock", violet Claim) |
| Session detail (hypnogram + stat cards) | Day ledger: drain/earn timeline + per-app breakdown |
| Trends tab (metric cards → drill-in charts) | Stats: time reclaimed, streak, earned-by-source |
| Discover (white tip/challenge cards, program setup Q&A) | Presets & challenges; onboarding questionnaire = identical pattern |
| Sleep Aid content carousels | (optional) workout/earn inspiration carousels |
| Paywall: trial timeline, price card, 25% winback with 3D art | Identical monetization flow (hard paywall after onboarding) |
| Permission explainers (circle chip, title, body, white CTA) | Screen Time / Location / HealthKit permission explainers |
| Mood check-in sheet (emoji list) | Post-earn "how was the workout?" optional check-in |

## 6. Motion & feel (inferred)

- Spring-y iOS-native transitions; sheets slide with grabber; carousels bounce.
- The ring animates continuously (progress + subtle glow) — ExcerLock's balance ring drains in real time, refills on claim (signature animation + haptic).
- Keep 150–300ms micro-interactions, ease-out; celebrate claim with the signature gradient.

## 7. Don'ts (Pillow never does these)

- No borders/strokes on cards; no drop shadows on dark.
- No pure black or pure flat backgrounds on content screens.
- No more than one accent color per element; energy accent never used for primary CTAs.
- No dense gridlines or thin bars in charts; no unrounded rectangles anywhere (min radius ~12).
- Tab bar never dark, never more than 5 items.
