# T02 configuration evidence — 2026-09-10

Implemented root build-time allowlist, process-before-optional-local env resolution, aliases for existing
local names, tests/hosted-build isolation, release key validation, manual runtime 1 and native ON_LOAD
with 3000ms embedded fallback. Native config integration depends on T01 (no temporary stub committed).
Client/public keys are intentionally embedded; Sentry upload token and server credentials are not.
Runtime no longer reads EXPO_PUBLIC_RUNTIME. Preview/production refuse demo services until T10 real
runtime integration; this is an explicit unfinished integration gate, not a production-ready app.

24 focused tests passed (config, credential isolation, runtime selection, vendor probes). Tests first
caught missing config implementation and production-OTA-without-build-profile regression. New explicit
EXCERLOCK_ENV is pushed separately per EAS environment, conflicts with build profile fail, and unlabelled
NODE_ENV=production exports fail closed. Expo update does not inherit build.profile.env.

Live doctor succeeded for six vendors; `live-env.json` records only statuses and limits. This does NOT
prove native auth, public Adapty SDK key, StoreKit purchase/webhook attribution, event ingestion, Sentry
symbolication or Google configured-client login. CI job added for main, but remote credentials/job have
not been provisioned/run yet. EAS environment push not performed pending native config integration.

Full suite on imported baseline + T02: 134 passed / 2 failed suites, 545 passed / 2 failed tests.
Failures: conditions-tabs expects removed paused header; DayPicker expects absent Every day shortcut.
Not dismissed as passes; T07/T09 integration must reconcile current product behavior and tests.
Lint baseline has literal-color issues in TabBar/TimeRangeRow and WorkoutGoalScreen sync setState;
new T02 test import warnings fixed. Typecheck currently blocked only by pending ./config/native import.

References inspected:
- https://docs.expo.dev/versions/v57.0.0/config/app/ — manual runtime, ON_LOAD, fallback, privacy.
- https://docs.expo.dev/eas/environment-variables/ — explicit update environments, visibility.
- Installed eas-cli env:set/ env:push help/source — use env:set, not deprecated secret:push;
  upload token uses secret visibility, client config sensitive visibility; full dotfile never uploaded.

Raw local test output stays ignored in this evidence directory; no secrets in logs or evidence.
