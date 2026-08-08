# Milestone badge foundry — Family A manifest (ticket #74)

Standalone adoption note (2026-08-07): all 22 accepted keyed finals and their
22 retained 1254×1254 RGB GPT Image 2 source/edit targets were copied
byte-for-byte from
`design/badges/` into this directory. The prompts and acceptance history below
are preserved as the nearest reproducibility record. Runtime code imports only
the keyed finals; locked states are derived with tint and opacity rather than
duplicate PNGs. A fresh validation pass confirmed every final is 1024×1024
RGBA with zero-alpha corners and zero residual chroma.

## Standalone byte-for-byte reuse ledger

Every row below is one accepted badge. The source and standalone destination
on each side of the row have the same SHA-256. This table is the standalone
copy record; the original prompts, generation history, and acceptance details
remain unchanged below.

| Badge | Design final source → standalone final | Matching final SHA-256 | Design opaque source → standalone opaque destination | Matching opaque SHA-256 |
|---|---|---|---|---|
| activity-1 | `design/badges/activity-1.png` → `excer-ui-mock/assets/badges/activity-1.png` | `b5cdc3698420f79c82904ad0b2c227bf14941b8aaf900784a35d9f49b57e18ae` | `design/badges/activity-1-opaque.png` → `excer-ui-mock/assets/badges/activity-1-opaque.png` | `8b649d91d12b96690c9709268fedf270affb936ba09e2e2c9b47c1d7d7880f9f` |
| activity-10 | `design/badges/activity-10.png` → `excer-ui-mock/assets/badges/activity-10.png` | `9cf7a7df943ba6eef597ef9b3f40d150a80bf63dc44d7de3afb936c5bec7ed40` | `design/badges/activity-10-opaque.png` → `excer-ui-mock/assets/badges/activity-10-opaque.png` | `c5611bdf1e38343237bafe4644053498f49985897581d36f3395eb39c3755b7f` |
| activity-100 | `design/badges/activity-100.png` → `excer-ui-mock/assets/badges/activity-100.png` | `9120242394014f707bb156722f119bb6a9b9d41f07b847207499c4864285d89c` | `design/badges/activity-100-opaque.png` → `excer-ui-mock/assets/badges/activity-100-opaque.png` | `65925f1d0345f47d09670b2fc7967f12022b34be29c18b964dff88edcbc07904` |
| activity-25 | `design/badges/activity-25.png` → `excer-ui-mock/assets/badges/activity-25.png` | `acedcbff4710cf0e5c8454c28466f13d533aa39f85739f13944e668e42aa3230` | `design/badges/activity-25-opaque.png` → `excer-ui-mock/assets/badges/activity-25-opaque.png` | `08535bd436d2ca77bee0fc7b237c53cb7831417bf8654aa0d967ba0989b57c74` |
| activity-250 | `design/badges/activity-250.png` → `excer-ui-mock/assets/badges/activity-250.png` | `a1cf1ea6b9f8e8c94c06582da8c9d309e02af24b0f936609d779089b778431d8` | `design/badges/activity-250-opaque.png` → `excer-ui-mock/assets/badges/activity-250-opaque.png` | `6836755ced09da4260e26050bc5ed19c8a801c53057481279a1b2ff9bfeb4372` |
| activity-5 | `design/badges/activity-5.png` → `excer-ui-mock/assets/badges/activity-5.png` | `76ab4d5e7c9b3f245a978d675e9c936d52900cdc0d25d4ecc59c1f96dea24f1e` | `design/badges/activity-5-opaque.png` → `excer-ui-mock/assets/badges/activity-5-opaque.png` | `01d743113c633722e26cd12a2c32702864201b97aa50f6528cc2f3af310af90f` |
| activity-50 | `design/badges/activity-50.png` → `excer-ui-mock/assets/badges/activity-50.png` | `66a79b3bb927c3a7c21b89b21a2cfdfde3b7f2c537d10dec47c9b6e57d2b5e95` | `design/badges/activity-50-opaque.png` → `excer-ui-mock/assets/badges/activity-50-opaque.png` | `b397732d67389e5f7cf67662878fafd25acf12afccbbeb1ab53d57ed58daaa2b` |
| activity-500 | `design/badges/activity-500.png` → `excer-ui-mock/assets/badges/activity-500.png` | `ddfcb7b75b87086066055137fea49cd4e213113338d0d92d992beb8cc71b3f32` | `design/badges/activity-500-opaque.png` → `excer-ui-mock/assets/badges/activity-500-opaque.png` | `47a20af7dd816cecce106eb4deee8f828a9e2e5d01572120ecb5bb21b85fbd4b` |
| streak-100-days | `design/badges/streak-100-days.png` → `excer-ui-mock/assets/badges/streak-100-days.png` | `6dcd49b1703a8bf54cd2bf7d217120b11c85ef22f535cc6b39cd05a255f7cc5f` | `design/badges/streak-100-days-opaque.png` → `excer-ui-mock/assets/badges/streak-100-days-opaque.png` | `d9ae03890cd4a9bfd72f384d89c5ef8aaaa733fa75b895c770ee5ef6109abc16` |
| streak-14-days | `design/badges/streak-14-days.png` → `excer-ui-mock/assets/badges/streak-14-days.png` | `c1c34a04a6de183f7e79160602d7c3355f15f5f077c954081f86c3a73abe28f2` | `design/badges/streak-14-days-opaque.png` → `excer-ui-mock/assets/badges/streak-14-days-opaque.png` | `b3dc3279484170f0d5eb43ef8bc57277d0cf27515ea282432634a1980eb644e5` |
| streak-180-days | `design/badges/streak-180-days.png` → `excer-ui-mock/assets/badges/streak-180-days.png` | `54df6848cb84ec46e8b309b6661167bd21d16140e9dfa37750e8c62f570f950c` | `design/badges/streak-180-days-opaque.png` → `excer-ui-mock/assets/badges/streak-180-days-opaque.png` | `d1200ab5ada6bd0e504ed1397b04befe902fc6756fe5f4253bdf444d2d63e085` |
| streak-3-days | `design/badges/streak-3-days.png` → `excer-ui-mock/assets/badges/streak-3-days.png` | `dddd137506cdd1330a45126a6955316e0fbf78e78c1ace437af418297172b92f` | `design/badges/streak-3-days-opaque.png` → `excer-ui-mock/assets/badges/streak-3-days-opaque.png` | `7c86fb44b7b2e7793d4e258a2a8a638fdb54b0cc39c6b4d16b959a1e7998f327` |
| streak-30-days | `design/badges/streak-30-days.png` → `excer-ui-mock/assets/badges/streak-30-days.png` | `8d7badf23303aeea44da814838edc744487055cced44fcc569db60112ce8c887` | `design/badges/streak-30-days-opaque.png` → `excer-ui-mock/assets/badges/streak-30-days-opaque.png` | `c5cdf285ede0b371882199d38b337f7d27bbcd233e13a16f0eb3de2320f8ca16` |
| streak-365-days | `design/badges/streak-365-days.png` → `excer-ui-mock/assets/badges/streak-365-days.png` | `ab87ad2303f7ce5be472327e0e73d5194278e03040c8fc2d46285e6e08f6b062` | `design/badges/streak-365-days-opaque.png` → `excer-ui-mock/assets/badges/streak-365-days-opaque.png` | `399ed241a8a26667c780edaf144748aec1ef5f8d45218823f9e79c620156d5c2` |
| streak-60-days | `design/badges/streak-60-days.png` → `excer-ui-mock/assets/badges/streak-60-days.png` | `5b06b9379f02af4c50fc8c4b8291fb771643d13435426bfb49ec7e94c4f4af01` | `design/badges/streak-60-days-opaque.png` → `excer-ui-mock/assets/badges/streak-60-days-opaque.png` | `14dff37a74b2751da222c809c7e5a08539bc48bc33a2253570146bfe229f1585` |
| streak-7-days | `design/badges/streak-7-days.png` → `excer-ui-mock/assets/badges/streak-7-days.png` | `94847ab9879f8010fba3397adedd4a196b0590243a0bfe958ff69936de77ff72` | `design/badges/streak-7-days-opaque.png` → `excer-ui-mock/assets/badges/streak-7-days-opaque.png` | `19a632cac2529e0888cdb7cd5d45f73bf7db2f229d60034902657ee5f09ada70` |
| time-reclaimed-10-hours | `design/badges/time-reclaimed-10-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-10-hours.png` | `21729f87c24e3f5c0bfb896c87dd54e7b2f56a7caf6dbee99f2a655fe89dec1b` | `design/badges/time-reclaimed-10-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-10-hours-opaque.png` | `654c74261a810372dd664baf98a2830ca266798303c67415bce9a3f4a95b24f8` |
| time-reclaimed-100-hours | `design/badges/time-reclaimed-100-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-100-hours.png` | `5ca99218dcb321fb28856ec6de6745e999fbca955a3f23447e7faf04038af81a` | `design/badges/time-reclaimed-100-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-100-hours-opaque.png` | `f0cf490495ecb16e3dc828f984a6366eca83e904cdbbdcaeba0a036c0af7dfd3` |
| time-reclaimed-25-hours | `design/badges/time-reclaimed-25-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-25-hours.png` | `2acc20efbf54e86cd064e6dcb9fd39140622afe862a3a2bbba600922627ed9b8` | `design/badges/time-reclaimed-25-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-25-hours-opaque.png` | `cc1d980d406065d47db73533de731403932cf5666838816e3c6ea00be973cb4b` |
| time-reclaimed-250-hours | `design/badges/time-reclaimed-250-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-250-hours.png` | `96d48f45cf264d82b47e1d6fc75b6ed7e4651043f4a1a8ecbe8661b46bec80dd` | `design/badges/time-reclaimed-250-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-250-hours-opaque.png` | `7e29452540b1ebff0d8ad95a27fd94cf470aabd2d3a083235cd8b0386e20aca4` |
| time-reclaimed-50-hours | `design/badges/time-reclaimed-50-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-50-hours.png` | `9d1fe8fbec1ae96b0b872338dc4978020b0491c26860fe62870123e954a5344b` | `design/badges/time-reclaimed-50-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-50-hours-opaque.png` | `eee26cdb6d97d08b6557fe851fdd3c27a078ce2d6d1b8b1f0ba3901a93e8b5b0` |
| time-reclaimed-500-hours | `design/badges/time-reclaimed-500-hours.png` → `excer-ui-mock/assets/badges/time-reclaimed-500-hours.png` | `f2ac53960ef802c71a7d61142dd0072176272be44c662c4e076cd5bab71e5dd2` | `design/badges/time-reclaimed-500-hours-opaque.png` → `excer-ui-mock/assets/badges/time-reclaimed-500-hours-opaque.png` | `76d4fe589fcebd92f1d08f920c1043b2b945c5847bcda019a2712a17ebf97e8e` |

Every generation for the 22-badge milestone shelf is logged here, accepted or
rejected. No entry means the asset does not ship. Produced with Codex built-in
`image_gen` (GPT Image 2) on 2026-07-30 per `design/STYLE.md` Family A and Johan's
decision on ticket #74.

## Production status

**22 of 22 complete and validated.**

- Streaks: **3 · 7 · 14 · 30 · 60 · 100 · 180 · 365 days**
- Activities: **1 · 5 · 10 · 25 · 50 · 100 · 250 · 500**
- Time Reclaimed: **10 · 25 · 50 · 100 · 250 · 500 hours**

Bold thresholds are complete. Production proceeds left to right, one ladder at
a time.

## Common production settings

- **Family/template:** Family A, using the canonical `lock-body.png` /
  `lock-shackle.png` prompt structure from
  `prototype/assets/icons/FOUNDRY.md`. Only the asset, reference-role, subject,
  and display-size lines change. The Scene/Style/Palette blocks remain
  word-for-word; the canonical Constraints block remains word-for-word apart
  from subject-specific geometry and the explicit ban on threshold marks.
- **References on every generation:** `prototype/assets/icons/lock-body.png`
  and `prototype/assets/icons/lock-shackle.png`, passed as strict material and
  shading references.
- **Requested asset canvas:** 1024×1024, opaque, perfectly flat `#FF00FF`.
  GPT Image 2 returned 1254×1254 RGB files; those untouched model outputs are
  the retained `*-opaque.png` source/edit targets copied into this directory.
- **Final display target:** approximately 40 pt on the eight-item shelf rows.
- **Pipeline:**

  ```bash
  sips --resampleHeightWidth 1024 1024 <1254-opaque.png> --out <1024.png>
  python3 prototype/scripts/remove_chroma_key.py <1024.png> <final.png> --edge-contract 1 --despill
  python3 prototype/scripts/validate_icons.py <final.png>
  ```

- **Opaque edit targets:** retained beside finals as 1254×1254 RGB
  `<name>-opaque.png` files; only the keyed runtime finals are 1024×1024 RGBA.
- **Visual QA:** each accepted final is inspected at 40 pt (120 px at 3×)
  against the production orange gradient `#F98529 → #EB2E02`.

## Locked-state decision

Locked art is **derived at render time from the accepted final's alpha mask**:
apply a neutral mid-gray tint (QA value `#7E7781`) while preserving the same
outer alpha. No separately generated locked files ship.

This choice is deliberate: the three ladders use coarse, distinct outer
silhouettes (flame, motion bolt, hourglass), so their identity survives without
interior shading at 40 pt. A runtime tint keeps locked and unlocked geometry
pixel-identical, avoids model drift between states, and avoids 22 redundant
generations. The locked silhouette is visually checked beside each unlocked
asset rather than assumed.

## Validation results

| Final asset | Mode / size | Corner alpha | Residual pixels | Visible pixels | Coverage | Alpha bounds | 40 pt gradient | Locked silhouette |
|---|---|---|---:|---:|---:|---|---|---|
| `streak-3-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 310,154 | 0.295786 | `[199,144,824,882]` | Pass — clean edge, no fringe or box | Pass |
| `streak-7-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 345,212 | 0.329220 | `[192,108,832,917]` | Pass — clean edge, no fringe or box | Pass |
| `streak-14-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 397,347 | 0.378940 | `[174,68,851,954]` | Pass — clean edge, no fringe or box | Pass |
| `streak-30-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 376,275 | 0.358844 | `[143,128,880,953]` | Pass — clean edge, no fringe or box | Pass |
| `streak-60-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 393,077 | 0.374867 | `[117,148,916,949]` | Pass — clean edge, no fringe or box | Pass |
| `streak-100-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 371,417 | 0.354211 | `[130,84,893,949]` | Pass — clean edge, no fringe or box | Pass |
| `streak-180-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 385,293 | 0.367444 | `[143,136,883,905]` | Pass — clean edge, no fringe or box | Pass |
| `streak-365-days.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 399,693 | 0.381177 | `[88,128,933,894]` | Pass — clean edge, no fringe or box | Pass |
| `activity-1.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 259,227 | 0.247218 | `[211,104,812,923]` | Pass — clean edge, no fringe or box | Pass |
| `activity-5.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 275,765 | 0.262990 | `[186,100,846,919]` | Pass — clean edge, no fringe or box | Pass |
| `activity-10.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 272,572 | 0.259945 | `[179,107,844,918]` | Pass — clean edge, no fringe or box | Pass |
| `activity-25.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 250,059 | 0.238475 | `[178,140,845,874]` | Pass — clean edge, no fringe or box | Pass |
| `activity-50.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 296,980 | 0.283222 | `[87,168,939,856]` | Pass — clean edge, no fringe or box | Pass |
| `activity-100.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 347,953 | 0.331834 | `[98,164,927,846]` | Pass — clean edge, no fringe or box | Pass |
| `activity-250.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 291,082 | 0.277597 | `[96,150,928,890]` | Pass — clean edge, no fringe or box | Pass |
| `activity-500.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 297,298 | 0.283525 | `[119,138,906,876]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-10-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 307,392 | 0.293152 | `[263,113,761,910]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-25-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 418,411 | 0.399028 | `[154,132,870,895]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-50-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 338,981 | 0.323277 | `[227,122,796,894]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-100-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 285,681 | 0.272447 | `[230,115,792,904]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-250-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 312,820 | 0.298328 | `[229,94,793,935]` | Pass — clean edge, no fringe or box | Pass |
| `time-reclaimed-500-hours.png` | RGBA / 1024×1024 | `0,0,0,0` | 0 | 356,414 | 0.339903 | `[185,69,836,962]` | Pass — clean edge, no fringe or box | Pass |

## Final library audit

Re-run on 2026-07-30 after the 22nd asset:

- `validate_icons.py` passed all 22 finals: RGBA, 1024×1024, four exact
  zero-alpha corners, and zero residual chroma pixels for every file.
- File audit found exactly 22 keyed finals and 22 retained opaque edit targets;
  no expected file was missing and no unexpected final was present.
- Manifest audit found both the final and opaque path for every expected badge.
- The complete library was inspected in six shelf-scale rows at 40 pt on
  `#F98529 → #EB2E02`: unlocked and runtime-gray locked rows for Streaks,
  Activities, and Time Reclaimed. All silhouettes read cleanly, progression
  remains visible, and no asset shows a magenta fringe or box.

## Generation log

### Streak 3 days — accepted

- **Final path:** `design/badges/streak-3-days.png`
- **Opaque output:** `design/badges/streak-3-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 3 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a plump upright three-lobed outer flame silhouette with one shallow recessed inner-flame detail shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 7 days — accepted

- **Final path:** `design/badges/streak-7-days.png`
- **Opaque output:** `design/badges/streak-7-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 7 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a plump upright five-lobed outer flame silhouette with one broad shallow recessed inner-flame detail shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### Streak 14 days — accepted

- **Final path:** `design/badges/streak-14-days.png`
- **Opaque output:** `design/badges/streak-14-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 14 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a broad upright flame silhouette with a tall center point, two rounded side tongues, and two simple nested shallow flame recesses shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 30 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-30-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the generation produced only three outer flame points,
  repeating a lower-rank silhouette instead of the requested five-point
  crown-like progression. Material, palette, background, and inner recess were
  otherwise correct, so STYLE.md required a precise edit rather than a new
  generation.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 30 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — a bold crown-like flame silhouette with one tall center point, four rounded outer tongues, a broad rounded base, and one simple shallow inner-flame recess shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 30 days, precise correction — accepted

- **Final path:** `design/badges/streak-30-days.png`
- **Opaque output:** `design/badges/streak-30-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-30-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer flame silhouette: add one small rounded flame tongue on each side between the tall center point and the existing outer side tongue, producing five clearly separated outer points total in a front-facing symmetrical crown-like flame. Keep the existing inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```


### Streak 60 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-60-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the generation stopped at five outer flame points rather
  than the requested seven-point progression. The correct material, palette,
  background, and inner recess made it an edit candidate.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 60 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact flame-shaped milestone badge — one connected seven-point flame crown silhouette with the center point tallest and three progressively shorter rounded flame tongues on each side, a broad rounded base, and one simple shallow inner-flame recess shaded light gray, front-facing and symmetrical, with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 60 days, precise correction — accepted

- **Final path:** `design/badges/streak-60-days.png`
- **Opaque output:** `design/badges/streak-60-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-60-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer flame silhouette: add one new small rounded connected flame tongue at the far lower-left outer edge and one matching tongue at the far lower-right outer edge, producing seven clearly separated outer points total: one tall center point plus three progressively shorter points on each side. Keep the existing five points, inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```


### Streak 100 days, attempt 1 — rejected

- **Output:** `design/badges/_rejected/streak-100-days-attempt-1.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the high-rank crest stopped at two prominent stepped
  tongues per side instead of the requested three. Its otherwise correct
  material, palette, backdrop, and tall silhouette were preserved through a
  precise edit.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 100 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact high-rank flame crest badge — a tall central flame rising from wide stepped flame shoulders with three bold rounded tongues along each side and one broad shallow double-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 100 days, precise correction — accepted

- **Final path:** `design/badges/streak-100-days.png`
- **Opaque output:** `design/badges/streak-100-days-opaque.png`
- **Template used:** `precise-object-edit` on attempt 1
- **Edit target:** `design/badges/_rejected/streak-100-days-attempt-1.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above. At 40 pt the three
  prominent stepped tongues per side remain distinct; the tiny outer base curl
  reads as the connected foot of the silhouette.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Change only the outer crest silhouette: add one new small rounded connected flame tongue at the far lower-left outer edge and one matching tongue at the far lower-right outer edge, so the tall central flame has three progressively shorter stepped tongues on each side. Keep the existing tall center flame, four existing side tongues, inner recessed flame, broad rounded base, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, day label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```


### Streak 180 days — accepted

- **Final path:** `design/badges/streak-180-days.png`
- **Opaque output:** `design/badges/streak-180-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 180 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact elite flame crest badge — two equal tall rounded center flame peaks separated by one clean shallow notch, flowing into three progressively shorter stepped flame tongues on each side, with one broad shallow inner-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### Streak 365 days — accepted

- **Final path:** `design/badges/streak-365-days.png`
- **Opaque output:** `design/badges/streak-365-days-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: STREAK 365 DAYS.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact pinnacle flame crown badge — three tall rounded crown-flame peaks across the top with the center peak slightly tallest, flowing into three shorter stepped flame tongues on each side, with one broad shallow triple-flame recess shaded light gray, all joined into one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, day label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 1 Activity — accepted

- **Final path:** `design/badges/activity-1.png`
- **Opaque output:** `design/badges/activity-1-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 1 ACTIVITY.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt-shaped milestone badge — one thick confident zigzag bolt leaning from upper-right to lower-left with broad rounded corners and one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing piece with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced diagonal silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 5 Activities — accepted

- **Final path:** `design/badges/activity-5.png`
- **Opaque output:** `design/badges/activity-5-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.
- **Review note:** direct comparison with `activity-1.png` confirmed that the
  original output adds exactly one small fin on each side beyond the bolt's two
  inherent zigzag corners. It is symmetric and advances the silhouette at
  40 pt.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 5 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and one short swept speed fin integrated into each side, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 5 Activities, unnecessary correction — rejected

- **Output:** `design/badges/_rejected/activity-5-correction-1.png`
- **Template used:** `precise-object-edit` on the accepted original
- **Edit target:** the original output retained as
  `design/badges/activity-5-opaque.png`
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Rejection reason:** the edit removed the intended lower-right speed fin but
  retained the matching upper-left fin, making the silhouette asymmetric. The
  edit was triggered by initially misclassifying the base bolt's inherent
  zigzag corners as extra fins; side-by-side comparison corrected that review
  error, so the symmetric original ships.

**Verbatim prompt**

```text
Use case: precise-object-edit. Image 1 is the strict edit target. Images 2 and 3 remain strict material and shading references. Remove only the lower horizontal speed fin from the left edge and the matching lower horizontal speed fin from the right edge, smoothly restoring the lightning bolt's rounded outer edge in those two small regions. Keep the upper-left and upper-right speed fins, entire bolt geometry, inner recessed bolt, exact ivory clay material, soft light-gray shading, matte lighting, centered scale, generous padding, and perfectly flat uniform solid magenta #FF00FF background unchanged. No numeral, number, count label, threshold mark, text, separate pieces, shadow, glow, logo, or watermark. Change nothing else.
```


### 10 Activities — accepted

- **Final path:** `design/badges/activity-10.png`
- **Opaque output:** `design/badges/activity-10-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 10 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and two short parallel swept speed fins integrated into each outer side beyond the bolt's inherent zigzag corners, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 25 Activities — accepted

- **Final path:** `design/badges/activity-25.png`
- **Opaque output:** `design/badges/activity-25-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 25 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact lightning-bolt milestone badge — one thick upright zigzag bolt with broad rounded corners and three short parallel swept speed fins integrated into each outer side beyond the bolt's inherent zigzag corners, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing balanced silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing with a balanced energetic silhouette. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 50 Activities — accepted

- **Final path:** `design/badges/activity-50.png`
- **Opaque output:** `design/badges/activity-50-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 50 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact winged-lightning milestone badge — one thick upright rounded zigzag bolt with one short solid wing integrated into each side, each wing formed by three broad stepped feather-like lobes, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing symmetrical crest with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 100 Activities — accepted

- **Final path:** `design/badges/activity-100.png`
- **Opaque output:** `design/badges/activity-100-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 100 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact high-rank winged-lightning crest badge — one thick upright rounded zigzag bolt with one broad upswept solid wing integrated into each side, each wing formed by four large stepped feather-like lobes, plus one shallow recessed inner-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 250 Activities — accepted

- **Final path:** `design/badges/activity-250.png`
- **Opaque output:** `design/badges/activity-250-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 250 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact elite winged-lightning crest badge — a bold double-tipped central bolt with two equal rounded upper lightning prongs separated by one clean notch and merging into one strong lower bolt point, flanked by broad upswept solid wings with five stepped lobes each, plus one shallow recessed double-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 500 Activities — accepted

- **Final path:** `design/badges/activity-500.png`
- **Opaque output:** `design/badges/activity-500-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 500 ACTIVITIES.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact pinnacle winged-lightning crown badge — three bold rounded upper lightning prongs across the top with the center prong slightly tallest, all merging into one strong lower bolt point, flanked by broad upswept solid wings with five large stepped lobes each, plus one shallow recessed triple-bolt detail shaded light gray, all joined as one solid front-facing symmetrical silhouette with no pedestal or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, count label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 10 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-10-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-10-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 10 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact hourglass-shaped milestone badge — one solid upright hourglass silhouette with broad rounded top and bottom caps, smoothly pinched solid sides at the waist, and one shallow recessed two-bulb hourglass detail shaded light gray, front-facing and symmetrical, with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```

### 25 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-25-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-25-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 25 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact hourglass milestone badge — one solid upright hourglass silhouette with broad rounded top and bottom caps, smoothly pinched solid sides at the waist, one short rounded outward fin integrated at each of the four cap ends, and one shallow recessed two-bulb hourglass detail shaded light gray, front-facing and symmetrical, with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 50 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-50-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-50-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 50 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact hourglass milestone badge — one solid upright hourglass silhouette with smoothly pinched solid sides at the waist, broad top and bottom caps whose four outer ends each form two short rounded stepped fins, and one shallow recessed two-bulb hourglass detail shaded light gray, all joined as one front-facing symmetrical piece with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 100 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-100-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-100-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 100 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact high-rank hourglass crest badge — one solid upright hourglass silhouette with smoothly pinched solid sides at the waist, a broad top cap whose left and right ends curve upward into one bold rounded crown prong each, a matching broad bottom cap whose ends curve downward into one prong each, and one shallow recessed two-bulb hourglass detail shaded light gray, all joined as one front-facing symmetrical piece with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 250 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-250-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-250-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 250 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact elite hourglass crown badge — one solid upright hourglass silhouette with smoothly pinched solid sides at the waist, a broad top cap whose left and right corners each fork into two bold rounded upward crown prongs, a matching bottom cap whose corners each fork into two downward prongs, and one shallow recessed two-bulb hourglass detail shaded light gray, all joined as one front-facing symmetrical piece with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```


### 500 Hours Reclaimed — accepted

- **Final path:** `design/badges/time-reclaimed-500-hours.png`
- **Opaque output:** `design/badges/time-reclaimed-500-hours-opaque.png`
- **Template used:** Family A canonical soft-clay hero template
- **Reference images passed:**
  `prototype/assets/icons/lock-body.png`,
  `prototype/assets/icons/lock-shackle.png`
- **Validation:** accepted; see the table row above.

**Verbatim prompt**

```text
Use case: new-asset-with-style-reference
Asset type: 1024 × 1024 ExcerLock iOS milestone badge: 500 HOURS RECLAIMED.
Input images: Image 1 and Image 2 are strict material and shading references; match their ivory clay surface, soft neutral light-gray shading, gentle rounded volume, and matte finish exactly. Do not copy either padlock silhouette or keyhole.
Primary request: Create one single centered compact pinnacle hourglass crown badge — one solid upright hourglass silhouette with smoothly pinched solid sides at the waist, a broad top crown formed by five bold rounded upward prongs with the center prong slightly tallest, a matching bottom crown formed by five downward prongs, and one shallow recessed two-bulb hourglass detail shaded light gray, all joined as one front-facing symmetrical piece with no hollow openings, pedestal, or separate pieces. The subject must read instantly at 40 pt display size.
Scene/backdrop: perfectly flat, uniform solid magenta #FF00FF filling every background pixel to every corner, solely for chroma-key removal. No gradient, texture, shadow, glow, vignette, floor, reflection, particles, or lighting variation in the background.
Style/medium: soft matte 3D clay-like render; ivory white #F4F1F5 surfaces with soft neutral light-gray shading (#C9C4CC) and gentle rounded volume; recessed details are shaded soft light gray, never dark holes; no gloss, no metal, no hard shadows.
Color palette: ivory white #F4F1F5 and soft neutral light-gray #C9C4CC only in the subject. Do not use cyan, blue, teal, pink, gold, red, gray outside the listed light-gray, black, orange, or magenta in the subject.
Composition/framing: one centered subject with generous even padding; every subject pixel well separated from all four edges; strong readable silhouette at 40 pt.
Constraints: the subject must be opaque and confidently solid-filled, not hollow wire art and not merely thickened outlines. Crisp clean outer edge for chroma keying. The badge is front-facing and symmetrical. No numeral, number, hour label, or threshold mark. No outer halo, bloom, cast shadow, energy field, black box, text, UI, frame, face, character, logo, or watermark. One subject only.
```
