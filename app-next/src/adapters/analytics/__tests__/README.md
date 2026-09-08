# __tests__

The shared `AnalyticsPort` contract lives in `ports/__tests__/analyticsContract.ts` and is invoked
from `contract.test.ts` here and from the fake's test in `demo/fakes/__tests__`. Everything else in
this directory is adapter-specific: what actually reaches PostHog.

`recordingClient.ts` is a `PostHogClientPort` that records instead of sending, so the SDK never runs
in a test. It carries no `.test` suffix and is not itself a suite.

`privacy.test.ts` also walks `src/` and fails when a call site names an event or a screen the
transport would silently drop — an empty funnel is the kind of instrumentation bug nobody notices.
