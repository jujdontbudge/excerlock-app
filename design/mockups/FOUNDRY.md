# ExcerLock full-screen mockup foundry

## Ticket #26 — four-tab dashboard + STATE/RATE card variants

- Date: 2026-07-28
- Style family: D — Full-screen mockup
- Generator: Codex built-in `image_gen` (GPT Image 2)
- Template/workflow: `ui-mockup` + `precise-object-edit`, extended by `iphone-ui-gpt-image-2`
- Primary style reference: `design/mockups/nosparkle-v14-best.png`
- Token references: `design/STYLE.md`, `design/pillow-style-guide.md`, `excerlock-app-prd.md` §3.15
- Delivery note: built-in `image_gen` returned a native 853×1844 portrait canvas rather than the requested 1206×2622 API/scaffold canvas. The user explicitly required the built-in generator, so no forbidden post-generation resize, deterministic UI rendering, or frame stamping was used. All three accepted drafts use the same native canvas.

### Validation summary

| Final path | Canvas | Four corners black | Condition-card inset | Required content | Other measured checks | Result |
|---|---:|---|---:|---|---|---|
| `design/mockups/tabbar-4plain-v1.png` | 853×1844 RGB | yes (`max channel ≤ 4`) | 42 px left / 45 px right ≈ 19.8 / 21.2 pt | Home · Manage · Analysis · Settings; Home active; no center/fifth tab | four nav clusters centered near x=103, 312, 526, 743; mocked status bar; no Mobbin footer | ACCEPTED DRAFT |
| `design/mockups/card-state-live-v1.png` | 853×1844 RGB | yes (`max channel ≤ 4`) | 42 px / 42 px ≈ 19.8 / 19.8 pt | ACTIVE; Walking; apps-unlocked line; drain-paused note; no Complete/meter | four nav clusters; green live indicator; full-bleed painted banner + scrim | ACCEPTED DRAFT |
| `design/mockups/card-rate-meter-v1.png` | 853×1844 RGB | yes (`max channel ≤ 4`) | 48 px / 50 px ≈ 22.6 / 23.6 pt | metric; exchange ratio; earned-so-far; daily cap; no Complete/ACTIVE | continuous amber meter measures 61.9% vs requested 62.4%; four nav clusters | ACCEPTED DRAFT — symmetric model variance retained over asymmetric correction |

## `tabbar-4plain-v1.png`

Final path: `design/mockups/tabbar-4plain-v1.png`

Accepted built-in source:
`/Users/johansardar/.codex/generated_images/019faaa5-a35c-7591-b925-21ae8fcb0592/exec-4354b585-ef90-4235-893e-ff5f5c4ecf6d.png`

### Attempt record

| Attempt | Built-in output | Reference image(s) | Validation / disposition |
|---|---|---|---|
| T0 | `exec-2dbd064f-aa8c-428b-9750-754b9f6e3a38.png` | `design/mockups/nosparkle-v14-best.png` | REJECTED — content inset measured ~35–36 px rather than 42 px; physical corner mask absent. |
| T1 | `exec-df67c5b4-542c-4d03-8814-f76880006544.png` | T0 | REJECTED AS INTERMEDIATE — 41–42 px card inset passed; physical corner mask still absent. |
| T2 | `exec-79456b6f-4c79-4265-b26e-70e303752436.png` | T1 | REJECTED — frame correction created 30 px black side rails / a floating rounded phone silhouette. |
| T3 | `exec-4354b585-ef90-4235-893e-ff5f5c4ecf6d.png` | T1; accepted STATE screen used only as corner-mask geometry reference | ACCEPTED — black corner pixels without side rails; 42/45 px condition-card inset; copy and four tabs preserved. |

### T0 verbatim prompt

```text
Use case: precise-object-edit
Asset type: ExcerLock STYLE.md Family D full-screen native iOS dashboard mockup.
Input images: Image 1 is the strict approved ExcerLock dashboard style, palette, component, illustration, and content-hierarchy anchor. Preserve its identity. The dark “Pillow curated by Mobbin” strip is outside the app and must not appear.
Primary request: Re-mock the approved dashboard as a native portrait iPhone 17 Pro screenshot. Change only the bottom navigation from its five-slot center-button design to FOUR plain, evenly spaced tabs: “Home”, “Manage”, “Analysis”, “Settings”. No center button, no fifth tab. Active tab is Home.
Hard geometry: final canvas exactly 1206×2622 px, representing 402×874 pt at 3×. The physical display has rounded continuous corners; black out pixels outside the exact iPhone 17 Pro simulator display shape. Render a black Dynamic Island pill at x=415 y=42 width=376 height=110 radius=55. Use a mocked native iOS status bar with time “9:41”, cellular, Wi-Fi, and battery in white at the correct top safe-area spacing. Bottom home indicator centered at x=603 y=2554 width=432 height=15 radius=7. No outer phone bezel or device body.
Grid and margins: use a strict 20 pt system: every main horizontal edge is x=20 pt / 60 px and x=382 pt / 1146 px; card width 362 pt / 1086 px. Do not eyeball the margins. Let the orange app background fill the visible display behind the status area; do not put the app inside a smaller rounded container.
Screen hierarchy, preserved from Image 1: white half-complete goal bar with white lock thumb and centered caption “50% of goal completed”; large centered soft matte ivory clay padlock with recessed light-gray keyhole; balance row “Time Locked” / “2h 14m” and “Screen Time” / “1h 32m”; full-bleed warm dark semi-realistic painted gym banner card with info icon, “Go to gym”, and white “Complete” pill; translucent warm-dark borderless shortcut rows “Edit” with orange pencil and “Analysis” with orange arrow; then the new four-tab navigation and home indicator. Keep the card painting, clay lock, text, spacing rhythm, radii, button shape, and warm hierarchy faithful to Image 1.
Tab geometry: four identical tab footprints centered at x=50.25, 150.75, 251.25, and 351.75 pt. Use simple filled iOS glyphs: house, slider controls, rounded bar chart, gear. Icons exactly 24 pt; labels exactly 11 pt beneath. Home is solid white and semibold; the three inactive items are warm white at about 60% opacity. No selected circle, no oversized icon, no raised item, no background bar, no divider, no decorative indicator, no fifth slot.
Color palette: exact bright orange vertical gradient sampled from the anchor, #F98529 at top through #F97A22, #F76D1C, #F45C11, #F44D09, #F04205 to #EB2E02 at bottom; ivory #F4F1F5 and white for hero/chrome; soft gray #C9C4CC for recessed lock shading; translucent warm dark brown cards; orange #FC5F02 glyph accents. One accent per element.
Typography: SF Pro / SF Pro Rounded proportions, crisp native iOS typesetting, tabular figures, readable exact copy.
Constraints: preserve the approved dashboard identity; all text verbatim and legible; no extra header, streak chip, cards, badges, sparkles, gradients inside cards, or decoration; no card borders; no drop shadows on dark cards; no pure black app background; no marketing poster; no web mockup; no fake bezel; no random blobs; no watermark; no Mobbin footer.
```

### T1 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one geometric property: increase the shared horizontal inset of the main UI from the current approximately 35–36 px to exactly 42 px on this approximately 851–852 px-wide built-in portrait output, which represents the required 20 pt margin. The goal progress bar, painted condition card, Edit row, and Analysis row must all begin at x=42 px and end 42 px before the right edge. Move or scale only those components inward symmetrically while keeping their heights, corner radii, vertical positions, and internal layouts visually unchanged.
Constraints: preserve every other pixel-level design decision and all exact text from Image 1: iPhone screenshot framing, status bar, Dynamic Island, orange gradient, lock hero, balance row, gym painting, Complete pill, four equally spaced plain tabs Home / Manage / Analysis / Settings with Home active, home indicator, colors, typography, and content hierarchy. Do not add, remove, rewrite, or restyle anything. No footer, watermark, fifth tab, center button, bezel, poster, or web mockup.
```

### T2 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one iPhone frame property: clip the orange app surface to native iPhone 17 Pro continuous display corners and fill only the pixels outside those four curved physical display corners with pure black, matching a simulator screenshot with --mask black. The top-row visible app surface should begin around 66 pt from each side and flow through smooth continuous curves. Make all four extreme canvas corner pixels black. Do not add an outer bezel or phone body.
Constraints: change only the four outside-screen corner regions. Preserve the entire app UI exactly as Image 1, including dimensions, status bar, Dynamic Island, 20 pt card margins, orange gradient, lock, all dashboard copy, gym card, shortcut rows, four plain tabs, and home indicator. Do not move, scale, rewrite, add, remove, or restyle anything.
```

### T3 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict tabbar-dashboard edit target. Image 2 is only the correct iPhone physical-corner-mask geometry reference; do not copy any app content, walking scene, card copy, spacing, or dimensions from Image 2.
Primary request: Change only the four extreme physical display corner cutouts in Image 1 so they match Image 2 exactly: small smooth black simulator-style corner regions only, with the orange app surface still reaching both vertical screen edges immediately below the curved corner transition. Do not create black side rails, a phone body, a bezel, or a rounded phone floating in black.
Constraints: preserve every other pixel-level design decision from Image 1 exactly, including its 42 px content edges, orange full-screen background, gym card and “Complete” button, four plain tab items Home / Manage / Analysis / Settings, all copy, Dynamic Island, status bar, and home indicator.
```

## `card-state-live-v1.png`

Final path: `design/mockups/card-state-live-v1.png`

Accepted built-in source:
`/Users/johansardar/.codex/generated_images/019faaa5-a35c-7591-b925-21ae8fcb0592/exec-42e0b547-ccb3-4930-a5b3-10222f72a087.png`

### Attempt record

| Attempt | Built-in output | Reference image(s) | Validation / disposition |
|---|---|---|---|
| S0 | `exec-4b1d82a9-0721-4024-9212-c3bf587128d4.png` | `design/mockups/nosparkle-v14-best.png` | REJECTED — condition-card inset measured ~35 px rather than 42 px. |
| S1 | `exec-1052e2c5-e533-4946-981f-5e3d36648231.png` | S0 | REJECTED AS INTERMEDIATE — condition card remained 38/39 px. |
| S2 | `exec-42e0b547-ccb3-4930-a5b3-10222f72a087.png` | S1 | ACCEPTED — condition-card edges measure 42/42 px; all STATE copy and black corner mask preserved. |

### S0 verbatim prompt

```text
Use case: precise-object-edit
Asset type: ExcerLock STYLE.md Family D full-screen native iOS Home mockup showing the STATE-kind condition card.
Input images: Image 1 is the strict approved ExcerLock dashboard style, palette, component, illustration, and content-hierarchy anchor. Preserve its identity. The dark “Pillow curated by Mobbin” strip is outside the app and must not appear.
Primary request: Re-mock the approved dashboard as a native portrait iPhone 17 Pro Home screenshot. Replace only the gym event card with a STATE-kind live walking card. The card must say “Walking” and “Apps unlocked while you keep moving”, show a live “ACTIVE” indicator with a small iOS-green pulsing dot/ring, and show the note “Drain paused while active”. There is no Complete button. Also use the locked four-tab plain navigation: Home, Manage, Analysis, Settings; active is Home; no center button and no fifth tab.
Hard geometry: final canvas exactly 1206×2622 px, representing 402×874 pt at 3×. The physical display has rounded continuous corners; black out pixels outside the exact iPhone 17 Pro simulator display shape. Render a black Dynamic Island pill at x=415 y=42 width=376 height=110 radius=55. Use a mocked native iOS status bar with time “9:41”, cellular, Wi-Fi, and battery in white. Bottom home indicator centered at x=603 y=2554 width=432 height=15 radius=7. No outer bezel or device body.
Grid and margins: strict 20 pt system: every main horizontal edge is x=20 pt / 60 px and x=382 pt / 1146 px; each large card and shortcut row is 362 pt / 1086 px wide. Do not eyeball margins. Let the orange app background fill the visible display behind the status area; no smaller rounded app container.
Screen hierarchy: white half-complete goal bar and caption “50% of goal completed”; large centered soft matte ivory clay padlock with recessed light-gray keyhole; balance row “Time Locked” / “2h 14m” and “Screen Time” / “1h 32m”; the new walking state card; shortcut rows “Edit” and “Analysis”; four equal plain tabs; home indicator. Keep the section order, vertical rhythm, rounded geometry, exact copy, and visual hierarchy faithful to Image 1.
STATE card: x=20 pt, full width minus 40 pt, about 164 pt tall, radius 20 pt, overflow hidden. Fill it edge-to-edge with a semi-realistic painted illustration in the same warm dark, moody, real-but-not-photoreal style as Image 1’s gym banner: a single adult walking briskly along a city park path at warm dawn, seen from behind, quiet forward motion, no text/UI/logo baked into the painting. Apply a dark transparent bottom-gradient scrim. Overlay exact white UI copy only: title “Walking” in 22 pt bold at lower left; one line “Apps unlocked while you keep moving” in 13 pt below it; at upper left a compact borderless translucent pill containing a small green live dot/ring and “ACTIVE” in 12 pt semibold; at lower right a compact warm-dark translucent note with pause glyph and “Drain paused while active” in 12 pt. The live dot/ring is the one green accent on that indicator. No claim button, no progress meter, no duplicate title, no other badge.
Tabs: four identical footprints centered x=50.25, 150.75, 251.25, 351.75 pt; filled iOS house, slider-controls, rounded bar-chart, gear glyphs at 24 pt; labels at 11 pt. Home solid white semibold; inactive warm white 60%. No tab-bar background, selected circle, raised item, divider, or decorative marker.
Color palette: exact bright orange vertical gradient sampled from the anchor, #F98529 → #F97A22 → #F76D1C → #F45C11 → #F44D09 → #F04205 → #EB2E02; ivory #F4F1F5, soft gray #C9C4CC, white, translucent warm dark brown, orange #FC5F02 accents, iOS green #34C759 only for the ACTIVE dot/ring. One accent per element.
Typography: SF Pro / SF Pro Rounded proportions, tabular figures, crisp native iOS typesetting.
Constraints: all text verbatim and legible; status layer remains UI, not painted into the banner; no event Complete button; no meter; no extra cards, header, streak chip, badges, sparkles, decoration, card borders, shadows on dark cards, fake bezel, poster, web mockup, random blobs, watermark, or Mobbin footer.
```

### S1 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one geometric property: increase the shared horizontal inset of the main UI from the current approximately 35–37 px to exactly 42 px on this 852 px-wide built-in portrait output, which represents the required 20 pt margin. The goal progress bar, Walking state card, Edit row, and Analysis row must all begin at x=42 px and end 42 px before the right edge. Move or scale only those components inward symmetrically while keeping their heights, corner radii, vertical positions, and internal layouts visually unchanged.
Constraints: preserve every other pixel-level design decision and all exact text from Image 1: black iPhone display-mask corners, status bar, Dynamic Island, orange gradient, lock hero, balance row, painted walking banner, “ACTIVE”, “Walking”, “Apps unlocked while you keep moving”, “Drain paused while active”, four plain tabs Home / Manage / Analysis / Settings with Home active, home indicator, colors, typography, and content hierarchy. Do not add, remove, rewrite, or restyle anything. No Complete button, meter, footer, watermark, fifth tab, center button, bezel, poster, or web mockup.
```

### S2 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one remaining geometric property. The Walking card currently begins near x=38 px and ends near x=813 px. Inset it by 4 more pixels on each side so its straight vertical edges begin exactly at x=42 px and end exactly 42 px before the right edge. Apply the same exact x=42 px alignment to the goal bar, Edit row, and Analysis row. Keep every internal element centered within its parent and preserve all heights and vertical positions.
Constraints: change only these four horizontal boundaries. Preserve the iPhone frame, black corners, Dynamic Island, lock, balance row, painted walking scene, exact texts “ACTIVE”, “Walking”, “Apps unlocked while you keep moving”, “Drain paused while active”, four tabs and labels, home indicator, palette, typography, radii, and all other geometry. No new or removed elements; no text changes.
```

## `card-rate-meter-v1.png`

Final path: `design/mockups/card-rate-meter-v1.png`

Accepted built-in source:
`/Users/johansardar/.codex/generated_images/019faaa5-a35c-7591-b925-21ae8fcb0592/exec-f572a5ab-98f6-4ac3-8ef4-d46629f15aee.png`

### Attempt record

| Attempt | Built-in output | Reference image(s) | Validation / disposition |
|---|---|---|---|
| R0 | `exec-322a8824-f975-4386-a382-d3c8eef4b215.png` | `design/mockups/nosparkle-v14-best.png` | REJECTED — condition-card inset measured ~32–35 px. |
| R1 | `exec-54143745-5099-4828-b2cc-71e010cc792b.png` | R0 | REJECTED — margin edit remained ~34–36 px. |
| R2 | `exec-63ab99c7-4ebe-4724-a198-d7a707a6ce7e.png` | R1 | REJECTED — second margin edit remained ~34–37 px. |
| R3 | `exec-f572a5ab-98f6-4ac3-8ef4-d46629f15aee.png` | R2; accepted STATE screen used only as x-boundary reference | ACCEPTED DRAFT — symmetric 48/50 px inset; exact copy; continuous meter measured 61.9%; retained over later asymmetric correction. |
| R4 | `exec-5268488a-08d3-4ffc-9ce9-7b616340b001.png` | R3; accepted tabbar screen used only as x-boundary reference | REJECTED — correction produced asymmetric 46/52 px inset. |
| R5 | `exec-23e9c840-96d1-483b-917e-348c14e6a4c5.png` | accepted R3 project file; accepted STATE project file used only as Dynamic Island reference | REJECTED — island-width edit overshot to x=281..570 and card inset drifted to 50/53 px. |

### R0 verbatim prompt

```text
Use case: precise-object-edit
Asset type: ExcerLock STYLE.md Family D full-screen native iOS Home mockup showing the RATE-kind condition card.
Input images: Image 1 is the strict approved ExcerLock dashboard style, palette, component, illustration, and content-hierarchy anchor. Preserve its identity. The dark “Pillow curated by Mobbin” strip is outside the app and must not appear.
Primary request: Re-mock the approved dashboard as a native portrait iPhone 17 Pro Home screenshot. Replace only the gym event card with a RATE-kind card titled “Today’s steps → screen time”. It must show today’s metric “6,240 steps today”, exchange ratio “500 steps = 10 min”, earned-so-far “2h 05m earned”, and one continuous meter at exactly 62.4% progress toward the daily cap “Daily cap 10,000 steps”. There is no Complete button. Also use the locked four-tab plain navigation: Home, Manage, Analysis, Settings; active is Home; no center button and no fifth tab.
Hard geometry: final canvas exactly 1206×2622 px, representing 402×874 pt at 3×. The physical display has rounded continuous corners; black out pixels outside the exact iPhone 17 Pro simulator display shape. Render a black Dynamic Island pill at x=415 y=42 width=376 height=110 radius=55. Use a mocked native iOS status bar with time “9:41”, cellular, Wi-Fi, and battery in white. Bottom home indicator centered at x=603 y=2554 width=432 height=15 radius=7. No outer bezel or device body.
Grid and margins: strict 20 pt system: every main horizontal edge is x=20 pt / 60 px and x=382 pt / 1146 px; each large card and shortcut row is 362 pt / 1086 px wide. Do not eyeball margins. Let the orange app background fill the visible display behind the status area; no smaller rounded app container.
Screen hierarchy: white half-complete goal bar and caption “50% of goal completed”; large centered soft matte ivory clay padlock with recessed light-gray keyhole; balance row “Time Locked” / “2h 14m” and “Screen Time” / “1h 32m”; the new rate meter card; shortcut rows “Edit” and “Analysis”; four equal plain tabs; home indicator. Keep the section order, vertical rhythm, rounded geometry, exact copy, and visual hierarchy faithful to Image 1.
RATE card: x=20 pt, full width minus 40 pt, about 164 pt tall, radius 20 pt, overflow hidden. Fill it edge-to-edge with a semi-realistic painted illustration in the same warm dark, moody, real-but-not-photoreal style as Image 1’s gym banner: close ground-level view of walking shoes crossing a warm sunrise city path with subtle motion, no text/UI/logo baked into the painting. Apply a dark transparent bottom-gradient scrim. Overlay exact white UI copy only: “Today’s steps → screen time” in 18 pt semibold at upper left; “6,240” in 27 pt SF Rounded bold with “steps today” in 12 pt; “500 steps = 10 min” in 12 pt warm-white secondary text; right-aligned “2h 05m” in 22 pt bold with “earned” in 12 pt. Near the bottom, one continuous rounded 8 pt meter: translucent-white track and amber #FBBF24 fill ending exactly 62.4% across, rounded cap, no segments, no ticks. Beneath it, right-aligned “Daily cap 10,000 steps” in 11 pt secondary text. No claim button, no ACTIVE chip, no duplicate title.
Tabs: four identical footprints centered x=50.25, 150.75, 251.25, 351.75 pt; filled iOS house, slider-controls, rounded bar-chart, gear glyphs at 24 pt; labels at 11 pt. Home solid white semibold; inactive warm white 60%. No tab-bar background, selected circle, raised item, divider, or decorative marker.
Color palette: exact bright orange vertical gradient sampled from the anchor, #F98529 → #F97A22 → #F76D1C → #F45C11 → #F44D09 → #F04205 → #EB2E02; ivory #F4F1F5, soft gray #C9C4CC, white, translucent warm dark brown, orange #FC5F02 accents, amber #FBBF24 only for meter fill. One accent per element.
Typography: SF Pro / SF Pro Rounded proportions, tabular figures, crisp native iOS typesetting.
Constraints: all text verbatim and legible; status layer remains UI, not painted into the banner; no event Complete button; no ACTIVE chip; no segmented meter; no extra cards, header, streak chip, badges, sparkles, decoration, card borders, shadows on dark cards, fake bezel, poster, web mockup, random blobs, watermark, or Mobbin footer.
```

### R1 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one geometric property: increase the shared horizontal inset of the main UI from the current approximately 32–35 px to exactly 42 px on this 852 px-wide built-in portrait output, which represents the required 20 pt margin. The goal progress bar, rate meter card, Edit row, and Analysis row must all begin at x=42 px and end 42 px before the right edge. Move or scale only those components inward symmetrically while keeping their heights, corner radii, vertical positions, meter fill percentage, and internal layouts visually unchanged.
Constraints: preserve every other pixel-level design decision and all exact text from Image 1: black iPhone display-mask corners, status bar, Dynamic Island, orange gradient, lock hero, balance row, painted walking-shoes banner, “Today’s steps → screen time”, “6,240 steps today”, “500 steps = 10 min”, “2h 05m earned”, the continuous 62.4% meter, “Daily cap 10,000 steps”, four plain tabs Home / Manage / Analysis / Settings with Home active, home indicator, colors, typography, and content hierarchy. Do not add, remove, rewrite, or restyle anything. No Complete button, ACTIVE chip, segmented meter, footer, watermark, fifth tab, center button, bezel, poster, or web mockup.
```

### R2 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict edit target.
Primary request: Correct exactly one remaining geometric property. The rate card currently begins near x=34 px and ends near x=816 px. Inset it by 8 more pixels on each side so its straight vertical edges begin exactly at x=42 px and end exactly 42 px before the right edge. Apply the same exact x=42 px alignment to the goal bar, Edit row, and Analysis row. Keep every internal element centered within its parent and preserve all heights, vertical positions, and the meter’s 62.4% fill.
Constraints: change only these four horizontal boundaries. Preserve the iPhone frame, black corners, Dynamic Island, lock, balance row, painted walking-shoes scene, exact texts “Today’s steps → screen time”, “6,240 steps today”, “500 steps = 10 min”, “2h 05m earned”, “Daily cap 10,000 steps”, the continuous meter, four tabs and labels, home indicator, palette, typography, radii, and all other geometry. No new or removed elements; no text changes.
```

### R3 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict RATE-card edit target. Image 2 is only the successful x=42 px horizontal-boundary geometry reference; do not copy its walking banner, ACTIVE state, person, copy, or any other content.
Primary request: Change only the horizontal outer edges of four components in Image 1 so they align exactly like Image 2: goal progress bar, full RATE card, Edit row, and Analysis row. Each straight left edge must be x=42 px and each straight right edge 42 px before the canvas edge. The RATE card currently starts near x=34 px; narrow it symmetrically by exactly 8 px on the left and 5 px on the right. Keep its internal RATE content centered and preserve the continuous meter at 62.4%.
Constraints: preserve every other detail from Image 1, especially the exact texts “Today’s steps → screen time”, “6,240 steps today”, “500 steps = 10 min”, “2h 05m earned”, and “Daily cap 10,000 steps”; preserve the shoe painting, meter, lock, balance row, four tabs, iPhone corner mask, status bar, Dynamic Island, palette, radii, vertical geometry, and home indicator. Do not copy any state-card content from Image 2.
```

### R4 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict RATE-card edit target. Image 2 is only the accepted x=42 px left / x=45 px right condition-card boundary reference; do not copy its gym content, Complete button, info icon, or event-card copy.
Primary request: Change exactly one geometry property: expand the RATE card horizontally by 6 px on the left and 5 px on the right so its straight vertical edges move from x=48 / 50 px to match Image 2 at x=42 / 45 px. Expand the goal bar, Edit row, and Analysis row to those same x=42 / 45 px boundaries. Preserve the RATE card’s height, vertical position, radius, internal layout, and continuous meter at 62.4%.
Constraints: preserve every other detail and exact text from Image 1, including “Today’s steps → screen time”, “6,240 steps today”, “500 steps = 10 min”, “2h 05m earned”, “Daily cap 10,000 steps”, walking-shoes painting, four tabs, frame corners, status bar, Dynamic Island, lock, balance row, palette, and home indicator. Do not add, remove, or rewrite anything; do not copy any event-card content from Image 2.
```

### R5 verbatim correction prompt

```text
Use case: precise-object-edit
Input images: Image 1 is the strict RATE-screen edit target. Image 2 is only the accepted Dynamic Island geometry reference; do not copy any app content or spacing from Image 2.
Primary request: Change exactly one frame property: widen the centered black Dynamic Island in Image 1 from its current approximate x=307..543 px bounds to x=293..559 px, matching Image 2 and the iPhone geometry at this model-native scale. Keep its center at x=426 px, top position, height, black fill, and pill radius visually unchanged.
Constraints: change only the Dynamic Island width. Preserve every other pixel-level design decision from Image 1 exactly: rate card bounds, walking-shoes painting, all exact rate copy, 62.4% continuous meter, lock, balance row, goal bar, shortcut rows, four tabs, corner mask, orange palette, status icons, and home indicator. Do not copy state-card content from Image 2.
```
