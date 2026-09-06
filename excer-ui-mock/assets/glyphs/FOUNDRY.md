# ExcerLock standalone glyph foundry

Consolidated and revalidated 2026-08-07. This directory is the complete
Family B glyph library for the standalone `excer-ui-mock` app: **exactly 26
runtime keyed finals and exactly 26 neighboring opaque edit targets**.

The accepted keyed finals (`icon-*.png`) remain the immutable visual sources.
Runtime code imports the neighboring `icon-*.svg` derivatives produced from
those finals with VisionCortex VTracer. Files ending in `-opaque.png` are
magenta-backed foundry/edit targets and must never be imported by runtime
code.

## Runtime SVG derivatives

- Tool: VisionCortex VTracer Python binding 0.6.15.
- Install: `python3 -m pip install --user vtracer==0.6.15`.
- Command: `python3 scripts/vectorize_icons.py`.
- Inventory check: `npm run vectors:check`.
- Policy: every accepted keyed PNG has exactly one same-basename SVG; the PNG
  is retained for source provenance and visual comparison.
- Glyph trace profile: color, stacked hierarchy, spline fitting, 8-bit color
  precision, 12-point layer difference, four-pixel speckle filter, four-pixel
  length threshold, ten iterations, two-decimal path precision.
- Runtime consumers: the four-tab dock, Settings and permission glyphs, Home
  affordances, builder activity catalog, analysis affordances, and disclosure
  arrows use the SVG derivatives.

Every glyph was generated with GPT Image 2 through Codex built-in
`image_gen`. This follows the user's explicit GPT Image 2 asset override; no
legacy Higgsfield generation applies to this library. The **11 reused glyphs**
retain their accepted prototype/app/design provenance. The **15 new glyphs**
are the fresh Manage and Settings tab glyphs plus the 13 batch A/B additions
whose complete generation records appear below.

## Canonical runtime inventory

The keyed final and opaque edit target for every row live in this directory as
`ASSET.png` and `ASSET-opaque.png`.

| Asset key | Intended display | Provenance | Primary consumers |
|---|---:|---|---|
| `icon-padlock-mini` | 12 pt | accepted prototype reuse | compact lock/readout |
| `icon-padlock-chip` | 18 pt | accepted prototype reuse | locked-app chips |
| `icon-sparkle` | 18 pt | accepted prototype reuse | reward/accent |
| `icon-pencil` | 20 pt | accepted prototype reuse | edit action |
| `icon-arrow-right` | 20 pt | accepted prototype reuse | row disclosure |
| `icon-info` | 24 pt | accepted prototype reuse | information action |
| `icon-tab-alarm` | 30 pt | accepted prototype reuse | alarm/condition affordance |
| `icon-tab-spiral` | 30 pt | accepted prototype reuse | spiral/analysis affordance |
| `icon-tab-mountain` | 30 pt | accepted prototype reuse | achievement/mountain affordance |
| `icon-tab-chart` | 30 pt | accepted prototype reuse | Analysis tab/chart affordance |
| `icon-tab-home` | 30 pt | accepted app/design reuse; renamed from `icon-tab-house` | Home tab |
| `icon-tab-manage` | 30 pt | standalone GPT Image 2 addition | Manage tab |
| `icon-tab-settings` | 30 pt | standalone GPT Image 2 addition | Settings tab |
| `icon-activity-walk` | 30 pt | new batch A | Walking catalog; Motion permission; walk session |
| `icon-activity-gym` | 30 pt | new batch A | Gym catalog; check-in; verified state |
| `icon-activity-run` | 30 pt | new batch A | Running catalog |
| `icon-activity-cycle` | 30 pt | new batch A | Cycling catalog |
| `icon-activity-swim` | 30 pt | new batch A | Swimming catalog |
| `icon-active-calories` | 24 pt | new batch A | effort catalog; analysis breakdown |
| `icon-health` | 24 pt | new batch A | Health permission/connection; active minutes |
| `icon-location` | 24 pt | new batch B | Location permission; gym picker; verification |
| `icon-notifications` | 24 pt | new batch B | Notifications permission and Settings |
| `icon-account` | 24 pt | new batch B | Account section |
| `icon-connections` | 24 pt | new batch B | Connections and Shortcuts |
| `icon-share` | 24 pt | new batch B | Analysis/achievement share |
| `icon-camera` | 24 pt | new batch B | builder own-photo tile |

Inventory exclusions are deliberate: `icon-tab-music`, the clay lock parts,
and banner/card art are not standalone runtime glyphs and do not live in this
directory. There are no missing or extra keyed/opaque pairs.

## Exact Family B prompt templates

The original manifests record these as literal templates. For every table row
below, the full prompt actually sent is the corresponding template with only
`⟨NAME⟩`, `⟨SUBJECT⟩`, and `⟨SIZE⟩` replaced by that row's verbatim values.
No prompt text was appended or omitted.

### Template B1

Used for the first four prototype reuse glyphs.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS icon: ⟨NAME⟩.
Primary request: Create one single centered ⟨SUBJECT⟩. The subject must read instantly at ⟨SIZE⟩ pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: flat 2D vector-like bitmap glyph; pure white #FFFFFF strokes and fills; rounded stroke ends and joins, generous stroke weight; simple friendly iOS-glyph geometry; zero gradients, zero glow, zero 3D, zero outline-only wire art — solid confident shapes.
Color palette: pure white #FFFFFF only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray, black, or magenta in the subject unless listed above.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at ⟨SIZE⟩ pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Template B2

Used for every other glyph in this manifest. It differs from B1 only by
explicitly locking the subject to roughly 65% of the canvas.

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS icon: ⟨NAME⟩.
Primary request: Create one single centered ⟨SUBJECT⟩. The subject must read instantly at ⟨SIZE⟩ pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: flat 2D vector-like bitmap glyph; pure white #FFFFFF strokes and fills; rounded stroke ends and joins, generous stroke weight; simple friendly iOS-glyph geometry; zero gradients, zero glow, zero 3D, zero outline-only wire art — solid confident shapes.
Color palette: pure white #FFFFFF only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray, black, or magenta in the subject unless listed above.
Composition/framing: one centered subject occupying roughly 65% of the canvas with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at ⟨SIZE⟩ pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

## Accepted reuse set — 11 glyphs

### Prototype provenance — ten glyphs

Source of truth: `prototype/assets/icons/FOUNDRY.md`, generated 2026-07-27
with Codex built-in `image_gen` / GPT Image 2. The keyed finals here remain
byte-identical to those accepted prototype finals. The raw 1254² prototype
opaque exports remain untouched in `prototype/assets/icons/`; their standalone
copies were normalized to the required 1024² opaque edit-target contract on
2026-08-07.

| Runtime final | Template | `⟨NAME⟩` | Verbatim `⟨SUBJECT⟩` | `⟨SIZE⟩` |
|---|---:|---|---|---:|
| `icon-padlock-mini.png` | B1 | `ICON PADLOCK MINI` | `tiny simple filled padlock, closed, with a rounded shackle and compact solid body` | 12 |
| `icon-padlock-chip.png` | B1 | `ICON PADLOCK CHIP` | `small simple filled padlock, closed, with a rounded shackle and sturdy solid body` | 18 |
| `icon-sparkle.png` | B1 | `ICON SPARKLE` | `one four-point star sparkle, points up/down/left/right, plump center and softly concave sides` | 18 |
| `icon-pencil.png` | B1 | `ICON PENCIL` | `diagonal solid pencil at 45°, tip lower-left, eraser upper-right` | 20 |
| `icon-arrow-right.png` | B2 | `ICON ARROW RIGHT` | `right-pointing arrow with a straight horizontal shaft and rounded chevron head` | 20 |
| `icon-info.png` | B2 | `ICON INFO` | `lowercase “i” inside one thin but confident circular outline` | 24 |
| `icon-tab-alarm.png` | B2 | `ICON TAB ALARM` | `classic round alarm clock with two top bells, two small feet, and simple hands` | 30 |
| `icon-tab-spiral.png` | B2 | `ICON TAB SPIRAL` | `round concentric spiral coil made from one generous rounded stroke, similar to a soft fingerprint swirl` | 30 |
| `icon-tab-mountain.png` | B2 | `ICON TAB MOUNTAIN` | `abstract twin-peak mountain forming a subtle capital letter A, two solid friendly shapes with a narrow valley` | 30 |
| `icon-tab-chart.png` | B2 | `ICON TAB CHART` | `rounded-square solid container containing three vertical bar-chart cutout bars of increasing varied heights` | 30 |

The prototype source record did not name reference-image paths for these ten;
this consolidation does not invent any. Original keyed validation used the
production orange gradient and passed all corner, residual-chroma, size, and
visual gates.

### Home provenance — accepted app/design copy

Source records: `app/assets/icons/FOUNDRY.md` and
`design/glyphs/icon-tab-house-opaque.png`. Ticket #41 generated the house with
GPT Image 2 using Template B2; the app later stored a 512² runtime derivative.
For the standalone foundry, the accepted 1024² opaque design master was copied
as `icon-tab-home-opaque.png` and keyed deterministically as the 1024²
`icon-tab-home.png`. The semantic rename is house → home only.

| Runtime final | Template | `⟨NAME⟩` | Verbatim `⟨SUBJECT⟩` | `⟨SIZE⟩` |
|---|---:|---|---|---:|
| `icon-tab-home.png` | B2 | `ICON TAB HOUSE` | `simple friendly house with a wide solid body, gently pitched roof, and one small rounded door cutout` | 30 |

Original app/design validation: RGBA, four zero-alpha corners, residual chroma
0, coverage 0.303, alpha bbox `[125,160,899,837]`; clean silhouette with no
fringe or box.

### Standalone Manage and Settings provenance

Generated and accepted 2026-08-07 with GPT Image 2 through two independent
Codex `image_gen` calls. Every call received these two accepted style/weight
references:

- `prototype/assets/icons/icon-tab-chart-opaque.png`
- `prototype/assets/icons/icon-tab-alarm-opaque.png`

| Runtime final | Template | `⟨NAME⟩` | Verbatim `⟨SUBJECT⟩` | `⟨SIZE⟩` |
|---|---:|---|---|---:|
| `icon-tab-manage.png` | B2 | `ICON TAB MANAGE` | `adjustment-sliders glyph made from three parallel horizontal rounded rails, each with one solid circular thumb at a different position` | 30 |
| `icon-tab-settings.png` | B2 | `ICON TAB SETTINGS` | `friendly settings gear glyph: a sturdy solid circular gear with eight softly rounded teeth and one clean circular center cutout` | 30 |

Their model outputs were normalized to 1024² opaque edit targets, keyed with
`--edge-contract 1 --despill`, and accepted on the first attempt. No prompt
text beyond Template B2 plus the exact substitutions above was recorded.

## New glyph batches A and B — complete merged production record

The original fragments were `work/foundry-glyphs-batch-a.md` and
`work/foundry-glyphs-batch-b.md`. Everything needed to reproduce or audit
them—exact prompts, references, raw outputs, normalization, validations,
checksums, display checks, consumers, and rejection history—is consolidated
here.

### Shared generation and postprocess record

- Generator/model: Codex built-in `image_gen` / GPT Image 2.
- Use case/template: `new-asset-with-style-reference` / literal Template B2
  above, with only the exact row substitutions below.
- Calls: 13 independent generations, exactly one call per asset.
- Reference image 1 on every call:
  `/Users/johansardar/ExcerLock/app/assets/icons/icon-tab-house.png` — accepted
  Family B silhouette, solid fill, and corner-rounding comparator.
- Reference image 2 on every call:
  `/Users/johansardar/ExcerLock/prototype/assets/icons/icon-tab-chart.png` —
  accepted Family B weight, join, counter, padding, and keying comparator.
- Raw outputs: 1254×1254 opaque RGB PNGs at the exact paths below.
- Normalized edit targets: 1024×1024 opaque RGB `*-opaque.png` files.
- Keyed finals: 1024×1024 RGBA, generated with
  `prototype/scripts/remove_chroma_key.py --edge-contract 1 --despill`.
- Mechanical validator: `prototype/scripts/validate_icons.py`.
- Rejections/corrections: none; all 13 were accepted on attempt 1.

Canonical postprocess shape:

```bash
sips --resampleHeightWidth 1024 1024 RAW.png --out excer-ui-mock/assets/glyphs/ASSET-opaque.png
python3 prototype/scripts/remove_chroma_key.py excer-ui-mock/assets/glyphs/ASSET-opaque.png excer-ui-mock/assets/glyphs/ASSET.png --edge-contract 1 --despill
python3 prototype/scripts/validate_icons.py excer-ui-mock/assets/glyphs/ASSET.png
```

### Exact prompt substitutions, generated outputs, and consumers

| Batch | Asset | Verbatim `⟨NAME⟩` | Verbatim `⟨SUBJECT⟩` | Size | Exact generated output | Consumers |
|---|---|---|---|---:|---|---|
| A | `icon-activity-walk` | `ICON ACTIVITY WALK` | `solid side-view person walking briskly, one leg forward and the opposite arm forward, compact filled body with a clear stride and no facial detail` | 30 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-f7ccaae4-9469-4b6f-a7fa-fd299b21fd7b.png` | Walking catalog; Motion permission; walk session |
| A | `icon-activity-gym` | `ICON ACTIVITY GYM` | `horizontal dumbbell with a short central grip and two rounded solid weight plates on each end, one compact symmetrical silhouette` | 30 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-d1744da7-b49f-45e6-aa80-b585f5eb193e.png` | Gym catalog; check-in; verified state |
| A | `icon-activity-run` | `ICON ACTIVITY RUN` | `solid side-view person running with one knee lifted, rear leg extended, opposite arm pumping, a clear forward lean, and no facial detail` | 30 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-cc150912-7bea-41d2-98a4-74dc933f32a3.png` | Running catalog |
| A | `icon-activity-cycle` | `ICON ACTIVITY CYCLE` | `compact side-view bicycle made from generous rounded solid bars, two thick filled wheel rings, a clear frame triangle, short handlebar, and saddle` | 30 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-65533926-850d-47d7-9833-0c7ea93948ce.png` | Cycling catalog |
| A | `icon-activity-swim` | `ICON ACTIVITY SWIM` | `one cohesive swimmer symbol with a solid featureless head and sweeping arm above two broad stacked rounded wave bands, with no visible face` | 30 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-a67f4387-05bf-42f9-9595-2883bf6014b6.png` | Swimming catalog |
| A | `icon-active-calories` | `ICON ACTIVE CALORIES` | `single plump upright flame with a broad rounded base, softly curved tip, and one small centered teardrop cutout` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-f709b1e1-d1e6-4f6c-bdde-37a2ced479cd.png` | effort catalog; analysis breakdown |
| A | `icon-health` | `ICON HEALTH` | `solid rounded heart carrying one bold clean zigzag pulse cutout through its center` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-aee3-70c2-afcf-09ae582159bc/exec-b07f3f1c-565e-4eef-b198-ecfaad3a2e79.png` | Health permission/connection; active minutes |
| B | `icon-location` | `ICON LOCATION` | `solid rounded map pin with one circular center cutout, broad shoulders, and a short softly tapered point` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-03e5db88-5cd2-42e6-8651-8480bf0dd38e.png` | Location permission; gym picker; verification |
| B | `icon-notifications` | `ICON NOTIFICATIONS` | `solid notification bell with a rounded dome, small centered clapper, and short flat base` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-a9c22e84-e74a-4a2f-b399-64b17d9ea426.png` | Notifications permission and Settings |
| B | `icon-account` | `ICON ACCOUNT` | `solid head-and-shoulders avatar with a round head above broad rounded shoulders, one compact front-facing symmetrical silhouette` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-46b8fc9c-52d2-47e9-b483-ea1fff492b4f.png` | Account section |
| B | `icon-connections` | `ICON CONNECTIONS` | `two interlocking rounded chain links on a forty-five-degree diagonal, broad solid bands with clean open centers` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-f6fee6ae-895f-4fad-843a-7e56f4734144.png` | Connections and Shortcuts |
| B | `icon-share` | `ICON SHARE` | `upward arrow emerging from a wide rounded-bottom tray, with a thick straight shaft and broad solid arrowhead` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-8274bb0a-cbf3-42c6-b1a4-779b35380ee8.png` | Analysis/achievement share |
| B | `icon-camera` | `ICON CAMERA` | `compact solid camera with a rounded-rectangle body, small centered top bump, and one circular lens cutout` | 24 | `/Users/johansardar/.codex/generated_images/019fdd4a-be1e-7433-8c3a-5d9eb61510da/exec-21bcb073-8b7a-48dc-bc87-4fb7cf36d389.png` | builder own-photo tile |

### Preserved batch visual/palette acceptance

- Batch A was inspected at 12, 18, 24, and 30 pt in @3× boxes on the
  `#F98529→#EB2E02` Home gradient and alternating dark translucent cards.
  Every silhouette remained unambiguous; no face, missing thin part, baked
  shadow, gloss, magenta box, or fringe was observed.
- Batch B was inspected at 72×72 px (24 pt @3×) on `#281A12` row cards over
  the same Home gradient. Counters remained open and all six were immediately
  legible. At least 99.75% of nearly opaque subject pixels had every RGB
  channel ≥245; remaining variation was accepted antialiasing.

## Consolidated mechanical validation and checksums

Validation was rerun on 2026-08-07 after consolidation. The inventory query
found 26 keyed finals, 26 opaque edit targets, and identical asset-key sets.
Every final is 1024×1024 RGBA, has four exact zero-alpha corners, and has zero
pixels matching `alpha > 0 AND R > G+60 AND B > G+60`. Every edit target is
1024×1024 opaque RGB. All rows passed.

| Final | Alpha bbox | Coverage | Keyed-final SHA-256 | Opaque-target SHA-256 |
|---|---|---:|---|---|
| `icon-account.png` | `[191,158,833,867]` | 0.276883 | `01e0bff8e271b0bdf215b54a72234a26f86a7230f7c9476b9c6916d222be6680` | `678392ce3f00661f58e8df9821ac4ca1f8963c7acb904753269ffe4e648be55e` |
| `icon-active-calories.png` | `[204,106,819,918]` | 0.270798 | `e5821bd83c535c7c3693ac26fdc4146c3ec8b361f40e6a4dfe4e7568bacc6682` | `0da45b619335b1e21d6cf0015576984b00963c819277452449e0388bbb81b1b3` |
| `icon-activity-cycle.png` | `[119,257,904,771]` | 0.149744 | `00a92ed69183d84a8f4290028ed1b7fbff2ce5d330226db642ad1ce06fc9449f` | `766b63f195b1bd17b8081534326e17109244b3dea97215224ba0742b0466ffc0` |
| `icon-activity-gym.png` | `[127,298,897,727]` | 0.183634 | `c28a63239165623a695d70fc16b870c360e8a20d03eef0c9783564768c5707af` | `23bf52ebd1206560191316cb9ec4cfb06d5d5204d7f1c199db16ffbc766ad20f` |
| `icon-activity-run.png` | `[193,132,818,854]` | 0.156419 | `d341856a0129d081a4b5c4d4cdb84c063ead7d0a6c71219943fca7bc1205237b` | `aca1f47912c378444da8712e36ca2f483477ef26deffd623811a486d54c08248` |
| `icon-activity-swim.png` | `[137,184,886,870]` | 0.217978 | `e5b1ca7e9def9a29386bf95e22c8b54530b272accd432599ff07b7a15d1badd9` | `52e4c5328fcac1dfb9efaa245fcd997648949c6fca22cd9823fc94e1b2c0f524` |
| `icon-activity-walk.png` | `[253,112,770,905]` | 0.155363 | `5bdc313e0867c8c6811573ccea10955b86faca74113a587c142c79e3600cf40e` | `84ea01eb31cbd1e2893c3831af0c1b586f760783bba521cdfc40df421f795624` |
| `icon-arrow-right.png` | `[128,254,910,770]` | 0.149203 | `ce533c29ac8a244d62e8e458d8913dd39b811e9365c7be2a1ddd6e957fd3a57c` | `851f70f2775cf80a2f5b7922b4b199d14d1c746a27e0e6f846cf4ab4e07e3bae` |
| `icon-camera.png` | `[175,229,848,793]` | 0.265711 | `504b73d32374465b7da1d1d787a86023c3b9ef8bf406a50005b525cb3c672340` | `1069964e18c70452f388503d5053d72f35fb9e5fbc74bf2ebbb6c916a9fe879c` |
| `icon-connections.png` | `[164,165,868,868]` | 0.172204 | `79222ebce3d88ecbcc92fc746568fe9462db3b5fe792f3f7971e3a50075d46a7` | `ee0de9da8c36788399fc11ec096e89f3b5fdf95e9a4473baedd7034338d29f70` |
| `icon-health.png` | `[93,157,931,894]` | 0.362365 | `395f83d4526ea69595de419935cf6f57718852bb40a44b0ed20ad138d11303b2` | `743e50e962ae515bc377a51278a2e1a4c7a671bd99c72eb93ab974a4f01d9e04` |
| `icon-info.png` | `[124,116,892,900]` | 0.139927 | `8f78c94794a901d4c5861d1a1e224ffc4ac9f249e01ba37350fb075f08fabbb9` | `2e05be7f7bcbc78b2474549ed02120b84d38e526ad63a24fe578e6a04f5dd899` |
| `icon-location.png` | `[213,120,810,896]` | 0.255267 | `e1da8028974e6b2388ea7f8f2fe315c064405631665edc11dbafab62e2024965` | `5a4b9aeee70cf705e0b5145eaea5ab1c33e648c5bbd88e5ca4349a7467180f26` |
| `icon-notifications.png` | `[179,110,845,908]` | 0.297793 | `682338759a98d945b1779a59b1e405ac80058d68c7c3bfcb53ea3d0652bd9a4e` | `9ec4416982ed75d5f9e2a4dd0d63a7d13168fd61f7b6e230bafae38a67c4f137` |
| `icon-padlock-chip.png` | `[362,324,662,701]` | 0.078673 | `487b9188325fb5af11a550813c49825a9135aa7e18541c191623df8a35e6e271` | `28e5ea46a56ba1cafd55413bc4d03bfde9cd7dbe6981d6ab5e96bd2f81d3a48e` |
| `icon-padlock-mini.png` | `[444,415,580,591]` | 0.016622 | `b441ef54d25c84e6135c80cbd18db8d4a1335910b9bd54902bf5d88d3a6c1b76` | `bacf14b700e9b3266fe6febb1d7dbcf1e01269e6a8f9228f60ca1e64bebdf8ad` |
| `icon-pencil.png` | `[150,122,892,866]` | 0.177025 | `6bf8d0fc1c45e524883314c9c6ecc9227fbd2f12519be8a7853d5931e98f6357` | `47cbecd4beb3fdc27a8946ce5a47557110da7de635a5ab9ce66ba07a1d5be8c0` |
| `icon-share.png` | `[136,152,888,867]` | 0.229853 | `fbf0b82a181609cdbf5b1dfa9c4ff00ac069f76f4871888ed9893600ef65c29e` | `021cf6f31819ff4ba4d588e263710ddf47fca9b1178c60f437a03ce23bcc9764` |
| `icon-sparkle.png` | `[186,186,838,838]` | 0.112291 | `bfbb4f92a64f52b2db33e158ece1cd90fb8f08bd7c8a967f95c650003710e071` | `0940f978937f3b5abe6215d8876ef13f14e43ef50349121fc825544055759e9c` |
| `icon-tab-alarm.png` | `[193,144,831,867]` | 0.203579 | `2e305b946cbee2ce7fd241a3f0ce66af7756470b950e493fbde2f4b0875d2218` | `4c3d370e295e1c652902bf5f70d476768a0d003d1d8a71032b6b5e782d1e52ab` |
| `icon-tab-chart.png` | `[167,173,856,847]` | 0.298524 | `8b8200149ec33a0a7b61c90a2d5912a1c73ad1921257b9d0e9227f470cf20948` | `8699eb7508305c46630ab3c8f9ba837a899afbd3ed9c23d28b5837ccddf3514a` |
| `icon-tab-home.png` | `[125,160,899,837]` | 0.302967 | `6d306868083f5e387a36633dc9c460fe0300cf0bf40ea01c97841d448038d421` | `05890694fae76205882aa2e647ddec99b7de03f456098a85c61edcd4ea224c89` |
| `icon-tab-manage.png` | `[197,246,827,778]` | 0.126380 | `7240e6df1ff7577125d0d16b0bb1fd49e1cd0cbaa8ef32b863372565ec936a6b` | `49e75e2ed58a0ef65474f881feb04e6168a1138c708da5472cbeafadf47020f1` |
| `icon-tab-mountain.png` | `[123,234,901,776]` | 0.265138 | `1cb17128a6da6713c374471072497ac379f46dbe542b446415f2ad02d0a9f894` | `0f8b741a43821cfd76f07f1836efba87336f310987756bb9b329e591a37ffc02` |
| `icon-tab-settings.png` | `[151,139,873,858]` | 0.261490 | `5e8001e3ec19e488a7d73c379682672bb0496462f0d08dfff5aa74afe166c289` | `75e6bbf10e8a006aea172550aedd077c3cb7c4bec19310bf2eaa39ddd3435d5b` |
| `icon-tab-spiral.png` | `[148,152,876,842]` | 0.251273 | `e1a2dec8cd48a5b87fcfe1a2ee8f98bf6bb2704d74e0e5fdc759126234c8b0e4` | `5e4540c627679b250f8822ce76e5409827471c622bf6ba7d8818bab6289c166b` |

Validation commands:

```bash
find excer-ui-mock/assets/glyphs -maxdepth 1 -name '*.png' ! -name '*-opaque.png' -print0 \
  | sort -z \
  | xargs -0 python3 prototype/scripts/validate_icons.py
```

Opaque-target inspection additionally asserted `size == (1024,1024)` and
either RGB mode or a uniformly 255 alpha channel. SHA-256 values above are for
the exact files present after consolidation. A clean re-key of every opaque
target with `--edge-contract 1 --despill` reproduced its neighboring keyed
final byte-for-byte: **PASS, 26 of 26**.

## Final contact-sheet QA

`work/glyphs-contact-sheet.jpg` is a 2156×2394 visual audit containing every
keyed final twice. Each glyph is alpha-cropped and composited at its intended
point size at @3× on both the Home heat gradient (`#F98529→#EB2E02`) and the
dark-card context (`#281A12`). Contact-sheet SHA-256:
`6f9063eefdc2d556abf8cc76a087e3634e74e648cf1a1db6a782ea1fd478a52f`.

Visual inspection result: **PASS, 26 of 26**. No magenta fringe, keyed box,
baked shadow, or colored contamination is visible. Thin structures remain
connected; activity poses, bicycle/waves, counters, the 12 pt mini lock, and
all tab silhouettes remain legible at their representative UI sizes. The
library intentionally varies detail by semantic need, but maintains the same
white, rounded, confident Family B weight and reads coherently on both target
contexts.
