# ExcerLock — AppBlock-informed white and orange design system

Date: 2026-09-05. Status: research and proposed design specification; mockups not yet generated or approved.

## 1. Direction and authority

The user requests a complete visual redesign. Preserve the agreed onboarding order and intent, but translate every source app into one visual language. AppBlock is the aesthetic reference. Use a white screen with a small, pale orange gradient at the top, orange primary buttons, and white button text. Do not carry over DAWG's black theatrical layouts, Unrot's green controls, OtterLife's lavender styling, or the former ExcerLock full-screen orange gradient.

This specification supersedes the former Family D Pillow/orange background direction for this onboarding redesign only. It does not retroactively recolor the research screenshots or change the shipped dashboard. Generate actual mockup imagery with GPT Image; source screenshots remain evidence.

## 2. Evidence, scope, and confidence

- [ScreensDesign AppBlock reference](https://screensdesign.com/apps/appblock-apps-web-blocker/?id=1901): app 1901, replay 3371, 153 recorded states. All 153 state descriptions were retrieved; representative visual states were inspected, not every animation frame.
- [App Store listing](https://apps.apple.com/us/app/id1515753232): nine listing images retrieved through ScreensDesign market record 2012. All nine inspected visually.
- `evidence.json` preserves the returned metadata, screen IDs, source URLs, and descriptions.
- `reference/` contains the nine store images and 26 selected replay images. `store-contact.jpg`, `replay-contact.jpg`, and `product-contact.jpg` support comparison. Individual source files are authoritative if a contact sheet loses detail.
- Recorded product imagery and store creatives differ: the listing uses predominantly white marketing canvases enclosing dark product screens; the replay shows pale blue/lavender product surfaces. These are distinct treatments, not a single set of literal colors to copy.
- **Observed** means directly visible in inspected images. **Estimated** means a visual approximation from raster references. **Specified** means the exact target value chosen here for ExcerLock. No font source, Figma variables, original constraints, or native layout code was provided. Exact AppBlock font names, hex values, radii, and point spacing cannot be verified from these screenshots alone.

## 3. App Store screenshot audit

Position numbers here are 1-based and correspond to `reference/store-N.jpg`.

| Image | Composition and hierarchy | Reusable design lesson | ExcerLock translation |
|---|---|---|---|
| 1 | Large dark navy headline, reversed word in navy rounded rectangle; benefit sentence; laurel social proof; media logos; diagonal crop of app icons | One benefit dominates. The icon field establishes the problem instantly | Use our exercise-to-unlock benefit and our own proof only. Orange emphasis; never copy their claims or endorsements |
| 2 | Headline above tall black phone; blocked-app screen; oversized blue padlock overlaps device; testimonial overlays lower area | One concrete state plus one object explains the promise | A lock or exercise object supporting an unlock preview; omit marketing device frame inside onboarding |
| 3 | “No bypass” emphasis; centered Strict Mode screen with purple lock orb; blue award ribbon outside phone | Constraints become a tangible lock metaphor | Show the actual exercise condition, without claiming impossible bypass prevention |
| 4 | Headline above Insights; segmented control, big metric, stacked bars, app rows | Analytical hierarchy: period, number, chart, detail | Orange highlight for exercise; neutral comparison series for scrolling |
| 5 | Blocking schedules; Quick Block above repeatable schedule cards; bottom navigation | Cards expose state, rule, and action with minimal reading | Rule cards show activity, threshold, schedule, reward |
| 6 | Active-time sheet; times card, seven day circles, timeline | Related settings grouped into small cards; visual summary closes the loop | Same structure with warm neutral surfaces and orange selected days |
| 7 | Four stacked blocking-method cards; title, explanatory text, category tags, trailing dimensional icon | Choice cards teach while users choose | Walking, gym, running, biking; readable descriptions before decorative tags |
| 8 | iOS widget above home-screen icons | Compact widget communicates utility before entering app | Two time ranges plus “Blocked until arrival at the gym” in a preview widget |
| 9 | Benefit headline; six icon/label pairs in a two-column grid; proof footer | Rounded colored icon discs and short labels soften utility | Exercise catalog or benefit grid; avoid borrowed medical claims and user counts |

Store type is a clean sans-serif with mixed regular and heavy emphasis. It is not the serif used in DAWG. Marketing headings are intentionally larger relative to the canvas than in-app headings. Do not derive mobile title sizes from them.

## 4. In-app visual anatomy

### Launch and introduction

Replay 1 (`293699`) is a pale solid splash with a small centered blue symbol. Replay 2 (`293701`) is a native tracking dialog. Replay 3 (`293705`) is a branded launch state. Replays 4–6 (`293707`, `293710`, `293712`) share a feature-carousel composition: centered two-line headline, large hero scene, short benefit caption, three pagination dots, pill CTA, sign-in line, fine-print footer.

The carousel background is saturated blue above, dissolving into pale lavender below. Widget imagery combines overlapping app tiles, a rounded deep-blue information card, and a timeline. The progress graphic combines translucent upright bars and a descending bright curve. Strict Mode uses a central dimensional lock with surrounding labeled tiles. AppBlock's illustrations mix flat UI and rounded dimensional objects; they are not photographs or ornate painted scenes.

**Translate:** white background; tint confined to upper 180–240 pt; dark headline; orange/peach widget and illustrations. Keep the calm vertical hierarchy. No saturated orange wash under the entire screen.

### Forms and questions

Replay 8 (`293717`) shows email fields on a rounded modal surface with a circular close control. Replay 10 (`293722`) shows a personalized heading above a central app-icon illustration. Replay 12 (`293726`) uses centered question, tiny instruction, large value, vertical rounded slider, helper text, then bottom CTA. Fields are broad white capsules with small leading icons and restrained trailing controls. The choice cards in replay 40 (`293768`) use title/body/tags on the left and a compact illustration on the right.

**Translate:** shared question shell, consistent left/right edges, low-noise choice cards, orange selection border/check. Keep headings dark. Do not preserve source-app fonts when translating DAWG, Opal, or Unrot content.

### Schedule and settings

Replay 41 (`293769`): back circle, compact progress mark, centered question; white Times card with toggle and range; white Days card with seven circles; bordered timeline summary; bottom CTA. Replay 72 (`293800`) shows a rule editor with editable title, grouped condition and blocking fields, separator lines, and compact trailing chevrons. Replays 64/80 (`293792`/`293808`) use native-looking duration wheels, a pale selected band, and generous surrounding space.

**Translate:** white page, slightly tinted panels where separation is needed, 16 pt card padding, orange active controls. A day picker and a time wheel are genuinely different mockup types even if both configure a schedule.

### Analytics, success, and guidance

Replays 90/94 (`293818`/`293822`): compact top controls, full-width segmented period selector, large centered metric, plot, supporting cards, app list. Replay 47 (`293775`): clock illustration, centered success title, two metric rows, dark purple summary card, CTA. Replays 103/111/116 (`293831`/`293839`/`293844`) illustrate three guidance patterns: isolated hero object; icon-and-text checklist; recommended method explanation.

**Translate:** larger meaning, fewer decorations. Orange/neutral charts with explicit labels. A white summary card with an orange status label replaces the dark purple block. Distinguish measured results from illustrative projections.

### Sheets, navigation, and profile

Replay 120 (`293848`) is a rounded bottom sheet with a grabber, close circle, repeated method cards, and a blue outlined selection. Replay 129 (`293857`) places avatar/name above grouped settings cards; replay 136 (`293864`) has compact icon/title/helper/toggle rows. Replay 50 (`293778`) uses a floating rounded four-tab bar. These are useful supporting patterns, but a tab bar does not belong in the onboarding flow.

## 5. Target color tokens — specified, not sampled AppBlock values

| Token | Value | Usage |
|---|---|---|
| `surface.canvas` | `#FFFFFF` | Entire page, footer, safe areas |
| `surface.topTint` | `#FFF0E5` | Very pale orange at top edge |
| `surface.topTintMid` | `#FFF8F3` | Midpoint of top fade |
| `surface.card` | `#FFFFFF` | Standard card |
| `surface.subtle` | `#F7F7F8` | Inset field, segmented track, grouping |
| `surface.selected` | `#FFF1E8` | Selected option interior |
| `text.primary` | `#1D1D22` | Titles, main values, option labels |
| `text.secondary` | `#66666F` | Explanations, units |
| `text.muted` | `#767680` | Supporting footnotes on white |
| `text.onAccent` | `#FFFFFF` | Primary button and filled selected control |
| `brand.primary` | `#C94710` | CTA, active radio, progress, active day |
| `brand.pressed` | `#AE380A` | Pressed CTA |
| `brand.decorative` | `#F47735` | Larger illustration accents, non-text graphic fills |
| `brand.light` | `#FFD6BD` | Secondary illustration surfaces |
| `border.default` | `#E5E5EA` | Card/field separation |
| `border.selected` | `#C94710` | Selected card outline |
| `state.disabledFill` | `#EEEEF1` | Disabled button |
| `state.disabledText` | `#909099` | Disabled label |
| `state.success` | `#27834A` | Actual success only |
| `state.error` | `#BD3038` | Validation only |
| `chart.comparison` | `#92929C` | Scrolling or baseline series |
| `chart.grid` | `#ECECEF` | Chart tracks and grids |

The darker orange primary is chosen to support readable white button labels. The brighter orange belongs in illustrations, not small white-label buttons. Final combinations need contrast verification in implementation; raster generation is not a contrast guarantee.

Background recipe: vertical fade `#FFF0E5` at y=0, `#FFF8F3` at y=96 pt, `#FFFFFF` by y=220 pt. Everything below stays white. No orange footer gradient, dark corners inside the display, random glow clouds, or blue/lavender tint. The tint is a quiet wash, not a visible colored panel.

Blue-to-orange mapping is semantic: brand-blue CTA → primary orange; blue selection tint → pale peach; blue link → primary orange; blue decorative 3D object → orange/peach; blue plot emphasis → orange. Preserve native system dialogs and third-party app-icon colors. Do not hue-shift an entire screenshot.

## 6. Typography specification

Observed reference: compact native-looking sans-serif, mostly regular body and bold titles; exact family unverified. Target: **SF Pro**, with SF Pro Display for large titles/metrics and SF Pro Text for smaller content. No serif, decorative rounded display font, or DAWG-style condensed text. Web preview fallback: system-ui, then Arial. Font rendering in GPT Image is an approximation; implementation owns exact type.

| Token | Size / line height, pt | Weight | Assignment |
|---|---|---|---|
| `type.hero` | 30 / 36 | 700 | Feature headline, success headline |
| `type.question` | 26 / 32 | 700 | Quiz or configuration heading |
| `type.section` | 20 / 26 | 600 | Card group heading, sheet title |
| `type.body` | 16 / 22 | 400 | Instructions, option descriptions |
| `type.label` | 16 / 22 | 600 | Option title, button label |
| `type.support` | 13 / 18 | 400 | Helper, footnote, legend |
| `type.badge` | 11 / 14 | 600 | Recommended/status pill |
| `type.metric` | 48 / 54 | 700 | Main time/steps number, tabular digits |

Each screen normally uses title, body, label, support; metric screens substitute metric for title emphasis. Letter spacing is normal, with at most -0.3 pt on large headings. Uppercase only for short metadata badges. Center hero/reveal headlines; left-align row content and setting labels. Limit questions to three lines. Expand layout for text rather than reducing all copy to tiny sizes.

## 7. Geometry and spacing

Target logical canvas: 402 × 874 pt, corresponding to iPhone 17 Pro at 1206 × 2622 px. These are ExcerLock implementation targets. Do not measure from ScreensDesign's watermark or the outer board card.

- Horizontal page inset: 24 pt; content width 354 pt.
- Spacing scale: 4, 8, 12, 16, 24, 32, 40, 48, 64 pt.
- Content below native top safe area. Reserve approximately 62 pt at top; navigation row 44 pt high with 12 pt following gap. Resolve actual safe areas at runtime.
- Question title → supporting copy: 12 pt. Copy → choices/hero: 24–32 pt.
- Row gap: 12 pt. Card padding: 16 pt. Icon → text: 12 pt. Title → helper: 4 pt.
- Primary CTA height: 54 pt; full content width; radius 27 pt.
- Footer bottom inset: safe-area bottom + 16 pt. CTA → footer link/legal: 12 pt if present. Scroll content never beneath CTA.
- Card radius: 20 pt. Field radius: 16 pt. Selection-row radius: 16 pt. Sheet top radius: 28 pt. Small badges fully rounded.
- Circular icon control: 36 pt visible disc inside at least a 44 pt touch target. Standard glyph: 20–24 pt, approximately 1.75–2 pt stroke.
- Illustration region: typically 220–280 pt tall; centered; occupies one primary visual region rather than scattered corners.
- Standard border: 1 pt. Selected option: 1.5 pt orange.
- Soft elevation only for hero objects or primary CTA: y=4 pt, blur=12 pt, opacity around 8%. Most cards rely on border/fill, not shadows.
- Question choices may scroll; footer remains fixed. Native keyboard moves the name CTA above the keyboard; do not obscure the field or shrink the entire screen.

## 8. Component-to-token contract

| Component | Construction | Tokens and states |
|---|---|---|
| `ScreenShell` | White page, top wash, safe-area content, fixed white footer | canvas, topTint, 24 pt inset |
| `OnboardingHeader` | Back circle left; compact progress track; optional close for a sheet | 44 pt target; subtle track; orange progress; no added step badge on screenshot |
| `QuestionHeading` | Heading with optional short support copy | question, body, primary/secondary text; 12 pt gap |
| `PrimaryButton` | 354 × 54 pt pill; centered label | primary/onAccent; pressed darker; disabled neutral; spinner replaces label while submitting |
| `SecondaryButton` | Same height, pale peach interior or text-only tertiary action | selected surface/primary text; never competes with primary |
| `ChoiceRow` | Min 60 pt; leading 24 pt icon optional; flexible title; trailing radio/check | white + default border; selected peach + orange border; 16 pt padding |
| `RecommendedChoice` | ChoiceRow with small inline badge below label or alongside it if room | peach badge and orange text; recommendation does not equal preselection |
| `NameField` | One 56 pt input, label and optional leading user glyph | subtle fill, default border, 16 pt text; focus orange; error below in red |
| `ActivityCard` | Four cards in two columns; icon above short label; roomy touch target | 171 pt nominal width with 12 pt gap; 20 pt radius; selected contract matches ChoiceRow |
| `ScheduleWidget` | Rounded panel, condition/status line, two time rows, tiny app tiles, lock state | white/peach surfaces; orange active line; dark labels; no native app logo copying |
| `DurationPicker` | Native wheel in panel; selected band; unit beneath; presets above optional | subtle selected band; dark tabular metric; orange selected preset |
| `DayPicker` | Seven circles within card; weekday shortcuts above or below | 36 pt discs with expanded hit targets; selected orange/white; unselected subtle/dark |
| `TimeRangeRow` | Start and end values separated by dash, optional add/remove controls | subtle capsule, dark label, orange action; explicit AM/PM |
| `DataReveal` | Heading, numeric summary or dot grid, explanation, CTA | metric orange; inactive dots neutral; consistent grid footprint across stages |
| `OutcomeChart` | Two curves with direct endpoint labels and small legend | orange exercise, gray screen time; axes readable; no unsupported quantified promise |
| `ScienceExplainer` | One concrete illustration, short title, one brief paragraph | hero/question + body; warm illustration; evidence-linked copy outside mockup if needed |
| `BuildingPlan` | Center progress ring/checklist; no fake lengthy countdown | orange progress; real completed checks; same typography as other screens |
| `PlanSummary` | One grouped card with activity, threshold, days, times, reward; edit affordances | white/border; orange status; label/support; no dense marketing stats |
| `ReviewWarmup` | Question, five rating targets, optional short helper, CTA | neutral stars before selection; orange selected; 44 pt targets |
| `TrialTimeline` | Three vertical milestones and connectors, short benefit rows, CTA | orange current milestone, gray future rail; clear trial/billing text |
| `PlanOption` | Price/period, benefit or trial line, radio, optional badge | ChoiceRow selection contract; actual prices only |
| `TestimonialCard` | Quote, person attribution, optional avatar, restrained rating | no invented real testimonial or numerical proof; mock copy clearly illustrative |
| `BottomSheet` | Dimmed backdrop, white surface, grabber, title, close, rows | 28 pt corners; 16/24 pt padding; content scrolls |

Do not transform a static choice row into a screenshot of a working interaction. Mockups demonstrate states; the implementation supplies hit targets, accessibility labels, animations, and persistence.

## 9. Illustration grammar

Use AppBlock's rounded, friendly dimensional utility objects: lock, clock, app tiles, bars, target, shoe, bicycle. Matte or satin surfaces; soft highlights; shallow perspective; simple readable silhouette. Mostly ivory/white body surfaces, orange or peach accents and gentle warm gray shade. Avoid neon, glass overload, strong purple orb styling, photographic gym scenes, chess metaphors, and full-screen orange art.

Widget hero: two time intervals and a separate arrival condition line. Exercise catalog hero: walking shoe, running shoe, bike, gym weight with equal visual importance. Progress hero: compact chart with exercise increasing and scrolling decreasing. Control hero: lock and surrounding rule tiles. All three share material and lighting, but deserve separate generated mockups because their information graphics differ.

## 10. Mockup coverage and deduplication

Current board has 44 cards. Keep sequence intact while generating **24 distinct layout mockups: 21 onboarding layouts plus 3 paywall/proof layouts**. A reuse mapping means use the same design template with new copy/data; it does not merge chronological steps or stack different steps on the flow board.

| Mockup ID | Representative design | Board cards covered | What changes between reused states |
|---|---|---|---|
| M01 | Minimal ExcerLock launch | 1 | Actual blank loading state; exclude tracking popup |
| M02 | Blocking widget feature introduction | 2 | Two configured time ranges; gym-arrival line |
| M03 | Exercise catalog feature introduction | 3 | Redesigned hero illustration in the AppBlock feature shell |
| M04 | Progress feature introduction | 4 | Chart illustration |
| M05 | Control/lock feature introduction | 5 | Lock/rule illustration |
| M06 | Name input | 6 | Focus and keyboard states described, one main mockup |
| M07 | Single-choice question | 7, 8, 9, 10, 11, 12 | Referral, age, occupation, improvement, motivation, estimated usage; scroll long lists |
| M08 | Screen-time arithmetic reveal | 13 | Large daily/monthly/yearly calculation, truthful units |
| M09 | Life/time dot grid | 14, 15, 16 | Same grid; successive dot emphasis, all retained as sequential states |
| M10 | Feelings multi-select | 17 | Checkbox list; multiple checked options |
| M11 | Reassurance/explanation | 18, 19, 21 | Headline and supporting illustration; same composition |
| M12 | Outcome comparison chart | 20, 24 | Same chart grammar with labels/copy variants |
| M13 | Habit science explainer | 22, 23 | Same illustrated move → reward relationship; copy varies |
| M14 | Activity selection grid | 25 | Walking, Gym, Running, Biking |
| M15 | Recommended rule choice | 26, 27, 28, 30, 32, 36 | Walking location, step/rate rule, gym/run/bike rule, reward type |
| M16 | Duration/amount selection | 29, 31, 33, 37 | Gym/run/bike target, screen-time allowance; time and distance units conditional |
| M17 | Active-day schedule | 34 | Day selection, short schedule summary |
| M18 | Time interval configuration | 35 | Start/end, all-day state, native picker sheet |
| M19 | Plan calculation | 38 | Progress/check completion, no extra generated frames per tick |
| M20 | Ready plan summary | 39 | Summary uses chosen activity and thresholds |
| M21 | Review warmup | 40 | Five rating controls |

Paywall continuation requires three additional distinct mockups: **M22 trial timeline (41), M23 plan selection (42), M24 testimonial (43–44)**. Total generation inventory is therefore **24 unique mockups**, including these three. Cards 43 and 44 share the same visual template but remain two flow steps.

Ordering lock: name → referral → age → occupation → improvement → DAWG motivation content → Unrot 023–031 content → existing ExcerLock explanation → four activity branches → shared scheduling/reward → plan → review → trial/paywall/proof. Removed OtterLife goal screen stays removed.

Source-number warning: local filenames are not necessarily replay positions. Use screen IDs and actual visible contents to resolve identity. In the new design, card 1 must be the blank loading screen the user requested, regardless of the older local source-file mismatch.

## 11. Required state and content corrections for the redesign

- Current board contains a duplicated feature headline and an inherited source-label mismatch. Treat these as research annotations, not exact production screen copy.
- Keep “What do you want to improve first?” with More exercise, Less screen time, Overall wellness.
- Gym arrival skips duration. Time-based running/biking asks minutes; distance-based asks distance. Steps asks a step goal; per-step rewards ask a conversion rate. Never show miles as an alternative answer to a duration question without changing rule mode.
- If reward is rest of day, skip reward-amount screen. Time-window reward never silently extends beyond its scheduled interval.
- Plan summary is computed from answers; walking/2,000 steps is only an example.
- “This is a year in your life” dot grid must define its unit in production. Daily, monthly, annual, and remaining-lifetime projections are different calculations. Preserve the visual story while labeling units accurately.
- Do not claim addiction transfer or guaranteed dopamine rewiring. Suitable draft: “A small reward can help you repeat a habit.” / “Move first. Then enjoy a little screen time.” Further scientific substantiation is separate from this visual audit.
- Trial length, price, renewal timing, and testimonials must come from ExcerLock product decisions. Source paywall structure is inspiration, not evidence of our offer.

## 12. GPT Image generation contract

Use GPT Image for each unique mockup; no generated HTML screenshot as a substitute. For first previews, request portrait iPhone 17 Pro at 1206 × 2622 px, a native status bar and home indicator, no external phone body, no browser toolbar, no ScreensDesign watermark, no board title/border/step numbers, and no AppBlock brand name/logo. Check actual output dimensions before claiming exact device geometry. Raster previews are visual concepts, not editable UI layers.

Pass an inspected AppBlock replay as the composition reference. State that reference blue/lavender is replaced according to this specification. Once the first target mockup is accepted, use it as a consistency reference for later mockups. Do not generate all 44 independently; use the mapping above. Record prompt, references, output path, and validation for every generated image in FOUNDRY.md.

Base prompt:

> Create one high-fidelity portrait iPhone 17 Pro screenshot for ExcerLock, a utility that unlocks distracting apps after exercise. Use the attached AppBlock screen only as a reference for visual hierarchy, spacious native layout, pill buttons, rounded cards, and soft dimensional utility illustrations. Redesign into white with a very subtle pale orange wash confined to the upper quarter, fully white below. Dark SF Pro-like sans-serif text. Primary CTA solid #C94710 with white text. Pale peach selected cards, orange outline and check. 24 pt horizontal margins on a 402 pt logical screen, 54 pt bottom CTA with 27 pt radius. No full-screen orange gradient, no blue/lavender UI, no serif typography, no watermark, no outer device mockup, no board labels. Screen role: [M-ID]. Exact heading: [heading]. Supporting copy: [copy]. Components: [component list and order]. Selected state: [state]. Exact button: [CTA]. Keep all text legible and render one screen only.

## 13. Acceptance checklist

1. White remains the dominant visible surface, including the bottom half.
2. Orange wash fully fades before the main choice list or lower illustration edge.
3. White CTA text is legible; orange is consistent between CTA, selection, and progress.
4. Text family and sizes follow the same hierarchy on every screen.
5. CTA position and content margins align across screenshots.
6. Reused layouts differ by content/state, not arbitrary font, radius, or illustration style changes.
7. Original screen sequence and all four branches remain represented.
8. No source branding, watermark, marketing device frame, invented testimonial, or unverified metric enters production mockups.
9. Review each image at full size and at phone size; verify copy, selected state, clipping, safe areas, and image dimensions.
10. Keep the old research board as evidence; place redesigned mockups in a separate version when generated.
