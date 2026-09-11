# ExcerLock — Infrastructure Wiring Audit

Read-only audit. Nothing in the repo was modified.
Branch `rebuild/phase-1`. Focus: `app-next/` (active rebuild). `app/` is the older app and is the port-from source.

Legend: **(a)** fully wired and real · **(b)** stubbed/faked/demo-only · **(c)** absent.

---

## 0. Verdict table

| Area | `app-next/` today | `app/` (old, port-from source) |
|---|---|---|
| Auth / login | **(c) absent** — fake + complete UI + AsyncStorage session | **(a) real** — Clerk (`@clerk/clerk-expo ^2.19.31`), Google SSO only |
| Payments | **(c) absent SDK / (b) fake port** — custom stand-in paywall, placeholder prices | **(a) real** — Adapty `^4.0.2`, **custom paywall screen, NOT Paywall Builder** |
| OTA updates | **(c) absent + explicitly disabled** (`enabled: false`, no `runtimeVersion`) | **(b) partial** — configured, zero runtime call sites, default launch behavior only |
| Sentry | **(c) absent** — no init site exists at all | **(a) real** — `~7.11.0`, init + scrub + Metro plugin + sentry.properties |
| PostHog | **(c) absent** | **(a) real** — `^4.61.2`, explicit-only policy, one feature flag |
| PostHog ↔ Adapty | **(c) absent** — `identify()` declared, never called | **(b) partial** — registry reserves adapty-owned events; integration not yet wired |
| Env / secrets | **(c) nothing injected** | **(a) real** — `app.config.ts` extra ← EAS secrets ← `~/.excerlock/env` |

**The single most important fact:** `app-next` does not merely stub these services — none of the SDKs are dependencies. The composition root actively refuses to build a real runtime.

`app-next/src/runtime/createRuntime.ts:9-17`
```ts
export function createRuntime(mode = process.env.EXPO_PUBLIC_RUNTIME): Runtime {
  if (mode === 'real') throw new Error('Real runtime is unavailable in Phase 1');
  const runtime = FakeRuntime();
  if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
    runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
    if (Constants.isDevice) runtime.gait = nativeGait() ?? runtime.gait;
    runtime.support = supportDelivery(runtime.support);
  }
  return runtime;
}
```
`app-next/src/runtime/Runtime.ts:15-16` — `export type Runtime = { readonly kind: 'fake'; ... }`. The type itself forbids a real runtime.

`app-next/README.md:13` states it: *"No real authentication, purchases, permission requests, backend or Screen Time enforcement are implemented. Phase 2 has not started."*

**Verification method.** A full sweep of `app-next` for `adapty|@sentry|posthog|supabase|expo-updates|revenuecat|clerk`, excluding `node_modules`, `Pods`, `build`, `dist`, `coverage`, `.expo`, `.git`, returns exactly **three files, all prose or fixtures**:
- `app-next/src/features/subscription/README.md`
- `app-next/src/ports/README.md`
- `app-next/src/content/subscription.ts`

Three native-adapter exceptions exist and are the *only* real IO in `app-next`, none of them infrastructure: `ForegroundGym.ts` + `NativePlaceSearch.ts` (Apple MapKit local search via the `ExpoLocalSearch` native module), `NativeGait.tsx` (`ExcerlockGaitVision` Vision module), and `SupportDelivery.ts` (a `mailto:` handoff via `Linking.openURL`).

---

# PART A — `app-next/` current state

## A1. Auth / login — (c) ABSENT, UI fully built

### Port contract
`app-next/src/ports/AuthPort.ts:1-12`
```ts
import { Session } from '../domain/types';
import { Unsubscribe } from './models';
export interface AuthPort {
  session(): Session;
  signInWithApple(): Promise<Session>;
  signInWithGoogle(): Promise<Session>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  subscribe(callback: (session: Session) => void): Unsubscribe;
}
```
Note this is **broader than the old app**, which shipped Google SSO only. The port already anticipates Apple + Google + email OTP.

### The only implementation is a fake
`app-next/src/demo/fakes/AuthFake.ts:1-39` — the complete file:
```ts
export function AuthFake(ctx: FakeContext): AuthPort {
  let email = 'alex@example.test';
  const session = () => sessionStore.getState().data.session;
  const signIn = async (provider: 'apple' | 'google' | 'email'): Promise<Session> => {
    if (ctx.result() === 'cancel') return session();
    const next: Session = { kind: 'signedIn', provider, email };
    sessionStore.getState().patch({ session: next });
    ctx.log('signed_in', { provider });
    return next;
  };
  return {
    session,
    signInWithApple: () => signIn('apple'),
    signInWithGoogle: () => signIn('google'),
    sendEmailCode: async (value) => {
      ctx.result();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
      email = value;
      ctx.log('email_code_sent');
    },
    verifyEmailCode: async (code) => {
      if (code !== '123456') throw new Error('Invalid code');
      return signIn('email');
    },
    signOut: async () => {
      ctx.result();
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
    },
    deleteAccount: async () => {
      ctx.result();
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
      ctx.log('account_deleted');
    },
    subscribe: (callback) => sessionStore.subscribe((s) => callback(s.data.session)),
  };
}
```
Sign-in is a local object mutation. The email OTP code is the hardcoded literal `'123456'` (`:26`). No network call of any kind.

### Where the session lives and how it is persisted
`app-next/src/state/sessionStore.ts:1-8`
```ts
export const sessionStore = createPersistedStore<{ session: Session }>(
  'session',
  { session: { kind: 'anonymous' } },
  { session: (value) => v.session(value) || v.signedIn(value) },
);
```
→ `app-next/src/state/createPersistedStore.ts:17-33` — zustand `persist` middleware over **AsyncStorage**, key `excerlock-next.session.v1` (`:25`), with a `merge` that re-validates every persisted field against the declared validators (`:28-31`) so corrupt or hostile stored data falls back to defaults.

**Flag:** the Phase 2 plan explicitly forbids this storage path for real tokens — `plans/rebuild/phase-2-backend/P2-T01-supabase-auth.md:14-15`: *"`expo-secure-store` for the refresh token; AsyncStorage is not acceptable for tokens"*. `expo-secure-store` is **not** an `app-next` dependency (the old app has it). This is a concrete, unstarted prerequisite.

### Login screen — yes, fully built
Route: `app-next/app/sign-in.tsx:1-14` (mounted as a `fullScreenModal`, `RootNavigator.tsx:37`).
Screen: `app-next/src/features/setup/SignInScreen.tsx`.
- Three-phase state machine `'options' | 'email' | 'code'` (`:14`).
- Provider buttons at `:95-104` — Apple primary, Google secondary, email secondary.
- Dispatch at `:26-31`:
```ts
const result =
  provider === 'apple'
    ? await runtime.auth.signInWithApple()
    : provider === 'google'
      ? await runtime.auth.signInWithGoogle()
      : await runtime.auth.verifyEmailCode(code);
```
- Email validation regex `:20`; OTP handoff to `EmailCodeScreen` (`:66-74`) with resend support (`:46`).
- Already-signed-in short-circuit at `:54-62`.
- **"Skip for now" escape hatch at `:126`** — auth is optional by design.

### Account deletion — UI yes, backend no
Route `app-next/app/settings/account.tsx:1-6` → `app-next/src/features/settings/AccountScreen.tsx`.
- `:15-28` the shared action handler:
```ts
const action = async (deleting: boolean) => {
  setBusy(true);
  try {
    if (deleting) {
      await runtime.auth.deleteAccount();
      setNote(c.deleted);
    } else await runtime.auth.signOut();
    setConfirm(false);
  } catch {
    setNote(c.error);
  } finally {
    setBusy(false);
  }
};
```
- Confirmation `BottomSheet` at `:32-46`, rendering `c.deleteFacts` — a five-point explanation of consequences — before `PrimaryButton label={c.deleteConfirm}` and a `SecondaryButton label={c.keepAccount}` escape.
- Signed-out vs signed-in branch at `:55-64`.

The fake's `deleteAccount` (`AuthFake.ts:33-37`) only resets the local store.

**App Store risk assessment:** currently **nil**, because no real accounts exist — Apple's deletion requirement (Guideline 5.1.1(v)) binds only where the app creates accounts. It becomes load-bearing the moment P2-T01 lands. The UI and copy are already in place, so the remaining work is wiring `deleteAccount()` to the server's authenticated `DELETE /v1/user`, which already exists in the old app.

### Sign-out
`AccountScreen.tsx:21` and `:60`; fake at `AuthFake.ts:29-32`. Note the local-first law inherited from the old app (`app/src/account/README.md:33-41`): signing out clears only the session, never product data.

### How auth relates to entitlement — **completely decoupled**
Route guards read entitlement **only**. `app-next/src/features/launch/RootNavigator.tsx:11-13`:
```ts
const status = useEntitlementStore((s) => s.data.entitlement.status),
  onboarding = useOnboardingStore((s) => s.data),
  entitled = status === 'trial' || status === 'active';
```
and the guard stack at `:25-41`:
```tsx
<Stack.Protected guard={loading || (!onboarding.complete && onboarding.step !== 'P' && !entitled)}>
  <Stack.Screen name="onboarding/[step]" />
</Stack.Protected>
<Stack.Protected guard={loading || !entitled}>
  <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
</Stack.Protected>
<Stack.Protected guard={loading || (entitled && !onboarding.setupComplete)}>
  <Stack.Screen name="setup/[step]" />
</Stack.Protected>
<Stack.Protected guard={loading || (entitled && onboarding.setupComplete)}>
  <Stack.Screen name="(tabs)" />
  ...
</Stack.Protected>
```
`session` is never consulted. You can be **anonymous and fully entitled**. Boot destination likewise: `app-next/src/features/launch/BootGate.tsx:13` — `bootDestination(complete, step, entitlement.status, setupComplete, setupStep)`; no session argument.

**The identity spine is missing entirely.** `SubscriptionPort.identify()` and `AnalyticsPort.identify()` are declared but have **zero call sites** in product code. Grepping `\.identify(` across `app-next/src` and `app-next/app` excluding tests returns only the two `AccountScreen.tsx` auth lines. Nothing links a session to Adapty's `customer_user_id` or PostHog's `distinct_id`. P2-T18 §2 is the task that introduces `IdentityBridge` to fix this.

### Provider direction
- Old app: **Clerk**, Google SSO only.
- Plan: **Supabase** (`docs/audit/phase2.md:97`; task P2-T01). Auth only — no Supabase tables, no RLS, no Edge Functions (`P2-T01:5`).
- A Supabase project **is provisioned and linked**: `supabase/.temp/linked-project.json` → `{"ref":"hqgqhefftjxwdhqeushr","name":"excerlock","organization_id":"iymnfgpeijcprowoovci"}`.
- Supabase + Google OAuth credentials were added to `~/.excerlock/env` on 2026-09-07.

**Repo hygiene flag:** `@supabase/supabase-js@2.116.0` sits in root `node_modules` but `npm ls` reports it **`extraneous`** — no workspace `package.json` declares it and no source file imports it. Harmless today, but it will silently satisfy an `import ... from '@supabase/supabase-js'` in `app-next` without the dependency being declared, then break on a clean install or in CI.

---

## A2. Payments — (c) ABSENT SDK, (b) fake port, custom stand-in paywall

### No Adapty in `app-next`
- `react-native-adapty` is **not** in `app-next/package.json`. It resolves from root `node_modules` only because the old `app/` workspace declares `^4.0.2`.
- No Adapty pod in `app-next/ios/Podfile.lock` (302 pods, zero Adapty).
- No `react-native-adapty` config plugin in `app-next/app.json` (the old app has one at `app/app.json:84`).

### Port contract
`app-next/src/ports/SubscriptionPort.ts:1-12`
```ts
import { Entitlement } from '../domain/types';
import { Unsubscribe } from './models';
export type TrialOffer = { trialDays: number; reminderDaysBefore: number; label: string };
export type SubscriptionEntitlement = Entitlement & { offer: TrialOffer };
export interface SubscriptionPort {
  entitlement(): SubscriptionEntitlement;
  presentPaywall(placement: string): Promise<Entitlement>;
  restore(): Promise<Entitlement>;
  identify(userId: string): void;
  reset(): void;
  subscribe(callback: (entitlement: Entitlement) => void): Unsubscribe;
}
```

### Fake implementation
`app-next/src/demo/fakes/SubscriptionFake.ts:5-32` — `presentPaywall` fabricates a trial 7 days out from the fake clock (`:11-14`); `restore` reads a dev-menu toggle rather than any store (`:22-25`):
```ts
const next =
  ctx.snapshot().restoreOutcome === 'restored'
    ? { status: 'active' as const, renewsAt: new Date(Date.parse(ctx.clock.now()) + 30 * 86400000).toISOString() }
    : { status: 'none' as const, renewsAt: null };
```
`identify` (`:29`) merely writes to the dev event log: `identify: (id) => ctx.log('subscription_identify', { id })` — and, as established above, is never called.

### Paywall rendering — **custom in-app stand-in, NOT Adapty's remote Paywall Builder**
`app-next/app/paywall.tsx:1` — `export { PaywallSlot as default } from '../src/features/subscription/PaywallSlot';`

`app-next/src/features/subscription/README.md:3` is explicit: *"`PaywallSlot` supplies a local stand-in until Phase 2 mounts Adapty Paywall Builder. It serializes actions, presents an 800 ms busy state and reports cancel/error/not-found without granting access. Only the fake port changes entitlement."*

`PaywallSlot.tsx:25-44` is the controller — a re-entrancy guard, a mounted-ref to avoid setState-after-unmount, a hardcoded delay standing in for StoreKit, then the port call:
```ts
const run = async (kind: 'purchase' | 'restore') => {
  if (running.current) return;
  running.current = true;
  setBusy(kind);
  setError('');
  try {
    await new Promise((resolve) => setTimeout(resolve, t.motion.duration.purchase));
    if (!mounted.current) return;
    const next =
      kind === 'purchase'
        ? await runtime.subscription.presentPaywall(setupComplete ? 'in_app' : 'onboarding')
        : await runtime.subscription.restore();
    if (!['trial', 'active'].includes(next.status)) setError(kind === 'restore' ? c.notFound : c.cancelled);
  } catch {
    if (mounted.current) setError(c.error);
  } finally {
    running.current = false;
    if (mounted.current) setBusy(null);
  }
};
```
`PaywallStandIn.tsx` is the pure presentational component — plan `ChoiceRow`s, `PrimaryButton`, restore `SecondaryButton`, alert-role error `Label`.

**Placements are already correct.** `PaywallSlot.tsx:35` passes `setupComplete ? 'in_app' : 'onboarding'` — exactly the two Adapty placements configured in the dashboard.

### Product IDs — **none exist**
`app-next/src/content/subscription.ts:1` — `// Phase 1 offer fixture only. Phase 2 must read Adapty's real offer and prices.`
`:26-30`:
```ts
plans: [
  { id: 'annual', title: 'Annual', price: '$–.–– / year · 7-day free trial' },
  { id: 'monthly', title: 'Monthly', price: '$–.–– / month' },
  { id: 'lifetime', title: 'Lifetime', price: '$–.–– once' },
],
```
Cosmetic ids only, and **prices are literal en-dash placeholders**. `fakeOffer` at `:2` — `{ trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' }`.

Note the `lifetime` plan: P2-T06's audit amendment (`P2-T06:48`) says **"no Lifetime SKU (B35)"** and P2-T18 §3 says to remove it. The Phase 1 fixture is already out of step with the current decision.

### Entitlement checks and storage
`app-next/src/state/entitlementStore.ts:4-13` — persisted to AsyncStorage under `excerlock-next.entitlement.v1`, statuses `unknown|none|trial|active|expired|billingIssue`, with `renewsAt` validated as nullable ISO.

**This means entitlement is currently client-writable local state** — appropriate for a Phase 1 demo, but it is the thing Adapty must become authoritative over.

### Restore purchases — two surfaces, both wired to the port
1. Paywall — `PaywallStandIn.tsx:31`.
2. Settings — `SubscriptionScreen.tsx:16-27`, mapping the result to copy:
```ts
const result = await runtime.subscription.restore();
setNote(['trial', 'active'].includes(result.status) ? c.restored : c.noRestore);
```

### "Manage subscription" row — **real and functional today**
`app-next/src/features/settings/SubscriptionScreen.tsx:28-35`
```ts
const manage = async () => {
  try {
    if (Constants.isDevice) await Linking.openURL(appStoreSubscriptionsUrl);
    else setNote(subscriptionCopy.manageFallback);
  } catch {
    setNote(subscriptionCopy.manageFallback);
  }
};
```
`appStoreSubscriptionsUrl` = `https://apps.apple.com/account/subscriptions` (`content/subscription.ts:53`). The simulator fallback copy (`:48-49`) is unusually careful: *"Change or cancel in Settings → Apple Account → Subscriptions. TestFlight sandbox subscriptions aren't listed there and end on their own."* This row needs no Phase 2 work.

Rows rendered at `SubscriptionScreen.tsx:39-50`: plan + renewal, Manage, Restore.

### Purchase error handling
`PaywallSlot.tsx:37-43` distinguishes cancel / error / not-found. Copy at `content/subscription.ts:36-43`, including `expired` and `billingIssue` banners surfaced via `PaywallSlot.tsx:45`:
```ts
const banner = status === 'expired' ? c.expired : status === 'billingIssue' ? c.billingIssue : '';
```

---

## A3. OTA updates — (c) ABSENT, and explicitly disabled

- `expo-updates` is **not** in `app-next/package.json`. (Old app: `~57.0.11`.)
- `app-next/app.json:44-47` contains an `updates` block that is **switched off**:
```json
"updates": {
  "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2",
  "enabled": false
}
```
- **No `runtimeVersion` key at all** in `app-next/app.json`. The old app pins `{"policy": "appVersion"}`.
- Generated native config confirms the disable — `app-next/ios/ExcerLock/Supporting/Expo.plist`:
```xml
<key>EXUpdatesCheckOnLaunch</key><string>ALWAYS</string>
<key>EXUpdatesEnableBsdiffPatchSupport</key><true/>
<key>EXUpdatesEnabled</key><false/>
<key>EXUpdatesLaunchWaitMs</key><integer>0</integer>
<key>EXUpdatesURL</key><string>https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2</string>
```
- **No `expo-updates` pod** in `app-next/ios/Podfile.lock`. The only match is `EXUpdatesInterface (57.0.1)` — a transitive *interface* pod pulled in by `expo-dev-client` / expo-modules-core, not the updates runtime. Verified: no `- EXUpdates (` entry, no `expo-updates/ios` podspec path.
- **No `eas.json` anywhere in `app-next/`.** The repo's only copy is `app/eas.json`.
- **Zero runtime code.** No `checkForUpdateAsync`, `fetchUpdateAsync`, `reloadAsync`, or `useUpdates` in `app-next`. No update UI, no "restart to apply" prompt.
- Note `app-next/.gitignore:40-41` ignores `/ios` and `/android` — the native project is generated from `app.json`, so `Expo.plist` is a faithful reflection of `enabled: false`, not a stale artifact.

---

## A4. Sentry — (c) ABSENT

- `@sentry/react-native` is **not** in `app-next/package.json`. (Old app: `~7.11.0`.)
- **No `Sentry.init` anywhere**, and structurally there is nowhere for it to run: `app-next/package.json` sets `"main": "expo-router/entry"` directly. There is no custom entry module. The old app exists precisely to solve this — `app/index.ts` imports Sentry first, initializes, then `require("expo-router/entry")` last.
- **No Sentry config plugin** in `app-next/app.json`. The old app has `["@sentry/react-native", { "organization": "edge-ix", "project": "excerlock-mobile" }]`.
- **No Metro plugin.** `app-next/metro.config.js:1-7` uses the plain Expo default config (plus a blockList for evidence/build dirs). The old app uses `getSentryExpoConfig`.
- **No sourcemap upload.** `app/ios/sentry.properties` exists for the old app only; nothing equivalent in `app-next`, and no EAS build hook anywhere in the repo (`grep eas-build` over both `package.json` files returns nothing).

---

## A5. PostHog — (c) ABSENT

- `posthog-react-native` is **not** in `app-next/package.json`. (Old app: `^4.61.2`.)
- **No feature flags, no experiments, no A/B code** of any kind in `app-next`.
- **Event taxonomy exists but is unused by `app-next`.** `packages/analytics-events` is a real workspace package with a typed registry — but `app-next/package.json` does not depend on it.
- `app-next` emits **bare strings** through the fake. 21 `analytics.track` / `analytics.screen` call sites in product code, e.g.:
  - `src/features/subscription/PaywallSlot.tsx:20` — `runtime.analytics.screen('P')`
  - `src/features/unlock/GymUnlockScreen.tsx:35,39`
  - `src/features/unlock/TreadmillUnlockScreen.tsx:24,30,40,44,48,63`
  - `src/features/unlock/useGymUnlock.ts:57,81,92,109,117`
  - `src/features/home/gymPresenceSync.ts:47`
- They land in `app-next/src/demo/fakes/AnalyticsFake.ts:3-10`, which appends to an in-memory dev ring buffer:
```ts
export function AnalyticsFake(ctx: FakeContext): AnalyticsPort {
  return {
    track: ctx.log,
    screen: (name) => ctx.log('screen', { name }),
    identify: (id) => ctx.log('identify', { id }),
    reset: () => ctx.update({ events: [] }),
  };
}
```
Visible in the dev menu (`excerlock://dev`), never transmitted.

**Consequence:** the event names currently emitted by `app-next` are unvalidated free strings. Adopting `packages/analytics-events` will force a rename pass across all 21 sites — P2-T07 step 1 enumerates exactly that.

---

## A6. Analytics ↔ Adapty plumbing — (c) ABSENT

Nothing exists in `app-next`. `subscription.identify()` and `analytics.identify()` are declared on the ports and never called anywhere. There is no attribution code, no shared distinct-id, no `setIntegrationIdentifier`.

---

## A7. Env / secrets — (c) NOTHING INJECTED

Only three `process.env` reads exist in all of `app-next`, none of them a secret:
- `src/runtime/createRuntime.ts:9` — `EXPO_PUBLIC_RUNTIME`
- `src/runtime/createRuntime.ts:12` — `NODE_ENV`
- `src/motion/haptics.ts:9` — `NODE_ENV`

No `.env` file. **No `app.config.js` / `app.config.ts`** — only static `app.json`, whose `extra` carries just the EAS `projectId`. `app-next/.gitignore:34` ignores `.env*.local` but no such file is present.

---

# PART B — `app/` (old app): the port-from source, in detail

## B1. Adapty — what it actually does today

**Version** `react-native-adapty ^4.0.2` (`app/package.json`). Config plugin registered at `app/app.json:84`, deliberately ordered **before** `./plugins/withScreenTimeExtensionValidation`, which is asserted by a test (`app/src/updates/__tests__/configuration.test.ts:27-40`).

### Init site and key source
Activation is lazy, triggered from the app entry. `app/index.ts:27` — `getSubscriptionModule();`

Composition root `app/src/subscription/accessor.ts:34-54`:
```ts
export function getSubscriptionModule(): SubscriptionModule {
  subscriptionModule ??= createSubscriptionModule(readSubscriptionRuntime());
  return subscriptionModule;
}

export function createSubscriptionModule(runtime, sdk?): SubscriptionModule {
  if (runtime.nodeEnv === "test") return new MockSubscriptionModule();
  if (!shouldUseAdaptySubscriptionModule(runtime)) return new NoopSubscriptionModule();
  const apiKey = runtime.adaptyKey?.trim();
  if (!apiKey) throw new Error("Unreachable Adapty key state");
  const nativeSDK = sdk ?? loadAdaptySDK();
  return new AdaptySubscriptionModule(apiKey, nativeSDK);
}
```
Three-way build selection: **test → Mock**, **keyless → Noop (always locked, never throws)**, **keyed → Adapty**.

Key source, `accessor.ts:141-155`:
```ts
function readSubscriptionRuntime(): SubscriptionRuntime {
  const extra = Constants.expoConfig?.extra as
    | Readonly<{ clientSubscription?: Readonly<{ adaptyKey?: unknown }> }>
    | undefined;
  const configuredKey = extra?.clientSubscription?.adaptyKey;
  return {
    nodeEnv: process.env.NODE_ENV,
    adaptyKey: typeof configuredKey === "string" ? configuredKey : process.env.EXPO_PUBLIC_ADAPTY_KEY,
  };
}
```
`app.config.ts` extra first, `EXPO_PUBLIC_ADAPTY_KEY` as fallback. SDK is `require`d lazily (`:157-160`) so a keyless build never loads the native module.

Activation itself, `AdaptySubscriptionModule.ts:27-41`:
```ts
public constructor(apiKey: string, private readonly sdk: AdaptySDKPort) {
  this.ready = this.sdk
    .activate(apiKey, { __ignoreActivationOnFastRefresh: true })
    .then(() => {
      this.sdk.addEventListener("onLatestProfileLoad", (profile) => {
        this.publishEntitlement(profile);
      });
    })
    .catch(() => {
      // Subscription startup is fail-closed: callers stay locked, never crash.
    });
}
```
Every public method `await this.ready` first, so activation failure degrades to "locked" rather than throwing.

### **Paywall Builder: NOT used — this is a custom screen**
Confirmed by grep across all of `app/`: **zero** occurrences of `createPaywallView`, `@adapty/react-native-ui`, `adapty-ui`, `AdaptyPaywallView`, or `PaywallView`.

The old app uses **Adapty for the offer, its own React Native components for the UI**:
1. `getFlow(placement)` → `getPaywallProducts(flow)` (`AdaptySubscriptionModule.ts:71-72`).
2. `adaptyPaywallConfig()` translates the response into a vendor-free `SubscriptionPaywallConfig` (`adaptyPaywall.ts:24-41`).
3. Copy comes from **Adapty remote config**, `adaptyPaywall.ts:43-54`:
```ts
function paywallCopy(flow: AdaptyFlow): PaywallCopy {
  const data = flow.remoteConfigs?.[0]?.data;
  return Object.freeze({
    title: stringValue(data, "title") ?? flow.name,
    body: stringValue(data, "body") ?? "",
    valueStatement: stringValue(data, "valueStatement") ?? "",
    plansTitle: stringValue(data, "plansTitle") ?? "Choose a plan",
    trialStatement: stringValue(data, "trialStatement"),
    defaultProductId: stringValue(data, "defaultProductId"),
    productBadges: stringRecordValue(data, "productBadges"),
  });
}
```
4. `SubscriptionPaywall.tsx` renders it; `PaywallProductOption.tsx` renders a plan row.
5. Product shape derived from the SDK, `adaptyPaywall.ts:56-96` — localized price + period label, trial days computed from the `free_trial` offer phase, `durationDays` from the subscription period, `isDefault` from remote config's `defaultProductId`, badge from the `productBadges` map.

`app/src/subscription/README.md` records the law: *"Product count, order, identifiers, localized prices, billing periods, descriptions, and trial periods always come from Adapty's placement response. Missing remote badges stay absent; the app never synthesizes scarcity copy."*

**This is the single biggest divergence between what exists and what is planned.** P2-T06 decision C6 switches to the **Paywall Builder** (`createPaywallView`), which makes `adaptyPaywall.ts`, `SubscriptionPaywall.tsx`, and `PaywallProductOption.tsx` **rewrite, not port**.

### Access level and product IDs
Single access level **`premium`**. `adaptyEntitlement.ts:8-25`:
```ts
export function entitlementFromAdaptyProfile(profile: AdaptyProfile): PremiumEntitlement {
  const access = profile.accessLevels?.premium;
  return access?.isActive === true
    ? activeEntitlement(access)
    : Object.freeze({ status: "inactive" as const });
}

function activeEntitlement(access): ActivePremiumEntitlement {
  return Object.freeze({
    status: "active",
    productId: access.vendorProductId,
    purchasedAtMs: (access.startsAt ?? access.activatedAt).getTime(),
    renewsAtMs: access.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
  });
}
```
Note: only a binary `active` / `inactive`. There is **no** `expired`, `billingIssue`, `trial`, or `grace` mapping — `app-next`'s six-state `Entitlement` is richer, and P2-T06 step 5 requires the new adapter to map all of them.

**Product catalog** (`app/src/subscription/README.md`, "App Store Connect handoff"):

| Subscription group | Product identifier | Duration | Starting offer |
|---|---|---:|---|
| Premium — Variant A | `com.johansardar.excerlock.premium.a.annual` | 1 year | $59.99, 7-day trial |
| Premium — Variant A | `com.johansardar.excerlock.premium.a.monthly` | 1 month | $9.99, no trial |
| Premium — Variant A | `com.johansardar.excerlock.premium.a.winback.annual` | 1 year | $29.99, 7-day trial |
| Premium — Variant B | `com.johansardar.excerlock.premium.b.annual` | 1 year | $79.99, 7-day trial |
| Premium — Variant B | `com.johansardar.excerlock.premium.b.monthly` | 1 month | $12.99, no trial |
| Premium — Variant B | `com.johansardar.excerlock.premium.b.winback.annual` | 1 year | $39.99, 7-day trial |

*"There is no weekly or lifetime product. Keeping variants in separate groups is what lets Adapty own the price experiment."* The app embeds none of these ids — the placement response is authoritative.

**Live dashboard state** (`P2-T06:50-57`, set up via the `adapty` CLI on 2026-09-07): app `ExcerLock` `9b8a6cf2-22c5-46f9-b938-35c27da2c66f`; access level `premium` `b95ba4b6-812e-4ce4-b2ac-8416006bc40a`; six products bound; paywalls `Premium A` f3933bd1, `Premium B` 28df5bcc, `Win-back A` 14ae444b, `Win-back B` 6e176aef; placements `onboarding` and `in_app` both serve `Premium A`, `winback` serves `Win-back A`. **Paywall Builder designs are still empty, and App Store products are in `MISSING_METADATA`.**

### `identify()` usage
`AdaptySubscriptionModule.ts:53-62`:
```ts
/** Post-purchase Clerk handoff; activation itself deliberately stays anonymous. */
public async identifyCustomer(customerUserId: string): Promise<void> {
  await this.ready;
  await this.sdk.identify(customerUserId);
}

public async resetCustomer(): Promise<void> {
  await this.ready;
  await this.sdk.logout();
}
```
Called through `accessor.ts:56-72` — `identifySubscriptionCustomer()` *"Called by the account seam immediately after post-purchase Clerk sign-up"* and `resetSubscriptionCustomer()` *"Clears the deleted Clerk id from Adapty without cancelling Apple billing."*

The old model: **Adapty activates anonymously, purchase completes without an account, and only then is the Clerk id attached.** P2-T06 step 3 **inverts** this — `identify(supabaseUid)` on *every* session including anonymous, because Supabase gives an identity spine from first launch.

### Restore flow
`AdaptySubscriptionModule.ts:133-172`. Three outcomes: `restored` (active entitlement), `notFound` (`no_previous_purchase`, *"No previous purchase was found."*), `failed` (`restore_failed`). **Note a live bug relative to current decisions:** `:148-153` publishes the inactive entitlement on the not-found path, i.e. a restore that finds nothing **downgrades** a live entitlement. P2-T06's audit amendment (`:43`) and P2-T18 §1 both explicitly forbid this (finding 12). Do not port that branch as-is.

### Every error path
| Path | Code | Message | Site |
|---|---|---|---|
| Activation failure | — | silent; stays locked | `:38-40` |
| `getProfile` failure | — | cached snapshot stays authoritative | `:47-49` |
| Placement load failure | `paywall_load_failed` | "Plans are temporarily unavailable." | `:87-96` |
| Purchase — user cancelled | — | idle intent, `{status:'cancelled'}` | `:111-113` |
| Purchase — pending | `purchase_failed` | "Purchase is pending approval." | `:115-116` |
| Purchase — no entitlement | `purchase_failed` | "Premium access was not activated." | `:119-121` |
| Purchase — thrown | `purchase_failed` | "The purchase could not be completed." | `:128-130` |
| Restore — none found | `no_previous_purchase` | "No previous purchase was found." | `:144-153` |
| Restore — thrown | `restore_failed` | "The restore could not be completed." | `:161-171` |
| Keyless build | all three codes | "Subscriptions are unavailable in this build." | `NoopSubscriptionModule.ts:52-54` |
| `logShowFlow` failure | — | swallowed; *"best-effort and never blocks the paywall"* | `:84-86` |
| Purchase with unloaded product | throws | "A loaded paywall product is required for purchase" | `:102-103` |

### `getPaywall` timeouts and offline — **the honest answer: neither is handled**
There is **no timeout, no `AbortSignal`, no retry-with-backoff, and no reachability check** anywhere in `app/src/subscription/`. Grepping the directory for `timeout|offline|NetInfo|AbortSignal` returns only two prose comments.

What actually happens offline: `getFlow` rejects → the `catch` at `:87-96` publishes `{status:'error', placement, error}` → the UI renders `PaywallLoadError.tsx` — a "Plans couldn't load" screen with a **"Try again"** button, an optional **"Back"**, and an optional **"Continue without a plan"** whose comment (`PaywallLoadError.tsx:9-14`) explains itself:

> *"Escape hatch for a caller whose flow cannot end here. Onboarding supplies it because a keyless or offline build errors on every load, and a step that can never succeed would otherwise trap the user before completion."*

So the offline strategy is **manual retry plus a hard-paywall escape hatch**, not a timeout or a cached offer. `fallbackPaywall.ts` defines `FALLBACK_ONBOARDING_PAYWALL` (annual `excerlock_annual` $59.99/yr 7-day trial, default; monthly `excerlock_monthly` $9.99/mo) — but grep shows it is **not referenced by `AdaptySubscriptionModule`**; it feeds the Mock. P2-T06 step 4 makes bundling it real, and the audit amendment (`:47`) adds a proper offline branch via a new `ReachabilityPort` (P2-T18 §4).

`README.md:117-120` is candid: *"No real StoreKit sandbox purchase has been made from this implementation, and no entitlement has been observed round-tripping through Adapty. A dashboard fallback export and offline product behavior also require verification."*

### Webhook config
Server-side, and it exists:
- Route `server/src/routes/adaptyWebhook.ts:30` — `app.post("/webhooks/adapty", ...)`.
- `server/src/routes/README.md:119` — *"`POST /v1/webhooks/adapty` is the other intentional public exception."*
- Auth `server/src/env.ts:31,118` — `ADAPTY_WEBHOOK_SECRET` → `adaptyWebhookAuth`. `server/src/subscriptions/README.md:35`: *"The receiver fails closed with `503` until `ADAPTY_WEBHOOK_SECRET` is set."*
- Storage `server/src/db/schema.ts:211` — `adaptySubscriptionStates = pgTable("adapty_subscription_states", ...)`; `server/src/db/README.md:28` — *"mirrors only current access for active users."* Listed in `server/src/db/readiness.ts:10`.
- `ADAPTY_SECRET_KEY` is server-only and never enters the bundle (`app/src/subscription/README.md`).

P2-T06 states the server webhook is **unchanged** by Phase 2.

---

## B2. OTA / expo-updates

### `app/app.json` (old) — updates block, verbatim
```json
"runtimeVersion": {
  "policy": "appVersion"
},
"updates": {
  "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2"
}
```
`enabled` is omitted, i.e. **defaults to true**.

### `app-next/app.json` (new) — updates block, verbatim
```json
"updates": {
  "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2",
  "enabled": false
}
```
**Confirmed: `enabled: false`, and no `runtimeVersion` key at all.** Same EAS project id in both.

### `runtimeVersion` policy comparison
| | `app/` | `app-next/` |
|---|---|---|
| policy | `appVersion` | **absent** |
| `updates.enabled` | omitted (true) | **`false`** |
| `updates.url` | u.expo.dev/9a35… | u.expo.dev/9a35… (same) |
| `version` | `0.0.0` | `1.0.0` |

### `eas.json` — lives only at `app/eas.json`, verbatim
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_E2E": "0"
      },
      "ios": {
        "simulator": false
      }
    },
    "e2e": {
      "withoutCredentials": true,
      "env": {
        "EXPO_PUBLIC_E2E": "1"
      },
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```
Channels: `preview` → `preview`, `production` → `production`. `development` and `e2e` have **no channel**. There is **no `submit` section** and **no `env` block declaring EAS secrets** on preview or production.

### Every `expo-updates` runtime call site — **there are none**
Grep for `expo-updates|checkForUpdateAsync|fetchUpdateAsync|reloadAsync|useUpdates|Updates\.` across `app/src`, `app/app`, `app/index.ts`, `app/plugins` returns **zero matches**.

`app/src/updates/` contains only `README.md` and `__tests__/configuration.test.ts` — no source file. The README (`:3-9`) explains why:

> *"ExcerLock uses Expo Updates' default launch behavior: release builds check the linked EAS Update service when the app starts, download a compatible update in the background, and apply it on the next restart. Compatibility is derived from the public app version. Every native dependency or native-module change therefore requires a new app version and store binary before JS using that native surface may be published as an OTA update."*

Publishing convention (`:18-22`): `eas update --channel preview --environment preview`; promote only the same verified commit to production. **No update UI, no forced reload, no "update available" prompt.**

The config test (`app/src/updates/__tests__/configuration.test.ts:5-25`) asserts:
```ts
expect(appConfig.expo.runtimeVersion).toEqual({ policy: "appVersion" });
expect(appConfig.expo.updates.url).toMatch(/^https:\/\/u\.expo\.dev\/[0-9a-f-]{36}$/);
expect(appConfig.expo.extra.eas.projectId).toMatch(/^[0-9a-f-]{36}$/);
expect(easConfig.build.preview).toMatchObject({ channel: "preview", distribution: "internal" });
expect(easConfig.build.production).toMatchObject({ channel: "production" });
expect(appConfig.expo.plugins.at(-1)).toBe("./plugins/withScreenTimeExtensionValidation");
```
**`app-next` would currently fail the first two of these.**

### Update code signing — none
Grep for `codeSigning|code-signing|certificate` in `app/app.json` and `app/eas.json` returns nothing. No `expo-updates` code signing configured in either app.

---

## B3. Sentry (old app)

### Init site — first import, before the router
`app/package.json` sets `"main": "index.ts"` (not `expo-router/entry`), specifically to own init order. `app/index.ts:1-29` in full:
```ts
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import { analytics, initializePostHog } from "./src/analytics";
import { buildSentryOptions, readClientObservabilityConfig } from "./src/observability";
import { getSubscriptionModule } from "./src/subscription";

const runtimeConfig = readClientObservabilityConfig(Constants.expoConfig?.extra);
const sentryOptions = buildSentryOptions(runtimeConfig.sentryDsn);

if (sentryOptions) {
  Sentry.init(sentryOptions);
}

initializePostHog(
  { apiKey: runtimeConfig.posthogApiKey, host: runtimeConfig.posthogHost },
  analytics,
);
getSubscriptionModule();

require("expo-router/entry");
```
`app/src/observability/README.md:5` makes it a law: *"caller of `Sentry.init`, and its Sentry package import must remain the first import."*

**P2-T07's audit amendment (`:33`) changes this: "Sentry is initialised inside P2-T17's root `ErrorBoundary`"** — so the init *site* is a rewrite, though `buildSentryOptions` and the scrubber port directly.

### DSN source
`app/src/observability/runtimeConfig.ts:17-26` reads `extra.clientObservability`:
```ts
export function readClientObservabilityConfig(extra: unknown): ClientObservabilityConfig {
  const observability = record(record(extra)?.clientObservability);
  return {
    posthogApiKey: optionalString(observability?.posthogApiKey),
    posthogHost: optionalString(observability?.posthogHost),
    sentryDsn: optionalString(observability?.sentryDsn),
  };
}
```
`optionalString` trims and treats blank as undefined, so a blank EAS secret degrades identically to a missing one.

`buildSentryOptions` (`app/src/observability/sentry.ts:3-27`) returns **`null`** on an empty DSN — the keyless-degrades law — and otherwise a deliberately minimal option set: `attachScreenshot: false`, `attachThreads: false`, `attachViewHierarchy: false`, `enableAppStartTracking: false`, `enableAutoPerformanceTracing: false`, `enableAutoSessionTracking: false`, `enableCaptureFailedRequests: false`, `enableNativeCrashHandling: **true**`, `enableNativeFramesTracking: false`, `enableStallTracking: false`, `enableUserInteractionTracing: false`, `replaysOnErrorSampleRate: 0`, `replaysSessionSampleRate: 0`, `sendDefaultPii: false`, `tracesSampleRate: 0`, plus `beforeSend: scrubSentryEvent`.

Crash reporting only. No performance, no replay, no PII.

### The scrubber
`app/src/observability/sentry.ts:30-58` — *"Client-side equivalent of the server scrub, tightened for device-local data."* Deletes `event.user`, `request`, `message`, `extra`, `contexts`, `tags`, `transaction`, `fingerprint`; strips `data` and `message` from every breadcrumb; strips `value` and `mechanism.data` from every exception; and strips `context_line`, `pre_context`, `post_context`, `vars` from **every stack frame**. Aggressive — source context never leaves the device.

### Sourcemaps / sentry-cli / Metro plugin
- **Metro plugin: wired.** `app/metro.config.js:1-5`:
```js
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
module.exports = getSentryExpoConfig(__dirname, {
  annotateReactComponents: false,
  includeWebReplay: false,
});
```
- **`app/ios/sentry.properties`** (values redacted):
```
defaults.url=https://sentry.io/
defaults.org=edge-ix
defaults.project=excerlock-mobile
# Using SENTRY_AUTH_TOKEN environment variable
```
- **Config plugin** `app/app.json:77-83` — `["@sentry/react-native", { "organization": "edge-ix", "project": "excerlock-mobile" }]`, which installs the Xcode build phase that runs `sentry-cli` at archive time.
- **Auth token** `SENTRY_AUTH_TOKEN` in `~/.excerlock/env`, scoped `org:ci`, named *"ExcerLock CI — source maps & releases"*. Validated live by `scripts/check-env.ts:470`.
- **EAS build hooks: none.** Grep for `eas-build` in both `package.json` files returns nothing. Upload relies entirely on the Xcode build phase the config plugin installs.

### Release / dist naming, and expo-updates linkage
**Neither is configured.** No `release` or `dist` override in `sentry.properties` or `metro.config.js` — the SDK's defaults (bundle id @ version, build number) apply. And because the old app has **zero `expo-updates` runtime call sites**, there is **no code associating a Sentry release/dist with an EAS Update id**. A JS-only OTA update would therefore report against the *binary's* release, and its sourcemaps would not match.

**This is a real, unaddressed gap in both apps** — and it is one that only bites once OTA is actually enabled.

---

## B4. PostHog (old app)

### Init site
`app/index.ts:20-26`, immediately after `Sentry.init`. `app/src/analytics/postHogRuntime.ts:40-59`:
```ts
export function initializePostHog(config, kit, factory = createClient): PostHogRuntimeClient | null {
  const apiKey = config.apiKey?.trim();
  const host = config.host?.trim();
  if (!apiKey || !host) {
    activeClient = null;
    return null;
  }
  const client = factory(apiKey, buildPostHogOptions(host));
  kit.installSink(createPostHogSink(client));
  activeClient = client;
  void primeDeviceIdForFlags(client).catch(() => {
    // Analytics and experiments are best-effort; app boot must never fail here.
  });
  return client;
}
```
Requires **both** key and host; otherwise the pre-installed no-op sink stays and analytics cannot crash boot.

`primeDeviceIdForFlags` (`:66-72`) awaits `client.ready()`, calls `getDistinctId()` to force `$device_id` persistence, then `reloadFeatureFlags()` — so flags bucket on a stable anonymous device id before the experiment rail reads them.

### API host
`POSTHOG_HOST` from config; `scripts/check-env.ts:46-47` documents the default as `https://us.i.posthog.com`.

### SDK policy — explicit-only
`app/src/analytics/postHogSink.ts:10-31`:
```ts
/**
 * One auditable SDK policy: explicit product events and feature-flag exposure
 * events only. No lifecycle, UI, crash, survey, GeoIP, or replay collection.
 */
export function buildPostHogOptions(host: string): PostHogOptions {
  return {
    host,
    captureAppLifecycleEvents: false,
    disableGeoip: true,
    disableSurveys: true,
    enableSessionReplay: false,
    errorTracking: { autocapture: false, exceptionSteps: { enabled: false } },
    featureFlagsRequestMaxRetries: 0,
    featureFlagsRequestTimeoutMs: FLAG_BUDGET_MS,
    personProfiles: "identified_only",
    preloadFeatureFlags: true,
    sendFeatureFlagEvent: true,
  };
}
```
Autocapture off by deliberate decision — the env dotfile comment explains: *"PRD §10 forbids incidental capture of health/motion/location values, and autocapture would ship element labels (gym names, condition titles) unasked."*

### Feature flag usage sites
Exactly **one** file may read flags — `app/src/experiments/ExperimentVariantProvider.tsx:2,24,28`:
```ts
import { useFeatureFlag } from "posthog-react-native";
const observed = useFeatureFlag(flagKey, client);
... client.getFeatureFlagPayload(flagKey);
```
`app/src/experiments/README.md:5` states the law: *"No file outside `ExperimentVariantProvider.tsx` may call `useFeatureFlag`."*

### Experiment / A-B usage
`app/src/experiments/ExperimentRuntimeRoot.tsx:12-28` mounts exactly one provider, and only when PostHog is live:
```tsx
/** Mounts the one app-wide shield-copy exposure reader when PostHog is live. */
export function ExperimentRuntimeRoot({ children, client = getActivePostHogClient() }) {
  if (!client) return children;
  return <ExperimentVariantProvider client={client} flagKey="exp-shield-copy-v1">{children}</ExperimentVariantProvider>;
}
```
Mounted in `app/app/_layout.tsx:56`. Registry laws (`app/src/experiments/README.md:7-11`): `exp-` = experiments, `gate-` = release gates; the only registered flag is **`exp-shield-copy-v1`**; **control renders immediately**, a valid treatment may replace it only within a **500 ms budget** (`EXPERIMENT_FLAG_BUDGET_MS`, also used as `featureFlagsRequestTimeoutMs`), and late results cannot rotate copy client-side; `shieldCopyPayload.ts` accepts only a complete four-cause title/subtitle set.

### `identify` / `alias` sites
- The kit exposes `identify(distinctId)` (`AnalyticsKit.ts:38,73-74`), forwarded through the sink (`postHogSink.ts:71-73`).
- **No `alias()` call exists anywhere.** Grep confirms.
- Identity teardown is called from the Clerk bridge, `app/src/account/ClerkAccountBridge.tsx:90-97`:
```ts
await Promise.all([
  retryUntilSuccessful(async () => {
    await analytics.discardPending();
    analytics.reset();
  }),
  retryUntilSuccessful(resetSubscription),
  retryUntilSuccessful(() => clerk.signOut()),
]);
```
and `:145` — `await analytics.flush();` **before** the authenticated `DELETE /v1/user`.

`discardPending` (`postHogSink.ts:77-84`) durably clears the SDK's `Queue`, `AiQueue`, and `LogsQueue` persisted properties then `optOut()`s, *"preventing stale events from recreating the user"* — a genuinely subtle correctness detail worth preserving verbatim.

### Event registry — `packages/analytics-events`
Shape: `registry.ts` (70 lines), `flow.ts` (23), `helpers.ts` (26), `types.ts` (21), plus `src/events/{onboarding,conditions,shield,paywall,engagement,support,vendors,subscription}.ts`.

`registry.ts:11-24` — one flat `EVENTS` object merging all domains:
> *"The complete v1 event registry: every allowed PostHog event name with its declared owner. This object is what the single-emitter guardrail test (ARCHITECTURE §5 #6) walks against the codebase's capture call sites."*

Laws, enforced at compile time (`registry.ts:60-70`):
```ts
// Every registered event has a props type, and vice versa.
type _PropsCoverRegistry = Assert<Same<EventName, keyof EventPropsMap>>
// D12: every props shape is a flat bag of string/number/boolean values.
type IllegalPropsEvents = { [E in EventName]: PropsOf<E> extends EventProps ? never : E }[EventName]
type _PropsArePrimitiveOnly = Assert<Same<IllegalPropsEvents, never>>
```
Ownership is a type-level partition — `ClientEventName`, `ServerEventName`, `AdaptyEventName` derived from each entry's `owner` literal (`:49-53`).

`flow.ts:9-17` locks screen names to a union so UI labels can never become `$screen_name`:
```ts
export const FLOW_SCREENS = ['value-prop','confession','mirror','permissions-primer','pick-apps','paywall','sign-up'] as const
```

`app/src/analytics/README.md` records the runtime laws: the kit is the **only** emitter; `privacyPolicy.ts` drops undeclared keys at the final boundary so *"Health, motion, location, workout metrics, balances, and screen-time answers therefore remain on device"*; `onboarding_answer` records the funnel screen only — *"its answer argument is consumed by the local rail and is never placed in the event payload."*

---

## B5. PostHog ↔ Adapty linkage

**There is no client-side linkage code.** No `setIntegrationIdentifier`, no shared distinct-id, no attribution payload. Grep across `app/src` confirms.

The design is **server-side by decision D9**, reserved in the registry — `packages/analytics-events/src/events/subscription.ts:3-25`:
```ts
/**
 * Subscription lifecycle — owned by the native Adapty → PostHog integration
 * (D9, PRD §10.3). Neither the app nor the server may ever `capture()` these:
 * the server's Adapty webhook drives the Postgres entitlement mirror ONLY.
 *
 * Names follow Adapty's default event types (vendor namespace — exempt from
 * the object_action law the same way Regen kept the default `rc_*` names).
 * They must be verified against the integration's event-name config when the
 * PostHog integration is wired (Phase 5); this file is the single place to
 * correct them.
 */
export const subscriptionEvents = {
  trial_started: { owner: 'adapty' },
  trial_converted: { owner: 'adapty' },
  trial_renewal_cancelled: { owner: 'adapty' },
  subscription_started: { owner: 'adapty' },
  subscription_renewed: { owner: 'adapty' },
  subscription_renewal_cancelled: { owner: 'adapty' },
  subscription_expired: { owner: 'adapty' },
  subscription_refunded: { owner: 'adapty' },
  billing_issue_detected: { owner: 'adapty' },
  entered_grace_period: { owner: 'adapty' },
} as const satisfies EventSpecMap
```
with a deliberately minimal forwarded-props type (`:31-35`): `product_id?`, `store?`, `price_usd?`.

**So the join key is the identity itself.** Old app: Adapty `customer_user_id` = Clerk user id, set post-purchase; PostHog `distinct_id` = Clerk user id. New plan: **both = Supabase uid**, set from first launch (P2-T06 step 3, P2-T07 step 1 "D6: distinct_id = Supabase uid", P2-T18 §2). The `IdentityBridge` in P2-T18 is the single component that will make this true.

**The integration itself is not yet wired** — the file comment says "when the PostHog integration is wired (Phase 5)", and P2-T06's dashboard state notes Variant B is not yet in an A/B test.

---

## B6. Env / secrets (old app) — the mechanism

`app/app.config.ts:1-63` is the whole mechanism. Declared client keys (`:6-11`):
```ts
const CLIENT_ENV_NAMES = [
  "EXPO_PUBLIC_ADAPTY_KEY",
  "EXPO_PUBLIC_POSTHOG_KEY",
  "POSTHOG_HOST",
  "SENTRY_DSN_MOBILE",
] as const;
```
Resolution order — `process.env` (EAS secrets) first, `~/.excerlock/env` dotfile as local fallback (`:35-40`):
```ts
return Object.fromEntries(
  CLIENT_ENV_NAMES.map((name) => [name, process.env[name] ?? localValues[name]]),
);
```
The dotfile parser (`:13-34`) tolerates `#` comments, an `export ` prefix, and quoted values, and swallows a missing file:
```ts
} catch {
  // EAS supplies process.env; the local dotfile is an optional fallback.
}
```
Surfaced into `extra` (`:52-62`):
```ts
extra: {
  ...config.extra,
  clientSubscription: { adaptyKey: environment.EXPO_PUBLIC_ADAPTY_KEY },
  clientObservability: {
    posthogApiKey: environment.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: environment.POSTHOG_HOST,
    sentryDsn: environment.SENTRY_DSN_MOBILE,
  },
},
```
Read back by `readSubscriptionRuntime()` and `readClientObservabilityConfig()`. Two additional `EXPO_PUBLIC_*` vars are read directly, not via `extra`: `EXPO_PUBLIC_API_URL` (`ClerkAccountBridge.tsx:30`, default `https://api.excerlock.com`), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, plus build switches `EXPO_PUBLIC_E2E` and `EXPO_PUBLIC_TEST_HARNESS` (`app/eas.json`, `app/app/_layout.tsx:17,66`).

### Every key name in `~/.excerlock/env` (names only — no values read or transmitted)
The file exists. Header: *"ExcerLock day-zero secrets — PRD §10.10 '$HOME dotfile dir'. Read by scripts/check-env.ts. NEVER committed."*

| Key | Scope |
|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | client (EAS secret) |
| `CLERK_SECRET_KEY` | server |
| `SENTRY_DSN_MOBILE` | client — comment notes DSNs are write-only ingest endpoints, designed to ship in the bundle |
| `SENTRY_DSN_API` | server |
| `SENTRY_AUTH_TOKEN` | CI — scopes `org:ci`, sourcemaps & releases |
| `EXPO_PUBLIC_POSTHOG_KEY` | client (EAS secret) |
| `POSTHOG_HOST` | client |
| `EXPO_PUBLIC_ADAPTY_KEY` | client — public SDK key, designed to ship in the bundle |
| `ADAPTY_SECRET_KEY` | server only, never in the bundle |
| `ADAPTY_WEBHOOK_SECRET` | server |
| `ASC_KEY_ID`, `ASC_ISSUER_ID` | App Store Connect; `.p8` beside the file |
| `ASC_INAPP_KEY_ID` | In-App Purchase key "Adapty", StoreKit 2 / promo offers |
| `RESEND_API_KEY` | server — note: `excerlock.com` not yet a verified domain |
| `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_JWKS_URL` | added 2026-09-07 |
| `GOOGLE_OAUTH_WEB_CLIENT_ID`, `GOOGLE_OAUTH_WEB_CLIENT_SECRET`, `GOOGLE_OAUTH_IOS_CLIENT_ID` | added 2026-09-07 |

Also referenced by `scripts/check-env.ts:45-56` but not present in the dotfile: `EXCERLOCK_API_URL`, and `STRAVA/OURA/WHOOP/POLAR` `_CLIENT_ID`/`_CLIENT_SECRET` (server only).

### The doctor
`scripts/check-env.ts` — *"ExcerLock day-zero doctor — PRD §10.10 definition-of-done. Verifies every §10.10 service key is present AND live (one cheap authenticated ping each)."* Three states ✅ OK / ⚠️ MISSING / ❌ FAILING; `--allow-missing` downgrades MISSING to a warning. Env resolution order (`:31-38`): `process.env` → `~/.excerlock/env` → `~/.excerlock/<VAR_NAME>` (one file per var). Services checked: PRD §10.9 dependencies (`:277`), Apple/ASC (`:345`), Clerk (`:392`), Adapty (`:412`), PostHog (`:448`), Sentry (`:469`), Server/Azure (`:495`), Expo/EAS (`:519`), Vendor OAuth (`:552`). Every check is wrapped so a throw becomes a ❌ row, never a stack trace. Tests in `scripts/check-env.test.ts`.

---

## B7. Supabase — what actually exists

| Path | Contents |
|---|---|
| `supabase/` (repo root) | `.temp/linked-project.json`, `.temp/cli-latest` — **nothing else** |
| `app-next/supabase/` | `.temp/linked-project.json` — **nothing else** |
| `app/supabase/` | **does not exist** |

Both `linked-project.json` files are identical:
```json
{"ref":"hqgqhefftjxwdhqeushr","name":"excerlock","organization_id":"iymnfgpeijcprowoovci","organization_slug":"iymnfgpeijcprowoovci"}
```

**No `config.toml`, no `migrations/`, no `functions/`, no `seed.sql`.** These are purely Supabase CLI link artifacts from `supabase link`. Consistent with the plan: `P2-T01:5` — *"Supabase is auth only (D1). No Supabase database tables, no RLS, no Edge Functions are used by the app."* Product data lives in the VPS Postgres (`server/src/db/schema.ts`), not Supabase.

---

# PART C — Verbatim files

## C1. `app-next/package.json`
```json
{
  "name": "app-next",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "dependencies": {
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/datetimepicker": "9.1.0",
    "expo": "~57.0.20",
    "expo-build-properties": "~57.0.17",
    "expo-constants": "~57.0.17",
    "expo-dev-client": "~57.0.18",
    "expo-font": "~57.0.3",
    "expo-haptics": "~57.0.2",
    "expo-linear-gradient": "~57.0.1",
    "expo-linking": "~57.0.9",
    "expo-router": "~57.0.19",
    "expo-splash-screen": "~57.0.8",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "react-native-gesture-handler": "~2.32.0",
    "react-native-maps": "1.27.2",
    "react-native-reanimated": "4.5.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-svg": "15.15.4",
    "react-native-worklets": "0.10.1",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@testing-library/react-native": "^14.0.1",
    "@types/jest": "29.5.14",
    "@types/react": "~19.2.2",
    "eslint": "^9.39.5",
    "eslint-config-expo": "~57.0.2",
    "jest": "~29.7.0",
    "jest-expo": "~57.0.5",
    "prettier": "^3.9.6",
    "typescript": "~6.0.3"
  },
  "scripts": {
    "start": "NODE_OPTIONS=--dns-result-order=ipv4first expo start --localhost --port 8091",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand",
    "lint": "expo lint"
  },
  "private": true
}
```
Zero infrastructure SDKs. The only network-capable dependency is `react-native-maps`.

## C2. `app/package.json` — dependencies verbatim (old app)
```json
"dependencies": {
  "@clerk/clerk-expo": "^2.19.31",
  "@expo/ui": "~57.0.7",
  "@kingstinct/react-native-healthkit": "14.0.2",
  "@react-native-async-storage/async-storage": "2.2.0",
  "@sentry/react-native": "~7.11.0",
  "expo": "~57.0.8",
  "expo-auth-session": "~57.0.5",
  "expo-blur": "~57.0.2",
  "expo-build-properties": "~57.0.7",
  "expo-constants": "~57.0.7",
  "expo-crypto": "~57.0.1",
  "expo-dev-client": "~57.0.9",
  "expo-device": "~57.0.1",
  "expo-font": "~57.0.1",
  "expo-glass-effect": "~57.0.1",
  "expo-haptics": "~57.0.1",
  "expo-image": "~57.0.1",
  "expo-image-picker": "~57.0.7",
  "expo-linear-gradient": "~57.0.1",
  "expo-linking": "~57.0.4",
  "expo-location": "~57.0.7",
  "expo-notifications": "~57.0.8",
  "expo-router": "~57.0.8",
  "expo-secure-store": "~57.0.1",
  "expo-sharing": "~57.0.8",
  "expo-splash-screen": "~57.0.5",
  "expo-status-bar": "~57.0.1",
  "expo-store-review": "~57.0.1",
  "expo-symbols": "~57.0.1",
  "expo-system-ui": "~57.0.1",
  "expo-task-manager": "~57.0.7",
  "expo-updates": "~57.0.11",
  "expo-web-browser": "~57.0.2",
  "posthog-react-native": "^4.61.2",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "react-native": "0.86.0",
  "react-native-adapty": "^4.0.2",
  "react-native-device-activity": "^0.6.1",
  "react-native-gesture-handler": "~2.32.0",
  "react-native-reanimated": "4.5.0",
  "react-native-safe-area-context": "~5.7.0",
  "react-native-screens": "~4.26.0",
  "react-native-svg": "15.15.4",
  "react-native-view-shot": "5.1.0",
  "react-native-web": "~0.21.0",
  "react-native-worklets": "0.10.0",
  "zustand": "^5.0.14"
},
"devDependencies": {
  "@testing-library/react-native": "^14.0.1",
  "@types/jest": "29.5.14",
  "@types/react": "~19.2.2",
  "jest": "~29.7.0",
  "jest-expo": "~57.0.2",
  "pod-install": "1.1.0",
  "typescript": "~6.0.3"
}
```
Note `"main": "index.ts"` (not `expo-router/entry`) — this is what makes the init-order law possible.

The infra dependencies `app-next` lacks: `@sentry/react-native`, `posthog-react-native`, `react-native-adapty`, `expo-updates`, `expo-secure-store`, `@clerk/clerk-expo`, `expo-notifications`, `expo-auth-session`, `expo-crypto`, `expo-device`, `expo-web-browser`.

## C3. `app-next/app.json` — verbatim
```json
{
  "expo": {
    "name": "ExcerLock",
    "slug": "excerlock",
    "owner": "johansardar",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "excerlock",
    "userInterfaceStyle": "light",
    "icon": "./assets/running-lock.png",
    "ios": {
      "bundleIdentifier": "com.johansardar.excerlock",
      "appleTeamId": "AX3C2B78YD",
      "supportsTablet": false,
      "infoPlist": { "NSLocationWhenInUseUsageDescription": "Use your location to find nearby gyms and choose your gym's arrival area." }
    },
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "plugins": [
      "./modules/excerlock-gait-vision/app.plugin.js",
      "react-native-maps",
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/running-lock.png",
          "imageWidth": 140,
          "backgroundColor": "#FFFFFF"
        }
      ],
      "expo-font",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "17.4"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "9a358379-d939-4c56-bcea-de3ac5699be2"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2",
      "enabled": false
    }
  }
}
```
No `app.config.js` / `app.config.ts` exists in `app-next`.

## C4. `app/app.json` — verbatim (old app)
```json
{
  "expo": {
    "name": "ExcerLock",
    "slug": "excerlock",
    "version": "0.0.0",
    "orientation": "portrait",
    "scheme": "excerlock",
    "userInterfaceStyle": "automatic",
    "icon": "./assets/icon.png",
    "ios": {
      "appleTeamId": "AX3C2B78YD",
      "bundleIdentifier": "com.johansardar.excerlock",
      "supportsTablet": false
    },
    "android": {
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static"
    },
    "plugins": [
      "./plugins/withNoPush",
      "expo-router",
      "expo-dev-client",
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-logo.png",
          "backgroundColor": "#F25A16",
          "imageWidth": 180,
          "resizeMode": "contain"
        }
      ],
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "17.4"
          }
        }
      ],
      [
        "react-native-device-activity",
        {
          "appGroup": "group.com.johansardar.excerlock",
          "copyToTargetFolder": false
        }
      ],
      [
        "@kingstinct/react-native-healthkit",
        {
          "background": false,
          "NSHealthShareUsageDescription": "ExcerLock reads your activity to detect completed fitness conditions on this device.",
          "NSHealthUpdateUsageDescription": false
        }
      ],
      "./plugins/withHealthKitBackgroundBootstrap",
      [
        "expo-location",
        {
          "isIosBackgroundLocationEnabled": true,
          "locationWhenInUsePermission": "Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.",
          "locationAlwaysAndWhenInUsePermission": "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect."
        }
      ],
      "./modules/excerlock-motion/app.plugin.js",
      "./modules/excerlock-gait-vision/app.plugin.js",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow ExcerLock to use a photo as a condition banner.",
          "cameraPermission": false,
          "microphonePermission": false
        }
      ],
      "expo-secure-store",
      [
        "@sentry/react-native",
        {
          "organization": "edge-ix",
          "project": "excerlock-mobile"
        }
      ],
      "react-native-adapty",
      "./plugins/withScreenTimeExtensionValidation"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "eas": {
        "projectId": "9a358379-d939-4c56-bcea-de3ac5699be2"
      }
    },
    "owner": "johansardar",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2"
    }
  }
}
```

## C5. `eas.json` — only at `app/eas.json`
Reproduced verbatim in §B2 above.

## C6. `app-next/README.md` — verbatim
```md
# ExcerLock — Phase 1

A separate Expo SDK 57 app using local fake data. The original app and server are read-only references. Product copy belongs in src/content; presentation tokens in src/design-system; IO contracts in src/ports. Real services are unavailable in Phase 1.

From the repo root run `npm install`. From this folder run `npm test`, `npm run typecheck`, `npm run lint`. `npm start` uses IPv4 localhost port 8091. Build with `sh scripts/simulator.sh build`, then `boot`, `install`, and `launch`. This uses Expo build-only mode plus simctl so Simulator.app stays closed. Finish with `sh scripts/simulator.sh shutdown`.

Task evidence lives in evidence/T00 through evidence/T16; indexes are committed, generated media and logs stay local. Open `excerlock://dev` for 24 scenarios, clock controls, permission/session/entitlement toggles, prompt behavior, event log and component previews. `excerlock://dev?scenario=home-locked-walking` loads a scenario and follows the boot gate. "Load and keep edits" preserves validated store data. Gemini gates were deferred by Johan; final acceptance records that limitation.

Phase 1 Home retains tab scroll position and reads live local progress. Capture links `excerlock://home?steps=5000` and `excerlock://home?advance=3600000` preserve Home while changing fake steps or clock. Adapter context is persisted separately from the eight product stores, so a cold launch resumes the same scenario and signals. Setup branch capture uses `excerlock://dev?scenario=runner-distance&setup=X3` (or a gym/walking scenario).

Final local acceptance is indexed in [evidence/T16/ACCEPTANCE.md](evidence/T16/ACCEPTANCE.md). The app includes all onboarding branches, schedule/plan/trial/setup, Home, Conditions, Analytics, Settings and session sheets. `scripts/accept-branches.py` replays eight complete fresh-to-Home journeys; `accept-permissions.py`, `accept-edges.py` and `capture-acceptance-data.py` cover the remaining native checks. Use `accept-cold-launch.py` after installing a fresh dev client to acknowledge its host-only first-run chrome.

Analytics reconciles today's local fake sensor/workout facts; prior fixture days remain historical. The gym search has six local candidates and enforces five saved places at 100 m. No real authentication, purchases, permission requests, backend or Screen Time enforcement are implemented. Phase 2 has not started.
```

---

# PART D — What the existing plan already says: reuse vs rewrite

Sources: `docs/audit/phase2.md` (1226 lines) and `plans/rebuild/phase-2-backend/P2-T01`, `-T06`, `-T07`, plus `P2-T18` which supersedes parts of T06.

## D1. The port ↔ adapter map (`docs/audit/phase2.md:86-106`)
From `plans/rebuild/04-architecture.md:63-76`:

| Port | Phase 2 real adapter | Task |
|---|---|---|
| `ScreenTimePort` | `app/src/screentime/native/*` + `app/targets/*` | P2-T03 / P2-T04 |
| `StepsPort` | `app/modules/excerlock-motion` + `app/src/signals/motion` | P2-T05 §1 |
| `WalkingPort` | `walkingSessionController.ts`, `signals/gait`, `signals/placement`, `modules/excerlock-gait-vision` | P2-T05 §2 |
| `GymPort` | `app/src/signals/location/*`, `gymPresenceController.ts` | P2-T05 §3 |
| `HealthPort` | `app/src/signals/health/*` | P2-T05 §4 |
| **`AuthPort`** | **Supabase (new)** | **P2-T01** |
| **`SubscriptionPort`** | **Adapty + Paywall Builder** | **P2-T06** |
| **`AnalyticsPort`** | **PostHog via `packages/analytics-events`** | **P2-T07** |
| `NotificationsPort` | expo-notifications local, reduced | P2-T09 |
| `SyncPort` | VPS API, new endpoints | P2-T02 + P2-T08 |
| `ClockPort` | system | none named |

Ports **not** in the table and not owned by any task (`phase2.md:99-113`): `GaitPort`, `PlaceSearch`, `SupportPort`, `RuntimeControls` (no task gates the dev menu out of production builds, despite `02-screen-inventory.md:171` requiring it).

**`SyncPort` is narrower than required** (`phase2.md:118-124`): shipped as `pushRules`/`pushRuleDays`/`pull()`, but P2-T02 and P2-T08 additionally require `usage_days` and `profile` push and a `GET /sync`. The port must grow — which contradicts the plan's own README law that *"a real adapter passes the same port-level tests the fake passed."*

## D2. Auth (P2-T01) — mostly reuse of shape, full rewrite of vendor
**Reuse:** the `AccountModule` shape maps cleanly onto `AuthPort` (`P2-T01:8-9`); the deletion ordering law (**Adapty → PostHog → auth provider last**) carries over verbatim; the `PUT /v1/user` provisioning-before-`signedIn` pattern and the `410 ACCOUNT_DELETED` recovery come straight from `ClerkAccountBridge.tsx:34-51,72-100`; all UI exists (X4 `app-next/app/sign-in.tsx`, Settings › Account, copy in `content/settings.ts:96-107`).

**Rewrite:** the vendor entirely (Clerk → Supabase); token storage must move to `expo-secure-store`; sign-in expands from Google-only to Apple + Google + email OTP; anonymous sessions from first launch with `linkIdentity` preserving uid; `app.json` gains `expo-apple-authentication` (entitlement `com.apple.developer.applesignin`) and a Google URL scheme.

**Gaps the plan itself flags** (`phase2.md:170-185`): no copy for the `410 ACCOUNT_DELETED` state; no defined behavior for provisioning failure / offline first launch against the boot gate's 3 s budget; swapping in `AppleAuthenticationButton` is a visual change the README says should not happen; identity-link conflict merge story lives in P2-T08 with no UI. Plus: **`app.config.ts` does not exist in `app-next`** (`phase2.md:189-192`).

## D3. Adapty (P2-T06 + P2-T18) — significant rewrite
**Reuse:** activate-at-bootstrap + `onLatestProfileLoad` + restore + `identify`/`logout` logic from `AdaptySubscriptionModule`; the `AdaptySDKPort` mock and its contract tests; `fallbackPaywall.ts`; the three-way keyless/test/keyed composition-root selection; the server webhook (explicitly unchanged).

**Rewrite:**
- **UI approach flips.** Decision C6 → Paywall Builder (`getPaywall` + `createPaywallView` + present). `adaptyPaywall.ts`, `SubscriptionPaywall.tsx`, `PaywallProductOption.tsx` are superseded. Johan designs the paywall in the dashboard.
- **Identity timing inverts** — `identify(supabaseUid)` on every session including anonymous, not post-purchase.
- **Entitlement mapping expands** from binary active/inactive to trial / active / expired / billing issue / grace, with **grace → `active`** (no `grace` status in v1).
- **Lapse handling changes** (`P2-T06:39-41`, P2-T18 §1): `expired`/`billingIssue` present a *dismissible modal* over a reachable app; only `none` is the hard paywall. `src/domain/entitlementAccess.ts` is new.
- **Restore that finds nothing must never downgrade** a live entitlement (finding 12) — the opposite of the old code.
- **Lifetime SKU removed** (B35); selected plan flows through `presentPaywall(placement, plan)`.
- **App Review 3.1.2 requirement:** the dashboard paywall must carry tappable Terms of Use and Privacy Policy links plus price and renewal disclosure; a fallback JSON without them must fail the acceptance test.
- **Offline** gets a real branch via a new `ReachabilityPort` (P2-T18 §4).

**Blockers Johan owns:** Paywall Builder designs are **empty**; App Store products are in **`MISSING_METADATA`**.

## D4. PostHog + Sentry (P2-T07) — heavy reuse
**Reuse:** `packages/analytics-events` as a workspace dependency; `src/analytics/**` (kit, sinks, privacy policy, runtime, flow tracker); `src/experiments/**`; `src/observability/sentry.ts` scrub; guardrails `single-emitter.test.ts` and `client-observability.test.ts` re-pointed; Sentry plugin org `edge-ix` / project `excerlock-mobile`.

**Rewrite / update:**
- `FLOW_SCREENS` → the new onboarding ids (O01…O20, branch ids, S1–S4, T1–T4, P, X1–X5) in path order.
- Remove vendor events and `earn_claimed`, `sick_day_override_used`, `milestone_unlocked`, `share_card_shared`, `notification_toggled`; **keep `notification_opened`**.
- Add `rule_met` (props: activity, mode kind, day-of-week, minutes-into-window bucket — **no values**), `apps_unlocked_rest_of_day`, `walking_session_started/ended`, `setup_permission_result`, `sign_in_completed`.
- D6: `distinct_id` = Supabase uid. D8: flags still bucket on `$device_id`.
- **Sentry init moves** into P2-T17's root `ErrorBoundary` — so the `app/index.ts` init-order pattern does **not** port.

**Two unresolved items the plan states as open:**
1. **`identify` policy contradiction** (`P2-T07:15-18`): the task says both "identify on session start (anonymous too)" and "identify only on non-anonymous sessions and alias the anonymous distinct id at link time" in one sentence, against `personProfiles: 'identified_only'`. Needs a decision, written into the README, before T07 starts. Note there is currently **no `alias()` implementation** in the old app to reuse.
2. **Analytics consent surface.** `phase2.md:625-628` flags that no task adds one, no Settings row exists in the screen inventory, and `app-next/src/content/legal.ts:2-18` does not mention analytics at all — *"flagged as a possible App Store review issue, not just a UI gap."* P2-T07's amendment (`:34-36`) proposes a "Share usage analytics" switch + `PrivacyInfo.xcprivacy`, **pending Johan's answer**.

## D5. OTA — the one area with no owner
No Phase 2 task covers `expo-updates`. Grepping `docs/audit/phase2.md` for `expo-updates|OTA|runtimeVersion|eas update|channel` yields no substantive hits. P2-T12 step 7 says only: *"EAS: carry over `eas.json` profiles (development, preview, production); build a `preview` and push to TestFlight with `eas submit`."*

Reusable when someone picks it up: `app/src/updates/README.md` (the whole policy) and `configuration.test.ts` (the invariants), plus `app/eas.json` channels.

---

# PART E — Findings worth acting on

1. **OTA has no owner and is currently disabled.** `app-next` ships `updates.enabled: false` with no `runtimeVersion`. If a build reaches TestFlight in that state there is no hotfix path, and the old app's config test would fail against it. Smallest fix: add `expo-updates`, set `runtimeVersion: {policy: "appVersion"}`, flip `enabled`, create `app-next/eas.json` with the preview/production channels, and port `configuration.test.ts`.

2. **Sentry releases are not linked to update ids — in either app.** No `release`/`dist` override and no `expo-updates` runtime code means an OTA update's stack traces will not resolve against uploaded sourcemaps. This only bites once OTA is on, which makes it cheap to fix now and expensive to discover later.

3. **`app.config.ts` is a blocking prerequisite for two tasks.** P2-T01 and P2-T06 both specify reading keys from `app.config.ts` `extra`; `app-next` has only static `app.json`. Porting `app/app.config.ts` (adding the Supabase URL + anon key to `CLIENT_ENV_NAMES`) is unassigned work that gates both.

4. **The identity spine does not exist.** `subscription.identify()` and `analytics.identify()` are declared and never called. P2-T18 §2's `IdentityBridge` is the single component that makes the Adapty ↔ PostHog join key real; T06 and T07 both depend on it, so sequence T18 alongside them rather than after.

5. **Two live contradictions to resolve before coding.** (a) P2-T07's `identify`-vs-`alias` sentence contradicts itself. (b) `app-next/src/content/subscription.ts:29` still ships a `lifetime` plan that B35 and P2-T18 §3 say to remove.

6. **Do not port the restore-downgrade branch.** `AdaptySubscriptionModule.ts:148-153` publishes an inactive entitlement when restore finds nothing. Finding 12, P2-T06:43, and P2-T18 §1 all forbid it.

7. **No analytics consent surface exists anywhere** — not in the screen inventory, not in copy, not in any task. Flagged in the audit as a possible App Store review issue and still pending Johan's decision.

8. **`@supabase/supabase-js@2.116.0` is extraneous** in root `node_modules` (`npm ls` confirms; no workspace declares it, nothing imports it). It will silently satisfy an undeclared import in `app-next` and then break on a clean install or in CI.

9. **Adapty dashboard work is a hard external blocker.** Paywall Builder designs are empty and App Store products sit in `MISSING_METADATA`. P2-T06 cannot reach its acceptance criteria until Johan completes both, and the App Review 3.1.2 links/disclosure must be added to the dashboard paywall.

10. **The dev menu has no production gate.** `RuntimeControls` is reachable via `excerlock://dev` and a seven-tap gesture on the version row (`SettingsScreen.tsx:75-86`). `02-screen-inventory.md:171` requires it be dev-builds-only in Phase 2, but no task implements that.
