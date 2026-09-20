# ExcerLock Security Audit

Audit date: 2026-09-20 UTC  
Repository: `JohanSardar/excerlock-app`  
Audit status: remediation in progress; this report does not claim that the
product is vulnerability-free.

## Governing method

This audit used Cursor's installed `review-security` skill and exactly one
`security-review` subagent. The review was performed against the branch
changes and also inspected unchanged security-sensitive product paths. The
subagent found no new medium, high, or critical vulnerability in the
remediation diff and confirmed that the existing fixes did not reopen the
reviewed issues.

The audit covered:

- `app-next` React Native/Expo production code, runtime configuration, OTA
  update guards, deep-link routing, analytics and Sentry scrubbing, local
  persistence, subscription identity, and native Screen Time/enforcement
  modules and entitlements.
- The Fastify server's authentication, authorization, vendor OAuth, webhook
  verification, subscription resync, account deletion/revocation, request
  validation, rate limiting, error handling, database access, and readiness
  routes.
- Deployment shell scripts, Azure/cloud-init/Caddy/systemd configuration,
  CI workflow permissions and action pinning, E2E service clients, and
  secret-handling boundaries.
- Injection, SSRF, CSRF/CORS, proxy trust, URL/deep-link handling, file
  handling, PII and sensitive logging, dependency supply chain, and
  production transport/configuration defaults.

No credentials were rotated, production data or infrastructure was changed,
or deployment was performed.

## Tools and evidence

The following checks were run during the audit:

- Cursor `review-security` / `security-review` full-surface review.
- `npm audit --omit=dev --audit-level=moderate` at the root.
- `npm audit --workspace app-next --omit=dev --audit-level=moderate`.
- `npm audit --workspace server --omit=dev --audit-level=moderate`.
- `osv-scanner scan source --lockfile ...` for the root and server lockfiles.
- `gitleaks detect --no-banner --redact --source .`.
- `semgrep scan --config p/security-audit`.
- Focused Fastify route, environment, vendor, dependency guardrail, and
  Python E2E harness tests.

The final validation commands and their pass/fail results are recorded below
as they are completed. Static scanners can report findings from development
tools and historical documentation even when the production server does not
load those code paths; those findings are separated from production risks
instead of being silently discarded.

## Confirmed findings remediated

### SEC-001 — Environment-controlled E2E clients could misroute credentials

- Severity: Medium in the test/operator tooling threat model.
- Attack path: A compromised environment file or CI variable could point the
  E2E API, Supabase admin client, Adapty server client, or PostHog query client
  at `file:`, HTTP, an attacker-controlled HTTPS host, a URL with embedded
  credentials, or a nonstandard port. The clients would then send bearer,
  service-role, server, or personal API credentials to that destination.
- Remediation: `app-next/e2e-next/harness.py` now requires HTTPS, rejects
  embedded credentials, query/fragment data, and non-443 ports, and enforces
  explicit trusted host/suffix allowlists. `adapty.py`, `posthog.py`, and
  `supabase.py` route their configured URLs through the validator.
- Regression evidence: `RemoteURLValidation` in
  `app-next/e2e-next/test_harness.py` covers file URLs, HTTP, credentials,
  untrusted hosts, ports, and trusted service clients.

### SEC-002 — Direct clients could spoof `X-Forwarded-For` and evade IP limits

- Severity: Medium.
- Attack path: Fastify previously trusted every proxy. A client reaching Node
  directly could supply arbitrary `X-Forwarded-For` values, causing the global
  rate limiter to attribute requests to rotating IPs.
- Remediation: `server/src/index.ts` trusts only loopback proxy addresses,
  matching the documented Caddy topology (`127.0.0.1` / `::1`).
- Regression evidence: the proxy metadata test in
  `server/test/routes.test.ts` verifies that a direct connection's forwarded
  header is ignored.
- Residual operational requirement: If production later adds a non-loopback
  reverse proxy, its fixed proxy address must be added deliberately and the
  Node port must remain firewalled.

### SEC-003 — Unexpected server and vendor errors disclosed internals

- Severity: Medium.
- Attack path: An unhandled exception could return its original message,
  exposing database/configuration details. Vendor failures also returned
  messages such as missing secret names to authenticated callers.
- Remediation: `server/src/index.ts` now maps unexpected errors to stable
  generic 4xx/5xx envelopes. `server/src/routes/vendorRouteSupport.ts` now
  returns generic configuration, upstream, and request-failure messages.
- Regression evidence: `server/test/routes.test.ts` asserts that a thrown
  `database password=...` message is absent from the response.
  `server/test/vendor-routes.test.ts` asserts that missing configuration
  details are not disclosed.

### SEC-004 — Production could bind publicly and accept insecure service URLs

- Severity: Medium.
- Attack path: The previous default bound the server to `0.0.0.0`, exposing
  the application port if network controls drifted. Production URL settings
  were not uniformly required to use HTTPS and could contain private URL
  credentials.
- Remediation: `server/src/env.ts` defaults production to `127.0.0.1` and
  requires HTTPS without embedded credentials for Supabase, Clerk, vendor
  OAuth, PostHog, and Sentry URLs. Deployment documentation and cloud-init
  retain the loopback/Caddy topology.
- Regression evidence: `server/test/env.test.ts` verifies the production
  HTTPS/credential checks and the loopback default.
- Residual operational requirement: An explicit `HOST` override can still
  intentionally bind another interface. Production operators must keep
  `HOST=127.0.0.1` and firewall port 3000; the application cannot prevent an
  operator from deliberately overriding this setting without a product
  deployment-policy decision.

### SEC-005 — First-deploy SSH trust and IP-only HTTP provisioning were unsafe

- Severity: High for a first-deploy interception or plaintext deployment.
- Attack path: `StrictHostKeyChecking=accept-new` trusted the first key
  presented by a host, allowing a first-connection MITM to receive deployment
  credentials and files. Azure provisioning also allowed a bare-IP `:80`
  Caddy site before DNS/TLS existed.
- Remediation: `deploy/deploy.sh` requires
  `StrictHostKeyChecking=yes` for SSH and rsync. `deploy/README.md` now
  requires out-of-band host-key verification. `deploy/azure-provision.sh`
  requires a validated DNS hostname, and cloud-init no longer provisions a
  plaintext bare-IP API vhost.
- Regression evidence: `scripts/security-dependencies.test.cjs` checks the
  strict SSH option. The provisioning script validates `DOMAIN` before
  rendering Caddy configuration.
- External action required: Operators must verify and pre-populate
  `known_hosts` before the first deployment and ensure the DNS A record points
  to the VM before Caddy obtains a certificate.

### SEC-006 — CI actions used mutable tags

- Severity: Medium supply-chain risk.
- Attack path: A tag such as `actions/checkout@v4` can be retargeted upstream;
  a compromised or hijacked release tag would execute in the repository's CI
  context.
- Remediation: All `actions/checkout` and `actions/setup-node` uses in
  `.github/workflows/ci.yml` are pinned to reviewed immutable commit SHAs with
  version comments.
- Regression evidence: `scripts/security-dependencies.test.cjs` rejects
  mutable checkout/setup-node tags and requires the pinned SHAs.

### SEC-007 — Vulnerable transitive URL/parser packages were left unconstrained

- Severity: Moderate supply-chain risk.
- Attack path: Vulnerable transitive versions of `decode-uri-component`,
  `@xmldom/xmldom`, and `fast-uri` could be pulled into installs and become
  reachable through parser/URL handling code.
- Remediation: Root overrides pin `decode-uri-component` to `0.5.0`,
  `@xmldom/xmldom` to `0.8.15`, and the existing server lock resolution
  contains patched `fast-uri` versions. Both Expo Jest configurations
  explicitly transform the ESM decoder so the security upgrade does not
  regress the existing test harness.
- Regression evidence: `scripts/security-dependencies.test.cjs` checks the
  root URL-parser version and both backend `fast-uri` resolutions.

### SEC-008 — Vitest mocker path traversal advisory in test tooling

- Severity: Moderate, development-only.
- Attack path: The affected `@vitest/mocker` versions can read files outside a
  dev-server project root through an untrusted redirect mock registration.
  This is not a production server path, but it is a confirmed vulnerable
  dependency in the repository's test tooling.
- Remediation: All workspace Vitest declarations and lockfile copies were
  upgraded to `4.1.11`, which contains the upstream fix. The security
  dependency test now enumerates every root and server lockfile Vitest/mocker
  entry.
- Regression evidence: `scripts/security-dependencies.test.cjs` passed its
  Vitest version assertion.

### SEC-009 — Nano ID zero-size custom generator could loop indefinitely

- Severity: Moderate, development/build tooling.
- Attack path: The vulnerable `nanoid` versions can loop indefinitely when
  attacker-controlled code passes a zero size to a custom generator.
- Remediation: The root and standalone server lockfiles resolve `nanoid`
  `3.3.18`, which contains the fix for the affected 3.x line.
- Regression evidence: `scripts/security-dependencies.test.cjs` checks every
  locked Nano ID copy in both lockfiles.

### SEC-010 — Evidence verifier used attacker-shaped regular expressions

- Severity: Low/Medium for local verification availability.
- Attack path: `verify-launch-evidence.cjs` interpolated normalized evidence
  into a new regular expression. Crafted evidence/phrase input could cause
  excessive regex work.
- Remediation: Phrase matching now uses bounded `String#indexOf` iteration
  and explicit word-boundary checks.
- Related hardening: E2E cache identity now uses SHA-256; MD5 fixture keys
  explicitly declare non-security use.

### SEC-011 — E2E shell evaluation was flagged without a real attacker path

- Severity: Not a confirmed vulnerability.
- Triage: `capture-final-flows.py` evaluates scripts selected from a fixed,
  repository-controlled flow map. It does not evaluate user-controlled
  source. A nosemgrep annotation documents that trust boundary.

## Dependency and scanner residual risk

These findings remain visible in dependency scanners and are intentionally
not described as fixed:

1. `npm audit --omit=dev --audit-level=moderate` still reports 30 moderate
   root-workspace advisories, and the equivalent `app-next` audit reports 17.
   The remaining chains include:
   - `stream-json@1.9.1` through `jayson` and Clerk's Solana wallet
     dependency graph. The upstream fix is `stream-json@3.5.0`, but the
     current `jayson@4.3.0` dependency range is 1.x; forcing a major
     replacement or replacing the Clerk SDK would be a compatibility/product
     change.
   - `uuid@7.0.3` and `uuid@8.3.2` through Expo build tooling and `jayson`.
     The attempted broad override did not remove all incompatible nested
     copies. A safe fix requires compatible upstream Expo/Clerk/tooling
     releases rather than silently replacing APIs across SDK boundaries.
2. OSV still reports `esbuild@0.18.20` in
   `@esbuild-kit/core-utils`, pulled by Drizzle Kit's TypeScript config
   loader. The advisory concerns esbuild's exposed development HTTP server;
   this dependency is used as a local transform/loader and is not used by the
   production server. The fixed esbuild range is incompatible with that
   deprecated loader's `~0.18.20` requirement. Upgrade Drizzle Kit or its
   loader replacement before forcing this dependency.
3. The backend production audit is clean:
   `npm audit --workspace server --omit=dev --audit-level=moderate` reported
   `found 0 vulnerabilities`. The server deploy uses `npm ci --omit=dev`,
   which excludes the remaining development-only esbuild chain.

Recommended external follow-up is to update the Clerk/Expo and Drizzle Kit
dependency chains in a dedicated compatibility change, then rerun npm audit,
OSV, app builds, and runtime tests. No production credential rotation is
inferred from these scanner-only findings because the scans did not identify
an exposed private key in the repository.

## Secret scan and static-analysis triage

`gitleaks` reported 16 matches. Every match was a `REDACTED` placeholder in
historical recovery documentation or design-generation metadata, or a public
client identifier/DSN-shaped value. No private server key, service-role key,
OAuth secret, signing key, or database credential was found in the scanned
repository. Credential rotation was therefore not performed.

Semgrep's security preset reported two review items:

- `app-store-screenshots/gen.py` uses a fixed `https://api.openai.com` URL;
  the dynamic values are request data or local output paths, not the request
  destination.
- `excer-ui-mock/scripts/vectorize_icons.py` parses XML generated locally by
  the trusted VTracer asset pipeline, not attacker-supplied network XML.

Semgrep also emitted parser warnings for unrelated fixture/generated files
and a timeout on a runtime source file. Those warnings are coverage limits,
not clean results for the affected files; the security-review inspection of
the runtime/deep-link paths found no confirmed medium-or-higher issue.

## Areas reviewed with no confirmed exploitable finding

The security review found existing controls in these areas to be effective:

- Clerk/Supabase JWT verification with explicit algorithm and issuer-mode
  separation.
- Verified-token user scoping on protected routes.
- Hashed, single-use, vendor-bound OAuth state.
- Constant-time webhook authorization/signature comparisons and bounded
  webhook bodies.
- Production-only subscription authorization and vendor event user scoping.
- Account deletion retry/idempotency paths and sign-in revocation sequencing.
- Generic request validation and explicit support/incident error envelopes.
- Deep-link route guards that prevent unauthenticated navigation into
  protected screens.
- Sentry defaults that disable screenshots, view hierarchy, replay, default
  PII, and failed-request capture, with event/breadcrumb scrubbing.
- Expo/native app configuration that keeps research schemes and client
  identity out of production builds.

These are review conclusions, not a guarantee against future regressions.

## Verification status

Completed focused checks:

- `npm run test:security-dependencies` — 6 tests passed.
- `npm run test --workspace server -- --run test/routes.test.ts` — 5 tests
  passed, including the new exception-disclosure regression test.
- `python3 -m unittest test_harness.py` from `app-next/e2e-next` — 42 tests
  passed.
- `npm run test --workspace app-next` — 296 suites and 1,706 tests passed.
- `npm run lint --workspace app-next` — 0 errors (existing warnings only).
- `npm run typecheck` — all workspaces passed.
- `npm run test --workspace server` — 39 files and 234 tests passed.
- `npm test` — repository test, E2E contract, and guardrail stages passed.

The repository's no-mistakes production validation remains the final delivery
gate for this branch. No PR URL is claimed until that gate is green.
