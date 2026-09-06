# T03 — Domain and local runtime

Implemented the normative rule types, timezone-aware windows, lock precedence, latching progress, validation, hints, labels, streaks and reclaimed-time math. Domain branch coverage is 100% (domain-coverage.log). Eight validating AsyncStorage/Zustand stores use excerlock-next.*.v1 keys. Eleven typed ports have local fakes; no product network/native adapters are active.

24 scenarios pass schema and rendered-router reachability tests. All 24 also loaded on the headless simulator; each named PNG has an accessibility-tree JSON beside it. scenario-loader.mp4 records loading the walking fixture through the dev menu and opening its boot destination. T03 destinations deliberately use a temporary StagePreview: actual onboarding, paywall and Home screens arrive in T04–T09. No finished-screen claim is made for these placeholders.

123 tests across 60 suites pass, as do typecheck, lint, the Metro exclusion check, Expo install check, Doctor 21/21 and iOS export. Native build/launch logs are local. Runtime integration verifies a clock advance across 9 AM changes beforeWindow to locked. Ports tests exercise prompt denial, picker selection, walking phases, gym arrival, cancellation, errors and email verification.

The compiled native app exposed a hook-order crash from calling bound Zustand hooks without use-prefixed names. Import aliases and a lint guard fix it; native repeated clock renders verified. The universal pitfall ledger records this and the RNTL 14 async router-handle issue.

Gemini remains deferred by user instruction. The old app/server/packages/mock directories remain unchanged.
