---
name: appbuildingnotes-off-limits
description: Never read or search /Users/johansardar/AppBuildingNotes unless Johan explicitly asks in that conversation
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ce27061-d063-4850-a7fd-e2e0e3db079a
  modified: 2026-07-22T23:17:26.090Z
---

Do NOT access `/Users/johansardar/AppBuildingNotes/` (specs, teardowns, research, reports — anything under it) from the ExcerLock project unless Johan explicitly tells you to in the current conversation. This includes spawning subagents that read it.

**Why:** On 2026-07-22 Johan interrupted a research agent that was mining AppBuildingNotes teardowns and asked that the folder never be entered again without explicit permission. He had the spec copied into the project instead.

**How to apply:** The ExcerLock spec now lives at `/Users/johansardar/ExcerLock/excerlock-app-prd.md` (cross-references to AppBuildingNotes research files stripped). Use that copy. If information seems to only exist in AppBuildingNotes, ask Johan first instead of going in.
