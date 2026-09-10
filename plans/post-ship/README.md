# Follow-up spec — after current Ship engineering completion

Status: **TODO / deferred by Johan on 2026-09-10. Nothing below is marked complete.**
This is a separate phase, not a claim that the app is ready for App Review or public release.
Original detailed requirements remain in `../ship/` as references, superseded only where stated here.

## F01 — Submission metadata and review preparation

Reference: `../ship/T13-review-readiness.md`, `../ship/05-review-readiness.md`, T16 metadata steps.
- [ ] Authoritative reviewer contact and territory availability.
- [ ] Required-size screenshots from the real release candidate; remaining subscription review screenshots.
- [ ] Accurate privacy disclosures, required agreements and subscription/version attachments.
- [ ] Review notes and App Store version build selection; run final submission-readiness validation.
Preserve completed fields/screenshots; do not invent contact data, availability or evidence.
The implemented reviewer preset stays in the app and is not rolled back.

## F02 — Formal performance measurement

Reference: `../ship/T15-performance.md` and relevant T14 battery/device checks.
- [ ] Record build-identified physical-device cold startup, interactive readiness and offline startup.
- [ ] Record representative battery/background behavior with device/OS/scenario/duration.
- [ ] Evaluate remaining agreed performance targets and address observed product-impacting problems.
The historical 4 MB Hermes cap is REMOVED and must not be reinstated by this follow-up.
Bundle bytes may be recorded informationally. Crashes/hangs/severe battery faults are not deferred.

## F03 — Optional local StoreKit automation

Reference: `../ship/T05-adapty-paywall-entitlement.md` local-only harness requirements.
- [ ] Resolve supported scheme-to-app StoreKit test binding with actual runtime evidence.
- [ ] Verify local purchase, restore and cancellation behavior if this harness is retained.
- [ ] Keep test-only resources out of normal Release/preview-device/TestFlight artifacts.
A green local harness never substitutes for real sandbox/vendor/device purchase verification,
which remains in the ACTIVE Ship scope. Preserve failed experiment evidence; do not label it passing.

## Release boundary

No App Review submission, public release or production OTA without new explicit authorization.
An uploaded/processed binary is distinct from selecting it for an App Store version and submitting it.
