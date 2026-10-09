---
name: test-findings-fix-or-ticket
description: Every bug found during testing must be fixed immediately or get a GitHub issue — a results doc alone is not enough
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d28477ff-4ff0-4876-83bc-a18812943bdd
  modified: 2026-08-06T21:51:07.543Z
---

When testing surfaces a bug, either fix it immediately or file a GitHub issue for it in the same session. Documenting it only in a results/findings file is insufficient.

**Why:** Johan (2026-08-06, after the #84 device smoke run): "the point of any testing is that when you test and find an error you fix it immediately or file a ticket for it." Findings buried in a results doc have no owner and no tracking.

**How to apply:** During any test/smoke/QA run: cheap, safe, run-critical fixes → fix inline (TDD). Everything else → `gh issue create` with repro, timestamps, analysis, and fix direction, then cross-link the issue numbers back into the results artifact. Dev-infra/harness flakes may stay as doc notes unless Johan asks otherwise. See [[plan-for-thousands-of-users]] for the severity lens.
