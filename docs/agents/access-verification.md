# Complimentary access implementation and verification

Verified October 13, 2026 in the `free-access` worktree, based on `db2e8927`. No production data, dashboards, email delivery, deployment, OTA publication, push or merge was used.

## Decision and operator command

[ADR 0077](../adr/0077-email-complimentary-access.md) adds audited server-owned grants by confirmed email to the existing account-bound admission path and subscription Entitlement. Adapty continues to own paid purchases, restores, trials and prices. [Research](../research/2026-10-13-complimentary-access.md) compares RevenueCat entitlements, Adapty manual access and Apple offer codes.

```
./excer access grant creator@example.com --note "UGC Oct" --until 2027-01-01
./excer access revoke creator@example.com --note "Campaign ended"
./excer access list creator@example.com
```

Local commands require `EXCER_ACCESS_DATABASE_URL` pointing to an isolated loopback database. For the deployed VM, add `--prod`; **grant/revoke then change production data and require the owner's explicit authorization**. Production is the default authorization partition; `--environment sandbox` selects Sandbox independently. See [the operator workflow](access.md).

Email matching trims and lowercases; dots, plus tags and Apple relay addresses remain exact. An indefinite grant's response lasts at most 24 hours offline. A finite grant expires at the earlier of that boundary and its specified expiry. No paid three-day grace applies to complimentary admission. Revocation clears complimentary access on the next authoritative check; valid paid access remains.

## Verification environment and limits

The real compiled Fastify API ran against isolated Postgres 16, with independent Production/Sandbox authorization processes at loopback ports 4306/4307. A real local Supabase GoTrue instance issued the simulator's email-code sessions, and Mailpit on port 4325 received every email. Both `./excer server ready --url ...` checks passed: [Production](../../.excer/access-evidence/ready-production.txt), [Sandbox](../../.excer/access-evidence/ready-sandbox.txt).

The headless worker simulator was `ExcerLock-free-access`, UDID `7E02B9A1-E96C-4322-98CB-81292F4D8753`, in the hidden worker set; Metro used 8095. The existing build 18 Debug/runtime 5 binary was reused, including for uninstall/reinstall. Simulator.app stayed closed.

The development-only loopback harness uses the production Supabase email adapter, identity coordinator, server admission parser and Adapty Entitlement adapter. Adapty SDK, telemetry, sensors and Screen Time are stand-ins. An empty SDK profile arrives two seconds after identify. The reused binary raises `KeyChainException: A required entitlement isn't present`; the harness therefore injects namespaced AsyncStorage session storage. [Keychain blocker](../../.excer/access-evidence/keychain-blocked.txt). This proves the JavaScript path and persistence policy; it does not prove signed Keychain storage or native shields.

API account/provider fixtures used locally signed JWTs and real GoTrue administrator records. The simulator flows used actual OTP-issued sessions. Provider labels on fixtures do not prove real OAuth. Evidence and local launcher configuration remain ignored under `.excer/`; OTPs, session tokens and local secrets are not committed.

## Scenario results

| Scenario | Result | Evidence |
|---|---|---|
| Grant before first confirmed signup | Pass: real Welcome → Sign in → email code → Home, no purchase; database grant precedes email confirmation | [Welcome](../../.excer/access-evidence/welcome-before-sign-in.png), [challenge](../../.excer/access-evidence/email-code-challenge.png), [Home](../../.excer/access-evidence/complimentary-home.png), [database](../../.excer/access-evidence/welcome-database-effect.json), [API results](../../.excer/access-evidence/api-scenarios.json) |
| Grant after an existing unpaid account | Pass: Paywall → Close → Welcome → email code → Home; same canonical account | [Home](../../.excer/access-evidence/existing-unpaid-granted-home.png), [database](../../.excer/access-evidence/existing-unpaid-database.json), [sink metadata](../../.excer/access-evidence/email-code-sink-existing.json), API results |
| Mixed case and surrounding whitespace | Pass: CLI and confirmed-email matching, including the existing-account simulator grant | API results; [grant metadata](../../.excer/access-evidence/existing-unpaid-grant.json) |
| Google and Apple account with matching confirmed email | Pass for server provider fixtures; blocked for real Google/Apple OAuth | API results |
| Unconfirmed account email | Pass: no complimentary admission | API results |
| Request-supplied email/account/environment | Pass: rejected; token subject and server environment remain authoritative | API results |
| Revoked active grant | Pass: established Home → CLI revoke → next online launch check → Paywall | [before](../../.excer/access-evidence/before-revoke-home.png), [database](../../.excer/access-evidence/ui-active-to-revoked.json), [proof](../../.excer/proof/account/2026-10-13_19-54-53/result.json) |
| Expired grant | Pass: API denies without a cleanup job; exact finite expiry is persisted | API results; [boundary](../../.excer/access-evidence/finite-until.json), [snapshot](../../.excer/access-evidence/finite-remembered-admission.json) |
| Email with no grant | Pass: different confirmed unpaid account signs in from Welcome and sees Paywall; previous account's grant does not follow | [account/database](../../.excer/access-evidence/non-granted-account.json), [proof](../../.excer/proof/account/2026-10-13_20-02-50/result.json), [sink metadata](../../.excer/access-evidence/email-code-sink-nongranted.json) |
| Existing paying account | Pass with paid webhook mirrors: paid source retained with a grant and after revoke; real StoreKit purchase remains blocked | API results; [additional results](../../.excer/access-evidence/additional-scenarios.json) |
| Sandbox versus Production | Pass: grants, revocations and paid mirrors remain partitioned in both API processes | API results |
| Cold relaunch and late empty SDK profile | Pass: Home before/after process death, including after reinstall | [first proof](../../.excer/proof/account/2026-10-13_19-38-54/result.json), [reinstall proof](../../.excer/proof/account/2026-10-13_20-01-24/result.json) |
| Reinstall | Pass for local harness: explicit own build uninstall/install → Welcome → fresh email code → Home → cold Home; signed Keychain persistence blocked | [Welcome](../../.excer/access-evidence/reinstall-welcome.png), reinstall proof, [sink metadata](../../.excer/access-evidence/email-code-sink-reinstall-final.json) |
| Offline before response expiry | Pass: stop isolated API/auth services, keep Metro, cold launch remains Home | [proof](../../.excer/proof/account/2026-10-13_19-44-58/result.json) |
| Offline after finite expiry | Pass: cold launch closes protected access to verification, with no complimentary three-day grace | [proof](../../.excer/proof/account/2026-10-13_19-46-54/result.json) |
| Indefinite grant offline cap | Pass: server response bounded to 24 hours | Additional results |
| Paid vendor outage | Pass: grant still admits; authoritative grant removal is returned even when paid state is unknown | Additional results |
| Confirmed-email lookup outage | Pass: independently paid account still admits | Additional results |
| Gmail alias rewriting | Pass: plus alias does not inherit base-address grant; normalization deliberately preserves dots and tags | API results |
| Audit, replacement and idempotent revoke | Pass: actor/time/note retained; replacement has one active normalized recipient/lane and separate audit events | API results; additional results |
| Concurrent operator grants | Pass: two simultaneous CLI processes succeed, one grant remains active, both grants and replacement revoke are audited | [database](../../.excer/access-evidence/concurrent-cli.json) |
| Account deletion | Pass: matched grants revoked/anonymized and recipient/audit notes erased | API results |
| Migration replay | Pass: grant data survives replay and CLI remains usable | Additional results |
| Invalid expiry and remote local DB URL | Pass: impossible dates and non-loopback database URLs rejected; full ISO impossible date also rejected with exit 2 | Additional results |
| Old client rejects the new source | Expected failure: focused Home proof fails with old parser; restored implementation passes | [old result](../../.excer/proof/account/2026-10-13_19-23-59/result.json), first/reinstall proofs |

The revoked proof initially failed on obsolete headline capitalization, while its captured screen was already the Paywall. Its assertion now uses stable recovery controls, and the final proof passes. Earlier local harness runs failed on startup/precondition setup; those are not claimed as passes. Every focused proof had a five-minute outer timeout.

## Focused paid-path regressions

| Check | Result | Evidence |
|---|---|---|
| Matching account admission | Pass for the captured matching scenario: Home and active paid admission | [result](../../.excer/proof/launch/2026-10-13_20-03-49/result.json) |
| Wrong-account admission demo | Blocked: both runs ended with missing verification labels because the requested scenario did not finish loading; captured state remained `subscription-proof-matching` | [initial failed run](../../.excer/proof/launch/2026-10-13_20-04-34/result.json), [fresh-state attempt](../../.excer/proof/launch/2026-10-13_20-08-35/result.json), [loader blocker](../../.excer/access-evidence/regression-loader-blocked.json) |
| Wrong-environment, paid purchase and restore demos | Blocked before attempting these proofs: the same native-location failure prevents loading their required demo states | Loader blocker |
| Actual StoreKit purchase/restore | Blocked/unperformed: local Adapty SDK is a stand-in; no store or third-party dashboard was touched | Verification environment above |

`FakeRuntime` supplies a native location reader even for these subscription demos. Its readiness rejects `getCurrentPositionAsync` with `LocationUnavailable`, so `dev.load` rejects before applying the requested scenario. Explicit three-slash dev links reached the developer menu; its selected scenario remained unchanged. Seeding a synthetic location in the owned worker simulator did not clear the rejection. Investigation stopped instead of expanding the proof timebox or changing native code. These demo failures are not passing account-rejection evidence and are not diagnosed as a complimentary-access regression. The independent real-account email isolation and server environment/input rejection checks above passed. No full feature suite or cross-feature sweep was run.

## Changed files

- Server storage/migration: `server/src/packages/db/{schema,index,readiness}.ts`, `server/drizzle/0011_complimentary-access.sql`, `server/drizzle/meta/{_journal.json,0011_snapshot.json}`.
- Server identity/admission/erasure: `server/src/packages/identity/confirmedEmail.ts`, `server/src/packages/subscriptions/{accessCommand,index}.ts`, `server/src/packages/subscriptions/lib/{complimentaryAccess,repository,resync}.ts`, `server/src/routes/subscription.ts`, `server/src/packages/user-deletion/lib/drizzleRepository.ts`.
- Client JavaScript: `app-next/src/packages/ports/SubscriptionPort.ts`, `app-next/src/packages/subscription/{AdaptySubscriptionAdapter,ServerSubscriptionAdmission,rememberedAdmission}.ts`, `app-next/src/packages/runtime/createClientServices.ts`, `app-next/src/packages/runtime/lib/{createIdentityServices,createRuntime,LocalAccessHarness}.ts`.
- CLI/workflow/evidence contracts: `tools/excer/{main.ts,commands/access.ts}`, `AGENTS.md`, `docs/subscriptions.md`, `docs/adr/0077-email-complimentary-access.md`, `docs/research/2026-10-13-complimentary-access.md`, `docs/agents/{access,access-verification}.md`, `.agents/skills/verify-excerlock/references/features/account.md`.

No unit test files, native code, native modules, dependencies, permissions, entitlements or paywall/trial screen files changed. Final static evidence: [check output](../../.excer/access-evidence/check-final.txt). The branch commit is identified in the handoff message and git history.

## Remaining release steps

1. Lead review/integration, then an explicitly authorized server deploy through the release lock and `deploy/deploy.sh` dry run. Migration `0011_complimentary-access` is forward-only and deployed with the server journal. Check Production and Sandbox health/readiness after deployment.
2. Confirm existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the service. No new environment variable, secret, Adapty configuration, access-level API call or store product is required.
3. Validate the production CLI's existing `gcloud`/SSH/sudo/systemd transport after deployment; it was deliberately not executed here. Authorize each production grant/revoke separately or as an explicit scoped batch.
4. Publish the JavaScript OTA for runtimes 4/build 17 and 5/build 18 only when authorized. The changes are OTA-safe by source inspection and use existing native capabilities; signed runtime 4/5 activation remains blocked/unperformed.
5. Release verification still needs signed Keychain persistence, real Apple/Google sign-in using the actual confirmed/relay email, physical Screen Time enforcement, and actual StoreKit Sandbox/Production purchase and restore checks. Local provider fixtures and SDK stand-ins do not prove these.
