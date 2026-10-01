# Semantic haptics integration

Re-applied `a4bca893` from `JohanSardar/haptics-overhaul` on `bb/land-semantic-haptics-thr_v6fip8gwph`, based on `revert/progress-graphic`. No push, main merge, native rebuild, deployment or release was performed.

## Result

Every app haptic uses `ui/haptics.ts` intents. The dispatcher merges synchronous cues to the strongest intent, rate limits them, suppresses background cues, cancels scheduled cues on background or opt-out, and reduces the unlock signature to one success with Reduce Motion. Settings applies the persisted preference on hydration, patch and reset and offers “Feel an unlock”. Native switches add no app haptic. The dev menu exposes a bounded intent/time log, positioned before the long diagnostic controls so its evidence is visible.

Home's real-runtime unlock follows an acknowledged, revision-current native shield lift for a Met target or Gym presence. Boot, foreground refresh, unfocused Home and the settling window stay silent. The new counter and helper use Condition vocabulary (`shieldLifts.confirmed`, `isConditionShieldLift`); the existing enforcement `openReason` value is unchanged. Demo mode follows the Lock decision. Its optional `stepsAfter` delays fake step Progress until Home settles; a deep link may remount Home and its immediate update correctly stays silent.

The older device check used the removed `expo-constants.isDevice` property. It now uses the existing `expo-device.isDevice` API, preventing accidental suppression on physical devices. Background requests are rejected before they can be queued. Paywall plan cues stay silent when a selection cannot change during an operation.

The haptics ADR is [0056](../adr/0056-semantic-haptics-language.md), still **proposed**. The existing explicit-sign-in ADR 0049 remains intact; the index points to 0056 and no old haptics-number reference remains.

## Conflicts resolved

The cherry-pick produced 18 conflicted files. Current behavior wins in each:

| Files | Resolution |
|---|---|
| `dev-harness/lib/DevMenu.tsx` | Kept Journey, protected-route, notification and OTA diagnostics; added the haptics subscription and log. |
| `editor/ConditionsScreen.tsx`, `editor/lib/useBuilder.ts` | Kept `notify()` and current Setup handling; added successful save/delete/pause/resume intents and failure intents without restoring inline error state. |
| `gyms/usePicker.ts` | Kept notices and current picker outcomes; added commit/error intents. |
| `identity/SignInScreen.tsx` | Kept explicit launch approval, cancellation silence, email-code clearing and recovery notices; success plays only after approved authentication. |
| `insights/lib/ActivityTrend.tsx` | Kept current token-based chart geometry; added throttled detents and selection intents. |
| `onboarding/OnboardingRoute.tsx` | Kept staged-plan admission and notices; added commit/error cues to the actual stage operation. |
| `paywall/lib/PaywallScreen.tsx` | Kept eligibility checks, account connection, restore fallback, pending/cancel behavior and fixed layout; added confirmed success/error and selection cues. |
| `settings/AccountScreen.tsx`, `settings/SubscriptionScreen.tsx` | Kept Welcome reset and notices; added confirmed commit/restore/error cues. |
| `setup/SetupFlow.tsx` | Kept current sign-in, permission and Setup flow; added resolved permission cues and notice-backed error cues. |
| `support/ReportProblemScreen.tsx`, `support/lib/SupportFormScreen.tsx` | Kept current notices and sent/mail handoff states; added outcome cues without restoring raw error text. |
| `ui/PrimaryButton.tsx`, `ui/SecondaryButton.tsx` | Kept stable loading labels/colours and tap guards; replaced raw feedback with the semantic intent prop. |
| `unlock/TreadmillUnlockScreen.tsx`, `unlock/lib/useGymUnlock.ts` | Kept runtime error reporting and notices; added resolved failure/permission cues and semantic unlock behavior. |
| `docs/adr/README.md` | Kept ADRs 0053–0055 and added proposed 0056. |

ADR 0054's one-piece scrolling and the current StoreKit code were preserved. No native target or module changed.

## Verification

Read and followed the repository verify-excerlock skill. Every focused proof used a five-minute outer timeout. Only the haptics proofs were run; no feature suite or sweep was run. Settings and Home proofs now explicitly sign in from Welcome before accessing protected routes.

| Command | Result | Evidence directory |
|---|---|---|
| `./excer prove onboarding --proof choice-select-haptic` | Passed, `Haptic select` | `.excer/proof/onboarding/2026-10-01_04-09-21/` |
| `./excer prove onboarding --proof plan-commit-haptic` | Passed, `Haptic commit` | `.excer/proof/onboarding/2026-10-01_04-10-08/` |
| `./excer prove onboarding --proof demo-unlock-haptic` | Passed, `Haptic lock` and `Haptic unlock` | `.excer/proof/onboarding/2026-10-01_04-10-47/` |
| `./excer prove settings --proof haptics-preference` | Passed, switch and preview shown | `.excer/proof/settings/2026-10-01_04-13-39/` |
| `./excer prove settings --proof haptics-preview` | Passed, `Haptic unlock` | `.excer/proof/settings/2026-10-01_04-14-18/` |
| `./excer prove home --proof goal-transition-haptic` | Passed, Locked → Unlocked at 5,000 steps | `.excer/proof/home/2026-10-01_04-16-03/` |

Each proof directory contains `result.json`, a screenshot and labels. Additional Home dev-log evidence is `.excer/haptics-integration/home-haptics-log.png`, `home-haptics-log.labels.txt` and `home-haptics-log.result.json`; the log contains exactly one unlock intent. These artifacts are local ignored evidence, not committed screenshots.

Final `./excer check`: **20 checks passed**. Output: `.excer/haptics-integration/check.txt`. `git diff --check` also passed.

## Failed attempts, issues and limits

The first simulator connection could not attach while the initial deep-link prompt was open. A temporary TCP companion registered with idb unblocked the assigned hidden worker simulator; Open, Continue and Close were then dismissed. The companion-discovery defect is [#149](https://github.com/JohanSardar/excerlock-app/issues/149).

The first Settings proof attempts failed because their old direct-entry assumption conflicted with current Journey admission. They were updated to the actual sign-in path and passed. Failed evidence remains under `.excer/proof/settings/2026-10-01_04-11-26/` and `.excer/proof/settings/2026-10-01_04-11-54/`. The initial Home state proof passed but its immediate remount was silent; the final delayed sensor proof and separate log capture establish the demo cue.

A relative screenshot output path failed in simctl; an absolute path succeeded. Filed [#151](https://github.com/JohanSardar/excerlock-app/issues/151). The unchanged lockfile's npm audit findings for axios, brace-expansion, fastify and ip-address are filed as [#150](https://github.com/JohanSardar/excerlock-app/issues/150).

No focused simulator proof remains blocked. Physical iPhone verification remains **blocked by unavailable device evidence**: perceived strength, system suppression and a real native-acknowledged shield lift were not established. Simulator log evidence establishes dispatched intents only. Reduce Motion, per-tick merging, cancellation and limits were reviewed in code and statically checked; they were not all exercised by these six focused proofs.
