# docs/release

Everything needed to take the rebuilt app from `app-next/` to a TestFlight build under the existing
identity, and to undo it. Written by P2-T12 (`plans/rebuild/phase-2-backend/P2-T12-cutover.md`).

| File | What it is |
| --- | --- |
| `cutover-checklist.md` | The ordered checklist with exact commands: archive tag, rename, workspace/CI/guardrails, agent docs, first store build, secret rotation. Each step names the test that proves it. |
| `identity-and-versions.md` | Bundle id, team, EAS project, App Store Connect record; marketing version and remote build-number policy; what was verified read-only on 2026-09-07. |
| `app-privacy.md` | The App Privacy label answers, derived from the ports and the analytics events; the machine-readable source is `app-next/release/app-privacy.json`. |
| `release-guardrails.md` | The list of things a store build must not contain and the test for each (`npm run test:release-guardrails`). |
| `rollback.md` | How to undo each stage, and the one stage that cannot be undone. |

Steps only Johan can execute: the archive tag push, the merge to `main`, `/setup-agent-tooling`,
`eas build:version:set`, `eas build` / `eas submit`, the TestFlight install on the phone, and the Clerk
key deletion.
