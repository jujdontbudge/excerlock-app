---
status: accepted
date: 2026-09-15
---

# 0029: One guided two-app linked test flow

## Decision

Replace the recorder-initiated, multi-surface linked test with one guided path across the two research apps. The operator taps **Start test** in Trace Lab; Trace Lab mints the session UUID and the 256-bit one-time nonce, starts the linked background trace, and opens Walking Recorder through the lab-only `excerlock-walkingrecorder://linked-session` link. Walking Recorder records that link at once with no activity label, keeps the honest foreground labels and the two operator-observed canary answers inline in its single recording state, and **Finish test** finalizes its archive and returns to Trace Lab through `excerlock-linked-trace://linked-trace`. Trace Lab then saves the trace file and shows both export surfaces (trace file, Walking Recorder archive) plus local deletion.

The lab Trace Lab build boots straight into that screen (`BootGate` redirects when the research flag is compiled in) instead of the production onboarding/paywall stack. App-created consent checkboxes and duplicate setup controls are removed. The canary-safety rule is stated inline at the point of need: pick exactly one harmless app, never Walking Recorder or ExcerLock Trace Lab. iOS hands the host app only opaque `FamilyActivitySelection` tokens, so the native preflight can prove the shape of the selection (exactly one application, no categories, no web domains) but never which app was chosen; the screen says that plainly instead of implying a check that cannot exist. Unavoidable iOS permissions (Screen Time, Motion & Fitness, the Family Controls app picker) are requested inline at the point of need, each with one explanation and one action button; the screen never claims it can grant them. Both canary observations stay (release while walking, shield after standing still past the stop grace) because they are the visible outcome evidence the offline joiner needs. Trace Lab also installs one lab-only always-active walking-state rule with the trace and removes it as soon as no trace is running, so the canary exercises ExcerLock's real release-while-walking / shield-after-grace policy through the production runtime path inside the isolated lab sandbox; production rules and storage are never read or written.

A test counts as finished only when Walking Recorder's own return link arrives. Trace Lab becoming active again or its periodic status check can never turn a freshly running test into **Test finished — save it**. Finalization writes a durable `finalized-v1.json` marker beside the trace in the lab App Group, and the shareable copy is rebuilt on demand, so both local exports remain available after a Trace Lab relaunch or after iOS purges the temporary export copy.

## Context

The accepted linked-recorder design (ADR 0027) let Walking Recorder create the one-time link and required the operator to complete Trace Lab consent, preflight, canary and motion steps across several surfaces, then return to the recorder. The captain's direction is that this is unusable in practice: two apps, many consent screens and buttons, no clear single action. The measurements still have to stay accurate, so the simplification must not remove evidence — only steps that can be inferred or performed at the moment they matter.

Both apps remain separate: Walking Recorder is the unentitled foreground ground-truth recorder, Trace Lab is the ExcerLock-like background measurement build. Because Trace Lab holds the active trace and the recorder holds the nonce in its protected recovery file, the return link is what lets Trace Lab finalize after the recorder finished; a relaunch on either side lands back on the correct current step (running → waiting for the recorder, returned → save the trace, expired → delete).

Considered alternatives: (a) keep the recorder-initiated flow and only merge screens — rejected, it still requires the operator to start one app, leave it, and come back with a second app as the entry point; (b) let Trace Lab persist the nonce itself — rejected, it duplicates the one-time link into a second store and weakens the single-owner recovery model; (c) drop the canary observations to reduce taps — rejected, the visible shield/release outcome is the only human evidence the joiner cannot infer; (d) keep the operator's harmless-canary checkbox — rejected, the picker already states the one-harmless-app rule inline and a second confirmation surface is exactly the clutter the captain rejected; (e) refuse a canary natively by comparing bundle identifiers — impossible, because the host app cannot read the identifiers behind the opaque selection tokens.

## Consequences

- A person picking up the phone follows three numbered lines and one primary action per app state; every permission is explained where it is requested, and no screen claims access can be self-granted.
- The joiner contract is unchanged: the recorder archive still carries `linkedTraceRequested`, `linkedSessionId`, protocol version, `canary_outcome` events for `walking` and `stationary`, and the Trace Lab trace still starts and stops with the same link. Only the direction of the initiating link changed.
- Trace Lab now needs Walking Recorder installed to start a test; if the link cannot be opened, the trace stays running and the screen says so, and the recorder can still be opened by hand.
- After an expired trace is deleted the screen returns to Start (Trace Lab always mints a fresh session), so a stale link can never restart a deleted trace; starting a session whose directory already exists is still refused by `LinkedTraceWriter`.
- A finalized trace stays in the lab App Group until the retention window ends and can be re-shared after a relaunch; the newest saved test carries the one primary action and deletion is a quiet, confirmed text action underneath it.
- The lab-only link contract has one owner per side (`plugins/linkedRecorderLinks.js`, `RecorderLinkedLink`): the guardrail executes the JS owner and parses the recorder plist/project semantically, while the executable URL builder/parser behavior is covered by `LinkedTraceScreen`/`linkedRecorderLink` jest tests and the recorder's `LinkedLinkTests`.

## References

- [0027: Isolate linked background recorder instrumentation](./0027-isolate-linked-background-recorder.md)
- [0028: Standalone research runtime for Trace Lab](./0028-standalone-research-runtime.md)
- [`app-next/src/research/linkedTrace/LinkedTraceScreen.research.tsx`](../../app-next/src/research/linkedTrace/LinkedTraceScreen.research.tsx)
- [`app-next/src/research/linkedTrace/linkedRecorderLink.ts`](../../app-next/src/research/linkedTrace/linkedRecorderLink.ts)
- [`tools/phone-walking-recorder/Sources/CaptureController.swift`](../../tools/phone-walking-recorder/Sources/CaptureController.swift)
- [`app-next/scripts/prove-linked-recorder-on-phone.sh`](../../app-next/scripts/prove-linked-recorder-on-phone.sh)
