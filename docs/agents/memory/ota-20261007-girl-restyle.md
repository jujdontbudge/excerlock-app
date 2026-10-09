---
name: ota-20261007-girl-restyle
description: Production OTA 2026-10-07 (c7030f26, group c2566883) shipped the girl character, Before and After, warm restyle and Dream Body paywall; shield colour waits for a binary
metadata:
  type: project
---

Johan said "push all of this OTA" on 2026-10-07. It shipped as one commit, c7030f26, on main. That commit holds my girl character work plus another session's uncommitted work: Before and After (S3e), the flat warm off-white restyle with brand #EA6A12, and the Dream Body paywall with masked-view.

- Tag ota-runtime4-20261007-c7030f26, CI run 37715817349.
- EAS group c2566883-de12-4e60-a4ce-d42cda40daba, update 01a11941-1649-7634-bab3-cf7804655898, runtime 4.
- Evidence: `.excer/release/ota-20261007/`.

**Why:** a female gender answer should show a girl wherever the onboarding character appears. Girl frames are `assets/condition-demo/frames*/girl-*.png`, recorded as PROVENANCE v4, pending Johan's approval of the art.

**How to apply:**
- The ShieldConfiguration Swift colour change (#C94710 → #EA6A12) is committed but only ships with the next App Store binary (build 18).
- The untracked root folders `app/`, `condition-demo/`, `design/` and `excer-ui-mock/` (Sep 25, ~4 GB) were deliberately left out of the commit.
- Related: [[app-store-live-runtime4]], [[filming-mode-0064]].
