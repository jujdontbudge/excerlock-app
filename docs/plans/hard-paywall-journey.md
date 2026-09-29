# Hard Paywall Journey: implementation and proof plan

Status: **partial implementation on a non-release branch; not safe to release**. Based on source `1e826fcb` (TestFlight build 14) and read-only research on September 29, 2026 UTC. No new build, OTA, dashboard setting, purchase, deployment, or production data change is authorized by this document.

## 1. Product contract to approve

The first screen is **the first Onboarding page**, with Get started and Sign in. Previously installed, previously signed in, completed Setup, a saved receipt, an active subscription, or an existing account must not silently choose Home, Setup, or the sign-in screen.

Two intentional entry paths:

1. **Get started → complete the existing Onboarding → Paywall → successful purchase or Restore purchases → explicit sign-in/create account → verify subscription ownership for that account → needed Setup → app.** Existing subscribers can take this entire path. Cached entitlement must not skip its questions or Paywall. After an explicit restore/confirmation of an existing subscription, do not charge them again.
2. **Welcome → Sign in → verify the selected account's Entitlement → app if entitled, otherwise a hard Paywall.** On a new device, ask only for missing local Setup; an existing subscriber need not repeat all Onboarding. An authenticated account without access can subscribe or restore from this Paywall without re-entering its credentials afterward. An unrecognized/no-purchase account does not get Home.

**Settled lifecycle boundary:** installation, reinstallation, sign-out, and every genuine cold process launch start at Welcome, including an admitted subscriber reopening after force quit. Existing subscribers explicitly use Sign in from Welcome; no cached Setup, session, receipt, Entitlement, admission, or navigation envelope may silently resume Home. Returning from Apple's payment sheet, OAuth, email, iOS Settings, or a brief app switch in the same process resumes the current step. OTA reload behavior must never preserve payment authority merely from a navigation resume envelope.

On every cold launch, reset the entry decision, **not** purchases, accounts, Conditions, History, saved permissions, native schedules, or unfinished transaction recovery. Old data is not evidence of new entry authorization.

### What “paid” means

Main-app access requires **both** explicit authentication in this entry and a valid subscription Entitlement bound to that exact canonical account. Neither alone suffices.

- Active purchased subscription: eligible.
- Store-activated free trial: eligible under the existing offer, not a free anonymous bypass. This plan does not remove trials or change pricing.
- Auto-renew canceled but current period not expired: still eligible until expiry.
- Store-authorized billing grace: eligible only through its verified grace boundary.
- No purchase, expired trial/subscription, refunded/revoked access, billing retry without valid grace: ineligible.
- Unknown, conflicting, timed-out, or wrong-account evidence: **checking/retry**, never Home and never a claim that the user needs to buy again.
- Manual promotional/lifetime grants must not accidentally bypass a subscription-only policy. Inventory existing products/grants; support only explicitly approved eligible products and grant types. No pricing/dashboard change is included here.

Apple will not sell forty concurrent copies of one subscription in a single subscription group. The app must let a user reach checkout, but respect StoreKit's already-subscribed, upgrade/downgrade, trial-eligibility, and restore results instead of promising another charge.

## 2. What was wrong before

| Finding | Actual source / consequence |
| --- | --- |
| Completed Setup was treated as entry authority | `launch/lib/bootDestination.ts` returns Home or `/sign-in` for `complete && setupComplete` **before checking Entitlement**. |
| Build 14 solved the wrong requirement | ADR 0049 and `identity/launchSignInGate.ts` forced fresh authentication rather than Welcome-first choice. |
| Authentication still opened an unpaid app | `launch/RootNavigator.tsx` guards tabs, Settings, builder, and permissions with Setup + launch approval, not active Entitlement. |
| Lapsed users intentionally retained Home | ADR 0024 explicitly keeps the tab shell after lapse. That is incompatible with this hard Paywall requirement. Preserve privacy/account recovery without preserving premium tabs. |
| Existing access skipped the intended journey | Onboarding routes are removed when entitled. `paywall/PaywallSlot.tsx` redirects on any `active`/`trial` value and exposes Close after saved Setup. |
| Returning sign-in shortcut is incomplete | `onboarding/lib/welcome/WelcomeFooter.tsx` merely closes its sign-in sheet on completion. It does not orchestrate selected-account subscription verification and routing; the screen can also present a saved-session Continue when fresh auth is not requested. |
| Switching accounts was wrongly restricted | Build 14's `SupabaseAuthAdapter` same-account reauthentication rejects a different UID. Legitimate account selection needs an explicit account-switch transition, not an arbitrary same-device restriction. |
| Reset is not enough to revoke stale payment state | `AdaptySubscriptionAdapter.reset()` invalidates expected identity and logs out, but does not immediately clear the persisted Entitlement. Navigation currently reads that store separately. |
| A restore result can hide contradictory evidence | `reduceEntitlement` preserves active access across empty/expired paired restore responses. It must not manufacture ownership or mask a genuine refund/transfer. |
| “Fresh profile” is not necessarily fresh network proof | Installed Adapty SDK documents `getProfile()` falling back to cache. The mapping records a new `observedAt` when mapping a profile; that is not the receipt's verification time. |
| Local setup/data is device-global | `onboarding/lib/plan.ts` writes Conditions/profile before payment/sign-in, and account-switch reset currently resets vendors, not account-scoped local data. Repeated Onboarding must not duplicate Conditions or expose another person's History. |
| Earlier proofs did not establish ownership | `dev-harness/lib/fakes/IdentityLab.ts` has one device-global `storeAccess`; changing CUID makes the next profile entitled. Email auth is unscripted, Google cancels, restored sessions are not realistic. Existing success proofs demonstrate that fixture, not Adapty transfer correctness. |
| Documentation/proofs contradict implementation | `features/launch.md` still describes subscribers opening Home and includes direct scenario approval. Positive labels alone do not prove a forbidden screen never mounted. |
| The server mirror is not a ready-made fresh authority | `server/.../subscriptions/lib/resync.ts` intentionally does not use the fetched profile aggregate to grant: the aggregate is not environment-bound. Its README explains the fail-closed rationale. Do not “fix” this by trusting an ambiguous aggregate. |

I uploaded build 14 after proving only the narrower gate I had implemented. I did not establish the complete Onboarding → payment → account ownership → app contract. That was the process failure, not a failure of the owner to describe a hard Paywall.

## 3. Research: established patterns and limits

### Concrete evidence

- **Adapty** documents three policies: sharing (default), transfer to new identified user, and disabled. It recommends **Transfer access to new user** for purchase-before-account flows. Transfers can be triggered by renewal, restore, or transaction validation. Anonymous Adapty profiles can still share. [General settings](https://adapty.io/docs/general)
- **RevenueCat** independently documents transfer as its default and recommends it when purchases precede account creation or customers may forget their old login. This is a policy reference, **not a proposal to migrate SDKs**. [Restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior)
- **Calm** documents account login on a replacement phone recovering Premium without repurchasing. We adopt the account-based entitlement continuity, not its cloud-data behavior: ExcerLock's sensitive activity remains local. [New-phone guidance](https://support.calm.com/hc/en-us/articles/115002582608-Keeping-a-Subscription-When-Upgrading-a-Phone)
- **Supabase** supports verified provider linking and explicit linking of a different-email identity while authenticated. This is not permission to merge two established accounts by matching strings. [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- **Apple** documents one active subscription per group, restoration, and in-app account deletion. [Subscriptions](https://developer.apple.com/app-store/subscriptions/) · [Review guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

These sources establish supported behavior, not that every high-revenue app has one identical flow or that Welcome on every cold launch improves conversion. No conversion claim is made.

### Live/configuration evidence still needed

Authenticated, read-only `adapty apps get` confirmed the ExcerLock app and iOS bundle. Its response does **not** expose sharing policy. Production and sandbox transfer settings, Family Sharing, current product groups, grace configuration, and any existing manual grants remain unverified. No setting was changed. A failed Headspace article fetch is not evidence for its transfer policy.

Important ExcerLock-specific distinction: a **Supabase anonymous UID is already supplied as an Adapty CUID**. It is therefore identified from Adapty's perspective. Do not assume Adapty's anonymous-profile merge exception solves our post-purchase switch.

Research artifacts: `.excer/research/hard-paywall/` (official page extracts plus redacted app metadata). Installed SDK inspected: `node_modules/react-native-adapty/src/adapty-handler.ts`; ExcerLock's wrapper currently omits supported `appAccountToken` parameters.

## 4. Subscription ownership and identity policy

### Three identities, never one email heuristic

1. **Apple billing account** owns the StoreKit transaction. Sign in with Apple can use a different account or a private relay email.
2. **ExcerLock canonical Supabase UID** owns the app account.
3. **Provider credentials** (Apple, Google, email code) prove access to that UID.

Billing email, app email, device ID, or the fact that someone used the same phone are never authority to merge accounts or grant subscription access.

### Recommended ownership policy: recoverable transfer, not unlimited sharing

- Same ExcerLock account on a second phone: verify the same UID's active subscription. No restore or new payment should be necessary merely because the App Store account is different.
- Same Apple billing account, lost app login: Onboarding → Restore purchases → authenticate/create the replacement account → confirm attaching the restored subscription → verify the target account. Transfer the entitlement; do not reveal the old account's email or copy its personal data.
- Account A → account B with no valid restore/purchase evidence: B gets its own entitlement check. A's cached paid state must not enter B.
- A valid store-backed transfer moves **that subscription**, not every subscription belonging to A. If A separately owns another eligible subscription, it may remain entitled.
- Merely showing Welcome, checking a cached profile, or beginning an abandoned sign-in must not knowingly initiate an ownership transfer. Vendor background validation behavior must be observed; a UI confirmation alone cannot promise this invariant.
- Repeated restore/transfer requests are serialized and idempotent. Old-account access is revoked at the next authoritative observation, bounded by the access lease described below; no claim of instantaneous remote revocation on an offline phone.
- A purchase finishing after an account switch cannot authorize the new account from the old callback. Reconcile the store transaction, then verify the current target identity.

**Release blocker:** verify transfer timing with the actual Adapty SDK and both accounts, including launch/identify/background validation. If vendor-only transfer cannot enforce the selected consent/ownership policy, implement an authenticated recovery coordinator in the existing server `subscriptions` package with vendor-verified purchase evidence and bounded ownership grants. Do not solve it by sharing every receipt across every UID, deleting Adapty profiles, or copying `active` between stores. Any new transaction reference retention needs a privacy ADR; prefer an opaque/HMAC reference, never raw receipts or health data in logs. The final mechanism must be chosen from this spike before implementation of the paid gate, not deferred until release.

### Two emails / two providers

- **One account, multiple login methods:** explicitly link a verified additional provider to the authenticated canonical UID through supported Supabase APIs. For example, Apple relay and Google email can be login methods for the same account when both are proven. Subscription ownership remains with that UID.
- **Two existing accounts:** they remain separate. Restoring can transfer the subscription without merging accounts or History. Do not invent a client-side UUID merge or alias two established analytics identities.
- If the second provider is already attached to another UID, present Switch account or recovery guidance. Do not detach it silently. Full established-account/data merging is not needed to meet this request and is excluded from this release.
- Email-code authentication verifies the address selected. Changing a primary email uses verified account-management flow; it is not support for arbitrary multiple email-code inboxes on one Supabase user.
- Sign-out should be **local to this device** unless the user explicitly chooses sign out everywhere. Audit Supabase's default sign-out scope so one phone does not accidentally revoke another.
- The user who has neither access to the old app account nor proof through the owning Apple billing account cannot receive a free grant. Offer recovery/support, not forced guesswork or payment as the only recovery option.

### Purchase before authentication

- Maintain a stable canonical checkout identity and a minimal interrupted-checkout journal. Creating/abandoning Welcome must not mint a new purchasing identity every time or destroy the only recovery context.
- An explicit Get started/checkout intent determines whether to use a checkout identity rather than a restored permanent account. Never silently attach a new purchase to a hidden saved account. The spike must prove this boundary does not auto-transfer old purchases on SDK activation.
- A genuinely new provider link preserves the checkout UID where Supabase supports it.
- Existing-account sign-in adopts that account's UID through the existing serialized identity spine. If the purchase belongs to the checkout UID, complete the supported authenticated restore/transfer, then revalidate the target account. Show “Connecting your subscription…”; do not briefly show Home or demand a second payment.
- After purchase succeeds but sign-in is canceled/fails or the app is killed, retain recovery information. Next entry still begins at Welcome. Taking either route can recover the paid transaction without charging again. No raw credentials/receipt in general persisted stores or analytics.
- If an existing subscription is auto-detected at the end of Onboarding, show a clear **Use existing subscription** confirmation or Restore purchases action instead of automatically skipping the Paywall or presenting a misleading new trial. Revalidate before continuing to account sign-in.

## 5. One access policy, deep modules

### State model

Separate three things currently conflated:

- **Entry intent:** no choice yet, full Onboarding, or returning-account sign-in.
- **Identity proof:** explicit successful authentication for a canonical UID and operation generation in this entry.
- **Subscription proof:** matching UID, verified eligible premium access, store environment, source/freshness, expiry/grace boundary, and ownership operation status.

Public Journey states should be a discriminated union, not a growing collection of persisted booleans:

`welcome → onboarding | signingIn → paywall | verifying → attachingPurchase | setup → app`

with explicit `pendingPurchase`, `retry`, `accountRecovery`, and `deleting` states where needed. A retry has a recoverable operation, not a default route to Home. Back from Paywall can return to Welcome/Onboarding, never to unpaid tabs.

Main access predicate, in product terms:

> Explicitly authenticated current account + matching eligible subscription proof + completed/minimally acknowledged device Setup + completed chosen entry transition + no pending switch/deletion/recovery.

Only this policy authorizes the tab shell and premium operations. `setupComplete`, UI callbacks, remote flags, a successful SDK method with no access, and arbitrary deep links never do.

### Package responsibilities and legal dependencies

| Owner | Change / boundary |
| --- | --- |
| `model` / `ports` | Small typed Journey/proof contracts and injected capabilities. No vendor objects, navigation, or SDK dependencies. |
| `identity` (layer 4) | Authentication, link vs sign-in vs switch, explicit-auth proof/generation, local sign-out, deletion lifecycle. No subscription decisions or routing. `SignInScreen` reports authenticated/canceled outcomes; it must not grant main access itself. |
| `subscription` (layer 5) | All Entitlement writes; verified proof provenance and expiry, purchase/restore/ownership recovery results, stale-profile rejection, product invalidation, SDK/server adapter boundaries. No navigation. |
| **`journey` (proposed layer 6)** | One product-level coordinator reducing entry intent + identity/subscription evidence into allowed destinations/capabilities. Small public entries, deep private implementation. Depends only on lower layers. It does not replace the existing serialized IdentityCoordinator or own a second payment store. |
| `onboarding` (layer 12) | Existing screen sequence and question draft. Signals intent/completion through Journey entry points. Stages plan changes; does not eagerly overwrite another account's live Conditions/profile. |
| `launch` (layer 13) | Thin mapping from Journey state to route guards and initial destination. No second copy of the access predicate. |
| `paywall`, `setup` (layer 13) | Present states/actions from Journey and Subscription; cannot import each other or `launch`. Paywall Close cannot authorize Home. Setup completion cannot authorize unpaid access. |
| `settings`, `support` | Existing account/deletion/legal/support surfaces reused in a restricted recovery navigation group accessible without subscription. Paid Settings/features stay behind main access. |
| `runtime` (layer 15) | Composes real adapters, Journey coordinator, account-local transitions, app lifecycle, and fakes. Only it wires cross-layer lifecycle effects. |
| `dev-harness` (layer 14) | Multi-account/multi-receipt scripted vendor seams over the production identity/subscription/Journey code; never alternate routing rules. |
| `server` existing packages | If needed for strict proof/transfer, extend `subscriptions`, `identity`, `user-deletion` through thin routes; no duplicate billing framework. Never move Activity or Enforcement to server. |

Create the new package using `./excer new package journey`; register the layer in `ARCHITECTURE.md` and `.dependency-cruiser.cjs`. `ports` contains any Runtime port extension; only root entry files are imported. No giant shared `AuthPaywallManager`, barrel exports of private modules, tests directory, or comments explaining tangled TypeScript.

### Server-backed proof and offline semantics

Recommended strict policy: **fresh entry/switch/restore requires online, account-bound subscription confirmation**. No successful verification means no new main-app grant. This deliberately makes first entry unavailable offline; explain it as a connection problem, not “you are unpaid.”

Adapty `getProfile()` can return cache; do not label any resolved promise a fresh proof. During the first implementation spike, establish a narrow subscription verification path that can distinguish fresh, valid evidence from cache:

- Reuse the authenticated server subscription seam and environment-separated webhook mirror where possible. Token supplies UID; client cannot choose another UID or claim active access.
- Retain the existing prohibition on authorizing from an environment-ambiguous profile aggregate. Parse the documented v2 response/schema and prove its transaction-to-access-level/environment joins, or use verified StoreKit transaction status plus the environment-stamped webhook evidence. If the proof cannot be established, remain pending. Do not guess API fields.
- Handle webhook latency with bounded reconciliation and a “payment received, still confirming” state; do not require another purchase. A receipt/transaction assertion from the client must be validated by the vendor/server, not trusted.
- Production and Sandbox remain separate. For TestFlight, use an explicitly isolated sandbox verification lane with server-controlled test identity/configuration; never let `environment=sandbox` supplied by the client authorize production. Verify anonymous checkout → authenticated account transition in that lane. If this requires a separate preview backend, provision and test it before the next TestFlight proof build; do not repurpose production authorization to accept sandbox globally.
- Prefer an in-memory authorization lease capped by `min(entitlement expiry, verified grace expiry, verification time + 5 minutes)` while the process is open. Refresh on foreground, account changes, purchase/restore and server/SDK updates, and before lease expiry. Unknown/transient failure never extends the lease. This is a proposed explicit bound, not proof of instant refund detection.
- Expiry/refund/transfer removes premium navigation at confirmation (or lease expiry if offline). A failed refresh during a still-valid lease can show a connection warning without revoking already proven time; after it ends show retry, not Home.
- Do not derive freshness from the phone clock alone: use server time and elapsed monotonic time for the lease. Cold launch cannot recreate a lease from persisted `active`.
- All server premium operations, if introduced, authorize independently. No mobile gate can promise invulnerability on a modified/jailbroken client, nor instantaneous offline knowledge of a remote refund.

The exact proof transport/schema and vendor-transfer semantics are **phase-0 decisions**, not unfinished implementation details to paper over in release. They may require a server change/deploy; deployment still needs explicit approval.

### Local data and Enforcement

- Welcome must not erase or expose another account's Conditions/History. Existing device data without an owner is quarantined until its authenticated owner is determined or an explicit safe local adoption is made. No auto-attribution to whichever email signs in first.
- Each package exposes its own account transition/export/import operations; runtime coordinates local account snapshots. Only each package writes its store. Keep account data on-device. Preserve old snapshots securely for returning owners; do not upload them to resolve subscription conflicts.
- Same-account sign-out/sign-in preserves Conditions and History. Different-account switch does not show the previous account's data or inherit `setupComplete` as authority. Device permission grants remain device facts, while locked-app selection and account configuration require safe adoption/reconfirmation.
- Onboarding redo is a draft. Commit once after paid authenticated admission; idempotent operation ID prevents duplicate Conditions on retry/relaunch. Offer explicit replace/add treatment when an existing account already has a plan; do not silently reset it.
- A paid account on a new phone can recover its subscription, **not cloud-synced History**, because ExcerLock does not upload that data. Show minimal device Setup and a default/add-Condition path rather than mandatory marketing Onboarding for the returning shortcut.
- A UI entry gate is not the native Enforcement gate. Simply reopening Welcome must not clear a still-authorized subscriber's Screen Time schedules or create a way to evade Conditions by killing the app.
- Confirmed lapse/refund/account switch/deletion must reconcile native authority and clear inappropriate old-account schedules. Unknown network state must follow the existing bounded watchdog contract, not unshield unpredictably. Review this separately from premium navigation and prove on a device.

## 6. UX behavior by situation

| Situation | Destination / action |
| --- | --- |
| Clean install, reinstallation, old saved account/Setup/subscription | Welcome, no account information exposed. |
| Get started with cached active access | All Onboarding, then Paywall/explicit existing-subscription confirmation; never automatic skipping. |
| Welcome sign-in, current account entitled | Verifying → required device Setup if any → app. |
| Welcome sign-in, account not entitled | Non-dismissible Paywall with Buy, Restore, Switch account, recovery/legal links. |
| Welcome sign-in, subscription check unavailable | Retry/support/switch-account state; no Home and no false “not purchased.” |
| Purchase/restore succeeded before sign-in | Mandatory account authentication, then verify ownership; no Skip to Home. |
| Purchase pending (including Ask to Buy) | Pending state and recoverable status; no access until confirmed. |
| User cancels payment, restore, provider, or wrong/expired email code | Stay in the relevant gate; retry/back available, no premium access. |
| Existing subscription, tap purchase | Respect StoreKit result; explain already subscribed/offer restore. Do not promise duplicate charge or fresh trial. |
| Restore finds nothing / wrong Apple billing account | Paywall with clear outcome and recovery options; do not erase an independently verified account subscription. |
| Switch paid A to unpaid B | Suspend admission immediately, isolate data, verify B, then Paywall unless B proves access. |
| Transfer subscription from A to B | Show confirmation/reconciliation, then B eligible; refresh A on other device and remove that subscription's grant. |
| Cancel auto-renew | Continue through paid-through expiry; no early lockout. |
| Confirmed expiry/revocation | Hard Paywall replaces main routes; privacy/account recovery remains reachable. |
| Account deletion with active subscription | In-app deletion available; explain Apple billing continues until canceled; no payment requirement for deletion. |

All screens reuse `ui` components, tokens, ScreenShell, and motion hooks. This is a flow/authority repair, not a visual redesign or pricing experiment.

## 7. Implementation phases and exit criteria

### Phase 0 — settle the contract and prove vendor feasibility

1. Preserve the settled Welcome-first cold-launch boundary while confirming transfer-not-share policy, valid trial/grace treatment, strict online-entry policy, and account-data isolation.
2. Record production/sandbox Adapty sharing policy, receipt sync timing, subscription groups, products/grants, and Supabase provider/manual-link configuration **read-only**. Request separate authorization for necessary changes.
3. Spike actual SDK multi-account behavior and reliable subscription-proof provenance/environment. Prove same UID on two phones; anonymous checkout CUID → existing UID; fresh activation with old Apple receipt; no accidental transfer from passive Welcome.
4. Choose and document proof transport and ownership mechanism. Resolve the server ambiguity described above. Failed spike = blocked, not a weakened gate.
5. Draft an ADR superseding ADR 0049 and the premium-tab allowance in ADR 0024; retain account/privacy access. Update ADR 0043's sequencing and ADR 0011's explicit authenticated recovery boundary without discarding the identity spine.

### Phase 1 — make the harness capable of finding the bug

1. Extend IdentityLab below the real adapters: stable A/B/checkout users, independent Apple billing identities X/Y, transaction ownership ledger, configurable sharing/transfer, delayed callback queues, store environment, cancellation/pending/revocation, full Apple/Google/email flows and persistent relaunch state.
2. Remove automatic `demoAuthorized` shortcuts from all security proof scenarios. Unrelated UI fixtures may remain convenient but must never be counted as payment-gate evidence.
3. Add proof DSL capabilities for negative assertions, multiple observed steps, cold relaunch at a specific point, fixture actions (choose account, deliver callback, advance clock), and assertion of the actual Journey/ownership/mounted-route state. Maintain backwards compatibility.
4. Capture rendered route history so “no Home flash” is assertable, not inferred from a final screenshot. Any observer must be dev-only and passive; it must not grant access.
5. Run selected new proofs against unchanged build-14 behavior and save the expected failures: Welcome, unpaid authenticated Home, expired Close bypass, stale A→B ownership. This is proof sensitivity, not a full old-code suite.

### Phase 2 — one Journey authority and hard navigation

Implement Journey package and Welcome-first boot; integrate choice and authentication callbacks; use the same policy in root guards and premium command boundaries; remove automatic Paywall redirects and dismiss-to-Home escape. Split public/recovery routes from paid Settings. No remote flag can make account/payment optional.

### Phase 3 — correct identity, subscription and recovery

Implement authenticated switches, immediate proof invalidation, source/target ownership reconciliation, interrupted checkout, verified subscription refresh/lease, selected environment handling, and safe provider linking. Keep the global identity serializer and generation guards. Re-fetch products after identify; reject stale handles/callbacks. Implement the chosen server seam if required, with database-effect proof locally before any deployment.

### Phase 4 — account-local data and native consequences

Stage repeat Onboarding; scope/adopt local data safely; idempotent plan commit; preserve permissions correctly; ensure background Enforcement continues for rightful paid owners and clears on confirmed account/lapse transitions. No Analytics timeline/haptics integration.

### Phase 5 — verification and owner acceptance

Run the finite matrix below by named proof. Re-run changed proofs after integration, not every unrelated feature. Physical tests must use the exact candidate Release artifact. Record every pass, failure, and blocked item with evidence. Do not upload another build as “fixed” while the critical ownership/provider/payment cases are unproven. A specifically labeled test-candidate TestFlight build can be uploaded with new explicit approval to perform the otherwise blocked device tests.

## 8. Verification architecture: no unit-test suite

Follow `ARCHITECTURE.md` rule 7: these are **scenario-driven app proofs**, plus local real-API/database smoke and physical-device verification—not new Jest/Vitest test files. The owner requested broad edge-case coverage here, so this bounded Journey matrix is in scope; unrelated cross-feature sweeps are not.

For every negative scenario assert:

- Expected gate and actionable recovery UI.
- `canEnterApp = false`, no protected main route mounted, and premium actions not executed.
- Account/entitlement UID + operation generation match, or no grant exists.
- No stale profile/product/receipt callback can change the current account's authority.

For every positive scenario assert:

- Correct explicit path, provider outcome, verified account proof and subscription owner.
- No unnecessary second payment; no skipped required authentication.
- Expected Setup versus Home and correct account-local data.

Evidence includes screenshot, accessibility labels, step/route timeline, fake vendor ledger (fixture IDs only), negative assertions, source commit, dirty status, served bundle identity, scenario seed, simulator/device, and `result.json`. Real device evidence separately records build/version and redacted provider/transaction observations. Never put tokens, raw receipts, health/location/step/gym/Screen Time details in telemetry.

### App proof matrix (56 named cases; parameterize variants explicitly)

Proposed names below will be added to the existing launch/onboarding/paywall/setup/account feature maps; an ownership case may span those surfaces but has one named owner. Each proof gets a five-minute outer timeout and progress output. A blocked proof is reported, not retried indefinitely.

| ID / proposed proof | Setup / action | Required result |
| --- | --- | --- |
| J01 `clean-welcome` | Empty install | Welcome; no sign-in or Home auto-route. |
| J02 `returning-paid-welcome` | Saved paid account + completed Setup | Welcome; receipt/session do not choose a path. |
| J03 `returning-unpaid-welcome` | Saved account + none/expired entitlement | Welcome. |
| J04 `reinstall-keychain-welcome` | App data absent, secure auth/receipt survives | Welcome; no old Home flash. |
| J05 `cold-launch-welcome` | Enter legitimately; kill/relaunch | Welcome under approved lifecycle rule; no erased user data. |
| J06 `foreground-resumes` | Background during Onboarding/sign-in/payment | Same operation/step, no Welcome reset from a sheet. |
| J07 `paid-onboarding-complete-path` | Cached active entitlement; choose Get started | Full existing screen order reaches Paywall; no auto-skip. |
| J08 `repeat-onboarding-idempotent` | Re-enter and retry final commit | Existing data unchanged before admission; one intended plan commit after it. |
| A01 `welcome-login-paid` | Apple/Google/email success for entitled A | Verify A, then Setup/Home; no purchase required. |
| A02 `welcome-login-unpaid` | Same providers, unpaid B | Hard Paywall; no protected mount. |
| A03 `welcome-login-expired` | Same providers, expired A | Hard Paywall, not saved-Setup Home. |
| A04 `welcome-login-unknown` | Delay/error verifying subscription | Checking then retry, never Home or false unpaid conclusion. |
| A05 `cancel-provider` | Cancel Apple/Google | Remain at entry; no grant. |
| A06 `provider-failure-retry` | Provider error then successful retry | Visible error, no stale approval; eventual correct account route. |
| A07 `email-code-failures` | Invalid, expired, superseded, resent code | Only current valid challenge authenticates; no premature entry. |
| A08 `saved-session-not-explicit` | Saved signed-in label / old Continue | Cannot approve current entry. |
| A09 `new-provider-links-checkout` | Purchase, then link new provider | UID preserved, matching subscription confirmed, then Setup. |
| A10 `existing-provider-recovers-account` | Purchase, then existing-account sign-in | Target UID adopted; ownership reconciled before Setup/Home. |
| A11 `different-account-allowed-safely` | Stored A, explicitly select B | No same-device UID restriction; B gets only B's verified access/data. |
| A12 `linked-providers-one-account` | Verified link Apple + Google to A | Either provider resolves A; no duplicated subscription/account. |
| A13 `existing-provider-conflict` | Provider already belongs to B | Explicit switch/recovery; no silent merge or data leak. |
| A14 `local-signout` | A signed in on two simulated devices; sign out one | Local gate revoked; other device's login not globally revoked. |
| P01 `purchase-to-required-signin` | Full Onboarding; confirmed eligible purchase | Mandatory sign-in before any Setup permissions/Home. |
| P02 `signin-first-purchase` | Unpaid account signs in at Welcome then buys | Verify ownership; Setup/Home without redundant sign-in. |
| P03 `purchase-cancel` | User dismisses StoreKit | Remain Paywall; no grant. |
| P04 `purchase-error` | SDK/network/payment failure | Retry supported; no grant. |
| P05 `purchase-pending` | Pending/Ask to Buy, later approve/decline | No access while pending; reconcile eventual result for right UID. |
| P06 `purchase-success-without-access` | SDK returns success but no premium | Confirmation/recovery state; no Home, no duplicate charge prompt. |
| P07 `purchase-double-tap` | Tap repeatedly / restore while purchase busy | One serialized operation; no second checkout. |
| P08 `purchase-interrupted-before-auth` | Kill after payment before account completion | Recover transaction after Welcome; never charge twice. |
| P09 `existing-subscription-checkout` | Same Apple receipt active; attempt purchase | Already-subscribed/restore path; no false new-trial promise. |
| P10 `stale-product-handle` | Load for A then switch to B | Old handle rejected; reload plans for B. |
| R01 `restore-to-new-account` | Owned active receipt; new app account | Restore then auth/attach verification; valid entry. |
| R02 `restore-to-existing-account` | Receipt belongs checkout/A; sign into B | Supported transfer confirmed; no source proof reused as target proof. |
| R03 `restore-not-found` | No active purchases | Clear outcome, remain Paywall. |
| R04 `restore-wrong-store-account` | Billing account Y does not own X purchase | No free grant; recovery guidance. |
| R05 `restore-failure-retry` | Network/cancel/error then retry | No access on failure; correct recovery when valid. |
| R06 `restore-does-not-erase-independent-access` | A has valid account access but local store restore empty | Keep independently verified unexpired A grant; do not mask independent revocation. |
| R07 `restore-new-phone-same-uid` | No local receipt; sign into paid A | Account proof works; app/device Setup, no forced restore/purchase. |
| R08 `restore-lost-account-transfer` | Own receipt but old credentials lost; create B | Transfer only payment access, not A's data/email. |
| R09 `restore-transfer-revokes-old-owner` | Restore A's only subscription into B; refresh A | B eligible, A Paywall within stated bound. |
| R10 `passive-entry-does-not-transfer` | Welcome/identify/app switch with old store receipt | Record vendor events; no unapproved ownership churn. Device gate mandatory. |
| R11 `transfer-with-second-subscription` | A has two independently eligible subscriptions | Move only restored purchase; don't revoke A's unrelated valid entitlement. |
| R12 `restore-repeated-concurrent` | Repeat restores, simultaneous A/B attempts | Deterministic vendor/server owner and grants; no permanent duplication from race. |
| L01 `cancel-renewal-still-active` | Auto-renew off before expiry | Access continues until paid-through boundary. |
| L02 `trial-and-grace-boundaries` | Valid trial/grace then exact end time | Access only inside confirmed eligible interval. |
| L03 `expiry-while-open` | Entitlement expires in Home/builder | Replace paid routes with hard Paywall; no dismiss escape. |
| L04 `refund-revocation-transfer` | Confirm denial while main app mounted | Revoke route/command authority and reconcile native state. |
| L05 `unknown-and-offline` | Offline first entry; lost connection mid-lease | No new offline grant; no lease extension; retry after bound. |
| L06 `stale-cross-account-events` | Late A callbacks delivered after B selected | B never gains A's access. Include A→B→A generations. |
| L07 `remote-flags-not-authority` | sign-in flag false, variant error/reviewer preset | No account/payment bypass. |
| L08 `time-rollback-and-missing-expiry` | Manipulate device time; malformed/missing expiry | No fabricated lifetime access or resurrected lease. |
| G01 `all-protected-deep-links` | Enumerate Home/Conditions/Analytics/paid Settings/builder/unlock/gym routes under denied states | Same policy blocks each; no mount or side effect. |
| G02 `back-close-and-returnto` | Swipe back, Close, notification, returnTo, persisted navigation/OTA envelope | Only allowed destinations; cannot escape Paywall into tabs. |
| G03 `recovery-without-subscription` | Unpaid account opens delete/export/support/legal/manage/restore | Restricted recovery works; no premium neighbors or back-stack escape. |
| G04 `deletion-and-late-callbacks` | Delete during pending verification; deliver old auth/payment events | No resurrection; new identity unapproved; billing warning and retry behavior correct. |

Variants must cover `none`, `unknown`, `expired`, `billingIssue`, refunded/revoked and every supported provider where applicable. Generate/report these as concrete runs, not a vague “all providers tested” sentence. Deep-link coverage is generated from the actual route inventory, not this list alone. Security assertions apply to every step, not only the last screen.

### Local server proof matrix (when the verification/recovery seam changes)

Run locally with Postgres, confirm `./excer server ready`, exercise the route, and query the database after each operation. Use existing smoke infrastructure with scripted vendors, not production data.

| ID | Required assertion |
| --- | --- |
| S01 | Anonymous/canonical JWT rules and unready identity; request cannot choose another UID. |
| S02 | No bearer credential / invalid / expired / wrong issuer / deleted user denied. |
| S03 | Client-supplied UID, environment, `active`, expiry, or ownership cannot grant. |
| S04 | Production and Sandbox remain independently keyed; sandbox never authorizes production. |
| S05 | Current webhook updates; duplicate deliveries are idempotent; older events cannot revive access. |
| S06 | Profile aggregate without environment/transaction binding stays unavailable; v2 fixture schema validated. |
| S07 | Purchase/restore confirmation delay resolves without second charge; timeout remains pending. |
| S08 | Transfer A→B invalidates the correct old grant; wrong claimant rejected; concurrent attempts deterministic. |
| S09 | Refund/revocation/expiry/grace and independent second subscription produce correct effective access. |
| S10 | Tombstone/deletion race cannot recreate user or grants; retries retain durable deletion semantics. |
| S11 | Rate limits, vendor 429/500/timeout and malformed responses fail closed without account enumeration. |
| S12 | Minimal stored data and redacted logs; no raw receipts/credentials or sensitive Activity data. |

### Real-device / TestFlight acceptance (not replaceable by simulator fakes)

Use two phones where available, two ExcerLock accounts A/B, two controlled Apple sandbox billing accounts X/Y, and a third unused identity for new-account linking. Use actual Apple/Google/email providers. Record the specific Release binary and store environment. Sandbox purchases are not real revenue; production charges/dashboard changes require separate authorization.

1. **Upgrade from build 14** with saved paid session/Setup: Welcome, no forced-sign-in or Home auto-route.
2. **Delete/reinstall** with surviving Keychain/StoreKit history: same result; distinguish from a clean simulator.
3. **Full existing Onboarding with valid subscription already on device:** no step skipped; Paywall confirmation/Restore, explicit sign-in, account-bound admission.
4. **First sandbox purchase followed by new Apple account link:** verify canonical UID and vendor attribution, then Setup and Home.
5. Repeat account creation/sign-in with **Google and email-code**, including canceled native sheets and invalid codes.
6. **Welcome paid-account sign-in on phone 2**, including a different App Store account: account restores access without a new purchase; permissions/selection are requested locally.
7. **Welcome unpaid/expired account sign-in:** hard Paywall; swipe/back/deep links cannot show main tabs.
8. **Purchase → existing account conflict/recovery**, including existing account with no prior subscription: entitlement lands on the chosen account without another charge.
9. **Lost old account → Restore on owning Apple account → new account:** target gets access, former sole owner loses it after refresh; no account data merges.
10. **Wrong Apple billing account restore:** denied clearly, not mistaken for successful transfer. Independently paid app account remains recoverable by login.
11. **Passive activation/identify/renewal behavior:** observe whether Adapty moves receipt ownership before user consent. This is a release-blocking test, not a screenshot check.
12. **Same subscription purchase attempt, trial-ineligible user, upgrade/downgrade:** real localized offer and StoreKit outcome; no duplicate/trial promise.
13. **Pending/interrupted transaction and app kill after payment:** recover unfinished account connection; no orphan purchase or double charge.
14. **Sandbox expiry/refund/revocation, grace where supported:** main app closes appropriately; native schedules reconcile. If a sandbox cannot emulate a state reliably, record blocked plus the remaining validation method.
15. **Account switch/sign-out on one of two devices:** correct local data, right subscription owner, no unintended global Supabase sign-out.
16. **No-subscription deletion, support, legal, export and Manage subscription:** reachable in-app without buying; Apple cancellation is separate from deletion.
17. **Network loss before/after each external operation:** retry vs Paywall distinctions; no fresh offline admission or silently extended grant.
18. **Native Screen Time on physical device:** cold Welcome does not disable legitimate schedules; confirmed loss/switch/deletion does not leave another account's enforcement behind.

Record physical runs with redacted screenshots/video plus relevant authenticated vendor/API observations. A simulator showing “Lab annual” proves no StoreKit purchase. A signed IPA proves no account transfer. If only one phone/provider/sandbox setup is available, mark the corresponding cases **blocked** and do not claim complete coverage.

## 9. Delivery, coordination and release gates

- Keep this work separate from dirty Analytics/UI files and parked haptics/screenshot branches.
- Prefer sequential implementation until the Journey and proof contracts are settled. After that, isolated workers may own: (a) identity/subscription recovery, (b) route/screen wiring, (c) dev-harness proofs, (d) server verification if required. Each gets a worktree, worker simulator and unique Metro port. Integration owner owns shared `model`/`ports`/architecture changes.
- Start a finite proof manifest listing name, fixture variants, expected behavior, evidence, and status. Do not run an unbounded cross-product of every possible UI combination; exhaust critical state transitions and use explicit pairwise coverage for provider/device/product combinations.
- Run `./excer check` per coherent change and after integration. Run only the changed named proofs during development. The requested final Journey matrix is run once on the integrated candidate, with five-minute timeboxes and visible progress.
- Merge, push, server deployment, Adapty/Supabase/ASC dashboard changes, sandbox account operations where authorization is needed, OTA, and new TestFlight uploads remain explicit permission gates. No App Review submission is implied.
- Before release: record exact source/IPA hash, inspect signed targets, ensure prod excludes dev bypasses/fixture lab, check compatible OTA cannot replace the fix, run clean-install **and upgrade/reinstall** device paths. Document runtime/native/API compatibility before any version bump.
- New hard access policy and account/ownership changes go in a new binary; do not silently alter reviewed capabilities through remote flags or OTA.
- Rollback must never silently restore the unpaid Home bypass or change purchase ownership. Keep last known safe account recovery; stop rollout while payments remain restorable.

### Definition of done

1. Both intended Welcome entry paths match the approved contract.
2. No tested unauthenticated, unpaid, unknown, stale or wrong-account state can mount or operate the premium app.
3. Entitled account login, purchase-before-sign-in and lost-account restore all work without duplicate charging.
4. Account switching/provider linking do not transfer private data or fabricate subscription access.
5. Lapse blocks premium use, not account/privacy rights.
6. Required static, simulator, local server and real-device proofs pass with exact evidence. Anything blocked remains explicitly blocked.
7. The owner sees and accepts the actual candidate flow before another build is described as fixed. No claim of perfection beyond the observed scenarios and stated offline/vendor limits.

## 10. Work performed for this plan

Read the current code, relevant ADRs, installed SDK boundary, feature proofs, server subscription mirror, and official external sources. Performed an authenticated read-only Adapty app metadata lookup; its schema cannot establish the live sharing settings. A first local prototype adds `journey` admission, Welcome-first routing, a non-dismissible Paywall, selected-account verification after sign-in, account recovery, and several focused simulator proofs. `./excer check` passed 20/20 during implementation. Local proof evidence: `.excer/proof/launch/2026-09-29_04-23-49/`, `.excer/proof/launch/2026-09-29_04-24-15/`, `.excer/proof/launch/2026-09-29_04-24-41/`, `.excer/proof/launch/2026-09-29_04-37-52/`, `.excer/proof/paywall/2026-09-29_04-31-39/`, `.excer/proof/paywall/2026-09-29_04-37-22/`, `.excer/proof/account/2026-09-29_04-34-17/`. Two earlier paywall proofs failed during implementation and were corrected; those failures are preserved under `.excer/proof/paywall/2026-09-29_04-25-44/` and `2026-09-29_04-30-18/`.

**Release blockers remain:** Adapty real ownership/transfer behavior and configuration; online, account-bound and environment-safe verification (current SDK profile may be cached); production-vs-TestFlight sandbox authorization; multiple-account local Conditions/History isolation; interrupted checkout; local sign-out scope; full negative-route history and all 56 app cases; all 12 local-server cases; all 18 physical acceptance scenarios. Existing app proof fixtures are not realistic multi-account/store fixtures. No new release or service mutation occurred. Do not cherry-pick or ship this branch as a complete hard Paywall.
