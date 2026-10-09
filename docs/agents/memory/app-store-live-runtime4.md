---
name: app-store-live-runtime4
description: "ExcerLock 1.0 (build 17, runtime 4) went live on the App Store 2026-10-01; how to check an OTA is safe for it"
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-01T20:37:00.306Z
---

ExcerLock 1.0 (build 17, from main `1508e366`, runtime 4, channel production) was released on the App Store on 2026-10-01 at Johan's request. Every OTA to production now reaches real users. It launched US-only by mistake. The same day, Johan had it opened to all 175 territories; the live subscriptions were already in all 175. "Available in new territories" can't be changed through the API, so it was ticked in the App Store Connect website through `~/.local/bin/chrome-devtools-axi` (signed-in Chrome profile copy; run `profile-setup --refresh` first).

**Why:** Build 17's native modules are fixed. A JS import of a native module not compiled into build 17 crashes the live app.

**How to apply:** Before any production OTA, check each new native module against build 17 and diff `app-next/modules` against `1508e366`. `archive-17.log` was gone from /tmp by 2026-10-07. The surviving evidence is the pod list in `/tmp/excerlock-appstore-17-integrate/app-next/ios/Pods/Target Support Files/`. Transitive native deps such as RNCMaskedView (via expo-router) are autolinked even when `app-next/package.json` doesn't list them. JS calls to new native functions must be guarded. Release with the script pattern in `/tmp/excerlock-ota-20261007.sh`, all under `scripts/agent-ops.py run`: commit, check, push to main, tag `ota-runtime4-<date>-<sha>`, wait for CI, then export from a clean detached worktree and run `eas update --skip-bundler`. With `--skip-bundler`, `eas update --json` prints a warning line on stdout before the JSON, so strip lines before the first `[` when parsing. Paywall pricing that hides the billed amount is an App Review 3.1.2 risk (see [[simulator-purchase-needs-sandbox-tester]]).

As of 2026-10-01: App Store Server Notifications (production and sandbox, V2) go to Adapty's URL from Adapty → App settings → iOS SDK. Apple's test notification returned SUCCESS; #154 is closed. The no-trial twins `premium.a.annual.notrial` and `premium.a.monthly.notrial` are in the Variant A group, with prices copied from the live plans, and were submitted for review on 2026-10-01 (#155). The `onboarding` and `in_app` placements serve the Adapty paywall "Premium A + no-trial plans" (`cf28c3cc…`). Adapty locks a live paywall's products, so changing them means Duplicate and repoint. The SDK skips unapproved products, so the trial switch appears by itself once Apple approves. Adapty charts lag new trials by 15–30 minutes. Johan's first App Store install was an update over preview build 16, so his saved session and setup carried over.

On 2026-10-01 (Oct 2 UTC), at Johan's order, all 49 remaining products went to review in submission `30483355`: the 45 grid SKUs plus `a.winback.annual`, `b.annual`, `b.monthly` and `b.winback.annual`. Each got a review screenshot, a review note and worldwide availability first; until then they were `MISSING_METADATA` only for the missing screenshot. Grid `.t3`/`.t7` free trials, which were US-only, are being extended to all 175 territories by `/tmp/grid_trials.py`. Johan wants price and trial changes in seconds with no OTA. After approval that means Duplicate the Adapty paywall with the new products and repoint the placements; `docs/subscriptions.md` has the commands. Grid products are in a different subscription group from Variant A, so offering them to current Variant A subscribers risks double billing.
