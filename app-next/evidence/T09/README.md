# T09 — Home and main tabs

Home now composes the status hero, today’s active conditions, aggregate app-selection row, streak, and Add condition. Four mounted tabs retain local scroll state; Conditions/Analytics/Settings and the builder are placeholders owned by the next tasks. Gym/walking sheet actions are wired to temporary sheets until T13.

## Behavior and tests

- Every Home status is modeled, including permission/no-app overrides, no conditions, no schedule today, and all paused. Time and lease formatting use the scenario timezone.
- A single tab-level subscription bridges step/Health ports into RuleDays. Completion latches; paused or denied rules cannot gain fabricated progress. Signals are scoped to the scenario and calendar day. Loading a new scenario cannot reuse the old scenario’s count.
- The unlock hook emits one success feedback call on entering unlockedMet, not on initial mount or repeated updates. Its glyph crossfades and uses the pop spring; Reduce Motion omits scale.
- Today’s streak facts come from current rules and completion instead of an optimistic historical fixture.
- Local adapter metadata persists the scenario, clock and overrides independently of the eight product stores. Corrupt metadata cannot block launch. Cold restore preserves edited rules.
- Red logs cover missing status/progress modules, stale scenario counts, stale Health data across midnight, and context persistence. Final checks: 266 tests / 96 suites, typecheck, lint, Expo Doctor, dependency check, iOS export, and a cold native development-client launch.

## Native evidence

`home-states.mp4` and scenario-named PNG/AX JSON cover the status and activity variants. `home-live-unlock.mp4` records before-window → locked → met using the fake clock and steps. `home-tabs.mp4` covers the tab transitions and retained Home scroll. `m1-end-to-end.mp4` is the continuous fresh-install walking path through setup and Home.

Native checks require an actual screen heading after scenario navigation. The first capture exposed a Fast Refresh-retained runtime instance after the adapter interface changed; the final capture starts from a cold launch. iOS Intl produced narrow spaces in clock labels, now normalized. The loading boundary also keeps protected navigation stable while stores reset.

## Motion reference and choices

Reviewed the actual Otter OT01-M029 strip: the dashboard remains behind a receding sheet, with a dominant status region, then compact daily facts and persistent tabs. Used that hierarchy without the mascot or its unrelated metrics. Also reviewed main-home-v3 as a concept; discarded its obsolete minute-wallet semantics and dimensional artwork under the current decisions.

The hero remains mounted as its glyph changes, condition cards stagger in, bars fill, count/detail updates crossfade, and the tab indicator travels on the control spring. Tab scenes shift over the canvas; Reduce Motion fades. Sheet actions retain the underlying dashboard.

M1 Gemini and Johan review are deferred by the instruction to continue using the existing material. No reviewer pass or human approval is claimed.

Final native results: the continuous M1 journey passed through real rendered O01–O20, W1–W3, S1–S4, T1–T4, P, X1–X5, and Home, then changed fake steps to 5,000 and unlocked. The captured Home scroll coordinates for Locked apps (y=575) and Add condition (y=703) were identical before and after visiting all three other tabs. `unlock-strip.png` is extracted from the actual live-unlock recording. Cold relaunch verification is captured in `cold-restored-home.png`.

T14/T15 follow-up: review time-label wrapping at narrow widths and eliminate transient duplicate accessibility text during the existing keyed status/detail crossfades. The final typography/motion audit covers these shared components across all tabs.
