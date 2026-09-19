# Review-fixes changelog — Wave 3 batch A (`fm/asr-fix-d1`)

Answers the Wave 2 audit (`data/asr-audit-c1/report.md`, Wave 3 fix list §6). Batch A = the four items needing no captain decision (fixes 4, 5, 8, 10). Nothing here is a review-only skin and nothing here hides a capability from review that an OTA would later enable — every change is what all users see from this build on, or documentation.

## Fix 5 — Review Notes: OTA + remote-flags + framing disclosure

- **Audit row:** §2.5 (B row 27, A §4 2.5.2(c)), fix list item 5.
- **Files:** `docs/asc/review-notes.md`.
- **What changed:** added four sentences to the Review Notes draft: (1) Expo OTA (`expo-updates`) delivers JS-only fixes within the reviewed feature set — no native code, permission or feature changes; (2) PostHog remote configuration only tunes analytics-driven copy, step order and thresholds whose defaults are exactly the reviewed behavior; (3) the app is self-control for the signed-in adult on this device, not a parent/child or MDM product; (4) shielding is done through Family Controls and ManagedSettings — not a VPN, not MDM.
- **Why:** the audit found the Notes had no OTA or PostHog disclosure (generic Notes are rejected under 2.3.1) and lacked the self-managing-adult framing Apple asks SIWA/self-control apps to state.
- **Honesty statement:** documentation only — it disables nothing, shows reviewers exactly what every user sees, and describes shipped defaults that already hold in code (no capability change).

## Fix 4 — Paywall: billed renewal price is the most prominent pricing element

- **Audit row:** row order 5 (B rows 11–12, A §6.3 3.1.2(c)), fix list item 4.
- **Files:** `app-next/src/features/subscription/PaywallScreen.tsx`, `app-next/src/content/subscription.ts`, tests `app-next/src/features/subscription/__tests__/paywall-screen.test.tsx` (new ordering tests + updated assertions), `__tests__/paywall-variant.test.tsx` and `__tests__/winback.test.tsx` (updated a11y names).
- **What changed:** the footer no longer leads with the trial. It is now built by `priceFirstFooterLabel()` from the same localized price/period/offerLabel values the screen already had: `"<price> / <period> after your <offerLabel> trial. Cancel anytime."` (or `"<price> / <period>. Cancel anytime."` with no offer). The plan row now carries the renewal price on its title line at label weight (`planRowTitle()` = `"<plan> · <price> / <period>"`) with the trial label demoted to the smaller support line. Footer tone moved secondary → primary. The winback placement renders this same `PaywallScreen` component, so the ordering is confirmed identical there (also asserted by a new winback-placement test).
- **Why:** sourced rejections cite promoting the free trial more conspicuously than the billed amount; the CTA read "Start free trial" while the billed amount appeared only in small secondary text.
- **Preserved:** benefits list, plan rows, Restore, Terms of Use and Privacy Policy links, decline button, CTA behavior — every pre-existing element remains.
- **Tests:** new tests pin the price-first footer for both offer and no-offer states and assert the offer never leads the pricing sentence; `paywall-variant`/`winback` assertions updated for the new row labels. Full `src/features/subscription` suite: 42/42 pass; `tsc --noEmit` clean; lint clean (0 errors).
- **Honesty statement:** copy/layout change that every user sees on every build — not a reviewer-only skin, and not something an OTA would suddenly switch on.

## Fix 8 — Sign in with Apple token revocation on deletion: STOPPED per contract (contingency met)

- **Audit row:** row order 6 (B rows 19–20, A §6.5 5.1.1(v)), fix list item 8.
- **Files:** none changed.
- **What was found:** the brief's contingency applies — **no Sign in with Apple refresh token or authorization code is retained anywhere server-side**, so no revocation call is possible today:
  - The client obtains the Apple `authorizationCode` at sign-in (`providerApple.ts`, `createAuthServices.ts`) and discards it; it sends only the identity token + nonce to Supabase via the ID-token `signInWithIdToken`/`linkIdentity` overload (ADR 0011). No server hop carries the code.
  - In that ID-token grant Supabase validates the JWT against Apple's public keys and never performs the client_secret code exchange, so Apple's refresh token is never issued to — or stored by — Supabase either.
  - The server stores encrypted refresh tokens only for the four vendor connections (Strava/Oura/Whoop/Polar, `vendor_connections.refresh_token_ciphertext`); there is no Apple token anywhere in `server/` (grep over `server/src` and `server/drizzle`).
- **Why no code:** the brief forbids adding new sign-in data capture in this batch, so the revocation call was not added and nothing else was touched.
- **Smallest way to obtain the missing piece (for a follow-up batch):**
  1. The app already receives the one-time Apple authorization code at sign-in (`AppleCredential.authorizationCode`); send it with the next Supabase link call (or to the server directly) and immediately exchange it server-side for an Apple refresh token (`POST https://appleid.apple.com/auth/token`, `grant_type=authorization_code`, `client_id` + `client_secret` ES256 key), storing the refresh token encrypted alongside the canonical user (same pattern as `vendor_connections`). The code is single-use and short-lived, so capture must happen at sign-in time — a later deletion-time-only capture is not possible.
  2. Add an Apple client_id/client_secret to the server environment (mirroring the existing vendor secret pattern in `env.ts`).
  3. In `server/src/userDeletion/`, add a processor step (before Supabase auth deletion, checkpointed like Adapty/PostHog) that calls Apple's `POST /auth/revoke` with the stored refresh token (`token_type_hint=refresh_token`); provider not-found/idempotent semantics mirror the existing steps.
- **Honesty statement:** no change shipped for this item; nothing was hidden or weakened, and the other fixes stand intact.

## Fix 10 — Ops governance: remote-config changes that alter capability are new-submission material

- **Audit row:** fix list item 10 (charter rule 2 as a process gate; no code change needed).
- **Files:** `docs/agents/operations.md` (existing OTA updates section — new subsection "Submission scope of remote configuration").
- **What changed:** recorded that any future widening of the `stride_gate_config` clamps beyond their measured endpoints, any new PostHog flag (or new consumer of the flag rail), or any remote copy change (e.g. `shield_copy`) that alters user-visible capability is **new-submission material, never an OTA**; the Review Notes sentence about remote defaults is the invariant each OTA must keep matching.
- **Why:** the code already holds the hard rules on defaults; this note makes the gate explicit for future operators so the reviewed behavior and every later OTA stay in parity.
- **Honesty statement:** a process-gate note in the existing runbook; it changes no behavior, hides nothing, and depends on no OTA.

## Held for captain decisions (pending batch B — untouched here)

- **Fix 1** — dormant HealthKit surface removal (decision D2; binary-required).
- **Fix 2** — free tier vs hard paywall (decision D1).
- **Fixes 3 and 9** — screenshot copy/regeneration (decision D3).
- **Fix 6** — privacy-policy backup rows (decision D4).
- **Fix 7** — photo-library permission (bundled with the D2 binary).
- Untouched in this batch, per the brief: `app-next/config/native.ts`, entitlements, plugins, privacy manifest, screenshots, privacy policy.

## Verification handoff

- **Not verified on a device here:** the live paywall (StoreKit trial eligibility, real Adapty placement data, VoiceOver reading of the new footer/rows) belongs to another team per the audit's §8 functional-runs handoff. The price-first ordering is verified by unit tests on the shared screen component (which also renders the winback placement), not on hardware.
- Server checks for fix 8 were not run because no server code changed; the deletion suite remains untouched and green as of this branch's base.
