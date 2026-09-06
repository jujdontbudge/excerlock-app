# GPT Image onboarding batch — cards 4–16

Family D, onboarding white/orange override from design/STYLE.md. GPT Image and mobile-design skills informed native typography, spacing, hierarchy, and reference separation.

Status: concept previews, not production iPhone screenshots. All 13 were visually reviewed. Exact geometry checks fail because native output dimensions differ from 1206×2622; images are preserved without resampling or frame stamping. Minor generated component geometry varies across screens. Dot diagrams are illustrative, not precise counted data visualizations.

The local Excalidraw board embeds the generated raster previews into its existing SVG. All 44 cards and their order are preserved; only cards 4–16 changed. Existing competitor source images remain intact.

## Files and references

Verbatim generation prompts and input paths: [batch-04-16-prompts.json](batch-04-16-prompts.json).

- Card 4: [step-4-progress.png](step-4-progress.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-caddb113-38f4-4d07-84f5-60ef00d77a6f.png
- Card 5: [step-5-exercise.png](step-5-exercise.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-b21f9b96-be3d-4ae8-87a0-028533638e1a.png
- Card 6: [step-6-name.png](step-6-name.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-f5a40244-bacf-484d-9b9a-461bc835ebd0.png
- Card 7: [step-7-referral.png](step-7-referral.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-f4659894-8d24-473b-8499-699e9add9164.png
- Card 8: [step-8-age.png](step-8-age.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-4de3e148-99eb-4378-ac37-11ad6be70655.png
- Card 9: [step-9-occupation.png](step-9-occupation.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-d5cd14c5-455b-45bf-bcc4-9a4afa578df6.png
- Card 10: [step-10-improve.png](step-10-improve.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-750d88c5-3edc-47cc-a66b-3fc42c5f94e1.png
- Card 11: [step-11-motivation.png](step-11-motivation.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-9ba05e37-d1b7-4ab1-83ca-596c16d57d5a.png
- Card 12: [step-12-hours.png](step-12-hours.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-304aaa00-1a74-4d0f-916e-b014bda84850.png
- Card 13: [step-13-math.png](step-13-math.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-0bf2f64c-7759-4bf0-9012-73c1d6150a6e.png
- Card 14: [step-14-year.png](step-14-year.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-5e932e1e-e0da-4b8f-89e9-9c8fbd9503e5.png
- Card 15: [step-15-free-time.png](step-15-free-time.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-8c9cd64d-2627-448a-8f3c-6f36c8121eac.png
- Card 16: [step-16-scrolling-cost.png](step-16-scrolling-cost.png). Original output: /Users/johansardar/.codex/generated_images/01a07384-aa4c-7e03-ad78-8461ffd473f4/exec-0e089b2e-857c-4b5b-9820-1d2b7238fc28.png

## Card 16 correction prompt

Edit this exact UI screenshot. Preserve every element, all copy, layout and orange/white styling. ONLY correct dot colors: ALL dots in the top partial row and the next three full rows must be saturated vivid orange #F47735. ONLY the short bottom row should be pale peach #FFD6BD. Thus the overwhelming majority is vivid orange and a small minority is pale peach. Do not add or remove dots. No other changes.

## Validation results

```json
[
  {
    "step": 4,
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-4-progress.png\"\n}\n"
  },
  {
    "step": 5,
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-5-exercise.png\"\n}\n"
  },
  {
    "step": 6,
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-6-name.png\"\n}\n"
  },
  {
    "step": 7,
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-7-referral.png\"\n}\n"
  },
  {
    "step": 8,
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-8-age.png\"\n}\n"
  },
  {
    "step": 9,
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-9-occupation.png\"\n}\n"
  },
  {
    "step": 10,
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-10-improve.png\"\n}\n"
  },
  {
    "step": 11,
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-11-motivation.png\"\n}\n"
  },
  {
    "step": 12,
    "result": "FAIL size: got 851x1848, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1848\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-12-hours.png\"\n}\n"
  },
  {
    "step": 13,
    "result": "FAIL size: got 851x1849, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        851,\n        1849\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-13-math.png\"\n}\n"
  },
  {
    "step": 14,
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-14-year.png\"\n}\n"
  },
  {
    "step": 15,
    "result": "FAIL size: got 850x1850, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        850,\n        1850\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-15-free-time.png\"\n}\n"
  },
  {
    "step": 16,
    "result": "FAIL size: got 852x1846, expected 1206x2622\n{\n  \"checks\": {\n    \"size\": {\n      \"actual\": [\n        852,\n        1846\n      ],\n      \"expected\": [\n        1206,\n        2622\n      ],\n      \"ok\": false\n    }\n  },\n  \"image\": \"/Users/johansardar/ExcerLock/design/mockups/onboarding-orange/step-16-scrolling-cost.png\"\n}\n"
  }
]
```

