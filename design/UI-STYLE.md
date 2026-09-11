# ExcerLock UI style

Read this before touching any screen. Use tokens from `app-next/src/design-system/tokens.ts`; never literal colours.

## Look
Orange, guided by black outlines. Some grey, little white. Light, never dark mode.

- Canvas: `surface.orangeGradient` via `ScreenShell` (orange top fading to warm white). Never a flat white or black screen.
- Every card, tile, pill, field, group and segmented track: 1px `border.outline` (black) + `surface.card` (translucent white) + `radius.card` (20) or `radius.pill`. No shadows.
- Opaque surfaces only where something sits underneath (swipe underlays, map overlays): `surface.solid`.
- Fills: primary buttons, selected segment, glyph discs, bars, checks, rings = `brand.primary`. Progress track / dividers / switch-off / dots = `border.divider` (light grey).
- Icons: orange glyphs on cards; white glyphs inside orange discs. Utility variant only.
- Text: `text.primary` (near-black) and `text.secondary` (grey). White only on orange fills. Orange text only for the single hero metric on a screen, or one emphasis word inside an onboarding headline.

## Components (reuse, do not restyle)
`SegmentedControl` (black track, full-height orange pill, white label) · `StatGrid` tiles (value, label, orange glyph disc) · `ReplacedChart` (orange bars, dashed grey average) · `WeekDots` · `CompactGroup outline` · `SettingsGroup` · `ChoiceRow` / `ActivityCard` (black outline unselected, orange border + `surface.selected` selected, solid orange in onboarding) · `ConditionPreview` (centred black caption + `BlockingScheduleCard`, the welcome screen's orange rule card with its activity icon and timeline, stating the rule so far in plain English under a setup question) · `PrimaryButton` (orange) · `SecondaryButton` (outlined) · `TextField` (outlined, orange on focus) · `CloseButton` (orange X, top right of every flow screen).

## Layout
Page padding 16–24 · section gap 16 · grid gap 12 · card padding 16 · 8-point spacing only · numbers use `type.metric` / `metricSmall` · one hero number per screen, centred, then tiles, then chart, then lists.

## Don'ts
No small grey left-aligned captions floating above content: a caption that introduces something centred is itself centred, `text.primary`, `type.label` size · No dark screens · no grey card borders · no drop shadows · no orange body text · no new colours · no emoji or coloured illustrations in UI chrome.
