---
name: lane-sessions-use-opus
description: "Johan's directive (2026-07-29) — spawn all \"Fable\" agent sessions (headless lanes and cmux sessions) with --model opus (Opus 5), not --model fable"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ce27061-d063-4850-a7fd-e2e0e3db079a
  modified: 2026-07-29T16:59:11.846Z
---

When orchestrating ExcerLock (or similar loops), the intelligence-lane sessions Johan calls "Fable agents" must be spawned with `--model opus` (Opus 5) instead of `--model fable`, per his instruction on 2026-07-29 ("from now on making all fable session opus 5 sessions instead"). Codex lanes are unaffected.

**Why:** Johan's explicit cost/capability tradeoff choice for lane work.

**How to apply:** In spawn commands: `claude --dangerously-skip-permissions --model opus -p ...`; also add `--model opus` to cmux interactive session spawns. The orchestrator session itself stays whatever Johan launched it with.
