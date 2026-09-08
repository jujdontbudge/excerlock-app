# release

Release-time facts about this app that tests can check. Nothing here runs in the app bundle.

- `app-privacy.json` — the App Privacy label as data: every Apple data type the app collects (or
  deliberately does not), whether it is linked to the user, its purposes, and the code that proves it.
  `guardrails/release/privacy-manifest.test.ts` fails when an `analytics.track('…')` call emits an event
  this file does not list, or when an evidence path stops existing. `docs/release/app-privacy.md` is the
  derived, human-readable label to enter in App Store Connect; update the JSON first, then the doc.

This folder must not know anything about screens, ports or stores. It only points at them.
