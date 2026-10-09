---
name: centring-audit-0065
description: Centring by construction (ADR 0065) shipped by production OTA 2026-10-04 (48084fec); every proof now fails on off-centre text/icons
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-04T21:10:51.149Z
---

Johan approved "commit OTA" for the centring work on 2026-10-04.

**What shipped:**
- Commits: b94139cc (the app fix) and 48084fec (the checks and ADR 0065), now on main.
- Production OTA group 58e41b93 on runtime 4, tag ota-runtime4-20261004-48084fec, CI run 37233804106 green.
- Evidence: `.excer/centering/before-after.png`, with `shots/` (before) and `after/`.

**Follow-ups:**
- #168: an onboarding link with an unknown step crashes.
- #169: nested FlatList in the goal picker.
- #170: nine proofs still tap "Sign in", which is stale since 213ba6ac.

**Why:** Johan wanted off-centre text and icons made impossible, not just fixed.

**How to apply:**
- When a proof fails with "off centre", read `<proof>.centring.json` before adding `centring-ignore`. The analyzer judges ink, not intent.
- Animated or single-line TextInputs must use `useInputType`; lint enforces this.
- Related: [[test-findings-fix-or-ticket]].
