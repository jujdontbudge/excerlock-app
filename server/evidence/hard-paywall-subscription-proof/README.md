# Hard-Paywall subscription proof transport

Local-only verification on September 29, 2026. No production service,
dashboard, data, purchase or deployment was touched.

## Latest local run

`./excer server smoke` passed on commit `32094000` on September 29, 2026 against a fresh throwaway
Postgres 16 container. The exact case mapping is in
`docs/plans/hard-paywall-local-proof-inventory.md`; this file is the durable
server evidence record because the smoke intentionally retains no database,
credentials, tokens, or vendor payloads after teardown.

## Static gate

`./excer check` passed all 20 checks after the final mutation.

## API and database smoke

`./excer server smoke` passed against a throwaway Postgres 16 container and
stubbed Adapty, PostHog and Supabase endpoints. The smoke built the server,
applied migrations, confirmed `/v1/health` and `/v1/ready`, then established:

- subscription verification derives the account only from a valid Supabase
  token and rejects client account/environment/access input;
- missing, forged, expired, wrong-issuer and wrong-audience credentials are
  denied; verified anonymous and canonical subjects can provision only their
  own token subject;
- an account with no mirrored observation returns `unknown` with no access;
- a current Production webhook observation authorizes only a server process
  configured for Production;
- independently keyed Sandbox access cannot authorize that Production process;
- the same Sandbox observation authorizes only a separately started process
  configured for Sandbox;
- newer denial wins over an older late renewal, replay remains idempotent, and
  both environment rows are removed by account deletion while the opaque
  delivery ledger remains unlinked for retry safety.
- Adapty 429, 500, timeout and malformed responses return the same fail-closed,
  non-enumerating response and create no subscription grant;
- the fifth resync remains allowed and the sixth is rate limited with the
  generic `RATE_LIMITED` response;
- the subscription mirror and webhook ledger contain no raw receipt,
  credential or raw-payload columns, the identity spine does not copy email,
  location diagnostics are rejected, and deletion database effects are
  asserted directly.

This proves S01–S06 and S10–S12 locally. It does not prove S07–S09, live webhook
delivery, StoreKit ownership, Adapty restore/transfer semantics, a deployed
TestFlight Sandbox backend or a physical-device Journey. Stubbed profile
responses are deliberately not described as authoritative ownership evidence.
