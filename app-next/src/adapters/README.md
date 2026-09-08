# adapters

The vendor side of the ports. Each subdirectory implements one `ports/*Port.ts` interface against a
real service, and it is the only place in `src/` allowed to import that service's SDK.

The rule that makes this worth a directory: everything above a port sees the port. A screen never
learns which analytics vendor exists, whether one is configured, or whether the person opted out —
it calls `runtime.analytics.track(...)` and the adapter decides what that means. `createRuntime`
picks the adapter or the demo fake; a build with no keys keeps the fake, so a missing key is never a
crash and never a branch at a call site.

| Directory | Port | SDK |
|---|---|---|
| `analytics/` | `AnalyticsPort` | `posthog-react-native` |

Crash reporting is not a port: it has no product behaviour to fake and nothing calls it in a flow.
It lives in `src/observability` and is wired at the app entry and the root error boundary.
