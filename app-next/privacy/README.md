# Privacy manifest (T01)

Source of truth: `PrivacyInfo.xcprivacy` in this directory. `plugins/withPrivacyManifest.js`
copies it to `ios/ExcerLock/PrivacyInfo.xcprivacy` on every prebuild (deterministic,
byte-for-byte).

Collected types (all `Tracking: false`, v1 shows no ATT prompt):

- Product Interaction → Analytics (PostHog taps/screens; Adapty paywall views)
- Crash Data + Performance Data → App Functionality (Sentry)
- Device ID → Analytics + App Functionality (PostHog/Sentry anonymous device scope)
- Purchase History → App Functionality (Adapty entitlements)
- User ID → App Functionality (Supabase auth subject; Adapty profile linkage)

T04 (Supabase/auth), T05 (Adapty/paywall) and T06 (PostHog/Sentry) refine
linkage/purposes against actual SDK calls; T01 guarantees the manifest is
non-empty and the required-reason APIs (UserDefaults CA92.1, file timestamps
C617.1, system boot time 35F9.1, disk space E174.1) are declared.
