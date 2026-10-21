# Sign-in and purchase recovery investigation

Worker branch: `t3/fix-signin-entitlement-loop`; base `5d386c7c`.

Client fixes and local verification are complete. Incident B's underlying native iOS 27 failure remains unproven, and real Apple authorization and StoreKit ownership transfer remain physical-device release gates. No production settings, data, grants, releases or messages changed.

## Incident A

The production account beginning `2b0c2b33` was already email-confirmed at **2026-10-18 02:46:09 UTC**, before the 04:18 failures. The initial purchase used build 17, runtime 4, version 1.0.0; the later sign-in loop used build 21, runtime 6, version 1.0.1 and a different PostHog device ID. This is consistent with a reinstall or reset of install-local analytics state while Keychain retained the account; it does not prove which action occurred. The failed operation was therefore reauthentication from an already confirmed account, although checkout began anonymously.

At baseline `5d386c7c`, `app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts:666` routed a signed-in session through `verifySameAccountEmail`. Line 694 consumed a valid OTP for the selected account, then line 698 rejected its different UID, restored the old session and threw `REAUTH_DIFFERENT_ACCOUNT`. The preview Apple mismatch had the same obsolete policy in `reauthenticateWithIdToken` at baseline line 534. ADR 0061 had already superseded ADR 0049's same-account launch rule.

The repeated OTP verification then used a consumed credential and returned `OTP_INVALID`. Production gaps were 454 ms and 773 ms. Baseline `app-next/src/packages/identity/SignInScreen.tsx:91` used React state for its busy guard, while lines 193 and 197 could submit from code auto-verification and the button. The duplicate-call race is reproducible, but production events do not establish which callback or manual action produced each repeat. Baseline line 293 placed recovery inside the non-code branch, making it unavailable on the code screen; retrying recovery would consume the same code again.

Production reports `mailer_autoconfirm: true`. Baseline adapter line 639 used anonymous `updateUser({ email })`, then line 670 expected `email_change` verification. Auto-confirm can confirm that change without delivering the requested code. Welcome also rejected unknown emails with `shouldCreateUser: false` at baseline line 621, preventing a new complimentary recipient from registering there. The fix uses normal OTP sign-in for new and existing email accounts and verifies the selected UID exactly once.

`app-next/src/packages/subscription/restorePurchases.ts:14` labels a successful empty restore `restore_failed/unavailable`; it means no active purchase was found, not an Adapty outage. This was expected before the first purchase. Existing user-facing copy says “No purchase found”; no analytics contract was renamed.

`signInRequired=false` does not grant paid admission. `app-next/app/sign-in.tsx:46` requires authentication and `app-next/src/packages/journey/index.ts:103` independently requires a non-anonymous canonical identity and server verification. Supabase records a successful sign-in at **04:23:50 UTC**, immediately before Setup and Home. The evidence supports a later successful sign-in, not an anonymous bypass. Shipped runtime 4/6 byte-for-byte artifacts were not reconstructed here.

`server/src/packages/identity/lib/drizzleRepository.ts:34` provisions only the canonical ID. A NULL `users.email` is expected even for a confirmed email user. Complimentary access reads the confirmed Supabase administrator email (`server/src/packages/identity/confirmedEmail.ts:16`) and matches its environment partition (`server/src/packages/subscriptions/lib/complimentaryAccess.ts:47`). A NULL API email does not establish why an invitation did not match, or even whether the relevant invitation existed. No grant was created or changed in production.

Production evidence is private and ignored: `.excer/signin-investigation/production-events-sanitized.json`, `production-auth-users.jsonl`, `production-auth-sessions.json`, `production-auth-public-settings.json` and `production-user-rows.txt` in the same directory. The raw event export contains personal data and was not committed.

## Incident B

The failing `df507412` account remained anonymous. The error originates in `expo-apple-authentication` before Supabase link/authentication (`app-next/src/packages/identity/lib/providerApple.ts:50`; `app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts:436`). Installed Expo maps `ASAuthorizationError.unknown`, future unrecognized cases, and non-ASAuthorization errors to the same `ERR_REQUEST_UNKNOWN` (`node_modules/expo-apple-authentication/ios/AppleAuthenticationExceptions.swift:60` and `AppleAuthenticationRequest.swift:68`). This code cannot identify an OS defect, outage, provisioning fault or entitlement fault. The physical iOS 27 native cause remains **blocked/unproven**.

The repository already enables the Apple plugin, `usesAppleSignIn` and `com.apple.developer.applesignin` in `app-next/config/native.ts:74`, `:112`, `:122`. Supabase's public settings report Apple enabled. A Supabase client-ID/Service-ID mismatch would reject a returned token after native authorization; it cannot itself explain this pre-token exception. Native iOS authorization uses the bundle ID; web OAuth Service IDs are a different path. The historical release provisioning artifact and device AuthenticationServices logs were not available, so their correctness is not claimed.

Nonce pairing was already SHA-256 to Apple/raw nonce to Supabase. The insecure random fallback was removed; the default now injects `expo-crypto` randomness, and Apple requests EMAIL scope for confirmed-email grant matching (`app-next/src/packages/identity/createAuthServices.ts:48`). These are hardening and coverage improvements, not a claim to have repaired Apple's unknown native failure. Cancellation stays silent; unknown failures keep the same account and show “Apple sign-in is unavailable. Try again or continue with email.” The retry is a new user action; no automatic retry, sign-out or anonymous bootstrap follows a failure (`app-next/src/packages/identity/SignInScreen.tsx:115`).

The two nearby accounts are separate anonymous sessions: `c0f3f626` reports Darwin 25.5.0 and `886166f1` Darwin 25.4.0, versus Darwin 27.0.0 for `df507412`; all have distinct network hashes. Temporal proximity does not establish an account leak or a reinstall by the same person. `app-next/src/packages/identity/lib/identityCoordinator.ts:195` provisions the API user before analytics identify at line 213. An early exit, blocked ingestion or analytics failure can leave a valid anonymous API row without PostHog events. Available records do not distinguish those causes. Local unknown/cancel attempts create zero additional auth accounts and preserve the current UID. No cleanup of legitimate production accounts was attempted.

Evidence: `.excer/signin-investigation/production-auth-sessions.json`, `production-incident-b-users-window.json`, `orphan-posthog-counts.txt` and `local-auth-spine-results.json`.

## Changes and ownership policy

Successful provider/email credentials select their verified account once. Existing account data is restored from its isolated archive; failed credentials do not reset that data or SDK identity. Explicit login-method linking retains its same-UID rule. Email uses normal OTP sign-in for both new and existing accounts, independent of auto-confirm (`app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts:500`, `:583`).

The local challenge persists only email, source UID and deadlines, never the code; simultaneous verification joins one request (`app-next/src/packages/identity/emailChallenge.ts:5`; `app-next/src/packages/identity/lib/SupabaseAuthAdapter.ts:600`). The screen has a synchronous submit lock. Wrong codes clear the typed code and preserve the challenge. Resend has a 60-second cooldown; rate limits retain a verifiable challenge. Relaunch resumes the code page (`app-next/src/packages/identity/SignInScreen.tsx:95`; `app-next/src/packages/launch/BootGate.tsx:30`).

An unfinished checkout survives account selection. After the selected identity spine is ready, an explicit StoreKit restore must return that checkout's active App Store original transaction in the same environment before rebinding recovery. The v1 journal gains optional opaque transaction metadata, with old records supported. Old journals can capture it from the source profile before SDK logout, bounded to three seconds (`app-next/src/packages/subscription/AdaptySubscriptionAdapter.ts:168`, `:323`; `app-next/src/packages/subscription/lib/storePurchase.ts:19`).

A target account's separate subscription or complimentary grant cannot clear a different unfinished purchase. Server admission must independently succeed before recovery clears. Failure retains Retry/help and blocks another checkout; the client never copies an Entitlement between UIDs (`app-next/src/packages/journey/index.ts:116`). Launch waits for recovery hydration and does not skip unfinished recovery because cached admission exists. Empty/error restore preserves the existing journal.

[ADR 0086](../adr/0086-verified-account-recovery-and-checkout-connection.md) records the decision; ADRs 0011 and 0050 link to the changed portions. The safest ambiguous choice is to retain recovery when purchase ownership cannot be established, even if the target has independent access. This can leave a paid user waiting for vendor reconciliation, but avoids losing a checkout or inviting a second charge. Existing accounts and their independent purchases stay separate. An optional journal field is backward compatible; its existing storage key and version remain unchanged. The email challenge has a new documented key.

## Verification scope

The diagnosis followed the diagnosing-bugs approach with an ignored throwaway harness around the real adapter. The minimal loop changed from `REAUTH_DIFFERENT_ACCOUNT` then `OTP_INVALID` with two verification calls to successful account selection with one verification call. A subsequent submit is `OTP_NO_PENDING` with no second network verification. Evidence: `.excer/signin-investigation/email-loop-before.jsonl` and `email-loop-after.jsonl`. No repository tests were added, per ARCHITECTURE rule 7.

The real local auth/API matrix passed **26/26** cases. It uses isolated PostgreSQL, GoTrue with auto-confirm enabled, Mailpit and the real Fastify routes. Production auth services, journal, subscription adapter, admission and Journey run together. StoreKit/Adapty responses and environment-stamped purchase webhooks are scripted. This proves client orchestration, real OTP semantics, account admission and database effects; it does not prove vendor ownership transfer. The real 60-second resend cooldown was observed. Early harness runs hit the API's five-per-minute shared-IP resync limit; separate fixture addresses corrected that unrelated interference.

- Matrix source and results: `.excer/signin-investigation/local-auth-spine.ts`, `local-auth-spine.mjs`, `local-auth-spine-results.json` and `local-auth-spine.jsonl`.
- Local API ready: `.excer/signin-investigation/server-ready-final.txt`, HTTP 200 from `http://127.0.0.1:4342/v1/ready`.
- Database effects from the actual simulator email path: `.excer/signin-investigation/simulator-db-effects.txt`. Confirmed email, canonical API user, matched grant, preserved account after sign-out; `users.email` remains NULL by design.
- Static verification: `.excer/signin-investigation/check-final.txt`, **23 checks passed**.

All simulator work used hidden worker `ExcerLock-signin-sol`, Metro 8093 and the existing runtime 7 binary, with Simulator.app closed. Sixteen focused proofs passed, each run individually with a five-minute limit; no full feature suite or sweep ran. Earlier failed captures remain: navigation/typing fixture setup, explicit recovery-helper semantics, and a fake receipt/profile transaction-ID inconsistency were corrected instead of bypassing ownership checks. Completed-Setup cold launch initially failed on an unrelated native location lookup with no simulator coordinates (`.excer/proof/account/2026-10-21_00-28-57`); seeding the owned simulator and cold-launching resolved it (`.excer/proof/account/2026-10-21_00-31-57`). No location implementation changed.

The final audit added individual runs for all four updated Welcome/copy proofs:

- `account/welcome-email-code-allows-new-account`: `.excer/proof/account/2026-10-21_00-44-53` (real local OTP request).
- `account/welcome-new-email-can-sign-in`: `.excer/proof/account/2026-10-21_00-48-23` (scripted provider).
- `setup/sign-in-provider-options`: `.excer/proof/setup/2026-10-21_00-49-24`.
- `setup/sign-in-after-paywall-is-sign-up`: `.excer/proof/setup/2026-10-21_00-49-59`.

One Welcome attempt used the local mail harness while its proof entered a scripted code (`.excer/proof/account/2026-10-21_00-46-16`). The real OTP server correctly rejected that code; rerunning with the demo adapters passed. No implementation or proof definition changed during these final runs.

For the table, **L** is `.excer/signin-investigation/local-auth-spine-results.json` (named assertions and database effects are detailed in `local-auth-spine.jsonl`). **A/** is `.excer/proof/account/`; **P/** is `.excer/proof/paywall/`. Every proof directory contains `result.json`, labels and screenshots. Passes involving scripted providers or purchases apply to that scope only.

| Edge case | Status | What ran and evidence |
|---|---|---|
| Anonymous → new email | Pass | Real GoTrue OTP with auto-confirm, selected new UID. L: `new email with autoconfirm and simultaneous submits`. Simulator checkout: A/`2026-10-21_00-16-26`. |
| Anonymous paid trial → existing unpaid email | Pass | Real OTP/API, scripted transaction restore, one purchase, selected UID admitted and source paid mirror revoked. L: `paid checkout to existing unpaid email`; A/`2026-10-20_23-54-55`. |
| Anonymous paid trial → existing paid email | Pass | Selected existing UID; independent purchase preserved and checkout specifically restored. L: `paid checkout to existing paid email`; A/`2026-10-21_00-14-43`. |
| Complimentary email signs in before purchase | Pass | Grant created locally before registration; real OTP/server matching admits with zero purchases. L: `complimentary grant before registration no purchase`; actual app cold relaunch: A/`2026-10-21_00-22-01`. |
| Complimentary email signs in after purchase | Pass | Real OTP and grant match, scripted checkout restored, one purchase. L: `paid checkout to existing complimentary email` and `complimentary grant matches after purchase`. |
| Wrong code, then right code | Pass | Real GoTrue preserves old UID/data on wrong code; right code succeeds. L: `wrong code preserves identity and data`; A/`2026-10-21_00-02-16`. |
| Resend after cooldown | Pass | Real 61-second wait, new delivered OTP invalidates previous code, new code succeeds. L: `resend after real cooldown supersedes old code`. |
| Resend rate limit | Pass | Real 429 keeps existing challenge and code valid. L: `real resend rate limit retains code`; visible timer/recovery: A/`2026-10-21_00-04-18`. |
| Double submit | Pass | Simultaneous real-adapter calls share one verification/reset; screen uses synchronous ref guard. L: `new email with autoconfirm and simultaneous submits`; `email-loop-after.jsonl`. Touch timing itself is not inferred from production telemetry. |
| Killed/relaunched mid email sign-in | Pass | Real pending challenge resumes after service recreation; actual app cold-launch code-page proof A/`2026-10-21_00-20-48`. L: `process recreation mid-code resumes current challenge`. |
| Apple → new account | Pass | Production adapter/coordinator with scripted native success links anonymous UID. A/`2026-10-21_00-09-23` (third attempt). Real Apple credential path remains blocked below. |
| Apple → existing account | Pass | Scripted native/provider conflict consumes credential once, restores isolated account A. A/`2026-10-21_00-12-15`; purchase connection P/`2026-10-21_00-15-46`. |
| Apple unknown → retry | Pass | Exact native error injected before Supabase, same UID/account count retained, clear email/retry copy, later success. L: `native Apple ERR_REQUEST_UNKNOWN creates no accounts`; A/`2026-10-21_00-09-23`. |
| Apple cancellation | Pass | Silent cancel preserves UID, no reset or new account. L: `native Apple ERR_REQUEST_CANCELED creates no accounts`; A/`2026-10-21_00-09-23`. |
| Restore with prior purchase | Pass | Scripted SDK returns exact active checkout transaction/environment for selected UID; real API admission and mirror effects. L: paid checkout cases; P/`2026-10-21_00-15-46`. |
| Restore without prior purchase | Pass | Empty SDK response gives no Entitlement or journal; user sees “No purchase found”. L: `restore without prior purchase`; P/`2026-10-21_00-17-22`. |
| Purchase → sign-in → relaunch | Pass | Real auth/API plus scripted transaction persists selected UID/access across service recreation for unpaid, paid and granted targets. L: three `purchase sign-in and process recreation` cases. Actual grant Home cold relaunch: A/`2026-10-21_00-22-01`. Real StoreKit persistence remains blocked below. |
| Sign out, then sign back in | Pass | Real local auth/API for unpaid/paid/granted targets; no deletion or second purchase. L: three `sign-out preserves previous account` and three `sign back into selected account` cases. Actual Settings path: `.excer/signin-investigation/simulator-sign-out-user-path.txt`, `simulator-sign-back-in-verified.txt`, `simulator-db-effects.txt`. |
| Sign-in after Screen Time Setup | Pass | Completed-permission fixture, real delivered code, Home with no repeated permission page; actual cold relaunch passes. A/`2026-10-21_00-31-57`; `.excer/signin-investigation/simulator-completed-setup-home.png`. |
| Independent target access cannot hide lost checkout | Pass | Empty restore with separately paid or granted target keeps original recovery, denies admission and another purchase. L: `independent paid cannot clear unfinished checkout`, `independent complimentary cannot clear unfinished checkout`. |
| Existing v1 purchase journal | Pass | Loads without metadata, captures source transaction before SDK logout, then connects safely. L: `legacy v1 journal loads without transaction metadata`, `legacy checkout captures transaction before SDK logout`. |
| Real Apple ID: new/existing/cancel, iOS 27 native failure | Blocked | No physical iOS 27 device, signed historical artifact or AuthenticationServices logs. Simulator uses scripted native credentials. Native-error mapping/config evidence above; underlying cause is not claimed fixed. |
| Real StoreKit purchase/restore/ownership transfer and webhook timing | Blocked | Reused simulator binary; no physical sandbox tester run. See `docs/agents/memory/simulator-purchase-needs-sandbox-tester.md`. Simulator sandbox sign-in is unsupported; Xcode StoreKit configuration requires launching through a generated Xcode project, absent in this worktree. No unnecessary native rebuild performed. Scripted ownership transfer is not vendor evidence. |
| Exact reason nearby API users have no PostHog events | Blocked | Independent anonymous sessions established from read-only auth records; ingestion/exit cause unavailable. `.excer/signin-investigation/production-auth-sessions.json`, `orphan-posthog-counts.txt`. Failure leakage itself passes the local account-count assertion. |

## Shipping and handoff

No server source, API contract, native module or entitlement configuration changed. This patch needs **no server deploy** and is JavaScript-only. It can ship as an OTA only to a compatible runtime. The current tree declares runtime **7** (`app-next/app.config.ts:70`); affected production runtimes **4 and 6 will not receive a runtime-7 OTA**. The owner must choose a compatible backport or a new App Store build carrying the fix. No release was performed.

Before describing the production incidents as fully resolved, verify the signed build with a physical Apple ID on affected iOS, and complete a sandbox purchase → existing-account sign-in → restore → webhook admission → force-quit/relaunch using the documented physical tester. Confirm Adapty's real restore policy retains the original transaction and independent target purchase. A rejected or delayed transfer must stay recoverable without a second charge. No simulator result substitutes for those gates.

Evidence remains ignored in this worktree. The worker simulator and owned local services are removed/stopped after verification; cleanup is recorded in `.excer/signin-investigation/cleanup.txt`.
