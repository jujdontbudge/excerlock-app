# ExcerLock rebuild — plan index

Date: 2026-09-06. Owner: Johan. Author of the plan: Fable (Claude). Builder: Codex.

This directory is the complete specification for rebuilding ExcerLock as a new app around the approved
white/orange UI. It is written so that Codex can build from it without asking product questions. Every
product decision is recorded in `00-decisions.md`; if something is not there, it is not decided and
Codex must ask Johan rather than invent it.

## Two phases, run one at a time

| Phase | Folder | What it produces | Who signs off |
| --- | --- | --- | --- |
| **Phase 1 — UI/UX** | `phase-1-ui/` | The whole app's screens, flows, states and animations, running on a fake local data layer. No network, no permissions, no purchases, no native modules. | Johan reviews every screen on the simulator, then says "go" for Phase 2. |
| **Phase 2 — Engine and backend** | `phase-2-backend/` | Supabase auth, the VPS server, Adapty, PostHog, Sentry, and the verified native engine (Screen Time, Core Motion, gait vision, gym geofencing, HealthKit) ported from the old app behind the ports Phase 1 defined. | Johan, on a physical phone. |

Codex builds **Phase 1 only** until Johan explicitly starts Phase 2. Phase 2 is specified now so that
Phase 1's interfaces are shaped correctly, not so that it starts.

## Reading order for Codex

1. `00-decisions.md` — the decision register. Locked decisions, prerequisites, and what is explicitly out.
2. `01-product-model.md` — rules, lock semantics, schedules, the one locked-app set, progress.
3. `02-screen-inventory.md` — every screen, state and transition, in flow order.
4. `03-design-system.md` — tokens, components, icon rules, motion floor.
5. `04-architecture.md` — the new app's directory layout, the ports, the fake data layer, and the reuse audit of the old app.
6. `phase-1-ui/README.md` — milestones, task order, gates, definition of done. Then the numbered `T*.md` task files.
7. `phase-2-backend/README.md` — same structure for Phase 2.

## Repo rules that still apply

- Root `AGENTS.md`, `CLAUDE.md`, `TOOLING.md`, `design/STYLE.md`. Expo work goes through the Expo MCP. TDD.
  Small files, one responsibility, README per module.
- Maestro is banned. Simulator work is headless (`xcrun simctl`, `idb`), one simulator per session, shut it
  down when done (`xcrun simctl shutdown all`).
- The old app in `app/` is **read-only reference** during Phase 1. Do not modify, delete, or refactor it.
- Never commit unrelated changes from the dirty working tree. Phase 1 starts from the snapshot branch
  described in `00-decisions.md` §Prerequisites.

## Source-of-truth order (unchanged from the handoff, with today's decisions on top)

1. `plans/rebuild/00-decisions.md` (Johan's decisions, 2026-09-06).
2. `HANDOFF-FABLE-APP-REBUILD.md` (visual direction, onboarding structure).
3. The mockups in `design/mockups/onboarding-orange/` and the board generator
   `design/research/competitor-onboarding/build-excerlock-proposed-flow.mjs`.
4. `design/STYLE.md` and `design/research/appblock-orange/DESIGN-SYSTEM.md`, read with the 2026-09-06
   icon correction (simple multicolor icons, no dimensional renders, no backplates).
5. `excerlock-app-prd.md` for domain requirements that are not contradicted above.
6. Old code (`app/`, `excer-ui-mock/`, `packages/`) as reference, never as the visual blueprint.
