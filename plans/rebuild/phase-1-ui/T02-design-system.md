# T02 — Design system: tokens, icons, components, motion primitives

Goal: every component in `03-design-system.md` §3, built on `tokens.ts`, with variant tests and previews the
dev menu can open. No screens yet. This is the foundation every later task composes; get it right here rather
than patching it in T09–T12.

## Inputs

- `03-design-system.md` (normative), `design/research/appblock-orange/DESIGN-SYSTEM.md` §7–§8 for geometry,
  `design/motion/00-principles.md` for the shared motion rules, the v3 mockups for visual sanity.
- `design/STYLE.md` before touching any asset.

## Steps

1. `src/design-system/tokens.ts`: colors, type, space, radius, layout, motion (from §1), exported as `as const`.
   Test: a snapshot of the token object and a contrast test (`brand.primary` on white ≥ 4.5:1 for `type.label`;
   `text.secondary` on white ≥ 4.5:1) using a tiny WCAG helper in `src/design-system/contrast.ts`.
2. `src/motion/`: `motionTokens.ts` re-export, `useMotion()` hook returning durations/springs adjusted for
   `useReducedMotion()`, `haptics.ts` wrapper (no-op on simulator/test, `expo-haptics` on device), `presets.ts`
   (fadeIn, slideUp, popIn, staggeredList using Reanimated entering/exiting or CSS transitions as in the old
   `PressableScale`). Test: reduced-motion returns zero-distance variants.
3. `src/icons/`: utility glyphs as hand-authored SVG components (line, 24 pt grid, `currentColor`), the
   semantic list from §2, plus the activity icons (walking, gym, running, biking) and feature icons (lock,
   lock-open, shield, bell, ruler, flame, map-pin, heart, chart, list, house, gear, star, check) as multicolor
   SVGs. Multicolor icons are produced per STYLE.md Family B pipeline *or* authored as flat SVG; either way
   every file has a `assets/icons/FOUNDRY.md` entry. `Icon` component takes `name`, `size`, `tint?`.
   Test: every name in the manifest renders; utility icons accept tint; multicolor ones ignore it.
4. Components, one file each, in this order (each with `__tests__/<Name>.test.tsx` covering every variant and
   a11y role/label): `ScreenShell`, `Heading`, `PrimaryButton`, `SecondaryButton`, `PressableScale` (press
   feedback primitive), `ChoiceRow`, `ActivityCard` + `ChoiceGrid`, `TextField`, `NumberField` (with unit
   dropdown), `Slider`, `DayPicker`, `TimeRangeRow`, `SegmentedControl`, `SettingsGroup`/`SettingsRow`,
   `PermissionRow`, `StatTile`, `StreakBadge`, `ProgressBar` + `ProgressRing`, `BarChart`, `LineChart`,
   `DotGrid`, `LoopDiagram`, `Checklist`, `TrialTimeline`, `ScheduleWidget`, `StatusCard`, `ProgressCard`,
   `RuleCard`, `EmptyState`, `BottomSheet`, `OnboardingHeader`, `TabBar` (custom, so the indicator motion is
   ours), `FakeSystemPrompt` (iOS-alert lookalike used only by the fake runtime).
5. `src/design-system/__previews__/`: a registry `{ name, variants: [{ label, element }] }` the dev menu lists;
   a `previews.test.ts` asserts every component has at least one preview.
6. Fonts: system SF Pro (no bundled font). Tabular figures via `fontVariant: ['tabular-nums']` on metrics.
7. Evidence: screenshot each preview at default and XL Dynamic Type (set via
   `xcrun simctl spawn <udid> defaults write -g UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityL`
   then relaunch) into `evidence/T02/`.

## Acceptance

- [ ] Every component in `03-design-system.md` §3 exists with tests and a preview.
- [ ] No literal colors/radii/spacing/durations outside `tokens.ts` (add an ESLint `no-restricted-syntax`
      rule for hex literals in `src/features/**` and `src/design-system/**` except tokens).
- [ ] Contrast tests pass; XL Dynamic Type screenshots show no clipped labels in buttons or rows.
- [ ] `BottomSheet` drag-to-dismiss works with a finger on the simulator (recorded clip in evidence).
- [ ] Preview registry opens from a temporary route `/dev` (the full dev menu arrives in T03).
