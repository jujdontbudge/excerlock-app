# ExcerLock rebuild — handoff to Fable

Date: September 6, 2026
Workspace: `/Users/johansardar/ExcerLock`

## Your assignment

Plan a **fresh app rebuild around the newly approved UI**, not a reskin of the old app. Johan's words: “a totally new app … scrap the old app.” His next instruction was to stop implementation and create this handoff so **Fable can plan it**.

This handoff authorizes planning, not deleting the old app, changing production services, shipping a build, or activating subscriptions. No rebuild implementation has started. The previous assistant only inspected project files after the rebuild request; this document is the only deliverable for the handoff request.

Produce a concrete, phased implementation plan, including screen/state inventory, architecture, existing-code disposition, native capability risks, testing, and acceptance criteria. Preserve the old app and the dirty working tree until a recoverable replacement strategy is established. “Fresh app” expresses product/UI intent; whether it should have a new bundle ID, backend, store listing, or data migration is **not decided**.

## Product in one paragraph

ExcerLock helps people exercise more and scroll less by blocking selected apps and unlocking them when an exercise condition is met. It is **not** a calorie tracker, workout-plan app, or exercise instruction app. Activities are walking, gym, running, and biking. Conditions can involve an event (arrive at a gym), a completed target (steps, duration, distance), a rate (screen time earned per step), or a state (unlock while walking). Rules apply during chosen days and time windows. The app explains this simply, sets up a personalized rule, and makes progress understandable.

## Source-of-truth order

1. Johan's latest decisions summarized here, especially the icon correction below.
2. Current generated mockups and the rebuilt Excalidraw board.
3. `design/STYLE.md` and `design/research/appblock-orange/DESIGN-SYSTEM.md`, interpreted with the latest correction.
4. `excerlock-app-prd.md` for existing domain/integration requirements; reconcile conflicts explicitly rather than carrying every old feature forward.
5. Existing app code and older prototype specifications as reference, **not** the visual blueprint for this rebuild.

The old Pillow-derived UI, old 98-state prototype matrix, and old dashboard build spec must not silently override the new direction.

## Where to look

### Current board

- Main screens: `http://127.0.0.1:4173/?section=main&revision=smooth-v3`
- Onboarding icon examples: `http://127.0.0.1:4173/?step=20&revision=smooth-v3`
- Branches: `http://127.0.0.1:4173/?section=branches`
- Ending: `http://127.0.0.1:4173/?section=ending`
- Local viewer: `tools/excalidraw-local/`
- Scene: `design/research/competitor-onboarding/selected-onboarding-flow/excerlock-proposed-onboarding-v3.excalidraw`
- Companion SVG: same directory, `excerlock-proposed-onboarding-blueprint-v3.svg`
- Generator/content: `design/research/competitor-onboarding/build-excerlock-proposed-flow.mjs`
- Scene builder: `design/research/competitor-onboarding/build-excerlock-excalidraw.mjs`

The board contains **45 onboarding cards and four main-app cards**. Branch variants share some underlying screen types. It is a large embedded SVG containing raster mockups, **not a set of native editable UI components**. URLs need the local server running. Inspect the viewer's package scripts if it is stopped.

### Assets and research

- `design/mockups/onboarding-orange/` — generated screen images.
- Latest main screens: `main-home-v3.png`, `main-conditions-v3.png`, `main-analytics-v3.png`, `main-settings-v3.png`.
- Latest targeted onboarding revisions: `loop-reward-v3.png`, `final-principles-v3.png`, `loop-picker-v3.png`, `final-walk-place-v3.png`, `final-walk-rule-v3.png`, `final-walk-target-v3.png`, `final-review-v3.png`, `final-trial-offer-v3.png`, `final-trial-reminder-v3.png`, `final-notification-v3.png`, `final-timeline-v3.png`, `final-paywall-top-v3.png`, `final-paywall-bottom-v3.png`.
- Other board screens use their generator-selected versions; do not assume every file has a v3 replacement.
- `design/mockups/onboarding-orange/FOUNDRY.md` — asset provenance and limitations.
- `smooth-icon-generation-record.json`, `smooth-icon-prompts.json`, `smooth-icon-validation.json` in that directory — exact edit prompts, references, results and validation.
- `design/logo-concepts/2026-09-05/` — running-lock logo explorations; identify the approved filled-orange running-lock version from the manifests, not an arbitrary concept.
- `design/research/appblock-orange/DESIGN-SYSTEM.md` — AppBlock-inspired token/component research.
- `design/research/appblock-orange/REVISION-2026-09-06.md` — useful screen-function mapping, but its earlier “dimensional emoji” direction is superseded by the latest simplified-icon correction.
- AppBlock reference: https://screensdesign.com/apps/appblock-apps-web-blocker/?id=1901

## Visual direction — non-negotiable

- AppBlock-inspired layout discipline and native-feeling UI, adapted to ExcerLock functions.
- Predominantly **white**, with only a faint pale-orange wash at the top. No full orange gradient background and no inverted screenshots.
- Orange primary buttons, white button text; black/dark headings, readable neutral secondary text.
- Smooth rounded forms, restrained borders, generous whitespace, consistent typography and spacing.
- **Simple multicolor graphic icons**, not detailed emojis or realistic 3D objects. Use rounded silhouettes and a few broad color areas with minimal soft shading: mint, lilac, sky blue, coral, yellow.
- No realistic skin, faces, anatomy, metallic shine, shoe stitching, intricate spokes, or toy-like detailed renders.
- Icons sit directly on the surface: **no decorative pill, circle, tile or pedestal behind each icon**. Functional selection cards, input fields, grouped settings sections and selected-state outlines are still appropriate.
- Keep navigation/utility symbols legible and semantically correct. Notification means bell, units means ruler, streak means flame. Do not replicate image-generation mistakes.
- Final exercise choice uses a **2×2 grid** with Walking, Gym, Running, Biking and simple colorful activity symbols.

The latest user reference crops showed simple colored hearts, scales, habit symbols and small dashboard icons. They wanted their smooth graphic quality and varied colors, not the reference apps' entire layouts or literal emoji rendering.

### Important mockup limitations

All new v3 images are accepted **concept previews**. They failed exact 1206×2622 iPhone geometry validation. They are not production screenshots, exact type scales, or ready-to-use full-screen app assets. Do not implement screens as static images.

Normalize tokens, safe areas, accessibility, chart values, icon meanings and interaction behavior during planning. Generated samples contain illustrative data and some unrequested decorative variations (for example a review hero becoming a lock or icons on pricing options); these are not new product requirements. Original/rejected outputs remain available. The visual update replaced 17 mockups, not every existing illustration in the repository.

## Main app — four destinations

| Tab | Required purpose |
| --- | --- |
| Home | Current blocking/unlocking status; earned and remaining screen time; today's rule/activity progress; access to locked-app selection and condition management. Configured examples are not preloaded user defaults. |
| Conditions | List configured rules; enable/disable, add and edit; activity target or unlock mode; applicable schedule; chosen apps. Include empty state and validation/conflict states. |
| Analytics | Screen-time and exercise trends; reclaimed/earned time; exercise activity and streaks; clear time-period controls and honest empty states. Concept charts are not measured data. |
| Settings | Account, permission health, preferences, units, notifications, subscription, support and legal/privacy controls. Main mockup is only the first viewport. |

Use these exact user-facing tab names unless Johan changes them. Do not carry over the old “Manage”/“Analysis” labels by accident. No workout plans, calorie dashboards, or manual “I exercised” claims should be inferred from the illustrations.

## Onboarding — latest agreed structure

Read the generator for exact current card order/content. The following explains the intent and superseded decisions so the new plan does not reintroduce removed screens.

### Opening and personalization

- Minimal AppBlock-like blank/loading opening and ExcerLock splash. Johan explicitly rejected an invented opening screen; reconcile the existing first two board cards into intentional launch behavior rather than creating redundant steps.
- Intro: “Block apps. Exercise more.” Show selected apps and a blocking widget communicating **blocked from 12 PM to 8 PM until arrival at the gym**, with a gym symbol and the blocked-time line.
- Progress intro: reduce screen time and track progress.
- Exercise intro: increase weekly exercise and consistency, with different activity symbols and upward movement cues.
- Name, referral source, age, occupation.
- Age and occupation come **before** “What do you want to improve first?”
- Improvement choices: more exercise, less screen time, overall wellness.
- Motivation: “What's the main reason you want to make a change?” The older OtterLife goal screen was explicitly removed.

### Screen-time impact and habit explanation

- Current daily scrolling estimate, then quick hours/day → hours/month → days/year math.
- Year-of-life visualization, remaining free time, and the portion spent scrolling, in that order.
- Trend graphic: screen time down, exercise up, in ExcerLock style.
- The three Unrot feelings/reassurance/shame screens were removed.
- Replace long text-only science explanations with a visual loop: phone/urge → scrolling/reward → repeat; then ExcerLock interrupts the loop; then movement → unlock → reward.
- Explain small repeatable habits in plain words. Don't promise “addiction transfer,” guaranteed behavior change, or a clinical dopamine effect. The user's desired story is exercise becoming a habit; any scientific claim needs substantiation.
- Avoid resurrecting redundant “Good news”/“Your new path” cards that were removed during revisions. Follow current board ordering.

### Four exercise branches

- Exercise picker: four colorful options in a 2×2 grid.
- Immediately BEFORE the exercise picker: “Choose the apps that distract you most”, subtitle “You’ll unlock them by moving.”, floating app logos and a simple coral/lavender lock, orange “Select apps” CTA. New mockup: `design/mockups/onboarding-orange/select-apps-v1.png`. The CTA opens app selection; save selection before advancing to exercise choice. Plan authorization, cancellation and empty-selection handling. This placement is now decided, not an open product question.
- Walking: outside/treadmill/either; unlock after a step goal, earn time per step, or **unlock while walking**. Step goal and rate modes need appropriate typed values. “While walking” skips irrelevant target/reward questions.
- Gym: arrival-based or duration-at-gym condition. Duration is a typed number of minutes; arrival should not require a duration. Plan gym/place selection and permission handling.
- Running and biking: target duration or distance; typed minute/distance inputs. Distance has a units dropdown. Match each mode to the correct follow-up rather than showing all fields to everyone.
- Provide clear recommended defaults near the end of setup, but retain editability and validation. Recommendations should not be silently treated as medical advice.
- Branches converge on a **single days-and-times screen**. The earlier separate days and time cards were replaced. Support selected weekdays, a time window and an all-day concept as appropriate; use the AppBlock scheduling reference as functional inspiration, not a pixel copy.
- Configure how much screen time exercise earns. A separate old “What should exercise unlock?” screen was removed. Determine how fixed reward duration, rest-of-day behavior, rate-based earning and state-based unlocking fit the final model without reintroducing redundant questions.
- Define schedule boundaries, crossing midnight, timezone changes, outside-window behavior, exhausted allowance, activity stopping, and overlapping rules in the plan.

### Ending

- Personalized setup/progress screen with visible checklist; do not claim data analysis or permissions completed before they are.
- One simple “plan ready” summary: activity/condition, target, selected apps, days, times, reward. Allow correction without losing the rest of setup.
- Review/rating screen in our style; no fabricated reviews, user counts or ratings. Current mockups intentionally use placeholders.
- OtterLife-inspired trial sequence: offer → reminder before trial end → notification explanation/permission → how the trial works → paywall and scrolled plan/details state.
- Offers and prices are **not configured**. The 7-day trial is a design example, not a verified entitlement. No live purchase, trial or notification was activated by the mockups.
- Plan real purchase/restore, cancel/dismiss, permission denial and subscription error states. Do not hardcode sample prices or treat generated strings as legal terms.

### Planning-board layout

Johan wants horizontal flow rows. Each source app's reference onboarding is a horizontal row, retained below the proposed flow. Our onboarding starts horizontally, branches via arrows into four activity paths, then reconnects and continues horizontally. Stack only genuinely identical information/state alternatives, not chronological screens that merely look similar.

## Existing repository — assess, don't blindly reuse or destroy

- `app/`: existing Expo app workspace, with native Screen Time extensions and modules. README describes Expo Router and a dev-client build, not Expo Go.
- `server/`: existing backend workspace.
- `packages/condition-model/`, `packages/ledger/`, `packages/analytics-events/`: existing domain/shared packages worth auditing for reuse independent of UI.
- `excer-ui-mock/`: standalone old **looks-only** Expo prototype with deterministic local demo state. It does not really block apps, make purchases, request permissions or contact services. Its old Pillow design is superseded.
- `prototype/`: another reference prototype; inspect before assigning it any role.
- The worktree has extensive pre-existing tracked modifications and untracked files. No clean baseline was established. Do not discard, reset, overwrite, or commit unrelated work.

For each subsystem, recommend one of: rebuild UI, reuse verified domain logic through a clean interface, preserve native integration and retest, retire after migration, or investigate. A totally new product experience does not automatically require throwing away working FamilyControls or ledger logic. Explain the tradeoffs and get the replacement boundary clear before implementation.

## Engineering constraints for the eventual build

- Read root `AGENTS.md`, applicable nested instructions, `TOOLING.md`, and module READMEs.
- Expo/React Native docs, dependency additions, builds and workflows **must use Expo MCP** under repo rules. It was not exposed in the previous assistant's available tool inventory; connectivity needs checking before implementation. Don't guess APIs or silently bypass this rule. Tooling doctor: `python3 ~/.claude/agent-tooling/doctor.py --repo .`.
- TDD: write behavior tests first, use small navigable modules with clear responsibilities and module READMEs.
- Read `design/STYLE.md` before creating any visual asset; follow the asset manifest/provenance rules. Latest user visual instruction supersedes older style prose.
- Maestro is banned despite stale mentions in TOOLING/READMEs. Simulator is headless by default: `xcrun simctl`, `idb`; only one simulator per session. Don't open Simulator.app unless asked.
- Search `~/ios-app-pitfalls/PITFALLS.md` for relevant native/build subsystems when implementation begins. Log cross-app diagnoses per repo rules.
- Development auth only; no production Clerk changes. No external deployment, purchases, notification sending, data deletion or store identity changes are included in this planning request.
- Real app blocking, background condition detection, precise location behavior and denied permissions need device-level evidence. A passing server test or attractive simulator screen does not prove real enforcement.

## What Fable should deliver

1. A concise vision and scope statement that separates approved requirements from unresolved decisions.
2. A complete screen/state/transition inventory: onboarding branches, the four tabs, add/edit condition flows, permissions, empty/error states, subscriptions and lifecycle recovery. Reuse screen templates for genuinely similar forms.
3. A normalized design system: colors, typography, spacing, radii, component variants, icon style and semantics, navigation, motion, safe areas, Dynamic Type and contrast. Distinguish approved aesthetic from generated artifacts.
4. A proposed fresh app architecture and directory strategy, with a recoverable old-app archive/migration plan and a reuse audit of domain/native/backend code.
5. A condition model covering event/state/rate/target rules, units, schedules, app selection and reward lifecycle; explicitly reconcile ambiguous behavior.
6. Native feasibility and permission sequencing for walking, gym arrival/time, running/biking distance and actual app blocking. Flag unsupported or uncertain behavior early.
7. Phased implementation milestones with test-first acceptance gates. Prioritize the shared design system and one end-to-end working exercise-to-unlock flow before multiplying branches.
8. Verification plan: unit/state tests, screen interaction tests, representative visual comparison, navigation/back/persistence, accessibility, real-device enforcement and purchase sandbox checks where applicable.
9. A short decision register. Key open questions include replacement identity/storage migration, backend reuse, exact permission and app-selection placement, reward semantics, supported detection modes and real offer configuration. Do not burden Johan with choices already settled above.

Success means a new coherent app built from this UI and product model—not the old app with orange paint, and not a tappable gallery of generated screenshots. **For this handoff, stop at the plan.**
