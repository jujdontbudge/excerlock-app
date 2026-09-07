# ExcerLock MVP gap audit

Date: 2026-09-07. Branch `rebuild/phase-1` with the uncommitted unlock and gym-picker work. Scope: everything a user is promised (PRD, decision register, product model, screen inventory, both specs) against everything the app-next UI, domain and fakes do today, plus the old app and the Phase 2 plan.

Method: seven Opus readers wrote inventories (requirements catalog of 310 promises, three UI inventories, domain logic, old-app features, Phase 2 plan). Seven Opus gap lenses produced 221 raw findings. Duplicates were merged to 145. Every finding was then checked against the actual files by an Opus skeptic told to refute it. 115 survived (60 confirmed as written, 55 confirmed with a corrected description or severity). 25 were refuted, 15 of those because the Phase 2 plan already schedules the fix. A completeness critic then named ten areas no finding touched. Fable spot-checked the headline claims by hand.

Severity: 5 blockers, 25 high, 53 medium, 32 low. 21 findings need a product decision from Johan; those are collected in section 8.

## 0. Summary

What is solid: the pure domain (`resolveLock`, windows, DST math, `applyProgress`, streak) is small, tested to 100% branch coverage, and matches the product model on the cases it covers. Onboarding, the builder, Home, the two ceremonies and the gym picker exist and hang together. The Phase 2 plan already covers the biggest "not built yet" items (real Screen Time enforcement, cadence verification, geofences, lease renewal notification, timezone changes, Adapty, Supabase, sync).

What is not: the three things Johan asked for are each blocked by gaps that are neither built nor planned.

1. Users cannot yet enable any condition properly. Several rule shapes are creatable but not completable (a step goal with a treadmill place; a walking rule with place "either" that always opens the camera; a gym rule that points at no gym). The builder's gym step has no way out except saving a gym and silently edits the last saved gym. Activity can never be edited; half the mode changes are impossible.
2. Conditions do not yet fire at the right times and places. Nothing calls `applyLock` (planned), but the plan as written would also unshield mid-window when two windows overlap, exceed Apple's 20-monitor cap with three daily rules, anchor enforcement to a React hook inside the Home tab, and has no domain state for "instant relief on arrival". A met Friday condition unlocks Saturday and Sunday. Editing a met condition's days re-locks the apps. Gym minutes only accrue while the app is in the foreground. A verified treadmill scan books zero minutes. The 15-minute lease never renews. Nothing records past days, so streaks are fixture-only.
3. Edge cases are mostly not described to the user. Every "Open Settings" is inert. State and gym-arrival cards never show a missing permission. Gym users are never asked for Location in setup. Screen Time denied looks like a rest day. A subscription lapse locks the user out of Settings, support and the unlock ceremonies while their apps stay shielded, and no source says what should happen. The treadmill screen closes silently on framing failure, which the spec forbids. One malformed persisted row wipes every condition with no message.

Release hygiene: two "Test gym unlock" / "Test treadmill unlock" buttons are on the production Home screen with no guard; the `/dev` route and the `excerlock://home?steps=…` deep link mutate the runtime with no build gate.

## 1. Enforcement: does the lock happen at the right time?

Today the lock decision is computed once a second and rendered on Home. `ScreenTimePort.applyLock` has zero call sites; only the fake implements it and it logs. This is expected in Phase 1 and P2-T04 owns it. The audit's job was to check whether P2-T04 plus the domain would produce correct enforcement. It would not, for these reasons, none of which the plan addresses:

- Overlapping windows unshield early. P2-T04 registers one DeviceActivity schedule per rule per window instance and clears shields at each interval end. The monitor extension cannot consult other rules. Rule A 9 to 12 and rule B 10 to 14, both unmet: at 12:00 with the app closed, A's interval end clears the shields for two hours B should be blocking. Fix: register the union of all enabled rules' windows, computed by a pure domain function next to `resolveLock`, never per-rule intervals.
- The 20-monitor cap. Per-rule-per-day registration with no cap on rule count: three daily rules produce 21 monitors before the usage monitor and the walking-lease monitor. Registering the merged union collapses this to at most seven weekly schedules. Add a monitor-budget assertion in the adapter.
- Enforcement anchored in the wrong place. P2-T04 wires `applyLock` to `useLockDecision`, whose only consumer is `HomeScreen` inside the entitlement-and-setup-guarded tab stack. So enforcement would not run during setup, during a paywall-over-tabs lapse, in the background or after a kill. `startProgressSync` has the same defect (mounted in the tabs layout only). Both belong at the app root above every guard, with an `AppState` active handler that re-reads signals and re-applies.
- Instant relief has no home. PRD and the aha spec require shields to lift the moment arrival is detected, with the 30-second confirmation only booking the reward. `LockDecision` has no "arrived, unconfirmed" state and `resolveLock` unlocks only on a met row. The gym screen's own comment assumes instant relief exists. Needs a seventh state such as `unlockedProvisional { ruleId, expiresAt }` ranked above `locked`.
- Subscription lapse is undefined and today it strands the user. `expired` and `billingIssue` unmount the whole guarded stack (tabs, Settings, sign-in, builder, both unlock modals). In Phase 2 the OS monitors keep re-shielding weekly with no app process involved. The user is locked out of their apps by an app they cannot open without paying, cannot delete their account (App Store 5.1.1(v)), cannot reach support, cannot turn conditions off. No spec line covers it. Decision needed (Q1).
- Clock rewind revives expired unlocks. `resolveLock` compares `leaseUntil` and `relockAt` against a raw `now`; the fake clock accepts negative deltas; there is no monotonic watermark anywhere. Setting the iPhone clock back an hour re-opens the apps. Persist a max-observed instant and clamp `now` to it in the enforcement path.
- A stale or null selection handle is invisible. `LockedApps` allows `handle: null` with non-zero counts and Home decides "no apps selected" from counts alone. iOS can invalidate the opaque handle and sync never carries it. Treat a null handle as no selection and have the adapter verify the handle on foreground.
- `applyLock` is fire-and-forget. `void` return, no error channel, no idempotency contract. The old app's fail-closed law (if the renewal monitor fails to register, shield first, then return the error) cannot be expressed. Change to `Promise<{applied; reason?}>` and surface a failure on Home.
- The shield is static and its buttons go nowhere. `shieldProgress` bakes "1,800 steps to go" into Apple's template, which only refreshes when the app runs. `locked` and `lockWindow` produce byte-identical copy. The primary button targets `excerlock://locked-apps`, which is not a route, and P2-T04's tap-through notification contradicts the two-notification law in P2-T09 and decision B14. Decisions needed (Q10, Q16).
- Goal met while the app is closed. The extension cannot read the pedometer, HealthKit background delivery dies on force-quit. P2-T05 prescribes the Home line "Open ExcerLock after your walk to unlock"; the string is not in `src/content/home.ts` and there is no Home state for it. Runs and rides also do not register on a warm foreground because `progressSync.refresh()` runs at mount and on store changes only.

Observation from the domain inventory, not a verified finding: `LockDecision` has no `permissionNeeded`, `noAppsSelected`, `allPaused` or `noRules` state. Those four are invented in `statusContent`. An enforcement layer reading `LockDecision` directly will not see them.

## 2. Conditions: can users enable any condition and see it work?

- Progress disappears when an entry pill exists. `BlockingScheduleCard` renders `{action ?? children}`. On any locked day with a gym or treadmill rule, the other rules' progress cards are thrown away; they survive only as name-only rows in a white list. Verified by hand. Render both slots.
- Names and numbers are never together. The white "Conditions" list has names and no progress; the in-lock progress rows have numbers and no names (the lock appearance drops the title). With three conditions the user is guessing which number is which. One list, name and number on one row.
- The locked state never says "Apps are blocked" or the unlock hint. `statusContent` computes it; Home renders the status line only when `status.unlocked`. The hint the whole product model is built around is never shown.
- Met carries into unscheduled days. A Mon to Fri condition met Friday makes Saturday and Sunday resolve to `unlockedMet` with "Unlocked for the rest of today" and an orange lock card. Confirmed by running the compiled domain. Restrict the met scan to the current or most recent window instance's day.
- Editing a met condition re-locks it. `resolveLock` requires `windowInstances(rule, row.day)` to still exist. Changing the days so today is excluded discards an unlock the user earned, with no warning. Snapshot the met row's window, or warn on save.
- Pausing or deleting the condition that unlocked the day re-locks the apps immediately when another unmet condition exists. The product model says pausing removes a rule from every branch; decision B2 says a met rule unlocks the day "no matter what". Contradiction. Decision needed (Q3).
- Two conditions met the same day: attribution is array order, and `progressSync` moves any changed row to the end, so the credited condition can flip as progress ticks. Break the tie on `metAt`.
- An unmet second window never re-locks after another condition is met (decision B6, as designed), and nothing tells the user their evening condition is inert today. Mark other scheduled conditions "Met by X today" on Home and "Satisfied today" on the Conditions row.
- Creating a condition whose window has already started locks the apps on Save with no note. Say "Blocking starts as soon as you save" on the summary.
- Walking place "either" always goes to the camera. `unlockKind` sends every state rule whose place is not "outside" to `/unlock/treadmill`. Walking outdoors with the phone in hand, the scan cannot see them, the screen closes after 35 seconds and stops the session. Decision needed (Q7).
- A step-goal rule can be created with place "Treadmill", which the pedometer cannot count on a propped phone and which has no camera path. Decision needed (Q8).
- Gym rules carry no gym. Any saved gym credits every gym condition; the nearest gym is guessed; the gym picker is unreachable from a gym rule. Decision needed (Q4).
- Deleting a saved gym silently orphans gym conditions. The confirm sheet is titled "Remove gym" with the gym name as body. Home still shows the "I'm at the gym" pill; only the ceremony reveals "Save a gym first". Decision needed (Q5).
- The builder's gym step traps the user: no Back, no Cancel, no footer, only "Save gym". And it edits the most recently saved gym instead of adding one, so at the 5-gym cap a sixth gym condition overwrites gym number five.
- Edit is a replay of creation. Activity can never be changed. A step goal can never become "unlock while walking"; gym minutes can never become arrival; distance can never become minutes. Changing mode resets the draft to defaults and skips the goal screen, so "unlock while walking" to "step goal" silently saves 5,000 steps.
- Paused conditions look identical to active ones. The Conditions screen shows no state at all (met, in progress, blocking now, not today, paused).
- The locked-app count ("N apps · M categories") is shown only on setup step X2. Home, Conditions and Settings rows say "Lock list" / "Locked apps" with no count, so an emptied selection is invisible.
- Home hides "Add condition" whenever a lock card shows.
- Unmet second-window and multi-window days draw only one window on the lock card timeline.
- No scenario and no test renders Home with two or more enabled rules; the only stacking scenario gives all three the same window.

## 3. Timers and cooldowns: do they actually work?

What exists in domain code and will survive Phase 2: window instances, cross-midnight windows, all-day windows, DST gap and fold handling, `relockAt` from the next-day cutoff, the lease check `leaseUntil > now`, met latching.

What exists only in the fake and has no domain or port contract:

- The walking phase machine (verifying, walking, grace, ended) is wall-clock against a fixture script. Fine for Phase 1, but the lease is hardcoded twice as `900000`, there is no `renew()` on the port, no renewal call site, and the fake force-ends every session at exactly 15:00 while the sheet says "until renewal". Decision needed on renewal semantics (Q9).
- The stop-grace setting (30 s to 5 min) is stored and displayed and read by no timing code. P2-T05 books it. Planned, not a new gap.
- A propped treadmill session that passes the scan books zero minutes: `completeProppedScan` re-issues the lease but never starts the progress loop, so Analytics shows nothing and the 10-minute streak floor can never be reached. Blocker for treadmill users.
- An abandoned propped scan becomes a verified unlock after relaunch: `resume()` replays the default script and promotes the phase to "walking" with no camera verification.
- The treadmill scan timers use `Date.now` while sessions and leases use the fake clock; the gym ring and the fake's 30-second confirmation also run on wall time. Testers advancing the dev clock see the ring and the app disagree. Drive all product timing off `ClockPort`.
- The walking session is never torn down when its window ends. `resolveLock` stops honouring it, but the sheet keeps counting down.
- Starting a walk before the window opens burns the lease and unlocks nothing, while the sheet claims "Your apps are open while you walk".
- Gym minutes accrue only from foreground clock ticks. Phone in a locker for an hour: 0 to 1 minute of progress. `GymPort` has no dwell or visit surface. P2-T05 assigns presence events to dwell progress but defines no port shape for enter/exit timestamps. Decision needed (Q11).
- Gym dwell before the condition existed counts as zero, unlike steps and workouts which are day totals. Keep dwell as a per-day accumulator independent of rules.
- The gym check-in abort is wired to unmount only, not to leaving the radius; correctness depends on the fake rejecting with "Left gym".
- Progress rows are written on unscheduled days by the gym writer and skipped by the workout writer; a cross-midnight session lands on the start day in the rule store and on `dayKey(now)` in history.
- `WalkingFake.resume` double-counts minutes after a relaunch when the scenario has no walking script.
- No past day is ever recorded. History comes from the scenario fixture and `contextPersistence` resets it on launch. Streaks, days met and the Analytics period have no code path that could survive Phase 2. Seal yesterday's row at rollover with a pure domain function.
- Clock rewind and timezone: no watermark, no reaction to timezone change (planned in P2-T04), and `localInstant` returns its last guess silently after three iterations.
- The 15-minute minimum window equals Apple's DeviceActivity floor with zero margin. Decision needed (Q12).
- Time coverage in scenarios is three instants on two weekdays in one timezone. No DST day, weekend, all-day rule, lease expiry, relock, two-rules-met, verifying phase, backwards clock or timezone-change scenario or `resolveLock` test exists.
- `ruleDays` rows are never pruned and the whole set is sorted once a second while Home is mounted.

## 4. Permissions and what the user is told

- Every "Open Settings" button is inert: `PermissionDetail`, `PermissionPrimer` and the Home fix button all either reveal a note or call `requestAuthorization`, which iOS never re-presents after a denial. P2-T10 schedules `Linking.openSettings()`; the note-only handlers and their apology strings should go now.
- State-mode and gym-arrival cards never show a missing permission. `progressContent` returns from the state and event branches before the permission computation, so "Unlock while walking" with Motion denied shows "Start a walk", and "Arrive at the gym" with Location denied shows "Your next visit counts".
- Gym users are never asked for Location. Setup X3 for gym returns the picker and never reaches the location primer, so the "Always" auto-detect upgrade is dead code and the X5 checklist row "Location access" is permanently unchecked with no reason.
- Camera permission is never requested, recorded or checked. The scan starts the camera on mount; Settings says "Not requested" forever; `restricted` is treated as granted.
- Screen Time denied and no apps selected render as "No blocking right now" with an open padlock, the same as a rest day. The screen inventory only asked for a subtitle change, but the result reads as "enjoy your day" while the product is non-functional.
- With Location granted and no gym saved, the gym screen says "Location access is off" because `denied` is derived from a null coordinate.
- The treadmill screen closes silently when the 30-second framing grace expires and drops the user on a blocked Home. The spec's absolute rule is "never shield silently on a failed scan". Keep the screen mounted with "Try again" and "Continue with phone in hand".
- The treadmill and gym-minutes ceremonies can celebrate an unlock that did not happen: `onVerified` ignores the boolean from `completeProppedScan`, and the gym-minutes path lifts the shackle and fires confetti while `resolveLock` still returns `locked`. Decision needed on the gym-minutes screen (Q2).
- The camera-denied fallback returns the user to a locked Home with nothing saying a walk is being verified.
- Restore purchases from Settings can destroy a live entitlement: a `notFound` restore patches the store to `none` and the whole app unmounts to the hard paywall.
- Paywall has no tappable Terms or Privacy links (App Review 3.1.2).
- One malformed persisted row wipes every condition or every day of progress silently (array validators are all-or-nothing). There is no error boundary anywhere.
- Offline is unhandled everywhere except gym search; a purchase, restore, sign-in, code and support send all collapse to "Something went wrong".
- The setup checklist shows unchecked rows with no reason and no way to fix them; "Progress saved to an account" ticks with nothing saved.
- The gym auto-detect switch discards the boolean from `enableAutoDetect`, so a denied Always grant snaps the switch back with no explanation.
- "Touch feedback" does nothing: `setHapticsEnabled` has no callers.
- Anonymous users (the majority under B18) have no way to delete their data; sign-out is silent and unconfirmed; the support form captures no reply address.
- No grace-period entitlement status exists, so a user in Apple's billing grace loses the app.
- The permission detail screen shows the "without access" warning and the fix button even when granted; the top-level Settings omits the Camera row.

## 5. Spec versus shipped, both directions

Promised, not built or changed without a record:

- O19 "Built around small, repeatable habits" is specified, its copy is written, and it is not in the flow (Q13).
- The mandatory "illustrative" label is missing from the O15 trend chart; a test asserts its absence.
- O02 and O03 reuse O01's heading; six approved headings were rewritten, including "You become ADDICTED to exercise" (Q13).
- O10 replaced the 1 to 12 hour slider with five coarse bands that permanently set the Time Reclaimed denominator (Q13).
- O06/O07 option sets differ from the approved lists, and no profiling answer is ever read despite "This helps us tailor your plan".
- Analytics is missing the previous-period delta, the three stat tiles, the estimate baseline and the "no conditions" empty state, and its heading "How you earned time" reintroduces the cut time-bank vocabulary.
- Settings became a compact screen plus an undocumented "More settings" page; "Manage subscription" opens Settings, not the App Store (Q14).
- The gym radius ships as a 50 to 200 m slider; the screen inventory says fixed 100 m (Q6).
- The manual check-in sheet is dead code the inventory still lists; `WalkingSheet`'s treadmill block is unreachable dead UI.

Built, not promised:

- Two test buttons on Home; the unguarded `/dev` route; Home's runtime-mutating deep-link params. Remove the buttons, gate the rest behind `__DEV__`.
- A "History" row that does nothing and an "Analytics" row duplicating the tab.
- A "Lifetime" plan on the paywall stand-in that the PRD rules out (Q15).
- A "Notifications" preference row that opens the OS permission explainer.

## 6. Not examined yet

The completeness critic named ten areas no finding touched. They are unverified and should get a short follow-up:

1. Native capability configuration: the iOS entitlements file is empty (no Family Controls), and usage-description strings for every sensor were not checked.
2. Privacy manifest declares no collected data types; App Privacy label and analytics opt-out are absent.
3. Product telemetry: `analytics.track` is called from two places; the activation and trial funnel is not instrumented; identity is never set or cleared.
4. Data export ("Export my data" in the PRD) exists nowhere.
5. VoiceOver on real screens: the accessibility test only renders the design-system preview registry; the unlock ring is silent.
6. Dynamic Type XL on real screens: fixed-height geometry in the habit loop and elsewhere.
7. Locale: `scheduleLabel` hardcodes 12-hour AM/PM; week start and number formatting untested.
8. Notification delivery: `expo-notifications` is not installed; foreground presentation and tap landing are undefined.
9. Changing or skipping the blocked-app selection after setup: the flow itself, not just the count.
10. Persisted-store versioning across an app update; silent AsyncStorage failure.

## 7. Already planned in Phase 2 (no new decision, must be delivered)

These were raised by the lenses and refuted by the verifiers because the plan already schedules them. They are the Phase 2 backlog for Johan's point 2:

- `applyLock` wiring and DeviceActivity schedules (P2-T04), with the four corrections in section 1.
- Real cadence verification, propped, handheld and handoff state machine, stop grace from settings, lease renewal (P2-T05).
- Gym auto-detect through geofences with the 30-second confirmation (P2-T05); today's fake credits on the first presence flip.
- Walk-lease warning and trial reminder notifications (P2-T09).
- Timezone change re-registration (P2-T04).
- Permission rows reading live status on foreground and `Linking.openSettings()` (P2-T10).
- Entitlement `unknown` 3-second budget and paywall retry (product model).
- Restore and identity through Adapty, welcome-back restore on reinstall (P2-T06, P2-T08).
- Teardown ordering on sign-out and delete (architecture doc).
- Sync conflict rule by `updated_at` (P2-T08).
- Counsel-approved legal text (P2-T10). Rate and Share rows (P2-T10).

## 8. Decisions needed

Numbered to match the grill round. Each has Fable's recommendation.

**Answered by Johan 2026-09-07.** All recommendations confirmed except Q8: the builder keeps place first, Treadmill allows only "Walk for N minutes" and "Unlock while walking", Outside/Either allow all three. Recorded as decisions B21–B37 in `plans/rebuild/00-decisions.md`; the fix plan lives in `plans/rebuild/phase-2-backend/`.

1. Subscription lapse while apps are shielded: clear all shields and unregister monitors on the transition into expired or billingIssue, and keep Settings, support, account deletion and the ceremonies reachable behind an in-app paywall modal. Recommended: yes, unshield on lapse; a hard paywall must never hold someone's apps hostage.
2. Gym minutes rule on arrival: instant relief (apps open while presence holds inside the window, credit books at N minutes) versus stay locked until N minutes accrue. Recommended: instant relief as the PRD decided; the ceremony then honestly says "Unlocked while you're here, N minutes counts the day".
3. Pausing, deleting or editing a condition that already unlocked today: keep today's unlock (B2 "no matter what") or re-lock. Recommended: keep it; snapshot the earned unlock on the met row so schedule edits cannot revoke it.
4. Gym conditions bind to one saved gym or any saved gym. Recommended: any saved gym, stated in the product model, with the gym list reachable from the condition summary.
5. Deleting the gym a condition depends on: auto-pause the condition with a note, or leave it visibly broken. Recommended: auto-pause and say so on the row.
6. Arrival radius: 50 to 200 m slider (PRD, shipped) or fixed 100 m (screen inventory). Recommended: keep the slider, fix the inventory, add the trade-off copy on the picker.
7. Walking place "either": Home offers a choice ("I'm on a treadmill" / "I'm walking with my phone") or the treadmill ceremony always opens with a "Continue with phone in hand" escape. Recommended: the choice, one tap, no camera surprise outdoors.
8. Treadmill plus step goal: hide the step-goal option when place is treadmill, or ask place only after "Unlock while walking". Recommended: ask place only for unlock-while-walking; a step goal has no place.
9. Lease renewal: renew indefinitely while cadence stays verified, or cap a session. Recommended: renew indefinitely, no cap, matching "no per-day session cap".
10. Shield tap-through: allow a third notification id for the shield's "Open ExcerLock" button, or make the button close the shield and rely on the user opening the app. Recommended: allow the third id; without it the shield's primary button lies.
11. Gym dwell with the app closed: credit the full geofence enter-to-exit interval retroactively, or only observed time. Recommended: credit the full interval from timestamps; the 30-second confirmation already filters blips.
12. Minimum window: raise to 20 or 30 minutes, or keep 15 and prove it on hardware in P2-T11. Recommended: 30 minutes; a 15-minute block is not a meaningful block and it sits on Apple's floor.
13. Onboarding copy: are the shipped headings, the five O10 bands, the O06/O07 lists and the missing O19 the new approved versions, or does the screen inventory win? Recommended: the inventory wins for O19, the illustrative label and the duplicate O01 heading; keep the O10 bands only if the "never editable" rule is relaxed.
14. Settings: keep the two-tier compact plus "More settings" shape and rewrite the inventory, or return to one screen. Recommended: one screen as specified; the compact screen hides required rows behind mislabelled taps.
15. Lifetime plan: real SKU or remove from the stand-in. Recommended: remove.
16. Shield copy for `lockWindow` (window start with the app suspended): its own subtitle or drop the third cause. Recommended: own subtitle naming the cheapest unlock, published per rule to the app group whenever the app runs.
17. Two local notifications individually toggleable, or OS-level only. Recommended: OS-level only for v1; rename the preference row.

## 9. Appendix: all surviving findings
| # | Sev | Verdict | Finding | Lenses |
|---|---|---|---|---|
| 1 | blocker | confirmed | A verified treadmill scan books zero exercise minutes and can never build a streak | time, promised, signals |
| 2 | blocker | confirmed | Treadmill framing-grace expiry drops the user onto a blocked Home with no explanation - the silent shield the spec forbids | time, enforce, copy, promised, signals |
| 3 | blocker | confirmed | No decision anywhere for what shields do when the subscription lapses | enforce, money |
| 4 | blocker | confirmed | Two hardcoded "Test gym unlock" / "Test treadmill unlock" buttons ship on the production Home screen | promised |
| 5 | blocker | confirmed | Subscription lapse locks the user out of Settings, account deletion, support and the unlock ceremonies | money |
| 6 | high | partly | Per-rule progress cards are silently discarded on any locked day that includes a gym or treadmill rule | lifecycle, enforce, copy, promised, signals |
| 7 | high | confirmed | "Instant relief on gym arrival" has no mechanism in the domain model, the port, or Phase 2 | time, enforce |
| 8 | high | partly | No past day is ever recorded — streaks are fixture-only and reset on relaunch | time |
| 9 | high | partly | Enforcement is anchored to a React hook inside the Home tab, so it stops whenever Home is unmounted | enforce |
| 10 | high | partly | The /dev route is registered with no build guard, and Home accepts unguarded runtime-mutating deep-link params | enforce, promised, money |
| 11 | high | partly | The gym time-target ceremony celebrates an unlock that never happens | copy, promised, signals |
| 12 | high | partly | Settings → Restore purchases can destroy a live entitlement and eject the user to the paywall | money |
| 13 | high | partly | Paywall has no Terms of Use or Privacy Policy links (App Review 3.1.2 rejection) | money |
| 14 | high | confirmed | With several conditions, names and numbers are never shown together | lifecycle |
| 15 | high | confirmed | Met state carries into days no condition is scheduled — Home says 'Unlocked for the rest of today' on a free Saturday | lifecycle, copy |
| 16 | high | confirmed | Editing a met condition's days or window re-locks the apps instantly | lifecycle |
| 17 | high | confirmed | Overlapping rule windows: the earlier window's DeviceActivity interval end clears shields while another rule is still active | enforce |
| 18 | high | confirmed | DeviceActivity's 20-monitor OS cap vs an uncapped number of rules | enforce |
| 19 | high | confirmed | Motion, Health and Location denial is invisible for state-mode and gym-arrival conditions | copy, signals |
| 20 | high | confirmed | Gym users are never asked for Location, never see the location primer, and are told nothing when the checklist row stays unchecked | copy, promised |
| 21 | high | confirmed | One malformed persisted row silently wipes every condition or every day of progress with no message | copy |
| 22 | high | confirmed | With location granted but no gym saved, the gym unlock screen says "Location access is off" | copy, signals |
| 23 | high | confirmed | The builder's gym-location step has no Back, Cancel or footer - the only way out is saving a gym | copy, promised |
| 24 | high | confirmed | Camera permission is never requested, never recorded, and Settings always reports it "Not requested" | copy, signals |
| 25 | high | confirmed | The builder's gym step edits the user's most recently saved gym instead of adding a new one | promised |
| 26 | high | confirmed | Onboarding screen O19 "Built around small, repeatable habits" was specified and its copy written, but it is not in the flow | promised |
| 27 | high | confirmed | The mandatory "illustrative" label is missing from the O15 trend chart, and a test enforces its absence | promised |
| 28 | high | confirmed | A walking rule with place 'either' can never start an outdoor handheld walk — it is always sent to the camera | signals |
| 29 | high | confirmed | Finished runs and rides do not register unless the app is cold-launched | signals |
| 30 | high | confirmed | The treadmill ceremony can celebrate an unlock that never happened | signals |
| 31 | medium | partly | The 15-minute walking lease cannot be renewed; the fake hard-ends every session at 15:00 | time, enforce, copy, signals |
| 32 | medium | partly | "Spend N minutes at the gym" only accrues while the app is open, and no port can report dwell time | time, signals |
| 33 | medium | partly | Screen Time denied is drawn as a benign "No blocking right now" with an open padlock | enforce, copy, promised |
| 34 | medium | partly | In the locked state Home never shows "Apps are blocked" or the unlock hint the screen inventory requires | enforce, promised |
| 35 | medium | partly | A denied permission has no in-app recovery path anywhere — every "Open Settings" button is inert | copy, money |
| 36 | medium | partly | Home never tells the user which condition unlocked the day | lifecycle |
| 37 | medium | partly | Pausing the condition that unlocked the day silently re-locks the apps mid-day | lifecycle |
| 38 | medium | partly | The walking session is never torn down when its window ends | lifecycle, time, signals |
| 39 | medium | partly | On a rest day Home never says when blocking resumes | time |
| 40 | medium | partly | Rewinding the device clock re-opens an expired unlock and revives a lapsed walking lease | time, enforce |
| 41 | medium | partly | Time coverage is three instants on two weekdays in one timezone — no DST, weekend, all-day, lease-expiry or relock scenario exists | time |
| 42 | medium | partly | A goal met while the app is closed does not lift the shields, and there is no copy explaining it | enforce |
| 43 | medium | partly | A stale or null Screen Time selection handle is invisible: Home reports normal blocking while nothing can be shielded | enforce |
| 44 | medium | partly | The shield the user sees most often — window start with the app suspended — falls back to generic copy with no unlock path | enforce |
| 45 | medium | partly | Both shield buttons lead nowhere: no deep-link route, and no collapse when notification permission is missing | enforce |
| 46 | medium | partly | No error boundary anywhere; an invalid draft throws at render on the plan summary and shows a blank crash | copy |
| 47 | medium | partly | Analytics is missing four other specified elements: the previous-period delta, the three stat tiles, the estimate baseline and the "no conditions" empty state | copy, promised |
| 48 | medium | partly | Signing in from the welcome screen does nothing — no restore, no entitlement check, no skip | promised, money |
| 49 | medium | partly | Settings was split into a compact screen plus an undocumented "More settings" page; the Camera permission row is missing and required rows are buried behind mislabelled taps | promised, money |
| 50 | medium | partly | No grace-period / billing-retry entitlement status, though Phase 2 requires mapping one | money |
| 51 | medium | partly | Session carries no user id, so the Adapty↔Supabase identity spine cannot exist | money |
| 52 | medium | confirmed | Two conditions met the same day: the card can flip between them as progress ticks | lifecycle, time |
| 53 | medium | partly | Editing a walking condition into a step goal skips the goal screen and silently applies the 5,000 default | lifecycle |
| 54 | medium | confirmed | Half of the mode changes are impossible, and activity can never be changed at all | lifecycle |
| 55 | medium | confirmed | The gym picker is unreachable from a gym rule, and gym rules carry no gym reference at all | lifecycle, promised, signals |
| 56 | medium | confirmed | Deleting a saved gym gives no consequence copy and silently orphans gym conditions | lifecycle, copy, signals |
| 57 | medium | confirmed | At the 5-gym cap, adding a gym condition silently overwrites an existing gym | lifecycle |
| 58 | medium | confirmed | Gym-minutes progress only accrues from live presence, so a gym visit before the condition existed counts as zero | lifecycle |
| 59 | medium | confirmed | Creating a condition whose window has already started locks the apps the moment the user taps Save | lifecycle |
| 60 | medium | confirmed | The locked-app selection count is shown nowhere outside setup step X2 | lifecycle, enforce, copy, promised |
| 61 | medium | confirmed | The gym check-in AbortController is wired only to unmount, not to leaving the gym | time |
| 62 | medium | confirmed | Progress rows are written for days the rule is not scheduled, and the two writers disagree about which day owns them | time |
| 63 | medium | confirmed | WalkingFake.resume double-counts minutes after a relaunch | time |
| 64 | medium | confirmed | ruleDays rows are never pruned and the entire set is re-sorted on every clock tick | time |
| 65 | medium | confirmed | Shield copy bakes a live number into Apple's static template, which only refreshes when the app runs | enforce |
| 66 | medium | confirmed | applyLock is fire-and-forget with no failure channel, so the old app's fail-closed law is unrepresentable | enforce |
| 67 | medium | confirmed | An unmet second condition's window never re-locks after another condition is met, and nothing says so | copy |
| 68 | medium | confirmed | The permission detail screen shows the "without access" consequence even when the permission is granted | copy |
| 69 | medium | confirmed | Offline is unhandled everywhere except the gym search | copy |
| 70 | medium | partly | The setup completion checklist shows unchecked rows with no reason and no way to fix them | copy |
| 71 | medium | confirmed | O10 replaced the specified 1-12 h slider with five coarse bands, permanently quantising the Time Reclaimed baseline | promised |
| 72 | medium | confirmed | Approved onboarding headings were changed without a decision record; O02 and O03 both reuse O01's title | promised |
| 73 | medium | confirmed | O06/O07 option sets differ from the approved lists, and every profiling answer is stored but never read despite "This helps us tailor your plan" | promised |
| 74 | medium | confirmed | Home ships a dead "History" row and a duplicate "Analytics" row that no spec asks for | promised |
| 75 | medium | confirmed | The manual gym check-in sheet is dead code the screen inventory still specifies, and the "Check in" label now opens a full-screen ceremony | promised |
| 76 | medium | confirmed | Gym arrival radius ships as a 50–200 m slider while the screen inventory specifies a fixed 100 m | promised, signals |
| 77 | medium | confirmed | A gym-arrival card never tells the user that Location is off | signals |
| 78 | medium | confirmed | The only screen for the recommended outdoor "unlock while walking" flow is unreachable from every dev scenario | signals |
| 79 | medium | confirmed | Anonymous users have no way to delete their data | money |
| 80 | medium | confirmed | 'Touch feedback' preference does nothing — setHapticsEnabled has no callers | money |
| 81 | medium | confirmed | Gym auto-detect switch silently swallows a denied Always-location grant | money |
| 82 | medium | confirmed | Trial timeline and reminder copy are hardcoded rather than derived from the offer | money |
| 83 | medium | confirmed | Support form has no reply path or confirmation of where the message goes | money |
| 84 | low | partly | An abandoned treadmill scan becomes a verified unlock after relaunch | time |
| 85 | low | partly | The lock card timeline describes only one condition's window, so stacked windows are drawn wrong | lifecycle |
| 86 | low | partly | Paywall offers a Lifetime plan that the PRD explicitly ruled out | promised, money |
| 87 | low | partly | HealthPort cannot express the one anti-cheat the PRD keeps: manually entered workouts must not count | signals |
| 88 | low | partly | Nothing implements the propped→handheld→handoff state machine; a propped session just dies at 15 minutes | signals |
| 89 | low | partly | A step-goal rule can be created with place 'Treadmill' even though a propped phone counts no steps | signals |
| 90 | low | partly | The paywall plan picker is cosmetic — every plan grants the same trial | money |
| 91 | low | partly | A paused condition looks identical to an active one on the Conditions screen | lifecycle, copy, promised |
| 92 | low | partly | The Conditions screen shows no per-condition state — no met, no progress, no 'blocking now' | lifecycle |
| 93 | low | partly | The 30-second gym cooldown runs on real wall time while the rest of the app runs on the fake clock | time |
| 94 | low | partly | afterWindow versus noRulesToday depends on whether a window happened to spill past midnight | time |
| 95 | low | partly | "Get ahead" is offered before windows for state rules, where getting ahead is impossible | time |
| 96 | low | partly | localInstant gives up after three iterations and returns its last guess unchecked | time |
| 97 | low | partly | The minimum rule window is exactly 15 minutes — the same value as Apple's DeviceActivity floor, with zero margin | enforce |
| 98 | low | partly | After the camera-denied fallback the user is returned to a locked Home with no explanation | copy |
| 99 | low | partly | An OS-restricted Location can never be represented, so Settings reports it as "Not requested" | copy |
| 100 | low | confirmed | The top-level Settings permission list omits Camera | copy |
| 101 | low | partly | Nothing tells the user what signing in buys them or what skipping it costs | copy |
| 102 | low | confirmed | Pressing Edit on the plan summary can silently break Cancel, so Back keeps the change instead of discarding it | copy |
| 103 | low | partly | Starting a walk can fail with no error surface at all | copy, signals |
| 104 | low | partly | O03 advertises "Cycling" and "Strength training" as the app's activities; two screens later it offers Biking and Gym | promised |
| 105 | low | confirmed | The shield preview's `locked` and `lockWindow` causes produce byte-identical output | promised |
| 106 | low | partly | Starting a walk before the window opens burns the lease and unlocks nothing | signals |
| 107 | low | partly | Sign-out is silent and unconfirmed | money |
| 108 | low | partly | 'Notifications' preference row opens the OS permission detail, not notification preferences | money |
| 109 | low | partly | Home hides 'Add condition' exactly when a lock card is showing | lifecycle |
| 110 | low | partly | The analytics streak ignores the selected period and always shows the lifetime figure | time |
| 111 | low | confirmed | unlockedMet.relockAt: null, afterWindow.nextLockAt: null and the copy that renders them are unreachable | enforce |
| 112 | low | confirmed | Analytics reintroduces time-bank vocabulary the decision register cut | copy, promised |
| 113 | low | confirmed | WalkingSheet's treadmill camera-preview placeholder is unreachable dead UI | promised |
| 114 | low | confirmed | An overnight gym rule replays the arrival ceremony after midnight | signals |
| 115 | low | partly | Duplicate Account row in the detail settings screen | money |

### Refuted by verification (already handled, already planned for Phase 2, or the citation did not hold)

- Nothing ever calls ScreenTimePort.applyLock — the lock decision is display-only — applyLock genuinely has only the declaration (ports/ScreenTimePort.ts:7) and the fake (demo/fakes/ScreenTimeFake.ts:17), but plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md:36-37 already specifies exac
- No scheduler, relock timer or midnight job exists anywhere in the app — No scheduler exists in app-next, but P2-T04:10-17 specifies DeviceActivity schedules registered per window instance so the extension re-applies shields at window start and clears at window end "without the app running", 
- The app's clock is frozen while backgrounded and restored to a stale instant on relaunch — plans/rebuild/04-architecture.md:75 defines the ClockPort fake as a "scenario clock, adjustable in dev menu" with the real adapter being the system clock, and T03-domain-fake-runtime-dev-menu.md:32,38 specifies the adjus
- Gym arrival is credited with no 30-second confirmation when auto-detect fires — demo/gymProgress.ts:14-23 does credit on the first non-outside presence, but that presence is a dev-menu toggle in Phase 1 (FakeRuntime.ts `setPresence`), and P2-T05-signals-behind-ports.md:20-24 — cited by the finding i
- Editing a rule after meeting it today leaves the apps unlocked for the rest of the day — The behaviour described is what the plan specifies, not a defect: 01-product-model.md:163 "Once `met` is true for a day it stays true" and decision B2 (00-decisions.md:23) "a met rule unlocks the apps for the rest of the
- The stop-grace setting is stored, validated and displayed but read by no timing code — The wiring is already booked as Phase 2 work: plans/rebuild/phase-2-backend/P2-T05-...md:15 specifies the WalkingAdapter with "stop grace from `settingsStore`". Phase 1 is UI on fakes, and the setting exists, validates 3
- The walking lease can lapse with no warning and no explanation of why the apps re-locked — The lease warning is specified and scheduled for Phase 2 — plans/rebuild/phase-2-backend/P2-T09-notifications.md:13 "Walk-lease warning: 30 s before lease expiry during a walking session" — and the port contract already 
- Nothing reads or reacts to the device timezone — The plan already schedules exactly this: plans/rebuild/phase-2-backend/P2-T04-lock-policy-on-screen-time.md:36-37 requires re-registering "at midnight, and on timezone change", app-next/src/ports/README.md:15 books Clock
- A revoked Screen Time authorization has no re-request path and is never re-read — plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md:5-6 already specifies exactly the proposed fix — permissions rows read live statuses on foreground, Fix requests when notDetermined and calls Linking.openSe
- Boot hangs on the splash forever when the entitlement is unknown — no timeout, no copy, no retry — plans/rebuild/01-product-model.md:212-214 explicitly assigns the 3-second budget and the paywall retry to Phase 2 ("Phase 2 gives it a 3-second budget, then treats it as `none` with a retry on the paywall"), and 02-scree
- Trial-ending is entirely unhandled: no reminder is ever scheduled and no days-remaining is shown anywhere — plans/rebuild/phase-2-backend/P2-T09-notifications.md:10 already schedules the trial reminder for Phase 2 ("scheduled when the entitlement becomes `trial` with a known `renewsAt`"), and the Phase 1 ticket T07-trial-and-p
- No 'welcome back' / restored-state screen after a successful restore or reinstall — The plan already owns this screen: plans/rebuild/phase-2-backend/P2-T08-sync.md:11-13,22-23 specifies pull on sign-in and on fresh install with an existing identity, an "X5-style 'Welcome back' summary of restored rules"
- Sign-out and delete-account skip the documented teardown ordering — plans/rebuild/04-architecture.md:135 already schedules the teardown ordering law (Adapty → PostHog → auth provider last) for the Phase 2 Supabase adapter, and the port seams it needs already exist (app-next/src/ports/Ana
- Deleting the account leaves the active lock and shield in place with no stated rule — Deletion semantics are defined and shown: app-next/src/content/settings.ts:100-106 states the account and server record go, and conditions/progress/locked apps stay on the device — the five-point explanation 02-screen-in
- Pausing keeps the met row, so re-enabling is a one-tap bypass — A paused rule never locks, so there is nothing to bypass while paused, and re-enabling a rule that was genuinely met today restores exactly the unlock decisions B2/B6 mandate (00-decisions.md:26 B2/B6; app-next/src/domai
- A gym or treadmill condition always outranks a nearly-finished step goal in the unlock hint — plans/rebuild/01-product-model.md:167-168 states the law as "the smallest remaining effort, with immediate actions (arrive at gym, start walking) ranked first, then numeric remainders compared only within the same unit" 
- No test covers stacking, pausing, deleting or same-day double-met — Multi-rule domain tests exist: two-rule precedence at app-next/src/domain/__tests__/resolveLock.test.ts:6-22, pausing the met/state rule changing the decision at :42 and :78, and a seeded 4-rule property test with severa
- A window entirely inside the fall-back repeated hour is silently inactive for its second occurrence — The fold policy is already written, not emergent: app-next/src/domain/README.md:5 states 'DST gaps shift forward by the gap; repeated times use the first occurrence', and app-next/src/domain/__tests__/schedule.test.ts:38
- An all-day rule renders as an overnight window ending at 12 AM next day — The cited file app-next/src/features/onboarding/welcome/blockingSchedule.ts is absent; the real formatter is app-next/src/features/home/blockingSchedule.ts:9-20, and app-next/src/features/home/README.md:7 documents the b
- Legal copy promises local data survives sign-out and deletion — false once sync ships — legal.ts:1 already flags the text as a Phase 1 placeholder, and P2-T10-settings-account-wiring.md:17-19,24 schedules counsel-approved Terms and Privacy plus a release guardrail that fails on the placeholder marker, so th
- Sync has no conflict rule and no UI for a device that loses — P2-T08-sync.md:5-12 specifies the conflict rule the finding says is missing — server stores the latest by `updated_at` per row, pull merges by `updated_at` and never overwrites a newer local row, the device is authoritat
- Setup checklist ticks 'Progress saved to an account' although nothing is saved anywhere — Sync is a scheduled Phase 2 task with a full contract — plans/rebuild/phase-2-backend/P2-T08-sync.md:1-30 specifies the SyncAdapter, push/pull, and the sign-in restore flow, so "nothing is saved" is a not-built-yet claim
- 'Get ahead' before the window names only one of several conditions — beforeWindow does not use the hint reducer: resolveLock.ts:45 sets ruleId from the earliest window start today (starts[0]), and statusContent.ts:75 names that rule — deterministic, not arbitrary. The spec asks for exactl
- Denying the trial-reminder permission is never acknowledged — The spec deliberately makes both outcomes continue: plans/rebuild/02-screen-inventory.md:93 lists T3 states "notDetermined · granted · denied (both continue)" and defines T4 as a static three-row timeline, which is what 
- Rate and Share rows are note-only stubs on a shipping settings screen — The plan schedules exactly this work: plans/rebuild/phase-2-backend/P2-T10-settings-account-wiring.md:9 ports the expo-store-review policy and :12 wires "Share ExcerLock: native share sheet with the App Store URL". Phase

## 10. Inventories

The seven inventories the audit was built on (requirements catalog, three UI inventories, domain logic, old-app features, Phase 2 plan) are session artifacts; the durable facts are in this report. Regenerate them with the same workflow if needed.
