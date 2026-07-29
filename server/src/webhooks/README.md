# Webhooks

Contract: hides verified inbound Adapty and notify-only vendor webhook transport. Invariants: receivers
validate and delegate; they never compute balances or earnings.

Fixtures: signed, invalid, and replayed payloads arrive with the first webhook test. Test with
`npm run test:server` from the repository root.
