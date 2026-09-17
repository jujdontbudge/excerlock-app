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
