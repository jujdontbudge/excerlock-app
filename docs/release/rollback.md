# Rollback plan for the cutover

Each step of `cutover-checklist.md` is one commit, so rollback is a revert to the step before. Nothing in
the cutover touches the database schema or user data (decision A4: no live users; sync tables are P2-T02's
and stay).

## 1. Before the rename merge (checklist steps 0–1)

Nothing to undo. The tag and archive branch are additive; leave them.

## 2. After the rename merge, before a TestFlight build (steps 2–5)

Revert the merge commit of `cutover/rename` on `main` (record its hash here when it lands: `________`):

```sh
git checkout main && git pull --ff-only
git revert -m 1 <merge-commit>
npm ci && npm test
git push origin main
```

This brings back `app/` (old), `app-next/`, `e2e/`, the retired packages and the old scripts in one
commit, and the release guardrails switch back to `app-next/` mode by themselves. Re-run
`/setup-agent-tooling` afterwards if `TOOLING.md` was regenerated in step 5.

If only one path is wrong (a guardrail deleted too eagerly, a script still naming `app-next`), fix
forward instead: the whole point of committing per step is that the fix is a small commit, not a revert.

## 3. After a TestFlight build (step 6)

The build is the only thing that left the machine. Two cases:

- **The build is broken but the code is fine to keep.** Expire the build so testers stop installing it,
  fix forward, build the next number:

  ```sh
  asc builds expire --app 6787265352 --latest --confirm     # asc-testflight-orchestration skill
  cd app && eas build --platform ios --profile preview && eas submit --platform ios --profile preview --latest
  ```

  Build numbers never go backwards; the next build is simply n+1 (remote versioning).

- **The code must go back.** Do §2 first, then the store side. The old app has never been on
  TestFlight (zero builds in App Store Connect on 2026-09-07), so there is no earlier build to re-enable.
  If a testable old build is wanted, build it from the archive worktree — it needs the Clerk keys, which
  is why the checklist rotates them **after** the TestFlight build is verified:

  ```sh
  git worktree add /tmp/old old-app-final
  cd /tmp/old/app && eas build --platform ios --profile preview   # ad hoc in the old eas.json; store profile needs editing
  ```

## 4. After secret rotation (step 7)

Clerk keys are deleted, not rotated, so the archive cannot sign in any more. Restoring that means
re-creating a Clerk development instance and re-issuing keys into `~/.excerlock/env` and
`/etc/excerlock/env`. Treat this as the point of no return for the old app; everything else still rolls
back per §2.

The server is deployed independently (`deploy/README.md` §5): rolling back the API is a redeploy of a
known-good revision from a worktree, and the Clerk line in `/etc/excerlock/env` is only needed if that
revision still verifies Clerk JWTs.

## 5. What is never rolled back

- The `old-app-final` tag and `archive/old-app` branch.
- EAS remote build numbers (monotonic by design).
- The App Store Connect record, its version `1.0`, and the App Privacy label once filed (edit, do not
  delete).
