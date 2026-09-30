---
status: accepted
date: 2026-09-30
---

# 0051: Isolated TestFlight Sandbox authorization process

## Decision

For internal TestFlight verification, run a second server process with `SUBSCRIPTION_AUTHORIZATION_STORE_ENVIRONMENT=sandbox` on localhost port 3002 and expose it only under `https://api.excerlock.com/testflight/` through a path-stripping Caddy handler. The existing Production process remains on port 3000 and authorizes only Production. A Preview iOS binary embeds the `/testflight` base path and the Sandbox store environment at build time; an App Store binary never selects an authorization partition from an HTTP request.

Both processes currently use the existing on-device/API identity and the existing PostgreSQL database, where Adapty's Sandbox webhook events are already mirrored in a separately keyed partition. The sidecar disables its duplicate deletion retry worker. It is a separate authorization deployment, **not** an isolated test identity database or a new entitlement source. Do not route production app traffic to it or switch Production's environment.

## Context

TestFlight build 15 used the Production API and a Production admission expectation, even though TestFlight StoreKit transactions are Sandbox. Its client also rejected the deployed API's older response contract. The Sandbox webhook receiver has already recorded a current active Sandbox state in the existing partition, so moving the Adapty webhook URL would discard timely evidence and add dashboard risk. A second service with a server-owned environment is a smaller repair than accepting an environment field from the client or turning Production authorization to Sandbox. The VM's port 3001 serves the website contact service; port 3002 was free at decision time.

## Consequences

The internal TestFlight build can exercise account-bound Sandbox admission without allowing Sandbox receipts into Production's authorization route. The shared database and credentials mean TestFlight users still operate on real accounts and the existing account deletion semantics; no test-data isolation is claimed. Deployment of the common server code changes both processes and must be verified against Production health/readiness and the Sandbox sidecar after every deploy. A physical-device purchase/restore and authenticated target-UID check remain mandatory before calling the user journey fixed. An App Review/public-release strategy for Apple's Sandbox review transactions remains separately unresolved.

## References

- [ADR 0050](0050-hard-paywall-journey-and-account-bound-admission.md)
- [TestFlight 15 admission incident](../plans/testflight-15-paid-admission-incident.md)
- `deploy/Caddyfile`, `deploy/excerlock-api-testflight.service`, `deploy/deploy.sh`
