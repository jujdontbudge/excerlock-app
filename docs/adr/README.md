# Architecture decision records

## Index

- [0046: Concept packages in strict layers](0046-concept-packages-in-strict-layers.md) — **accepted**.
- [0045: Verify through the real app and static checks; no tests, no comments](0045-verification-over-tests-and-no-comments.md) — **accepted**.
- [0044: One lean agent context shared by Claude Code, Pi and Hermes](0044-lean-cross-harness-agent-context.md) — **accepted**.
- [0043: Sign-in and each condition's permissions follow the paywall; Home keeps one reminder card](0043-sign-in-and-permissions-after-the-paywall.md) — **accepted**.
- [0042: The first App Store binary carries an OTA-ready sensor surface and a JS-callable review sheet](0042-ota-ready-native-sensor-surface-and-review-port.md) — **accepted**.
- [0041: The raw stream corroborates Apple's walking legs and confirms stops](0041-raw-stream-corroborates-apple-and-confirms-stops.md) — **accepted**.
- [0040: Background walking asks for its grants on Home and reports every shield move](0040-background-walking-grants-at-point-of-need.md) — **accepted**.
- [0039: In-app incident reports carry a bounded, denylisted diagnostic snapshot](0039-in-app-incident-reports.md) — **accepted**.
- [0038: Device startup stage medians come from a real xctrace capture](0038-device-startup-stage-medians.md) — **accepted**.
- [0037: Simulator startup stage medians come from the unified log](0037-simulator-startup-stage-medians.md) — **accepted**.
- [0036: Walk keep-alive stays Always location, without the blue indicator](0036-walk-keep-alive-no-background-indicator.md) — **accepted**.
- [0035: Remote stride-gate thresholds behind measured clamps and a kill switch](0035-remote-stride-gate-configuration.md) — **accepted**.
- [0034: Explicit raw-stream suspension evidence in Walking Recorder archives](0034-explicit-raw-stream-suspension-evidence.md) — **accepted**.
- [0033: Startup stage signposts and a fixture-verified numeric parse](0033-startup-stage-signposts.md) — **accepted**.
- [0032: PostHog flag rails with one production consumer per registry entry](0032-posthog-flag-consumers.md) — **accepted**.
- [0031: Install Sentry at the entry and keep thrown Error messages](0031-entry-sentry-install-and-error-messages.md) — **accepted**.
- [0030: Recoverable and cancellable running linked test](0030-recoverable-cancellable-linked-test.md) — **accepted**.
- [0029: One guided two-app linked test flow](0029-guided-linked-test-flow.md) — **accepted**.
- [0028: Standalone research runtime for Trace Lab](0028-standalone-research-runtime.md) — **accepted**.
- [0027: Isolate linked background recorder instrumentation](0027-isolate-linked-background-recorder.md) — **accepted**.
- [0026: Isolate the phone motion recorder from the shipping app](0026-isolate-phone-motion-recorder.md) — **accepted**.
- [0025: Main is the release source](0025-main-is-the-release-source.md) — **accepted**.

- [0008: Share installed agent capability inventory](0008-share-installed-agent-capability-inventory.md) — **superseded** by 0044.

- [0007: Restore kept capabilities across coding agents](0007-restore-kept-agent-capabilities.md) — **superseded** by 0044.

- [0001: Coordinate releases and retire agent work conservatively](0001-coordinate-releases-and-retire-agent-work.md) — **accepted**.
- [0002: Minimal default agent context](0002-minimal-agent-context.md) — **superseded** by 0007.
- [0003: Four explicit on-demand skills](0003-four-on-demand-skills.md) — **superseded** by 0004.
- [0004: Share core skills across agent CLIs](0004-share-core-skills-across-agent-clis.md) — **superseded** by 0044.
- [0005: Prefer CLIs for iOS and service operations](0005-cli-first-ios-and-service-tooling.md) — **accepted**.
- [0006: Route web extraction by source type](0006-route-web-extraction-by-source-type.md) — **accepted**.
- [0023: Honest release reviewer preset](0023-reviewer-preset.md) — **accepted**.

## Recording decisions

Every core architectural decision belongs here in a short file explaining what was decided, why, and the project's state when the decision was made. Document the rationale that code cannot explain: constraints, assumptions, meaningful alternatives and consequences.

- Read relevant ADRs before changing architecture; check status rather than treating every historical record as current authority.
- Copy [TEMPLATE.md](TEMPLATE.md) to the next unused `NNNN-short-title.md`. Keep existing numbers stable and use one decision per file.
- Record the decision with the change that makes or implements it. Use `proposed` until settled; `accepted` does not by itself mean implemented. State implementation status in Context and link supporting code, issues or specs.
- Add each ADR to this README's index with its title and current status. References to ADRs should state their status.
- Preserve history: mark a replaced decision `superseded` and link the replacement; use `deprecated` when retired without a replacement. Do not delete or silently rewrite the original rationale.
- Keep records concise. Do not invent past reasons or turn routine coding choices into ADRs.

- [0024: Keep account access after subscription lapse](0024-keep-account-access-after-subscription-lapse.md) — **accepted**.
