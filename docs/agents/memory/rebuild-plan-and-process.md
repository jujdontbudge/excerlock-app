---
name: rebuild-plan-and-process
description: ExcerLock from-scratch rebuild (Sept 2026) — plan lives in plans/rebuild; Phase 2 code merged on rebuild/phase-2 2026-09-08 (head 86062db); remaining items need a real build or the Adapty dashboard; Gemini CLI auth is broken
metadata: 
  node_type: memory
  type: project
  originSessionId: 2bcf08c8-5fde-4a2e-ad1b-d2e0aeefa1ae
  modified: 2026-09-06T17:37:35.573Z
---

On 2026-09-06 Johan decided to rebuild ExcerLock as a new app in `app-next/` (same bundle id, Adapty app, VPS),
with Supabase for auth only, no time bank (met rule = unlocked rest of day; "unlock while walking" is the one
exception), one global locked-app set, OtterLife as the layout/motion reference, Gemini writing the motion bible.
The full decision register is `plans/rebuild/00-decisions.md` on branch `wip/pre-rebuild-snapshot-2026-09-06`
(the design overrides and research assets exist only there and on disk, not on `main`).

**Why:** Johan wants the process simple: Codex builds Phase 1 (UI only, fake data), he checks it on the
simulator, then Phase 2 (engine port + backend) starts. He explicitly keeps all tested native/ML code
(gait vision, harness, motion) — port, never rewrite.

**Update 2026-09-07:** Phase 1 UI is done on branch `rebuild/phase-1`. Johan said go for Phase 2 ("the full MVP").
The MVP gap audit (`docs/audit/mvp-gap-audit-2026-09-07.md`, 115 findings) and his answers (decisions B21–B37)
drive the Phase 2 fix plan in `plans/rebuild/phase-2-backend/`. Workflows dispatch only Opus/Sonnet agents;
Fable plans and orchestrates.

**How to apply:** Do not restart the planning interview; read `plans/rebuild/` and the audit first. "Gemini" on this machine means the Antigravity CLI `agy` (`~/.local/bin/agy`,
`--model gemini-3.7-flash-high --dangerously-skip-permissions --add-dir <dir>`, file paths written in the
prompt, stdout redirected to a file). The old `gemini` binary is retired and fails with `IneligibleTierError`;
never conclude Gemini is unavailable from that. See [[describe-tests-by-action]] and
[[plan-for-thousands-of-users]].

**Update 2026-09-08:** Phase 2 is merged on `rebuild/phase-2` at 86062db (integration worktree
`/Users/johansardar/ExcerLock-build/integration`; per-ticket worktrees under `ExcerLock-build/` can be
removed). 336 suites / 1969 tests, typecheck clean; 5 guardrails need `expo prebuild` output and
e2e-gate times out (issue 136), jest never exits after a run (issue 135). `EXPO_PUBLIC_RUNTIME=real`
selects the real runtime; EAS production env carries every EXPO_PUBLIC_/GOOGLE_OAUTH_ value. Open
follow-ups are GitHub issues: Adapty paywall legal block + fallback export (dashboard only), App Store
review screenshots (need a build), Home caughtUp producer. Next step is a real device build and the T11
runbook. Infra facts: [[api-hosting-gcp]].
