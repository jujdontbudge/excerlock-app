# P2-T25 — Accessibility and locale

The audit's "not examined" list included VoiceOver on real screens, Dynamic Type and locale; no finding, memo
or task covered them. This is the smallest pass that makes the MVP shippable to the store for those users;
Johan can cut it (see `fix-plan.md` open questions), in which case it is recorded in `00-decisions.md` §F.
Runs last, after every screen task.

1. **VoiceOver**: every shipping screen passes a label audit (the current accessibility test only renders the
   design-system preview registry). The two ceremony rings announce progress (`accessibilityValue` on the ring,
   live-region announcements for "Exercise detected" and "Unlocked").
2. **Dynamic Type**: Home, Conditions, Analytics, the ceremonies and the builder survive XL without clipped
   text; fixed-height geometry becomes min-height.
3. **Locale**: `scheduleLabel` respects the device 12/24-hour setting; week start and number formatting come
   from the locale; the units default already does.

Tests first: "every screen in the registry has an accessibility label on each control"; "the ring exposes an
accessibility value"; "schedule labels honour 24-hour locales"; snapshot at Dynamic Type XL for Home and the
builder summary.

Acceptance: a VoiceOver walkthrough of onboarding → setup → Home → ceremony recorded on the simulator.

## Status (2026-09-07)

Built on `build/P2-T25`. VoiceOver: `app-next/src/testing/screenRegistry.tsx` names every route under
`app/` with a scenario, and `screens-a11y.test.tsx` audits each one (role, label, `accessible`); both
ceremony rings are focusable progress bars whose value carries the detected title and unlock body, and
the ceremony announces the detected message then the unlock. Dynamic Type: fixed heights around text are
min-heights, `screens-dynamic-type.test.tsx` runs a clipped-text estimator over every registered screen at
twice the default size, and Home and the builder summary snapshot how each string scales. Locale:
`app-next/src/content/locale.ts` reads the device tag, 12/24-hour clock and first day of the week through
Intl; schedule labels, day pickers, the analytics week, numbers and dates format through it. The
simulator walkthrough is Johan's: script in `docs/verification/voiceover-walkthrough.md`.

Open: the 12/24-hour detection reads Intl's default clock for the device locale. If the iOS 24-Hour Time
toggle alone (region unchanged) does not flip the labels on a device, add `expo-localization` and read
`uses24hourClock` in `locale.ts`; the rest of the module is unchanged.
