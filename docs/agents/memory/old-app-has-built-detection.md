---
name: old-app-has-built-detection
description: "The old app under ExcerLock/app already has working gait-vision treadmill scan, phone placement classifier and native modules; check it before designing anything detection-related"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a33a4ff3-5d95-4524-ab0d-7082a165ed71
  modified: 2026-09-07T19:37:31.241Z
---

Before designing or asking about treadmill, camera, motion or gym detection, read the old app at
`ExcerLock/app/src/signals/` (gait, motion, placement), `app/src/home/treadmill/` and
`app/modules/excerlock-gait-vision` + `excerlock-motion`. They are built and tested. The front camera
faces the user and Apple Vision reads walking from head bob and shoulder/hip oscillation (5 s scan
cap, confidence ring, 15-min propped lease). `docs/specs/treadmill-mode.md` still says "spec, not
built", which is stale.

**Why:** On 2026-09-07 Johan was furious that I proposed a treadmill image classifier and asked how
detection works ("we literally developed the ML scan"). The rebuild register B12 says this is ported
from the old app, not rewritten.

**How to apply:** For any app-next feature that touches sessions, unlock, camera, motion or gym
presence, survey `app/` first and cite the existing controller/provider in the plan. Never ask Johan
how an already-built system works. Related: [[rebuild-plan-and-process]].
