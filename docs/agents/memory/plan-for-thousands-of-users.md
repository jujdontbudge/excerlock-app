---
name: plan-for-thousands-of-users
description: "Johan's standing rule — every ExcerLock decision must assume thousands of users from day one"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0926d72e-73c0-4d27-9bbd-de450ea04ea7
  modified: 2026-07-29T01:12:13.363Z
---

Mid-grill on the vendor sync-cadence question (2026-07-28, ticket #13), Johan directed: **"plan for thousands of users right away while making any decision."**

**Why:** he doesn't want architectures or defaults that quietly cap the app below thousands of users (the trigger case: polling-only Strava caps at ~50–100 DAU on its app-wide rate limit; the fix was pulling vendor webhooks into v1).

**How to apply:** when any decision has a scaling dimension (rate limits, per-user costs, infra sizing, vendor caps), evaluate it at thousands of DAU — not at launch-week size — and surface the scaling ceiling explicitly before recommending. Recorded in the wayfinder map #1 Notes as a standing preference.
