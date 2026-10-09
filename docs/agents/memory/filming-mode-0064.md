---
name: filming-mode-0064
description: Johan's hidden filming mode (7 taps on the Settings version) shipped by OTA 2026-10-03; must be removed or disclosed before the next App Store submission
metadata:
  type: project
---
On 2026-10-03 Johan asked for walking to unlock and lock in about a second so he could film videos. He chose a hidden switch sent by OTA over a separate USB build.

What shipped:
- Commit 4d6d614f, released as production OTA group f35f1a17 (runtime 4) with tag ota-runtime4-20261003-4d6d614f.
- In production, seven taps on the Settings version footer toggle it for 2 hours. In dev builds the dev menu has a Filming mode switch.
- Replay of recorded walks gives an unlock 0.6–0.8 s after walking starts and a lock 0.9–1.0 s after stopping. Real iPhone timing is unverified until Johan tries it.
- Recorded in ADR 0064, as an owner-approved exception to the OTA reach rule in docs/ota.md.

**Why:** Johan wants walking-unlock videos. It is a hidden capability in an App Store build, which carries a Guideline 2.3.1 risk.

**How to apply:**
- Before submitting build 18 or any later build, remove the gesture or disclose it in Review Notes.
- Number ADRs on the gym and treadmill branches around 0064: gym takes 0062, treadmill 0063.
- Related: [[gym-unlock-bugs-165]], [[treadmill-false-unlock-163]], issue #167.
