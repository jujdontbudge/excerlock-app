---
status: accepted
date: 2026-10-08
---

# 0069: Gym check-in confirms in 3 seconds, and filming mode locks 1.5 seconds after a stop

## Decision

- **Gym.** `PRESENCE_CONFIRM_MS` is 3 seconds, down from 30. It sets both the "I'm at the gym" check-in and automatic arrival confirmation, so a check-in unlocks about 3 seconds after the tap. The lock outline fills in one continuous linear animation over that time (`useCeremony` `fillMs`), not in one-second steps.
- **Walking in filming mode.** `FILMING_STEPS.stopMs` is 1.5 seconds, up from 1 (ADR 0064). Normal walking detection is unchanged: its stop grace stays 30 seconds to 5 minutes, because shorter values lock mid-walk between motion updates.
- **Gym picker.** While a finger is on the picker map, the page does not scroll, so every drag on the map moves the pin.

## Context

The owner is filming the Conditions and wanted the gym unlock and the walking lock to happen quickly on camera. There are no other users, so the owner chose on 2026-10-08 to change the gym timing for everyone and ship it by OTA. In the picker, a fast drag on the map scrolled the page instead of moving the pin, and on an iPhone 13 the page stayed scrolled with the buttons cut off.

## Consequences

- A 3-second check-in is easy to pass in a car park or while walking past a gym. Raise `PRESENCE_CONFIRM_MS` again before real users arrive.
- The picker's map cannot be used to scroll the page; the area around it still scrolls.

## References

- `app-next/src/packages/activity/presence.ts`, `unlock/lib/useCeremony.ts`, `unlock/GymUnlockScreen.tsx`, `activity/lib/detection/FilmingSteps.ts`, `gyms/lib/PickerMap.tsx`, `ui/ScreenShell.tsx`.
- ADR 0064 (owner filming mode).
