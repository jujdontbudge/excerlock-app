---
name: first-launch-ota-catch-up
description: "Johan's agreed design (2026-10-02) for getting fresh installs onto the latest OTA during onboarding; built on a local branch, ships in build 18"
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-02T22:57:33.840Z
---

Agreed with Johan on 2026-10-02. It needs a new App Store build, because fresh installs that miss the 3 s `fallbackToCacheTimeout` window run the embedded bundle. Today, `app-next/src/packages/updates/updates.ts` only reloads on tab roots, so those users do all of onboarding and the paywall on old code.

Rules Johan chose:
- On a fresh install's first launch only, hold the splash for up to about 8 s total while the update downloads. Returning users get no extra wait.
- Each update carries an onboarding flow version. It changes only when the page order, branching or answer meanings change; copy and visual edits don't count. `./excer check` should fail when the flow rules change without a version bump. The running code reads the downloaded update's version from `downloadedUpdate.manifest.extra.expoClient.extra`; the live manifest already carries `extra`.
- Same flow version: reload once at the next onboarding page change, behind a cover, and open the next page in the new code.
- Different flow version: finish the old onboarding, then reload right before the paywall, so the paywall is always new.
- Never reload on or after the paywall, during sign-in or a purchase, or partway through a page. At most once per install, and the existing crash-loop guard still applies.
- The new code resumes at the first page it hasn't seen or answered, instead of falling back to O01. Never change what an existing saved answer means; add a new answer key instead.
- Record whether each user's first paywall ran the embedded code.

**Why:** Johan wants new users on the newest onboarding first and the newest paywall second, with no visible delay. Research found nobody reloads mid-onboarding; Expo's "hold-and-reload" and Capgo's `atInstall` are the closest patterns.

**How to apply:** build this for build 18 only after Johan's go-ahead. Record it as an ADR next to the OTA coordinator docs (`docs/ota.md`). A separate quick win also waits on his go-ahead: `eas update:embedded:upload` of build 17's bundle and manifest (`/tmp/excerlock-appstore-v3-evidence/ipa-17-extracted`) to the production channel. It cut the first-launch download from 2.8 MB to about 2.0 MB as of 2026-10-02. See [[app-store-live-runtime4]].

Built 2026-10-02 by Codex worker thr_59sdi7bqh6 on local branch JohanSardar/ota-first-launch (worktree /Users/johansardar/orca/workspaces/ExcerLock/ota-first-launch; final code bfab1d3d, report 39b9d6b5 at docs/ota-first-launch-report.md; ADR 0060). Not pushed or merged. 44/44 lab cases pass. First open takes up to about 8.5 s; a mid-onboarding reload shows a splash cover for 1.2–1.9 s. It needs a patch to expo-updates' native iOS code (`app-next/patches/expo-updates+57.0.23.patch`), so it ships in build 18 only. Open: #161, a blank white card before the Paywall in the lab's Release builds; it's unknown whether main does the same. The worker's simulator has been deleted; `./excer ota-lab` reruns the lab on a new worker simulator.
