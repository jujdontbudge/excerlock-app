---
status: accepted
date: 2026-10-08
---

# 0067: Owner showcase data fills Analytics for screenshots

## Decision

A hidden showcase switch makes Analytics and the Home streak show two full months of example activity, so the owner can take screenshots on their own phone.

- **Who can turn it on.** Only the owner's signed-in account, matched by its canonical account ID (anonymous or signed in) in `SHOWCASE_OWNER_ACCOUNT_IDS`. For every other account the switch does nothing and shows nothing, even if it was stored as on. Dev builds allow it for any account so scenarios can show it.
- **Turning it on.** Long-press the Settings version footer for 1.5 seconds. The same long-press turns it off. The dev menu has its own Showcase data switch.
- **Duration.** It stays on until turned off, in the persisted `excerlock-next.showcase-mode.v1` store (`progress` package). Settings shows "Showcase data on" under the version while it is on. Sign-out resets it with the other stores.
- **What changes.** While it is on:
  - `useHistory` returns `showcaseHistory(today)` instead of the measured history: 61 days ending today, 13,000–22,000 steps and 60–120 gym minutes a day, every day scheduled and met. Each date's values come from a hash of the date, so a day keeps its numbers from one launch to the next.
  - `useAppleSteps` skips Core Motion and uses those steps, with distance, floors and active time derived from them.
  - Analytics offers both Steps and Time in gym, whatever Conditions exist.
- **Bank (2026-10-19).** With a Bank Condition, the Shop and Home show a showcase balance of 48,000 Points (`SHOWCASE_POINTS`) instead of the real Points, and Home's today line shows the showcase steps (or gym minutes) for today. Buying an Offer spends the showcase balance and adds the Offer's minutes to the real Bank, so purchases can be filmed. Turning showcase on refills the balance. The owner's real Points are untouched.
- **Filming mode turns it on.** The seven-tap filming toggle (ADR 0064) also turns showcase data on or off for the owner's account, so one gesture fills everything for a video.
- **Scope.** Apart from Bank minutes bought with showcase Points, it is display only. It writes nothing to the history, ledger, detection or Condition stores, and the lock decision, enforcement, Conditions progress and analytics events never read it. Turning it off shows the measured data again at once.
- **Delivery.** It ships to App Store build 17 by OTA. The owner chose this on 2026-10-08, knowing it is an exception to the rule in `docs/ota.md` that an OTA never changes what users can reach; the account gate keeps it out of every other user's reach.

## Context

The owner wanted screenshots of their own App Store app that look like a well-used account. Real history cannot provide that:
- No step or gym history leaves the phone (ADR 0048, Review Notes), so there is no account to backfill.
- Core Motion serves only the last 7 days, and the native query returns 0 for older days.
- Gym minutes exist only from detected visits.

The owner was offered three options:
- a development build in demo mode installed over their App Store app;
- a separate showcase account;
- a hidden display switch.

They refused to replace the App Store app. A showcase account would need a new server attribute and still could not write Core Motion history. A display-only switch reaches the goal without touching real data.

## Consequences

- The owner can fill Analytics on their own phone and remove the example data with the same gesture.
- Other users receive the code by OTA, but it is inert for them: the gesture does nothing and their Analytics is unchanged. It is still a hidden feature in a reviewed binary (Guideline 2.3.1, as in ADR 0064). Remove it, or disclose it in Review Notes, before the next App Store submission.
- The example data never reaches PostHog, Sentry or the server.

## References

- `app-next/src/packages/progress/showcaseModeStore.ts`, `progress/showcaseHistory.ts`, `lock/selectors.ts` (`useHistory`), `insights/lib/useAppleSteps.ts`, `insights/AnalyticsScreen.tsx`, `settings/SettingsScreen.tsx`.
- ADR 0064 (owner filming mode), the precedent for an owner-only hidden switch.
- `docs/ota.md`, "Submission scope of remote configuration".
