---
name: judge-by-top-consumer-app-ux
description: Johan wants every product rule judged against what a polished million-dollar consumer app would do; recorded ADRs are not a reason to keep bad UX
metadata:
  node_type: memory
  type: feedback
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-03T19:41:39.620Z
---

Judge every behavior and every ADR by one test: would a top consumer app do this to a paying user? If not, flag it and propose the fix. Don't keep a rule just because an ADR records it.

**Why:** On 2026-10-03 Johan found that the app forgot his sign-in on every cold launch and sent him back to the first onboarding page. ADR 0049 had made that a rule on purpose, and he was angry that nobody had questioned it ("you need to think before doing anything"). He then asked for an audit of all ADRs and of how the app behaves on close, reopen and in the background.

**How to apply:**
- Before building a decision that affects what users see, check it against normal consumer-app behavior.
- On big multi-step asks, restate his intent and wait for confirmation before acting.
- Related: [[plan-for-thousands-of-users]], [[test-findings-fix-or-ticket]].
