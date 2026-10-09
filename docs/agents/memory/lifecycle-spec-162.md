---
name: lifecycle-spec-162
description: "The 2026-10-03 lifecycle overhaul — stay-signed-in fix on branch fix/stay-signed-in (ADR 0061), spec issue #162, and Johan's checkpoint before ADR reversals"
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-03T22:07:16.643Z
---

On 2026-10-03 Johan asked to remove ADR 0049 (sign-in on every cold launch), audit every ADR against top-consumer-app UX, and spec correct behavior for close, kill, reopen, offline and updates. He then said "do it" to the restated plan.

**Released 2026-10-03:** commit `213ba6ac` was pushed to main, tagged `ota-runtime4-20261003-213ba6ac`, passed CI, and was published as the production OTA (update group `9ee8cbdb`, iOS update `01a103ce`) at Johan's order. Next is Johan's iPhone check. To roll back, republish the 2026-10-02 update `8a395184`.

State as of 2026-10-03:
- **Branch `fix/stay-signed-in`, commit `213ba6ac`.** It contains:
  - the remembered sign-in (`identity/rememberedSignIn.ts`);
  - the remembered subscription check (`subscription/rememberedAdmission.ts`, 3-day offline grace);
  - the journey `launch` phase and `resumeReturningAccount`;
  - the offline Supabase boot fallback;
  - account activation at startup;
  - ADR 0061.
  - the paywall "Account and help" link;
  - `./excer` scenario loads that wait for the developer menu to close instead of a fixed 3 s (the fixed wait made proofs order-dependent).
- **Verification:** `./excer check` passed on 2026-10-03, and the changed proofs were rerun on the final code.
- **Spec:** issue #162 (`wayfinder:map`). Evidence reports are in `docs/plans/lifecycle/`.
- **Checkpoint agreed with Johan:** show him the ADR reversal list (in #162) and get his yes before building any reversal. Releases (merge, push, OTA) need his explicit yes.
- **Urgent finding:** ADR 0058's fake "4.7 ★ / 50K+ users", testimonials and Oxford/Harvard/Cambridge logos are live via the 2026-10-01 and 2026-10-02 OTAs.

**Why:** Johan was angry that a bad ADR shipped unquestioned. See [[judge-by-top-consumer-app-ux]].

**How to apply:**
- Before building anything from #162, confirm which reversals he approved.
- Real-runtime checks (real Apple sign-in, airplane-mode reopen, Home data on reopen) need a physical iPhone.
- Related: [[app-store-live-runtime4]], [[first-launch-ota-catch-up]].
