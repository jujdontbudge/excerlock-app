# Pillow → ExcerLock design synthesis

This is the integration layer for the complete 262-screen audit. The three
range reports contain screenshot-by-screenshot evidence; this file records the
system-level decisions that the standalone `excer-ui-mock/` build will consume.

## Product rhythm

Pillow alternates between four deliberately different visual registers while
keeping the same rounded geometry and typography:

1. **Benefit / onboarding** — a quiet full-screen gradient, one large circular
   icon or hero, one title/body pair, and a single white action held near the
   safe area. Permission dialogs are always preceded by a benefit explanation.
2. **Daily hub** — a dense but calm gradient dashboard: week context, one hero
   visual/metric, then dismissible translucent cards and shortcuts.
3. **Live state** — near-black or much darker gradient, one enormous metric or
   ring, minimal chrome, and no competing cards.
4. **Deep detail / native utility** — dark in-app sheets for app-owned settings;
   white native sheets and alerts for wheel pickers, system confirmation, share,
   and purchase actions.

The app feels coherent because every register reuses the same radii, vertical
spacing, system type, pill geometry, selected-row treatment, and bottom-safe CTA
placement.

## ExcerLock screen map

| ExcerLock surface | Primary Pillow references | Transfer |
| --- | --- | --- |
| Onboarding value proposition | 010–013, 021–030 | Full-screen gradient, large icon/hero, concise benefit copy, white bottom CTA. |
| Onboarding app picker | 014–020, 024, 057–059, 146–158 | Translucent option rows; selected row becomes solid brand orange; circular bottom navigation for multi-step choice flows. |
| Permission primers | 022–028, 215–218 | One benefit-led screen per permission, explicit consequence copy in the energy accent, system prompt only after the primer. |
| Allowance picker | 014–020, 083–086, 243–246 | One large wheel/slider-like decision, no preselected economy value, anchored Done/Next action. |
| Onboarding done moment | 029, 159–160 | Sparse radiant background, celebratory copy low on the screen, one decisive CTA. |
| Paywall | 003, 029–036, 247–252 | Emotional hero art, three-part trial timeline, one dominant price card, restore/terms links, native purchase confirmation; no fake urgency in ExcerLock. |
| Home / locked | 037–039, 052, 078–085 plus ExcerLock anchor | Week/progress context, dominant ring/hero, compact metric row, layered setup/condition cards, shortcuts. |
| Home / unlocked | 038–039, 107–112 plus ExcerLock animation anchor | Visual state changes in place; the screen stays stable while the hero and condition status change. |
| Condition event card | 037–039, 115–122 plus ExcerLock gym anchor | Edge-to-edge art with a bottom scrim, large title, small status/action affordance. |
| Condition state card | 104–114, 120–127 plus ExcerLock state anchor | Darker live treatment, ACTIVE chip, one live metric/status line, minimal actions. |
| Condition rate card | 173–203 plus ExcerLock rate anchor | Thick rounded meter/bar, large value pair, short legend; no thin grid or dense labels. |
| Condition catalog / builder | 057–059, 080–100, 144–159 | Dark modal flow; human-named rows; one highlighted selection; bottom circular back/next; picker sheet when a bounded value is required. |
| Banner picker / preview | 115–134, 162–171 | Art-first grid/list, selected card highlighted, then an exact full card preview before Save. |
| Walk session | 007–008, 102, 104–114 | Full-screen live mode, one ring/number, dark night register, verifying → active → ended as visually distinct phases. |
| Gym check-in | 102, 114, 257–259 | Benefit/instruction state, compact verifying state, neutral failure with a clear repair path and no blame. |
| Manage conditions | 040–051, 057–059, 080–100 | Select/reorder/toggle list patterns, cards grouped by purpose, destructive actions separated and confirmed. |
| Locked-app picker | 057–059, 130–134 | Search/filterable list, selection state on the row, persistent bottom confirmation. |
| Weekly rules / off-days | 083–086, 226–227, 243–246 | Simple full-screen picker with selected row fill; wheel sheet for time values. |
| Analysis overview | 173–177, 208–209 | Stack of metric cards, each with a tiny chart preview and chevron to deeper detail. |
| Trend chart | 178–205 | Week/Month/Year segmented control, thick rounded marks, very faint guides, summary cards below. |
| Streak heat map | 037–039, 173–177, 205–209 | Week context from the hub plus Pillow's categorical color discipline; ExcerLock adds six non-scolding cell states. |
| Badge shelf / achievement | 135–143, 164–171 | High-contrast light content cards, visible progress, selected/in-progress chips, detail sheet on tap. |
| Share card preview | 029–036, 135–143, 162–171 | Art-led, sparse, one hero number; a white/native share action beneath a branded preview. |
| Time running low | 038, 052, 112 | In-context translucent banner; energy accent used once; no takeover. |
| Time out / blocked app | 008, 104–114, 257–259 | One hero lock/ring and one helpful next action; ExcerLock uses the required ivory blur rather than Pillow's night black. |
| Settings overview | 210–214 | Long grouped sheet, uppercase section labels, terse rows with optional subtitles, no decorative filler. |
| Permission health | 215–218, 257–259 | Status-led diagnostic list, green success markers, explanatory sheet and direct fix path. |
| Settings detail | 219–246, 247–262 | One concept per screen, simple selected row/toggle/picker, native sheets for system-owned tasks. |

## Component laws

- Backgrounds are never flat on core screens. The orange full-bleed gradient is
  the default; detail screens use its deeper umber register; live screens use
  near-black warm brown; the blocked-app surface alone uses the approved ivory
  blur register.
- Cards are borderless translucent fills. Default radius is 18–20 pt; banner
  cards use 22–24 pt. Depth comes from opacity and scrims, not outlines or dark
  shadows.
- Screen-level completion actions are white pills with near-black labels.
  In-content primary actions are orange. Violet is reserved for urgency,
  earned boosts, or a claim/reward moment.
- The selected state is unmistakable: a whole row or pill fills with the brand
  color and all text becomes white. Unselected choices remain translucent.
- Hero numbers are large, rounded, and sparse. Supporting labels never compete
  with them.
- Charts use thick rounded bars/lines, categorical color, minimal grids, and a
  summary card below. Empty charts preserve the same layout rather than
  collapsing.
- Explanatory copy is short on decision screens. Long prose lives only in a
  dedicated details sheet.
- Bottom actions stay above the safe area; close/back controls stay top-left;
  a sheet grabber is always visible when the surface is modal.
- Success changes the surface in place. Failure states explain what happened
  and offer a repair path; they never use punitive red full-screen styling.
- Every tappable element gets immediate scale/opacity feedback and retains a
  minimum 44 pt hit target.

## Intentional ExcerLock deviations

- Pillow's five-item white tab bar becomes the approved four-item white-glyph
  ExcerLock tab bar (`Home`, `Manage`, `Analysis`, `Settings`) directly on the
  orange gradient.
- Pillow's purple primary becomes orange; its orange attention role becomes
  ExcerLock violet. Success remains iOS green.
- Pillow's photo-heavy sleep content becomes foundry-generated condition art,
  while keeping the full-bleed image + scrim + white-overlay construction.
- ExcerLock's live walking state keeps normal balance drain per the product
  rules; it borrows Pillow's live-state presentation, not the stale
  “drain paused” copy in an early state-card comp.
- Pillow occasionally uses guilt-adjacent warnings. ExcerLock always leads with
  the cheapest genuine way forward and never frames a lapse as a failure.
