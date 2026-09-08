# Port contracts

Reusable contract suites live here without a `.test` suffix. Each fake and native adapter invokes the same suite from its own test file.

- `screenTimeContract.ts` — `describeScreenTimePort`.
- `analyticsContract.ts` — `describeAnalyticsPort`. Invoked by the demo fake and by the PostHog adapter.
