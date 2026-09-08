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
| Contact Info | Email Address | Yes | App Functionality | Email OTP sign-in through Supabase (`AuthPort.sendEmailCode`, `Session.email`); support reply address posted to `/v1/support` (`SupportPort`). Sign in with Apple may hand a relay address. |
| Health & Fitness | Health | Yes | App Functionality | Running and cycling minutes or distance read from HealthKit (`HealthPort.workoutsToday`) become `RuleDay.progress`, which syncs to the VPS as backup (`SyncPort.pushRuleDays`, P2-T08). |
| Health & Fitness | Fitness | Yes | App Functionality | Core Motion step totals and walking minutes (`StepsPort.stepsSince`, `WalkingPort.details`) become `RuleDay.progress`, synced the same way. |
| Identifiers | User ID | Yes | App Functionality, Analytics | One spine: Supabase uid = VPS `users.id` = Adapty `customer_user_id` = PostHog `distinct_id` (`domain/identity.ts`, `runtime/README.md`). |
| Identifiers | Device ID | Yes | Analytics, App Functionality | PostHog `$device_id` for flag bucketing (decision D8); Sentry installation id on crashes. |
| Purchases | Purchase History | Yes | App Functionality, Analytics | Adapty holds subscription state and transactions keyed by the uid; its webhook mirrors state to the VPS (`server/src/routes/adaptyWebhook.ts`); Adapty's PostHog integration emits the lifecycle events (D9). |
| Usage Data | Product Interaction | Yes | Analytics | PostHog screen views (fixed screen registry) and the eight ceremony events listed below. |
| Usage Data | Other Usage Data | Yes | App Functionality | Minutes of shielded-app use per day (`ScreenTimePort.observeUsage` → `HistoryDay.usageMinutes`) sync as `usage_days`. No app identities: the selection is an opaque token and never syncs (D5). |
| Diagnostics | Crash Data | No | App Functionality | Sentry with the ported scrub and `sendDefaultPii: false`; no `setUser` (flip to linked if P2-T07 adds it). |
| Diagnostics | Other Diagnostic Data | Yes | App Functionality | A support request carries app version and build, iOS version, device model, permission statuses, rule count and last enforcement result (`domain/supportDiagnostics.ts`). |
| Other Data | Other Data Types | Yes | App Functionality, Analytics | Rules (activity, goal, schedule) sync as backup (`SyncPort.pushRules`); onboarding answers `ageBand`, `occupation`, `improveFirst`, `mainReason` become PostHog person properties (P2-T07). |

For every row: **Used for tracking: No.**

HealthKit rule: values that come from HealthKit are used for app functionality only. They are never sent
to PostHog, Sentry or Adapty; the analytics privacy policy drops undeclared keys at the emit boundary.

## Data types deliberately **not** declared, and why

| Category / type | Reason |
| --- | --- |
| Contact Info / Name | The onboarding name stays in the on-device profile store; `SyncPort` pushes rules, rule days, earned unlocks and history only. |
| Location / Precise and Coarse | Gym coordinates, geofence presence and `GymVisit` rows never leave the device; P2-T08's type-level test forbids gym names and coordinates in payloads. PostHog GeoIP is off. `gym_unlock_tapped.distance` is metres to a saved gym, not a coordinate. |
| Search History | Gym search queries go from the device to Apple MapKit Local Search (`modules/expo-local-search`); ExcerLock's servers never receive them. |
| Photos or Videos | Treadmill framing frames are processed on the iPhone and never recorded or sent (`NSCameraUsageDescription` says so). |
| Diagnostics / Performance Data | Sentry tracing and profiling are off. |
| Financial Info, Contacts, Browsing History, Sensitive Info, User Content, Environment Scanning | Not touched by any port. |

## Analytics events the app emits (all Product Interaction)

`gym_unlock_confirmed`, `gym_unlock_lost`, `gym_unlock_tapped`, `treadmill_scan_failed`,
`treadmill_scan_started`, `treadmill_scan_verified`, `unlock_ceremony_done`, `unlock_screen_opened`, plus
screen views for onboarding steps, setup steps, `Home` and the paywall `P`.

P2-T07 replaces these with the registry events (`rule_met`, `apps_unlocked_rest_of_day`,
`walking_session_started/ended`, `setup_permission_result`, `sign_in_completed`, `onboarding_*`,
`paywall_viewed`, `purchase_started`, `notification_opened`, `support_request_submitted`,
`account_deleted`, `data_export_requested`). None of them changes a row above: they carry option ids,
buckets and booleans, never values, names or coordinates. When P2-T07 lands, the guardrail will list the
undeclared names; add them to the JSON.

## Two answers that depend on decisions still open

- **Analytics opt-out switch** (`fix-plan.md` open question 3, default: build it). If built, the label
  is unchanged (collection is still "Yes"); the App Store description may say analytics can be turned off.
- **"Export my data"** (same question). Emits `data_export_requested`; no new data type.
