# Phase 1 — UI/UX build (no backend, no native)

Goal: the entire ExcerLock experience, every screen, state, transition and animation in
`02-screen-inventory.md`, running on the simulator against the fake data layer in `04-architecture.md` §4,
animated per the Gemini bible, and reviewed by Gemini. When Johan opens any scenario from the dev menu, the
app looks and feels finished. Nothing talks to a network, requests a real permission, or buys anything.

## Task order and milestones

Tasks are numbered and strictly ordered unless marked parallel. One task = one commit on `rebuild/phase-1`.
Each task file states inputs, TDD steps, outputs, and acceptance. A task is done when its acceptance list is
green and its evidence folder exists.

| Milestone | Tasks | Gate |
| --- | --- | --- |
| **M0 Foundations** | T00 Gemini motion study · T01 scaffold · T02 design system · T03 domain + fake runtime + dev menu | T02 component previews and T03 scenarios open from the dev menu; `resolveLock` tests green |
| **M1 First end-to-end path** | T04 onboarding shell + pre-branch · T05 walking branch only · T06 schedule, plan, review · T07 trial + paywall stand-in · T08 setup sequence · T09 Home | A fresh install can walk from L0 to Home with a walking rule and see `locked` → `unlockedMet` via the dev clock. Gemini gate on onboarding (T15 partial). Johan eyeballs this before M2. |
| **M2 Breadth** | T05b gym/run/bike branches · T10 Conditions + builder · T11 Analytics · T12 Settings · T13 lock/shield preview + sheets (gym picker, check-in, walking session) | Every scenario in `04-architecture.md` §4 boots and every screen id in `02-screen-inventory.md` is reachable |
| **M3 Polish** | T14 accessibility + Dynamic Type + Reduce Motion pass · T15 motion pass + Gemini gate on every flow · T16 acceptance run | Gemini pass list clear; T16 checklist signed by Codex, then Johan |

`T05b` is the same task file as T05 with the remaining three branches; it is deliberately after T09 so the
first path is proven end to end before multiplying branches (handoff §7 "prioritize one end-to-end flow").

## Working rules for every task

1. **Read first**: `plans/rebuild/00-decisions.md`, `01-product-model.md`, the screen rows for the task in
   `02-screen-inventory.md`, `03-design-system.md`, the relevant `design/motion/*.md` bible file, and the
   mockup PNGs named in the task. Mockups are concept previews, not pixel truth: tokens win.
2. **TDD**: write the failing test first (domain, flow, component, or rendered-router seam), then the code.
3. **Small modules**: one responsibility per file, README per folder, no file over ~200 lines without reason.
4. **Tokens only**: no color, radius, spacing or duration literals in features.
5. **Copy lives in `src/content/`**, typed, never inline in screens.
6. **Evidence**: screenshots of every new screen state and a screen recording of every new flow in
   `app-next/evidence/<task-id>/`, produced headlessly with `xcrun simctl io`. Include the scenario id in the
   filename.
7. **Checks at the end of every task**: `npm run typecheck`, `npm test`, `npx expo-doctor`,
   `npx expo install --check`, `npx expo export --platform ios`, and an actual dev-client launch on the
   simulator (`npx expo run:ios --device <udid> --no-bundler` after the first build; Metro via `npm start`).
8. **Do not touch** `app/`, `server/`, `packages/`, `excer-ui-mock/`, `design/` (except `design/motion/`
   in T00 and asset FOUNDRY manifests when generating icons).
9. **Ask Johan** only for items listed as Open in `00-decisions.md` §E. Everything else is decided.

## Definition of done for Phase 1

- Every screen id in `02-screen-inventory.md` exists, with every listed state reachable from a dev-menu scenario.
- Every scenario in `04-architecture.md` §4 boots to its expected screen (scenario reachability test suite).
- `domain/` has 100% branch coverage on `resolveLock`, schedule instances, progress, streak and validation.
- Every component in `03-design-system.md` §3 has variant tests and a preview.
- Gemini's grading of every flow recording is "pass" (T15), and the bible's per-screen items are checked off.
- Accessibility: every interactive element has a label/role; Dynamic Type XL shows no clipped CTA; Reduce
  Motion path works on every animated screen; VoiceOver order sane on Home and onboarding (T14).
- `npm run typecheck`, `npm test`, `expo-doctor`, `expo export` green; app launches from a clean simulator.
- `app-next/README.md` documents run, test, scenarios, dev menu, and evidence conventions.
- Johan has opened every tab and the full onboarding on the simulator and said "good".
