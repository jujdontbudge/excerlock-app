# 03 — Design system

Authority: the handoff's "Visual direction — non-negotiable", `design/STYLE.md` (with its 2026-09-06 and
2026-09-05 overrides at the top), and `design/research/appblock-orange/DESIGN-SYSTEM.md` §5–§8 for tokens and
component contracts. Where that document's §9 "illustration grammar" describes dimensional objects, it is
**superseded** by the 2026-09-06 icon correction below. Codex owns layout placement and motion, informed by Gemini's reference study in `design/motion/reference/`; this file owns tokens and component anatomy.

## 1. Tokens (`app-next/src/design-system/tokens.ts`, the only place values live)

### Color

| Token | Value | Use |
| --- | --- | --- |
| `surface.canvas` | `#FFFFFF` | Every page background, safe areas, footers |
| `surface.topTint` | `#FFF0E5` | Top-edge wash start |
| `surface.topTintMid` | `#FFF8F3` | Wash midpoint |
| `surface.card` | `#FFFFFF` | Cards |
| `surface.subtle` | `#F7F7F8` | Inset fields, segmented tracks, grouped-list background |
| `surface.selected` | `#FFF1E8` | Selected option interior |
| `text.primary` | `#1D1D22` | Titles, values, option labels |
| `text.secondary` | `#66666F` | Explanations, units |
| `text.muted` | `#767680` | Footnotes |
| `text.onAccent` | `#FFFFFF` | On orange |
| `brand.primary` | `#C94710` | Primary CTA, active controls, progress, selected outline |
| `brand.pressed` | `#AE380A` | Pressed CTA |
| `brand.decorative` | `#F47735` | Illustration accents only, never small text or buttons |
| `brand.light` | `#FFD6BD` | Secondary illustration surfaces |
| `border.default` | `#E5E5EA` | Card and field borders, 1 pt |
| `border.selected` | `#C94710` | 1.5 pt |
| `state.disabledFill` / `state.disabledText` | `#EEEEF1` / `#909099` | Disabled controls |
| `state.success` | `#27834A` | Real success only (met, unlocked) |
| `state.error` | `#BD3038` | Validation only |
| `state.locked` | `#1D1D22` | Locked status uses primary text plus the lock icon, not red |
| `chart.exercise` | `#C94710` | Exercise series |
| `chart.comparison` | `#92929C` | Screen-time / baseline series |
| `chart.grid` | `#ECECEF` | Grids and tracks |
| `icon.mint` / `icon.lilac` / `icon.sky` / `icon.coral` / `icon.yellow` | `#9FE1C3` / `#C9B8F5` / `#9CCBFF` / `#FF8A80` / `#FFD466` | The five icon fill colors (specified, not sampled) |

Top wash recipe: vertical gradient `topTint` at y=0 → `topTintMid` at y=96 → `canvas` by y=220. Applied by
`ScreenShell` only; screens never paint their own gradient. Nothing below 220 pt is ever tinted.

Dark mode: **not supported in v1.** `userInterfaceStyle: "light"` in `app.json`.

### Typography (SF Pro via the system font; SF Pro Display for `hero`, `question`, `metric`)

| Token | Size/line | Weight |
| --- | --- | --- |
| `type.hero` | 30/36 | 700 |
| `type.question` | 26/32 | 700 |
| `type.section` | 20/26 | 600 |
| `type.body` | 16/22 | 400 |
| `type.label` | 16/22 | 600 |
| `type.support` | 13/18 | 400 |
| `type.badge` | 11/14 | 600, uppercase allowed |
| `type.metric` | 48/54 | 700, tabular figures |
| `type.metricSmall` | 28/34 | 700, tabular figures (cards) |

Dynamic Type: all text uses `allowFontScaling` with `maxFontSizeMultiplier` 1.6 (2.0 for body). Layouts must
survive the XL accessibility size without clipping the CTA (test in T16).

### Spacing, radii, geometry

- Spacing scale `4 8 12 16 24 32 40 48 64`. Page inset **24 pt**. Card padding 16. Row gap 12. Title→support 4.
  Question title→copy 12. Copy→choices 24–32.
- Radii: card 20, field 16, choice row 16, sheet top 28, badge full, CTA 27 (54 pt tall).
- Touch targets ≥ 44 pt. Circular icon control 36 pt disc inside 44 pt target.
- Standard glyph 20–24 pt, stroke ~1.75–2 pt (utility icons). Activity/feature icons 40–56 pt.
- Shadow only on the primary CTA and hero objects: y 4, blur 12, 8% black. Cards use border/fill.
- Tab bar: native height (49 + safe area), white, top hairline `border.default`, active tint `brand.primary`,
  inactive `text.muted`, label under icon (OtterLife style; confirm against the reference inventory).
- Logical canvas target 402 × 874 pt (iPhone 17 Pro); everything is relative, safe areas resolved at runtime.

### Motion tokens (the floor; Codex may add named curves, never replace these names)

```ts
duration: { press: 100, fast: 180, standard: 240, slow: 320, sheet: 360, reveal: 600, tick: 900 }
easing:   { standard: [0.2, 0, 0, 1], enter: [0.16, 1, 0.3, 1], exit: [0.4, 0, 1, 1] }
spring:   { control: { mass: 0.55, stiffness: 420, damping: 30 },
            card:    { mass: 0.75, stiffness: 300, damping: 26 },
            sheet:   { mass: 1,    stiffness: 250, damping: 28 },
            pop:     { mass: 0.8,  stiffness: 240, damping: 15 } }
stagger:  { list: 40, hero: 90 }   // ms between siblings
```

Reduce Motion: every spatial animation has a crossfade fallback; `useReducedMotion()` gates it. Tests run in
reduced motion (as the old mock did).

Haptics (expo-haptics): selection change → `selectionAsync`; primary CTA press → `impactAsync(Light)`; rule
met / unlocked → `notificationAsync(Success)`; validation error → `notificationAsync(Error)`. Never on scroll.

## 2. Icon rules (2026-09-06 correction, supersedes everything older)

- Simple multicolor graphic icons: rounded silhouettes, a few broad flat color areas from the five icon
  colors plus `brand.decorative`, minimal soft shading. No realistic skin, faces, anatomy, metallic shine,
  shoe stitching, spokes, or toy-like renders. No decorative pill, circle, tile or pedestal behind an icon.
- Utility and navigation icons are simple line glyphs and must be semantically correct: bell = notifications,
  ruler = units, flame = streak, lock = blocked, lock-open = unlocked, map-pin = gym, footprints = walking,
  dumbbell = gym, running shoe = running, bicycle = biking, shield = Screen Time, heart = Health, gear =
  settings, chart = analytics, list = conditions, house = home.
- Icons ship as SVG in `app-next/assets/icons/` rendered through `react-native-svg`, tinted at render time
  for utility glyphs; multicolor activity icons are not tinted.
- Every generated raster or SVG asset follows `design/STYLE.md` §3–§6 (magenta pipeline for rasters, FOUNDRY
  manifest, or it does not ship). For Phase 1, Codex may draw the utility glyphs as hand-authored SVG paths
  (documented in `assets/icons/FOUNDRY.md` as "authored, not generated"); the multicolor activity and feature
  icons are generated per STYLE.md Family A/B rules with the icon-correction prompt language from
  `design/mockups/onboarding-orange/smooth-icon-prompts.json`.

## 3. Components (`app-next/src/design-system/`, one file each, README per folder)

| Component | Anatomy | Notes |
| --- | --- | --- |
| `ScreenShell` | canvas + top wash + safe-area content + optional fixed footer | The only place the wash is painted. `footer` slot pins the CTA above the home indicator. |
| `OnboardingHeader` | back circle (44 pt) · progress track · optional close | Progress is a thin orange bar, fraction supplied by the flow machine. |
| `Heading` | `question` or `hero` title + optional `body` support | Center for reveal screens, left for forms. |
| `PrimaryButton` | 54 pt pill, `brand.primary`, white label, spinner state, disabled state | Press: scale 0.97 + `brand.pressed`, 100 ms. |
| `SecondaryButton` | same height, `surface.selected` fill + `brand.primary` text, or text-only tertiary | |
| `ChoiceRow` | ≥ 60 pt, optional leading icon, title, optional support, trailing radio/check | Selected: `surface.selected` + 1.5 pt orange border. Recommended badge inline. |
| `ChoiceGrid` (2×2) | `ActivityCard` × 4 | Icon above label, 171 pt nominal, 12 pt gap. |
| `TextField` | 56 pt, subtle fill, focus orange, error line | Keyboard-avoiding; CTA rides above the keyboard. |
| `NumberField` | typed numeric with unit suffix and optional unit dropdown (`km`/`mi`) | Used for steps, minutes, distance. |
| `Slider` | single-value, orange track, haptic ticks | Scrolling-hours screen. |
| `DayPicker` | seven 36 pt discs + shortcuts (Weekdays, Every day) | |
| `TimeRangeRow` | start/end capsules → native time wheel sheet; "All day" switch | |
| `ScheduleWidget` | the widget illustration used in intro and Home: two time capsules, tiny app tiles, status line | |
| `StatusCard` (Home hero) | lock/open icon, status title, subtitle, next-change line | State-driven; the unlock moment lives here (simple v1). |
| `ProgressCard` | activity icon, rule name, progress bar or ring, remaining text, optional action (Check in / Start walk) | |
| `RuleCard` (Conditions) | activity icon, rule name, schedule line, enabled switch, chevron | Swipe-to-delete via Gesture Handler. |
| `SegmentedControl` | Week/Month/Year etc. | Sliding indicator, spring `control`. |
| `BarChart` / `LineChart` | SVG, orange + comparison series, direct labels | No chart library. |
| `StatTile` | metric + label | |
| `StreakBadge` | flame + number | |
| `SettingsGroup` / `SettingsRow` | inset grouped list, 1 pt separators, native-looking chevrons, value text, switch | Order and grouping per Codex's OtterLife mapping (from the reference study). |
| `PermissionRow` | icon, name, status pill (Granted / Off / Needed), action | |
| `BottomSheet` | 28 pt corners, grabber, dim backdrop, spring `sheet`, drag-to-dismiss | Gesture Handler + Reanimated, not a RN `Modal`. |
| `Toast` | none | Not used. State changes are shown in place. |
| `EmptyState` | icon, title, body, CTA | Conditions empty, Analytics day-zero, no gyms saved. |
| `Checklist` | rows with animated checks | "Setting up your plan" and post-paywall setup. |
| `TrialTimeline` | three milestones, connectors, current milestone orange | |
| `DotGrid` | N × M dots with emphasized subset, animated fill | Year-of-life screens. |
| `LoopDiagram` | three-node loop with animated state (1 → 2 → 3) | The scroll-loop story. |
| `DevMenu` | hidden, 7 taps on Settings footer | Scenario switcher (see `04-architecture.md`). |

Every component: props typed, no color/radius literals (tokens only), an accessibility label or role, a
Jest test that renders each variant, and a story-like `__previews__` entry the dev menu can open.

## 4. Copy rules

Sentence case. No exclamation hype. No fabricated reviews, user counts, ratings, university logos or
"addiction transfer" claims. Suitable habit copy: "A small reward can help you repeat a habit." / "Move first.
Then enjoy a little screen time." Onboarding questions ≤ 3 lines. Numbers use tabular figures and thin-space
thousands separators via `Intl.NumberFormat`.
