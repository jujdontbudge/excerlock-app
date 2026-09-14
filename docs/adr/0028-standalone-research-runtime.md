---
status: accepted
date: 2026-09-14
---

# 0028: Standalone research runtime for Trace Lab

## Decision

Add a second, non-development Linked Recorder environment: `EXCERLOCK_ENV=lab` together with `EXCERLOCK_LINKED_RECORDER_TRACE=1` builds a **standalone research Release artifact** with an embedded JavaScript bundle. The `lab` environment is a first-class build/client/runtime environment: Expo config accepts it, `runtimeMode('lab', …)` always selects the real native runtime (never demo services, in any configuration), and the client configuration reader accepts it. `lab` without the trace flag is refused, and the trace flag still refuses anything except `dev` (Metro) or `lab` (standalone).

The standalone prebuild excludes `expo-dev-client`, `expo-dev-launcher`, and `expo-dev-menu` from the generated Podfile, strips the dev-launcher URL scheme, Bonjour service, and local-network keys from the built `Info.plist`, and pins the already-installed lab Device/Development provisioning profiles per target by their installed names. `scripts/build-linked-recorder-standalone.sh` always performs a clean prebuild plus Release build with the double opt-in exported for both phases, and `scripts/verify-standalone-research.cjs` verifies the signed artifact (embedded bundle with the research screen, embedded Expo config booting the `lab` environment with updates off, lab identity and App Group only, lab-only URL schemes, no associated domains, no dev-client/LAN/OTA marker).

Research builds carry only lab link identifiers. They register the `excerlock-linked-trace` scheme (plus Expo's bundle-identifier scheme) and nothing else: no production Google OAuth reversed-client-ID scheme and no `applinks:excerlock.com` associated domain, so iOS can never route a production sign-in redirect or universal link into the co-installed Trace Lab. The embedded client configuration names a lab-only placeholder Google client that satisfies the runtime redirect contract; Trace Lab signs in with Apple or email.

## Context

ADR 0027 isolated the linked-recorder experiment but implicitly tied the research runtime to a development build: `runtimeMode()` threw `Missing or invalid runtime environment for a release build` for every non-`__DEV__` research build, and the Expo config required `EXCERLOCK_ENV=dev`. Phone install evidence (`data/linked-recorder-phone-install-v3/report.md`) shows the consequence: the only working Trace Lab artifact was a Debug expo-dev-client build that needed a Metro dev server on the Mac, and the preserved Release build crashed at `AppRuntimeProvider`. The captain's requirement is that the linked test harness does everything on the phone, records locally, needs no awake or connected Mac during a test, and can be retrieved after reconnecting. A second latent issue was found while fixing this: a `dev` research build takes the demo/fake runtime (`runtimeMode('dev', true) === 'fake'`), so the preflight screen's prerequisites were never exercised against the real native graph.

The unavoidable correction is therefore not a build flag but a named environment that is valid in a release configuration, plus the native exclusions that make the artifact genuinely standalone. Expo links the dev client in Release too (`@expo/prebuild-config` force-applies the `expo-dev-client` auto plugin, and `expo-dev-launcher`/`expo-dev-menu` autolink independently), so the Podfile and Info.plist must be corrected at prebuild time, not just left unused.

Considered alternatives: (a) keep requiring a Metro-hosted `dev` build and host Metro persistently — rejected, it does not meet the phone-only requirement; (b) mark the `dev` environment valid in release via `runtimeMode` — rejected, it would collapse dev/demo semantics into a release build and leave the dev client linked; (c) remove `expo-dev-client` from `package.json` — rejected, it is still wanted for ordinary Metro development.

## Consequences

- The operator can install a signed Trace Lab Release build, run a complete linked session on the phone with no Mac service, and retrieve/export after reconnecting. The launch regression (release bundle throwing at runtime boot) is covered by unit tests, the real Expo-loader smoke test, and the artifact verifier.
- The `dev` research build remains for Metro-based development; `lab` and `dev` share one configuration owner so identifiers, App Group, updates and observability cannot drift.
- The standalone path depends on the lab Device/Development provisioning profiles existing locally under their installed names; without them the build fails loudly instead of falling back to wildcard signing. It remains a local research build: no EAS profile, no upload, no TestFlight/App Store delivery, no production App Group, no production OAuth or universal-link routing.
- `LinkedTraceWriter` refuses to start a session whose trace directory already exists without an active descriptor, so a stale finalization card in Walking Recorder cannot delete an exported trace; after a nonce-less abandon the screen returns to Start when a new Recorder link is already open.
- `app-next/scripts/standalone-research.test.cjs` and the extended `test-config-smoke.cjs` keep the dev-server dependency from silently returning: they exercise Expo's real config loader plus the artifact scanner's fixture matrix.
- Expo/autolinking behavior is version-dependent; the Podfile patch fails closed if the generated `use_expo_modules!` call shape changes.

## References

- [0027: Isolate linked background recorder instrumentation](./0027-isolate-linked-background-recorder.md)
- [`app-next/plugins/linkedRecorderResearchConfig.js`](../../app-next/plugins/linkedRecorderResearchConfig.js) (single opt-in/identity owner)
- [`app-next/plugins/withLinkedRecorderStandalone.js`](../../app-next/plugins/withLinkedRecorderStandalone.js)
- [`app-next/scripts/build-linked-recorder-standalone.sh`](../../app-next/scripts/build-linked-recorder-standalone.sh)
- [`app-next/scripts/verify-standalone-research.cjs`](../../app-next/scripts/verify-standalone-research.cjs)
- [`app-next/research/linked-recorder/README.md`](../../app-next/research/linked-recorder/README.md)
