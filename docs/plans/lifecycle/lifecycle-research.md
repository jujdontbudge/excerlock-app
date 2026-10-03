# App lifecycle research for ExcerLock

Researched 2026-10-03. External sources only; the ExcerLock repository was not read.

This report covers nine questions. Each one has a short "what top apps do" answer, the key facts with sources, and recommended rules for the ExcerLock spec. A note marks any claim that rests on community reports rather than vendor documentation. Those claims need a device test before the spec relies on them.

---

## The rules on one page

1. **Session.** Users stay signed in until they sign out, delete their account, the server revokes the refresh token, or Apple reports the Apple ID credential as revoked. A network error, a 5xx, or a vendor outage never signs anyone out. The session lives in the Keychain with `AFTER_FIRST_UNLOCK`, because ExcerLock gets woken in the background.
2. **Restoration.** Resume onboarding at the exact step with answers filled in. Restore the last tab and any unsaved drafts. Never replay an intro. Routing reads local state only.
3. **Entitlement.** Show premium from the cached entitlement at once. Downgrade only when the server positively confirms the subscription lapsed. Honor Apple's Billing Grace Period. A subscription problem must never leave a user's apps locked with no way out.
4. **Screen Time.** The system, the DeviceActivity extension, and state shared through the App Group enforce every lock and every re-lock. The main app is never needed to re-lock. Reconcile shields on every launch, foreground, and extension callback. Warn shortly before an unlock window ends.
5. **Background.** Use geofences (CLMonitor) and pedometer history, not continuous tracking. Never depend on a relaunch after force-quit. Explain background use once, at the moment of need, then show status quietly on the Condition.
6. **Permissions.** Ask in context with a single-button primer. Ask for each permission once. After that, show status inline and offer an "Open Settings" link. Every Condition has a degraded mode that still works.
7. **OTA.** Never block launch. Download quietly after the first screen. Apply on the next cold start, or on return after at least 15 minutes in the background with no sensitive flow open. Never reload during a background wake.
8. **Account.** Deletion lives in Settings, may require a fresh sign-in, revokes Sign in with Apple tokens, explains that Apple keeps billing, and wipes server and local data. Sign-out is local-scope and unlocks this iPhone after the user confirms.
9. **Launch.** The launch screen matches the first screen. Draw the first frame in under 400 ms. A returning user sees an interactive Home in under 2 s at p75, with no spinner and nothing on the network in the critical path.

---

## 1. Session persistence

### What top apps do
- Consumer apps such as Duolingo, Strava, Calm, Headspace and Instagram keep you signed in on a device indefinitely.
- They use short-lived access tokens, around one hour. A rotating refresh token renews them silently in the background.
- They ask you to authenticate again only for destructive or identity-changing actions, such as deleting the account or changing the email.
- They store credentials in the Keychain.
- They never sign you out because you are offline or their backend is having a bad day.

### Key facts
**Supabase defaults**
- A session "lasts indefinitely" by default. Access tokens live 5 minutes to 1 hour, and 1 hour is the recommended default.
- Refresh tokens "never expire but can only be used once."
- Time-boxed sessions, inactivity timeouts and single-session-per-user are opt-in features on the Pro plan. They are off by default.
- A session ends on sign-out, on a password change or "security sensitive action", on timeout or maximum lifetime if you configured them, or on sign-in elsewhere when single-session is on. ([Supabase: User sessions](https://supabase.com/docs/guides/auth/sessions))

**Refresh-token reuse**
- A refresh token can be reused within a 10-second window.
- If the client lost the response, reusing the parent of the active token returns the active token.
- Any other reuse revokes the whole session, by design. ([same page](https://supabase.com/docs/guides/auth/sessions))
- This rotation-with-reuse-detection is what the OAuth Security BCP requires for public clients ([RFC 9700 §2.2.2 / §4.14](https://www.rfc-editor.org/rfc/rfc9700.txt)).

**React Native client setup**
- Supabase's Expo guide configures `autoRefreshToken: true`, `persistSession: true` and `detectSessionInUrl: false`. ([Supabase Expo tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native))
- On non-browser platforms the refresher "works continuously in the background, which may not be desirable."
- Supabase says to call `startAutoRefresh()` when `AppState` is `active` and `stopAutoRefresh()` otherwise.
- "If refreshing fails it will be retried for as long as necessary." ([supabase-js startAutoRefresh](https://supabase.com/docs/reference/javascript/auth-startautorefresh))

**Storage**
- Supabase's encrypted option is a `LargeSecureStore`. An AES-256 key sits in `expo-secure-store` (the Keychain), and the encrypted session sits in AsyncStorage. This works around the roughly 2 KB value limit that some iOS releases enforce. ([Supabase Expo tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native))
- Expo SecureStore stores values as Keychain generic passwords.
- They persist across uninstall and reinstall "if the app is reinstalled with the same bundle ID", but Expo says not to rely on this.
- The default `keychainAccessible` is `WHEN_UNLOCKED`. ([Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/))
- Apple says `AfterFirstUnlock` "is recommended for items that need to be accessed by background applications." ([kSecAttrAccessibleAfterFirstUnlock](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlock))
- `WhenUnlocked` is "recommended for items that need to be accessible only while the application is in the foreground." ([kSecAttrAccessibleWhenUnlocked](https://developer.apple.com/documentation/security/ksecattraccessiblewhenunlocked))

**Offline sign-outs in supabase-js**
- For years, opening the app offline deleted the session ([auth-js #141](https://github.com/supabase/auth-js/issues/141)).
- Retryable network errors stopped deleting the session in 2023 ([auth-js PR #710](https://github.com/supabase/auth-js/pull/710)).
- Until June 2026, a failed proactive refresh with a non-retryable error deleted a still-valid session.
- HTTP 500 and Cloudflare 525–529 responses were also misclassified, which "signed out entire mobile-app user bases" during an outage.
- **supabase-js 2.108.2 (2026-06-15)** fixes these. It preserves a valid session when refresh fails, adds a 60-second failure cooldown, and treats 500, 501 and 525–529 as transient. ([issue #2145](https://github.com/supabase/supabase-js/issues/2145), [PR #2436](https://github.com/supabase/supabase-js/pull/2436), [release v2.108.2](https://github.com/supabase/supabase-js/releases/tag/v2.108.2))

**Sign-out scope**
- In JavaScript, `signOut()` defaults to the **global** scope. Signing out on one device revokes the refresh tokens on every device.
- Use `{ scope: 'local' }` if you want each device to keep its own session. ([Supabase: Signing out](https://supabase.com/docs/guides/auth/signout))

**Sign in with Apple**
- Apple's sample checks `getCredentialState(forUserID:)` "immediately after launch" and shows sign-in only when needed. ([Implementing user authentication with Sign in with Apple](https://developer.apple.com/documentation/authenticationservices/implementing-user-authentication-with-sign-in-with-apple))

**Re-authentication**
- Apple explicitly allows asking for authentication again before account deletion.
- It also says "apps that make it unnecessarily difficult... will not pass review." ([Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/))
- The HIG says to delay sign-in and to avoid barriers. ([HIG: Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts))

### Recommended rules for ExcerLock
1. **Lifetime.** A user stays signed in until one of these happens:
   - they sign out;
   - they delete the account;
   - a refresh is *definitively* rejected (an auth error such as `invalid_grant` or `refresh_token_not_found`) *and* the access token has expired;
   - Apple reports the Apple ID credential as revoked.

   Do not enable Supabase time-boxing, inactivity timeouts or single-session. Keep the JWT expiry at 1 hour.
2. **Never sign out on**:
   - network failure;
   - a timeout;
   - a 5xx or a Cloudflare 52x;
   - a Supabase outage;
   - a refresh failure while the access token is still valid.

   Pin `@supabase/supabase-js` to 2.108.2 or later. Treat any unexpected `SIGNED_OUT` as a bug: log the reason, with no personal data, to Sentry or PostHog.
3. **Storage.** Use the `LargeSecureStore` pattern, with the Keychain key written as `keychainAccessible: AFTER_FIRST_UNLOCK`, not the default `WHEN_UNLOCKED`.
   - ExcerLock can be woken while the phone is locked, by a geofence or a pedometer or extension-driven event.
   - A `WHEN_UNLOCKED` key would then read as "no session".
   - Verify how existing Keychain items migrate. Items keep their old accessibility until they are rewritten.
4. **Reinstall.** Keychain items outlive a deletion of the app. On the first launch after an install, which you detect with a flag in app storage, delete any orphaned Keychain session key. Treat a reinstall as a fresh install, and offer one-tap Sign in with Apple to come back.
5. **Refresh only while active.** Call `startAutoRefresh()` and `stopAutoRefresh()` from `AppState`. A background wake must not need a token refresh unless it actually calls the server.
6. **Routing is local.** The first screen comes from the stored session (`getSession()` reads storage). Never block the first frame on `getUser()` or any network call. Validate in the background.
7. **Sign-out uses `scope: 'local'`.** Signing out on an iPad must not sign out the iPhone.
8. **Re-authenticate only for** account deletion and email change.
   - For Apple users, the fresh Sign in with Apple also returns the authorization code that the server needs to revoke Apple tokens (see §8).
   - Nothing else asks for authentication again. That includes subscribing, because Apple's payment sheet authenticates on its own.
9. **Check Apple credential state** on launch and on foreground. If it is `revoked` or `notFound`, sign out locally with a one-line explanation. If it is `authorized`, do nothing.

---

## 2. State restoration after kill or reboot

### What top apps do
- The app reopens where you left it: same tab, same scroll position, same half-written draft.
- Onboarding continues from the step you were on, with your answers kept.
- Intros, celebrations and tutorials are never replayed.
- If you went to Settings to change a permission, iOS killed the app. Top apps bring you back to the screen you left, with the new status already showing.

### Key facts
- **HIG, Launching:** "Restore the previous state when your app restarts so people can continue where they left off... Restore granular details of the previous state as much as possible." ([HIG: Launching](https://developer.apple.com/design/human-interface-guidelines/launching))
- **UIKit:** preservation "helps maintain the illusion that your app is always running... users don't know that your app has been terminated and won't expect the state of your app to change." ([Preserving your app's UI across launches](https://developer.apple.com/documentation/uikit/preserving-your-app-s-ui-across-launches))
- **HIG, Onboarding:** "If you let people skip the tutorial when they first launch... don't present it again on subsequent launches." It also says to postpone nonessential setup and provide reasonable defaults. ([HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding))
- **NN/g:** mobile sessions are short and interrupted. "The mobile app... must save state at all times... so that the user doesn't have to redo work already done before the interruption." ([NN/g: Mobile UX](https://www.nngroup.com/articles/mobile-ux/))
- **React Navigation**, which Expo Router uses under the hood, supports persistence through `initialState` and `onStateChange`. Every route and param must be serializable. ([React Navigation: State persistence](https://reactnavigation.org/docs/state-persistence/))
- **Changing a privacy permission in Settings kills the suspended app.**
  - The system log reads "Quitting application... in response to privacy settings change."
  - Apple's WWDC 2012 privacy session described this behavior.
  - The app has to restore its own state when it relaunches. ([Apple Developer Forums thread 19433](https://developer.apple.com/forums/thread/19433), [Stack Overflow summary citing WWDC 2012 session 710](https://stackoverflow.com/questions/12652502/app-killed-by-sigkill-when-changing-privacy-settings))
- **Purchases interrupted by a kill** finish on the next launch through StoreKit's transaction listener. Apple says to "listen for transactions as soon as your app starts." ([WWDC21: Meet StoreKit 2](https://developer.apple.com/videos/play/wwdc2021/10114/))

### Recommended rules for ExcerLock
1. **Save onboarding as you go.** On every answer change, store the step id, the answers so far and a schema version in fast local storage. Saving only on "Next" is not enough. On launch, the router sends the user to one of three places:
   - no session: Welcome;
   - session with onboarding incomplete: the saved step, with answers filled in;
   - onboarding complete: the last tab.
2. **Never go back to step 1.** If an OTA changed the onboarding steps, map the saved answers to the new steps. Resume at the first incomplete step.
3. **Never replay** the intro, the welcome animation or a celebration once it has been seen. Keep a device-level `seen` flag that survives sign-out.
4. **Restore by kind**:

   | Kind | Examples | Restore? |
   |---|---|---|
   | Navigation | Last tab | Always |
   | Drafts | Condition editor, app selection in progress | Always |
   | Drill-down screens | Screens below a tab | Only if relaunched within about an hour. After a long absence, land on the tab root, which is calmer than a stale deep screen. |
   | Transient UI | Paywalls, permission primers, toasts, error states, success screens | Never |

5. **Deep links and notification taps win** over restored state.
6. **Settings round-trip.** When the user returns from Settings after changing a permission, the app has probably been killed. Restoration must land them on the same screen, showing the new permission status.
7. **Purchase interrupted by a kill.** Activate Adapty, whose StoreKit listener runs at launch, before deciding the route. That way a purchase completed in the background lands the user in the subscribed state, not on the paywall again.
8. **Keep onboarding answers on-device** if they reveal health, location or gym details. That matches ExcerLock's privacy rule. Send only non-sensitive progress markers, such as step reached, to analytics.

---

## 3. Offline and degraded-network entitlements

### What top apps do
- Premium appears instantly from a local cache.
- The app refreshes the subscription status quietly in the background.
- It never downgrades a paying user because the network or the subscription vendor failed.
- It gives full access during Apple's Billing Grace Period, with a gentle "update your payment" banner.
- It downgrades only when the server positively confirms that the subscription expired.

### Key facts
**Adapty**
- `getProfile()` "always tries to query the API. If... the Adapty SDK fails to retrieve information from the server, the data from the cache will be returned."
- The SDK checks the server about every minute.
- `onLatestProfileLoad` fires at app start "providing cached subscription data even if the device is offline."
- "Even if the server is unavailable, the cached data can be accessed." ([Adapty: Check subscription status (RN)](https://adapty.io/docs/react-native-check-subscription-status), [Adapty: listen for changes](https://adapty.io/docs/react-native-listen-subscription-changes), [react-native-adapty API](https://react-native.adapty.io/classes/adapty))
- The cache survives app restarts and is cleared on reinstall.
- `clearDataOnBackup` defaults to `false`, so a restore from backup keeps the cache. ([Adapty RN docs, full text](https://adapty.io/docs/react-native-llms-full.txt))
- Paywall fetch has `loadTimeoutMs` (default 5 s). On timeout it returns the cache or a bundled fallback paywall. ([Adapty: Fetch paywalls](https://adapty.io/docs/fetch-paywalls-and-products-react-native))
- Access levels expose `isActive`, `expiresAt`, `isInGracePeriod`, `billingIssueDetectedAt`, `willRenew` and `unsubscribedAt`. ([AdaptyAccessLevel](https://react-native.adapty.io/interfaces/AdaptyAccessLevel))

**RevenueCat (the comparable vendor)**
- CustomerInfo is cached, and "users who unlock entitlements will be able to access them even without an internet connection."
- The cache refreshes after 5 minutes in the foreground or 25 hours in the background.
- Offline, an active entitlement "will remain active for up to three days."
- **Offline Entitlements:** if RevenueCat's servers fail, the SDK checks StoreKit 2 purchases on the device and grants the entitlement temporarily. ([RevenueCat: Customer info](https://www.revenuecat.com/docs/customers/customer-info), [RevenueCat: Caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching), [Introducing Offline Entitlements](https://www.revenuecat.com/blog/engineering/introducing-offline-entitlements))
- RevenueCat's server-side "Fortress" grants entitlements for a limited time during outages and replays them later. During a 37-minute incident on 2026-05-07, no transactions were lost. ([RevenueCat Fortress](https://www.revenuecat.com/blog/engineering/building-the-rc-fortress))

**Apple**
- Billing Grace Period "lets subscribers whose auto-renewal failed due to a payment issue continue accessing your app's paid content."
- It lasts 3, 16 or 28 days. Weekly plans are capped at 6 days.
- "Ensure that your app continues to provide service for subscriptions that are already in Billing Grace Period." ([App Store Connect: Billing Grace Period](https://developer.apple.com/help/app-store-connect/manage-subscriptions/enable-billing-grace-period-for-auto-renewable-subscriptions))
- Billing retry runs for up to 60 days, and apps may deep-link to Manage Payments. ([Reducing involuntary subscriber churn](https://developer.apple.com/documentation/storekit/reducing-involuntary-subscriber-churn))
- StoreKit's `currentEntitlements` includes subscriptions that are `subscribed` or `inGracePeriod`. ([Transaction.currentEntitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements))

### Recommended rules for ExcerLock
1. **Four entitlement states:**

   | State | Meaning | Experience |
   |---|---|---|
   | `active` | Subscription confirmed | Full access |
   | `grace` | `isInGracePeriod`, or a billing issue | Full access, plus a non-blocking banner that links to Manage Payments |
   | `lapsed` | The server confirmed it is not active | Free tier or paywall |
   | `unknown` | Never fetched, offline, or Adapty unreachable | Same as the last known state |

2. **Decide synchronously at launch.** Mirror `{isActive, expiresAt, isInGracePeriod, fetchedAt}` into ExcerLock's own local storage, so routing never waits on Adapty starting up or on the network. Update the mirror from `onLatestProfileLoad`.
3. **The paywall appears only on a confirmed lapse.** Never show it because a fetch failed or timed out.
   - Keep a cached `active` for at least `expiresAt` + 3 days while offline (RevenueCat's value).
   - Beyond that, show a soft "Connect to confirm your subscription" message rather than locking features mid-use.
4. **Trust the purchase result.** Right after `makePurchase` succeeds, grant access from that result even if the next profile fetch fails.
5. **Enable Apple's Billing Grace Period.** Use 16 days for monthly and yearly plans; weekly plans get 6. Treat `grace` as full service.
6. **Never strand the lock.** Entitlement state may limit premium features. It must never leave a user's apps shielded with no reachable way to earn an unlock or turn ExcerLock off. Enforcement fails open with respect to billing. Billing is a product question; the lock is a safety question.
7. **Paywall resilience.** Bundle Adapty fallback paywalls and set `loadTimeoutMs` to 3–5 s, so the paywall still renders on poor connections.
8. **Identity.** Call `adapty.identify(<supabase user id>)` after sign-in and await it before any purchase call. Call `adapty.logout()` on sign-out. These follow Adapty's call-order guidance.

---

## 4. Screen Time apps: what survives kill, reboot, force-quit and offload

### What top apps do
- Opal, one sec, ScreenZen, Jomo and Brick all rely on the OS to enforce the lock.
- Blocks keep working when the app is closed or force-quit.
- Breaks and unlock windows end on time without opening the app. Opal support: "Breaks should be ending automatically with no refreshing needed."
- Opal ships self-repair tools ("Reload Blocks", "Reset my Screen Time Connection"), because OS-level state sometimes gets stuck.
- Hard modes add `denyAppRemoval` ("App Uninstall Protection"), a weekly emergency pass, and Screen Time passcode lock-down. ([Opal: Blocking doesn't seem to be working](https://opalapp.com/help/blocking-doesnt-seem-to-be-working), [Opal community: breaks should end automatically](https://community.opalapp.com/t/update-break-blocking-automatically/9432), [Opal: Make Opal foolproof](https://opalapp.com/help/how-can-i-make-opal-foolproof), [Opal: Sessions](https://opalapp.com/help/what-are-sessions))

### Key facts
**System enforcement (Apple)**
- ManagedSettings shields are enforced by the system.
- "Device Activity allows your app to run code on a schedule or on usage events even when your app is not being used." ([WWDC21: Meet the Screen Time API](https://developer.apple.com/videos/play/wwdc2021/10123/))
- `intervalDidEnd` fires "when someone first uses the device outside the activity's scheduled time interval... the system only invokes this method when the device is in use." ([intervalDidEnd(for:)](https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor/intervaldidend(for:)))
- A `warningTime` on the schedule triggers `intervalWillEndWarning` ahead of the end. ([DeviceActivitySchedule](https://developer.apple.com/documentation/deviceactivity/deviceactivityschedule), [intervalWillEndWarning](https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor/intervalwillendwarning(for:)))
- Since iOS 16, an app can use up to 50 named `ManagedSettingsStore`s. They are shared automatically between the app and its extensions. "The most restrictive setting always wins."
- Individual authorization adds two switches in Settings that let the user withdraw ExcerLock's Screen Time access at any time.
- The implicit protection against deleting the app applies only to parental authorization, not individual. ([WWDC22: What's new in Screen Time API](https://developer.apple.com/videos/play/wwdc2022/110336/))
- **The minimum schedule interval is 15 minutes** (`intervalTooShort`). ([MonitoringError.intervalTooShort](https://developer.apple.com/documentation/deviceactivity/deviceactivitycenter/monitoringerror/intervaltooshort))
  - The common workaround for shorter unlock windows starts the interval in the past, so that the end lands N minutes from now (community pattern; [react-native-device-activity #79](https://github.com/kingstinct/react-native-device-activity/issues/79)).

**Deletion, reboot and reliability**
- **Deletion:** an Apple engineer says apps authorized via FamilyControls "are automatically unenrolled upon deletion." ([Apple Developer Forums 718025](https://developer.apple.com/forums/thread/718025))
  - Opal documents cases where shields *persisted* after deletion or after toggling off its permission, and users needed a "hard reset." A clean in-app "turn everything off" matters. ([Opal: Hard reset Screen Time](https://opalapp.com/help/how-do-i-hard-reset-my-screen-time-settings))
- **Reboot (community reports):**
  - An Opal user reports about 30 seconds after a restart before blocks return ([Opal community, 2024](https://community.opalapp.com/t/restarting-phone-with-opal/2917)).
  - Opal fixed an earlier bug where a reboot dropped an ongoing session ([Opal community, 2022](https://community.opalapp.com/t/bug-app-fails-to-restart-after-power-cycle/532)).
  - Core Location monitoring starts only after the first unlock following a reboot ([Apple: Monitoring proximity to regions](https://developer.apple.com/documentation/corelocation/monitoring-the-user-s-proximity-to-geographic-regions)).
- **Reliability:** developers report `intervalDidEnd` and `eventDidReachThreshold` sometimes not firing. An Apple engineer called one such case "a known issue, please file a Bug Report." ([Forums 751597](https://developer.apple.com/forums/thread/751597), [Forums 820956](https://developer.apple.com/forums/thread/820956))
  - Monitor extensions run under a tight memory budget (community: [Habit Doom](https://habitdoom.com/blog/shipping-familycontrols-ios)).
- **Revocation** is observable through `AuthorizationCenter.authorizationStatus`. Revoking access drops every shield and invalidates the tokens. ([AuthorizationCenter](https://developer.apple.com/documentation/familycontrols/authorizationcenter), [Lagerland explainer](https://lagerland-apps.github.io/journal/what-an-iphone-app-can-actually-block/))
- **Offload is not documented.**
  - When a *blocked* app is offloaded, it looks available but is shielded again once it is reinstalled ([Screenable help](https://help.getscreenable.com/article/85-wrong-apps-available)).
  - What happens when the *blocker itself* is offloaded is unknown. Offloading removes the app bundle, which presumably includes its extensions, so re-locks at the end of a window may not run.
  - **Needs a device test.**

### What users expect when an unlock window ends while ExcerLock is closed
- The app locks again at the end time, without ExcerLock being opened.
- If they are inside the app at that moment, the shield covers it.
- Ideally a short heads-up comes first.
- Opal users file bugs when a break does not end by itself, or ends late. ([Opal community thread](https://community.opalapp.com/t/app-is-not-blocking-back-after-i-use-my-time-out/9504))

### Recommended rules for ExcerLock
1. **The extension owns enforcement.**
   - Every unlock removes the shield *and* registers a DeviceActivity schedule whose `intervalDidEnd` puts the shield back. Respect the 15-minute minimum by starting the interval in the past.
   - Lock state lives in the App Group (named stores plus a small state record), so the app and the extensions agree.
   - Never require the main app to be running for a lock or a re-lock.
2. **Reconcile everywhere.** On every cold launch, every foreground, and every extension callback, work out the *expected* shield state from the persisted state and the clock, then apply it idempotently. This is Opal's "Reload Blocks", done automatically. Also offer a quiet "Repair lock" action in Settings.
3. **Heads-up before re-lock.** Set a `warningTime` of 1–2 minutes and post a local notification from `intervalWillEndWarning`, for example "Instagram locks again in 1 minute". Only do this if notifications are allowed, and never as a modal.
4. **Expect a short gap after a reboot.** Re-apply on the first extension or app run. Never promise "instant" protection in copy.
5. **A clean exit beats a hard trap.**
   - Provide "Turn off ExcerLock", which clears every named store and stops all monitoring, so nobody has to delete the app to escape.
   - Avoid Opal-style shields stuck after deletion.
   - Make `denyAppRemoval` an opt-in hard mode only, never the default.
6. **Never apply a lock with no recorded way out.** If an extension cannot read its state, keep the shields as they are, but make sure the next app open can clear or re-earn them. Never write a shield without a stored end condition.
7. **Revocation.** If `authorizationStatus` is no longer approved on foreground, show one calm, persistent state: "ExcerLock can't lock apps right now", with the path to Settings. Do not penalize streaks or history, and do not re-prompt modally.
8. **Test before relying on these:**
   - offload of ExcerLock;
   - a reboot during an unlock window;
   - a force-quit during an unlock window;
   - an iOS update during a lock.

---

## 5. Background location and motion

### What top apps do
- **Geofence apps** such as Reminders work silently once they are set up. They ask for the extra permission only at the moment it is needed: Reminders asks for full accuracy when you create a location reminder.
- **Fitness trackers** such as Strava show the blue background-location indicator while they record.
- **Step and goal apps** read history after the fact instead of running in the background.
- None of them nag. Explanation happens once, in context.

### Key facts
**Geofences (CLMonitor)**
- "The system monitors regions and wakes up your app as needed."
- Apps are limited to 20 conditions.
- "If an iOS app isn't running when a condition is satisfied, the system tries to launch it... recreate the monitor with the same identifier."
- "Monitoring can only occur after the user unlocks the device after a reboot." ([Monitoring the user's proximity to geographic regions](https://developer.apple.com/documentation/corelocation/monitoring-the-user-s-proximity-to-geographic-regions))
- Region events usually arrive within 3–5 minutes and need network connectivity. Radii of 1–400 m work best. ([startMonitoring(for:)](https://developer.apple.com/documentation/corelocation/cllocationmanager/startmonitoring(for:)))

**Relaunch rules**
- The system "doesn't launch an app with When in Use authorization to deliver new updates; it does launch an app with Always authorization for some types of location updates."
- A separate request for Always "can be made only once." ([Requesting authorization to use location services](https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services))
- **Region monitoring requires full (precise) accuracy.** "Region entry and exit notifications will not be delivered for apps that are not authorized for full accuracy." ([WWDC20: What's new in location](https://developer.apple.com/videos/play/wwdc2020/10660/))

**Significant-change service**
- It relaunches a terminated app into the background.
- It fires after moves of 500 m or more, no more often than every 5 minutes. ([startMonitoringSignificantLocationChanges()](https://developer.apple.com/documentation/corelocation/cllocationmanager/startmonitoringsignificantlocationchanges()))

**Force-quit: conflicting evidence**
- An Apple engineer (March 2026) says the significant-change API "will relaunch the app despite a force quit." ([Forums 818370](https://developer.apple.com/forums/thread/818370))
- Developers report that a force-quit app is *not* relaunched for region or significant-change events. Recent Apple forum posts claim the same for iOS 26, but those are developer reports, not Apple statements. ([Forums 701377](https://developer.apple.com/forums/thread/701377), [Stack Overflow 78589879](https://stackoverflow.com/questions/78589879/monitoring-regions-when-app-is-in-background-or-just-terminated))
- Treat relaunch after force-quit as unreliable.

**Background App Refresh and wake time**
- When Background App Refresh is off, "the system doesn't wake your app for region notifications."
- A woken app has "around 10 seconds" to work. ([Location and Maps Programming Guide, archived](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/LocationAwarenessPG/RegionMonitoring/RegionMonitoring.html))
- Low Power Mode turns Background App Refresh off.
- Don't warn the user when the status is `restricted`. ([backgroundRefreshStatus](https://developer.apple.com/documentation/uikit/uiapplication/backgroundrefreshstatus))

**What users see and how to tell them**
- "For Always authorization, inform the user that location updates arrive in the background." ([Handling location updates in the background](https://developer.apple.com/documentation/corelocation/handling-location-updates-in-the-background))
- iOS itself periodically asks "[App] has been using your location in the background. Do you want to continue allowing this?" and, since iOS 13, shows a map of where it happened. ([WWDC14: What's new in Core Location](https://nonstrict.eu/wwdcindex/wwdc2014/706/), [Quartz, iOS 13](https://qz.com/1713581/what-to-do-when-an-iphone-app-is-using-your-location-in-the-background))
- Fewer background location uses mean a less alarming map.

**Motion and HealthKit**
- `CMPedometer.queryPedometerData(from:to:)` returns up to **7 days** of history ([docs](https://developer.apple.com/documentation/coremotion/cmpedometer/querypedometerdata(from:to:withhandler:))).
- HealthKit background delivery wakes the app at most once an hour for `stepCount` on iOS.
- The app must call the completion handler. After three failures HealthKit stops delivering. ([enableBackgroundDelivery](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery(for:frequency:withcompletion:)))

### Recommended rules for ExcerLock
1. **Walk Conditions don't need ExcerLock running.**
   - Count steps from `CMPedometer` history (7 days) or HealthKit when the user opens ExcerLock or acts on a shield. The answer is instant and needs no background process.
   - HealthKit background delivery (at most hourly) is optional, to earn ahead of time.
2. **Gym Conditions use CLMonitor geofences**, with Always and precise location.
   - Budget the 20-condition limit, for example by capping saved gyms.
   - Re-create monitors with the same identifiers natively at launch, before JavaScript boots.
   - Persist the arrival and departure timestamps in the App Group.
3. **Two-step location ask, in context.**
   - Ask for When-In-Use when the user adds their first gym.
   - Ask for the Always upgrade the first time they save a gym Condition, after a one-screen primer: "so ExcerLock can notice when you arrive, even when it's closed". The Always prompt shows only once.
4. **Degraded modes that still work.** Without Always, precise location or Background App Refresh, a gym Condition falls back to "check in when you're there", a foreground location check. Show a single inline note on the Condition card. Never repeat alerts.
5. **Explain once, then stay quiet.** Status lives on the Condition card. Prefer geofences over continuous tracking so iOS's background-usage reminder shows few events. Never use the location background mode without a real-time need: it carries review risk under Guideline 2.5.4 and costs trust.
6. **Don't rely on the relaunch.**
   - When the app opens, ask CLMonitor for its current state and reconcile any arrival that was missed while ExcerLock was dead or force-quit.
   - Background wakes get about 10 seconds. Do minimal native work: record the event and update the shield state. Do not boot full JavaScript, check for OTA updates, or call the network unless needed.

---

## 6. Permissions: asking and revocation

### What top apps do
- They ask at the moment of need, after a short primer.
- They ask at launch only for what the app cannot work without. Opal asks for Screen Time during onboarding.
- They never re-prompt in a loop.
- When access is revoked, the affected feature shows a calm inline state with an "Open Settings" link. The rest of the app keeps working.

### Key facts
**When and how to ask (HIG)**
- "Request permission only when your app clearly needs access."
- "Avoid requesting permission at launch unless the data or resource is required for your app to function."
- Purpose strings should be specific active sentences. ([HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy))
- **Primer screens:** "Include only one button and make it clear that it opens the system alert." Use "Continue" or "Next", never "Allow". Offer no cancel or close. ([same page](https://developer.apple.com/design/human-interface-guidelines/privacy))
- The HIG also allows folding a required permission into onboarding to "show people why your app or game needs their permission." ([HIG: Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding))

**App Review**
- Guideline 5.1.1(iv): "Apps must respect the user's permission settings and not attempt to manipulate, trick, or force people to consent... Where possible, provide alternative solutions for users who don't grant consent." ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))

**Notifications**
- Ask in context, for example after the first task is scheduled.
- **Provisional authorization** delivers notifications quietly to Notification Center without a prompt.
- "Always check your app's authorization status before scheduling local notifications. People can change your app's authorization settings at any time." ([Asking permission to use notifications](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications))

**Revocation**
- FamilyControls status "may change due to external events, such as... changing the status in Settings." Observe `authorizationStatus`. ([AuthorizationCenter](https://developer.apple.com/documentation/familycontrols/authorizationcenter))
- Changing a privacy setting kills the suspended app, so on return the app must restore its state (§2).

### Recommended rules for ExcerLock
1. **Screen Time is requested during onboarding.** It is core, and nothing works without it. Show a one-button "Continue" primer that explains what ExcerLock will and won't see.
2. **Location, Motion and Health are requested when the user creates a Condition that needs them.** Never at launch, never in bulk.
3. **Notifications use provisional authorization by default.** Ask explicitly only when the user turns on something that needs alerts, such as the "heads-up before re-lock".
4. **One proactive ask per permission, per feature.** After a denial, the feature shows its degraded mode and one inline line with "Open Settings" (`Linking.openSettings()`). No recurring modals, no nag counters.
5. **Re-read every permission on foreground and after a Settings round-trip.**
   - Use the local status APIs.
   - Update affected Conditions in place, for example "Gym check-in needs precise location — Open Settings".
   - Do not touch Conditions that are unaffected.
6. **Only a Screen Time revocation earns an app-level banner**, because nothing can be enforced without it. Everything else stays local to its Condition.
7. **Never tie permissions to money.** Denying a permission never changes subscription state, and the paywall never asks for permissions (Guideline 5.1.1(ii): "Paid functionality must not be dependent on or require a user to grant access to this data").

---

## 7. OTA updates (EAS Update)

### What top apps do
- They never hold launch for an update.
- They download quietly and apply at a natural seam: the next cold start, or a return after a long absence.
- Production users are not prompted. TestFlight users may be.
- Every update can be rolled back and is watched for crashes.

### Key facts
**Expo's guidance**
- The default checks on cold launch and downloads asynchronously. "This process does not block loading the app." The update applies on the next cold start.
- Expo "recommend[s] against" blocking startup until the latest update downloads: "the resulting user experience is extremely poor."
- Options:
  - check on foreground or at an interval;
  - download in the background with `expo-background-task`;
  - reload while backgrounded, which is "experimental". Expo suggests doing this "only... if the app has been inactive for a certain period of time."
- There is no first-class support for critical updates. Expo points to the UpdatesAPIDemo pattern. ([Expo: Downloading updates](https://docs.expo.dev/eas-update/download-updates/))
- Defaults are `checkAutomatically: ON_LOAD` and `fallbackToCacheTimeout: 0`. Manual control means `ON_ERROR_RECOVERY` or `NEVER` plus `checkForUpdateAsync`, `fetchUpdateAsync` and `reloadAsync`.
- `isEmergencyLaunch` flags a fallback to the embedded bundle. ([Expo Updates SDK](https://docs.expo.dev/versions/latest/sdk/updates/))

**Bluesky (social-app, open source)**
- It checks 10 seconds after launch, "to allow analytics to initialize", and downloads silently.
- When the app returns to the foreground after **15 minutes or more** in the background, it reloads with a branded splash if an update is pending. Otherwise it checks again. The reasoning: "chances are that there isn't anything important going on in the current session."
- Only TestFlight users get a "Relaunch now?" prompt. The comment says prompting production users "is suspect... with the Apple App Store guidelines."
- Network errors are not logged as errors. ([bluesky-social/social-app useOTAUpdates.ts](https://github.com/bluesky-social/social-app/blob/main/src/lib/hooks/useOTAUpdates.ts))

### Recommended rules for ExcerLock
1. **Never block launch.** Keep `fallbackToCacheTimeout: 0`. No update spinner, ever, for returning users.
2. **Download quietly after the first screen is interactive**, about 5–10 seconds in, on foreground launches only.
3. **Apply only at safe moments:**
   - the next cold start;
   - a return to foreground after at least 15 minutes in the background (Bluesky's rule), shown with the branded reload splash.
4. **Never apply during:**
   - a purchase;
   - a permission prompt or a trip to Settings;
   - a Condition check in progress;
   - an active unlock countdown;
   - any screen with unsaved input.

   Restoration (§2) makes the remaining reloads invisible.
5. **Never check, download or reload during a background launch**, whether from a geofence, HealthKit, or a notification action.
   - With `ON_LOAD`, every background wake can trigger an update check.
   - Consider `checkAutomatically: ON_ERROR_RECOVERY` and drive checks from JavaScript on foreground only.
   - **Verify on a device** how expo-updates behaves on background launches.
6. **Exception for brand-new installs:** before the user has meaningful state, applying a newer update right away is acceptable, because there is nothing to disrupt.
7. **Critical fixes.** Mark an update "critical" in its metadata. A critical update applies on the next foreground regardless of the 15-minute rule, never mid-flow.
8. **Monitor.** Tag the Sentry release and dist with the update ID. Alert on `isEmergencyLaunch` and on failed installs on the EAS deployments page. Roll out gradually.

---

## 8. Account deletion and sign-out

### What top apps do
- "Delete account" sits in Account settings.
- It can require one fresh sign-in.
- It states clearly what happens to the subscription.
- It completes in-app with no email or support ticket, and confirms when deletion is done.
- Sign-out is quick and leaves device-level things alone, such as permissions and the "seen intro" flag.

### Key facts
**Apple's rules**
- Guideline 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app." ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))
- Apple's support page says:
  - make deletion easy to find;
  - delete the entire account record, because deactivation alone is insufficient;
  - re-authentication and confirmation are allowed, but not "unnecessarily difficult";
  - no phone, email or support flow unless the app is in a regulated industry;
  - say how long deletion takes and confirm when it is complete.
- **Subscriptions:** "notify them that their billing will continue through Apple and request that they cancel their subscription before continuing." Use `showManageSubscription` or `https://apps.apple.com/account/subscriptions`. Apps may offer scheduled deletion at expiry, as long as immediate deletion is also offered.
- **Sign in with Apple:** "should use the Sign in with Apple REST API to revoke user tokens." ([Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [Revoke tokens API](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens))
- HIG: keep the in-app and web deletion flows equally simple, and notify when deletion completes. ([HIG: Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts))

**Vendor tools**
- Supabase `signOut()` defaults to global scope in JavaScript ([Supabase sign-out](https://supabase.com/docs/guides/auth/signout)).
- Supabase's Apple guide does not cover revoking Apple tokens, so the server must do it.
- Adapty has `logout()` on the client ([Adapty RN docs](https://adapty.io/docs/react-native-llms-full.txt)) and a server-side **Delete profile** API ([Adapty API: deleteProfile](https://adapty.io/docs/api-adapty/operations/deleteProfile)).
- PostHog: `posthog.reset()` on logout ([PostHog RN](https://posthog.com/docs/libraries/react-native)); data deletion is documented separately ([PostHog: Data deletion](https://posthog.com/docs/privacy/data-deletion)).

### Recommended rules for ExcerLock
**Deletion flow:**
1. Settings → Account → Delete account.
2. A one-screen explanation: what gets deleted, and that the subscription keeps billing through Apple. The screen has a "Manage subscription" button that calls `showManageSubscription`.
3. A fresh sign-in. For Apple users this produces the authorization code the server needs to revoke Apple tokens.
4. Confirm.
5. The server:
   - deletes the Supabase user and their rows;
   - revokes the Sign in with Apple token;
   - deletes the Adapty profile;
   - deletes the PostHog person;
   - deletes support records unless the law requires keeping them.
6. The device performs the wipe in the table below.
7. A "deleted" confirmation screen.

There are no support tickets, and no "deactivate" substitute.

**What survives:**

| State | Sign-out | Account deletion |
|---|---|---|
| Supabase session (Keychain key and encrypted blob) | Wipe, with `scope: 'local'` | Wipe; the server ends all sessions |
| Adapty identity | `adapty.logout()` | `logout()` plus the server deletes the profile |
| Apple subscription | Untouched; it comes back via restore or identify on next sign-in | Untouched; the user is told to cancel |
| Active shields and DeviceActivity schedules | Clear, so this iPhone unlocks, after a confirmation that says so. A signed-out user can't earn unlocks, so never strand them. | Clear |
| Screen Time authorization | Keep, since it is a device permission and re-granting is friction | Revoke (`revokeAuthorization`) for a clean slate |
| OS permissions (location, motion, Health, notifications) | Keep; the app can't revoke them | Keep, and tell the user they can switch them off in Settings |
| Conditions, app selections, earn history, streaks | Remove from the device; restore from the account on sign-in if synced | Delete on the device and on the server |
| Geofences (CLMonitor) and pending local notifications | Stop or cancel | Stop or cancel |
| "Seen intro" and device-level UI preferences | Keep | Keep. Delete is not an uninstall, so don't replay marketing intros; restart account setup. |
| Analytics and crash identity | `posthog.reset()`, `Sentry.setUser(null)` | Same, plus the server-side person deletion |
| OTA bundle and paywall cache | Keep | Keep |

**Sign-out rules:**
- It never asks for authentication again.
- If the device is offline, sign-out still completes locally. supabase-js removes the local session even when the server call fails; the server session simply lapses unused.
- Because sign-out unlocks apps, the confirmation copy must say so plainly. That keeps sign-out from becoming a hidden bypass and keeps the outcome from surprising anyone.

---

## 9. App launch speed

### What top apps do
- Pixels appear immediately, and the launch screen is indistinguishable from the first screen.
- Returning users land on a usable Home drawn from cached data, with no spinner, while fresh data loads in behind it.
- Analytics, ads and update checks are deferred until after first render.

### Key facts
**Apple**
- "Launch instantly... sometimes they don't want to wait more than a couple of seconds."
- The launch screen should be "nearly identical to the first screen", with no text, no branding and no ads. A splash, if any, belongs in onboarding. ([HIG: Launching](https://developer.apple.com/design/human-interface-guidelines/launching))
- **The target is a first frame within 400 ms.** About 100 ms is system work, leaving about 300 ms to "create your views, load your content, and generate your first frame". Placeholders are fine. Avoid blocking the main thread with network or file I/O. ([WWDC19: Optimizing App Launch](https://developer.apple.com/videos/play/wwdc2019/423/))
- Measure with the Xcode Organizer Launch Time pane (p50 and p90) and MetricKit `TimeToFirstDrawMetric`. ([Reducing your app's launch time](https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time))

**Sentry**
- Its bands: cold start under 3 s is good and over 5 s is poor; warm start under 1 s is good and over 2 s is poor.
- It also cites Apple's 400 ms first-frame guidance. ([Sentry: Mobile Vitals](https://docs.sentry.io/product/dashboards/sentry-dashboards/mobile/mobile-vitals/), [Sentry: App Starts](https://docs.sentry.io/product/dashboards/sentry-dashboards/mobile/mobile-vitals/app-starts/))

**Shopify (React Native)**
- Targets: app launch within 2 s at p75, critical screens under 500 ms at p75.
- Results:
  - `inlineRequires: true` cut launch time by 17%;
  - fixing a slow native module cut it further;
  - cache-first rendering with cache pre-warming means about 90% of merchants see cached data first.
- Launch got 44% faster. ([Shopify Engineering: Improving Shopify App's Performance](https://shopify.engineering/improving-shopify-app-s-performance))

**Duolingo**
- Deferring an ads SDK's initialization until Home loaded saved about 1.5 s.
- Making a blocking availability check non-blocking cut startup by 15%.
- They track "app open conversion" (did the user reach Home?) as a company-wide guardrail. ([Duolingo: Android performance](https://blog.duolingo.com/android-app-performance/))

**Expo splash**
- The splash hides automatically. `preventAutoHideAsync()` exists for loading resources, but "the goal should be to hide the splash screen as soon as possible." ([Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/))
- Expo Router's auth example keeps the splash only while the *local* session loads. ([Expo Router: Authentication](https://docs.expo.dev/router/advanced/authentication/))

### Recommended rules for ExcerLock
1. **Budgets** on a three-year-old iPhone:

   | Measure | Target |
   |---|---|
   | First frame | 400 ms or less |
   | Returning user to interactive Home, cold start, p75 | 1.5 s or less (hard ceiling 2 s) |
   | Warm resume | Under 1 s |

   Track these in Sentry App Starts and the Xcode Organizer. Add an "app open → Home rendered" conversion metric as a guardrail.
2. **The launch screen matches the first screen's background** (the light orange-to-ivory gradient, or its dominant solid color). No logo or text unless it is part of Home.
3. **Nothing on the network in the critical path.** Before the native splash hides, read only these, synchronously or in well under 50 ms:
   - the session;
   - the onboarding step;
   - the cached entitlement;
   - the lock state in the App Group.

   Then render Home from the cache. Refresh Supabase, Adapty, permission statuses and lock reconciliation afterward.
4. **No JavaScript loading screen for returning users.** Hide the splash on the first layout of the real screen. If something genuinely async remains, use skeleton placeholders inside the real layout, never a full-screen spinner.
5. **Defer non-critical startup work** until after Home renders, with a 3–10 s delay:
   - PostHog and feature-flag fetches that don't gate the UI;
   - Adapty paywall prefetch;
   - the OTA check;
   - Sentry replay;
   - any warm-up.
6. **Build hygiene.** Use Hermes and `inlineRequires: true`. Profile the init time of native modules, including the Screen Time and location modules. Keep the root layout's imports lean.

---

## Cross-cutting: the launch and foreground contract

These are the same steps every time ExcerLock starts or comes to the foreground. They tie together the rules in §1–§9.

1. **Synchronously, before the splash hides:** read the session, the onboarding state, the entitlement mirror and the App Group lock state. Route and render.
2. **Natively, right away:**
   - Re-create CLMonitor monitors.
   - Reconcile shields against the schedule.
   - If this is a background launch, record the event and stop here.
3. **After first render**, for foreground launches only:
   - check permission statuses;
   - check Apple credential state;
   - `startAutoRefresh()`;
   - refresh the Adapty profile;
   - run the deferred SDK initializations;
   - check for an OTA update after a delay.
4. **On background:** `stopAutoRefresh()`, persist drafts, and record the time for the 15-minute OTA rule.

## Needs on-device verification before the spec relies on it
- What happens to shields and re-locks when ExcerLock itself is offloaded.
- Whether CLMonitor or the significant-change service relaunches ExcerLock after a force-quit on iOS 26.
- How long shields take to come back after a reboot, and whether an unlock window that ends during the reboot re-locks correctly.
- expo-updates network checks on background launches under `ON_LOAD`.
- Migrating existing Keychain items from `WHEN_UNLOCKED` to `AFTER_FIRST_UNLOCK`. They must be rewritten.
- Adapty's cached `isActive` after a long offline period past `expiresAt`. Adapty doesn't document an offline cap the way RevenueCat's 3-day rule does, so ExcerLock should apply its own.
