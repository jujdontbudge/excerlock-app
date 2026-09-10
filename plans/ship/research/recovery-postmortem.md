# Post-mortem — the "Reform" → "Regen" → "Recovi" recovery app

Investigated 2026-09-09, read-only. Sources: local filesystem, git, GitHub issues
(`JohanSardar/recovi`, 200 issues), App Store Connect via `asc`, EAS via `eas-cli`,
and `/Users/johansardar/ios-app-pitfalls/PITFALLS.md`.

## 0. Location, identity, timeline

**Repo: `/Users/johansardar/reform`** — 1,321 commits, branch `font/rubik-700`,
remote `git@github.com:JohanSardar/recovi.git`.
First commit `c16a2e7d` 2026-06-10; last `eccc0bab` 2026-09-05.

Renamed twice — **Reform → Regen** (`eb4c22a2`, 2026-07-02), **Regen → Recovi**
(`b1c047ab`, 2026-08-19). Identifiers deliberately kept historical stems: slug `reform`,
bundle `com.regenapp.app`, EAS project `reform` (projectId `fc45274c-6619-4255-b413-a17c6058364e`),
Sentry project `reform-mobile`, ASC app `6786847351`, Apple team `AX3C2B78YD`.

Other paths searched under `/Users/johansardar/` (excl. node_modules):
`reform-release-106` (worktree at 1.0.6/47, `9620b5b8`), `reform/backup-*` (~40 snapshot dirs),
`reform/.claude/worktrees/agent-*`, `reform-backups`, `backup-worktree-convergence-20260824`,
`backup-20260713-62-worktrees`, `reform-partner-sms`, `regen-marketing`, `recovi-content`,
`AppBuildingNotes/apps/quit-porn-reform/index.md`, `Documents/regen-legal`,
`Desktop/Regen-signing-backup-20260816-0715`. The `*/RecoveryImproved` hits are Chrome
profile dirs, not projects.

### Timeline correction
Brief said "~9 months, hundreds of submissions". Evidence says **~3 months**:
- git 2026-06-10 → 2026-09-05
- `asc versions list`: **7 versions** — 1.0 (07-02), 1.0.2 (08-15), 1.0.3 (08-18),
  1.0.4 (08-26), 1.0.5 (08-31), 1.0.6 (09-01), 1.0.7 (09-05), all READY_FOR_SALE (1.0.1 delisted)
- `asc builds list`: **20 retained** — 10, 19, 20, 22, 24, 26, 27, 28, 32, 34, 35, 37, 38, 39,
  40, 41, 46, 47, 49, 50 (numbers skip, so real uploads are higher; ASC prunes expired)
- `asc review submissions-list`: **10 retained** (2026-07-25 → 2026-09-05)

Sibling ExcerLock repo starts 2026-07-28, so the portfolio doesn't extend the window.
What *is* true: 4 rejection rounds, a 7-day review stall, ~25 P0/P1 production incidents.

## 1. Stack

`mobile/package.json`:

| Layer | Version |
|---|---|
| Expo SDK | `~56.0.20` — **managed workflow + prebuild** (`expo-dev-client ~56.0.25`), not bare |
| React Native / React | `0.85.3` / `19.2.3` |
| Router | `expo-router ~56.2.19` |
| OTA | `expo-updates ~56.0.25` (lockfile 56.0.25; SDK 56 docs recommend 56.0.26) |
| Auth | Clerk `@clerk/clerk-expo ^2.19.42`, `expo-apple-authentication ~56.0.4`, `expo-auth-session` |
| Payments | RevenueCat `react-native-purchases ^10.2.2` |
| Analytics | `posthog-react-native ^4.46.30`, `@sentry/react-native ~7.11.0` |
| Blocker | `react-native-device-activity ^0.6.1` + local module `modules/reform-blocker` |
| Storage | `expo-secure-store`, `@react-native-async-storage/async-storage 2.2.0`, `@noble/ciphers` |
| Other | `zustand 5.0.3`, `react-native-reanimated 4.3.1` + `react-native-worklets 0.8.3`, `expo-video`, `expo-glass-effect` |
| Backend | Fastify + Postgres on a VPS (`api.regenapp.us`), `server/` in-repo, Clerk JWT (dual-issuer JWKS) |

Three iOS app extensions declared through `extra.eas.build.experimental.ios.appExtensions`
(`mobile/app.json:139-170`): `ShieldConfiguration`, `ShieldAction`, `ActivityMonitorExtension` —
each with `com.apple.developer.family-controls` and app group
`group.com.regenapp.app.deviceactivity`.

---

## 2. App Store review — all four rejection rounds + the stall

App: **Regen: Addiction Recovery**, Apple ID `6786847351`, bundle `com.regenapp.app`.
Primary sources: `plans/sessions/ttys003/findings.md`,
`plans/sessions/ttys003/submission-fix-log.md`, `docs/asc/RESUBMISSION-2026-07-22.md`,
`plans/sessions/ttys023/last-action.md`.

## Round 1 — 2026-07-20 · automated · **Guideline 2.5.1** · Submission `9431c793`, 1.0 build 10

Apple, verbatim (`findings.md`):

> "An automated analysis indicates the app uses one or more Screen Time APIs but the app has not
> been submitted with the Family Controls entitlement... must first request and, if approved,
> configure the Family Controls entitlement."
> Apple invites: "Reply to this message in App Store Connect."

Forensics proved the binary was already correct (verbatim, 10+ direct checks):

> 1. **Build 10 binary** (`app10.ipa`) — `codesign -d --entitlements` shows
>    `com.apple.developer.family-controls = true` on ALL 4 targets (main Regen +
>    ActivityMonitorExtension + ShieldConfiguration + ShieldAction).
> 2. **Build 10 embedded provisioning profiles** — `security cms -D` shows
>    `com.apple.developer.family-controls` PRESENT in the allowlist of ALL 4 distribution
>    profiles (get-task-allow=false). The earlier claim they were MISSING was a bad check.
> 4. **Capability Requests tab = "Assigned"** for Family Controls (Distribution) on ALL 4 bundle IDs.
> 5. **Timeline rules out a timing artifact:** build 9 (2026-07-16 05:41) FAILED to sign because
>    profiles lacked the entitlement; the capability was enabled minutes later; build 10 (06:11)
>    signed successfully WITH it. So the entitlement has been in place since 2026-07-16 — days
>    before the 2026-07-20 review. Not propagation lag.

Second forensic pass on the submitted IPA:

> `codesign -d --entitlements` on the SIGNED binaries (not just the profile allowlist):
> `com.apple.developer.family-controls = <true/>` (Boolean) on the MAIN app AND all 3 extensions;
> all 4 embedded profiles are STORE … **No build defect. A rebuild = byte-identical entitlements.**

Root cause (verbatim):

> The runbook's claim … that "Assigned" auto-inherit means done was **only ever validated at the
> portal/build level — never through actual App Store review**. Regen is the first app on this
> account to reach App Store review with Family Controls, and it got the automated rejection
> despite being correctly entitled. **So portal "Assigned" is NOT sufficient to pass App Store
> automated analysis.**
>
> **Real cause (account/approval layer, invisible to the IPA):** the automated analyzer
> cross-references Apple's server-side Family Controls *distribution approval record* for the
> bundle IDs, **NOT the bytes**. Portal "Assigned" (managed capability) ≠ approved request.
> Research (Apple docs + forums) also says **each extension needs its own approval and does NOT
> auto-inherit the main app's**.

Note: an earlier diagnosis ("profiles missing family-controls / EAS bug #2715 / rebuild with manual
profiles") was **wrong** and had to be retracted in-doc.

**Cleared by:** waiting for Apple's approval of the in-flight entitlement request + a Resolution
Center reply naming all four bundle IDs, then **resubmitting the same build 10 unchanged**
(explicitly *not* rebuilding — a rebuild would re-trip the analyzer with identical bytes).

## Round 2 — 2026-07-21 resubmit — **2.5.1 CLEARED**

## Round 3 — 2026-07-22 · human reviewer (iPhone 17 Pro Max + iPad Air M3, iOS 26.5.2) · 3 items

Verbatim (`findings.md:138-152`):

> 1. **Guideline 2.1(b) App Completeness — IAP not submitted.** "app includes references to
>    subscription but the associated In-App Purchase products have not been submitted for review."
>    Fix: submit the IAP products + upload a NEW binary; each IAP needs an App Review screenshot.
> 2. **Guideline 1.1 Safety — Objectionable Content in MARKETING metadata.** "terms or images
>    that reference objectionable content... in the app's metadata, including keywords,
>    screenshots." (quit-porn positioning trips Apple.)
> 3. **Guideline 2.1(b) App Completeness — paywall bug.** "no action was generated when we tapped
>    'free trial' button to purchase subscription." + "confirm you have a Paid Apps Agreement in
>    effect."

Offending metadata captured verbatim from live ASC (`submission-fix-log.md:19-31`):

> - Keywords: `nofap,reboot,addiction,recovery,relapse,streak,accountability,sobriety,discipline,adult,nsfw,pmo`
>   → **OBJECTIONABLE HITS: nofap, adult, nsfw, pmo**
> - Promotional Text: "Quit corn with a system, not just a streak…"
> - Description opens: "Regen is a recovery companion for quitting **adult content**." +
>   "turn on the **adult website** blocker".
> - Screenshots (uploaded v14-asc set): content-blocker caption = **"Block all NSFW"**
>   (source `compose_quittr_style_v2.py:297` / `v3.py:55`).
> - Also: 🌽 emoji ("Easily Quit 🌽"), progress ring text "REWIRED", and a real adult-site URL
>   (`cornhub.com`) rendered in the block-page mock (URL bar + chip).

Root cause of #1 and #3 (verbatim, `submission-fix-log.md:7-13`):

> **G2.1(b) — "free trial" button did nothing.** Root: same unsigned agreement → RevenueCat
> returns 0 offerings → `buy()` early-returns with a subtle "Plans are still loading" caption,
> no StoreKit sheet. Paywall CODE is correctly wired (OnboardingFlow.tsx CheckoutPaywallScreen
> `buy` L1758-1798 → purchasePlan → Purchases.purchasePackage). **NOT a code bug.**

## Round 4 — 2026-07-22 · resubmission rejected with the **identical three items**

Verbatim (`findings.md:120-133`):

> - Submission 9431c793 Messages(3): Apple 07-20 11:03 (orig reject) → Johan 07-20 19:15 (reply) →
>   **Apple TODAY 1:21 AM** = response to the resubmission: "Thank you for your resubmission, but
>   we need additional information." It lists the EXACT SAME THREE items — 2.1(b) IAP not
>   submitted; 1.1 objectionable metadata (keywords, screenshots); 2.1(b) "no action when we tapped
>   free trial" + "Confirm you have a Paid Apps Agreement in effect." Reviewer attached
>   **Screenshot-0722-131804.png (the dead trial button). There is NO 4th/new issue** — Johan's
>   "another issue" = this restated reject.
> - Business → Agreements (LIVE): **Paid Apps Agreement = "Pending User Info"** (Jul 22, 2026 –
>   May 28, 2027). Blocked on THREE account-holder actions, all shown on the page: Add Bank Account
>   (none), Add Tax Form (U.S. W-9 = "Missing Tax Info"), EU DSA trader ("Complete Compliance
>   Requirements"). **Free Apps Agreement is Active (why the free listing works, but paid IAP needs
>   the Paid Apps Agreement).**
> - CONCLUSION: the resubmission could not pass — agreement still inactive (IAPs unsubmittable +
>   trial button no-ops) AND the sanitized metadata/new binary weren't in it yet.

### Exactly what was changed to clear rounds 3–4

Owner-only (Johan; Claude prohibited from financial/legal actions):
1. Paid Apps Agreement → Active: bank account, U.S. Form W-9, EU DSA trader declaration
2. **7-day Free Introductory Offer** created on weekly / 90-day / annual, all territories
   (previously `trial_duration: null` on every product)
3. Win-back product `com.regenapp.app.premium.quarterly.winback` moved to **its own subscription
   group** so its "Start Free Trial" label is truthful (intro offers are one-per-group)
4. IAP display names renamed Reform → "Regen Weekly / Regen 90 Days / Regen Annual" (2.3.8)
5. Age rating questionnaire answered; Marketing URL `https://regenapp.us` (404) →
   `https://regenapp.us/support`; App Privacy labels; per-IAP App Review screenshots

Code (in the new binary), from `submission-fix-log.md` change log:
- **C1** auto-renew disclosure under both purchase CTAs — `OnboardingFlow.tsx ~L2036`,
  `OneTimeOfferScreen.tsx L136` (3.1.2)
- **C2** Sign out + Delete account footer on `CheckoutPaywallScreen` (`OnboardingFlow.tsx L2050-2058`)
  — "**HARD 5.1.1(v) auto-reject**" because non-subscribers are pinned at the paywall
- **C3** empty-offerings guard: CTA disabled + "Couldn't load plans. Retry" when `hasPlans=false`
  — the literal dead button Apple screenshotted
- **C4** `OnboardingFlow.tsx L1123` "Cut your chance of relapse by up to 76%." → mechanism copy (5.2.1)
- **C5** `GoalRing.tsx L119` "REWIRED" → "RECLAIMED" (5.2.1)
- **C6** `planReadyContent.ts` RECOVERY_MILESTONES physiology predictions → reported-experience framing
- **C8** restored `docs/CLINICAL-CLAIMS.md` + AST guardrail test banning bare `\d+%` / "rewire" in
  onboarding+paywall claim copy
- **C9** slide-5 body softened: "Recovery programs reveal 90 days is where new patterns wire in your
  brain." → "Recovery programs commonly treat 90 days as the mark where a new habit takes hold."
- **D1** `app.json` privacyManifests `NSPrivacyAccessedAPITypes` had **exact duplicate entries
  (8 → 4)** — ITMS-91053 upload-blocking risk
- **D2** `android.permissions` duplicated → deduped
- **D3** `subscription.tsx:61` "NSFW content blocker" → "System-wide site blocker"
- **D6** delete-account alert now states deletion does not cancel the App Store subscription (5.1.1)
- **D8** **crisis resources (988 + findahelpline)** — "genuine 1.4.1 safety gap (**only real code
  FAIL**)": new `components/v2/CrisisResourcesRow.tsx` wired into `app/(app)/relapse-confirm.tsx:158`
  and `panic-entry.tsx:364`
- Screenshots: erased 🌽; ring "REWIRED"→"RECLAIMED"; "Block all NSFW"→"Block sites system-wide";
  `cornhub.com`→`blocked-site.example` (×2) across `v14-asc-1290x2796` + `v14-asc-1284x2778`
- Keywords → `recovery,addiction,reboot,relapse,streak,habit,dopamine,urge,blocker,discipline,focus,mindful`

Commit: `059727f5` "chore(submission): App Store review fixes — sanitized metadata, crisis
resources, blocker/onboarding redesign, session state".

Reviewer-access package (`docs/asc/reviewer-access.md`, `review-notes.md`) — the hard paywall meant
the reviewer could otherwise reach nothing:
- `docs/asc/review-notes.md:135` — "Demo credentials up top: **2.1 is the #1 process rejection**"
- `docs/SHIP-TODAY-RUNBOOK.md:112` — "**This is the #1 reason hard-paywall apps get rejected — don't skip it.**"
- `docs/asc/reviewer-access.md:14` — "single biggest hard-paywall rejection risk (reviewer cannot
  reach any functionality)"
- Demo user pre-created via Clerk BAPI (`skip_password_requirement`) because **in-app email sign-up
  could not complete (issue #97)**; RevenueCat promotional `premium` granted to that user_id
- A **separate delete-test account**, because "if a reviewer taps Delete Account on the paywall …
  it nukes the shared demo login and breaks the rest of review"
- Family Controls note: individual/self-control mode only, no parent/guardian role, no VPN, no
  NetworkExtension; "Screen Time filtering only works on a physical device, not the simulator";
  recommendation to attach a screen recording because "Family-Controls apps get rejected when
  reviewers 'can't get it to work' even with text steps"
- Later correction (`23b49588`): `docs/asc/review-notes.md` still taught the `+clerk_test` / OTP
  `424242` package, "which cannot work on pk_live. **A future session could have re-pushed it over
  the good live notes.**" Doc demoted to HISTORY ONLY with a SUPERSEDED banner.

## The 7-day review stall (not a rejection, but cost a week)

`plans/sessions/ttys023/last-action.md`, verbatim:

> - Submission **50bf4024-3a3e-41d5-a77a-d3fe6b5a78a1**, submitted **Jul 24, 2026 9:23 PM**
> - All 5 items `Waiting for Review`, none `In Review`: iOS App 1.0 (1.0.0 build 19), Regen Premium
>   group, Regen Weekly / 90 Days / Annual
> - An earlier submission the same evening (9:17 PM, 1 item) shows `Removed`
> - **No blocker on our side**: Paid Apps Agreement Active (Jul 22 2026 - May 28 2027), Free Apps
>   Active, JPMorgan Chase bank Active, U.S. Form W-9 Active, DSA compliance Active
> - No unanswered Resolution Center message; version page shows no errors
> - => **genuinely parked in Apple's queue. Likely specialist routing: Family Controls entitlement
>   + quit-porn subject matter + 3 prior rejections on this same version.**
>
> ## 2026-07-31 (day 7) - still Waiting for Review
> submission 50bf4024 UNCHANGED. All 5 items still `Waiting for Review`; it has **never** entered
> `In Review` in 7 days.
>
> Note: `developer.apple.com/contact/app-store/` no longer accepts status inquiries (dropdown only
> offers appeal / termination / expedite / technical / itunes / guideline / report). Correct channel
> is Developer Support: `.../topic/SC1103/subtopic/30020` -> App Review > App Review Status.
>
> ## DO NOT
> **Never hit `Cancel Submission` or `remove this version from review` on the version page, and
> don't upload a new build - any of those forfeits the queue position earned since Jul 24.**
> Editing metadata in place is safe but changes nothing.

Live age rating verified during the stall: **16+** in 173 countries + Brazil, 15+ Korea, 17+ on
pre-v26 iOS. `docs/asc/age-rating.md` — "honest answers calculate to 9+/13+, then a manual override
pins it UP to 16+ (deliberately chosen over inflating the Sexual Content answer, a 2.3.1 risk)."

Other rejection vectors pre-empted (`docs/research/asc-metadata-research-2026-07-13.md`):
- ITMS-91053 (missing required-reason API declaration) is an **automated upload rejection**
- "Competitor brand names in the keyword field are a Guideline 2.3.7 rejection vector — excluded"
- "Guideline 2.1: account-gated apps need working reviewer credentials; **SIWA does not exempt**"
- 1.4.1 — implying diagnosis/treatment without methodology

---

## 3. OTA / expo-updates — the full story

Research sources (all in `/Users/johansardar/reform/docs/research/`):
- `mandatory-ota-startup-expo-sdk56.md` (22 KB, 2026-08-30, amended by `a1c4d417`)
- `expo-ota-reliability-20260905.md` (13.8 KB, 2026-09-05)
- `startup-ota-code-audit-20260905.md` (10.9 KB, 2026-09-05) ← the third one
- `ota-scenario-matrix-20260905.md` (9.7 KB)
Plus `docs/CRITICAL-UPDATE-RUNBOOK.md`, `docs/ACQUISITION-EXPERIMENT-RUNBOOK.md`,
`plans/sessions/a8130773/ota-convergence-plan.md`, GitHub issues **#195**, **#198**.

## 3.1 `mobile/app.json` — `updates` + `runtimeVersion` block, verbatim (final state)

```json
"runtimeVersion": {
  "policy": "fingerprint"
},
"updates": {
  "enabled": true,
  "url": "https://u.expo.dev/fc45274c-6619-4255-b413-a17c6058364e",
  "checkAutomatically": "ON_ERROR_RECOVERY",
  "fallbackToCacheTimeout": 0,
  "useEmbeddedUpdate": true,
  "requestHeaders": {
    "expo-channel-name": "production"
  }
}
```

Note there is **no** `codeSigningCertificate` / `codeSigningMetadata` — confirmed by grep. See 3.13.

## 3.2 `mobile/eas.json` — verbatim, complete

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_POSTHOG_KEY": "phc_ACxkztUgL8Z3jQCJmENkqhhszKNLP7xPWBo3kDAokAup",
        "EXPO_PUBLIC_POSTHOG_HOST": "https://us.i.posthog.com",
        "EXPO_PUBLIC_APP_ENV": "dev"
      },
      "ios": { "simulator": true }
    },
    "development-device": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_POSTHOG_KEY": "phc_ACxkztUgL8Z3jQCJmENkqhhszKNLP7xPWBo3kDAokAup",
        "EXPO_PUBLIC_POSTHOG_HOST": "https://us.i.posthog.com",
        "EXPO_PUBLIC_APP_ENV": "dev"
      },
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "EXPO_PUBLIC_POSTHOG_KEY": "phc_ACxkztUgL8Z3jQCJmENkqhhszKNLP7xPWBo3kDAokAup",
        "EXPO_PUBLIC_POSTHOG_HOST": "https://us.i.posthog.com",
        "EXPO_PUBLIC_APP_ENV": "preview",
        "EXPO_PUBLIC_API_URL": "https://api.regenapp.us",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_dGhvcm91Z2gtcmVwdGlsZS0xMS5jbGVyay5hY2NvdW50cy5kZXYk"
      }
    },
    "preview-simulator": {
      "extends": "preview",
      "developmentClient": false,
      "distribution": "internal",
      "channel": "preview",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.regenapp.us",
        "EXPO_PUBLIC_POSTHOG_KEY": "phc_ACxkztUgL8Z3jQCJmENkqhhszKNLP7xPWBo3kDAokAup",
        "EXPO_PUBLIC_POSTHOG_HOST": "https://us.i.posthog.com",
        "EXPO_PUBLIC_APP_ENV": "prod",
        "EXPO_PUBLIC_USE_RN_FETCH": "1",
        "EXPO_PUBLIC_SENTRY_DSN": "https://f3e60f5156b0987cf7d3d4aca1bcaccb@o4511508250558464.ingest.us.sentry.io/4511543717658624",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_Y2xlcmsucmVnZW5hcHAudXMk",
        "EXPO_PUBLIC_REVENUECAT_IOS_KEY": "appl_rFqJxMRRNmUnDtdnzOpNzRIbyMM"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "AX3C2B78YD",
        "ascAppId": "6786847351",
        "ascApiKeyPath": "/Users/johansardar/Downloads/AuthKey_WS84Q5HBPM.p8",
        "ascApiKeyId": "WS84Q5HBPM",
        "ascApiKeyIssuerId": "d29aea1a-f6dd-4433-a8e8-fa578b57a4ef"
      }
    }
  }
}
```

## 3.3 `mobile/fingerprint.config.js` — verbatim

```js
module.exports = {
  // `expo.extra` is JavaScript manifest data. Critical-update policy changes
  // must remain compatible with the installed native runtime, while native
  // config/plugins/dependencies continue to participate in the fingerprint.
  sourceSkips: [
    'PackageJsonAndroidAndIosScriptsIfNotContainRun',
    'ExpoConfigExtraSection',
  ],
};
```

## 3.4 `mobile/app.config.js` — verbatim (critical policy + the runtime override built after #195)

```js
const criticalPolicy = process.env.REGEN_UPDATE_ACTIVATION === 'critical'
  ? { version: 1, activation: 'critical', continuationVersion: 1 }
  : undefined;

const publicOtaRuntime = process.env.RECOVI_PUBLIC_OTA_RUNTIME?.trim();
const publicOtaAcknowledgement = process.env.RECOVI_PUBLIC_OTA_ACK;

if (publicOtaRuntime && publicOtaAcknowledgement !== 'native-compatibility-verified') {
  throw new Error(
    'RECOVI_PUBLIC_OTA_RUNTIME requires RECOVI_PUBLIC_OTA_ACK=native-compatibility-verified',
  );
}

if (publicOtaRuntime && !/^[a-f0-9]{40}$/i.test(publicOtaRuntime)) {
  throw new Error('RECOVI_PUBLIC_OTA_RUNTIME must be a 40-character fingerprint runtime.');
}

module.exports = {
  ...base,
  // Fingerprinting remains the only normal runtime policy. This explicit,
  // acknowledged override exists solely to publish JS proven compatible with
  // the exact older runtime currently attached to the public App Store build.
  runtimeVersion: publicOtaRuntime?.toLowerCase() ?? base.runtimeVersion,
  extra: {
    ...base.extra,
    ...(onboardingLibrary ? { onboardingLibrary } : {}),
    ...(criticalPolicy ? { regenUpdatePolicy: criticalPolicy } : {}),
  },
};
```

## 3.5 Channel / branch mapping

Live (`eas channel:list`, 2026-09-09) — all one unconditional mapping each:

```
channel=issue-198-launch   paused=False -> [('issue-198-launch', 'true')]
channel=preview            paused=False -> [('preview', 'true')]
channel=production         paused=False -> [('production', 'true')]
```

Build profiles map: development/development-device → `development`; preview and
preview-simulator → `preview`; production → `production`.

**But** `app.json` also hardcodes `updates.requestHeaders["expo-channel-name"] = "production"`,
which pins *every* build's OTA request to the production channel regardless of the build profile's
channel. This is deliberate and asserted twice by `mobile/scripts/check-release-config.js`:

```
check('production profile uses the production channel', prodBuild.channel === 'production');
check('runtime uses the fingerprint policy', appJson.runtimeVersion?.policy === 'fingerprint');
check('app config pins iOS OTA requests to the production channel',
      appJson.updates?.requestHeaders?.['expo-channel-name'] === 'production');
check('native Expo.plist pins OTA requests to the production channel',
      /<key>EXUpdatesRequestHeaders<\/key>\s*<dict>\s*<key>expo-channel-name<\/key>\s*<string>production<\/string>\s*<\/dict>/.test(expoPlist));
```

The channel→branch resolver in `mobile/scripts/verify-public-app-store-ota.js` **refuses anything
but exactly one unconditional mapping**:

```js
if (!Array.isArray(entries) || entries.length !== 1
    || entries[0]?.branchMappingLogic?.trim() !== 'true') {
  throw new Error(
    `Channel ${expectedChannel} does not have one unconditional branch mapping; manual selection review is required.`,
  );
}
```

`docs/CRITICAL-UPDATE-RUNBOOK.md`: "Channel changes use `eas channel:edit` as a separate reviewed
action; **publishing an update must not silently remap a release channel.**"

## 3.6 What `appVersionSource: "remote"` + `autoIncrement` actually did to runtime selection

- `cli.appVersionSource: "remote"` makes EAS the authority for `ios.buildNumber`; `autoIncrement:
  true` is set **only on the production profile**, so every production build bumps the build number
  server-side.
- Under the **original `appVersion` policy** the runtime string is the *marketing* version
  (`expo.version`, e.g. `"1.0.4"`), not the build number. So autoIncrement did **not** fork
  runtimes — but **every marketing-version bump did**, and each bump orphaned all older installs
  from any future OTA unless the update was republished per runtime.
- Under the **`fingerprint` policy** (from 2026-08-18) the runtime is a content hash. Per
  `docs/ACQUISITION-EXPERIMENT-RUNBOOK.md`: "**`eas.json` is a fingerprint source; drift changes
  the runtime and the update silently stops applying.**" So an env/profile edit — including one
  made only to fix an unrelated key — forks the runtime and silently strands every installed build.
  (`fingerprint.config.js` skips only `ExpoConfigExtraSection` and the package.json scripts entry.)
- Net effect, measured: the `production` branch's most recent 25 update groups span **seven distinct
  runtimes** — `c5bfca52…`, `e7b14bc5…`, `53f21c5f…`, `591d2996…`, `b0ac8e7c…`, `1005e070…`,
  `cf8910c7…`. The same JS gets republished per runtime, visible as e.g.
  `"CRITICAL: $5.99 weekly + $34.99 annual, both 3-day trials (c7e6c75c)"` on `b0ac8e7c…` and
  `"Paywall: $5.99 weekly + $34.99 annual, both 3-day trials (c7e6c75c)"` on `1005e070…`.

## 3.7 Policy history (commits)

`5731e98e` (2026-07-16) "build(eas): add expo-updates for OTA + configure EAS Update", verbatim body:

> EAS Build prompted to install expo-updates when the production profile's "production" channel had
> no updates package; accepted it. This wires OTA:
> - expo-updates ~56.0.22 dependency
> - app.json updates.url -> u.expo.dev project endpoint
> - **runtimeVersion policy "appVersion" (OTA payloads gated by app version)**
>
> Lets us ship JS-only hotfixes post-launch without a full App Review cycle.

`1c48a961` (2026-08-18) "feat(mobile): gate fresh onboarding on compatible updates" — diff on
`mobile/app.json`:

```
-      "policy": "appVersion"
+      "policy": "fingerprint"
-      "url": "https://u.expo.dev/fc45274c-6619-4255-b413-a17c6058364e"
+      "url": "https://u.expo.dev/fc45274c-6619-4255-b413-a17c6058364e",
+      "checkAutomatically": "ON_ERROR_RECOVERY",
+      "fallbackToCacheTimeout": 0,
+      "useEmbeddedUpdate": true
```

`35989eb3` (2026-08-18) "fix(release): runtime invariant expects the fingerprint policy (TICKET-24)"
— `mobile/scripts/check-release-config.js`.

`42ec9d98` (2026-08-29, "feat: rebuild recovery plans and harden iOS auth") added the
`expo-channel-name: production` request header.

Other OTA commits: `5b58b61f`, `e3a0f033` (latch first-session mode per process, TICKET-23),
`149b2021` (2026-08-26), `de2662bd` (2026-08-30), `936a7ece` (2026-08-30), `a1c4d417` (2026-08-30),
`41f17e80` (2026-08-31), `95baf3fa`, `25beaa90`, `49ccc66c`.

## 3.8 INCIDENT 1 — three live runtimes; one fix could not be delivered at all

`25beaa90` (2026-08-19) "docs(session): OTA published to the three live runtimes", verbatim:

> **OTA published 2026-08-19** to runtimes 1.0.0 / 1.0.1 / 1.0.2 on branch `production`, from
> branch `ota-25-29-live-runtimes` = `c255ac16` plus cherry-picks of TICKET-25, TICKET-26, and both
> TICKET-28 commits. Groups: 1.0.0 `90841781`, 1.0.1 `0d111b8c`, 1.0.2 `c51a082e`. Verified
> 2817/2817 tests … and no `expo-network`/`expo-video` import anywhere.
>
> **TICKET-27 is NOT in that OTA.** Its bounded-Clerk-wait is written against the acquisition
> coordinator's gate (`useBoundedClerkStartup`, `acquisition.phase`), which does not exist on the
> live baseline and is native-bound. **Live 1.0.x users still have the unbounded anonymous startup
> wait**; it is fixed for them only when they update to 1.0.3.

TICKET-16's deployment record shows the same three-publish pattern:
`1.0.0`: update `01a00c7b-dbe0-790d-984f-e1217e8d2db5`, group `31ebb328-a474-4803-a0c5-b81b2df12660`;
`1.0.1`: update `01a00c79-e23d-76a9-8ac3-11aa7b2b6114`, group `49541970-501f-4561-b476-146c283bc7ec`;
`1.0.2`: update `01a00c78-7761-77ae-b503-6e4a1507fbf2`, group `13196a61-f0a4-4c23-880d-d472fc7a70d3`.

## 3.9 INCIDENT 2 (the headline) — published update did not reach the live App Store binary

GitHub issue **#195 (CLOSED)** — "P0: Public App Store build 32 selects a stale-runtime OTA and
opens the old acquisition flow". Verbatim:

> This is a confirmed release-targeting failure, not an App Store cache theory and not a phone-
> connectivity theory:
>
> - Apple currently serves Recovi 1.0.4, build 32.
> - That exact public binary is an EAS Store build on the `production` channel with runtime
>   `b0ac8e7c15dd9272ad81b53d718fc6d65faefe00`.
> - For that runtime, the production branch currently selects iOS update
>   `01a04004-4082-7b39-addd-0675cd7e6c7c`, group `6b982329-bf7d-43fe-a3fe-116cd588b2e2`, from
>   source commit `149b2021c1435f62f91aac49dd9aee9c8195dfef`.
> - The intended current acquisition experience was published as iOS update
>   `01a05333-1c5d-781f-8115-4b096845f90f`, group `6ef68516-debb-4151-8911-c10f3ae1989c`, from
>   source commit `de2662bdeed37834bd60db29a9631951766b041c`, **but it targets runtime
>   `6e70341f934d12886a2aa8ac33c9dc1df536df90`**.
> - **Expo only serves updates compatible with the installed runtime. Build 32 therefore cannot
>   select the intended `6e70…` update and continues to receive the stale `b0ac…` update.**
> - A WDA-controlled public App Store redownload on the affected physical iPhone installed
>   Apple-signed Recovi 1.0.4 (32) …
> - Launching that exact download showed the old acquisition flow. The stale path contains
>   "Why are you doing this?"; the intended task-led Flow begins with the "About you" divider.
>
> **The prior simulator result was not valid public-distribution proof. It used a locally compiled
> Release artifact associated with a newer runtime, so it could select the newer OTA even though the
> actual App Store binary could not.**
>
> Native updater configuration is immutable for an installed binary. Build 32 has normal-launch
> behavior equivalent to error-recovery-only with zero native launch wait; an OTA cannot change
> those compiled values before JavaScript starts.
>
> The exact public IPA was inspected and reports 1.0.4 (32), production request headers, runtime
> policy `file:fingerprint`, runtime fingerprint `b0ac8e7c15dd9272ad81b53d718fc6d65faefe00`,
> error-recovery-only automatic checks, and zero native launch wait.

Closure (Johan, 2026-08-30), physical iPhone 13 / iOS 26.2.1 via WDA, **run twice** with different
fresh data-container IDs:

> Ready-for-Sale app: 1.0.4 build 32 · Runtime: b0ac8e7c15dd9272ad81b53d718fc6d65faefe00 ·
> Selected OTA: 01a053bf-d4c9-7bde-892e-c41140810c6d · Update group:
> 26b2b738-1fbc-45f4-9c43-3b1f5b39082f · Source commit: 0e6c548f3a9c7274835e9de500cbf67b7eb16c2e
> … Regression gate: `npm run verify:public-ota -- --expected-git-commit 0e6c548f…` is green.

**Recurred 2026-09-04 by a second mechanism** (`PITFALLS.md:437-443`):

> **App Store Connect can also retain READY_FOR_SALE on multiple historical versions: filtering by a
> stale local app.json version can select an older public build and strand fresh downloads of the
> newer release (reproduced 2026-09-04).**
> **How to fix:** select the numerically newest public version from all paginated App Store Connect
> versions, independently of local app.json; resolve its attached build, install that binary, and
> read the runtime actually selected by the installed app from
> `Library/Application Support/.expo-internal/expo-v11.db`; **source fingerprints, build-profile
> output, and the newest EAS runtime are not substitutes.**

## 3.10 INCIDENT 3 — the native check never runs, so JS was the only delivery path

`docs/research/mandatory-ota-startup-expo-sdk56.md:95-112`, verbatim:

> - `ON_LOAD` checks every normal app load.
> - `WIFI_ONLY` checks only when startup sees Wi-Fi.
> - `ON_ERROR_RECOVERY` does not check on a healthy startup; it checks only during error recovery.
> - `NEVER` disables native automatic checks and requires the JavaScript API.
>
> On iOS, the native switch returns `false` for both `Never` and `ErrorRecoveryOnly` during a normal
> launch (`UpdatesUtils.swift#L93-L112`). **Consequently, Recovi's `fallbackToCacheTimeout: 0` is
> not merely short on a healthy launch: the native remote check does not start at all.**

`expo-ota-reliability-20260905.md` on the installed 56.0.25 source:

> `node_modules/expo-updates/ios/EXUpdates/UpdatesUtils.swift:101`: `ErrorRecoveryOnly` returns
> false for a normal startup check.
> `AppLoader/AppLoaderTask.swift:153`: with no normal check, the launch timer is immediately
> finished, irrespective of a nonzero configured wait.
> `ErrorRecovery.swift:155`: native fatal-error recovery tracks failed/successful launches …
> `src/Updates.ts:185`: `reloadAsync()` switches the selected bundle; **its fulfilled promise
> precedes the actual asynchronous reload. No meaningful continuation is safe after fulfillment.**

Why an OTA can never fix this retroactively (same doc):

> `checkAutomatically`, `fallbackToCacheTimeout`, update URL, request headers, and runtime version
> are build-time configuration. On iOS they are `EXUpdatesCheckOnLaunch`, `EXUpdatesLaunchWaitMs`,
> `EXUpdatesURL`, `EXUpdatesRequestHeaders`, `EXUpdatesRuntimeVersion` in `Expo.plist`. The native
> loader reads those values before React Native JavaScript is selected and started. … **It cannot
> turn the current binary's healthy native launch check from `ON_ERROR_RECOVERY` into `ON_LOAD`.**

## 3.11 INCIDENT 4 — "OTA delivery was a coin flip"

`149b2021` (2026-08-26) "fix(updates): stop OTA delivery being a coin flip", verbatim body:

> Two defects made a shipped OTA reach a user only by luck.
>
> 1. The first-session gate gave check + download one shared 4s budget. A cold DNS lookup plus a
>    multi-megabyte Hermes bundle loses that race often, and **losing it once pins the flow journal
>    so the check never runs again on that install.** Split it: the short budget now covers only
>    "does an update exist", and a successful check proves the network is up, so the download gets
>    its own 30s budget instead of being killed mid-flight.
>
> 2. The untimed returning-update coordinator was gated on `onboardingComplete`. **Onboarding
>    completes behind the hard paywall, so an unpaid user could never receive an OTA on any launch**,
>    and a fresh install that lost the race above was stranded on the embedded bundle permanently.
>    Activation now depends only on the launch authority having settled.
>
> The landing also says "Getting the latest version" once acquisition has been held past 2.5s, so a
> real download is not presented as a dead Get started button.

Files: `mobile/lib/firstSessionUpdateGate.ts`, `mobile/lib/criticalUpdateCoordinator.ts`,
`mobile/app/_layout.tsx`, `mobile/components/v2/LaunchScreen.tsx`,
`mobile/lib/__tests__/firstSessionUpdateDownloadBudget.test.ts`.

## 3.12 INCIDENT 5 — critical manifest woke two coordinators and `SIGSEGV`'d during reload

`mandatory-ota-startup-expo-sdk56.md:21-38` (as amended by `a1c4d417`), verbatim:

> Build 41 must use a routine manifest for this first handoff: its embedded JavaScript predates the
> single-owner fix, and **a live erased-install test showed a critical manifest activating both
> legacy coordinators and ending the process with `SIGSEGV` during reload.**
>
> - For the **current build-41 binary**, publish a compatible production update as routine metadata,
>   keep acquisition content unmounted behind the launch cover, and let the embedded first-session
>   gate be the only check/fetch/reload owner. **Do not publish typed-critical metadata to this
>   runtime: every erased install starts in the legacy embedded bundle before it can receive the OTA fix.**

And:

> On an erased release simulator, a typed-critical candidate was downloaded completely, then the
> legacy handoff exited with `SIGSEGV`. Republishing the identical launch asset without critical
> metadata produced an automatic fresh-install handoff, two successful launches, zero failed
> launches, and a normal first onboarding transition. **The safe production rule is therefore: no
> critical manifests for build 41's runtime.**

Generalized (`PITFALLS.md:447`, "An OTA cannot repair its own pre-activation update race"):

> the installed binary starts its embedded JavaScript first. If that legacy bundle has two
> concurrent update coordinators, critical manifest metadata can wake both and produce competing
> fetch/reload decisions; **placing the single-owner fix inside the OTA is too late to govern that
> first handoff.**

## 3.13 INCIDENT 6 — an OTA from converged trunk would have crashed every live 1.0.x install

`plans/sessions/a8130773/ota-convergence-plan.md`, verbatim banner (added by `49ccc66c`):

> **SUPERSEDED IN PART — 2026-08-19.** … The ordering below is also wrong on one point: the OTA for
> tickets 25-29 does **not** require convergence first, because **the shipped 1.0.x binaries lack
> `expo-network` and `expo-video` natively — an OTA from the converged trunk would crash them at
> launch.** Any OTA to runtimes 1.0.0 / 1.0.1 / 1.0.2 must be cherry-picked onto the **origin**
> baseline that matches those binaries.

And on publishing from local trunk:

> The live production OTA (Aug 16, "Require explicit account confirmation for purchase restore") was
> published from `c255ac16`, which exists only on `origin/regen-rebrand`. Publishing from local trunk
> as-is would regress that fix (and the rest of origin's 43 commits …). Local trunk holds 39 commits
> origin lacks … Dry-run shows **21 conflicted files**.

Every production hotfix therefore required hand cherry-picking onto an old baseline.
Cf. `PITFALLS.md:184` — "JS update imports a native module older dev clients don't have".

## 3.14 INCIDENT 7 — `eas update --environment` shipped the wrong env to production

`docs/ACQUISITION-EXPERIMENT-RUNBOOK.md:31-38`, verbatim:

> 2. Publish from an isolated worktree with a real `npm ci` and `mobile/eas.json` matching the target
>    build's commit — **`eas.json` is a fingerprint source; drift changes the runtime and the update
>    silently stops applying.**
> 3. `eas update --branch preview --platform ios --environment preview`. The runtime version printed
>    MUST equal the target build's fingerprint.
> 4. **Env footgun (bit us live):** `eas update --environment X` inlines the EAS *server-side*
>    environment, NOT the `eas.json` build-profile env. `EXPO_PUBLIC_APP_ENV` must exist in the
>    server-side environment or the OTA resolves `prod` and every preview Flow falls back to bundled
>    control.

Live scar in the production update list:
`"HOTFIX: restore production env and Clerk provider for issue #199 (923…)"`.

## 3.15 INCIDENT 8 — two update owners; three P1s remained in the survivor

`de2662bd` (2026-08-30) "fix(updates): serialize fresh-launch OTA activation" made the first-session
gate the sole owner for fresh acquisition. The independent audit
`docs/research/startup-ota-code-audit-20260905.md` then found (verbatim):

> **P1: Returning updater can hold startup indefinitely on a hung operation**
> `mobile/lib/criticalUpdateCoordinator.ts:305` awaits check without any deadline. Critical fetch at
> 324, continuation storage read at 469, reconciliation at 500 and marker writes are also unbounded.
> … `_layout.tsx:303` requires critical ready for resumed/completed launch presentation. Root's hard
> cap only settles auth/hydration; it does not end the update check. … Result: branded hold never
> reaches usable app.

> **P1: Critical-update recovery can remain hidden behind launch cover**
> `mobile/app/_layout.tsx:1188` computes `revealStartupRecovery` … It omits
> `criticalUpdateLaunch.phase === 'blocked'`. … `LaunchScreen.tsx:199` hides that cover only when
> `recoveryRequired` is true … Result: recovery is mounted but opaque hold covers it indefinitely.

> **P1: Cancelled returning update can still reload after marker write**
> `mobile/lib/criticalUpdateCoordinator.ts:343-368` checks `isActive` after acquiring the reload
> barrier, then awaits continuation storage, then **unconditionally invokes `beforeReload` and native
> reload.** Scope/route/account change during the asynchronous marker write invalidates the React
> run, but the native reload still occurs using stale continuation.

> **P2: Several critical recovery states have a retry button that cannot progress**
> `criticalUpdateCoordinator.ts:480-489` blocks stale, incompatible and foreign-account markers …
> manual retry handling only repairs reasons failed/processing/consumed; other reasons re-read
> identical evidence then block again.

Still unresolved after two patch rounds (verbatim):

> - Foreign-account continuation: … **A single global marker cannot safely be discarded just because
>   current identity differs.**
> - Incompatible pending target: … Automatically running old target semantics in arbitrary current JS
>   would defeat the critical-update contract.
> - Hung reconciliation/mutations: **a Promise timeout does not cancel RevenueCat/account work or an
>   AsyncStorage mutation.** … A full bound needs cooperative cancellation or an operation-generation
>   contract at each side-effect boundary.

Also a hard architectural limit (same doc):

> `firstSessionUpdateGate.ts:461-465` accepts only the exact bundled flow id/version. An OTA changing
> that descriptor while an existing flow journal pins the previous version intentionally returns
> flow-pin-incompatible; no prior-version registry/migration is available in this resolver.
> **Therefore 'any change at any time' is not supported by this architecture.**

## 3.16 INCIDENT 9 — cold-launch choreography started before reload authority settled

GitHub issue **#198 (CLOSED)** "Fix the cold-launch brand sequence across readiness and OTA reloads",
verbatim:

> The supplied iPhone recording shows the complete failure in one launch. The operating-system splash
> first displays the logo on a flat dark background. JavaScript then replaces it with the gradient
> background and starts typing "Quit. Recover. Rebuild." **before startup has reached a final update
> decision.** A partially revealed, grey-looking "Get started" button appears, **Expo presents its
> default white reload spinner, the JavaScript runtime restarts, and the logo/tagline sequence plays
> again** before onboarding can continue.
>
> Completed members have the inverse timing problem. The typewriter begins as soon as fonts are ready,
> but the launch overlay exits independently as soon as app data is ready. The result can be a partial
> word that remains visible and then abruptly teleports into the app …
>
> These are consequences of one missing contract: rendering readiness, update finality, destination
> readiness, and brand choreography do not share a single launch-presentation authority.

Expo SDK 56's own three-way race (`PITFALLS.md:88-93`):

> `RelaunchProcedure` notifies reload listeners **before** showing its overlay, `ReloadScreenView`
> loads even a bundled image asynchronously, and `ReloadScreenManager` hides on
> `RCTContentDidAppear` before the replacement React launch art is guaranteed to have decoded.
> **How to fix:** … for frame-continuous iOS reloads show an app-owned, process-lifetime native
> `UIWindow` above Expo first, synchronously render the bundled launch image, then request reload;
> only the replacement runtime may hide that cover after its React root is laid out and matching mark
> has decoded. Routine updates may download in the background once classified, but must not regain
> same-process reload authority after presentation is released.

Fix `41f17e80` (2026-08-31). Proof, verbatim from the issue comment:

> - Full post-rebase mobile suite: 202/202 suites, 1,810/1,810 tests. TypeScript clean. Expo lint clean.
> - Deterministic artwork regeneration: SHA-256 7a67a7aec4cc91f0d9cc32a69de446bdde739cbc77ab0bf210244edac6325cc before and after.
> - Used isolated channel/branch **issue-198-launch** only; production and preview channels were untouched.
> - Immutable update `01a05672-0428-7127-a570-fb3a6263cec3`, group `f35e5ed8-64dc-4655-a367-2f969c1b2543`,
>   runtime `09c5e12f428e299f01126c290c0a7f1d7ec5e704`.
> - Installed Expo database confirmed **successful_launch_count=1 and failed_launch_count=0**.
> - **60 fps inspection across the exact reload found 108 consecutive logo-bearing frames with no
>   white, black, blank, spinner, or missing-mark frame, and no duplicate tagline.**

## 3.17 INCIDENT 10 — publishing from a dirty working tree

That `issue-198-launch` update group records `"isGitWorkingTreeDirty": true`, so its `gitCommitHash`
(`8b865a7a5610d496b4442f951860e9616f66155d`) does not identify the shipped bytes.
`expo-ota-reliability-20260905.md`:

> Every release record should distinguish: published, server-served, phone-downloaded,
> phone-activated, first-launch-tested, and journey-tested. **Record exact IDs instead of only a
> commit hash, particularly when publishing a dirty working tree.**

## 3.18 INCIDENT 11 — no EAS code signing (never remediated)

`PITFALLS.md:422-427`:

> `expo-updates` enabled without end-to-end signing trusts the OTA provider path (2026-08-22, Regen)
> - **Problem:** a production binary accepts remotely delivered JavaScript without an app-owned
>   signature, so compromise or tampering in the account/provider/CDN path can become code execution
>   inside the app's native permissions.
> - **Why:** HTTPS and a fingerprint runtime version protect transport and native compatibility, but
>   neither proves the update was signed by the app owner; EAS code signing is a separate,
>   plan-gated configuration.
> - **How to check:** if `updates.enabled` is true, require both `updates.codeSigningCertificate`
>   and `updates.codeSigningMetadata`, confirm the private key is absent from Git, and prove a
>   tampered update is rejected by the exact release binary.

Verified: neither key exists in `mobile/app.json` or `app.config.js`. Still open.

## 3.19 The final working configuration they landed on

**Shipped and green as of 2026-09-05:**

1. `runtimeVersion.policy = "fingerprint"` with `fingerprint.config.js` skipping only
   `ExpoConfigExtraSection` (so the critical-activation flag can ride an OTA while native inputs
   still fork the runtime).
2. `checkAutomatically: "ON_ERROR_RECOVERY"`, `fallbackToCacheTimeout: 0`, `useEmbeddedUpdate: true`
   — i.e. **no native check**; delivery owned entirely by JS.
3. `updates.requestHeaders["expo-channel-name"] = "production"` pinned in app.json **and** asserted
   against the built `Expo.plist`.
4. Exactly one unconditional channel→branch mapping per channel; channel remaps are a separate
   reviewed action.
5. **One startup update owner**: fresh acquisition → `firstSessionUpdateGate` (10s check budget /
   30s download budget); resumed/returning → `criticalUpdateCoordinator` (10s check / 30s fetch /
   5s continuation reads). They are mutually exclusive.
6. **Routine metadata by default.** Typed-critical (`REGEN_UPDATE_ACTIVATION=critical` →
   `extra.regenUpdatePolicy = {version:1, activation:'critical', continuationVersion:1}`) only for
   binaries whose *embedded* bundle already enforces one owner.
7. Reload treated as terminal; an encrypted continuation marker
   `{targetUpdateId, sourceUpdateId, runtimeVersion, scope, attemptedAt}` persisted **before**
   `reloadAsync()`; success declared only when `Updates.updateId === targetUpdateId`.
8. An app-owned process-lifetime native `UIWindow` cover above Expo's reload screen; Expo's branded
   reload kept as fallback with the spinner disabled.
9. `RECOVI_PUBLIC_OTA_RUNTIME` + `RECOVI_PUBLIC_OTA_ACK=native-compatibility-verified` — an audited
   escape hatch to publish JS to the *older* runtime attached to the public App Store build.
10. `npm run verify:public-ota -- --expected-git-commit <sha>` as the release gate.

`mobile/scripts/verify-public-app-store-ota.js` header, verbatim:

```
/**
 * Resolve the exact iOS build attached to the public App Store version, map it
 * to its EAS runtime/channel, and assert which production OTA that binary will
 * select. This intentionally refuses to substitute a local Release build.
 *
 * Usage:
 *   node scripts/verify-public-app-store-ota.js --expected-git-commit <sha>
 */
```

It: filters ASC versions to `READY_FOR_SALE` and sorts numerically → resolves the attached build →
matches a FINISHED EAS build with `distribution === 'STORE'` on that exact `appVersion` +
`appBuildVersion` → reads that build's `runtimeVersion` and `channel` → resolves the channel's single
unconditional branch → `update:list --branch <b> --platform ios --runtime-version <rt>` → asserts the
selected update's runtime **and** `gitCommitHash`.

`docs/CRITICAL-UPDATE-RUNBOOK.md`, verbatim:

> Routine is the default. … Before rollout, name the target channel, its mapped branch, and the
> installed release runtime:
> ```sh
> eas channel:view "$REGEN_TARGET_CHANNEL" --json --non-interactive
> npx expo-updates runtimeversion:resolve --platform ios --workflow managed
> ```
> **Stop if the channel does not map to the named branch, or if the resolved iOS runtime does not
> exactly equal the installed target runtime.** Publish to the validated branch and platform, never
> an implicit current branch. …
> Confirm routine and critical hashes are identical before publishing:
> `npx expo-updates fingerprint:generate --platform ios`
> `REGEN_UPDATE_ACTIVATION=critical npx expo-updates fingerprint:generate --platform ios`
> **Do not use a critical OTA for a native capability change. A different fingerprint must ship in a
> new binary.**

**Reload-loop invariants** (`mandatory-ota-startup-expo-sdk56.md`, verbatim, all 8):

> 1. require `fetch.isNew === true` and reject rollback as a normal update;
> 2. validate manifest ID and require fetched runtime to equal the installed runtime;
> 3. require target update ID to differ from `Updates.updateId`;
> 4. persist `{ targetUpdateId, sourceUpdateId, runtimeVersion, scope, attemptedAt }` before calling reload;
> 5. treat reload as the last operation in the old runtime;
> 6. after restart, declare success only when `Updates.updateId === targetUpdateId`;
> 7. if still on the source update after one recorded attempt, stop automatic reloads for that target
>    and expose retry/fallback rather than looping;
> 8. serialize all startup update work so React remounts or two coordinators cannot duplicate it.

**The recommended next-binary config, never shipped** (same doc):

> ### Next iOS binary
> 1. Compile `checkAutomatically: "ON_LOAD"`.
> 2. Set a finite nonzero `fallbackToCacheTimeout`. A practical initial value is a product choice
>    that must be measured against the real production payload and mobile networks; **10 seconds
>    aligns with Recovi's existing check budget, but it is not a guarantee and should not be raised
>    blindly.**
> 3. Keep `useEmbeddedUpdate: true`.
> 4. Retain a bounded opaque JavaScript gate for the case where native startup times out and later
>    reports/downloads an update.
> 5. Publish only artifacts whose channel, platform, and runtime exactly match the target binary.

**The honest verdict** (same doc, "Decision"):

> **There is no production-safe setting that guarantees every fresh install runs a remote update.**
> A device may be offline, the service may fail, the update may be incompatible, or its assets may
> not finish before the configured timeout. Expo also has no first-class "mandatory update" mode and
> recommends against blocking startup indefinitely.

And on the two honest product policies:

> - **Bounded/fail-open:** keep a branded opaque cover while checking; after a finite check/download
>   budget, continue with the newest safe local update and retry later.
> - **Strict/fail-closed:** if freshness is a hard authorization requirement, show a durable
>   offline/update-required recovery screen and never reveal the product until a compatible update is
>   verified. **This can lock every new user out during a device, CDN, DNS, TLS, or update-service
>   outage. It should be an explicit product decision, not described as guaranteed OTA delivery.**
>
> Do not intentionally crash to trigger `ON_ERROR_RECOVERY`. … Keep `useEmbeddedUpdate: true`. The
> embedded update is the anti-bricking floor.

`ota-scenario-matrix-20260905.md` enumerates the required scenario cases: storage injection (5),
update check (5: available / none / offline rejection / generic rejection / rollback), fetch result
(4: new target / rejection / unavailable / already-current), lifecycle, and
"Reload rejected or same update seen again → Relaunch multiple times; **at most one intended
activation, no crash/reload loop**".

---

## 4. Payments — RevenueCat

## 4.1 Setup

**RevenueCat only.** Adapty and Superwall were explicitly evaluated and rejected —
`docs/REMOTE-ACQUISITION-EXPERIMENTS-SPEC.md:190-191`:

> Superwall is rejected for this scope. It provides a visual Flow editor but is not technically
> required … **Adapty migration is rejected.** Its combined subscription and Flow tooling does not
> justify replacing Regen's verified RevenueCat identity, handoff, restore, webhook, catalog, and
> entitlement infrastructure.

(Worth noting for ExcerLock, which is now on Adapty — its issues #137/#138 carry the same 3.1.2 and
review-screenshot lessons forward.)

| Item | Value |
|---|---|
| RevenueCat project | `1914a256` |
| App Store app | `appda1c585d34` · Test Store app `app814734fc99` |
| Entitlement | `premium` = `entl453e3a9b3b` (hardcoded `ENTITLEMENT_ID`); legacy unused "Regen Pro" also exists |
| iOS public SDK key | `appl_rFqJxMRRNmUnDtdnzOpNzRIbyMM` — **production profile only** (`mobile/eas.json`) |
| StoreKit credential | ASC In-App Purchase Key ID `428ZS5AVZ7`, issuer `d29aea1a-…`. **StoreKit 2 — no App-Specific Shared Secret** |
| Products | `com.regenapp.app.premium.weekly` $3.99/wk (Apple ID 6786848341); `.quarterly` $6.99/90d (6786850364); `.annual` $30.00/yr upfront (6786853042); `.quarterly.winback` (53% off 90 days, own group) |
| Packages | `$rc_weekly`→weekly, `$rc_monthly`→quarterly (**repurposed; package id is cosmetic**), `$rc_annual`→annual. `$rc_lifetime` excluded on iOS |

Code:
- `mobile/lib/purchases.ts` — **the only RevenueCat mutation coordinator**: configure, offering loads,
  purchase, restore, identity binding, receipt sync, fresh entitlement verification
- `mobile/lib/paywallConfig.ts` — plans, product ids, package ids, fallback pricing, trials, card
  order, standard + winback offerings, entitlement id
- `mobile/lib/paywallGate.ts`, `mobile/lib/protectionLifecycle.ts`
- `server/src/webhooks/revenuecat.ts` (HMAC), `server/src/lib/revenuecatClient.ts` (REST v2),
  `server/src/services/subscriptionStatus.ts` (single monotonic write path),
  `server/src/lib/premiumAccess.ts`, `server/src/routes/entitlement.ts`
- Docs: `docs/PAYWALL-SETUP.md`, `docs/asc/payment-flow-verification.md`,
  `docs/asc/subscription-edge-cases.md`, `docs/adr/0015-revenuecat-source-of-truth.md`,
  `docs/PAYWALL-ONE-TIME-OFFER-SPEC.md`, `docs/adr/0006`

**How entitlement is checked.** Client: a single `PremiumRouteGateProvider` above the root Stack owns
the RevenueCat read and calls `shouldGateToPaywall`; every `(app)` route mounts through
`PremiumRouteBoundary`. `docs/asc/payment-flow-verification.md`, verbatim:

> Active `premium` opens a paid route. Confirmed absence, identity uncertainty, and CustomerInfo
> errors all fail closed to covered loading/retry or checkout. RevenueCat's listener and focus refresh
> can replace a temporary error only after a fresh same-identity read. **Reads capture the identity
> generation and discard late account-A completions after account B has been accepted.**

Server: ADR-0015 rule 3, verbatim:

> **The client never asserts its own entitlement to the server.** A mobile client's local RevenueCat
> `CustomerInfo` is authoritative for gating the client's OWN UI, but it is not accepted as input to
> any server route. The server's copy of entitlement truth can only change by (a) a signed, verified
> RevenueCat webhook delivery, or (b) the server itself calling RevenueCat's REST API. Both paths
> write through the same monotonic guard (`services/subscriptionStatus.ts`) so an out-of-order
> delivery, or a resync that raced a newer webhook, can never roll the account backward.

**Identity linkage.** The app is a **hard paywall where purchase happens BEFORE sign-in.** Anonymous
checkout writes an *encrypted handoff marker*; the first Clerk account binds it once; paid tabs stay
covered until RevenueCat freshly verifies `premium` for that exact Clerk user
(`docs/PAYWALL-SETUP.md`). `Purchases.logIn(clerkUserId)` aliases the identity only minutes later
(`mobile/lib/purchases.ts:755,878`). **This one architectural choice is the root of most of the pain
below and of the entire A/B attribution failure in §6.**

## 4.2 The pre-auth purchase orphaning incident, in full

### Half 1 — the server webhook (GitHub issue **#150**, OPEN)

Title: "RevenueCat webhook drops entitlements: anonymous-ID events 503 retry forever,
NON_RENEWING_PURCHASE ignored, sandbox events can write production status".
Verbatim:

> From tonight's production forensics (server deployed the premium gate; Caddy + journal + prod DB +
> RevenueCat cross-checked). All defects are in `server/src/webhooks/revenuecat.ts`. **The webhook is
> the ONLY production writer of `users.subscription_status`**, so every one of these silently locks
> paying users out of the entire premium API scope.
>
> ## Defect 1: purchase-before-sign-in events can never bind (503 forever)
> `revenuecat.ts:142` throws `serviceUnavailable('Subscription user is not ready')` when no users row
> matches `app_user_id`. The code comment assumes a startup race and that RevenueCat retries will
> eventually succeed. **They cannot: the app's DESIGNED flow is hard paywall purchase first, sign-in
> after, so the INITIAL_PURCHASE/RENEWAL webhook arrives with `app_user_id = $RCAnonymousID:...`
> which can never equal a `clerk_user_id`.** The throw also rolls back the transaction that claimed
> the event, so the idempotency ledger stays empty and RevenueCat retries forever (**observed: 7
> retries in 12 minutes tonight, event 25411ab6, still looping**). `Purchases.logIn(clerkUserId)`
> aliases the identity only minutes later (`mobile/lib/purchases.ts:755,878`) and retried payloads
> keep the original anonymous ID.
>
> **Fix:** detect `app_user_id` starting with `'$RCAnonymousID:'` and **ack 200 with no state change**
> (log it). There is nothing to bind at webhook time; the alias does not exist yet. Server-side truth
> for these purchases arrives via a reconciliation path (separate ticket) or the next identified event.
>
> ## Defect 2: NON_RENEWING_PURCHASE missing from STATUS_MAP (revenuecat.ts:34-40)
> Promotional/lifetime grants emit NON_RENEWING_PURCHASE, which is logged 'ignoring unhandled event
> type' and never grants access. **Real casualty in prod: user_3Gabqe5QqNTNAiiKl6Zg0lURFAs has an
> active RevenueCat promotional entitlement (expires 2100) but reads subscription_status=none on the
> server.** Fix: map NON_RENEWING_PURCHASE -> active. Also decide TRANSFER handling explicitly.
>
> ## Defect 3: environment field never inspected
> **A SANDBOX event can write production subscription_status.** Currently masked by defect 1
> (tonight's sandbox RENEWAL also carried an anonymous ID); **becomes a live gate-bypass once defect
> 1 is fixed.** Fix: in production, ack 200 and ignore events whose payload environment is SANDBOX.
>
> - The two affected prod accounts were repaired by hand with SQL.

### Half 2 — the client (A/B playbook F1, `docs/AB-TESTING-ANALYTICS-PLAYBOOK.md`)

> ### F1 — Pre-auth purchase orphaning · CRITICAL · the big one
> - **Symptom:** purchase/revenue events exist but sit on anonymous analytics persons that have *no*
>   other events (no exposure, no funnel steps).
> - **Why:** the app lets users **pay before signing in** (paywall-first onboarding). At purchase time
>   the billing SDK is on its own anonymous id, so the billing→analytics integration writes the
>   purchase to an anonymous analytics person that never merges with the device person (which holds
>   the exposure) or the post-login user.
> - **Detect:** grep — is the billing SDK's "set analytics id" attribute set *anywhere*? (usually 0
>   hits when broken). Query events where `event LIKE 'purchase%'` / `rc_*`, split `distinct_id` by
>   anonymous-prefix vs user-prefix. Pull one orphan person's full event list — if it's *only*
>   purchase events, confirmed.
> - **Fix:** **before** invoking the purchase, set the billing SDK's analytics-user attribute to the
>   analytics SDK's **current distinct/device id**:
>   `Purchases.setAttributes({ '$posthogUserId': posthog.getDistinctId() })`.
> - **Verify:** a real **anonymous** sandbox purchase (login disabled) → the purchase event's
>   `person_id` == the exposure event's `person_id`. **Do not trust a test where login happened to
>   bind the billing id first.**

> ### F2 — Docs/comments encode the wrong identity assumption · CRITICAL (root cause)
> a design doc says "don't set the analytics-id attribute; the fallback is fine." That's only true if
> the user is identified *before* purchase. … **the doc will make every future engineer reproduce F1.**

Tickets: `to-tickets/TICKET-01-rc-purchase-orphan-attribution.md` (P1),
`TICKET-02-fix-analytics-conventions-doc.md` (P1 — "root cause of #01").
Commit `858f344d` "fix(analytics): preserve pre-auth purchase attribution".

### How it was fixed

Client: `$posthogUserId` set on the RevenueCat profile before every purchase call, refreshed to the
user id on login. Doc `docs/ANALYTICS-CONVENTIONS.md` §2 corrected in the same pass.

Server, commits `54be5c11` "fix(server): harden RevenueCat webhook (#150)",
`5dd1db26` "fix(server): entitlement redesign, PREMIUM_REQUIRED, resync, TRANSFER (#151)",
`3d544442` "fix(server): switch resync's RevenueCat client to REST API v2 (#151)". Formalised as
**ADR-0015** (`docs/adr/0015-revenuecat-source-of-truth.md`, accepted 2026-08-25), verbatim:

> 1. **RevenueCat is the single source of truth for subscription entitlement.** … `users.subscription_status`
>    is a cache of what RevenueCat last reported, nothing more.
> 2. **The server may re-derive that cache on demand.** … `POST /v1/entitlement/resync` is that path.
>    It authenticates to RevenueCat's REST API with a server-held secret key; it never asks the calling
>    device for its opinion of its own entitlement.
> 3. **The client never asserts its own entitlement to the server.** …
>
> ## Context
> Two production incidents on the same day (2026-08-24/25) forced this rule onto paper …
> **Both incidents share one root cause: the server had exactly one writer (the webhook) and no way to
> ask RevenueCat again if that writer was wrong, slow, or silent.** Fixing the two specific bugs
> without fixing that structural gap would leave the next version of the same bug unaddressed.
>
> ## Consequences
> - `POST /v1/entitlement/resync` exists, **authenticated but reachable without an active subscription
>   (an account that looks unentitled is exactly who needs it)**, rate-limited per account.
> - `server/src/lib/revenuecatClient.ts` is the only place the server calls RevenueCat's REST API,
>   guarded by an optional `REVENUECAT_SECRET_KEY`. Absent that key, resync **fails closed** with a
>   clear "not configured" error rather than crashing or guessing.
> - `requirePremium` and the macOS blocker's `GET /v1/entitlement` now read two different, explicitly
>   named predicates over the same cached status: **access-until-expiry for data routes, `active`-only
>   for the blocker.**

## 4.3 The cancellation incident (GitHub issue **#151**)

> RevenueCat CANCELLATION means auto-renew turned OFF; entitlement stays active until period end and
> the client keeps premium. But `revenuecat.ts:34-40` maps it to 'cancelled' and `ENTITLED_STATUSES`
> (`server/src/lib/premiumAccess.ts:9`) is `Set(['active'])`, so **the server 403s every data route for
> the remainder of a period the user already paid for.** The comment at
> `server/src/routes/entitlement.ts:6-10` shows this was a deliberate rule written ONLY for the macOS
> blocker ('blocker stops working when they cancel'); **a9a6a856 silently widened it to all 14 iOS
> route groups.**
>
> ## Distinct error code
> `errors.forbidden` yields generic FORBIDDEN … shared with four partner-invite refusals. Add
> **PREMIUM_REQUIRED** as the code for requirePremium's 403 …
>
> ## TRANSFER and friends
> TRANSFER is unhandled (logged + ignored at `revenuecat.ts:120-123`) yet account transfer is exactly
> the case the server can never learn about otherwise.

## 4.4 The safeguard incident (GitHub issue **#157**, OPEN, P0)

> BLOCKS the TestFlight accountability run. **This is the one defect that can text a real partner
> about something the member did not do**, and the same event silently leaves the member unprotected
> with no way back on.
>
> `mobile/lib/paywallGate.ts:143-149` calls `reconcileProtectionsForPremiumAccess` with
> `active: serverConfirmedPremium` as soon as premiumLoading clears. But `usePremium`
> (`mobile/lib/purchases.ts:1533-1546`) sets loading from `configurationSettled` ALONE and returns
> `isPremium:false` whenever `error` is set or `customerInfoKnown` is false.
>
> **So a PAYING member who launches offline, or hits any transient RevenueCat error, produces
> loading:false + active:false.** That takes the disable branch at
> `mobile/lib/protectionLifecycle.ts:118` and runs `applyDisable`, which calls `disableProtection()`
> (`protectionLifecycle.ts:43`). **That genuinely turns the real iOS content filter OFF.**
>
> 1. The next successful foreground heartbeat reports `protectionActive:false`, the server computes a
>    'deactivated' transition (`server/src/routes/heartbeat.ts:39-45,91-97`), and **the partner is
>    texted that the member turned off a safeguard. The member turned nothing off.**
> 2. **The member is left unprotected PERMANENTLY**, because the recovery path `applyActivation`
>    requires `pendingScreenTime`, which is null by then.
>
> **Fix:** take the disable branch only on a CONFIRMED lapse … **Never disable on the mere negation of
> isPremium.** Unknown or errored entitlement state must be treated as UNKNOWN: leave protection
> exactly as it is. **Turning a safeguard off is not a safe default, and an offline launch must never
> do it.**
>
> `mobile/lib/__tests__/paywallGate.test.tsx:385,403` currently assert the reconcile is called with the
> raw flags. **Those tests LOCK IN the broken behavior and must be rewritten.**

Related: `b4c3d72c` "fix(protection): never disable real safeguard on unconfirmed entitlement (#157)".

## 4.5 Offering / catalog bugs

`docs/AB-TESTING-ANALYTICS-PLAYBOOK.md` F8, verbatim:

> ### F8 — Price/paywall experiments can't actually vary · CRITICAL for price tests (often latent)
> - **Symptom:** a launched price test reports ~0 lift forever; both arms see the same prices.
> - **Why:** the paywall renders a **hardcoded** offering/product set instead of the offering the
>   experiment assigns, and/or pairs products by **exact product id** (a new-priced variant has new ids
>   → no match → falls back to control prices, buy button dead-ends), and/or the plan count is fixed so
>   a 2-vs-3-plan test can't render.
> - **Fix:** render the **assigned/current** offering (`offerings.current`); pair by **stable package
>   key / package type**, not product identifier; drive the card list from the offering's actual packages.

Tickets: `TICKET-03-paywall-use-current-offering.md` (read `offerings.current`, not
`offerings.all['default']`), `TICKET-04-pair-packages-by-lookup-key.md`,
`TICKET-14-dynamic-plan-count.md`, `TICKET-21-dynamic-revenuecat-flow-paywalls.md`.
Commits `71cd8298` "fix(paywall): render RevenueCat current offering", `7c0d16af` "render live
RevenueCat packages", `8790983f` "two-plan paywall".

Catalog/config defects found in the July audit (`plans/sessions/ttys003/submission-fix-log.md`):
- Stale RC bundle ID `com.reform.app` → `com.regenapp.app`; before the fix the In-App Purchase Key
  showed "Credentials need attention". `docs/SHIP-TODAY-RUNBOOK.md:78`: "**Left unfixed, StoreKit-2
  purchases would have failed to record → review rejection.**"
- `trial_duration: null` on **every** product while `paywallConfig.ts` promised `trialDays: 7` ×4
- Real products displayed "Reform Weekly / Reform Annual / Reform 90 Days" (2.3.8)
- Two RC apps: real store `appda1c585d34` (durations NULL) vs Test Store `app814734fc99` (durations
  present) — "**Prod build MUST resolve the real App Store products, not the Test-Store mirrors.**"
- Win-back sharing the main subscription group made its "Start Free Trial" label structurally false
  (intro offers are one-per-group-first-time)

**Recurrence 2026-09-06** (`PITFALLS.md:409`):

> an old checkout filter hid `$rc_weekly` even after the live offering mapped an approved weekly trial
> product. Removed the client filter and detached the obsolete iOS quarterly product from the current
> offering, preserving its entitlement for existing subscribers. **Verify the SDK-facing offering using
> the shipped iOS public key; dashboard product approval alone does not prove the client renders it.**
> Checkout tests passed, but physical OTA activation was not verified because the phone was unavailable.

Trial-honesty rule now in `docs/PAYWALL-SETUP.md`, verbatim:

> The runtime also asks RevenueCat for introductory-price eligibility for every loaded package.
> **Only a definitive eligible response may render trial language or schedule a trial reminder.**
> Ineligible, unknown, missing, no-offer, and lookup-error states keep the package purchasable but
> disclose immediate billing.

Copy fixes: `22e2962e` ("honest CTA — 'Start 7-day free trial' not malformed 'Start for 0.00$'"),
`b9336e7b` (honor trial eligibility), `c3a2476e` (live trial duration), `91b9474b` (bind displayed
purchase terms), `4f556bc8` ("make billed amount the most conspicuous price (3.1.2c)").

## 4.6 Sandbox vs production event pollution

`PITFALLS.md:402-407`, verbatim:

> ### Shared RevenueCat production/sandbox destinations make event revenue ambiguous (2026-09-05, Recovi)
> - **Problem:** a production-only onboarding/A/B dashboard cannot safely attribute subscription
>   conversions and revenue from existing `rc_*` events.
> - **Why:** the project's documented RevenueCat integration **sent production and sandbox events to
>   the same PostHog project token.** The inspected native integration payload had **no
>   environment/sandbox field**; the client SDK's registered environment does not label
>   server-to-server RevenueCat events.
> - **How to fix:** the verified containment is to **withhold uncertain experiment subscription
>   outcomes** and show separately sourced RevenueCat project totals. Prevention requires routing
>   sandbox events separately (or a verified event-level classification pipeline); **that provider
>   configuration change was not performed in this diagnosis. Do not guess or silently backfill old
>   events as production.**

Plus playbook F7: "sims, CI/agents, and **billing sandbox** all ingest into the one production
project with no discriminator. **Sandbox subscription webhooks look identical to real ones.**"
Fixed client-side by TICKET-07 (`environment` super-property `dev`/`preview`/`prod`); the RevenueCat
destination split remains **unresolved**.

## 4.7 Paywall bypasses and restore

`docs/asc/payment-flow-verification.md`, verbatim:

> The confirmed production holes were `regen://check-in`, `regen://panic-entry` (including query
> strings such as `?source=pill`), `regen://urge-intensity` (including `?source=panic`), and
> `regen://relapse-confirm`. **These routes sit outside `(tabs)`, so the old tabs-only gate never ran.**

Commits `9adca6a2`, `462621f1` ("close the Account-exemption hard-paywall bypass"), `55512add`
("two paywall bypasses found and closed"), `b96b7e1a` ("gate Screen Time behind purchase").

**Restore** — `to-tickets/TICKET-16-restore-requires-explicit-account.md` (P1 IDENTITY/PRIVACY),
verbatim:

> 1. Install or reinstall Regen from the App Store. 2. Reach the hard paywall without explicitly
> signing in during this installation. 3. Tap **Restore purchases**. 4. **Regen enters the tabs
> immediately and displays an existing account's data.**
>
> ### 1. Clerk credentials survive an iOS uninstall
> `mobile/lib/clerkTokenCache.ts:5-28` stores Clerk session tokens with Expo SecureStore. On iOS,
> SecureStore uses Keychain, and Expo's SDK 56 documentation explicitly states that its values can
> persist across uninstall/reinstall for the same bundle identifier. … `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
> prevents device migration; **it does not create an installation boundary.**
>
> ### 2. Restore bypasses account confirmation
> `mobile/components/onboarding/OnboardingFlow.tsx:1617-1648` … On successful `restorePremium()` it
> unconditionally does both: `markComplete(); router.replace('/(tabs)');` The hook does not read Clerk
> state, does not identify the active account … `checkoutRedesign.test.tsx:352-363` **currently locks
> this incorrect behavior.**
>
> - On a shared, borrowed, resold, or previously used device, **this can expose another person's
>   recovery history.**
> - **Restore Purchases restores Apple billing access. It must never silently choose a Regen account.**
>
> ### Installation-boundary fix
> Add a **non-Keychain installation marker in AsyncStorage**. AsyncStorage is removed on uninstall
> while iOS Keychain can survive. … Marker absent but Clerk returns a Keychain session: classify it as
> a resurrected prior-install session … Clear or quarantine it, then require explicit sign-in.

Fixed and deployed 2026-08-16 as `c255ac16`, published to all three then-live runtimes (update ids in
§3.8). Related: `d0f04580` "a valid purchase bounces to sign-in, not straight to tabs",
`d186176a` "never strand a premium user on the paywall across sign-out/sign-in",
`7c724bef` "bind purchases to verified accounts", `0eab27a8` "rescue onboarded users stranded in
onboarding, paywall-exempt".

## 4.8 What was never verified

`docs/asc/payment-flow-verification.md`, verbatim:

> For every case, retain screenshots or a screen recording, the build number, sandbox account label,
> Clerk/RevenueCat app-user id, timestamps, RevenueCat customer timeline, and pass/fail result. Attach
> those artifacts to #101; **do not mark the live payment flow verified from automated Jest coverage
> alone.**

> Apple's approved-refund test requires a StoreKit refund-request sheet/test harness; **Regen does not
> currently expose a refund-request button**, so #101 must use an Apple sandbox/Xcode harness capable
> of calling `beginRefundRequest`, rather than pretending that clearing purchase history is a refund.

---

## 5. Auth — Clerk

## 5.1 Setup

| Item | Value |
|---|---|
| Provider | **Clerk**, `@clerk/clerk-expo ^2.19.42` (legacy package; 19 source/test files use or mock it) |
| Prod instance | `ins_3FxYL5XNy8uRMGn1zE25uooLPRf`, custom domain `clerk.regenapp.us`, `pk_live_Y2xlcmsucmVnZW5hcHAudXMk` |
| Preview instance | `pk_test_dGhvcm91Z2gtcmVwdGlsZS0xMS5jbGVyay5hY2NvdW50cy5kZXYk` |
| Apple | **Native** — `expo-apple-authentication` + Clerk `useSignInWithApple().startAppleAuthenticationFlow()`; `ios.usesAppleSignIn: true` |
| Google | Browser SSO — `useSSO().startSSOFlow({ strategy: 'oauth_google' })` → `regen://sso-callback` |
| Email | OTP, split into its own flow (`19e96402`, `b6355999` one-tap signup) |
| Token storage | `mobile/lib/clerkTokenCache.ts` → `expo-secure-store` (iOS Keychain, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`) **+ a non-Keychain AsyncStorage installation marker** (added by TICKET-16) |
| Session bridge | `mobile/lib/authBridge.tsx` — session → API JWT getter, PostHog `identify`, Sentry `setUser`, RevenueCat `logIn` |
| Routing gates | `mobile/lib/authGate.ts`, `mobile/lib/authStartupBound.ts`, `mobile/app/_layout.tsx` |
| Server | dual-issuer JWKS selected by the token's `iss` (prod + dev), so dev QA accounts still work |
| Apple identifiers | Services ID `com.regenapp.app.signin` (hosted OAuth) vs bundle App ID `com.regenapp.app` (native), team `AX3C2B78YD` |

## 5.2 The native Sign in with Apple no-op incident (GitHub issue **#146**, still OPEN)

Title: "P0: native Sign in with Apple completes but never leaves the sign-in screen (live App Store app)".
Verbatim body:

> On the LIVE App Store app (1.0.3 build 28 + OTA group 4497655c), tapping Sign in with Apple shows the
> NATIVE Apple sheet (new behavior — it used to be the web-based Apple flow), the user completes Face
> ID / password, and **the app stays on the sign-in screen. No error shown.** Reported by Johan on his
> device 2026-08-25 evening.
>
> ## Why this is P0
> **The post-purchase flow signs new buyers out and routes them to this exact screen to save their
> subscription to an account. A stuck sign-in screen right after payment is the worst possible place
> for this bug.** Returning users with expired sessions are also affected.
>
> ## Known so far
> - Regression window: commit **65ce1cae** "fix(auth): use native Apple sign-in" replaced the Clerk web
>   SSO flow (useSSO/startSSOFlow) with native `useSignInWithApple().startAppleAuthenticationFlow()` in
>   `mobile/app/(auth)/sign-in.tsx`.
> - The handler has silent no-op paths: `if (!sessionId) return;` and a fresh-transfer guard that only
>   surfaces errors in narrow cases — consistent with "completes but nothing happens, no error".

Clerk API forensics comment, verbatim:

> **Confirmed at the Clerk API level: the native flow's token exchange never succeeds.**
> - Zero new users created during the failing attempts; Johan's user shows `last_active_at` during the
>   attempt window but has **zero sessions**.
> - No successful `oauth_apple` sign-in on the production instance since Aug 1 — i.e. the 1.0.2
>   web-flow era. **Native SIWA has been broken for ALL App Store users since 1.0.3 released**
>   (65ce1cae shipped in the build-27/28 embedded binary, not today's OTA).
>
> **Root cause (per Clerk's Expo SIWA docs):** native Sign in with Apple requires the iOS app to be
> registered on the Clerk Dashboard **Native applications** page with App ID Prefix (Team ID
> `AX3C2B78YD`) + Bundle ID (`com.regenapp.app`). This is separate from the web Services-ID OAuth
> config, which is why the old web flow worked. The client-side symptom of an unregistered native app
> is exactly what we see: sheet completes, exchange fails, and `sign-in.tsx` swallows it via the silent
> `if (!sessionId) return;`.

Confirmation + fix comment, verbatim:

> Clerk Dashboard → Recovi Production → Native applications showed **"No iOS applications"** — the
> native app was never registered, so every native Apple token exchange failed (matching the API
> forensics: zero sessions created).
>
> **Fixed 2026-08-25 ~23:3x UTC:** registered iOS app with App ID prefix `AX3C2B78YD`, bundle
> `com.regenapp.app` (screenshot-verified in the applications table; mobile SSO redirect
> `com.regenapp.app://callback` was already allowlisted). **Native Apple sign-in should now work on the
> live app with NO client update.**

Client fix (commit **`abf0772e`** "fix(auth): surface real native Apple sign-in failures, not just
cancellations"), verbatim:

> The handler had an unconditional `if (!sessionId) return;` that swallowed a failed token exchange the
> same way it swallowed a legitimate cancellation. Fixed by distinguishing the two using the Clerk
> `signIn` resource itself:
>
> - Capture `previousFirstFactorStatus` from `signIn.firstFactorVerification.status` before calling
>   `startAppleAuthenticationFlow()`.
> - When no session comes back and it's not a fresh account transfer, compare the returned resource's
>   `firstFactorVerification.status` to that pre-flight value. Per Clerk's native hook
>   (`useSignInWithApple.ios.js`), **a true cancellation happens before `signIn.create()` ever runs, so
>   the resource is untouched. A real failed exchange still calls `signIn.create()` first, which always
>   changes that status.** So: status changed -> real failure -> show `Could not finish sign-in.`;
>   status unchanged -> cancellation -> stay silent, allow retry.
>
> Tests: `signInSignupPassword.test.tsx` + `app/(auth)/__tests__/signInApple.test.tsx` — 2 suites, 31 tests, green.

Generalized (`PITFALLS.md:348-353`):

> **Ships to production looking "done" because the visible half (the Apple UI) works.** … two stacked
> failures. (1) Switching from web-OAuth Apple sign-in to the NATIVE flow changes the identity token
> audience to the app's bundle id, which the auth provider only accepts if a "Native application"
> (Team ID + Bundle ID) is registered in its dashboard — **a console step no code review can catch.**
> (2) The client treated "no sessionId" as user-cancelled and returned silently.
> **How to check:** after ANY change of sign-in flow type, do one real sign-in on a production/TestFlight
> build before shipping; also check the provider's analytics for zero successful sign-ins of that method
> since release — **the client swallowing errors means only the dashboard shows the outage.**

### Why they migrated at all (TICKET-15), verbatim

> On iOS, tapping **Continue with Apple** opens an `ASWebAuthenticationSession` browser surface before
> Apple's Sign in with Apple sheet. … The Apple sheet in the reported Regen flow also says **"Sign in
> to Reform"**, exposing the retired brand instead of Regen.
>
> Root cause: `mobile/app/(auth)/sign-in.tsx:114-163` maps Apple to `oauth_apple` and calls Clerk
> `useSSO().startSSOFlow()`. … `mobile/app.json` has no `ios.usesAppleSignIn`, no
> `expo-apple-authentication` plugin, and the package is absent from `mobile/package.json`.
> **This is not a redirect-page styling bug. The wrong authentication mechanism is being invoked.**

And the identity gate it imposed, verbatim:

> Use an existing production Apple account and prove native sign-in returns the exact same Clerk
> `user.id` as hosted OAuth. **Repeat with an existing Hide My Email account. Do not rely on matching
> email because Apple may return no email after first authorization or may use a different relay
> address.**
> **A duplicate Clerk user is release-blocking.** `mobile/lib/authBridge.tsx` treats another Clerk ID as
> an account switch, backend records are user-ID scoped, RevenueCat logs into the new ID …
>
> ## Release classification
> This is a **native binary change**, not OTA-safe. Bump the app version/runtime before publishing
> JavaScript that imports the native module so older binaries cannot receive incompatible code.

## 5.3 The unbounded auth wait on fresh installs (TICKET-27)

`to-tickets/TICKET-27-bounded-anonymous-startup.md`, verbatim:

> A fresh install's route out of the launch overlay waits on Clerk **without any bound**:
> - The routing gate in `CoordinatedGatedRoutes` returns early while `!isLoaded`
>   (`mobile/app/_layout.tsx:271`), so the stack beneath the overlay never routes to onboarding until
>   Clerk answers.
> - `resolveAcquisitionAuthorityState` returns `'resolving'` while `!authLoaded`
>   (`mobile/lib/acquisitionCoordinator.tsx:188`), so the acquisition coordinator never reaches
>   `'ready'` and a "Get started" tap reveals a stuck resolving state.
> - The only Clerk failsafe (`_layout.tsx:1056-1065`, `HARD_CAP_MS`) unparks **API requests**, not the
>   navigator or the authority state.
> - `mobile/lib/api.ts` fetches carry **no timeout/AbortController**, so each request can hang as long
>   as the OS lets a socket idle.
>
> The production Clerk instance is the custom domain `clerk.regenapp.us`; on slow networks (**the SO/ZM/CL
> installs in the live data**) first launch can sit on the landing screen (or a dead frame after tapping
> Get started) indefinitely.
>
> **BEFORE:** a first launch in Somalia on a bad connection shows the landing screen; the user taps "Get
> started" and gets a frame that never advances … **Analytically (pre-TICKET-26) this is
> indistinguishable from a bounce.**
>
> **AFTER:** if Clerk has not settled by the existing launch hard cap, a **fresh install proceeds
> anonymously** … and a `startup_stalled` event records that the bound fired.
>
> ## Root cause
> The launch overlay got a hard cap (`HARD_CAP_MS`) but the things behind it did not … **Anonymous
> first-run has no actual dependency on Clerk — it needs no session — so the wait is pure downside.**

Fix commit **`c935d08f`** + `lib/authStartupBound.ts`; `lib/api.ts` requests abort at
`REQUEST_TIMEOUT_MS`. Boots **with** account evidence stay fail-closed.

End-to-end stall proof, verbatim (preview-simulator build `08463edb-01d5-4e44-bbe5-6cbde1142c7e`,
keychain-reset fresh install, Clerk host blackholed to a non-routable TEST-NET address):

> The landing screen still rendered, the cap fired, and the CTA advanced into onboarding in **~5s
> instead of the pre-fix dead frame.** PostHog 451896, one person
> `f5de45cd-9672-5113-b9ab-6cfde548afc8`, `environment=preview`: `Application Opened` (04:34:45Z) →
> `landing_viewed` (04:34:47Z) → `startup_stalled {reason: auth_timeout}` (04:34:51Z) →
> `onboarding_screen_viewed` (04:34:51Z). Host DNS was restored immediately after the run.

## 5.4 Other auth failures

- **Preview/dev builds could not run auth at all** (TICKET-29, `f6919985`) — `PITFALLS.md:106-111`:
  "whole classes of bugs … ship because the code paths **literally cannot execute in any build a
  tester or agent can install.** Only the production build profile carries the auth/purchases keys."
- **Token-cache write failure aborted a completed sign-in** (`PITFALLS.md:112-117`): "the auth SDK
  awaits its custom token-cache callback while activating the new session. **If a transient
  Keychain/SecureStore write rejects, that storage failure escapes through the auth promise and aborts
  the handoff even though the provider already issued a valid session.**"
- **Expo SDK 56 `expo/fetch` stranded a successful auth response** (`PITFALLS.md:118-123`): "an auth
  verification request returns HTTP 200, but JavaScript never completes the response read; the UI spins
  forever and logs an Expo `NativeResponse` invalid-state error … can race response-body state
  transitions (`currentState[3] validStates[4]`) on iOS." Shipped mitigation:
  `EXPO_PUBLIC_USE_RN_FETCH: "1"` in the production EAS env, asserted by release config.
- **`undefined.entitlements`** (`af991736`, `PITFALLS.md:342-347`): "The app target's
  `CODE_SIGN_ENTITLEMENTS` points to an empty, stale, or generated `undefined.entitlements` file.
  **Xcode can archive with the capable profile while signing the main executable without the requested
  entitlements**; checking only the source plist or profile gives a false pass." Check with
  `codesign -d --entitlements :- Payload/App.app` plus every `.appex`.
- **Email sign-up never completed** (issue #97): "Clerk requires a password the passwordless UI never
  collects (dev AND prod)" — which is why the App Review demo user had to be created via BAPI.
- **Post-splash sign-in painted authoritative "no data"** (`PITFALLS.md:94-99`).
- **Check-in save hung after same-launch sign-out→sign-in** (issue #82).
- **Google SSO entry hidden then restored** — `baa2ca33`, `db43fe65`.
- Account-handoff hardening: `2e7c704e` "fail closed across account handoffs", `5e9807c3` "make
  account ownership durable", `0fd27ca0` "lock account handoff invariants", `c255ac16` "require
  explicit account for restore", `39c495e2` "keep auth controller outside routes".

---

## 6. The ~25 P0/P1 production incidents — checklist for the new app

One line each: **symptom → root cause → where**. Check ExcerLock against every row.

| # | Incident | Root cause | Ref |
|---|---|---|---|
| 1 | Public App Store download opens stale onboarding despite a published OTA | OTA published to runtime `6e70341f…`; live build 32 pinned to `b0ac8e7c…`; EAS serves only runtime-compatible updates | issue #195 |
| 2 | Same, second mechanism (2026-09-04) | ASC keeps multiple READY_FOR_SALE versions; filtering by stale local `app.json` version selected an older public build | PITFALLS.md:437 |
| 3 | OTA reached users "only by luck" | 4s shared check+download budget; losing it once pinned the flow journal permanently | `149b2021` |
| 4 | Unpaid users could never receive any OTA | returning-update coordinator gated on `onboardingComplete`, which sits behind the hard paywall | `149b2021` |
| 5 | Erased install `SIGSEGV` during OTA activation | typed-critical manifest woke both legacy update coordinators in the embedded bundle | `a1c4d417` |
| 6 | Startup could hang forever on a hung update op | `criticalUpdateCoordinator.ts:305/324/469/500` awaits with no deadline | startup-ota-code-audit |
| 7 | Update recovery screen mounted but invisible | `_layout.tsx:1188` `revealStartupRecovery` omits `criticalUpdateLaunch.phase === 'blocked'` | startup-ota-code-audit |
| 8 | Cancelled update still reloaded with stale continuation | `criticalUpdateCoordinator.ts:343-368` doesn't re-check `isActive` after the async marker write | startup-ota-code-audit |
| 9 | OTA from converged trunk would crash all 1.0.x installs | JS imported `expo-network`/`expo-video` absent from the shipped binaries | ota-convergence-plan.md |
| 10 | Production OTA shipped with the wrong environment | `eas update --environment X` inlines the **EAS server-side** env, not `eas.json`'s | ACQUISITION-EXPERIMENT-RUNBOOK:34 |
| 11 | Cold launch replayed the logo/tagline and flashed Expo's white reload spinner | presentation started from font-readiness before update finality; three-way Expo 56 reload race | issue #198 |
| 12 | RevenueCat webhook retried forever, entitlement never bound | hard paywall = purchase before sign-in → `app_user_id = $RCAnonymousID:…`; 503 rolled back the idempotency claim | issue #150 |
| 13 | Promo/lifetime grants never activated | `NON_RENEWING_PURCHASE` missing from `STATUS_MAP` (`revenuecat.ts:34-40`) | issue #150 |
| 14 | Account transfers invisible to the server | `TRANSFER` logged and ignored (`revenuecat.ts:120-123`) | issue #151 |
| 15 | Sandbox events could write production entitlement | webhook never inspected the payload `environment` field | issue #150 |
| 16 | Cancelling auto-renew hollowed out a paid period | `CANCELLATION` → `'cancelled'`, `ENTITLED_STATUSES = Set(['active'])`, widened to all 14 iOS route groups by `a9a6a856` | issue #151 |
| 17 | No way to repair a stale server entitlement | webhook was the only writer; no resync path existed | ADR-0015 |
| 18 | Transient RevenueCat error turned the real iOS filter OFF + texted a false partner alert + left the member permanently unprotected | `paywallGate.ts:143-149` disables on the mere negation of `isPremium`; recovery needs `pendingScreenTime`, null by then | issue #157 |
| 19 | Hard-paywall bypass on 4 production routes | `check-in`, `panic-entry`, `urge-intensity`, `relapse-confirm` sit outside `(tabs)`; gate was tabs-only | payment-flow-verification.md |
| 20 | Restore Purchases silently entered someone else's account | Clerk Keychain token survives uninstall + restore called `markComplete()` + `router.replace('/(tabs)')` with no identity check | TICKET-16 |
| 21 | Native Sign in with Apple created zero sessions for every App Store user (~10 days) | Clerk Dashboard "Native applications" empty; client swallowed it via `if (!sessionId) return;` | issue #146 |
| 22 | Signed executable lacked SIWA + Family Controls despite a capable profile | `CODE_SIGN_ENTITLEMENTS` pointed at a generated `undefined.entitlements` | `af991736` |
| 23 | Fresh installs on slow networks hung on a dead frame forever | routing gate + acquisition authority hard-require Clerk `isLoaded`; `api.ts` had no AbortController | TICKET-27 |
| 24 | Every production user split into two PostHog persons | `resetAnalytics()` called on every anonymous boot | TICKET-25 |
| 25 | Every experiment read ~0 lift | anonymous purchases orphaned off the exposure person (`$posthogUserId` never set) | TICKET-01, playbook F1 |
| 26 | Paywall/price experiments could not vary at all | `offerings.all['default']`, pairing by product id, hardcoded plan count | TICKETs 03/04/14 |
| 27 | Preview/TestFlight builds emitted zero analytics and resolved every flag to control | only the production EAS profile had `env`; `.easignore` excluded `.env*` | TICKET-11 |
| 28 | Onboarding answers never reached the server | `completeOnboardingOnBackend` lost its only caller | issue #91 |
| 29 | Untouched onboarding pickers recorded null | displayed default never committed (age showed 25, recorded null) | issue #98 |
| 30 | Fresh 90-day countdown displayed ABOVE 90 days | wall-clock anniversary target decomposed by absolute ms; DST hour leaked | issue #154 |
| 31 | Failed fetches rendered permanent hollow skeletons | fetch failures swallowed by a "loaded" bit, no error state | issues #147, #149 |
| 32 | Onboarding blocker intent never activated the filter; Skip kept a stale ON intent | intent never reached activation | issues #155, #158 |
| 33 | Toggles lied — Face ID unlocked through after enrollment removal; partner/Night Shield rows stale | UI state not reconciled with native truth | issue #160 |
| 34 | Accountability alerts silently missed after reinstall / on multi-device | server-side integrity gaps | issue #159, `576f0041` |
| 35 | Two paywall bypasses + Account exemption | see #19 | `55512add`, `462621f1` |

Plus dev-loop hazards from `PITFALLS.md` worth pre-empting: `CI=1` kills Metro fast-refresh; piping
Metro through `head`/`tail` kills it; stale Metro on a shared port serves **another project's bundle**;
parallel booted simulators multiply sim ops 5-60×; "E2E assertions pass over a crashed app";
"a screenshot proves nothing until you prove the bundle"; `jest-expo` caches the host timezone before
test files run; `EXPO_PUBLIC_*` overrides poison tests and dev runtimes; `expoGoConfig !== null`
misclassifies embedded Release builds; EAS runtime bundles cannot import files excluded by
`.easignore`; a sub-1GB-RAM zero-swap VPS OOM-kills `tsc` mid-deploy (exit 137).

---

## 7. A/B testing

## 7.1 What was actually wired

- **PostHog** project **451896** (org "Edge"), token `phc_ACxkztUgL8Z3jQCJmENkqhhszKNLP7xPWBo3kDAokAup`,
  host `us.i.posthog.com`, person-on-events enabled.
- Division of labour is a hard architectural rule — `docs/ACQUISITION-EXPERIMENT-RUNBOOK.md`, verbatim:

> **PostHog owns Flow design experiments (which screens, order, emphasis). RevenueCat owns
> commercial-term experiments (prices, trials, offers). One causal test never has two allocators:**
> a Flow variant may only *select among* live RevenueCat packages (`checkoutEmphasis`), never define
> money, trials, or availability — payload options are validated against the registry and anything else
> is rejected as `malformed-payload`.

- Flags: multivariate on `ACQUISITION_FLOW_FLAG_KEY`, **`bucketing_identifier: device_id`**,
  `ensure_experience_continuity: false` — "continuity is app-side via the encrypted sticky journal,
  which survives restart, allocation changes, network loss, and Clerk sign-in."
- Payload contract: exactly `{schemaVersion, flowId, flowVersion, options}`; "**The client fail-closes
  on anything else; a bad payload cannot brick acquisition.**"
- Exposure "fires only when the first variant-specific screen is visible".
- Code: `mobile/lib/experiments.ts`, `mobile/lib/acquisitionFlowRegistry.ts` (with a `previewOnly` gate
  that fails closed to bundled control when the runtime resolves `prod`),
  `mobile/lib/acquisitionFlowAssignment.ts`, `mobile/lib/acquisitionAnswerEnvelope.ts`,
  `mobile/components/onboarding/flow.ts`, server validation `server/src/routes/onboarding.ts`
  (`ACQUISITION_CONTRACTS`).
- ADR-0013 (`docs/adr/0013-remote-acquisition-flow-boundaries.md`) + spec
  `docs/REMOTE-ACQUISITION-EXPERIMENTS-SPEC.md`.
- Delivery is coupled to OTA: a Flow variant ships as an EAS Update to the exact target runtime
  (TICKETs 17-24). This is why §3's failures also broke A/B.

## 7.2 What read zero — `docs/AB-TESTING-ANALYTICS-PLAYBOOK.md`

Origin note, verbatim:

> **Origin:** distilled from a real 11-agent audit of a hard-paywall iOS app (RevenueCat + PostHog,
> 2026-07-31). **Every failure mode below was found live in a shipping app whose plumbing "looked done"
> and whose events "were flowing."**
>
> **The one-sentence thesis:** *events flowing ≠ A/B testing working.* The thing that almost always
> silently breaks is **attribution** — whether the purchase/conversion event lands on the same analytics
> "person" that was assigned to the experiment variant. **Verify that join end-to-end or you are
> optimizing blind.**

| Mode | Failure | Severity | Ticket |
|---|---|---|---|
| F1 | **Pre-auth purchase orphaning** — billing SDK on its own anon id at purchase; purchase person never merges with the exposure person | CRITICAL | 01 |
| F2 | **Docs encoded the wrong identity assumption** — `ANALYTICS-CONVENTIONS.md` §2 said "do not set `$posthogUserId`" | CRITICAL (root of F1) | 02 |
| F3 | Experiment bucketed on the post-login user id → users flip variants when they sign in mid-onboarding | HIGH | — |
| F4 | Exposure fired at the root provider ⇒ exposure count ≈ app-launch count | HIGH | 05 |
| F5 | Silent flag read — payload-only accessor never emits `$feature_flag_called` | HIGH | — |
| F6 | Screen tracking wired only in onboarding; no data past signup | HIGH | 06 |
| F7 | No dev/preview/prod discriminator; sims, CI agents and **billing sandbox** counted as production; "a single 'super person' with thousands of events" | HIGH | 07 |
| F8 | Paywall couldn't vary — hardcoded offering, product-id pairing, fixed plan count | CRITICAL for price tests | 03/04/14 |
| F9 | Cold-start flag race; **`posthog-react-native@4.46.30` didn't persist its device id**, so the first flags call omitted `$device_id` and device-bucketed flags evaluated out-of-rollout | MEDIUM | 08/09 |
| F10 | Domain events fired from both client and server; subscription events double-counted | MEDIUM | — |
| F11 | Free-text `reason`/`note` fields forwarded verbatim = latent PII leak + cardinality explosion | MED–HIGH | 12 |
| F12 | **Tooling pointed at the wrong project** — the PostHog MCP defaulted to an empty "Default project" 537075, so an audit nearly concluded "nothing is wired" | MEDIUM (meta) | — |

Additional, outside the playbook:
- **TICKET-25** — `resetAnalytics()` on every anonymous boot split every production user into two
  PostHog persons (`PITFALLS.md:43`).
- **TICKET-26** — the landing screen was route-less, so `$screen` never covered it; landing abandonment
  was indistinguishable from a startup hang.
- **TICKET-28** — a pre-navigator `$screen "home"` counted as a Home visit.
- **TICKET-11 / `PITFALLS.md`** — "preview/TestFlight builds emit zero analytics and resolve every
  experiment to control — **the A/B rail is unvalidatable before production**. Only the `production`
  EAS profile has an `env` block AND `.easignore` excludes `.env*` from the build tarball."
- Store-compliance coupling, `docs/ANALYTICS-CONVENTIONS.md:172`: "create a **separate subscription
  group per variant offering** so no customer is eligible for two variants' products … **New IAP
  products need App Review approval before production traffic**; sandbox works pre-approval."
- Operational footgun, `to-tickets/README.md`: "⚠️ **PostHog two-org footgun:** any dashboard/MCP work
  must `switch-project 451896` first (the MCP defaults to an empty 'Default project' 537075)."

## 7.3 Final architecture

- One assignment owner per test; PostHog for flow/copy/layout, RevenueCat for price/trial/plan mix.
- Bucket on `$device_id`; app-side encrypted sticky journal for continuity, not
  `ensure_experience_continuity`.
- Exposure emitted by the exposure-**sending** API, at the surface the experiment governs.
- `$posthogUserId` stitched into the RevenueCat profile **before** every purchase call; refreshed to
  the user id at login.
- `environment` super-property (`dev`/`preview`/`prod`) registered at client construction **and after
  every reset**; all prod insights filtered on it.
- App-wide route-change screen tracking, low-cardinality slugs, enums only at analytics seams.
- Single-emitter taxonomy; subscription lifecycle comes only from the RevenueCat→PostHog integration
  (`rc_*`), never hand-rolled captures too.
- Preview EAS profiles carry the PostHog key and a dev Clerk instance so the rail is testable pre-prod.
- Verification gate: "one real (sandbox) purchase, made **anonymously**, whose purchase event shares a
  person with its experiment exposure."
- Docs: `docs/ANALYTICS-CONVENTIONS.md` (D1-D12 decisions),
  `docs/AB-TESTING-ANALYTICS-PLAYBOOK.md` (portable), `docs/ACQUISITION-EXPERIMENT-RUNBOOK.md`,
  `docs/research/ab-paywall-capability-comparison-2026-08-31.md`,
  `docs/research/analytics-ab-handoff-2026-07-12.md`, `docs/REMOTE-ACQUISITION-EXPERIMENTS-SPEC.md`.

---

## 8. Performance / startup — every measurement recorded

| Area | Before | After | Source |
|---|---|---|---|
| Fresh install, slow network, Clerk unreachable | **hung forever** on a dead frame | **~5s** to onboarding; `startup_stalled {reason: auth_timeout}` fired once | TICKET-27, build `08463edb-01d5-4e44-bbe5-6cbde1142c7e` |
| First-session OTA check + download | one shared **4s** budget; losing it once pinned the journal permanently | **10s** check budget, then a separate **30s** download budget | `149b2021` |
| Returning/critical update check | **unbounded** | **10s** check, **30s** fetch, **5s** continuation reads | startup-ota-code-audit |
| Cold-storage persistence bound | **250 ms** | **5s** (+ evict rejected cached master-key promise, one automatic retry) | startup-ota-code-audit |
| Launch hold before "Getting the latest version" appears | n/a (dead Get-started button) | line shown once acquisition is held past **2.5s**; "A normal boot releases well inside that and never shows the line." | `149b2021` |
| Cold-launch brand sequence | tagline started on font-readiness, could replay after reload or exit on a partial word | one root-owned state machine: hold → tagline → **350 ms** final beat → destination | issue #198 / `41f17e80` |
| OTA reload visual continuity | Expo's white spinner + visible restart | **108 consecutive logo-bearing frames** at 60 fps, no white/black/blank/spinner/missing-mark frame, no duplicate tagline | issue #198 |
| Fresh-install OTA activation proof | — | native log: **one** manual check, **one** compatible download, **one** restart before Flow visibility; SQLite store: embedded `4cb20df4-82a2-4a1b-91ef-a33ad523c601` + the OTA, both **0 failed launches**, OTA **1 successful launch**; second cold launch added **no** check/restart and raised successful launches to **2** (loop breaker proven) | TICKET-18, build `56c8d2e0-654a-4ca6-9b6f-869cdd45de96`, runtime `fbbf1f635f5c4dda47565546c47624608bf7361d` |
| Maestro fallback proof run | — | passed in **~41 seconds**; screenshot `e2e/proofs/ticket-18/bundled-unavailable-fallback.png` 1206×2622 RGBA SHA-256 `509b0ae7…` | TICKET-18 |
| API request timeout | none (socket could idle indefinitely) | `REQUEST_TIMEOUT_MS` AbortController on every fetch (~15s per PITFALLS) | TICKET-27, `mobile/lib/api.ts` |
| Test suite scale | — | 202 suites / 1,810 tests (post-#198); earlier 179 files / 2,864 tests mobile + 40 files / 418 tests server; a 2817/2817 run before the three-runtime OTA | issue #198, TICKET-18 |
| Native crash under automation | — | Recovi 1.0.6 (47), iPhone14,5, iOS 26.2.1 (23C71): launched **11:22:26.8198**, crashed **11:22:30.5947** (**~3.8s**), inside an Appium `GET /source` window (16:22:29.954–16:22:30.677 UTC). Stack `__abort_with_payload` → `weak_register_no_lock` → `objc_storeWeak` → `_accessibilityMarkElementForVisiblePointHitTest:`. Incident `1DEB11E2-3B03-4209-8255-450FC691C6D8` | expo-ota-reliability-20260905.md appendix |

Other perf work:
- **TICKET-26** added `landing_viewed` / `landing_cta_tapped`. `docs/ANALYTICS-CONVENTIONS.md:95`:
  "the landing is route-less, so `$screen` never covers it. **`Application Opened` without
  `landing_viewed` = startup hang.**"
- **TICKET-28** suppressed the pre-navigator `$screen "home"` artifact.
- Issue **#102** — "App-wide on-device transition jank: wrong intermediate frame / flash / lag between
  any two screens".
- Issue **#69** — "Release-only: Progress loses its scroll position (and content from the a11y tree)
  after an urge-log cover exit".
- `docs/qa/react-doctor-2026-07-15.md` + `docs/research/react-doctor-baseline-2026-07-12.md` —
  render-performance baselines.
- **Unresolved:** 1.0.6 build 47 first-launch failures were never root-caused.
  `startup-ota-code-audit-20260905.md`: "**Do not infer first-launch success from second-open behavior
  or unit pass count.**"
- Dev-loop: "Dev client times out on the FIRST bundle of a large app"; "Parallel booted simulators
  multiply every sim op 5-60x"; "UI-driver E2E tools are 60-100x slower than direct sim CLIs" — which
  is why Maestro is banned repo-wide in favour of headless `simctl` + `idb`
  (`docs/SIM-AUTOMATION.md`).
- Server: sub-1GB-RAM zero-swap VPS OOM-killed `tsc` mid-deploy (exit 137) while the old process kept
  serving stale routes.

---

## 9. Local config plugins — ExcerLock will need equivalents

All three live in `/Users/johansardar/reform/mobile/plugins/` and are listed in `app.json.plugins`.
**Order matters**: entitlements mod actions compose LIFO — the plugin listed FIRST runs LAST.

## 9.1 `withNoPush.js` — listed FIRST in `plugins` (so it wins)

```js
/**
 * withNoPush — strips the aps-environment (push) entitlement.
 *
 * Recovi sends LOCAL notifications only (lib/notifications.ts — daily/evening
 * reminders via scheduleNotificationAsync); nothing registers for remote push.
 * expo-notifications' config plugin still injects `aps-environment:
 * development` whenever the key is absent, which is a dev-vs-release mismatch
 * waiting to bite at store signing and an "unused push entitlement" question
 * in App Review (issue #42).
 *
 * Entitlements mod actions compose LIFO (the plugin listed FIRST in app.json
 * runs LAST), so this plugin MUST stay at the top of the plugins array to win
 * over expo-notifications. scripts/check-release-config.js enforces the final
 * artifact either way.
 */
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
```

**Why ExcerLock needs an equivalent:** any app using `expo-notifications` for local-only reminders gets
an unused `aps-environment` entitlement injected, which is a signing mismatch and an App Review question.

## 9.2 `withRegenBlocker.js` — Screen Time entitlement + legacy cleanup

```js
/**
 * Configure Recovi's Screen Time blocker.
 *
 * The local reform-blocker Expo module is registered by Expo autolinking via
 * modules/reform-blocker/expo-module.config.json. This plugin owns only the
 * main-app Family Controls entitlement and removes the legacy NetworkExtension
 * key when prebuilding over an older generated project.
 *
 * NOTE: it must NOT delete `application-groups`. Night Shield
 * (react-native-device-activity) adds an App Group so the main app and the
 * DeviceActivityMonitor extension can share the blocked selection; both plugins
 * write the same entitlements file, and stripping the group here would silently
 * break that share depending on plugin order.
 */
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.family-controls'] = true;
    delete cfg.modResults['com.apple.developer.networking.networkextension'];
    return cfg;
  });
```

The NetworkExtension key is a leftover from an abandoned architecture — commit `4ae7aee1`
"#95: remove NetworkExtension blocker architecture". Companion local Expo module:
`mobile/modules/reform-blocker/` (registered by autolinking via `expo-module.config.json`).

## 9.3 `withMainAppEntitlements.js` — listed LAST (so it runs after every pbxproj edit)

```js
/**
 * Keep the main application target pointed at its real entitlements file.
 *
 * Expo's entitlements setup can append an unquoted CODE_SIGN_ENTITLEMENTS
 * setting when a generated iOS project already contains the quoted setting.
 * node-xcode preserves both keys, and Xcode resolves the later one. In that
 * state a generated `undefined.entitlements` file can silently win at archive
 * time and strip Family Controls, the shared App Group, and Sign in with Apple
 * from the signed application.
 *
 * Register this plugin after every plugin that edits the Xcode project so the
 * main app has one canonical setting in both Debug and Release.
 */
const { IOSConfig, withXcodeProject } = require('@expo/config-plugins');

const ENTITLEMENTS_PATH = 'Recovi/Recovi.entitlements';

module.exports = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const [, applicationTarget] = IOSConfig.Target.findFirstNativeTarget(project);
    const buildConfigurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      applicationTarget.buildConfigurationList,
    );

    for (const [, buildConfiguration] of buildConfigurations) {
      const settings = buildConfiguration.buildSettings;
      delete settings['"CODE_SIGN_ENTITLEMENTS"'];
      delete settings.CODE_SIGN_ENTITLEMENTS;
      // node-xcode expects a quoted path value when the path is serialized
      // back into the pbxproj. This also keeps the generated output stable.
      settings.CODE_SIGN_ENTITLEMENTS = `"${ENTITLEMENTS_PATH}"`;
    }

    return cfg;
  });
```

This is the fix for incident #22 (`af991736`). **Any Expo app that adds an entitlement-bearing
capability through a plugin needs this or an equivalent audit** — the profile can be capable while the
signed executable is not.

## 9.4 The plugin array order in `mobile/app.json` (verbatim, abridged)

```
"plugins": [
  "./plugins/withNoPush.js",          <- FIRST so it runs LAST over expo-notifications
  "expo-router", "expo-web-browser", "expo-font", "expo-secure-store",
  "expo-local-authentication", "expo-apple-authentication", "expo-notifications", "expo-image",
  ["expo-image-picker", { ... }],
  "./plugins/withRegenBlocker.js",
  ["expo-splash-screen", { ... "ios": { "image": "./assets/regen/launch-surface-v1.png",
                                        "resizeMode": "cover", "backgroundColor": "#040404",
                                        "enableFullScreenImage_legacy": true } }],
  "expo-mail-composer",
  ["expo-build-properties", { "ios": { "deploymentTarget": "16.4" } }],
  ["react-native-device-activity", { "appleTeamId": "AX3C2B78YD",
                                     "appGroup": "group.com.regenapp.app.deviceactivity" }],
  "@react-native-community/datetimepicker", "expo-video",
  ["@sentry/react-native/expo", { "url": "https://sentry.io/", "organization": "edge-ix",
                                  "project": "reform-mobile" }],
  "./plugins/withMainAppEntitlements.js"   <- LAST in the array = runs FIRST in the mod chain,
                                           i.e. after every other plugin has already edited the pbxproj
]
```

Related scripts: `mobile/scripts/check-release-config.js` (release invariants, `Expo.plist` regex
checks), `mobile/scripts/check-device-build-env.js` (audits the baked env of a built `.app`),
`mobile/scripts/configure-local-app-store-signing.js`, `mobile/scripts/require-sentry-auth-token.js`
(`eas-build-pre-install` hook), `mobile/scripts/generate-launch-surface.sh`.

---

## 10. The five rules to carry into ExcerLock

1. **Publish OTAs to the runtime the *public* binary actually selected**, read from the device's
   `Library/Application Support/.expo-internal/expo-v11.db` — never to "latest", never inferred from a
   local Release build, a TestFlight build, or the EAS dashboard. Port
   `mobile/scripts/verify-public-app-store-ota.js` and wire it as a release gate.
2. **`ON_ERROR_RECOVERY` + `fallbackToCacheTimeout: 0` disables native update checks entirely on
   healthy launches.** First-frame freshness requires `ON_LOAD` + a finite wait **compiled into the
   binary**; and the fix that governs the first OTA handoff must already be *embedded*, because the OTA
   cannot repair its own activation.
3. **A hard paywall before sign-in poisons three subsystems at once** — RevenueCat webhooks arrive with
   an unbindable `$RCAnonymousID` and retry forever; purchase events orphan off the exposure person so
   every experiment reads zero; and an OTA gate keyed on `onboardingComplete` never fires for the
   unpaid users who most need the fix.
4. **Console-side configuration is invisible to code review and to every test you own.** Paid Apps
   Agreement, Clerk *Native applications* registration, StoreKit intro offers, per-extension Family
   Controls approval. Each caused a multi-day production outage or a rejection. After any auth/payment
   flow change, do one real sign-in/purchase on a production build and check the provider's own
   analytics for "zero successes since release".
5. **Only two artifacts ever settled an argument**: the signed executable
   (`codesign -d --entitlements :- Payload/App.app` plus every `.appex`) and a physical phone
   downloading from the public App Store. Simulators, locally signed Release builds, EAS dashboards,
   green Jest runs, and portal "Assigned" badges all produced confident false positives that shipped.

---

## Appendix — file index (paths relative to `/Users/johansardar/reform/`)

**OTA** — `mobile/app.json:181-192`; `mobile/app.config.js:12-38`; `mobile/fingerprint.config.js`;
`mobile/eas.json`; `mobile/scripts/verify-public-app-store-ota.js`;
`mobile/scripts/__tests__/verifyPublicAppStoreOta.test.ts`; `mobile/scripts/check-release-config.js:48,83,85-86,177-178`;
`mobile/lib/firstSessionUpdateGate.ts`; `mobile/lib/criticalUpdateCoordinator.ts`;
`mobile/lib/criticalUpdateCoordinatorReact.tsx`; `mobile/app/_layout.tsx`;
`mobile/components/v2/LaunchScreen.tsx`; `docs/CRITICAL-UPDATE-RUNBOOK.md`;
`docs/ACQUISITION-EXPERIMENT-RUNBOOK.md`; `docs/research/mandatory-ota-startup-expo-sdk56.md`;
`docs/research/expo-ota-reliability-20260905.md`; `docs/research/startup-ota-code-audit-20260905.md`;
`docs/research/ota-scenario-matrix-20260905.md`; `plans/sessions/a8130773/ota-convergence-plan.md`;
`to-tickets/TICKET-17|18|22|23|24`. Commits `5731e98e`, `1c48a961`, `35989eb3`, `149b2021`,
`de2662bd`, `936a7ece`, `a1c4d417`, `41f17e80`, `25beaa90`, `49ccc66c`, `95baf3fa`, `5b58b61f`,
`e3a0f033`, `42ec9d98`. Issues **#195**, **#198**.

**Payments** — `mobile/lib/purchases.ts`; `mobile/lib/paywallConfig.ts`; `mobile/lib/paywallGate.ts`;
`mobile/lib/protectionLifecycle.ts`; `mobile/components/onboarding/OnboardingFlow.tsx`;
`server/src/webhooks/revenuecat.ts`; `server/src/lib/revenuecatClient.ts`;
`server/src/services/subscriptionStatus.ts`; `server/src/lib/premiumAccess.ts`;
`server/src/routes/entitlement.ts`; `docs/PAYWALL-SETUP.md`; `docs/asc/payment-flow-verification.md`;
`docs/asc/subscription-edge-cases.md`; `docs/adr/0015-revenuecat-source-of-truth.md`;
`docs/PAYWALL-ONE-TIME-OFFER-SPEC.md`; `to-tickets/TICKET-01|03|04|13|14|16|21`.
Commits `54be5c11`, `5dd1db26`, `3d544442`, `b4c3d72c`, `71cd8298`, `7c0d16af`, `858f344d`,
`c255ac16`, `462621f1`, `55512add`, `22e2962e`. Issues **#150**, **#151**, **#152**, **#157**.

**Auth** — `mobile/app/(auth)/sign-in.tsx`; `mobile/lib/authBridge.tsx`; `mobile/lib/authGate.ts`;
`mobile/lib/clerkTokenCache.ts`; `mobile/lib/authStartupBound.ts`; `mobile/lib/api.ts`;
`mobile/lib/__tests__/signInSignupPassword.test.tsx`; `mobile/app/(auth)/__tests__/signInApple.test.tsx`;
`to-tickets/TICKET-15|16|27|29`. Commits `65ce1cae`, `abf0772e`, `c935d08f`, `f6919985`, `af991736`,
`19e96402`, `b6355999`, `db43fe65`. Issues **#146**, **#97**, **#82**, **#3**.

**Review** — `docs/asc/RESUBMISSION-2026-07-22.md`; `docs/asc/review-notes.md`;
`docs/asc/reviewer-access.md`; `docs/asc/technical-compliance.md`; `docs/asc/privacy-labels.md`;
`docs/asc/age-rating.md`; `docs/asc/store-listing.md`; `docs/asc/iap-and-urls.md`;
`plans/sessions/ttys003/findings.md`; `plans/sessions/ttys003/submission-fix-log.md`;
`plans/sessions/ttys023/last-action.md`; `docs/research/asc-metadata-research-2026-07-13.md`;
`docs/ASO-PIPELINE.md`; `docs/SHIP-TODAY-RUNBOOK.md`; `docs/RELEASE-CONFIG-CHECKLIST.md`;
`docs/CLINICAL-CLAIMS.md`. Commits `059727f5`, `23b49588`, `d81c2b1b`, `db23ecc9`, `4ae7aee1`.

**A/B + analytics** — `docs/AB-TESTING-ANALYTICS-PLAYBOOK.md`; `docs/ANALYTICS-CONVENTIONS.md`;
`docs/REMOTE-ACQUISITION-EXPERIMENTS-SPEC.md`; `docs/research/analytics-ab-handoff-2026-07-12.md`;
`docs/research/ab-paywall-capability-comparison-2026-08-31.md`; `mobile/lib/experiments.ts`;
`mobile/lib/acquisitionFlowRegistry.ts`; `mobile/lib/acquisitionFlowAssignment.ts`;
`mobile/lib/acquisitionAnswerEnvelope.ts`; `server/src/routes/onboarding.ts`;
`to-tickets/TICKET-01…14|19|20|23|25|26|27|28|29`; `docs/adr/0013`.

**Config plugins / native** — `mobile/plugins/withNoPush.js`; `mobile/plugins/withRegenBlocker.js`;
`mobile/plugins/withMainAppEntitlements.js`; `mobile/modules/reform-blocker/`;
`mobile/scripts/check-release-config.js`; `mobile/scripts/check-device-build-env.js`;
`mobile/scripts/configure-local-app-store-signing.js`; `mobile/scripts/require-sentry-auth-token.js`;
`docs/blocker-enablement-redesign-spec.md`; `docs/adr/0005-night-shield-scheduled-app-blocking.md`.

**Cross-app ledger** — `/Users/johansardar/ios-app-pitfalls/PITFALLS.md` (673 lines, ~70 entries).
Sections: Analytics & identity · Startup & networking · Dev workflow (Metro, simulators, dev clients) ·
Native layout & accessibility automation · Sensors & signal processing · Background execution ·
Offline data & sync · Auth & sign-in · Date & time math · A/B testing & attribution ·
**Purchases (RevenueCat / StoreKit)** · **OTA updates (EAS Update)** · Builds & release.
