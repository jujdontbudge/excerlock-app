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

## Root integrated configuration — 2026-09-10

T01 now integrated, with primary app.json preserved (native config owns complete plugin list).
Independent primary npm install after unlinking ONLY node_modules symlinks: original checkout untouched.
Supabase2.116 explicitly declared; tsx4.23.1 declared for config/scripts. Generator patch applied by root
postinstall. npm reports43 audit findings (40moderate/3high); not force-upgraded, requires T13 dependency triage.

Actual Expo CLI uncovered two defects hidden by typecheck/Jest: imported TS modules need tsx/cjs registration
(official https://docs.expo.dev/workflow/configuration/ and https://docs.expo.dev/guides/typescript/; verified
installed @expo/require-utils loader), and EAS23.2 allows string buildNumber only under build.production.ios,
not the common profile. Both fixed. Actual-loader subprocess smoke now runs in CI with synthetic values,
checks no private upload token exported, and rejects conflicting environments. 32focused Jest tests pass;
actual config smoke2pass; primary whole typecheck0; dynamic preview prebuild+prebuild-only checks pass.

Under the app operations lock, six sanitized service probes passed again, all10allowlisted variables were
uploaded to EACH EAS development/preview/production environment, and the GitHub production environment
was created with6secrets+4public variables for the existing CI job. No entire dotfile upload, no credential
values logged. Name-only GitHub readback passed; EAS preview name readback separately checked. Initial
attempt failed before any upload on invalid EAS schema; retry completed. Logs are bounded service/setup
evidence, NOT device activation, purchase/auth success, or completed remote CI.

No release build, main push, remote CI execution, TestFlight upload or production code deployment occurred.
