# Evidence guide

These files are sanitized read-only snapshots for the [incident audit](../README.md). The event cutoff is `2026-10-21T20:21:05Z`, 45 days after `2026-09-06T20:21:05Z`. PostHog project: `537075`. Sentry: organization `edge-ix`, project `excerlock-mobile`, region `https://us.sentry.io`.

## Reproduce the incident measures

From the repository root:

```sh
python docs/audits/payment-failure-2026-10-21/evidence/derive.py
```

This reads only the included exports and writes `derived-metrics.json`. It checks the 35-ID cohort, 17-ID commercial-release-eligible subset, 13-ID ambiguous subset, 1,205 sanitized journey rows, 510 eligible and 209 ambiguous journey rows, 35 successful profile reads, and the independent per-ID funnel reconciliation. It does not call a service or change production data.

For fresh source queries, select PostHog project `537075` and execute the matching `.sql` through its MCP `execute-sql` capability. Preserve the fixed event window and cohort labels. These are the exact executed queries; the result exports remove person/device joins and sensitive context. Do not publish raw query responses or their complete event property payloads.

| Query | Purpose | Sanitized output |
|---|---|---|
| [Q01](Q01-traffic.sql) | Inventory environment, physical/simulator, model and build coverage | [traffic.csv](traffic.csv) |
| [Q02](Q02-cohort.sql) | Enumerate physical-production IDs and client/vendor coverage | [cohort.csv](cohort.csv); excludes `person_id` and device-name arrays |
| [Q03](Q03-journeys.sql), [page 2](Q03-page2.sql), [page 3](Q03-page3.sql), [count](Q03-count.sql) | Ordered generic onboarding, navigation and financial timeline | [journeys.csv](journeys.csv), supplemented with Q08 expiration |
| Q04, local device join | Corroborate two preview-exposed IDs share a device | Device join values deliberately not retained; Q02 preview activity is the independent exclusion criterion |
| [Q05](Q05-payment-signals.sql) | Financial/auth/exposure events with event UUIDs | [financial-events.csv](financial-events.csv), 136 rows |
| [Q06](Q06-release-gap.sql) | Missing-event pattern by build/runtime/OTA | [release-gap.csv](release-gap.csv) |
| [Q07](Q07-vendor-lifecycle.sql) | Discover all vendor lifecycle names by environment | [vendor-lifecycle-counts.csv](vendor-lifecycle-counts.csv) |
| [Q08](Q08-all-vendor-events.sql) | Complete vendor events, regardless of registry vocabulary | [vendor-events.csv](vendor-events.csv), 48 rows |
| [Q09](Q09-funnel-check.sql) | Independent client funnel counts per ID | [funnel-by-id.csv](funnel-by-id.csv) |
| [Q10](Q10-client-event-coverage.sql) | Discover client payment/auth/lifecycle event coverage | [client-event-coverage.csv](client-event-coverage.csv) |
| [Q11](Q11-account-screen.sql) | Account screen reached via Setup instead of sign-in route | [account-screen.csv](account-screen.csv); one excluded preview-exposed identity only |
| [Q12](Q12-install-signin-coverage.sql) | Case-insensitive discovery of installation/application/sign-in event names | [install-signin-coverage.csv](install-signin-coverage.csv); only `sign_in_failed` returned |
| [Q13](Q13-release-eligibility.sql) | Verify the owner's version/build/runtime eligibility rule | [release-eligibility.csv](release-eligibility.csv), 52 ID/metadata groups |

Q03's first request returned 500 rows even with `LIMIT 10000`. Page 2 starts at offset 500, page 3 at offset 1000. Independent count: 1,204. The initial whitelist omitted `trial_expired`; Q08 supplies that one additional row. The page boundaries have different timestamps. There are two groups of tied `(timestamp, anon_id, event)` screen records with different onboarding steps: four on an excluded identity and two on `292f3ba9…`. They are retained, not deduplicated, and their intra-timestamp order is not interpreted as actual display order. Re-querying a mutable analytics store can produce late/backfilled records, so compare against the saved count before treating a fresh extraction as equivalent.

Q10 reported taxonomy warnings for the explicitly queried application lifecycle event names. The warnings were removed before parsing the returned pipe-delimited table; those names alone cannot establish that other installation event names are absent. Q12 independently searched case-insensitively across install/application/sign-in/sign-up names and found only `sign_in_failed`. No restore-success or subscription-verification-failure event was returned by Q10. This is absence in observable telemetry, not proof that these actions never occurred.

`cohort_status` is `production_candidate`, `possibly_internal_review`, `excluded_preview`, `sandbox_only`, or `outside_physical_prod_cohort`. Here `production_candidate` means the owner's commercial release range: 1.0.0/1.0.1, builds 17–21, runtimes 4–6, physical production activity, no preview or Sandbox exclusion. Only the incident ID is independently confirmed real by the owner; distribution source is not separately captured. Filter on that explicit label before reporting commercial impact. `session_index` is a local per-ID sequence, not the original session UUID. Condition branch screens are labeled `condition_flow`; no answers or activity values are retained. Original event UUIDs remain only in financial/vendor exports where they help reviewers locate the source record.

## Sentry

The [financial/authentication extract](sentry-financial-auth-errors.csv) contains only bounded titles, timestamps, release/OTA metadata and the known network event ID. It has no user/contact/network identity, breadcrumbs, free text or raw resource payloads. Duplicate records at the same second are retained: they are reports, not unique people.

Read-only MCP calls used `search_errors` with organization `edge-ix`, project `excerlock-mobile`, `period=45d`, region `https://us.sentry.io`, chronological sort and limit 100. Fields: timestamp/title/release/environment/runtime_version/update_id; requesting `id` did not return usable IDs in most rendered search rows. The following searches establish the financial/authentication subset:

```text
environment:prod AND (message:"Apple sign-in failed" OR message:"Subscription verification failed" OR message:"Canonical subscription identity unavailable")

message:"#2005" OR message:"Purchase failed" OR message:"Paywall expired" OR message:"subscription operation is already running"

environment:prod message:"Saved sign-in could not be read" timestamp:>=2026-09-06T20:21:05 timestamp:<2026-10-21T20:21:05
```

The first two source searches used the 45-day relative period during the October 21 snapshot. Every retained financial/authentication row falls inside the fixed PostHog window. A broader production-title aggregation was checked for missed financial/authentication classes; the tool translated explicit timestamps into its absolute range while displaying a relative-period label. Its unfiltered output is not included because it contains unrelated diagnostics. No issue status, assignment, dashboard or alert was changed.

Review in Sentry: [network incident](https://edge-ix.sentry.io/issues/EXCERLOCK-MOBILE-1A), [production financial/authentication search](https://edge-ix.sentry.io/explore/discover/homepage/?dataset=errors&query=environment%3Aprod%20AND%20%28message%3A%22Apple%20sign-in%20failed%22%20OR%20message%3A%22Subscription%20verification%20failed%22%20OR%20message%3A%22Canonical%20subscription%20identity%20unavailable%22%29&project=4511832219189248&statsPeriod=45d). Links use a rolling window; saved CSV timestamps define this audit's evidence.

Sentry event detail establishes network event `0dbe1e69792848f9acfc6d251188ce73` at `2026-10-21T15:33:15.041Z`. The search extract is second-resolution. Raw event detail is intentionally omitted because vendor resources can include personal metadata even when JavaScript telemetry strips it.

## Adapty and App Store Connect

[adapty-profiles.json](adapty-profiles.json) is a whitelisted snapshot of HTTP GET `/api/v2/server-side-api/profile/`, using the anonymous/canonical ID in the `adapty-customer-user-id` request header and `ADAPTY_SECRET_KEY` for authentication. The existing server implementation is [`subscriptions/lib/resync.ts`](../../../../server/src/packages/subscriptions/lib/resync.ts). All 35 profile reads succeeded. The installed, authenticated Adapty CLI provided no historical profile timeline operation; no billing/export/dashboard mutation was performed.

The JSON retains billing product/environment/date/cancellation fields, access-level dates, non-subscription count and `total_revenue_usd`. **The revenue field includes Sandbox amounts and must never be summed as real receipts.** Current profiles can omit historical/transferred purchases; the event export and snapshot must be read together. Snapshot request times are about five minutes later than the event cutoff.

[asc-read-status.json](asc-read-status.json) records successful read access to app `6787265352`, no configured `ASC_VENDOR_NUMBER`/`ASC_ANALYTICS_VENDOR_NUMBER`, and zero existing analytics report requests. No report request was created. Apple-side sales/subscriber/refund reconciliation remains blocked by the missing vendor configuration. Credentials were sourced privately and are not present in these artifacts.

## Private owner-account exclusion check

After the owner's clarification, read-only identity GETs were authenticated with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Each of the 35 known UUIDs was compared privately against the supplied owner account, including linked identity email fields. [owner-account-match.json](owner-account-match.json) retains only the UUID, HTTP status and match boolean; all 35 reads succeeded and no match was found. A bounded read-only current-directory lookup also found no match; [owner-directory-match.json](owner-directory-match.json) retains no contact fields or other account attributes. These results cannot rule out deleted/alternate/relay identities or prove that the preview/device cluster is not the owner's. No location inference was used.

## Integrity

[provenance.json](provenance.json) records window/source/sanitization rules. [derived-metrics.json](derived-metrics.json) contains the recomputed counts and exact reset-ID sets. [data-verification.txt](data-verification.txt), [check.txt](check.txt) and [document-verification.txt](document-verification.txt) record final verification. These files contain no app behavior changes or simulator evidence.
