# Manage feature

This module owns the visual composition for the Manage tab and its rule editors. Expo Router files should stay thin: select presentation state, translate navigation into callbacks, and render one of the exported screens.

Public screens:

- `ManageScreen` — Conditions, Locked apps, and Rules overview.
- `RulesHubScreen` — the complete economy editor directory.
- `RuleChoiceScreen` — reusable allowance, rollover, and streak-policy detail.
- `WeeklyRulesScreen` — weekday schedule, lock window, and planned days off.
- `CustomDayScreen` — Active, Rest, and Custom weekday variants.
- `SavedGymsScreen` and `GymDetailScreen` — sample place collection and editor.

All data is local fixture/presentation state. Callback props are the only mutation or navigation boundary. Any permission, picker, map, Wi-Fi, deletion, or settings action rendered here is visibly identified as a prototype preview and must not call a device API.

The looks-only interaction contract deliberately uses explicit **Move up** / **Move down** and confirmed **Remove** taps instead of drag/swipe gestures. Weekly times, allowance, rollover, custom-day rewards, and gym fields use transactional local choice sheets instead of inertial wheels or native form sheets. These substitutions preserve cancel/commit behavior and reducer-owned parent summaries.
