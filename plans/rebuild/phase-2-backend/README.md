# Phase 2 — Engine, auth, backend, services

**Johan said go on 2026-09-07.** The MVP gap audit (`docs/audit/`) added milestone N0.5 and rewrote parts of
P2-T03–T05 and T09; read `fix-plan.md` first.

Goal: the Phase 1 app becomes the real ExcerLock. Every fake port is replaced by a real adapter: the verified
native engine ported from `app/` (Screen Time, Core Motion, gait vision, placement, walking sessions, gym
geofencing, HealthKit), Supabase auth, the VPS API on Supabase JWTs, Adapty with the Paywall Builder,
PostHog, Sentry, local notifications, and sync of rules and results to the VPS database. Verified on a
physical iPhone, not just the simulator.

## Principles

- **Port, don't rewrite** (decision B12). Native modules, config plugins, extension targets, signal
  providers, walking/gym controllers, the harness and diagnostics move over with their tests. Codex changes
  their *wiring* (to the ports) and *policy* (ledger → `resolveLock`), not their internals.
- **Ports are the contract.** A real adapter passes the same port-level tests the fake passed, plus its own.
  Screens do not change in Phase 2 except where a real system UI replaces a fake sheet (app picker, permission
  prompts, Paywall Builder).
- **Local-first law stays.** Earning and locking never depend on the network or an account.
- **One identity spine.** Supabase user id = `users.id` on the VPS = Adapty `customer_user_id` = PostHog
  `distinct_id`. Anonymous sessions get a Supabase anonymous user id from day one, so the spine exists before
  sign-in and survives it (anonymous → linked identity keeps the id).
- **Device evidence or it did not happen.** Shields, deny paths, geofences, pedometer, HealthKit, camera and
  purchases are verified on Johan's phone (P2-T11).

## Task order

| Milestone | Tasks | Gate |
| --- | --- | --- |
| **N0 Identity and server** | P2-T01 Supabase auth · P2-T02 server on Supabase JWTs, schema, sync endpoints | Server tests green; app signs in with Apple/Google/email against the dev Supabase project; `PUT /v1/user` provisions |
| **N0.5 MVP hardening** (parallel with N0; see `fix-plan.md`) | Domain lane P2-T13 → T14 → T15 → T16 → T17 → T18 · screens P2-T19–T24 · P2-T25 last | Port contract suites pass against the fakes; domain coverage enforced in CI; the audit's blockers closed on the simulator |
| **N1 Native engine port** (after the domain lane) | P2-T03 port modules/plugins/targets/signals/harness · P2-T04 lock policy on Screen Time · P2-T05 signals behind ports | Simulator: FamilyControls authorizes, picker returns a handle, `resolveLock` drives ManagedSettings; harness app root boots |
| **N2 Services** | P2-T06 Adapty + Paywall Builder · P2-T07 PostHog + Sentry · P2-T08 sync · P2-T09 notifications · P2-T10 settings/account wiring | Sandbox purchase round-trips through Adapty to the webhook; events land in PostHog with the right distinct id |
| **N3 Device and cutover** | P2-T11 physical-device verification · P2-T12 cutover (rename, archive old app, TOOLING regen, TestFlight) | Johan's phone: full flow, shields on a real app, unlock by walking, gym arrival, run from Health, trial via sandbox |

## Prerequisites Johan owns

- The Adapty dashboard paywall must carry tappable Terms of Use and Privacy Policy links, the price and the
  renewal disclosure (App Review 3.1.2; P2-T06 acceptance tests it).

- Create the Supabase project (decision D1/Q5) and give Codex the project ref, anon key, and a **dev** service
  role / access token in `~/.excerlock/env` (never in the repo). Enable Apple, Google and Email (OTP) providers
  and anonymous sign-ins in the Supabase dashboard; register the Apple Services ID and Google OAuth client.
- Configure the paywall in Adapty's Paywall Builder for placements `onboarding` and `in_app`, with the real
  products (Variant A/B groups already exist). Confirm no live customers are linked by Clerk id (E5).
- Point `api.excerlock.com` DNS at the VPS if still unpointed (server README says it may be).
- Physical iPhone with iOS ≥ 17.4, developer mode on, connected for P2-T11.
