# ExcerLock App Store screenshots

Working folder for the marketing screenshot set (mirrors the Reform mockup process in
`~/AppBuildingNotes/_archive/reform-mockups/MOCKUP_BRIEF.md`).

Process
1. `html/` — HTML mockup outlines: iPhone frame, Dynamic Island/status bar, real headline + body
   copy, grey placeholder UI blocks. Screenshotted as composition references.
2. `prompts/` — one written GPT Image 2 prompt per screen (numbered per round).
3. `rounds/` — every generation, `<screen>-r<N>.png` (raw) and `-crop.png`. Never overwrite.
4. `finals/` — the picked round per screen at App Store geometry.

Generation: `gen.py` (generations or edits endpoint, `gpt-image-2`, key from `~/.openai_key`).

Product truth guardrails: walking-based shield; shields while not walking, releases after real
motion while walking; no "magic" claims (Always-Location, background suspension, seated-shake
are known limits). Brand is ExcerLock only. UI style: `design/UI-STYLE.md` (orange gradient,
black outlines, light mode, no orange body text).

Default screen set (captain may change): problem → promise → how walking works → proof → CTA.

## Approved set (2026-09-17, captain sign-off)
`finals/01-hero.png` … `finals/06-reviews.png` — the six frames to publish to App Store Connect
(1290×2796, 6.9" iPhone). Source round: `rounds/r2-unrot/` (GPT Image 2.5 Sunburst, quality low,
edits of the `html/outline-r1.html` frames; style spec in `STYLE-R2.md`; prompts in `prompts/*-r2.txt`).
Order: hero → block apps → exercise to unlock → choose your rules → screen time down → reviews.

2026-09-19 honesty pass: 01, 04 and 06 re-edited (`prompts/hero-r2d-edit.txt`, `rules-r2b-edit.txt`,
`reviews-r2b-edit.txt`; rounds `hero-r2d`, `rules-r2b`, `reviews-r2b`) to drop the unsubstantiated
rating/user-count laurels and named reviews, the non-1.0 "Steps exchange" / "Run 5 km" conditions and
the wrong unlock durations. 06 is now the Screen Time / privacy frame. Edit prompts must not contain `;`
— `gen.py` passes the prompt through `curl -F`, which treats `;` as an option separator and truncates it.
