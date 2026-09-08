# MVP fix plan (from the 2026-09-07 gap audit)

Johan said go for Phase 2 on 2026-09-07 with one condition: the MVP must let users enable any condition they
choose, have it work at the right time and place, and have every edge case explained. The audit
(`docs/audit/mvp-gap-audit-2026-09-07.md`, 115 verified findings) and his answers (decisions B21–B37) become
the tasks below. Every finding has exactly one owning task; the per-finding detail (files, first failing
tests, copy) is in `docs/audit/fix-map.md`, and a "Planner resolution" line there overrides the mapper text
wherever the two critics found a conflict.

**The headline discovery:** 114 of the 115 findings are fixable now against the fake ports. They are pure
domain, port-shape, screen and copy work. So the hardening milestone runs **before** the native port, and the
native tasks (P2-T03–T05, T09) were rewritten to consume its results instead of re-deriving them.

## Milestone N0.5 — MVP hardening

Runs in parallel with N0 (identity and server). N1 (native engine) starts only when the domain lane is done.

| Lane | Tasks, in order | Depends on |
| --- | --- | --- |
| **Domain** (sequential; each owns the shared files while it runs) | P2-T13 test floor → P2-T14 enforcement domain → P2-T15 session and credit engine → P2-T16 walking duration mode → P2-T17 runtime root → P2-T18 entitlement, identity, paywall | — |
| **Screens** (parallel with each other once their dependency lands) | P2-T19 Home (after T17) · P2-T20 builder and lifecycle (after T16) · P2-T21 ceremonies (after T16) · P2-T22 Settings (after T18) · P2-T24 Analytics (after T15) | domain lane |
| **Independent** | P2-T23 onboarding and setup (after T13) | — |
| **Last** | P2-T25 accessibility and locale | every screen task |

Gate for N1: the three port contract suites pass against the fakes; the domain coverage floor is enforced in
CI; every scenario in P2-T15 §7 and P2-T19 exists in the dev menu; the twelve blocker/high Home and ceremony
findings are closed on the simulator.

## Blockers and what closes them

| Blocker | Closed by |
| --- | --- |
| A verified treadmill scan books zero minutes (#1) | P2-T15 session machine (a scan is a `verified` event; credit is a recomputation from timestamps) |
| Framing-grace expiry shields silently (#2) | P2-T21 terminal failure state with Try again / Continue with phone in hand |
| Subscription lapse undefined (#3) and locks out Settings (#5) | P2-T14 `enforcementPlan` (clear and unregister on lapse) + P2-T18 `entitlementAccess` (app stays mounted, paywall as a modal) |
| Test buttons and dev route ship on Home (#4, #10) | P2-T13 release hygiene |

## Resolutions the planner made (the critics found these conflicts; these are the decisions)

1. **Earned unlock (B23)** is a separate persisted `EarnedUnlock` record, not a field on `RuleDay`;
   `resolveLock` reads no rule for the met branch.
2. **Precedence** is stated once in `01-product-model.md` §3 (walking → earned → provisional → locked →
   before → after → none), with the enforcement gate (`enforcementPlan`) above it. No task restates it.
3. **Instant relief (B22)** is one state, `unlockedProvisional`, granted only after the 30-second confirmation;
   presence is a live input derived from visits, never persisted.
4. **Gym dwell (B31)** has one representation: a rule-agnostic `GymVisit` surface on the port, a persisted
   visit store, one pure dwell function. `demo/gymProgress.ts` is deleted. `metAt` for an arrival is the
   confirmed visit's `enteredAt`.
5. **Lease renewal (B29)** is a consequence of a `verified` event inside the session machine; there is no
   `renew()` on the port and a lapsed lease is never revived. Propped renewal is a re-scan or a handheld
   verification, per the treadmill spec's bounded lease (no continuous camera verification).
6. **Blocker 1** is closed by the session machine, not by starting the fake's playback loop; the loop and the
   increment writer are deleted.
7. **Clock rewind** is one module, `domain/watermark.ts`, never disabled under the fake runtime.
8. **GPlace is deleted** (B24): gym rules bind to any saved gym; a rule saved with no gym is paused with a note
   (B25); "Add a gym" pushes the picker route.
9. **A lapse is never rendered as a rest day**; it has its own Home branch. Ceremonies keep booking progress
   while lapsed and drop the unlock claim from their copy.
10. **No `grace` entitlement status in v1**; Adapty's billing grace maps to `active`.
11. **Three notification ids** (B30 amends B14's wording); the third is emitted only by ShieldAction.
12. **One root composition** (P2-T17) with one foreground handler; every root-mounted piece attaches to it.
13. **The Home lock card slot contract and the `statusContent` state table** are written once (P2-T19) before
    any Home finding lands; `permissionNeeded`/`noAppsSelected` are not "unchanged".
14. **Ownership of the ceremony screens** is P2-T21 alone; T14/T15/T16 contribute domain and ports only.
15. **B33 scope** is exactly O19, the illustrative label, the duplicate O01 heading and the O10 revert; nothing
    else is ratified on its authority.
16. **Minimum window 30 minutes** ships with a migration that widens persisted 15–29-minute windows instead of
    dropping the rule; every fixture and scenario is checked by a test.
17. **CI runs app-next tests first** (P2-T13) — before this, no test in the plan protects anything.

## Open questions for Johan (not blocking; defaults stated)

1. Six onboarding headings rewritten by the build (O08, O15, O16, O17, O18 "You become ADDICTED to
   exercise", setup X2) are outside B33. Default: left as shipped, inventory marked "pending". The O18 line
   conflicts with the "sells, never scolds" voice rule.
2. O06 age bands and O07 occupation lists differ from the inventory. Default: shipped lists stay.
3. Analytics opt-out switch and "Export my data" row (PRD promises export; App Privacy label needs the
   opt-out story). Default: build both in P2-T07/T10 (small). **Half done (2026-09-07):** P2-T07 shipped
   the switch — `settings.shareAnalytics`, default on, a Preferences row, and an adapter that re-reads it
   on every emit and only after the settings store has hydrated. "Export my data" is still P2-T10's.
4. P2-T25 accessibility and locale in the MVP. Default: yes; cut it and it goes to `00-decisions.md` §F.

## How to work a task

Read the task file, then its section of `docs/audit/fix-map.md`. Write the first failing test named in the
task before any code. When a task edits a plan document (`01-product-model.md`, `02-screen-inventory.md`, a
spec), that edit is part of the task, not paperwork. Findings closed get a line in the PR body ("closes audit
#n"); a finding that turns out to be wrong gets a note in `docs/audit/fix-map.md`, not a silent skip.
