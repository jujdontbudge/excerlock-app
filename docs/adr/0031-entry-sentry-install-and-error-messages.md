---
status: accepted
date: 2026-09-16
---

# 0031: Install Sentry at the entry and keep thrown Error messages

## Decision

The production entry (`app-next/index.js`) imports `src/runtime/observability/SentryStartup`
before every other import. That module reads the embedded client configuration, installs the
crash reporter through the existing `@sentry-binding` alias (a no-op in the linked-recorder
research bundle), and never throws: an unreadable configuration skips the install and leaves
the boot gate to surface the failure with UI. `createClientServices` keeps its call, and
`initializeSentryOnce` makes the later call a no-op after the entry install.

The scrubber (`src/runtime/observability/sentry.ts`) no longer rewrites
`exception.values[].value` to `[redacted]` for thrown `Error`s; their message survives. It
still redacts exception text the SDK synthesized from a non-`Error` capture
(`mechanism.synthetic === true`), because that text is derived from arbitrary captured
values. Every other scrubbed property class (message/logentry, user, request, contexts,
breadcrumbs, attachments, and the `extra`/`tags` allowlists) is unchanged.

## Context

The audit (`data/payment-analytics-a1/report.md` §3.7) found that a crash before the runtime
boot gate was never reported, and that a thrown `Error`'s message never survived the
scrubber. Both are now review-readiness gaps (plan A5). The SDK previously installed inside
`createClientServices`, behind hydration and the async boot gate that
[0013](./0013-async-production-runtime-ownership.md) defines, so only errors after a
successful boot could reach Sentry. The scrubber's blanket `[redacted]` predates the audit's
finding that this codebase's thrown messages carry no PII.

Alternatives considered: keeping lazy init and accepting no pre-boot capture (rejected by
the captain's decision), installing before hydration from the provider (still after React
mounts, and the provider is not shared by cold TaskManager launches), and keeping all
exception values redacted while hashing a fingerprint (rejected: triage needs the message,
and the audit already treats thrown messages as safe). The install keeps the entry-order
contract from [0013](./0013-async-production-runtime-ownership.md): bootstrap/task
registration still precedes Expo Router, and no native graph is constructed at import time.

## Consequences

- A throw on the way to the boot gate, and native crashes before the SDK would previously
  have installed, reach Sentry.
- The SDK is evaluated at entry in every environment; the research bundle resolves the same
  import to its lab-local no-op binding. The lab bundle now also carries the client
  configuration parser (it embeds no identity values or SDKs), so the artifact scanners'
  forbidden markers are unaffected.
- Thrown `Error` messages appear in Sentry; synthetic captures stay redacted. Sentry filters
  must not be relied on to hide PII from thrown messages.
- Failed installs stay silent at entry by design, and the boot gate remains the only owner of
  user-visible configuration failures. The runtime still constructs lazily; only
  observability moved earlier.
- `src/runtime/observability/__tests__/SentryStartup.test.ts` pins the install, the entry
  order, and the capture path through a mock transport; `sentry.test.ts` pins both scrubber
  classes.

## References

- `app-next/index.js`
- `app-next/src/runtime/observability/SentryStartup.ts`
- `app-next/src/runtime/observability/sentry.ts`
- [0013: Async production runtime ownership across UI and background tasks](./0013-async-production-runtime-ownership.md) — **accepted**
- [0020: Anchor the mobile Sentry core at the workspace root](./0020-anchor-mobile-sentry-core.md) — **accepted**
