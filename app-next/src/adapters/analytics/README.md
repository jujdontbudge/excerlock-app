# adapters/analytics

`AnalyticsPort` over PostHog. Callers pass a name and a property bag; everything below decides what
actually leaves the device.

## Files

| File | What it owns |
|---|---|
| `postHogAnalytics.ts` | The adapter. Consent, the registry check, and the identity rule. |
| `privacy.ts` | The transport boundary: which properties and which screen names may cross it. |
| `postHogOptions.ts` | The SDK policy, and the `app: excerlock` super property (D2). |
| `PostHogClientPort.ts` | The slice of the SDK the adapter uses, so tests never construct a `PostHog`. |
| `createAnalyticsAdapter.ts` | The wiring: reads the keys, builds the client, follows the settings switch. |
| `personProperties.ts` | The four onboarding answers that become person properties. |

## The three rules

**Consent first.** Every emit re-reads the "Share usage analytics" switch (`settings.shareAnalytics`,
default on). Off means nothing is captured, no screen is reported, no person is identified, and the
SDK itself is opted out so a queued event is never flushed later. The answer is read only once the
settings store has hydrated — the default is on, so answering before hydration would send the first
events of a session belonging to someone who had already opted out. `BootGate` holds the UI until
every store hydrates, so nothing is lost by waiting.

**Registry only.** An event `@excerlock/analytics-events` does not give the client is dropped, not
renamed and not sent. Its properties then cross `privacy.ts`, which applies two layers:

- the **name allowlist** (`transmittedProperties`) keeps only what the registry declares — a call
  site that passes a gym name, a coordinate or a locked-app selection sends nothing;
- the **value floor** (`enumProperties`) drops a declared-enum property carrying an undeclared
  value. `AnalyticsPort.track()` takes an untyped bag, so this is what stops a caught exception's
  message — a path, a gym name, a bundle id — reaching PostHog inside a `reason` property.

A `$screen` is checked the same way against `TRACKED_SCREENS`, so a route name or a screen title can
never arrive as a screen id.

**Identify only a real user.** Every session carries a user id, the anonymous placeholder included,
and `runtime/IdentityBridge` binds all of them. The adapter ignores the anonymous one. Identifying it
would give every anonymous install the same distinct id, merging them into one person, and it would
stop PostHog merging that install's own history into the Supabase id at sign-in — which is exactly
what `identify()` does for free when the SDK is still on its own anonymous id. `personProfiles:
'identified_only'` means the anonymous half of the funnel creates no person records at all.

Feature-flag bucketing stays on `$device_id` (D8): a mid-flow identify must never flip a variant.

## Keys

`EXPO_PUBLIC_POSTHOG_KEY` and `POSTHOG_HOST` live in `~/.excerlock/env` (or the EAS environment) and
reach the app through `app.config.ts` → `expo.extra.clientObservability`. Nothing is committed.
Without them `createAnalyticsAdapter` returns `null` and the runtime keeps the recording fake, whose
events show up in the dev event stream.

## Tests

`__tests__/contract.test.ts` runs one suite against both the fake and the adapter, so a caller can
rely on the same behaviour from either. The rest are adapter-specific: `privacy.test.ts` also walks
the app's own source and fails if a call site names an event or a screen the transport would drop.
