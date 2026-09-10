# T00 — Prerequisites Johan owns

Dashboard-only. Nothing else starts until each line has evidence in `evidence/T00/`.

## Steps

1. **Family Controls approval record.** Confirm Apple has *approved* (not merely assigned) the Family Controls
   distribution request for all five bundle IDs: `com.johansardar.excerlock`, `.monitor`, `.shield`,
   `.shieldaction`, `.report`. Evidence: the approval email, or the Capability Requests page. Portal
   `FAMILY_CONTROLS_DISTRIBUTION` was verified present on all five on 2026-09-09; Recovi was auto-rejected in
   that exact state (`research/recovery-postmortem.md` §2 Round 1). If not approved, file the request now for
   any ID missing it — this is the long pole.
2. **App ID capabilities.** `asc bundle-ids capabilities add --bundle CP88689L49 --capability SIGN_IN_WITH_APPLE`,
   then `PUSH_NOTIFICATIONS`, then `ASSOCIATED_DOMAINS`. Re-list and record.
3. **Paid Apps Agreement, banking, tax.** `asc web agreements status --apple-id johansardar77@gmail.com --output table`
   (interactive). Record the output. If pending, the Account Holder accepts it.
4. **IAP metadata.** For the six products in `04-identity-and-money.md` §6: localized display name and
   description, review screenshot, price tier, subscription group localization. Target state `READY_TO_SUBMIT`.
   Decide: delete or leave the 45 grid products. Record `asc subscriptions list --app 6787265352` after.
5. **Supabase.** Project ref, anon key, service role in `~/.excerlock/env` (already present per
   `research/infra-audit.md` §6 — confirm). Enable Apple, Google, Email OTP, anonymous sign-ins. Register the
   native app (Team `AX3C2B78YD` + `com.johansardar.excerlock`) for Sign in with Apple; register the Apple
   Services ID and Google OAuth client. Without step 5's native registration, Apple sign-in silently no-ops.
6. **EAS.** Confirm the plan tier includes update code signing; if yes, `eas codesigning:generate` and put the
   private key in `~/.excerlock/`, never the repo.
7. **Device.** Name the physical iPhone (model, iOS) and confirm a sandbox Apple ID exists and is signed in
   under Settings › App Store › Sandbox Account.
8. **Domain.** `excerlock.com` serves `/.well-known/apple-app-site-association` with an `applinks` block
   naming `AX3C2B78YD.com.johansardar.excerlock` (empty paths fine).

## Acceptance

- [ ] `evidence/T00/` holds: approval evidence for 5 IDs · capabilities list for 5 IDs · agreement status ·
      subscriptions list with six `READY_TO_SUBMIT` · Supabase provider screenshot · EAS plan/tier · device
      name · AASA fetch.
