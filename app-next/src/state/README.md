# state

Persistent application state and selectors. No UI styling.

`enforcementStore` is the exception: it is deliberately not persisted. It owns the ephemeral enforcement
facts the runtime host publishes — `enforcementStatus` (the last `ApplyResult`, which Home renders as
"Blocking is not on"), `lastClaimAt` (the claim-on-open timestamp) and the retry token Home's Try again
action bumps. Nothing here survives a launch; the host republishes on its first apply.

`todayHistory` replaces today’s fixture completion with actual enabled schedules and RuleDays before streak/analytics selectors read it. Historical usage remains measurement data; missing usage is not fabricated.
