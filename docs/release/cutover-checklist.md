# Cutover checklist — `app-next` becomes `app`, old app archived, first TestFlight

Owner of the task: `plans/rebuild/phase-2-backend/P2-T12-cutover.md`. This is the executable version:
ordered steps, exact commands, and the test that proves each step. Run it top to bottom on one machine,
from the repository root, after **P2-T11 passed on Johan's phone and Johan said go**.

Conventions: `<root>` is the repository root; every command runs there unless it says `cd`. Never
`git reset --hard`, `git clean`, `git stash` or `git add -A`; add by path. Commit after every step so a
failure is one revert away (`docs/release/rollback.md`).

The release guardrails (`npm run test:release-guardrails`, `guardrails/release/`) follow the rename by
themselves: they read whichever of `app-next/` or `app/` exists. Run them after every step. The
post-cutover assertions in `guardrails/release/workspace.test.ts` activate on their own once `app-next/`
is gone.

---

## 0. Preconditions (nothing below runs until all are true)

- [ ] `P2-T11` evidence complete in `app-next/evidence/P2-T11/`, every row pass, failures ticketed.
- [ ] Johan has said go for the cutover in this session.
- [ ] `rebuild/phase-2` is merged into `main` and green:

```sh
git checkout main && git pull --ff-only
git merge --no-ff rebuild/phase-2        # skip if already merged
npm ci
npm test                                  # typecheck + unit (app-next first, with coverage) + guardrails
npm run test:release-guardrails
```

- [ ] Working tree clean: `git status --short` prints nothing.

## 1. Tag the old app and make it recoverable

The tag marks the last commit that still contains `app/`, `excer-ui-mock/`, `prototype/` and the retired
packages. Everything in step 2 is recoverable from it.

```sh
git tag -a old-app-final -m "Last commit with the old Expo app in app/ (P2-T12 cutover)"
git branch archive/old-app old-app-final
git push origin old-app-final archive/old-app
```

Verify the archive restores and builds **before** deleting anything (acceptance criterion 3). Use the
simulator, then shut it down (machine rule):

```sh
git worktree add /tmp/old old-app-final
(cd /tmp/old && npm ci && npm run typecheck --workspace app && npm run test:app)
(cd /tmp/old/app && npx expo run:ios)      # dev-client build on the simulator; boot to Home
xcrun simctl shutdown all
git worktree remove --force /tmp/old
```

Record the tag in `ARCHITECTURE.md` (the post-cutover guardrail checks the string `old-app-final`):

```md
> **Archive.** The pre-rebuild app lives at tag `old-app-final` / branch `archive/old-app`
> (`git worktree add /tmp/old old-app-final`). Nothing under it is maintained.
```

Commit: `Tag old-app-final and record the archive`.

## 2. Remove the retired trees and rename

Do this on a branch from `main`; merge it as one PR so the rename is one revertable merge commit.

```sh
git checkout -b cutover/rename main
git rm -r app excer-ui-mock packages/ledger packages/condition-model
git rm -r e2e .maestro scripts/e2e-loop.sh
git mv app-next app
git commit -m "Retire the old app and promote app-next to app"
```

Why all of `e2e/` goes: its three node contract tests check Maestro flow files, the `.maestro/` README
and the old app's `DEVICE-SMOKE.md`. None applies to the new app; the device checklist that replaced
them is P2-T11 and its evidence folder.

Then fix every path that named the old layout. The complete list at the time of writing (re-derive it
with `grep -rn "app-next" --exclude-dir=node_modules --exclude-dir=.git -l .`):

| File | Change |
| --- | --- |
| `package.json` (root) | `workspaces`: drop `"app-next"`, keep `"app"`. Scripts: `test:app` → `npm run test --workspace app`; delete `test:app-next` and `test:e2e-contract`; `test:unit` becomes `npm run test:app && npm run test:packages && npm run test:server`. Delete `postinstall` (the new app has no `patches/`; `app/patches` no longer exists). |
| `app/package.json` | `"name": "app-next"` → `"@excerlock/app"` (the old workspace name, so nothing else in the lockfile changes shape). |
| `app/metro.config.js` | `blockList` regex `app-next` → `app`. |
| `app/src/features/onboarding/**/FOUNDRY.md`, `impact/README.md` | Evidence paths `app-next/evidence/…` → `app/evidence/…`. |
| `.gitignore` | `app-next/evidence/` → `app/evidence/`; the `app/ios/`, `app/android/`, `app/.expo/` lines already cover the generated native project. |
| `.github/workflows/ci.yml` | No change needed (scripts only). |
| `scripts/check-env.ts` | Already reads `app/package.json`; update `DELIBERATE_DEPENDENCY_EXCLUSIONS` (the `expo-local-authentication` line still says "Clerk-owned") and run `npx tsx scripts/check-env.ts --allow-missing`; its tests: `npx vitest run --config vitest.packages.config.ts scripts`. |
| `vitest.packages.config.ts` | No change; `packages/analytics-events` and `scripts/` remain. |
| `guardrails/*.test.ts` (old app guardrails) | See below. |

Lockfile: `npm install --package-lock-only` regenerates `package-lock.json` for the changed workspace
set without touching `node_modules`; commit it with the rename.

**Old guardrails.** Every file in `guardrails/` (not `guardrails/release/`) was written against the old
app's layout (`app/targets/`, `app/plugins/withScreenTimeExtensionValidation.js`, `app/src/lock/…`).
P2-T03, P2-T05 and P2-T07 re-point the ones that survive (native targets, plugin order, shield content,
single emitter, client observability, min-ios, motion module, RNDA imports). After the rename, run the
full suite and delete each guardrail that still asserts a retired path:

```sh
npm run test:guardrails            # runs `prebuild:guardrails --workspace app` first (clean prebuild)
```

Anything that fails because the path it walks was deleted with the old app is removed with a one-line
note in `guardrails/README.md`; anything that fails because the new app violates it is a bug in the port,
not in the guardrail. The E2E gate (`e2e-gate.test.ts`) goes: the new app has no `EXPO_PUBLIC_E2E`
surface (release guardrail `dev-surface.test.ts` holds that line instead).

Prove the step:

```sh
npm ci
npm test
npm run test:release-guardrails    # post-cutover block now active: no app-next, no e2e/flows, no .maestro
```

Commit: `Point the workspace, CI and guardrails at the promoted app`.

## 3. Asset pipeline scripts

`design/STYLE.md` is law and references `prototype/scripts/` (`compose_square.py`, `validate_square.py`,
`remove_chroma_key.py`, `validate_icons.py`) and `prototype/assets/icons/` (style anchors, `FOUNDRY.md`).
Keep the directories exactly as they are; **do not** delete `prototype/`. If Johan wants it moved:

```sh
git mv prototype/scripts design/scripts
git mv prototype/assets/icons design/assets/icons
sed -i '' 's#prototype/scripts/#design/scripts/#g; s#prototype/assets/icons/#design/assets/icons/#g' design/STYLE.md
```

and nothing else in `STYLE.md` changes. Commit: `Move the asset pipeline under design/`.

## 4. Vendor docs

Done in P2-T12 preparation: `docs/vendor-signup-checklist.md` and `docs/research/vendors/*.md` carry a
"Historical" banner. Nothing to run.

## 5. Agent-facing docs

- [ ] `TOOLING.md`: regenerate, never hand-edit. In Claude Code, run `/setup-agent-tooling` in the repo
      root. Expected diff: Supabase routing added; Clerk and Maestro routing removed; `eas submit` stays
      the single submission owner.
- [ ] `AGENTS.md`: add under "Building": "**Maestro is banned.** Simulator verification uses
      `app/scripts/simulator.sh` and the Python capture scripts; device verification follows P2-T11."
      (AGENTS.md never named Maestro; `TOOLING.md` did, and the regeneration removes it.) Folder names:
      the "Spec" section points at `plans/rebuild/` first; `app-next` is not mentioned anywhere.
- [ ] `ARCHITECTURE.md`: replace §1 (monorepo layout) and §2 (deep modules) with the layout and ports from
      `plans/rebuild/04-architecture.md`; keep the archive note from step 1 at the top.
- [ ] `excerlock-app-prd.md`: banner already added (points at `plans/rebuild/00-decisions.md`).
- [ ] Doctor green: `python3 ~/.claude/agent-tooling/doctor.py --repo .`

Commit: `Regenerate TOOLING.md and update the agent docs for the promoted app`.

Open the PR from `cutover/rename` to `main`; CI must be green (`test:release-guardrails` runs before the
type checks). Merge with a merge commit; note its hash in `docs/release/rollback.md` §2.

## 6. First store build and TestFlight (Johan runs the account-bound parts)

`app/eas.json` already carries the profiles: `development` (dev client, internal), `preview` and
`production` (store distribution, remote build number, `EXPO_PUBLIC_DEV_MENU=0`), and `submit` profiles
bound to the existing App Store Connect record `6787265352`. The build number lives on EAS
(`docs/release/identity-and-versions.md`).

```sh
cd app
eas whoami                                   # johansardar
eas build:version:set --platform ios         # first time only: answer 1 (App Store Connect has no builds)
eas build --platform ios --profile preview   # store-signed, non-interactive after credentials exist
eas submit --platform ios --profile preview --latest
cd ..
```

Then, with the `asc-testflight-orchestration` skill (the `asc` CLI owns TestFlight; `eas submit` owns the
upload and nothing else):

```sh
asc builds wait --app 6787265352 --latest                       # processing done
asc builds update --app 6787265352 --latest --uses-non-exempt-encryption=false
asc testflight groups list --app 6787265352                     # pick the internal group id
asc builds add-groups --app 6787265352 --latest --group <GROUP_ID>
```

What to Test comes from `app/evidence/P2-T11/` (what changed since the old TestFlight build: everything;
say so) via the `asc-whats-new-writer` skill. Johan installs from TestFlight, not from the dev client
(acceptance criterion 2).

- [ ] TestFlight build installed on Johan's phone from the store path.
- [ ] Onboarding → sandbox trial → setup → a real shield on a real app, from that build.

## 7. Rotate Clerk-only secrets (after step 6 is verified)

Ordered after TestFlight on purpose: the archived old app can only sign in with Clerk, so keeping the keys
until the new build is proven keeps the rollback window real. Then:

```sh
# local dotfile — delete the two Clerk lines
sed -i '' '/^EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=/d; /^CLERK_SECRET_KEY=/d' ~/.excerlock/env

# VPS
ssh -t johan@52.157.13.109 'sudo sed -i "/^CLERK_SECRET_KEY=/d" /etc/excerlock/env && sudo systemctl restart excerlock-api.service && curl -fsS http://127.0.0.1:3000/v1/health'

# EAS: confirm no Clerk variable is left in any environment (2026-09-07: production holds only PostHog and Sentry)
(cd app && for env in development preview production; do eas env:list --environment $env; done)
```

Then revoke the keys in the Clerk dashboard (delete the instance). `deploy/README.md` §1 still lists
`CLERK_SECRET_KEY=` in the example env block; remove the line in the same commit. Server code: at the
time of writing `server/src/auth.ts` and `server/src/env.ts` still carry Clerk JWKS fallback code; if
P2-T02's follow-up has not removed it, file an issue rather than deleting it here.

- [ ] `npx tsx scripts/check-env.ts --allow-missing` shows no Clerk row.

## 8. Close

- [ ] `npm test` green on `main` with `app/` = the new app (acceptance criterion 1).
- [ ] `python3 ~/.claude/agent-tooling/doctor.py --repo .` green.
- [ ] `plans/rebuild/phase-2-backend/P2-T12-cutover.md` acceptance boxes ticked, with the TestFlight
      build number and the merge commit hash.
- [ ] `xcrun simctl shutdown all`.
