# Onboarding orange mockup foundry


## Branches and closing onboarding — 2026-09-05

Built-in GPT Image concept previews, Family D white/orange override. Mobile-design skill informed native inputs and shared scheduling. Verbatim prompts/references: [final-section-prompts.json](final-section-prompts.json).

- [final-walk-place.png](final-walk-place.png): visually reviewed; native image saved without resampling.
- [final-walk-rule.png](final-walk-rule.png): visually reviewed; native image saved without resampling.
- [final-walk-target.png](final-walk-target.png): visually reviewed; native image saved without resampling.
- [final-gym-rule.png](final-gym-rule.png): visually reviewed; native image saved without resampling.
- [final-gym-target.png](final-gym-target.png): visually reviewed; native image saved without resampling.
- [final-run-rule.png](final-run-rule.png): visually reviewed; native image saved without resampling.
- [final-run-target.png](final-run-target.png): visually reviewed; native image saved without resampling.
- [final-bike-rule.png](final-bike-rule.png): visually reviewed; native image saved without resampling.
- [final-bike-target.png](final-bike-target.png): visually reviewed; native image saved without resampling.
- [final-distance.png](final-distance.png): visually reviewed; native image saved without resampling.
- [final-schedule.png](final-schedule.png): visually reviewed; native image saved without resampling.
- [final-reward-time.png](final-reward-time.png): visually reviewed; native image saved without resampling.
- [final-principles.png](final-principles.png): visually reviewed; native image saved without resampling.
- [final-loading.png](final-loading.png): visually reviewed; native image saved without resampling.
- [final-summary.png](final-summary.png): visually reviewed; native image saved without resampling.
- [final-review.png](final-review.png): visually reviewed; native image saved without resampling.
- [final-trial-offer.png](final-trial-offer.png): visually reviewed; native image saved without resampling.
- [final-trial-reminder.png](final-trial-reminder.png): visually reviewed; native image saved without resampling.
- [final-notification.png](final-notification.png): visually reviewed; native image saved without resampling.
- [final-timeline.png](final-timeline.png): visually reviewed; native image saved without resampling.
- [final-paywall-top.png](final-paywall-top.png): visually reviewed; native image saved without resampling.
- [final-paywall-bottom.png](final-paywall-bottom.png): visually reviewed; native image saved without resampling.

### Reference inspection

Brainrot screen280028 inspected via ScreensDesign MCP: research heading and Oxford/Harvard/Cambridge logos. Adapted to habit principles without unsupported institutional endorsement.
OtterLife app2235 replay2937: downloaded full recording to ../../research/otter-replay/replay.mp4; visually inspected sampled trial/paywall segment139–171s, including scrolling top, benefits, reviews, repeated pricing and terms. Evidence contact sheet: ../../research/otter-replay/trial-paywall.jpg. The rest of the25minute product recording was not reviewed end-to-end. Relevant source: https://screensdesign.com/apps/otterlife-ai-health-tracker/?av=2937&ts=139.000

Trial sequence preserved as offer → reminder → permission warmup → native permission at runtime → timeline → paywall. Paywall top/lower mockups are two viewport concepts of one scroll page, not two purchase steps. Actual7day eligibility, prices and subscription products remain unconfigured. Reviews are marked placeholders. No live purchases or permissions triggered.

### Routing and limits

Added while-walking option and skip route. Time inputs are typed minutes; distance alternative uses numeric input and km/mi dropdown. Walking target is conditional, rate mode still needs its specific per-step field state at implementation. Gym location selection remains an implementation dependency. Combined days/times, removed standalone reward-type screen, kept reward amount with rest-of-day option. While-walking skips reward minutes; per-step mode uses configured rate instead. Summary must reflect selected settings; screenshot is illustrative.

Generated-image controls are not live form fields. No exact-size screenshot claim: all fail1206×2622 geometry; retained as board previews.

Corrections: principles body changed to “Movement unlocks the apps you choose.” Reminder's hallucinated file-protection copy replaced with “Review your subscription anytime.” Rejected originals remain in GPT Image output directory.

```json
[
  {
    "id": "walk-place",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-walk-place.png\"\n}\n"
  },
  {
    "id": "walk-rule",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-walk-rule.png\"\n}\n"
  },
  {
    "id": "walk-target",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-walk-target.png\"\n}\n"
  },
  {
    "id": "gym-rule",
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-gym-rule.png\"\n}\n"
  },
  {
    "id": "gym-target",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-gym-target.png\"\n}\n"
  },
  {
    "id": "run-rule",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-run-rule.png\"\n}\n"
  },
  {
    "id": "run-target",
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-run-target.png\"\n}\n"
  },
  {
    "id": "bike-rule",
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-bike-rule.png\"\n}\n"
  },
  {
    "id": "bike-target",
    "result": "FAIL size: got 851x1847, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1847\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-bike-target.png\"\n}\n"
  },
  {
    "id": "distance",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-distance.png\"\n}\n"
  },
  {
    "id": "schedule",
    "result": "FAIL size: got 852x1847, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        852,\n        1847\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-schedule.png\"\n}\n"
  },
  {
    "id": "reward-time",
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-reward-time.png\"\n}\n"
  },
  {
    "id": "principles",
    "result": "FAIL size: got 851x1847, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1847\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-principles.png\"\n}\n"
  },
  {
    "id": "loading",
    "result": "FAIL size: got 852x1846, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        852,\n        1846\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-loading.png\"\n}\n"
  },
  {
    "id": "summary",
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-summary.png\"\n}\n"
  },
  {
    "id": "review",
    "result": "FAIL size: got 851x1847, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1847\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-review.png\"\n}\n"
  },
  {
    "id": "trial-offer",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-trial-offer.png\"\n}\n"
  },
  {
    "id": "trial-reminder",
    "result": "FAIL size: got 853x1844, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        853,\n        1844\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-trial-reminder.png\"\n}\n"
  },
  {
    "id": "notification",
    "result": "FAIL size: got 851x1847, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1847\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-notification.png\"\n}\n"
  },
  {
    "id": "timeline",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-timeline.png\"\n}\n"
  },
  {
    "id": "paywall-top",
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-paywall-top.png\"\n}\n"
  },
  {
    "id": "paywall-bottom",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/final-paywall-bottom.png\"\n}\n"
  }
]
```



## Loop redesign — 2026-09-05

Built-in GPT Image, Family D onboarding override. Verbatim prompts and references: [loop-prompts.json](loop-prompts.json).

- [loop-trend.png](loop-trend.png): visually checked; concept preview only.
- [loop-loop.png](loop-loop.png): visually checked; concept preview only.
- [loop-break.png](loop-break.png): visually checked; concept preview only.
- [loop-reward.png](loop-reward.png): visually checked; concept preview only.
- [loop-picker.png](loop-picker.png): visually checked; concept preview only.

First break frame rejected for composition drift; original retained in generator output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-3dddee43-caed-4623-a2f3-f2ae99e06dd3.png. Corrective prompt (reference: generated loop frame + existing logo):

Edit reference1, preserve EXACT phone size, placement, circle shape, four icon positions, background and button. Change title to 'Let’s break the loop.' Change support to 'ExcerLock adds a pause before you scroll.' On central phone replace feed with orange blocked screen text 'Time to move'. At RIGHT replace 'Open an app' icon with orange running-lock logo from reference2, labelled 'ExcerLock'. Show right circular connector interrupted with a visible gap beside logo. Keep other three old loop nodes 'Feel bored', 'Quick reward', 'Scroll again' but fade them pale gray. Keep Continue unchanged. Do not introduce exercise tiles or change composition.

Removed old cards17–19 and24 from board; retained picker as requested in final image. Replaced old21–23 with 3 story states; graph now17, loop18–20, picker21. Source assets remain recoverable. Preview supplies Continue crossfades, not final element-level animation. Production motion: clockwise arrow trace; Continue inserts logo at right while old nodes fade, then new movement nodes appear clockwise. Respect reduced motion. No addiction-cure claims; graph illustrative.

Validation: all outputs fail exact1206×2622 geometry, retained native unscaled as concept previews.

```json
[
  {
    "id": "trend",
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/loop-trend.png\"\n}\n"
  },
  {
    "id": "loop",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/loop-loop.png\"\n}\n"
  },
  {
    "id": "break",
    "result": "FAIL size: got 853x1844, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        853,\n        1844\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/loop-break.png\"\n}\n"
  },
  {
    "id": "reward",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/loop-reward.png\"\n}\n"
  },
  {
    "id": "picker",
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"design/mockups/onboarding-orange/loop-picker.png\"\n}\n"
  }
]
```


## 001 — Splash preview

Final preview path: 001-splash-preview.png. Built-in GPT Image. Family D onboarding override. Reference: ../../logo-concepts/2026-09-05/concept-4-v3.png. Replaces the pictured AppBlock 002 card only; no reordering or changes to other screens. Native generated PNG embedded without resampling.

Validation: visual content passes (logo identity, ExcerLock spelling, orange/white, no CTA). Exact iPhone geometry verifier fails: native preview is not 1206×2622. This is a board concept preview, not a final production screenshot. No frame stamping or raster scaling applied.

## September 6 revision manifest

New app-selection concept immediately before exercise choice: [FOUNDRY-SELECT-APPS.md](FOUNDRY-SELECT-APPS.md), including verbatim prompt, references and validation. Saved as `select-apps-v1.png`; accepted as concept preview only.

### Smooth multicolor icon revision (v3)

17 concept screens now use simpler rounded multicolor graphic icons without decorative backplates. Original v2 assets remain available. Generation used the built-in GPT image editing tool with existing screens and the user's two OtterLife crops as references; no raster post-processing was applied. Full verbatim prompts, reference paths, generated source paths, final output paths and targeted corrections are recorded in [smooth-icon-generation-record.json](smooth-icon-generation-record.json); original batch prompts are in [smooth-icon-prompts.json](smooth-icon-prompts.json).

Visual inspection: accepted 17 outputs for the board as concept previews. Initial Home and two Settings variants were superseded for mismatched semantic icons and retained with `-rejected` filenames. The final Home restores the streak flame and orange progress; final Settings restores notification bell and units ruler. Minor generated illustration/layout variations remain, including the simplified reward loop and review hero. These are raster concepts, not production UI or exact layout specifications.

Every saved output was checked with the iPhone geometry verifier: all fail exact 1206×2622 size requirements. Detailed machine results are in [smooth-icon-validation.json](smooth-icon-validation.json). No scaling, device-frame stamping, or claim of production geometry compliance. Board generators completed successfully; 13 onboarding concepts and all four main screens were replaced, preserving the flow and horizontal main-screen row.

See [FOUNDRY-REVISION-2026-09-06.md](FOUNDRY-REVISION-2026-09-06.md) for the 13 onboarding icon corrections and four new main-tab concepts, including every verbatim prompt, input/output path and verification result. Accepted only as visual concept previews; exact iPhone size validation failed and no images were resized. Original versions retained.

## Verbatim prompt

Create a portrait iPhone 17 Pro app screenshot at exactly 1206x2622 px. Use case: ui-mockup. Screen: ExcerLock launch/loading splash. Image 1 is the strict logo identity reference: use its filled orange three-piece running padlock, NOT an outline, do not invent a new symbol. This is an AppBlock-inspired minimal splash rebranded for ExcerLock.
White #FFFFFF screen with an extremely subtle pale orange #FFF0E5 wash at the very top, fading smoothly into pure white by the top quarter. Huge calm empty space. Exactly one compact horizontal brand lockup centred horizontally and vertically: the reference orange running lock symbol approximately 46 pt tall on the left, a 12 pt gap, then exact wordmark “ExcerLock” in orange #F25A16 native SF Pro-like semibold sans-serif about 30 pt. Total lockup width about 235pt, balanced optical baseline. Logo is bare on background, no app icon square or tile. No headline, subtitle, spinner, CTA, progress bar, widget, watermark, screensdesign label, cursor, or additional decoration.
Native iOS screenshot geometry: physical display rounded continuous corners, black out pixels outside iPhone 17 Pro display mask, no device body or outer bezel. Black Dynamic Island pill at x415 y42 w376 h110 radius55. Small native black 9:41 status left, cellular Wi-Fi battery right, bottom black home indicator centred x603 y2554 w432 h15. Keep the app surface full screen, not a card. Crisp flat professional UI, no poster or phone render. Preserve logo shape and running pose from reference.
