# ExcerLock: minimal auth and tracking

Research date: **2026-10-26**. Read-only inspection of `/tmp/excer-ref`, commit `d330842df00b2e7df86e1a882f93df5fc14fa6cc` (Oct 22), plus live primary-source documentation. No repository, production service, dashboard or configuration was changed. The Oct 24 incident is supplied context, not independently reconstructed here. Recommendations below describe the rebuild, not current deployed behavior.

**Recommendation:** let people buy and use ExcerLock without signing in. Retain one persisted Supabase guest UID as the technical identity; offer Apple and email sign-in for recovery and optional backup. Upgrade new identities in place. Treat existing-account recovery as an explicit account switch with purchase reconciliation. Track a small, privacy-safe journey in PostHog, diagnostic failures in Sentry, and requests/webhooks in structured API logs. Neither analytics availability nor sign-in should determine whether an on-device purchase unlocks the app.

## 1. Supabase and native Apple authentication

### Guest accounts and same-UID upgrades

`signInAnonymously()` creates a real Auth user, session and UID. It is different from using the public `anon`/publishable key. Guest users use the `authenticated` database role; RLS must check `is_anonymous` where permanent-account privileges differ. Restore the existing session before considering guest creation. Guests cannot recover the same account after losing the session unless they have linked a login method. Anonymous users consume database/auth resources; protect creation against abuse and do not blindly delete old guests that still own subscriptions. [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

For a **new Apple identity**, retain the guest session and call:

```ts
const oldUid = session.user.id;
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'apple',
  token: appleCredential.identityToken,
  nonce: rawNonce,
});
// Handle error first. Require data.user.id === oldUid before committing.
```

Enable manual identity linking in Supabase. Native ID-token linking is supported; a browser redirect is unnecessary. `linkIdentity` adds an identity to the current user. `signInWithIdToken` authenticates the identity's account and can return another UID; it is the returning-user operation, not a replacement for guest conversion. The SDK saves the returned session. [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [auth-js implementation](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts).

For a **new email identity**, keep the guest session throughout:

```ts
await supabase.auth.updateUser({ email }); // inspect error
await supabase.auth.verifyOtp({
  email,
  token: userEnteredCode,
  type: 'email_change',
}); // inspect error; confirm same UID and verified permanent user
```

Use the email-change template containing the OTP; do not add a password for a passwordless product. Persist only challenge metadata needed to resume, never the OTP. Match verification type to the initiating operation: email conversion uses `email_change`; ordinary `signInWithOtp` uses `email`. A successful request to send a code does not itself prove address ownership. [Anonymous conversion](https://supabase.com/docs/guides/auth/auth-anonymous#convert-an-anonymous-user-to-a-permanent-user), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

**Configuration caveat:** the reference [ADR 0086](/tmp/excer-ref/docs/adr/0086-verified-account-recovery-and-checkout-connection.md) reports `mailer_autoconfirm: true` in the earlier production investigation, which can make conversion complete without an OTP being sent. Its deliberate workaround uses `signInWithOtp({shouldCreateUser:true})`, selecting/creating a different account. The current adapter still follows that workaround (`SupabaseAuthAdapter.ts:593–632`). For the rebuild, require actual email confirmation and verify the conversion configuration in a nonproduction environment before offering this same-UID email flow. This research did not re-read live Supabase settings. Do not wait indefinitely for a code the project is configured not to send.

### Existing Apple/email identity: errors and recovery

| Situation | Expected signal | Required behavior |
|---|---|---|
| Apple identity already belongs to another user | `identity_already_exists`; current Auth source returns HTTP 422 | Keep guest state; offer sign-in to the existing account. Linking does not merge the two users. |
| Apple identity already linked to this same user | Current source can also return `identity_already_exists` | Inspect verified identities/session before treating this as another account. |
| Requested email already belongs to another user | `email_exists`; current `updateUser` server path returns HTTP 422 | Offer an OTP sign-in to that account. Do not repeatedly attempt conversion. |
| Linked provider would introduce a duplicate primary email | Current linking source also has an `email_exists` path | Handle as a specific identity/email conflict, not a network retry. |
| Linking disabled | `manual_linking_disabled` | Configuration failure; do not create another guest or silently change accounts. |
| General `conflict`, 429, expired OTP, network error | Concurrency/rate limit/verification/transport failure | Back off or request a new code as appropriate. None proves another account exists. |

Use structured `error.code` and status, not message substring matching. In particular, the reference `emailFlow.ts:43–57` treats **every 409/422 or message containing “already”** as a link conflict; that can misclassify unrelated failures. `user_already_exists` is another documented registration error, but is not the expected current `updateUser` email-conflict code. Exact behavior can vary with hosted Auth version, confirmation settings and anti-enumeration behavior; the docs' general error table is not an endpoint-by-endpoint contract. [Error codes](https://supabase.com/docs/guides/auth/debugging/error-codes), [official identity implementation](https://github.com/supabase/auth/blob/master/internal/api/identity.go), [official email update implementation](https://github.com/supabase/auth/blob/master/internal/api/user.go).

**Recommended conflict pattern:** preserve the guest's local progress and pending purchase; authenticate the existing Apple identity once with `signInWithIdToken`, or email with `signInWithOtp({email,options:{shouldCreateUser:false}})` then `verifyOtp({email,token,type:'email'})`. Adopt the UID actually verified. Do not reject a valid OTP because its UID differs, or retry a consumed OTP/token. Before switching, retain server-verifiable proof of guest ownership and an opaque purchase recovery reference. Reconcile the purchase to the destination through Adapty/StoreKit and a backend transaction-ownership check; do not copy an entitlement boolean. A migration must authenticate both sides and be idempotent. Never permit reassignment based only on two supplied UUIDs or matching email strings. Supabase leaves application-data conflict resolution to the app. [Conflict guidance](https://supabase.com/docs/guides/auth/auth-anonymous#resolving-identity-conflicts).

Automatic OAuth linking of matching verified email identities may select an existing account; Apple Hide My Email can instead yield a different address. Consequently, email equality is neither a sufficient migration authorization nor a reliable cross-provider join. [Automatic linking](https://supabase.com/docs/guides/auth/auth-identity-linking#automatic-linking).

### React Native sessions and relaunches

Use one Supabase client with a durable storage adapter, `persistSession:true`, `autoRefreshToken:true`, `detectSessionInUrl:false`, and `processLock`. Supabase's RN example uses AsyncStorage; this app already uses chunked SecureStore storage. Retain secure, atomic persistence rather than replacing it merely to resemble the example. Install one AppState listener: call `startAutoRefresh()` while active and `stopAutoRefresh()` otherwise; handle the initial active state and remove the listener at disposal. [RN quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native), [refresh lifecycle](https://supabase.com/docs/reference/javascript/auth-startautorefresh).

On boot, distinguish **session absent**, **temporarily inaccessible storage**, **refresh/network failure**, and **revoked session**. Only confirmed absence creates a guest. A locked Keychain, timeout or corrupt read must not silently replace a paying user's UID. The reference has relevant protections in `identity/lib/secureStorage.ts` and `protectedSessionStorage.ts`; its AppState handler retries provisional boot but does not explicitly implement foreground/background refresh start/stop. Refreshing a token must not reset analytics, onboarding or Adapty identity.

Onboarding progress is separate durable local state: await hydration before routing; persist current generic step, flow version and completion checkpoints; migrate renamed steps; never interpret missing auth or unknown entitlement as “start quiz again.” The reference `onboardingStore.ts` defaults invalid/missing steps to `O01`, and `createPersistedStore.ts` validates fields independently. These are plausible reset mechanisms, not proof of the reported user's cause. Record a bounded resume/reset reason and persistence failure; never send quiz answers.

### Native Sign in with Apple and `ERR_REQUEST_UNKNOWN`

1. Check `AppleAuthentication.isAvailableAsync()`, present a native Apple button in an active foreground window, and allow one request at a time.
2. Generate a fresh cryptographically random raw nonce. Compute SHA-256 hex; pass the **hash to Apple** in `signInAsync({nonce:hashedNonce,requestedScopes:[EMAIL]})`, and the **raw nonce to Supabase** with the returned ID token. Supabase hashes and compares it. Do not disable nonce checking.
3. Link for guest conversion; sign in for existing-account recovery. Treat nullable email/name fields as normal on subsequent authorizations; do not require a fresh name/email response.
4. Treat `ERR_REQUEST_CANCELED` as cancellation. For `ERR_REQUEST_UNKNOWN`, retain current state, show retry/email, and capture a sanitized stage/code, OS/build and presentation-state diagnostic. Do not automatically sign out, create a guest or retry the Apple sheet.

[Supabase Apple guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple), [nonce verification source](https://github.com/supabase/auth/blob/master/internal/api/token_oidc.go), [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/).

“Unknown” does not diagnose a nonce fault, entitlement problem or Apple outage. Check the signed build's Sign in with Apple capability, bundle ID/provider audience, provisioning, Apple account availability and active presentation anchor on a physical device. The reference already hashes correctly and patches the native window anchor (`app-next/patches/expo-apple-authentication+57.0.2.patch`); that patch's presence does not establish that the failing binary contained it or that it fixes this error.

### Deletion and revocation

Supabase session revocation and Apple authorization revocation are separate. On Apple sign-in, securely send the short-lived authorization code to the backend, validate its association with the authenticated user, exchange it at Apple for provider tokens, and encrypt the provider refresh token for later revocation. Apple `/auth/revoke` requires an **Apple access/refresh token**, not the Supabase refresh token or Apple ID JWT. Keep Apple signing keys/client secrets on the server. [Apple token revocation](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens), [TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

On deletion, tombstone API access, durably enqueue processor erasure and Apple revocation, revoke Apple authorization while credentials remain available, then delete the Supabase Auth user server-side and erase associated records. Revoke refresh sessions; already issued Supabase JWTs can remain valid until expiry, so the API must also enforce the tombstone. `auth.signOut()` alone is not account deletion. [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

If legacy accounts lack Apple tokens/codes, still fulfill deletion; TN3194 provides a manual revocation fallback. Do not make inability to complete another Apple login a permanent deletion blocker. Observe credential revocation and clear the local authenticated session. Explain that deleting ExcerLock's account does not cancel the App Store subscription; provide subscription management. Guest accounts also need an in-app deletion option. [Apple deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

**Reference gap:** `providerApple.ts` returns the authorization code, but no Apple token exchange/revoke path was found in the inspected identity/deletion flow. The server erasure gateway covers Adapty, PostHog and Supabase, not Apple. Do not assume Supabase native ID-token login stores an Apple refresh token or revokes Apple authorization on `deleteUser`; the docs do not promise that.

## 2. Does ExcerLock need visible accounts?

**No, for its current core function.** Conditions and Screen Time enforcement are local. A purchase requires the App Store account, not an ExcerLock login. Optional backup/recovery can justify an optional account; identity plumbing, analytics, email capture and webhook matching do not themselves make login necessary.

Apple 5.1.1(v) calls for use without login when significant account-based features are absent, and deletion when account creation exists. Guideline 4.8 concerns equivalent privacy-preserving login options when third-party/social login is offered; it does not require an account system. Apple's current wording is broader than “always add Apple”: an equivalent service must meet its privacy conditions, and exclusively first-party login has an exception. For this iOS app, optional native Apple plus email OTP is a simple choice; removing Google reduces implementation scope. App Review's determination of “significant” remains discretionary. [Guidelines 5.1.1(v) and 4.8](https://developer.apple.com/app-store/review/guidelines/).

| Comparable app | Primary-source evidence | What it establishes / leaves open |
|---|---|---|
| Opal | [Apple trial flow](https://opalapp.com/help/how-your-free-trial-with-apple-works), [restore help](https://opalapp.com/help/i-cant-restore-my-subscription-ios) | Offers account creation before trial and account-based recovery. The trial article says “option”; it does not prove every current onboarding cohort requires login. |
| one sec | [Privacy](https://one-sec.app/privacy/), [product FAQ](https://one-sec.app/) | Data stays offline by default; optional services include iCloud sync; accounts support use across devices. These pages do not conclusively establish whether every current iOS checkout is skippable. |
| ScreenZen | [Terms, effective Oct 23](https://screenzen.co/policies/terms-of-service) | Explicitly says account creation may be optional and settings stay on-device after access ends. This is policy evidence, not an observed walkthrough of every build. |
| Brick | [iPhone setup](https://support.getbrick.com/en/articles/10360513), [Why Accounts?](https://getbrick.com/pages/why-accounts) | Current setup asks for an account email; its history says accounts were originally absent. Hardware/account features are a different product justification. |

There is no uniform competitor rule. Recommend a clear **Continue without account** path, Restore Purchases on paywall/settings, and a dismissible **Save your account** offer after successful purchase or in Settings. Offer returning-user sign-in from Welcome. Do not force a post-trial identity change to reach Home. Promise “backup” only when a real backup exists: login alone does not back up local Conditions, and Screen Time permissions/app selections may require setup again on a new device. Keep health, location and Screen Time data out of the API; any future backup needs its own constrained design.

## 3. One identity and exact SDK call order

Use the Supabase UID `U` for API JWT subject, Adapty `customer_user_id`, PostHog `distinct_id`, and Sentry `user.id`. Store Adapty's own profile ID and transaction references as vendor identifiers, not additional app identities. Never use email, IDFA, a shared “guest” string, or the Apple subject as the app-wide ID.

**Important distinction:** a Supabase anonymous user identified as `U` is already an **identified PostHog person**. PostHog's own initial anonymous device ID is different. A normal frontend `identify(U)` links preceding anonymous events using `$anon_distinct_id`; backend capture with `distinct_id:U` alone does not perform that browser/mobile anonymous join. Let the SDK generate `$identify`; do not manufacture `$anon_distinct_id` on ordinary events. [PostHog ingestion](https://posthog.com/docs/how-posthog-works/ingestion-pipeline).

PostHog refuses ordinary identify/alias merges that reuse an ID already identified as another person; the event may ingest while the merge fails with an ingestion warning. `identify(U); identify(V)` is not a reliable account-merge strategy. Reset on a real account switch, then identify `V`. Keep an authenticated backend migration map for support/history queries across `U→V`; do not automatically alias established people. A deliberate historical merge is a separate, reviewed operation, not launch logic. [Identity restrictions](https://posthog.com/docs/product-analytics/identify).

### Launch

1. Hydrate consent/preferences, onboarding and purchase recovery state. Initialize Sentry with release/build/OTA metadata, strict scrubbing and `sendDefaultPii:false`. Initialize one PostHog instance; await `ready()`; apply `optIn()` or `optOut()` from the persisted choice. Never transiently opt in before reading a saved opt-out.
2. On a first run with analytics enabled, emit `app_opened` under PostHog's anonymous ID. With a persisted identified SDK ID, hold the launch event until the saved Supabase identity is resolved, retaining its original occurrence time; otherwise a stale SDK ID could receive another account's event. Neither path awaits API provisioning. Do not call every first-observed launch an installation.
3. Create one Supabase client, subscribe once to auth changes, restore `getSession()`. Only after a successful empty storage/session result call `signInAnonymously()`. Resolve `U`; keep refresh/network failures recoverable. Schedule follow-up work outside auth callback locks.
4. If enabled, `posthog.identify(U)` and emit any held launch event; always set permitted diagnostic identity with `Sentry.setUser({id:U})`. On a restored PostHog identity that disagrees with the verified session, reset before identifying. Do not reset on ordinary relaunch/token refresh.
5. `await adapty.activate(publicSdkKey,{customerUserId:U})`. Activation happens once per process. If already activated without a CUID, `await adapty.identify(U)` before product/purchase calls. Initialize analytics first, await activation/identify, then bind the integration identifier to the correct profile. [Adapty call order](https://adapty.io/docs/react-native-sdk-call-order).
6. If permitted by analytics consent, `await adapty.setIntegrationIdentifier('posthog_distinct_user_id',U)`. Fetch current profile/access level and fresh paywall/products. Integration attachment failure is diagnostic/retryable and must not block StoreKit purchase. Do not bind a vendor analytics integration for an opted-out user. [Adapty PostHog integration](https://adapty.io/docs/posthog).
7. Upsert the API user using the JWT, independently and idempotently; the server derives `U` from verified claims. Render persisted progress and verified/cached entitlement. API availability, analytics flags and billing readiness are separate states. `unknown` is not `unpaid`.

### Sign-in / link

1. Record `auth_started` and a safe breadcrumb; single-flight the operation and block purchase calls during identity transition.
2. Guest conversion: native Apple `linkIdentity` or email `updateUser → verifyOtp(email_change)`; confirm same `U`. Keep local progress, Adapty CUID and PostHog identity. Update `auth_state`; emit `auth_completed`. No SDK logout/reset is needed for a same-UID upgrade.
3. Existing-account recovery: authenticate once to obtain verified `V`; keep old state until success. Resolve pending purchases using the authorized migration/recovery process in section 1. Then archive/switch local account state, reset PostHog, identify `V`, clear old Sentry breadcrumbs/user, set Sentry user `V`, and `await adapty.identify(V)`. Refetch profile/paywalls/products, rebind permitted PostHog integration, upsert API user `V`, then enable checkout. `identify` can select an existing Adapty profile; it is not a promise of subscription transfer. [Adapty identification](https://adapty.io/docs/react-native-identifying-users).
4. If store ownership cannot yet be reconciled, keep a purchase recovery state and Retry/Restore action. Never show a second checkout as the remedy for a known completed purchase. Authentication success and purchase recovery success are separate events.

### Sign-out

1. Freeze identity transitions/purchases and persist any unfinished transaction recovery. Emit `auth_signed_out` under `U` if consent permits; bound any flush attempt so it cannot block sign-out.
2. `await supabase.auth.signOut({scope:'local'})` for “this device”; offer global sign-out separately if desired. If it fails, report retryable failure rather than claiming complete sign-out while keeping the old session.
3. `await adapty.logout()`; quarantine old account data and cached entitlement. On failure keep billing disabled until the SDK identity is reconciled. Adapty logout creates a new anonymous vendor profile. [Profile behavior](https://adapty.io/docs/how-profiles-work).
4. Clear Sentry scope/breadcrumbs and `setUser(null)`; stop replay; flush old events under their original identity when possible, then drop remaining old queues before `posthog.reset()`. The inspected RN 4.61 boundary deliberately clears persisted event/AI/log queues because reset alone preserves them. Never relabel old events as the next user.
5. Preserve device-level analytics choice. For continued guest use, `signInAnonymously()` once → obtain fresh `G` → permitted `posthog.identify(G)` → `Sentry.setUser({id:G})` → `await adapty.identify(G)` → rebind integration/refetch products. Signing out neither cancels an Apple subscription nor changes the App Store account; same-store restoration can expose paid access again according to Adapty policy.

### Delete account / guest data

1. Stop replay and new capture; freeze checkout. Submit one authenticated idempotent deletion request while the session still exists. Backend tombstones the UID immediately, stores a durable deletion job, and carries out Apple revocation plus all processor/local erasure. Do not emit a new PostHog “deletion completed” event after deleting that person.
2. After durable server acceptance, clear Supabase local credentials, `adapty.logout()`, clear Sentry user/scope and queued identity-bearing diagnostics, discard PostHog queues and reset. Delete onboarding, account archives, pending challenges and local recovery identifiers belonging to the deleted user. Server retries processor deletion without the client remaining open.
3. Erase all mapped legacy IDs and associated events/replays, not just the current UID; include Sentry data subject handling and operational-log retention. A reset clears local identity; it does not erase vendor-held history. Do not auto-create another guest until the person deliberately continues.

### Why a trial user can have zero client events

Confirmed code findings in `/tmp/excer-ref/app-next/src/packages/telemetry`:

- `PostHogAnalyticsAdapter.ts:35–40`: `defaultOptIn:false`, lifecycle capture/replay disabled, person profiles `identified_only`. **But** `preferences/settingsStore.ts:20` defaults `analyticsEnabled:true`, and `identify()` explicitly opts in at line 134. Therefore `defaultOptIn:false` alone does not prove this user's consent was off.
- Lines 67–79 and 125–143 require enabled analytics, ready canonical identity, matching generation and committed identify. A trial can exist independently in Adapty while these client gates drop every event.
- `identityCoordinator.ts` currently awaits API `PUT /v1/user`, analytics identify, subscription identify and integration attachment before readiness; errors often return silently. Early API failure or closing the app during this chain can leave an Auth/API user with no PostHog timeline. Screens queue only with consent on; ordinary `track()` calls before readiness are dropped.
- The [Oct 21 audit](/tmp/excer-ref/docs/audits/payment-failure-2026-10-21/README.md) establishes an Oct 13 prefix filter suppressing checkout/restore events. The reference now uses the shared owner allow-list; historical missing events cannot be recovered by changing it. A purchase-prefix filter explains missing checkout signals, not necessarily zero events of every kind.
- SDK/network blockers, offline queue not flushed before deletion/uninstall, wrong project/region, ingestion limits or a different distinct ID remain possibilities. Search the verified UID, Adapty integration ID and historical IDs before concluding nothing happened. No live PostHog query or user-device inspection was performed here.

`identified_only` controls person profiles, not whether anonymous events are captured. Preserve opt-out; allow consented early events before API readiness and retain original occurrence timestamps when replaying a bounded queue. Display incomplete coverage honestly. [PostHog RN opt-in/persistence](https://posthog.com/docs/libraries/react-native), [anonymous versus identified events](https://posthog.com/docs/data/anonymous-vs-identified-events).

## 4. Tracking without sensitive activity details

The achievable promise is **every instrumented step that is delivered for a consenting user**, plus essential operational payment/auth records. It cannot be every action of every person: opt-out, offline loss, crashes, quotas and uninstall produce gaps. Do not bypass analytics opt-out by routing behavioral events through the API or vendor integration. Essential billing/security records have a separate operational purpose and retention policy.

**Vendor-forwarding caveat:** `posthog.optOut()` only controls the client SDK; it does not retract a previously attached Adapty integration ID or stop an independently configured server integration. Adapty's integration docs do not establish a per-user consent switch. For a single enforceable analytics choice, the rebuild should forward subscription events from its webhook processor only when the user's analytics choice permits it, with direct vendor forwarding disabled as part of implementation. Store that minimal choice server-side and reconcile revocations; retain billing records separately. No integration setting was changed here.

### Small event contract

Every client event: `schema_version`, random `event_id`, original `occurred_at`, SDK session ID, app version/build, runtime/OTA update, app environment, `flow_version`, `auth_state=guest|permanent`. Distinct ID is the SDK identity, not a redundant arbitrary user-ID property. Add verified `store_environment=production|sandbox|unknown` where relevant; app production environment does not establish StoreKit production. Correlate operations with random `attempt_id`, not a receipt/transaction ID. Record durations using a monotonic clock.

| Events | Additional allow-listed properties |
|---|---|
| `app_opened`, `journey_resumed` | `launch_kind=cold|foreground`, generic checkpoint, `resume_reason`, hydration outcome |
| `onboarding_started`, `onboarding_step_viewed`, `onboarding_step_completed`, `onboarding_completed` | Opaque step ID/index, elapsed ms, `navigation_reason=next|back|resume|restart`; repeated views retained |
| `onboarding_state_recovered` | `reason=valid_resume|migration|storage_failure|explicit_restart`; no answers/state dump |
| `paywall_viewed`, `paywall_load_completed`, `paywall_closed` | placement/catalog placement, paywall/variation IDs, assigned/rendered variant, load outcome/duration, close destination/reason |
| `checkout_attempt_started`, `checkout_stage_recorded`, `checkout_attempt_completed` | attempt ID, selected product ID, period, localized quote amount/currency, offer type, eligibility `yes|no|unknown`, stage/duration, retry count, normalized vendor code, retryable, result |
| `subscription_verification_completed` / existing `subscription_verification_failed` | attempt ID, `state=active|inactive|unknown`, `source=sdk|server`, reason, HTTP status, request ID, duration |
| `restore_started`, `restore_completed` | attempt ID, source surface, duration, `result=active|none|pending|failed`, normalized reason; distinguish no purchase from transport failure |
| `auth_started`, `auth_completed`, `auth_signed_out` | attempt ID, `provider=apple|email`, `operation=link|login|recovery|logout`, `result=success|cancelled|conflict|failed`, stage/code, UID changed boolean, duration |

Checkout stages: `identity_ready`, `products_loaded`, `store_call_started`, `store_result`, `entitlement_read`, `server_reconcile`. Integration attachment can be observed separately but must not gate checkout. Emit one terminal client result per attempt: `success|cancelled|pending|already_owned|failed`; measure recovery/admission separately. Start a new attempt ID only for a deliberate new operation, not each polling request. A killed app can leave an incomplete attempt; record `interrupted` on the next launch instead of inventing a StoreKit failure.

Adapty/webhook events own trial start, renewal, cancellation, expiration, refund and actual revenue. Client `success` means the purchase call returned success, not that money was collected: a trial initially collects zero. Deduplicate vendor events by their event IDs and preserve store occurrence time separately from received time. Keep an explicit owner registry rather than filtering all `purchase_*`/`subscription_*` prefixes.

**Privacy schema:** no quiz answers, health status, steps/goals, gym/Condition types or names, coordinates, places, chosen apps/websites, Screen Time usage/permissions detail, free-text errors, email, token, receipt, signed payload, raw URL or arbitrary object. Use opaque onboarding IDs without semantic activity labels. Technical product IDs and bounded auth/StoreKit codes are permitted. The current adapter injects **`walk_places` into every event and person properties**, with dedicated `walk_places_updated` handling (`PostHogAnalyticsAdapter.ts:7–20,62,148–169`; `runtime/createClientServices.ts:73–77`). Remove that activity detail in the rebuild. Generic screen mapping also currently exposes names such as `gym_picker`/`unlock_gym`; restrict analytics to the requested commercial/onboarding/auth journey.

Use per-event field/value allow-lists. The current global forbidden-key regex drops every property containing `error`, including useful sanitized `error_code`; rename to a schema-approved `vendor_code` or explicitly allow bounded codes. Do not relax it to admit free-form exception text. A regex-safe string is not automatically privacy-safe.

### PostHog React Native replay

Replay needs the native plugin (`@posthog/react-native-plugin` in current docs), a native development/release build, and `enableSessionReplay:true`; Expo Go is unsupported. RN uses screenshot reconstruction. Start with `maskAllTextInputs:true`, `maskAllImages:true`, `captureLog:false`, `captureNetworkTelemetry:false`, `sampleRate:0.1`, `throttleDelayMs:1000`. Stop before auth input, native purchase sheets, sensitive setup and app-use screens; resume only on audited generic surfaces and with consent. [RN replay installation](https://posthog.com/docs/session-replay/installation/react-native).

Masking happens on-device, but masking inputs/images does not establish that arbitrary custom-rendered charts/maps, drawing surfaces, native views or labels are safe. Current privacy guidance says RN has app-wide defaults rather than native SDK per-view reveal controls. Verify actual recordings on this Expo/RN/plugin combination using synthetic data; keep replay off if sensitive pixels remain. An OTA switch cannot install missing native replay dependencies. Do not assume a new SDK-doc option exists in installed 4.61. [Replay privacy guide](https://posthog.com/learn/session-replay/pocket-guide/protecting-user-privacy), [privacy controls](https://posthog.com/docs/session-replay/privacy).

**Cost:** use the dedicated mobile meter: 2,500 mobile recordings/month free, then $0.01 each through 15,000; 10,000/month is approximately **$75**, excluding other products/taxes. Mobile and web are billed separately. The headline 5,000 free/$0.005 is the web rate; the general pricing page is ambiguous when read without the mobile calculator. Use a billing limit and sample replay, while keeping consented semantic funnel events unsampled. [Mobile pricing table](https://posthog.com/session-replay/pricing). Current free replay retention is one month, pay-as-you-go three months; do not use replay as the long-term incident ledger. [Retention/pricing](https://posthog.com/pricing).

### Sentry, API requests and alerts

**Sentry:** retain `user:{id:U}` only; use `setUser(null)` on switch/sign-out. Add safe `auth`, `checkout`, `restore`, `api` breadcrumbs with stage/result, vendor code, duration, request/attempt IDs and release/OTA metadata. Capture unexpected failures once per attempt with a stable error type/fingerprint; cancellation, expected identity conflict and empty restore are ordinary outcomes. Keep screenshots, view hierarchy, activity state and raw HTTP/body capture off. Breadcrumbs accompany an error; they do not replace a complete event timeline. [Users](https://docs.sentry.io/platforms/react-native/enriching-events/identify-user/), [breadcrumbs](https://docs.sentry.io/platforms/react-native/enriching-events/breadcrumbs/).

The reference `telemetry/lib/sentry.ts:40` removes `user`, all breadcrumbs, contexts and most tags; its breadcrumb filter only admits `lock|watchdog|ota`, then `beforeSend` removes even those. Simply calling `setUser`/`addBreadcrumb` will not survive that scrubber. Replace the blanket deletion with a narrow permitted diagnostic schema. Also sanitize retained native exception strings: `scrubExceptionValue` currently keeps nonsynthetic exception values verbatim. On the API, use request-scoped Sentry user/context, not a global user that can leak between simultaneous requests.

**Fastify:** the inspected `server/src/index.ts:38–43` constructs `Fastify({...options,trustProxy:...})`, while default startup calls `buildServer()` without logger options. Logging is disabled by default: this explains absent automatic request logs for that startup path. It does not prove whether a production wrapper/proxy logs elsewhere. Enable Pino at creation, send JSON to stdout/journald/Cloud Logging, and use serializers/explicit hooks so default URL/header/IP logging does not leak sensitive values. [Fastify logging](https://fastify.dev/docs/latest/Reference/Logging/).

Recommended request record: generated/validated `request_id`, method, **route template**, status, elapsed ms, authenticated UID from verified JWT, environment/build, safe outcome code and validated attempt ID. Return the request ID in a response header and include it in client diagnostics. Never trust supplied correlation IDs as authentication; limit length/format. Drop request/response bodies, query strings, cookies, Authorization/API-key headers and raw remote exception messages. Log start and completion (plus timeout/abort) and safely capture unexpected 5xx errors; the current custom error handler returns generic errors without capturing those failures itself. Add a dedicated webhook record with vendor event ID/type, environment, mapped UID, processing/deduplication result and delivery lag; no receipt payload. Use 30-day operational-log retention as an initial policy, with restricted access and deletion handling. [Fastify request logging behavior](https://fastify.dev/docs/latest/Reference/Server/).

**Proposed alerts, not configured during this research:**

- Immediately: any production `not_found` for a selectable product, or completed purchase followed by entitlement unknown/inactive beyond 2 minutes. Include product/build/update and attempt ID; deduplicate repeated retries.
- Auth: alert on a new Apple unknown-error issue; rate alert at ≥3 non-cancellation failures in 15 minutes and >20% of attempts with at least 10 attempts. Keep low-volume first-occurrence alerts while traffic is small.
- API: sustained 5xx/timeouts; any subscription-reconciliation 429 or repeated same-attempt polling; oldest failed webhook/deletion job >5 minutes. Respect `Retry-After` and stop concurrent retries.
- Telemetry: daily comparison of vendor trial/purchase counts against client attempts by environment/build/update, ingestion warnings/quotas, and missing terminal outcomes. A vendor/client gap signals coverage loss, not necessarily failed checkout. Evaluate complete absence only when there is independent traffic evidence.

Use Sentry issue/rate alerts for errors and server metrics/scheduled reconciliation for missing events and webhook lag. Route concise, identifier-only notifications to the owner's existing channel with dashboard links; do not include account emails or activity data. [Sentry alerts](https://docs.sentry.io/product/monitors-and-alerts/alerts/).

## 5. Minimal design to build

1. **One guest-first identity service.** Persist Supabase session; native Apple and verified email upgrades preserve UID when the identity is new. Existing identity recovery explicitly switches UID and reconciles purchases. Keep Google out of the initial rebuild. Remove forced sign-in after checkout.
2. **Local product state, independent of auth.** Persist onboarding progress and completion before routing; resume after relaunch. Keep Conditions/enforcement local. Offer optional recovery now; add a truthful backup promise only when implemented.
3. **Adapty controls on-device access.** Identify before purchasing, consume SDK purchase/profile access levels immediately, and provide Restore Purchases. Backend reconciles durable billing and protects any genuinely paid server resources. A delayed webhook or API outage never turns known on-device active access into a fresh paywall. Cache verified access with an explicit expiry/offline policy; server authorization never trusts a client boolean. Transfer/sharing behavior depends on Adapty's configured purchase-ownership policy and needs physical-device verification; do not infer it from `identify` alone. [Adapty profiles and access sharing](https://adapty.io/docs/how-profiles-work).
4. **Three independent observation paths.** PostHog: consented journey; Sentry: bounded diagnostics; API logs/webhooks: operational reconciliation. None blocks purchase or local navigation. Retry with backoff, preserve pending purchase state, and keep `unknown` distinct from `inactive`.
5. **One owner timeline.** Search by UID; join PostHog, Sentry and request logs through UID/session/attempt/request IDs. Keep a verified migration map for exceptional account switches. Show ordered steps, unfinished attempts, SDK/server entitlement outcomes and data-coverage gaps, with vendor revenue separately. Do not promise historical events that were filtered out.

Before release, verify with synthetic accounts on a physical iPhone: new Apple/email upgrade keeps UID and active trial; existing-identity recovery retains purchase and progress; killed/relaunched app resumes; offline refresh does not create a guest; sign-out separates users; opt-out stops client and vendor-forwarded analytics; all allowed checkout/auth codes survive scrubbing; Apple deletion revokes authorization; product `not_found` and delayed webhooks produce recoverable states and alerts. These are proposed acceptance checks; no sign-in, purchase, dashboard mutation or deletion was executed in this read-only research.
