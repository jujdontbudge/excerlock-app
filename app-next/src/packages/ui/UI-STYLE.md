# ExcerLock UI style

Read this before touching any screen. `app-next/src/packages/ui/tokens.ts` is the one token module: use its tokens, never literals. Artwork (onboarding compositions, the condition demo, third-party brand marks, pictograms) reads `illustrationTokens.ts` instead, and UI chrome may not import it. Lint and `./excer check` enforce both.

## Look
Orange, guided by black outlines. Some grey, little white. Light, never dark mode.

- Canvas: `surface.orangeGradient` via `ScreenShell` (orange top fading to warm white). Never a flat white or black screen.
- Every card, tile, pill, field and segmented track: 1px `border.outline` (black) + `surface.card` (white) + `radius.card` (20), `radius.field` (16) or `radius.pill`. `SettingsGroup` sits on `surface.glass`. No shadows on cards, except the orange status card (`shadow.status`); controls that float (primary buttons, the slider thumb, map pins and map buttons) take `shadow.cta` or `shadow.control`.
- Fills: primary buttons, selected segment, glyph discs, bars, checks, rings = `brand.primary`. Progress track / dividers / switch-off / dots = `border.divider` (light grey).
- Icons: one tone rule. `accent` (orange) glyphs on light surfaces, `onAccent` (white) inside orange fills, `muted` for chevrons and disabled glyphs, `success`/`danger` for status. Sizes `icon.sm` 16, `icon.md` 24, `icon.lg` 36; anything larger is a `Pictogram` (illustration). Utility variant only.
- Text: `text.primary` (near-black) and `text.secondary` (grey). White only on orange fills. Orange text only for the single hero metric on a screen, one emphasis word inside an onboarding headline, or the Analytics "Today" day caption.

## Scales
- Type: eight roles on six sizes. `metric` 48 (the one hero number) · `display` 30 (screen title, onboarding question) · `metricSmall` 30 (tile and inline numbers) · `section` 22 (card and section headings) · `body` 18 (reading text) · `label` 18 (row titles, buttons) · `support` 14 (secondary lines) · `micro` 12 (badges, axis ticks). Line heights are derived from the font's clip floor; never set a raw `fontSize`, `lineHeight` or `fontWeight`.
- Spacing: `space.xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32. Page gutter `layout.page` (24) on every screen.
- Controls: `control.full` 56 (buttons, fields) · `inline` 44 (touch targets, back and close) · `indicator` 32 (radios, badges) · `row` 68 (list and settings rows).
- Motion: four durations (`press`, `standard`, `emphasized`, `breathe`), two easings (`standard` by default, `enter` to decelerate) and two springs (`control`, `pop`), always through `app-next/src/motion` helpers so Reduce Motion is honoured at the call site.

## Components (reuse, do not restyle)
`SegmentedControl` (black track, full-height orange pill, white label) · `SettingsGroup` + `SettingsRow` (68pt rows, muted chevron, optional status dot) · `ChoiceRow` / `ActivityCard` (see Selection) · `ConditionPreview` (centred black caption + `BlockingScheduleCard`, the welcome screen's orange rule card with its activity icon and timeline, stating the rule so far in plain English under a setup question) · `PrimaryButton` (orange) · `SecondaryButton` (outlined) · `TextField` (outlined, orange on focus) · `BackButton` (the one back affordance, top left) · `CloseButton` (the one close affordance, orange X, top right of every flow screen).

## Selection
One selected-state language per context, set by the `emphasis` prop. `outline` (default, in the app): black outline unselected, orange border + `surface.selected` selected. `solid` (onboarding and setup questions): the selected choice fills `brand.primary` with white label and glyph.

## Layout
Section gap 16 · grid gap 12 · card padding 16 · numbers use `type.metric` / `metricSmall` · one hero number per screen, centred, then tiles, then chart, then lists. The back and close controls stay put while content scrolls.

## Don'ts
No small grey left-aligned captions floating above content: a caption that introduces something centred is itself centred, `text.primary`, `type.label` size · No dark screens · no grey card borders · no orange body text · no new colours · no emoji or coloured illustrations in UI chrome.
