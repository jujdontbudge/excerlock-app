---
status: accepted
date: 2026-09-23
---

# 0043: Sign-in and each condition's permissions follow the paywall; Home keeps one reminder card

## Decision

[ADR 0057](0057-permission-answers-before-setup-advances.md) supersedes the combined Screen Time/app-selection page and live permission advancement described here. Sign-in ordering, Setup needs and shared entry points remain accepted.

Buying a plan now leads to sign-in and then only the permissions the enabled conditions need. It no longer goes straight to Home. The same screens open from one reminder card on Home and whenever a condition that needs something new is saved or turned back on.

- `setupNeeds` (`app-next/src/domain/setupNeeds.ts`) is the single rule. It returns needs in this order:
  - `apps`: Screen Time plus a non-empty app selection, needed by every enabled condition.
  - `motion`: any walking condition.
  - `location`: Always for "Unlock while walking", While Using for a gym.
  - `gym`: a gym condition with no saved gym.

  `needBlocked` marks grants iOS will not ask for again (denied or restricted).
- `SetupFlow` (`app-next/src/features/setup/SetupFlow.tsx`) shows sign-in first, but only after the paywall and only while the user is anonymous. Each need then gets one screen: a title, one line naming the choice to tap, Continue at the bottom, and a quiet "Not now". `PermissionGuide` draws the iOS alert that Continue triggers, word for word and measured from a real iOS 26.4 alert (`SystemAlert`, `setupCopy.alerts`), centred in the safe area where iOS puts it, so the real alert lands exactly on its copy. The button to tap has an orange outline, and an orange arrow in the screen margin stays visible beside the real alert. This copies Opal's iOS 26 flow (an alert copy with a highlighted button and an arrow) and stoic's (guidance outside the real alert). A test keeps the drawn messages equal to the shipped purpose strings. Development builds on the fake runtime answer through the same `SystemAlert` and a copy of Apple's app picker; neither ships.
  - Refusing a system prompt moves on.
  - A grant refused earlier shows "Open Settings".
  - Always location that stays While Using after one ask also shows "Open Settings", because iOS offers the upgrade once.
- Routes:
  - `/setup/X1` runs the flow with sign-in. Finishing it sets `setupComplete`.
  - `/permissions` (fullScreenModal) runs the flow without sign-in.
  - `bootDestination` sends an entitled user without `setupComplete` to `/setup/X1`.
- Home renders `SetupReminder` at the top while `setupNeeds` is non-empty: what is not working yet, "ExcerLock needs this to work.", and one button to `/permissions`. The walking card's own "Turn on background walking" button from ADR 0040 is removed; the reminder card covers it.
- The builder and the Conditions toggle open `/permissions` when the saved or re-enabled condition itself is missing something (`ruleNeedsSetup`).

## Context

The product owner asked for this on September 23, 2026. Once someone buys, they should sign in, then turn on everything their condition needs, with an obvious way back from Home if they cancel. It should be simple enough to need no explanation.

Commit 3056cab3 had dropped the Screen Time, choose-apps and motion setup screens. The later "paywall goes straight to Home" change left new users with Screen Time and the app list never requested at all, so nothing could be locked. ADR 0040 rejected a setup step for background walking because it would ask gym users for Always location. `setupNeeds` avoids that by asking each condition only for what it uses.

At the time of this decision, sign-in kept its existing `signInRequired` flag and was skippable by default. ADR 0049 overrides that part: entering the main app now requires explicit sign-in on every cold launch, regardless of a restored session or the flag.

## Consequences

- A new subscriber reaches Home with apps chosen and grants in place, or sees a single card saying what is still off.
- ADR 0040's point-of-need ask moves from the walking card into this flow. Its readiness rule (`backgroundWalkingReadiness`) and shield analytics are unchanged. `permission_resolved` is now emitted by the flow, including `screen_time`.
- The demo Screen Time fake now asks for Screen Time before presenting the picker and refuses while it is off, matching the native port.
- Setup screen analytics report `/setup/X1` as `setup` with step `X1`, and `/permissions` as `permissions`.

## References

- [ADR 0040](0040-background-walking-grants-at-point-of-need.md): accepted. Its Home walking-card button is replaced here; everything else stands.
- [ADR 0049](0049-explicit-sign-in-on-every-cold-launch.md): accepted. Overrides only the optional sign-in part of this decision.
- Tests:
  - `app-next/src/domain/__tests__/setupNeeds.test.ts`
  - `app-next/src/features/setup/__tests__/setup-flow.test.tsx`
  - `app-next/src/features/setup/__tests__/setup-router.test.tsx`
  - `app-next/src/features/home/__tests__/setup-reminder.test.tsx`
  - `app-next/src/features/conditions/__tests__/condition-needs.test.tsx`
