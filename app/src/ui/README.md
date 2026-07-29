# Shared UI

**Contract.** `ui` owns every visual decision in the app: the token set, the shared components built from
it, the tab-shell chrome, and the harvested glyph assets. Domain modules import components and tokens from
here and never re-declare a colour, a radius, a font size or a gradient. It hides how a surface is painted;
it contains no domain calculation and no store.

**Invariants.**

- One token surface. `theme` is frozen and assembled from `colors` · `gradients` · `spacing`/`radius` ·
  `typography`. Nothing outside `theme/` defines a design value.
- Every surface is a full-bleed vertical gradient — never a flat fill, never pure black. `Screen` is the
  only thing that paints one.
- Cards are translucent and borderless. No strokes, no shadows on the gradient.
- Glyph assets ship white and are tinted at render via `tintColor`. Nothing here creates a visual asset —
  `design/STYLE.md` governs that, and this module only consumes what the foundry already produced.
- Nothing in this module reads a store, a provider or a flag.

## Layout

| Path | Responsibility |
|---|---|
| `theme/colors.ts` | colour tokens + categorical data colours |
| `theme/gradients.ts` | the three named background gradients |
| `theme/spacing.ts` | the 4pt spacing scale and the corner radii |
| `theme/typography.ts` | font faces and the type scale |
| `theme/theme.ts` | the one frozen assembled `Theme` |
| `theme/ThemeProvider.tsx` | `ThemeProvider` + `useTheme` |
| `components/Screen.tsx` | gradient background + safe-area content well |
| `components/Card.tsx` | translucent borderless card |
| `components/PillButton.tsx` | stadium pill, three variants, press-spring feedback |
| `components/SectionHeader.tsx` | 13pt uppercase group label |
| `icons/manifest.ts` | glyph assets + their alpha crops + the tab mapping |
| `icons/Glyph.tsx` | draws one glyph cropped to its ink and tinted |
| `navigation/tabs.ts` | the four approved tabs and the tab-bar chrome |
| `navigation/TabBarIcon.tsx` | a tab's glyph at the navigator's tint |
| `screens/HomeScreen.tsx` | Home, empty-start state |
| `screens/PlaceholderScreen.tsx` | themed scaffold for an unbuilt tab |

## Where the tokens come from

`design/pillow-style-guide.md` §2–§4 is the source of the system. Two deliberate deviations, both from
ticket #36:

- **Accents.** The style guide's table lists `primary #F97316`. The app uses **`#F98529` / `#EB2E02`** —
  the head and tail of the approved dashboard gradient — so pills match the mockup exactly.
- **Two background gradients.** `gradients.screen` (`#1A0F06 → #C2570A`) is the background system and the
  default for every surface. `gradients.dashboard` is the seven-stop bright gradient sampled in
  `docs/codex-dashboard-ui-build-spec.md` §2 and reserved for the Home dashboard once the condition cards
  and lock hero land. `gradients.night` backs the live lock/shield screens.

Patterns are **ported** from the frozen `prototype/` (the cropped-glyph renderer, the press-feedback
spring, the gradient stops) — nothing in `app/` imports from `prototype/`.

## Known follow-ups

- **Tab glyphs are provisional.** `design/mockups/tabbar-4plain-v1.png` calls for house · sliders · bar
  chart · gear; only the bar chart has been forged. Home, Manage and Settings borrow the nearest shipped
  Family-B glyph. Swapping them is three lines in `icons/manifest.ts`.
- **Glyph PNGs are foundry-resolution** (1024², ~750 KB each) and ship as-is because they are approved
  assets. Producing display-resolution variants belongs with the icon-foundry follow-up under
  `design/STYLE.md`'s manifest law.
- **SF Rounded** is named by family in `typography.fonts.rounded`. Platforms that cannot resolve it fall
  back to the system face; shipping the real face needs an `expo-font` asset.

## Tests

`npm run test:app` from the repository root, or `npm run test --workspace app -- ui` for this module.
Tests live in `__tests__/`. There are no fixtures — this module has no data.
