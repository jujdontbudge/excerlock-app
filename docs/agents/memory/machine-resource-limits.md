---
name: machine-resource-limits
description: "Johan's Mac has ~20GB RAM — never spawn large agent fleets, and always shut down iOS simulators when done"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8ce27061-d063-4850-a7fd-e2e0e3db079a
  modified: 2026-08-01T21:53:30.780Z
---

Johan's MacBook has roughly **20 GB of RAM**, not the unlimited headroom a big fan-out assumes.
On 2026-08-01 a ~90-agent Workflow plus accumulated simulators drove it to **23 GB used / 284 MB
free with 1440 processes**, and it crashed his machine. He said: *"every time i ask you to do
somehting you spawn 40 agent get my opcmuet to use 90 gb ram whne it only has 20 and crahs my
computer."*

**Why:** he is paying in wall-clock and stability, not just tokens. A sweep that answers the
question but freezes his laptop is a net loss, and he has to be the one to notice and stop it.

**How to apply:**
- Default to **working directly**. If subagents are genuinely needed, **a couple** — not dozens.
  Never a Workflow fan-out on this machine unless he asks for one by name, and even then check
  free memory first.
- **iOS simulators are the biggest single hog** and they persist across sessions. Five booted
  simulators were running **812 processes**. Before and after any simulator work run
  `xcrun simctl list devices booted`, and shut down everything not in use:
  `xcrun simctl shutdown all` (this recovered ~7 GB instantly).
- Check `top -l 1 -n 0 | grep PhysMem` before starting anything heavy.
- Kill background log streams and Metro when finished — see [[plan-for-thousands-of-users]] for
  the scaling rule that applies to the *product*; this one is about **his hardware**.
