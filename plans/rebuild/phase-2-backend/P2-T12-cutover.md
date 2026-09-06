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
