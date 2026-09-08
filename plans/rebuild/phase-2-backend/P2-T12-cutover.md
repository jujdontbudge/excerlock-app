# P2-T12 — Cutover: archive the old app, promote the new one, TestFlight

Only after P2-T11 passes and Johan says so.

1. Tag `old-app-final` on `main` and create branch `archive/old-app` so the old `app/`, `excer-ui-mock/`,
   `prototype/` and the retired packages remain recoverable. Note the tag in `ARCHITECTURE.md`.
2. Remove `app/`, `excer-ui-mock/`, `packages/ledger`, `packages/condition-model` from the working tree;
   `git mv app-next app`; update root workspaces, CI (`.github/workflows/ci.yml`), guardrails paths,
   `e2e/` (keep only the node contract tests that still apply; Maestro flows deleted), `scripts/check-env.ts`.
3. Keep `prototype/scripts/` (asset pipeline) or move it to `design/scripts/` and update `design/STYLE.md`
   references (STYLE.md is law; edit it only for the path).
4. Server: vendor code already gone (P2-T02); delete `docs/research/vendors/` and `docs/vendor-signup-checklist.md`
   or mark them historical.
5. Regenerate `TOOLING.md` with `/setup-agent-tooling` (adds Supabase, removes Clerk and Maestro), update
   `AGENTS.md` (Maestro banned; new folder names), `ARCHITECTURE.md` (new architecture, ports, engine), and
   `excerlock-app-prd.md` gets a top banner pointing at `plans/rebuild/00-decisions.md` for everything it now
   contradicts.
6. Rotate secrets that were Clerk-only out of `~/.excerlock/env`, `/etc/excerlock/env`, EAS secrets.
7. EAS: `eas.json` profiles carried over (development, preview, production); build a `preview` and push to
   TestFlight with `eas submit` (single owner per TOOLING.md); What-to-test notes via the `asc` skill.
8. Doctor: `python3 ~/.claude/agent-tooling/doctor.py --repo .` green.

## Acceptance

- [ ] `main` builds, tests and guardrails green with `app/` = the new app.
- [ ] TestFlight build installed on Johan's phone from the store path, not the dev client.
- [ ] Archive tag verified restorable (`git worktree add /tmp/old old-app-final` builds the old app).

## Audit amendments (2026-09-07; see `fix-plan.md`)

- Guardrail: a release build has no dev route, no deep-link runtime mutation and no test buttons (P2-T13).
- The hardening milestone's task files (P2-T13–T25) move with the rest of `plans/rebuild/`; the audit under
  `docs/audit/` stays as the record.

## Delete with `app/`: the legacy analytics rail (2026-09-07, from P2-T07)

P2-T07 rebuilt `packages/analytics-events` around the new onboarding rail, which broke `app/`: the
legacy app is typed against the retired seven-screen one, and one `FlowScreen` union cannot describe
both honestly. Rather than leave the root `npm test` red until this task lands, P2-T07 added
**`packages/analytics-events/src/legacy.ts`** — `LEGACY_FLOW_SCREENS`, `LegacyFlowScreen`,
`isLegacyFlowScreen`, `LegacyPropsOf` and the two legacy helper signatures — and pointed `app/`'s
analytics and onboarding modules at it. The shipping `FLOW_SCREENS` union was not widened.

Nothing outside `app/` imports it. This task deletes it:

- [ ] Delete `packages/analytics-events/src/legacy.ts` and its ten-line block in the package
      `index.ts` (the one under the "Legacy surface for the `app/` workspace only" comment).
- [ ] Delete the "The retired rail (`src/legacy.ts`)" section from
      `packages/analytics-events/README.md`.
- [ ] Delete `guardrails/legacy-analytics.test.ts`, the containment test that keeps the rail inside
      `app/`, and its row in `guardrails/README.md`.
- [ ] Confirm `grep -rn "Legacy\(Flow\|Props\|Track\)\|LEGACY_FLOW_SCREENS" --include='*.ts' --include='*.tsx' .`
      returns nothing once `app/` is gone.

Dropping `app/` from the root `workspaces` array and from `test:unit` is still part of this task.

## Prepared 2026-09-07 (build/P2-T12)

The executable version of this task is `docs/release/` — `cutover-checklist.md` (ordered steps with the
exact commands and the test that proves each), `identity-and-versions.md`, `app-privacy.md`,
`release-guardrails.md`, `rollback.md`. `app-next/eas.json` carries the profiles; `npm run
test:release-guardrails` (`guardrails/release/`) verifies the release configuration on both sides of the
rename. Step 4 (vendor docs marked historical) and the PRD banner from step 5 are done; steps 1–3, the
rest of 5, 6, 7 and 8 wait for P2-T11 and Johan.
