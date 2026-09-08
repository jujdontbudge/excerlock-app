# App Privacy label — answers derived from what the app collects

Source of truth: `app-next/release/app-privacy.json`. `guardrails/release/privacy-manifest.test.ts`
checks that every code path it cites exists and that every `analytics.track('…')` event in the app is
listed there. Change the JSON first, then this page. The Xcode privacy manifest (`PrivacyInfo.xcprivacy`,
owned by P2-T07) must declare the same types.

Filed on App Store Connect record `6787265352` (`asc web` → App Privacy). Apple's definition of
"collected": transmitted off the device in a way that lasts beyond servicing the request. Data that is
processed on the iPhone and never leaves it is not collected.

## Top-level answers

| Question | Answer |
| --- | --- |
| Do you or your third-party partners collect data from this app? | **Yes** |
| Is data used to track users across apps and websites? | **No** — no AppTrackingTransparency prompt, no IDFA, no ad SDK |

## Data types to declare

| Category | Type | Linked to user | Purposes | Why (evidence) |
| --- | --- | --- | --- | --- |
| Contact Info | Email Address | Yes | App Functionality | Email OTP sign-in through Supabase (`AuthPort.sendEmailCode`, `Session.email`); support reply address posted to `/v1/support` (`SupportPort`). Sign in with Apple may hand a relay address. The address never reaches PostHog: `sign_in_completed` carries the provider only. |
| Health & Fitness | Health | Yes | App Functionality | Running and cycling minutes or distance read from HealthKit (`HealthPort.workoutsToday`) become `RuleDay.progress`, which syncs to the VPS as backup (`SyncPort.pushRuleDays`, P2-T08). |
| Health & Fitness | Fitness | Yes | App Functionality | Core Motion step totals and walking minutes (`StepsPort.stepsSince`, `WalkingPort.details`) become `RuleDay.progress`, synced the same way. |
| Identifiers | User ID | Yes | App Functionality, Analytics | One spine: Supabase uid = VPS `users.id` = Adapty `customer_user_id` = PostHog `distinct_id` (`domain/identity.ts`, `runtime/README.md`). |
| Identifiers | Device ID | Yes | Analytics, App Functionality | PostHog `$device_id` for flag bucketing (decision D8), linked to the user at sign-in; `personProfiles` is `identified_only`, so an install that never signs in mints no person record. Sentry receives no device or installation id. |
| Purchases | Purchase History | Yes | App Functionality, Analytics | Adapty holds subscription state and transactions keyed by the uid; its webhook mirrors state to the VPS (`server/src/routes/adaptyWebhook.ts`); Adapty's PostHog integration emits the lifecycle events (D9). |
| Usage Data | Product Interaction | Yes | Analytics | PostHog screen views (the fixed `TrackedScreen` list) and the events listed below. Every payload passes a per-event allowlist of property names and then a closed value list for the enum properties, so an activity kind gets through and free text does not. Settings > Share usage analytics turns all of it off. |
| Usage Data | Other Usage Data | Yes | App Functionality | Minutes of shielded-app use per day (`ScreenTimePort.observeUsage` → `HistoryDay.usageMinutes`) sync as `usage_days`. No app identities: the selection is an opaque token and never syncs (D5). |
| Diagnostics | Crash Data | No | App Functionality | Sentry, native crashes plus errors caught by the error boundaries. Nothing calls `Sentry.setUser`, `sendDefaultPii` is false, and `beforeSend` deletes `event.user`, tags, extra, request, the exception message, breadcrumb data and source-line context. |
| Diagnostics | Other Diagnostic Data | Yes | App Functionality | A support request carries app version and build, iOS version, device model, permission statuses, rule count and last enforcement result (`domain/supportDiagnostics.ts`). |
| Other Data | Other Data Types | Yes | App Functionality, Analytics | Rules (activity, goal, schedule) sync as backup (`SyncPort.pushRules`); onboarding answers `ageBand`, `occupation`, `improveFirst`, `mainReason` become PostHog person properties on the identified person, sent only when the profile changes and only as short values from the closed option lists. The analytics switch suppresses them too. |

For every row: **Used for tracking: No.**

HealthKit rule: values that come from HealthKit are used for app functionality only. They are never sent
to PostHog, Sentry or Adapty; the analytics privacy policy drops undeclared keys at the emit boundary.

## Data types deliberately **not** declared, and why

| Category / type | Reason |
| --- | --- |
| Contact Info / Name | The onboarding name stays in the on-device profile store; `SyncPort` pushes rules, rule days, earned unlocks and history only. |
| Location / Precise and Coarse | Gym coordinates, geofence presence and `GymVisit` rows never leave the device; P2-T08's type-level test forbids gym names and coordinates in payloads. PostHog runs with `disableGeoip: true`, so no city or region is derived from the request IP. `gym_unlock_tapped` transmits no location value at all, not even a distance: its registry spec declares the preview flag only, and `safeProperties` drops every key the spec does not name. |
| Search History | Gym search queries go from the device to Apple MapKit Local Search (`modules/expo-local-search`); ExcerLock's servers never receive them. |
| Photos or Videos | Treadmill framing frames are processed on the iPhone and never recorded or sent (`NSCameraUsageDescription` says so). |
| Diagnostics / Performance Data | Tracing, profiling, app-start and native-frame tracking, stall tracking and session replay are all off: `tracesSampleRate` and both replay sample rates are 0, and no transaction survives the scrub. |
| Financial Info, Contacts, Browsing History, Sensitive Info, User Content, Environment Scanning | Not touched by any port. |

## Analytics events the app emits (all Product Interaction)

The allowlist is `analyticsEvents` in the JSON, which is exactly the events
`packages/analytics-events` marks owner `client`; the adapter drops any other name before it reaches
the wire, so a lane that adds a call site does not have to touch the file.

`apps_unlocked_rest_of_day`, `condition_created`, `condition_deleted`, `condition_edited`,
`data_export_requested`, `diagnostics_shared`, `gym_unlock_confirmed`, `gym_unlock_lost`,
`gym_unlock_tapped`, `notification_opened`, `onboarding_answer`, `onboarding_screen_viewed`,
`paywall_viewed`, `purchase_started`, `rating_prompt_shown`, `rule_met`, `setup_permission_result`,
`shield_screen_opened`, `shields_applied`, `shields_lifted`, `sign_in_completed`,
`treadmill_scan_failed`, `treadmill_scan_started`, `treadmill_scan_verified`, `unlock_ceremony_done`,
`unlock_screen_opened`, `walking_session_ended`, `walking_session_started`, plus screen views for the
fixed `TrackedScreen` list.

None of them changes a row above: they carry option ids, buckets and booleans, never values, names or
coordinates. Adapty's PostHog integration owns the subscription lifecycle events (decision D9); the
client emits `paywall_viewed` and `purchase_started` only.

## Two answers that were open when this page was written

- **Analytics opt-out switch** — built. Settings > Share usage analytics (`settingsStore.shareAnalytics`,
  `PreferencesPanel.tsx`) is read before every capture, screen view and identify, and it opts the SDK out.
  The label is unchanged: collection is still "Yes", and the App Store description may say it can be
  turned off.
- **"Export my data"** — built. It emits `data_export_requested` and adds no data type.
