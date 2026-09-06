# ExcerLock legacy UI provenance

> **Superseded visual contract (August 14, 2026):** this file preserves the
> original Pillow/orange measurements and rationale for historical traceability.
> It is no longer implementation authority for color, spacing, typography,
> controls, headers, or motion. The live contract is
> [`UI_SYSTEM_RESEARCH.md`](./UI_SYSTEM_RESEARCH.md) together with
> `src/design-system/tokens.ts`. Where this document conflicts with either,
> the unified blue-violet system wins.

Pillow DNA and the retired orange exploration, retained as provenance only.

## 0. Status, authority, and notation

This document is the concrete design-system contract for the standalone ExcerLock looks-only Expo app. It defines appearance and interaction behavior; it does not authorize changes to product logic or asset-production rules.

### Source precedence

When sources disagree, use this order:

1. **PASTED LOOKS-ONLY BRIEF** — product/scope authority for this standalone mock.
2. **STYLE** — design/STYLE.md and its approved anchor registry.
3. **PRD** — current locked UI/product decisions in excerlock-app-prd.md, especially §3.15, where they do not conflict with the pasted brief.
4. **HOME** — design/mockups/nosparkle-v14-best.png for the approved Home composition and orange palette.
5. **UPDATED ANCHORS** — tabbar-4plain-v1.png, card-state-live-v1.png, and card-rate-meter-v1.png, subject to the geometry warning in STYLE.
6. **PILLOW GUIDE** — design/pillow-style-guide.md.
7. **PILLOW AUDIT** — screenshots 001–262 and the three `docs/PILLOW_*.md` reports.
8. **DASH SPEC** — docs/codex-dashboard-ui-build-spec.md only where it has not been superseded.

These explicit conflict resolutions are binding:

- The shipped tab bar has **four plain tabs: Home, Manage, Analysis, Settings**. The five-tab white Pillow bar and the older five-tab center-button dashboard are provenance only, not current geometry. [STYLE, PRD, UPDATED-4TAB]
- The approved Home retains its exact bright seven-stop orange heat gradient. Data-dense, onboarding, settings, and sheet surfaces use the darker warm Pillow-derived gradient so text and controls remain legible. This creates two coordinated canvas roles rather than forcing one gradient onto every context. [HOME, PILLOW GUIDE]
- Post-purchase identity is a required simulated `/signup` screen before Home; recovery uses the same local-only screen. There is no Clerk/network action in this mock. [PASTED BRIEF, PRD]
- First Home has zero conditions and leads to the separate builder through **Add your first way to earn**. Do not place condition #1 inside onboarding: this is the pasted brief's tie-break against the conflicting PRD line because the brief ends onboarding with done/paywall and names the builder separately. [PASTED BRIEF, PRD empty-start]

### Provenance codes

| Code | Source |
|---|---|
| BRIEF | pasted standalone looks-only mission |
| HOME | nosparkle-v14-best.png |
| UPDATED-4TAB | tabbar-4plain-v1.png |
| UPDATED-STATE | card-state-live-v1.png |
| UPDATED-RATE | card-rate-meter-v1.png |
| STYLE | design/STYLE.md |
| PSG | design/pillow-style-guide.md |
| PRD | excerlock-app-prd.md |
| DASH | docs/codex-dashboard-ui-build-spec.md |
| P001–P087 | audited Pillow screenshots |

**† means intentionally inferred.** It marks a value selected from a documented range, interpolated from an image, or newly fixed so implementation has one answer. Unmarked values are directly specified by a governing source.

## 1. Non-negotiable visual rules

1. The visual field is a full-bleed orange gradient, never a generic gray app background.
2. Hierarchy comes from gradient depth, translucent surfaces, type size, and spacing—not card borders or heavy shadows.
3. White screen-level pills close or advance a whole screen. Orange brand actions work on dark surfaces. Violet is an energy/claim accent, not generic navigation.
4. A screen has one obvious hero: lock, balance, reclaimed-time number, live-session timer, or paywall offer.
5. Functional text never relies on an illustration without a dark legibility scrim.
6. Green means enabled, active, verified, or earned. Red is reserved for destructive/error semantics. “Locked” is not automatically red.
7. All visual PNG subjects follow the asset-family and manifest law in STYLE. UI code tints Family-B glyphs; color is not baked into them.
8. Cards have no decorative stroke and no hard drop shadow. The exceptions are white floating chips/thumbs and soft-clay assets.
9. All state changes are visible in place: pressed, selected, disabled, loading, success, empty, and error.
10. The tone sells movement and reward. It never scolds, audits morality, or frames the padlock as punishment.

## 2. Foundation tokens

### 2.1 Color

#### Brand and canvas

| Token | Exact value | Use | Provenance |
|---|---|---|---|
| color.brand.primary | #F97316 | Primary orange on dark content surfaces | PSG |
| color.brand.primaryPressed | #EA580C | Pressed primary orange | PSG |
| color.brand.anchorMid | #F25A16 | App-icon/square composition fill only; useful as a brand swatch, not a screen gradient replacement | STYLE |
| color.brand.burnt | #C2570A | Dark orange chip/surface and content-gradient endpoint | PSG, HOME |
| color.brand.energy | #8B5CF6 | Claim/boost/celebration accent; never routine primary chrome | PSG |
| color.brand.energyAction | #7C3AED † | Accessible filled energy button with white text | PSG + contrast inference |
| color.brand.signatureOrange | #F97316 | Signature gradient stop 1 | PSG |
| color.brand.signatureAmber | #FBBF24 | Signature gradient stop 2 | PSG, STYLE |
| color.brand.signatureMagenta | #EC4899 | Signature gradient stop 3 | PSG |
| color.canvas.contentTop | #1A0F06 | Warm near-black top for content screens | PSG |
| color.canvas.contentBottom | #C2570A | Saturated burnt-orange content-screen bottom | PSG |
| color.canvas.detail | #33200D | Muted analysis/settings/detail base | PSG |
| color.canvas.night | #120C05 | Live lock/night base | PSG |
| color.canvas.ivory | #F4F1F5 | Shield/light surface and clay base | STYLE |

#### Approved Home heat-gradient stops

| Stop | Color | Provenance |
|---:|---|---|
| 0% | #F98529 | HOME, DASH |
| 15% | #F97A22 | HOME, DASH |
| 30% | #F76D1C | HOME, DASH |
| 44% | #F45C11 | HOME, DASH |
| 60% | #F44D09 | HOME, DASH |
| 72% | #F04205 | HOME, DASH |
| 100% | #EB2E02 | HOME, DASH |

#### Text and icons

| Token | Exact value | Use | Provenance |
|---|---|---|---|
| color.text.primary | #FFFFFF | Primary text on dark/scrimmed surfaces | PSG |
| color.text.secondary | rgba(255,248,240,0.72) † | Body/subtitle text; raised from the guide’s 60% where necessary for readability | PSG + accessibility inference |
| color.text.tertiary | rgba(255,248,240,0.56) † | Nonessential metadata only; never instructions | Pillow audit inference |
| color.text.disabled | rgba(255,248,240,0.38) † | Disabled labels | Pillow audit inference |
| color.text.ink | #1A0F06 | Text on white/ivory and small text directly on bright heat | PSG |
| color.text.danger | #EF4444 | Destructive labels | PSG |
| color.icon.primary | #FFFFFF | Family-B base render/tint | STYLE |
| color.icon.inactive | rgba(255,255,255,0.68) † | Inactive tab/action glyph on heat | UPDATED-4TAB inference |
| color.icon.disabled | rgba(255,255,255,0.34) † | Disabled icon | Pillow audit inference |
| color.icon.dark | #3B353D † | Dark glyph inside white chips; close to the anchor’s lock-chip ink | HOME sampling inference |

#### Surfaces, overlays, and separators

| Token | Exact value | Use | Provenance |
|---|---|---|---|
| color.surface.card | rgba(255,255,255,0.08) | Default dark translucent card | PSG |
| color.surface.cardElevated | rgba(255,255,255,0.12) | Selected/elevated card | PSG |
| color.surface.cardStrong | rgba(40,16,8,0.55) | Home shortcut rows and strong dark overlay card | HOME, DASH |
| color.surface.cardStrongComposite | #492A23 | Reference composite appearance only; prefer the alpha token | DASH |
| color.surface.sheet | #33200D | Branded sheet body | PSG |
| color.surface.sheetDeep | #2A160A † | Nested sheet/list card | P040–P087 recolor inference |
| color.surface.light | #FFFFFF | Native/light picker and screen-level CTA | PSG, P012, P015 |
| color.surface.ivoryBlur | rgba(244,241,245,0.94) † | Shield surface over system blur | STYLE, PRD inference |
| color.surface.scrim | rgba(18,12,5,0.64) † | Modal backdrop | P040–P087 inference |
| color.surface.bannerScrimBottom | rgba(18,12,5,0.88) † | Bottom of condition/banner cards | HOME, STYLE inference |
| color.surface.bannerScrimTop | rgba(18,12,5,0.06) † | Top of condition/banner cards | HOME inference |
| color.surface.divider | rgba(255,255,255,0.12) † | Internal separators only; never an outer card border | P040–P087 inference |
| color.surface.track | rgba(255,255,255,0.34) † | Progress/ring track on heat | HOME inference |
| color.surface.trackDark | rgba(255,255,255,0.14) † | Track on dark content | P037–P039 inference |

#### Semantic and data colors

| Token | Exact value | Meaning | Provenance |
|---|---|---|---|
| color.semantic.success | #34C759 | iOS success and switch-on | PSG |
| color.semantic.earn | #22C55E | Earned/verified data series | PSG |
| color.semantic.attention | #F59E0B | Low balance, warning, attention | PSG |
| color.semantic.danger | #EF4444 | Destruction or genuine failure | PSG |
| color.semantic.dangerAction | #B91C1C † | Filled destructive button with white text | Accessibility inference |
| color.semantic.info | #3B82F6 | Informational data/state | PSG |
| color.data.amber | #F59E0B | Categorical series A | PSG |
| color.data.pink | #EC4899 | Categorical series B | PSG |
| color.data.green | #22C55E | Categorical series C | PSG |
| color.data.blue | #3B82F6 | Categorical series D | PSG |
| color.heatmap.met | #EA580C † | Requirement met; selected to retain an intense orange while clearing 3:1 for the white kind glyph | PRD + contrast inference |
| color.heatmap.missed | rgba(255,255,255,0.10) † | Missed active day; deliberately neutral, never red | PRD |
| color.heatmap.rest | rgba(255,248,240,0.22) † | Rest/holiday/override | PRD |
| color.heatmap.blank | rgba(255,255,255,0.04) † | Future/pre-install | PRD |

#### Asset-only colors

| Token | Exact value | Contract | Provenance |
|---|---|---|---|
| color.asset.clayIvory | #F4F1F5 | Family-A surface | STYLE |
| color.asset.clayShade | #C9C4CC | Family-A soft shading/recesses | STYLE |
| color.asset.glyph | #FFFFFF | Family-B subject before runtime tint | STYLE |
| color.asset.key | #FF00FF | Generation/keying background only; never visible in app | STYLE |

### 2.2 Gradient recipes

| Token | Stops/direction | Use | Provenance |
|---|---|---|---|
| gradient.canvas.homeHeat | Seven approved stops above, top→bottom | Home and direct Home-family previews | HOME, DASH |
| gradient.canvas.content | #1A0F06 0% → #C2570A 100%, top→bottom | Onboarding, paywall, Manage, general content | PSG |
| gradient.canvas.detail | #1A0F06 0% → #33200D 72% → #6A2B08 100% † | Analysis, Settings, dense detail | PSG + inferred low-chroma endpoint |
| gradient.canvas.night | #120C05 0% → #1A0F06 72% → #5A2107 100% † | Live Walk/Gym and lock moments | PSG + inferred tint |
| gradient.signature | #F97316 0% → #FBBF24 52% → #EC4899 100% † | Small celebration/brand moments only | PSG |
| gradient.banner.scrim | rgba(18,12,5,0.06) 0% → rgba(18,12,5,0.30) 46% → rgba(18,12,5,0.88) 100% † | Every condition banner and user photo | HOME, STYLE |
| gradient.ivory.shield | rgba(255,255,255,0.90) 0% → rgba(244,241,245,0.96) 100% † | DeviceActivity shield card/background | PRD, STYLE |

Do not use gradient.signature as a full canvas. Do not bake any screen gradient into Family-A or Family-B assets.

### 2.3 Contrast pairs

- **Approved:** color.text.primary on canvas.contentTop, canvas.detail, canvas.night, cardStrong, bannerScrimBottom.
- **Approved:** color.text.ink on white, ivory, and the upper/bright stops of homeHeat.
- **Approved:** text.ink on brand.primary and semantic.success/earn fills; white on brand.energyAction, brand.burnt, and semantic.dangerAction.
- **Conditional:** white directly on homeHeat. It is permitted for large decorative/hero glyphs, but functional text must receive a dark local scrim or switch to text.ink if automated contrast is below 4.5:1 (3:1 for large text/icons).
- **Forbidden:** text.secondary or tertiary directly on unscreened bright orange.
- The approved Home still is the look reference, but its small white-on-orange copy is not a blanket accessibility exemption.

### 2.4 Typography

Use the iOS system family. SF Pro Text is the default for body/control text; SF Pro Display for large headings; SF Pro Rounded for hero numerals. All timers, balances, dates, and changing counts use tabular figures.

Values marked † select one exact size from Pillow’s documented ranges.

| Token | Family/design | Size / line height | Weight | Tracking | Use | Provenance |
|---|---|---:|---:|---:|---|---|
| type.hero.xl | SF Pro Rounded | 96 / 100 † | 300 | -1.5 † | Full-screen time or reclaimed-time hero | PSG, P008, P083 |
| type.hero.lg | SF Pro Rounded | 72 / 78 † | 300 | -1.0 † | Balance/session timer | PSG |
| type.hero.md | SF Pro Rounded | 48 / 54 † | 400 | -0.5 † | Card hero number | P079, UPDATED-RATE |
| type.screen.large | SF Pro Display | 34 / 40 † | 700 | -0.4 † | Major onboarding/analysis title | PSG |
| type.screen.title | SF Pro Display | 28 / 34 † | 700 | -0.2 † | Standard screen title | PSG |
| type.sheet.title | SF Pro Display | 20 / 24 † | 700 | 0 | Centered sheet title | P040–P087 |
| type.section.title | SF Pro Display | 22 / 28 † | 700 | -0.1 † | Section title | P053, P055 |
| type.card.title | SF Pro Text | 17 / 22 | 600 | 0 | Card/row title | PSG |
| type.card.heroTitle | SF Pro Display | 24 / 29 † | 700 | -0.2 † | Condition-card title | HOME, DASH |
| type.body | SF Pro Text | 15 / 21 † | 400 | 0 | Default body | PSG |
| type.body.emphasis | SF Pro Text | 15 / 21 † | 600 | 0 | Inline emphasis/warning | PSG |
| type.callout | SF Pro Text | 16 / 21 † | 400 | 0 | Prominent explanatory copy | Pillow audit inference |
| type.stat.label | SF Pro Text | 15 / 20 † | 600 | 0 | Balance/stat label | HOME, DASH |
| type.stat.value | SF Pro Rounded | 22 / 26 † | 700 | -0.2 † | Balance/stat value | HOME, DASH |
| type.button | SF Pro Text | 17 / 22 † | 600 | 0 | Button label | PSG |
| type.label | SF Pro Text | 13 / 18 † | 600 | 0.1 † | Field/status/legend label | PSG |
| type.caption | SF Pro Text | 12 / 16 † | 400 | 0.1 † | Metadata | PSG |
| type.micro | SF Pro Text | 10 / 13 † | 700 | 0.8 † | Uppercase category/filter labels | P009, P061 |
| type.tab | SF Pro Text | 12 / 15 † | 500 | 0 | Four-tab labels | UPDATED-4TAB |

Rules:

- Never use a condensed athletic display face; the approved Home and Pillow system settle on SF Pro/SF Pro Rounded.
- Do not use more than three type sizes in one card.
- Use sentence case. Uppercase is limited to compact status/filter/category chips.
- Hero values may shrink to fit but may not wrap. Labels wrap before values do.
- Body copy supports Dynamic Type. Hero numerals cap at approximately 130% scaling † and expose the full value to VoiceOver.

### 2.5 Spacing and layout scale

The system uses a 4 pt base grid. The complete scale is intentionally fixed here. [†]

| Token | pt |
|---|---:|
| space.0 | 0 |
| space.1 | 4 |
| space.2 | 8 |
| space.3 | 12 |
| space.4 | 16 |
| space.5 | 20 |
| space.6 | 24 |
| space.7 | 28 |
| space.8 | 32 |
| space.10 | 40 |
| space.12 | 48 |
| space.14 | 56 |
| space.16 | 64 |
| space.20 | 80 |

Layout constants:

| Token | Exact value | Provenance |
|---|---:|---|
| layout.referenceWidth | 393 pt | DASH |
| layout.referenceHeight | 852 pt | DASH |
| layout.screenPadding | 20 pt | STYLE updated-card geometry |
| layout.screenPaddingCompact | 16 pt | PSG, HOME |
| layout.goalBarInset | 22 pt | HOME, DASH |
| layout.sectionGap | 24 pt † | Pillow audit |
| layout.cardGap | 12 pt † | Pillow audit |
| layout.rowGap | 8 pt † | Pillow audit |
| layout.conditionCardRatio | 2.21:1 | STYLE |
| layout.conditionCardWidth | screen width − 40 pt | STYLE |
| layout.conditionCardHeight | condition-card width ÷ 2.21 | STYLE |
| layout.tabCount | 4 | PRD, STYLE |
| layout.maxContentWidth | 520 pt † | iPad/readability inference |

On compact iPhone heights, Home scrolls; do not shrink the lock or condition cards below their minimum geometry to force every active condition into one viewport.

### 2.6 Radius and shape

| Token | Radius | Use | Provenance |
|---|---:|---|---|
| radius.xs | 8 pt † | Small thumbnail/chip |
| radius.sm | 12 pt | Minimum Pillow rectangle radius, option rows |
| radius.actionRow | 14 pt | Home Edit/Analysis row | HOME, DASH |
| radius.card | 16 pt | Standard content card | PSG |
| radius.cardLarge | 20 pt † | Large grouped card; upper bound of Pillow’s documented range | PSG |
| radius.condition | 24 pt | Condition banner | HOME, DASH |
| radius.sheet | 28 pt † | Branded sheet top corners | P040–P087 |
| radius.hero | 32 pt † | Large ivory/empty-state panel |
| radius.pill | 999 pt | Buttons/chips/tracks | PSG |

Minimum corner radius for any non-system rectangular control is 12 pt. System alerts, native sheets, and system pickers retain native geometry.

### 2.7 Strokes, separators, and tracks

| Token | Value | Use |
|---|---|---|
| stroke.none | 0 | Default outer card border |
| stroke.hairline | 1 physical pixel | Internal separators only |
| stroke.icon | 2 pt † | Circular info/ring icon at normal size |
| stroke.ring | 8 pt † | Standard progress ring |
| stroke.ringHero | 10 pt † | Live/hero ring |
| stroke.focus | 3 pt † | Keyboard/switch-control focus ring |

Chart bars use rounded ends and a minimum visible thickness of 8 pt †. Avoid dense gridlines; at most one subtle baseline or necessary axis.

### 2.8 Elevation

Pillow and the approved Home use tonal elevation. Code shadows are exceptional.

| Token | Contract | Provenance |
|---|---|---|
| elevation.0 | No shadow; default cards | PSG |
| elevation.1 | Surface moves from card to cardElevated; no shadow | PSG |
| elevation.float † | y=4, blur=12, spread=0, rgba(26,15,6,0.24) | HOME white goal thumb/chips |
| elevation.sheet † | Backdrop scrim only; no cast shadow | P040–P087 |
| elevation.clay | Shadow is part of the soft rendered object, never a hard code shadow | STYLE |

Do not use Android elevation as a shortcut that creates gray hard shadows. Match tonal layers.

## 3. Motion and haptic tokens

### 3.1 Durations and easing

| Token | Value | Use | Provenance |
|---|---:|---|---|
| motion.duration.press | 100 ms | Press in/out | DASH |
| motion.duration.fast | 150 ms | Opacity/check/selection | PSG |
| motion.duration.standard | 220 ms † | Row/card state change | PSG range |
| motion.duration.slow | 300 ms | Larger content transition | PSG |
| motion.duration.sheet | 380 ms † | Branded sheet present/dismiss | Pillow audit inference |
| motion.duration.ring | 650 ms † | Ring/balance refill | Pillow audit inference |
| motion.ease.standard | cubic-bezier(0.20, 0, 0, 1) † | Default |
| motion.ease.enter | cubic-bezier(0.16, 1, 0.30, 1) † | Enter/expand |
| motion.ease.exit | cubic-bezier(0.40, 0, 1, 1) † | Exit/collapse |

### 3.2 Spring presets

The names and values below are intentionally inferred implementation constants. Tune only if side-by-side capture proves drift.

| Token | Mass | Stiffness | Damping | Use |
|---|---:|---:|---:|---|
| motion.spring.control † | 0.55 | 420 | 30 | Buttons, chips, selection |
| motion.spring.card † | 0.75 | 300 | 26 | Inline expansion, reorder |
| motion.spring.sheet † | 1.00 | 250 | 28 | Branded sheet |
| motion.spring.celebrate † | 0.80 | 240 | 15 | Lock/badge success pop |

### 3.3 Universal press feedback

- All custom Pressables: scale 1 → 0.96 and opacity 1 → 0.88 † over 100 ms; spring to rest on release. [DASH + inferred opacity]
- White screen-level pills may use 0.97 scale to avoid a visibly collapsing edge †.
- A disabled control does not scale and uses disabled text/icon tokens.
- Scroll gestures cancel the pressed state.
- Haptics never replace visible state.

### 3.4 Signature unlock motion

Latest authority is unlock-animation-v18-noconfetti-iphone.mp4 plus the PRD. It supersedes the older confetti version.

1. **0 ms:** event/card resolves; related Home values remain momentarily stable so the eye sees the cause.
2. **0–250 ms †:** event button or state copy crossfades to its completed/verified state.
3. **350–450 ms:** lock body anticipates at scale 0.97 and translateY +3 pt. [DASH]
4. **450–1100 ms:** shackle moves upright with translations only: pop high enough for both legs to clear, drift right by one socket distance, then drop so the left leg seats in the former right socket. Maximum incidental wobble ±6°; no swing/fling. Body pops 1 → 1.06 → 1 with a tiny counter-rotation. [DASH, STYLE motion anchor]
5. **At the visible unlock landing, approximately 950 ms †:** one success haptic if haptics are enabled. [PRD]
6. **Rest:** open shackle and updated balance/card state persist.

There is **no confetti, sound, popup, toast, claim button, or full-screen celebration**. Multiple pending earns on open produce one aggregate unlock animation. [PRD, STYLE]

### 3.5 Other motion contracts

- Sheets slide vertically with a spring and backdrop fade; nested detail pages push horizontally using native navigation.
- Condition-card carousels and picker wheels use native inertial physics.
- Active state card: status dot pulses opacity/scale over 1.4 s †; never strobe.
- Live ring: progress advances continuously; do not rotate the whole ring as decoration.
- Reordering: dragged row lifts to cardElevated, scales to 1.02 †, and neighbors spring aside.
- Loading buttons retain width, replace label with spinner/status, and reject duplicate taps.
- Reduce Motion: remove spring overshoot, pulsing, parallax, and lock-flight choreography; crossfade directly to final unlocked state in ≤150 ms and keep the single optional haptic.

## 4. Global layout and scaffolds

### 4.1 Screen scaffold

Every page uses one of four canvas roles:

| Variant | Canvas | Typical pages |
|---|---|---|
| heat | gradient.canvas.homeHeat | Home, exact condition preview |
| content | gradient.canvas.content | Onboarding, paywall, Manage |
| detail | gradient.canvas.detail | Analysis, Settings, ledger/detail |
| night | gradient.canvas.night | Walk/Gym live states, lock moments |

Contract:

- Full bleed behind safe areas.
- Content respects device safe-area insets; no mocked status bar in the native app.
- Default horizontal padding 20 pt; use 16 pt only for full-width cards/compact groups.
- Scrolling pages keep at least 24 pt between sections and 16 pt bottom clearance above the tab bar.
- Sheet pages may omit bottom tab navigation; pushed tab pages retain it.
- Light/native surfaces are temporary layers, not alternate app themes.
- This specification defines one branded orange appearance. If the looks-only Settings screen exposes Auto/Light/Dark, it may demonstrate local selection state, but a second production palette must not be improvised without a separately approved token pass.

### 4.2 Four-tab bar

**Anatomy:** Home, Manage, Analysis, Settings; one Family-B glyph and one label per item.

**Metrics:**

- Four equal-width targets.
- Visual glyph 28–30 pt; label uses type.tab.
- Interactive target at least 64 pt wide × 52 pt tall; bar content height 58 pt plus bottom safe area †.
- No pill behind active tab, no central button, no fifth item, no opaque white bar.

**States:**

- Active: white glyph/label at 100% opacity.
- Inactive: color.icon.inactive.
- New milestone: 6 pt orange/energy dot at the top-trailing of Analysis †; dot clears after the new shelf item is viewed.
- Pressed: universal press feedback.

**Accessibility:** role=tab, selected state announced, label includes destination only (“Analysis,” not “bar chart button”). [STYLE, PRD, UPDATED-4TAB]

### 4.3 Branded sheet

**Anatomy:** backdrop, rounded top surface, 44 × 5 pt grabber †, optional title/back/close, scrolling content, optional fixed action zone.

**Metrics:** radius.sheet; top detent leaves status/safe-area context visible; content padding 20 pt; action zone 16 pt side inset and 12 pt top divider spacing †.

**Variants:** medium, high, full; picker-light; decision-light; native system.

**Behavior:** swipe-to-dismiss only when no destructive/critical commit is pending. Keyboard avoidance must keep the active row and action visible. VoiceOver focus moves into the sheet and returns to its invoker.

Use a white decision/picker surface for dense explanation or wheel selection, as Pillow does. Use native permission, purchase, share, action, and alert surfaces rather than re-creating them.

## 5. Primitive component contracts

### 5.1 PressableSurface

Base wrapper for every custom button, row, card action, icon button, tab, and chip.

- States: default, pressed, focused, disabled, selected, loading.
- Minimum hit area 44 × 44 pt; preferred primary height 50 pt.
- Adds hitSlop up to 8 pt where the visual is smaller.
- Never nests two overlapping Pressables. Condition-card background is not tappable where its CTA/info targets sit.
- Focus ring uses stroke.focus outside the visual bounds and must not be clipped.

### 5.2 Button

| Variant | Surface / label | Height | Contract |
|---|---|---:|---|
| screen | white / text.ink | 50 pt | Advances or closes a whole page; often centered compact or full width |
| primary | brand.primary / text.ink | 50 pt | Primary action on dark content canvas |
| energy | brand.energyAction / white | 50 pt | Claim/boost only |
| secondary | rgba(255,255,255,0.10) / white | 50 pt | Skip, Cancel, alternate |
| dark | cardStrong / white | 50 pt | Action on Home heat |
| destructive | semantic.dangerAction / white | 50 pt | Confirmed destructive action only |
| text | transparent / role color | 44 pt | Low-emphasis route/action |
| icon | contextual circle / icon | 44 × 44 pt | Info, close, more, edit |

Shape is radius.pill except icon circles. Full-width buttons use the container width; compact screen buttons use label width + 48 pt horizontal padding †.

States:

- Disabled: surface 38% opacity, label text.disabled, no press motion.
- Loading: dimensions remain fixed; spinner plus short status (“Please wait…”); duplicate taps blocked.
- Success: checkmark and past-tense label; state persists where the underlying action is one-shot.
- A continue-style CTA may include a right arrow; close/Done CTAs do not.

### 5.3 IconChip

Circular host for one Family-B glyph or a small Family-A object.

| Size | Diameter | Visual glyph | Use |
|---|---:|---:|---|
| xs | 30 pt | 16–18 pt | Stat row |
| sm | 34 pt | 18 pt | Stat trailing chip |
| md | 44 pt | 22–24 pt | Row/action |
| lg | 64 pt | 30–34 pt | Card/banner |
| hero | 120 pt † | 64–72 pt | Permission/onboarding explainer |

Variants: white, dark-translucent, primary, energy, success, ivory-clay. White chips use elevation.float. A chip is decorative unless it has a 44 pt Pressable contract and an accessibility label.

### 5.4 Card and Panel

| Variant | Fill | Radius | Use |
|---|---|---:|---|
| subtle | surface.card | card | General grouping |
| elevated | surface.cardElevated | card | Selected/expanded |
| strong | surface.cardStrong | actionRow or card | Home shortcut/action |
| grouped | surface.card | cardLarge | Settings/config group |
| banner | image + banner scrim | condition | Condition/event |
| light | surface.light | cardLarge | Picker, privacy detail, decision |
| night | rgba(255,255,255,0.07) † | cardLarge | Live state |

No outer border. Use surface.divider only between children that need separation. A card is not automatically tappable; its semantic children own actions.

### 5.5 PillRow / SettingsRow

**Anatomy:** optional leading IconChip, title, optional subtitle/current value, trailing value/chevron/toggle/status/badge.

**Metrics:** minimum 56 pt, standard 64 pt, multiline 76 pt †; 16 pt horizontal padding; 12 pt child gap.

**Variants:**

- picker: right-aligned current value and chevron.
- navigation: subtitle plus chevron.
- toggle: native switch; whole row may toggle only if it does not also navigate.
- status: labeled dot and optional “Fix” action.
- destructive: danger label/icon, no chevron unless it opens a confirmation page.
- reorderable: drag handle, immediate enable toggle, lifted selected state.

Titles use type.card.title; subtitles type.caption/text.secondary. Selected questionnaire rows fill brand.primary with text.ink; unselected rows use card.

### 5.6 SegmentedControl

- Height 36 pt †, padding 2 pt, radius 10 pt †.
- Track: rgba(255,255,255,0.12). Selected segment: white with text.ink. Unselected: text.secondary.
- Two to four segments; equal width unless labels require intrinsic widths.
- Selection animates 150–220 ms and is announced immediately.
- Never use for actions; it changes the visible dimension or mode.

### 5.7 Switch

Use the native iOS switch geometry and interaction.

- On tint: semantic.success.
- Off track: rgba(255,255,255,0.18) †.
- Disabled: 45% opacity †.
- Always has a visible row label and VoiceOver state. Do not substitute a custom orange toggle.

### 5.8 Chip / Badge / Filter

- Height 28 pt compact or 34 pt standard †; horizontal padding 12 pt; radius.pill.
- Filter selected: brand.primary + text.ink.
- Filter unselected: rgba(18,12,5,0.32) † + text.secondary.
- Status active: dark scrim, semantic.success dot, uppercase type.micro.
- Count: attention-orange surface + text.ink where contrast passes, otherwise dark text on a lighter orange †.
- “NEW”/new milestone: energy or signature accent, never red.

### 5.9 Slider

Used for onboarding confession, allowance, and bounded economy values.

- Track height 8 pt †, fully rounded; inactive track uses surface.trackDark on a dark canvas or surface.track on heat.
- Thumb is 28 pt † with elevation.float and a minimum 44 pt interaction target.
- A large live value sits above the slider using type.hero.md or type.stat.value; the unit is visible and announced.
- Min/max labels use type.caption and cannot be the only indication of bounds.
- Discrete values snap with a light selection haptic when haptics are enabled. A 1–12+ hour confession slider exposes each hour as an adjustable accessibility step; “12+” is a real terminal value, not clipped text.
- Daily allowance/reward sliders show the practical consequence beside the selected value. Where precision matters more than exploration, use a wheel picker instead.
- Disabled and read-only states retain the numeric value and explain why editing is unavailable.

## 6. Domain component contracts

### 6.1 HomeHeader and StreakChip

**HomeHeader:** optional weekday/day-state title, one short earned-today subtitle, and a trailing StreakChip. It sits below the status safe area and above GoalProgressBar. When the approved compact Home composition omits this row, the streak remains discoverable in Analysis; do not squeeze it into the goal thumb.

**StreakChip anatomy:** Family-B flame glyph, tabular count, optional shield/paused indicator.

- Minimum 44 pt height and type.label.
- Default: strong dark translucent pill on heat.
- Protected/override: adds a small shield glyph and explicit accessibility state.
- At risk: attention accent plus text; never red or flashing.
- New/changed: fast scale/opacity response only; no mascot animation.
- Tap opens the streak block in Analysis. VoiceOver label includes current streak and protection/rest status.

The Home header/streak placement is specified by the current PRD but not present in the original finished Home still; its exact vertical spacing is therefore intentionally inferred. [PRD, PSG]

### 6.2 GoalProgressBar

Approved Home component.

**Anatomy:** filled segment, translucent track, floating thumb with miniature padlock, centered caption.

**Metrics:** 22 pt side inset, 12 pt track height, 26 pt thumb, fully rounded track, caption 26 pt below track and type.body. [HOME, DASH]

**States:**

- 0%: no white fill; thumb at start.
- partial: white fill and thumb at actual progress.
- met: full white fill; thumb may swap to check/energy glyph †.
- disabled/rest: 38% opacity and explicit “Rest day”/schedule copy.

The thumb is decorative unless the product gives it an action. Accessibility exposes one progressbar value and the caption, not three separate elements.

### 6.3 LockHero

**Anatomy:** separate Family-A shackle and body assets, centered with stable body geometry.

**Metrics:** body about 130 pt wide, shackle about 110 pt wide, composed hero y-span approximately 170–360 pt in the 393 × 852 Home reference. [DASH]

**States:**

- shieldsUp: closed lock.
- unlocked: upright open hook, left leg seated in the former right socket.
- transitioning: signature unlock choreography.
- paused/rest: closed or open according to actual access, desaturated 60% † with explicit copy.

The recessed keyhole uses clayShade, never a black hole. Do not add face, eyes, mascot behavior, gloss, or metal.

### 6.4 BalanceStatsRow

Two balanced StatReadouts.

- Left: 30 pt white chip, label “Time Locked,” value.
- Right: right-aligned label “Screen Time,” value, then 34 pt trailing chip.
- Labels type.stat.label; values type.stat.value with tabular figures.
- Container uses 20–24 pt horizontal inset and at least 16 pt gap.
- At Dynamic Type sizes that no longer fit, stack into two full-width rows †; never truncate time.

Variants: healthy, low, zero, unlimited, schedule. Low uses attention accent plus text; zero changes explanatory copy but does not flood the UI red.

### 6.5 ConditionCard

Every active condition has one card built from the same shell.

**Geometry:**

- Width = screen width − 40 pt.
- Aspect ratio = approximately 2.21:1.
- Radius 24 pt, clip content.
- Banner fills edge to edge.
- Standard banner scrim is mandatory.
- Geometry comes from HOME/UPDATED-STATE; ignore UPDATED-RATE’s 49/51 px horizontal drift, per STYLE.

**Shared anatomy:**

1. Full-bleed Family-C banner or user photo.
2. Top status/info area.
3. Bottom-left name/status copy.
4. Bottom/right action or metric area.
5. Scrim ensuring all overlaid text passes contrast.

#### Event variant

- Idle/eligible: name bottom-left, info top-right, white “Complete” CTA bottom-right.
- Completing: CTA fixed-width loading state; no other action.
- Completed: “✓ Completed,” disabled/settled; Home unlock motion may run once.
- Failed verification: retain card/context, neutral explanation and Help/retry path; do not clear user progress.

#### State-live variant

- Inactive: name and concise condition (“Walk to keep apps open”).
- Verifying: amber dot, “VERIFYING,” neutral progress copy.
- Active: green pulsing dot + “ACTIVE”; title “Walking”; subtitle “Apps unlocked while you keep moving”; trailing dark pill “Balance drains normally.” The older `UPDATED-STATE` pause wording is superseded by the current product rule. [PRD, MATRIX]
- Ended: pulse stops; explain “You stopped walking” and offer restart/Keep walking according to the surface.

#### Rate-meter variant

- Shows signal→screen-time relationship, today’s source value, banked minutes, ratio, and one thick rounded meter.
- Example hierarchy from UPDATED-RATE: “Today’s steps → screen time,” “6,240 steps today,” “2h 05m earned,” “500 steps = 10 min.”
- Rates have no daily cap in the current PRD. Do not copy the old anchor’s “Daily cap 10,000 steps” line into production content.
- Meter track/fill must have an accessible numeric label.

#### Card-level rules

- Card background itself is not a giant action. Info and CTA remain distinct targets.
- User photos receive the identical scrim and crop.
- No visible faces in curated banners; figures may be from behind or silhouette.
- Manage-condition rows reuse the chosen banner in a compact crop so condition identity persists.

### 6.6 ShortcutActionRow

Home “Edit” and “Analysis” teleport rows.

- Height 44 pt, 16 pt horizontal page inset, radius 14, fill cardStrong.
- 16 pt internal inset; type.card.title; trailing 20 pt orange Family-B glyph.
- Whole row is one Pressable and announces destination.
- Do not add these as a fifth tab or duplicate tab bar geometry.

### 6.7 BannerCard

For “What’s new,” setup, recap, or contextual education.

- Surface subtle/elevated, radius.cardLarge.
- Optional leading lg IconChip or top-left glyph.
- Title + one-line subtitle; optional close at top-right.
- If photographic, use banner scrim and keep text in the lower third.
- Dismissal removes one card with a 220 ms height/opacity collapse † and preserves scroll position.

### 6.8 HeroRing

Used in Analysis/live sessions, not as a replacement for the approved Home lock hero.

- Diameter adapts up to approximately 68% of available width; 8–10 pt rounded stroke.
- Track uses trackDark; progress is one semantic color.
- Center holds one hero value plus one short caption or glyph—never a data table.
- Variants: progress, balance, countdown, active pulse, empty.
- Animated changes take 650 ms by default; countdown updates do not restart the animation.

### 6.9 WeekStrip and HeatMap

**WeekStrip:** seven equal slots, compact day label, state marker, selected day. Marker states include met, missed-neutral, rest, future. Tapping changes the current day/summary.

**HeatMap:** six states from the PRD:

1. met-by-event: heatmap.met + white check glyph.
2. met-by-rate: heatmap.met + white mini-bar glyph.
3. met-by-state: heatmap.met + white pulse-dot glyph.
4. missed active: heatmap.missed, no red and no X.
5. rest/holiday/override: heatmap.rest.
6. blank future/pre-install: heatmap.blank.

Cell minimum visual size 28 pt † with at least a 44 pt tap target through spacing/hitSlop. Tap opens a day-detail popover/sheet. VoiceOver reads date, schedule status, requirement status, and first qualifying kind.

### 6.10 Chart primitives

- Bar: fat, rounded, no unnecessary grid; minimum 8 pt thickness.
- StackedBar: stable data colors, dot legend directly below.
- TrendChart: Week/Month/Year SegmentedControl; spent vs earned series; selected point/card provides exact numbers.
- BreakdownCard: title, hero value, share/compare context, one accessible summary.
- Every chart exposes a nonvisual summary and a list/table of points to VoiceOver.
- Empty charts preserve the title/time-range controls and show cause + next action.

### 6.11 MilestoneBadge and Shelf

- Family-A badge art; unlocked full color, locked gray silhouette with threshold.
- All 22 remain visible in three rows: Streaks 8, Activities 8, Time Reclaimed 6. [PRD]
- Next-up badge gets a thin progress ring and explicit progress text.
- New unlock: Analysis tab dot, badge scale-in on next Analysis visit, one success haptic, “New” glint until tapped. No popup or auto-opened share sheet.
- Badge tap target at least 52 × 52 pt †; label never relies on the artwork alone.

### 6.12 EmptyState

**Anatomy:** optional Family-A hero or relevant glyph, short title, one or two causal sentences, one primary action, optional secondary education/configuration action.

Variants: no conditions, no locked apps, no history, no verified session, permission missing, sync pending.

Rules:

- Preserve the surrounding shell where possible.
- Explain how content appears and whether waiting/syncing is involved.
- Never show only “No data.”
- Empty state art is Family A; do not invent an illustration style.

### 6.13 PermissionExplainer and PermissionHealthRow

**PermissionExplainer anatomy:** hero IconChip/Family-A object, benefit-led title, 2–4 lines of scope, optional orange operational caveat, bottom actions.

Variants:

- foundational: Continue only; explicitly explain what cannot work.
- optional: Skip + Allow/Continue.
- privacy detail: light scroll surface with close.
- system prompt: simulated OS-dialog facsimile, presented only after the explainer.

Current product override: notification permission is **not** asked in onboarding. It appears when the user first turns a notification toggle on in Settings, after a one-line benefit primer. [PRD]

**PermissionHealthRow states:** healthy/green, notDetermined/neutral, needsAction/amber, unavailable/danger. Each shows text status and a fix-it route; color is supplementary.

### 6.14 Picker and Choice surfaces

- WheelPickerSheet: white/light surface, fading values, gray selection band, Cancel secondary and Done primary.
- RadioChoiceSheet: one mutually exclusive list, 44 pt radio target, selected center uses primary/attention orange plus text.
- OptionList: selected row is brand.primary; unselected is subtle card.
- Time/amount full-screen wheel: hero-sized rounded numerals, live derived consequence, bottom Done.
- Units segment sits above the wheel and converts the selected value rather than clearing it.

### 6.15 Paywall shell

**Anatomy:** emotional hero or Family-A lock, offer title, transparent trial timeline, “What’s included” route, pricing card, primary CTA, cancellation reassurance, Restore/terms/privacy/redeem, proof lower in the scroll.

**States:** default, included-features detail, store sheet, processing, purchase success, recoverable failure, restore success/failure.

Rules:

- Use live placement/store strings; never bake price, currency, trial, or savings into artwork.
- Annual/monthly selection, discount badges, and trial availability render only from actual returned products.
- Processing keeps dimensions stable and blocks repeat purchase taps.
- App Store confirmation and terminal store alerts are simulated native-style fixtures.
- Purchase/restore success routes anonymous demo identity to required simulated `/signup`; only an already signed-in restore may go directly Home.
- Repeating the pricing CTA lower in the scroll is allowed; do not make the user scroll back to buy.
- Legal/Restore access remains visible.

### 6.16 Shield / blocked-app surface

One visual treatment for four causes: balance empty, Full Lock, Walk & Scroll ended, and lock window.

- Light ivory blur.
- Family-A closed lock.
- Warm dark text on ivory.
- Orange primary button.
- Subtitle is the user’s cheapest real unlock path and may include offer numbers only; never stale spent-time/streak/balance values.
- Primary labels: “Open ExcerLock,” “Keep walking” for Walk & Scroll ended, or single “OK” for lock-window.
- Optional “Close” secondary except the single-action lock-window variant.
- No dark/red punishment aesthetic, no haptic, no guilt copy.

### 6.17 SharePreview and native share

- Preview formats: 9:16 story and 1:1 feed via SegmentedControl/toggle.
- Milestone card: badge, milestone name, achievement number, unlock month, ExcerLock wordmark only.
- Recap card: Time Reclaimed hero, active-days ratio, earn count, week range, wordmark.
- Privacy floor: no user name/photo, gym/location, locked-app name, health value, or raw event.
- Brand is always present.
- After preview, present the simulated native-style iOS share sheet; do not invoke a real share action.

## 7. Global state model

### 7.1 Interactive-state matrix

| State | Surface | Content | Motion | Accessibility |
|---|---|---|---|---|
| default | Variant token | Normal | None | Enabled |
| pressed | Same, 88% opacity | Same | scale 0.96 / 100 ms | Remains enabled |
| focused | Same + 3 pt focus ring | Same | None | Focus announced |
| selected | cardElevated or primary fill | White/ink pair | 150–220 ms | selected=true |
| disabled | 38–45% opacity | disabled token | None | disabled=true; reason available where useful |
| loading | Fixed geometry | Spinner + short status | Spinner/progress only | busy=true |
| success | Success indicator + stable result | Past-tense label | Fast check/pop | State announced once |
| error | Preserve context; danger only where necessary | Cause + recovery | No shake-by-default | Alert plus focus to recovery |

### 7.2 Home/access states

| State | Lock | Goal/balance | Condition emphasis | Copy principle |
|---|---|---|---|---|
| shieldsUp | Closed | Zero/locked | Cheapest earn path first | “Move first, scroll after” |
| healthy | Open | Normal | Natural order | Reward/status |
| low | Open | Attention at 10 min | Nearest/fastest condition may highlight | Helpful, no alarmism |
| empty | Closed | Zero | Large Add card; no seeded carousel | “Add your first way to earn” |
| restOfDay | Open | “Unlocked for today” | Source Event completed; others settle | Reward source + day boundary |
| setPeriod | Open | “Unlocked until [time]” | Source Event completed; others settle | Reward source + exact expiry |
| restDay | Open/relaxed | “No limits today” | Cards desaturate with REST DAY | Neutral scheduled holiday |
| outsideLockWindow | Open/relaxed | “Limits start at [time]” | Cards desaturate with OUTSIDE WINDOW | Neutral schedule state |
| earnDetected | Transitioning once | Update after cause is visible | Source card resolves | In-place; no takeover |

### 7.3 Session states

| State | Visual treatment | Required action |
|---|---|---|
| ready | Hero value + Start | One primary Start |
| verifying | Amber dot/progress, stable layout | Cancel only if safe |
| active | Green pulse/ring, live metric | End/Pause as product allows |
| ended-success | Final metrics + check | Done / return Home |
| ended-failed | Neutral explanation, preserved evidence | Retry, Help, or report |
| permission-lost | Permission row/card, no fake active state | Fix in Settings |

### 7.4 Simulated identity and system-entry states

| State | Surface | Required behavior |
|---|---|---|
| postPurchaseSignup | `/signup` | Required before first Home; no Back; local Apple/email fixture → processing → signed in |
| signedOutRecovery | Account → `/signup?mode=recovery` | Back allowed; successful local sign-in returns to signed-in Account |
| reviewEligible/presented | Simulated native review overlay | Record fifth-unlock/7-day/30-day/manual trigger separately from visibility; respect 30-minute post-shield suppression and three-show ceiling |
| automaticReviewSuppressed | No future automatic overlay; a current manual fixture may still be visible | Set permanently before manual Rate presents, after local rating success, or at terminal mock state |
| notificationPreview | Debug-triggered local native-style preview | Nudge/last-call route Home; recap routes Analysis then its documented Share action |

## 8. Page composition contracts

### Onboarding

- One purpose per screen.
- Hero object/chip → outcome-led title → concise body → at most one input group → bottom CTA.
- Binding looks-only spine: value proposition → phone-use confession slider → annual mirror → benefit-led permission primers/pickers → pick apps → daily free allowance → setup review → positive done moment → hard paywall → required simulated signup → zero-condition empty Home.
- The condition builder is not an onboarding entry. The pasted brief explicitly ends onboarding with done/paywall and lists builder separately, so it wins the tie against the PRD sentence that called the builder onboarding's final step. Condition #1 begins only from Home/Manage Add.
- Additional polished Pillow-style steps may be added later through the flow array, but notification permission stays out of onboarding.
- System permission prompts never appear before an explanatory surface.

### Home

- Heat canvas.
- Streak/header → GoalProgressBar → LockHero → BalanceStatsRow → empty Add card or all active ConditionCards → Edit/Analysis ShortcutActionRows → four-tab bar.
- First Home always uses the empty Add card; populated event/state/rate anchors are created naturally or seeded from debug only.
- Condition cards scroll; hero geometry stays visually dominant. Rest-of-day/set-period replace the balance with exact access expiry; rest-day/outside-window keep the shell but desaturate cards and show neutral rule status.
- Earn changes animate in place. No celebration modal.

### Manage

- Content canvas.
- Sections: Conditions, Locked apps, Rules.
- Conditions reuse banner identity, enable/reorder/edit/delete patterns.
- Rules is a parent-summary hub for Base allowance, Rollover/cap, Streak policy, Weekly schedule/lock window/custom-day rewards, and Saved gyms. Hard reset is the default streak policy; Auto-cushion makes the first missed active day a logged rest day. Saved-gym editing includes the five-gym cap, 100 m default/50–200 m radius, Manual vs Auto-detect, optional Wi-Fi confirmation, and honest permission states.
- Builder is a branded high sheet: catalog → configuration → reward → schedule/limits → banner selection → exact ConditionCard preview → Save.
- The preview consumes the real component contract, not a flattened mock image.

### Analysis

- Detail canvas.
- Fresh recap → Time Reclaimed hero → spent-vs-earned trend → streak + HeatMap → earning breakdown → MilestoneShelf.
- Use SegmentedControl for range, not tabs.
- Every chart has accessible summary and empty state.

### Settings

- Detail canvas.
- Permissions health panel pinned first.
- Grouped cards and rows for Account, Subscription/Notifications, General, Data & Connections, Support & Feedback, About.
- Signed-out Account always offers simulated Sign in through the shared `/signup` screen; it cannot end on a non-recoverable fixture.
- Manual Rate permanently suppresses automatic review asks before opening the simulated native prompt. Automatic review eligibility is 5th unlock with install age ≥3 days, then first 7-day and 30-day streaks; suppress for 30 minutes after a shield and stop after three presentations.
- Leading icon chips use Family-B glyphs. Current value appears as subtitle; navigation uses chevron; immediate boolean uses native switch.
- No “coming soon” or promotional rows.

### Notification entries

- Debug can present local native-style previews for nudge, recap, and streak last-call; no scheduling or delivery API runs.
- Nudge and last-call tap to Home and focus the relevant goal/cheapest condition; empty Home focuses Add.
- Recap taps to Analysis at the fresh recap; Share then uses the normal recap share-preview/native-sheet path.

### Walk session / Gym check-in

- Night canvas.
- One hero live state (timer/ring/status), evidence/status copy, and one bottom action.
- Verifying, active, ended-success, and ended-failed reuse the session state model.
- Failure offers recovery/help without scolding.

### Lock moments

- In-app low/empty moments use the existing Home shell.
- Blocked-app shield uses the ivory shield contract.
- Never show an artificial red jail/error screen simply because access is restricted.

## 9. Accessibility and touch rules

1. **Touch:** minimum 44 × 44 pt; primary buttons 50 pt; at least 8 pt between adjacent independent targets. Small icons use hitSlop without overlapping another target.
2. **Contrast:** 4.5:1 for normal text, 3:1 for large text and meaningful icons. White text on bright Home heat requires a local dark scrim or warm-dark alternative.
3. **Dynamic Type:** body/control text supports at least iOS accessibility sizes through reflow. Rows grow; values do not clip. Hero values may cap visual scaling but remain fully announced.
4. **VoiceOver:** every actionable glyph gets a concise label, role, state, and useful hint. Decorative art is hidden. Composite progress/ring components expose one coherent value.
5. **State is not color-only:** include icon, label, shape, or text for selected, active, low, failed, rest, and permission health.
6. **Charts:** provide a text summary and navigable data points/table. Heat-map cells announce full dates and status.
7. **Sheets/modals:** move focus inside, trap while modal, announce title, return focus to invoker, and support escape/dismiss where safe.
8. **Reduced Motion:** honor the system setting; crossfade to end states, remove pulse/parallax/overshoot, and keep task completion obvious.
9. **Reduce Transparency:** replace translucent cards with their warm solid composites while preserving hierarchy †.
10. **Haptics/sound:** respect app toggles and system settings. Success haptic occurs once; no sound accompanies unlock. Never vibrate continuously.
11. **Loading:** controls announce busy; no layout shift; long waits get visible progress or explanatory status.
12. **Errors:** focus the message/recovery action, preserve entered data/selections, and state a cause where known.
13. **System surfaces:** use native permission, StoreKit, share, switch, and critical alert behavior. Do not mimic system authorization with custom controls.
14. **Safe areas:** all bottom actions clear the home indicator; tab content clears the tab bar; landscape/iPad uses maxContentWidth rather than stretching cards indefinitely.
15. **No flashing:** no element flashes more than three times per second; active pulse is slow and subtle.

## 10. Asset and rendering contracts

This design system consumes—not redefines—the five STYLE asset families:

| Family | UI use |
|---|---|
| A — Soft-clay hero | Lock, onboarding/permission heroes, empty states, milestone badges |
| B — Flat white glyph | Tabs, settings, row/chip/button glyphs; runtime tint only |
| C — Painted banner | Condition cards and Manage condition identity |
| D — Full-screen mockup | Design comps using this token/component system |
| E — Composed square | App icon, splash/store square compositions |

Runtime rules:

- Family-A/B assets are transparent cutouts and must show no keyed fringe.
- Family-B glyphs render from white and receive tint at runtime.
- Family-C artwork always receives the standard scrim in UI; never bake status text/buttons into the banner.
- User photos use the same 2.21:1 crop and scrim as curated banners.
- Use the app-icon flat fill only for Family-E square composition, not as a substitute for screen gradients.
- Every accepted/rejected generated asset remains subject to the nearest FOUNDRY.md manifest. This document creates no visual assets and no exceptions.

## 11. Reference provenance by system area

| System area | Primary references |
|---|---|
| Heat palette, lock, goal bar, balance row, event card, shortcut rows | HOME; DASH |
| Four-tab geometry | STYLE; PRD; UPDATED-4TAB |
| State-live condition card | UPDATED-STATE; PRD |
| Rate-meter content | UPDATED-RATE; PRD; geometry from UPDATED-STATE/HOME only |
| Onboarding rhythm, form rows, pickers | P010–P029; PSG |
| Permission primer/native prompt split | P011–P027; PRD notification override |
| Paywall state machine | P003, P030–P036 |
| Simulated signup/account recovery | P024, P034–P036, P068–P072, P210–P214; PRD placement |
| Home empty/populated behavior | P037–P039 |
| Access-holiday summaries | P004, P038–P039, P083–P086, P107–P112, P198–P200 |
| Sheets, selection, edit, delete, merge, failure | P040–P052 |
| Analysis cards/charts/categorical color | P005, P053–P056; PSG; PRD |
| Reorder/filter/inline expansion/share | P057–P077 |
| Configuration progressive disclosure | P078–P087 |
| Economy Rules and saved gyms | P057–P067, P083–P101, P210–P218, P237–P246, P257–P259 |
| Review prompt and notification deep-link previews | P022–P023, P034–P036, P037–P039, P173–P177, P210–P214; ExcerLock-specific lifecycle |
| Asset material and production law | STYLE |
| Unlock behavior | STYLE v18 motion anchor; PRD; DASH translations where not superseded |
| Shield | PRD; STYLE Family A |

## 12. Intentionally inferred values and decisions

The following were fixed deliberately so implementation does not guess:

- The 4 pt spacing scale and several section/gap constants.
- Exact line heights, tracking, and selected point sizes inside Pillow’s published ranges.
- Secondary/tertiary text opacities raised or separated for accessibility.
- Detail/night three-stop gradients and local banner/modal scrim opacities.
- Sheet radius/grabber/action-zone dimensions.
- Focus-ring, chart minimum thickness, and several compact chip metrics.
- Slider geometry and the Home header/streak spacing absent from the original Home still.
- Shadow parameters for the rare floating white chip/thumb.
- Standard easing curves, spring constants, sheet duration, ring duration, active-dot pulse.
- Dynamic Type hero cap, iPad max content width, compact responsive stack behavior.
- Heat-map neutral/rest/blank alpha values.
- The approximate success-haptic timing within the v18 unlock landing.
- Solid replacements used when Reduce Transparency is enabled.

These values should change only after a side-by-side implementation capture or accessibility test demonstrates a concrete failure. Any such change should update this file so there remains one source of truth.
