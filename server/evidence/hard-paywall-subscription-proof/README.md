# Hard-Paywall subscription proof transport

Local-only verification on September 29, 2026. No production service,
dashboard, data, purchase or deployment was touched.

## Static gate

`./excer check` passed all 20 checks after the final mutation.

## API and database smoke

`./excer server smoke` passed against a throwaway Postgres 16 container and
stubbed Adapty, PostHog and Supabase endpoints. The smoke built the server,
applied migrations, confirmed `/v1/health` and `/v1/ready`, then established:

- subscription verification derives the account only from a valid Supabase
  token and rejects client account/environment/access input;
- an account with no mirrored observation returns `unknown` with no access;
- a current Production webhook observation authorizes only a server process
  configured for Production;
- independently keyed Sandbox access cannot authorize that Production process;
- the same Sandbox observation authorizes only a separately started process
  configured for Sandbox;
- newer denial wins over an older late renewal, replay remains idempotent, and
  both environment rows are removed by account deletion while the opaque
  delivery ledger remains unlinked for retry safety.

This proves the local authenticated transport, environment partitioning and
database effects. It does not prove live webhook delivery, StoreKit ownership,
Adapty restore/transfer semantics, a deployed TestFlight Sandbox backend or a
physical-device Journey.
