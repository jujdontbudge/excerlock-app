# Main consolidation — 2026-09-11

## Source of truth

`main` is the integrated product branch, and `app-next/` is the shipping iOS
application. `server/` and `site/` remain in the same repository. The primary
checkout is `/Users/johansardar/ExcerLock`.

The consolidation carries the shipping lineage through `dbfdd9b1`, followed by
`1eb53992` (two deterministic test-fixture repairs), and the outstanding
documentation/tooling changes. The original primary checkout was committed as
`8a7039d8` before integration, preserving the previously uncommitted work.

The shipping implementation contains the completed product work. Primary-checkout
code differences were checked by Git blob identity against shipping history:
93 outstanding file versions were already identical, and all 55 differing
app/server/plan file versions were earlier versions on the shipping lineage.
Retain the later shipping versions rather than reverting fixes from the old checkout.

## Historical work preservation

All 127 local branch refs were backed up and the bundle verified before integration:
`/Users/johansardar/ExcerLock-main-backup-20260911/all-refs.bundle`.
The primary checkout's staged/unstaged patches and untracked files were also backed up.
No branch or worktree was deleted.

A scan of all 85 worktrees found no unique uncommitted shipping application/backend
code outside the shipping checkout. The only other source differences were three
legacy device-smoke diagnostic files in `ExcerLock-lanes/f4`; their recorder
explicitly says "Never ships" and "the lane never merges it." Those remain in
that worktree. Installed skill symlinks, downloaded documentation, local Supabase
state, and scratch task files remain local. Checked-in skill content and the
subscription catalog are included in the consolidated source.

Historical task branches include cherry-picked, combined, and superseded work:
93 of 321 non-merge commits outside the shipping/primary lineages have identical
patch IDs in shipping history. The remaining historical refs are preserved;
Git ancestry alone must not be used to replace the accepted shipping implementation
with an old task snapshot.

## Apple artifact

App: `6787265352`, bundle `com.johansardar.excerlock`.

- Valid uploaded build: `a79bece3-e065-4270-944f-7854c958e484`.
- Marketing version/build: `1.0.0 (1)`.
- Processing: `VALID`; audience: `APP_STORE_ELIGIBLE`.
- Not attached to an App Store version; no TestFlight groups assigned.
- Beta state reports `MISSING_EXPORT_COMPLIANCE`.
- App Store version `1.0` is `PREPARE_FOR_SUBMISSION`; there is no public version.

Local uploaded IPA: `/tmp/excerlock-submission-ready-20260910/ExcerLock.ipa`.
SHA-256: `305aae4d76d16b12a66f23e0a93b95e4071478fa952424ccbb1c31efd6a81c47`.
The upload record names the same ASC build ID. Signed-manifest verification passed
for the main bundle and all four extensions.

**Artifact/config difference:** direct inspection of this IPA's `Expo.plist`
shows runtime `1` and no `EXUpdatesRequestHeaders` production-channel setting.
Current `app-next/app.config.ts` specifies runtime `2` and explicit channel headers.
Therefore this old uploaded binary must not be treated as proof that current
source configuration reached a device. The next release binary must be regenerated
and built from `main`, then its embedded Expo configuration inspected. A Git merge
does not alter the already-uploaded IPA.

## Expo OTA state

Project: `@johansardar/excerlock`, ID `9a358379-d939-4c56-bcea-de3ac5699be2`.

- Only channel/branch: `preview`.
- Published update groups: **zero** across all branches.
- Production branch/channel: absent.
- EAS cloud build/workflow records: none.

There is no live production OTA version or update commit to report. Future
production OTA releases come from a verified commit on `main`, use explicit
production configuration, and target the native runtime embedded in the intended
distributed binary. Server metadata is not proof of successful launch on a phone.

## Verification and release boundary

The existing checks were run against the shipping source. Two failing fixtures
were repaired without changing application behavior: the legacy provisioning
test now controls when a successful response arrives; the retention test freezes
the wall clock to match its fixed calendar expectation.

- Workspace type checks passed.
- Legacy app: 204 suites / 1,035 tests passed.
- Shipping app: 250 suites / 1,213 tests passed; 13 snapshots passed.
- Package and server suites passed.
- Architecture guardrails, Expo config loader, installed-patch/script checks,
  signed-manifest fixtures, and OTA verifier fixtures passed.
- Shipping lint passed with 58 existing warnings and zero errors.
- Secret scanning findings were public client identifiers and asset-label false
  positives; no private signing or service credential was added.

The only GitHub workflow runs CI and service readiness probes on a `main` push.
It contains no deployment, OTA publication, App Store upload/submission, or
tester invitation. The readiness job's required secret/variable names exist in
the GitHub production environment.

The first main CI run (`34636120057`) exposed a package-manager mismatch:
npm 10 rejected the workspace override graph as missing old React Native packages,
while npm 11.19.0 installed the same lockfile successfully. The failure was
reproduced locally with npm 10.9.3. CI and `packageManager` now pin npm 11.19.0;
the dependency versions and lockfile remain unchanged.

The next CI run (`34636399025`) passed installation, type checks, the legacy,
package and server tests, and service readiness. Its shipping suite exposed one
test-only Expo mock failure (249 suites passed): a startup test replaced all
`expo-modules-core` exports, removing `requireNativeModule` needed by Expo's lazy
fetch global during Node 22 teardown. The fixture now preserves the preset's
other exports and restores its factory after each test. The exact failure was
reproduced locally on Node 22; both existing startup tests passed after the fix.
No application runtime behavior changed.

App Review submission, public release, and production OTA publication remain
outside the authorized scope. Merging and pushing `main` does not complete the
deferred metadata, export-compliance, or device-verification work.
