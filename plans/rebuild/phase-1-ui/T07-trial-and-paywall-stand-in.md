# T07 — Trial sequence (T1–T4) and the paywall slot (P)

Decision C6: the paywall itself is Adapty's Paywall Builder, configured by Johan in the Adapty dashboard in
Phase 2. Phase 1 builds the four custom screens before it and a **stand-in** in the paywall slot so the flow,
the hard-paywall behavior, and the entitlement states are all testable now.

## Inputs

Mockups `final-trial-offer-v3.png`, `final-trial-reminder-v3.png`, `final-notification-v3.png`,
`final-timeline-v3.png`, `final-paywall-top-v3.png`, `final-paywall-bottom-v3.png` (the last two describe the
structure Johan will reproduce in the builder; the stand-in approximates them). OtterLife replay 139–171 s
and `design/research/otter-replay/trial-paywall.jpg`. Reference study (`design/motion/reference/`).

## Steps

1. T1 "Try ExcerLock free": benefits list (icons + one line each), offer label from
   `SubscriptionPort.entitlement()`'s offer metadata (fake: "7-day free trial", clearly a placeholder in the
   content file comment), CTA Continue.
2. T2 "We'll remind you before it ends": bell hero, "2 days before your trial ends", Continue.
3. T3 "Want a trial reminder?": "Enable reminders" → `NotificationsPort.request()` (fake shows
   `FakeSystemPrompt`, resolves per scenario mode), "Maybe later". Both continue; status stored in
   `permissionsStore.notifications`. Test: grant/deny/ask modes.
4. T4 "How your free trial works": `TrialTimeline` (Today / Day 5 reminder / Day 7 billing), Continue → P.
5. P `PaywallSlot`: renders `SubscriptionPort.presentPaywall('onboarding')`. The fake port renders
   `PaywallStandIn`: header, three plan `ChoiceRow`s (Annual with trial, Monthly, placeholder prices marked
   "(placeholder)" in the dev menu only, not on screen — on screen show "$–.–– / year" style dashes), CTA
   "Start free trial", "Restore purchases" link, terms line. Actions map to fake entitlement transitions:
   Start → `purchasing` (spinner 800 ms) → `trial`; Restore → `restored` or `notFound` per scenario; errors per
   scenario. Hard paywall: no close button, no swipe-to-dismiss; Android back irrelevant.
6. Re-entry states: `trial-expired` and `billing-issue` scenarios boot to P with the matching message banner
   above the plans, placement `in_app`.
7. On `trial`/`active`: route to X1 (setup) if setup not complete, else tabs. Test all transitions.
8. Evidence, motion notes.

## Acceptance

- [ ] T1→T4→P; Start on the stand-in yields `trial` and continues to X1.
- [ ] `trial-expired` boots to P with the expired message; Restore with `restored` scenario enters tabs.
- [ ] No dismiss path from P (rendered test asserts absence of close control and that `router.back()` is
      blocked by the layout guard).
- [ ] The stand-in is visibly labeled as a stand-in only inside the dev menu (scenario note), never on the
      screen.
