# TestFlight 15 paid-admission incident — 2026-09-30 UTC

Status: **root cause confirmed at the client/server boundary; user-specific StoreKit/account ownership not yet verified. Do not call build 15 fixed or upload another paid-admission candidate against the same backend.**

## Observed

After an apparent successful TestFlight purchase and sign-in, the app remained at “Checking your subscription” with the generic retry message. That message is emitted by `journey/index.ts` when `ServerSubscriptionAdmission.verify()` returns `unavailable`. It does not distinguish a network outage from an incompatible response or an environment mismatch; the screenshot alone is not an HTTP trace or ownership proof.

## Read-only production evidence

- `POST https://api.excerlock.com/v1/subscription/resync` is registered (unauthenticated: 401; a nonexistent sibling route: 404). `/v1/health` and `/v1/ready` returned 200. Neither health nor unauthenticated probes prove an authenticated resync succeeds.
- Read-only SSH inspection of the **deployed** `/opt/excerlock/server/dist/packages/subscriptions/lib/resync.js`: returns `{ authorization, observations, syncedAt }` and uses `authorizeProduction(production, syncedAt)`. It has **no `accountId` or `verifiedAt`**. The deployed configuration has `ADAPTY_SECRET_KEY` and `ADAPTY_WEBHOOK_SECRET` configured, and no `SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT` override. No secret contents were read out or printed.
- Read-only aggregate SQL on the deployed PostgreSQL mirror found three Sandbox `access_level_updated` deliveries, most recently `2026-09-30 04:17:00.973+00`, and one Sandbox subscription state: `active`, `has_access=true`, `sync_state=current`, expiry `2026-09-30 16:49:13+00`. No UID, receipt, transaction or personal activity data was queried or recorded. This is strong timing evidence that Sandbox delivery works; without an authenticated account check it does **not** prove that the screenshot owner's UID is the state owner.
- Signed build 15 embeds the `production` update channel and the `prod` client environment; see `docs/releases/2026-09-29-testflight-1.0.0-15.md` and `/tmp/excerlock-tf15-evidence/distribution-verification.log`. `clientConfiguration.ts` maps `prod` to **Production** admission. Apple TestFlight purchases use **Sandbox** StoreKit transactions ([Adapty TestFlight guide](https://adapty.io/docs/test-purchases-with-testflight)).
- The shipped WIP client's `ServerSubscriptionAdmission.parseResponse()` rejects the deployed response because `accountId` and `verifiedAt` are absent. Even if that schema were accepted, its requested Production environment would not match a Sandbox purchase; changing one side alone does not repair admission. Production must never authorize Sandbox receipts.

## Correct repair and release gates

1. Deploy an **isolated Sandbox authorization backend** implementing the current `accountId`/`verifiedAt` contract, with server-selected `SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT=sandbox`, its own safe auth/DB/webhook routing and recovery/deletion behavior. Do not flip the production API to Sandbox or accept a client-provided environment. A separate backend/deployment and any Adapty webhook dashboard change require explicit authorization under `AGENTS.md`; neither was done during this incident.
2. Build an internal TestFlight binary with `EXCERLOCK_ENV=preview`, its embedded API URL pointing to that isolated backend, and no production-channel OTA contamination. The added build preflight rejects a Preview build pointed at `api.excerlock.com`. Preflight must check the actual signed binary, backend route contract and environment before upload; `./excer check` alone cannot prove this.
3. Prove authenticated resync for the **same canonical UID** and Sandbox event, then fresh purchase, canceled purchase, restore, webhook lag, account switch/transfer and relaunch on a physical TestFlight device. Simulator fixtures cannot establish this. Do not retry checkout just to work around the verification screen; use Retry, Restore purchases or Account and help.
4. Keep the production backend on Production authorization and independently verify its own response contract before any production/App Review build. App Review also uses Sandbox transactions; a dedicated review-time lane/decision is still needed before declaring an App Store release fixed.

## Local correction and focused evidence

- `app-next/config/environment.ts` now rejects a Preview build configured with the Production API URL. A manual preflight passed with non-secret dummy values for rejection/acceptance.
- `app-next/src/packages/journey/index.ts` replaces inaccurate “Retry when connected” copy with a neutral verification failure that states Retry does not start a purchase. `app-next/app/sign-in.tsx` exposes Account and help without granting app access.
- `./excer check`: **20/20 passed** in `/tmp/excerlock-hard-paywall-implementation` after these edits.
- Focused headless simulator proof `launch/unavailable-proof-recovery-access`: `.excer/proof/launch/2026-09-30_04-29-35/` (Retry and Account and help visible; help opens Restore purchases and Help and feedback).
- Focused headless simulator proof `launch/unavailable-proof-fails-closed`: `.excer/proof/launch/2026-09-30_04-29-59/` (Journey verifying, paid no, admitted no, protected route mounts None).
- Focused headless simulator proof `launch/wrong-environment-proof-fails-closed`: `.excer/proof/launch/2026-09-30_04-31-34/` (Sandbox/Production mismatch denies admission).
- Focused headless simulator proof `launch/account-bound-proof-matches`: `.excer/proof/launch/2026-09-30_04-31-58/` (matching local fixture still enters the app).
- Focused headless simulator proof `dev-harness/deployed-resync-contract-and-environment-rejected`: `.excer/proof/dev-harness/2026-09-30_04-34-00/` (the real client parser rejects a fixture shaped like the deployed server response and separately rejects a valid-shape wrong-environment response; neither creates a lease). These are local transport fixtures, not a physical StoreKit assertion.
- `./excer server smoke` against throwaway PostgreSQL and stubbed vendors: **passed**, including verified-token-only subject, Production/Sandbox isolation, matching Sandbox grant in a Sandbox-configured server, mismatched Production denial, webhook ordering, Adapty failures and deletion/tombstone effects. This is local simulated-vendor evidence, not proof of a deployed Sandbox backend or this user's UID.

**Build 15 blocker at incident capture:** no isolated Sandbox backend was deployed or integrated with its signed artifact. Another upload against the Production endpoint would have repeated the failure.

## September 30 resolution update

A separate Sandbox-authorizing API process is now deployed at `https://api.excerlock.com/testflight` while the original API continues to authorize Production. The signed internal TestFlight `1.0.0 (16)` embeds that Sandbox path, Preview environment/channel, and the compatible response contract; the deployment, signed binary and ASC processing/group readbacks passed. Release evidence: `docs/releases/2026-09-30-testflight-1.0.0-16.md` on `JohanSardar/hard-paywall-testflight-16` and `/tmp/excerlock-tf16-evidence/`.

**Remaining acceptance blocker:** a real device must still establish that the Sandbox transaction transfers/connects to the selected signed-in canonical UID and then admits Setup/Home. Neither a green simulator fixture nor the aggregate Sandbox mirror row proves that user-specific ownership path. App Review's Sandbox testing with a production-channel binary also remains unresolved.
