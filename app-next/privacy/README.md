# Privacy manifest and App Store disclosure source

`PrivacyInfo.xcprivacy` is the checked-in source. `plugins/withPrivacyManifest.js` copies it byte-for-byte to `ios/ExcerLock/PrivacyInfo.xcprivacy` during prebuild.

## Data that leaves the device

All declared types have `Tracking: false`; the app does not combine them with third-party data for advertising and does not require ATT.

| Apple data type | Linked | Purpose | Actual flow |
|---|---:|---|---|
| Product Interaction | Yes | Analytics | After analytics opt-in and canonical Supabase identity commitment, PostHog receives allow-listed semantic events/screens under `identify(userId)`. Adapty records paywall/product interactions. |
| Crash Data | No | App Functionality | Sentry crash-only reporting. `sendDefaultPii`, screenshots, view hierarchy, tracing, replay, failed-request capture and interaction tracing are disabled; the scrubber removes user/request/free-text fields. |
| Performance Data | No | App Functionality | Diagnostic runtime/device metadata needed to diagnose failures; automatic performance tracing is disabled. |
| Device ID | Yes | Analytics; App Functionality | PostHog registers its SDK device ID and then links opted-in analytics to the canonical account. SDK diagnostics/subscription functionality may use installation/device identifiers. |
| Purchase History | Yes | App Functionality | Adapty associates StoreKit product/entitlement state with its identified profile. |
| User ID | Yes | Analytics; App Functionality | The Supabase subject is the canonical account ID and is passed to PostHog `identify` and Adapty `identify`. |

## Data used locally but not declared as collected

Location, Health & Fitness, motion and step observations are used on-device for gym/walking verification. They are not sent as coordinates, routes, HealthKit samples, step counts, or workouts to PostHog: GeoIP is disabled and analytics keys matching address/latitude/longitude/user identifiers/free text are rejected. The server has no upload route for those samples. Apple defines “collected” as transmitted off-device for longer than necessary to service the request, so these permission-protected, local-only values are not nutrition-label collection types.

`walk_places` is a coarse user preference (`outside`, `treadmill`, both, or none), not location data. Analytics is opt-in. Purchase/trial/subscription lifecycle events are suppressed client-side to avoid duplicating authoritative Adapty events.

Required-reason APIs are declared for UserDefaults (`1C8F.1`, `CA92.1`), file timestamps (`C617.1`), system boot time (`35F9.1`) and disk space (`E174.1`). Run `python3 scripts/audit-privacy-manifest.py` after changes.
