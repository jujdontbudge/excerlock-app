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
