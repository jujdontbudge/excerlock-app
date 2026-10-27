# Payments and auth rebuild

Status: decided by Johan 2026-10-26 (all recommendations, except D5: keep Google). Written 2026-10-26.
Research behind it: `01-payments.md`, `02-auth-tracking.md`, `03-edge-cases.md` in this folder.

## Why

Since September: about 200 payment and sign-in commits, 17 ADRs and roughly 5,900 lines across 67 files in `subscription`, `identity`, `journey`, `paywall` and `server/subscriptions`. Real customers still lost access. On Oct 24 a trial buyer was forced to sign in, landed on a new account, our server answered "unknown", the app retried into its own 5-per-minute limit and sent a paying customer back to the paywall. They cancelled.

The cause is the design, not one bug:

1. Two judges of "paid": Apple and Adapty on the phone, and our server's webhook mirror. When they disagreed, the server won and the app failed closed.
2. Forced sign-in right after purchase, which moved a purchase between accounts at the riskiest moment.
3. Five identity systems that had to agree before anything worked (Supabase, our API, Adapty, PostHog, Sentry), joined by a "spine" that stopped silently at the first failure.
4. A 45-product catalog in two subscription groups, trial and no-trial twins, and A/B arms.
5. Proofs ran against fakes; the real path (Apple, Adapty, webhook, server, app) was first tested by customers.

## 1. Decisions for Johan

| # | Decision | Recommendation |
|---|---|---|
| D1 | Is sign-in required? | **No.** People buy and use the app as a guest. "Save your account" (Apple or email) is offered after purchase and in Settings, never forced. Apple 5.1.1(v) points the same way. |
| D2 | Who decides Premium? | **Adapty on the phone.** `profile.accessLevels.premium.isActive`. The server keeps webhooks for support and revenue only and never blocks access. |
| D3 | What do we sell? | **Two products, trial on both**: `premium.monthly.999.t3` and `premium.annual.3999.t3`, same group, same level. One paywall, no A/B arms, no no-trial twins. Apple already sells the same product without the trial to people who used theirs. |
| D4 | Adapty "Sharing paid access between user accounts" | **Enabled** (default), production and sandbox. One Apple ID's purchase unlocks any ExcerLock account on it. |
| D5 | Google sign-in | **Keep it.** Apple, Google and email. (Johan, 2026-10-26.) |
| D6 | How it ships | **One OTA to runtime 8 only** (1.0.2 build 24), once Apple approves 1.0.2. The rebuild is JavaScript; Adapty, Supabase, PostHog and Sentry are already native in the app, and the existing fallback file still works. No backports to runtimes 4–7. If 1.0.2 is rejected, the rebuild goes into the next native build instead. |
| D7 | Session replay | **Later.** Needs a native plugin and privacy review. Events, Sentry and server logs come first. |

## 2. Design

Four deep modules. Each has a small interface; everything vendor-specific sits behind it.

### `access` (replaces `subscription`, `journey` admission, `paywall` checkout logic)

```ts
type Access = { status: 'checking' | 'active' | 'inactive'; plan: PlanInfo | null };
type Offer = { id: string; period: 'month' | 'year'; price: string; trialDays: number | null };

useAccess(): Access
loadOffers(): Promise<Offer[]>
buy(offer: Offer): Promise<'active' | 'pending' | 'cancelled' | 'failed'>
restore(): Promise<'active' | 'none' | 'failed'>
```

Rules hidden inside:
- Adapty activated once with the account id, fallback paywall registered before the first fetch, one `onLatestProfileLoad` listener, last profile cached.
- `checking` never turns into `inactive` because of a timeout, 429, offline or identity change. Only a profile that says inactive does.
- `buy` is single-flight, never retried automatically, and applies the returned profile directly.
- Trial wording comes only from the offer StoreKit returns. No `.t3` name guessing.
- Every call emits its own events (section 4). Telemetry never awaits and never blocks a purchase.

### `account` (replaces `identity`, sign-in gates, recovery journal)

```ts
type Account = { id: string; saved: 'guest' | 'apple' | 'email'; email: string | null };

useAccount(): Account
saveWithApple(): Promise<'saved' | 'existing-account' | 'cancelled' | 'failed'>
saveWithGoogle(): Promise<'saved' | 'existing-account' | 'cancelled' | 'failed'>
sendEmailCode(email: string): Promise<'sent' | 'failed'>
confirmEmailCode(code: string): Promise<'saved' | 'existing-account' | 'failed'>
useExistingAccount(): Promise<'switched' | 'failed'>
signOut(): Promise<void>
deleteAccount(): Promise<'deleted' | 'failed'>
```

Rules hidden inside:
- Guest = Supabase anonymous user. Created only when storage is confirmed empty, never because the Keychain is locked or the network is down.
- Saving keeps the same id: Apple and Google `linkIdentity` with the native id token, email `updateUser` then `verifyOtp(email_change)`. Requires real email confirmation in Supabase (turn off auto-confirm).
- If that Apple, Google or email identity already has an account (`identity_already_exists`, `email_exists`), return `existing-account`; the screen asks "Sign in to your existing account?". Switching signs in, then `adapty.identify`, then refreshes access. With D4 the Apple ID's purchase follows. Local progress and Conditions stay.
- One id everywhere: Supabase uid = Adapty `customer_user_id` = PostHog `distinct_id` = Sentry `user.id`. Identity changes run in one place, in a fixed order (see `02-auth-tracking.md` §3), and block `buy` while they run.

### `progress` (inside `onboarding`)

- Step, answers and staged plan saved on every step change; restored before the first screen renders.
- Missing or unreadable progress records a reason event; it never silently means "start at screen 1".
- Paywall Close returns to the last onboarding screen, not Welcome.

### `telemetry`

```ts
track(event: EventName, props: EventProps[EventName]): void
```

- One typed registry of allowed events and properties (section 4). No prefix filters, no global key regex.
- PostHog for the journey, Sentry for failures with `user.id` and breadcrumbs, server request logs for the API.

### Server

- Delete the admission lease path (`/v1/subscription/resync` as a gate, client lease code).
- Keep the Adapty webhook receiver as a support and revenue record keyed by Adapty profile and transaction, not only by our user id.
- Turn on Fastify request logging: request id, route, status, duration, user id. No bodies or headers.

### The gate

```ts
canEnterApp = onboardingComplete && access.status === 'active'
```

`checking` shows the last known state, never the paywall. No sign-in in the gate.

## 3. What goes away

`rememberedAdmission`, `ServerSubscriptionAdmission`, `PurchaseRecoveryJournal`, purchase preflight, journey admission and leases, `signInRequired`, the identity coordinator spine, the email `shouldCreateUser` workaround, the trial/no-trial arm assignment (ADR 0078, 0079), the `walk_places` analytics property. ADRs superseded: 0043 (sign-in part), 0049, 0050, 0059, 0061, 0078, 0079, 0086, 0087, 0088; one new ADR replaces them.

Target size: roughly 1,000–1,500 lines for all four modules, against about 5,900 today. This is an estimate to be measured after the build.

## 4. Tracking

Every event carries `event_id`, `occurred_at`, app version, build, update id, `auth_state` and `attempt_id` where relevant. No quiz answers, activities, places, steps, apps or Screen Time detail.

| Area | Events |
|---|---|
| Launch | `app_opened`, `journey_resumed` (with `resume_reason`) |
| Onboarding | `onboarding_step_viewed`, `onboarding_completed`, `onboarding_state_recovered` |
| Paywall | `paywall_viewed`, `paywall_load_completed`, `paywall_closed` |
| Purchase | `checkout_started`, `checkout_completed` (`active / pending / cancelled / failed`, vendor code) |
| Restore | `restore_started`, `restore_completed` (`active / none / failed`) |
| Account | `auth_started`, `auth_completed` (`provider`, `operation`, `result`, code) |
| Server | request log line per call; webhook log line per Adapty event |

Alerts (Sentry, to Johan): any purchase that succeeded on the phone but shows inactive after 2 minutes; any new Apple sign-in error; any API 5xx burst or 429 on a user route.

## 5. Dashboard settings (each needs Johan's go-ahead when we get there)

- Adapty: sharing = Enabled (prod and sandbox); one two-product paywall on `onboarding` and `in_app`, 100%, no experiment; regenerate the SDK 4 fallback file; webhook events per `01-payments.md` §1.
- App Store Connect: monthly `.t3` and annual `.t3` at the same level; 3-day trial on both; billing grace period 16 days.
- Supabase: anonymous sign-ins on, manual linking on, email auto-confirm off, email-change template with OTP.
- Existing Variant A subscribers keep their plans and access; they are never shown the new products.

## 6. Verification

ARCHITECTURE rule 7 stays: no unit tests. Proof is the real app.

1. **`./excer check`** on every change.
2. **Simulator proofs** (`./excer prove`) with a local StoreKit configuration for the screens and state rules: paywall renders both offers, guest purchase unlocks, relaunch keeps access, kill on each onboarding step resumes, offline launch keeps access, sign-in conflict asks before switching.
   The simulator also covers: kill mid-quiz and resume, kill on the paywall and resume, offline relaunch keeps Premium, API down doesn't block access, a used-trial Apple ID sees no trial, and every step shows up in tracking.
3. **Real-iPhone suite**, on Johan's own iPhone with a free Sandbox Apple ID (Settings → Developer). About 5 minutes. Only the parts a simulator fakes:

| # | Steps | Pass |
|---|---|---|
| 1 | Buy the trial as a guest. | Straight into Setup. No sign-in screen. |
| 2 | Settings, Save with Apple. | Same account id, still Premium. |
| 3 | Sign out, then sign in with the email of a second, existing test account. | Asked before switching; Premium follows the Apple ID; progress kept. |
| 4 | Delete the app, reinstall, tap Restore. | Premium back, no second purchase. |

Then read PostHog, Sentry and server logs for that run: every step appears with its attempt id.

Run it before the TestFlight or OTA release and before App Store submission, not on every change. Who does what: I install and launch the build (`xcrun devicectl`), read logs and dashboards, and judge pass or fail. Johan confirms each Apple purchase sheet and sign-in prompt, because Face ID and the sandbox password can't be automated.

The longer list (57 cases, including billing retry, refunds, crossgrades and Ask to Buy) is in `03-edge-cases.md`; run it before the App Store submission, not on every change.

## 7. Order of work

1. Johan decides D1–D7.
2. One ADR replacing the superseded ones.
3. Build `access`, `account`, `progress` fixes, `telemetry`, the gate and server logging in one worktree. Delete the old modules in the same branch.
4. Simulator proofs, then the real-iPhone suite.
5. Dashboard changes (with go-ahead), then the suite again against them.
6. Once 1.0.2 is approved: the phone suite on a 1.0.2 build with the new code, then an OTA to runtime 8 (with go-ahead).

## Limits

No plan can guarantee zero payment bugs. What this plan guarantees is that nothing ships until the simulator proofs and every row in section 6.3 have passed on a real iPhone against the real Apple, Adapty and Supabase setup, with the evidence recorded.
