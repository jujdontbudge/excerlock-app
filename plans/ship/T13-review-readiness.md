# T13 — Review readiness (B51; `05-review-readiness.md`)

> Scope revision (Johan, 2026-09-10): submission metadata/review preparation is deferred, NOT completed, to `../post-ship/README.md` F01. Keep the implemented reviewer preset and published legal/support functionality.


## Steps

1. Reviewer preset: a `review_preset` PostHog flag **and** a Review-Notes-documented gesture (enter the name
   `App Review` on O04) that creates a walking step-goal condition with goal 20 steps and today's window, so
   the reviewer can unlock by walking to the window. Not a dev route; ships in release; documented.
2. App Review Information text (Notes, demo credentials not required, contact) drafted in
   `docs/asc/review-notes.md` and set via `asc`.
3. Privacy nutrition labels set via `asc` from the manifest's collected types; matches `PrivacyInfo.xcprivacy`.
4. Metadata: description, keywords, screenshots from the release build (`asc screenshots` pipeline), support
   and privacy URLs live.
5. Walk every line of `05-review-readiness.md` A–G with evidence.

## Acceptance

- [ ] `evidence/T13/` has one artifact per checklist line; the checklist file is fully ticked with links.
