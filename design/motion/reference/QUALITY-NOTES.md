# Observation quality log

2026-09-06: T00 is not yet accepted.

The first video calls produced screen inventories and numeric motion claims but relied heavily on OCR. Source-frame inspection caught false visual statements: OtterLife's primary buttons are purple, not yellow; Unrot's welcome is a blue-sky/green-field scene, not a dark canvas. The initial raw files are preserved for audit, not endorsed as accurate.

- `raw/otterlife-00.md`, `raw/otter-01.md`, `raw/unrot-00.md`: require correction before merging.
- Normalized frame-difference arrays are not measured element displacement. Do not use them as easing curves or claim they prove per-frame positions.
- Subsequent prompts require actual image viewing, coordinates/frame IDs for measured positions, and explicit estimates/unavailable measurements.
- `raw/vision-smoke-check.md`: Gemini accurately described the source Unrot image when explicitly asked to view it, confirming image inspection works through agy.
- All extracted strips are actual source frames. Their timestamps follow the raw manifests and remain subject to review.

No app code or task completion depends on an unverified raw draft.
