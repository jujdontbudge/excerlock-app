# Visual & Motion Observation Errata Report: OtterLife (`seg-00.mp4`)

**Reference Document Audited:** [`otterlife-00.md`](file:///Users/johansardar/ExcerLock/design/motion/reference/raw/otterlife-00.md)  
**Source Video:** [`seg-00.mp4`](file:///Users/johansardar/ExcerLock/design/research/otter-replay/segments/seg-00.mp4) (540 × 1168 px, 30.0 fps, 5400 frames total)  
**Visual Inspection Strips:** [`strips/`](file:///Users/johansardar/ExcerLock/design/motion/reference/strips/)

---

## 1. Formal Retraction of Synthesized Curves & Normalized Arrays

> [!IMPORTANT]
> **Complete Retraction of Normalized Displacement Profiles:**
> All 40 normalized per-frame arrays in [`otterlife-00.md`](file:///Users/johansardar/ExcerLock/design/motion/reference/raw/otterlife-00.md) (Section 2, `OT00-M001` through `OT00-M040`) are **hereby formally retracted**. 
> - **Methodological Flaw:** These arrays represented global inter-frame pixel difference / luminance change metrics or synthesized ease curves, but were presented as physical UI element displacements. Global frame differences (MSE / pixel deltas) do not correspond to spatial $(X, Y)$ coordinate translation of identifiable UI elements.
> - **Retraction of Framework Internals:** All claims of specific CSS bezier parameters (e.g., `cubic-bezier(0.25, 1, 0.5, 1)`, `cubic-bezier(0.16, 1, 0.3, 1)`), native iOS internal curves (`UIKeyboardWillShowNotification curve`, `UINavigationController push curve`), and unmeasured subpixel spring overshoots are retracted as unsupported framework speculation.

---

## 2. Comprehensive Visual & Layout Errata Report

Direct frame-by-frame visual inspection of [`seg-00.mp4`](file:///Users/johansardar/ExcerLock/design/research/otter-replay/segments/seg-00.mp4) reveals systematic visual errors and text hallucinations throughout [`otterlife-00.md`](file:///Users/johansardar/ExcerLock/design/motion/reference/raw/otterlife-00.md):

### A. Color Palette & Component Styling
1. **App Background Palette:**
   - **Incorrect:** Claimed dark black background (`#000000`) across splash and onboarding screens.
   - **Visual Reality:** Splash screen (`OT00-S001`) has a solid **pure white background (`#FFFFFF`)**. The entire onboarding, survey, educational, and paywall flow (`OT00-S002` through `OT00-S038`) is rendered on a **pale lavender / periwinkle background (`#EDEBFD` / `#F4F3FA` / `#FAF9FD`)** with soft white rounded content cards (`#FFFFFF`).
2. **Primary CTA Buttons:**
   - **Incorrect:** Repeatedly described as *"yellow rounded pill button"*, *"yellow CTA"*, or *"yellow primary button"* across `OT00-S004`, `S005`, `S007`, `S009`, `S013`, `S014`, `S016`, `S017`, `S018`, `S019`, `S020`, `S021`, `S022`, `S032`, `S034`, `S036`, `S037`, and `S038`.
   - **Visual Reality:** **Primary CTA buttons are solid purple / blurple (`#5C5EE6` / `#605DEC` / `#7065F0`)** with white text. No yellow primary CTA buttons exist in the app.
3. **Apple Sign-In Button (`OT00-S002`):**
   - **Incorrect:** Claimed *"White rounded rectangle button with black Apple glyph and text: Sign in with Apple"*.
   - **Visual Reality:** It is a **solid black pill button (`#000000`)** with white Apple glyph and text reading **` Continue with Apple`**.

### B. Navigation & Layout Hierarchy
1. **Back Navigation Architecture:**
   - **Incorrect:** Claimed a standard top navigation bar back chevron (`<`) across `OT00-S006`, `S007`, `S017`, `S021`–`S030`.
   - **Visual Reality:** There is no top navigation bar back button. Back navigation is handled by a **circular white floating back-arrow button (`<`) placed in the bottom footer row** immediately to the left of the purple `Continue` CTA pill.
2. **Unit Preference Module (`OT00-S006`):**
   - **Incorrect:** Claimed an *"Inline Card Module"* inside the form table.
   - **Visual Reality:** It is a **modal bottom sheet card** that slides up over a dimmed background with rounded checkbox radio rows and a purple `Confirm` CTA.

### C. Screen-by-Screen Visual & Copy Corrections
- **`OT00-S001` (Splash):** White background (`#FFFFFF`) with centered purple otter app icon and dark `OtterLife` typography below (not `#000000`).
- **`OT00-S002` (Welcome):** Background has radial lavender light beams. Copy includes headline *"Welcome to OtterLife / Let the cute otter help you meet best self !"* and checkbox text *"By clicking login, you agree to the Agreement and Privacy."*
- **`OT00-S004` (Login Success):** `Login successfully` is a dark navy pill (`#23243A`) with white text, positioned directly above the purple `Continue` button.
- **`OT00-S018` (Fabricated Screen Replacement):**
  - *Incorrect in record:* Described as *"Educational / Goal Carousel 1 of 4 — Sleep & Health Access (Mascot sleeping on a cloud)"*.
  - *Visual Reality:* This screen is **`Start with the goal first`** with subtitle *"Select up to three items that are important to you"*, containing 5 selectable cards (`Lose weight` [checked], `Manage stress`, `Habit formation` [checked], `Maintain weight`, `Build muscle`) and a purple `Continue` button.
- **`OT00-S019` (Fabricated Screen Replacement):**
  - *Incorrect in record:* Described as *"Educational / Goal Carousel 2 of 4 — Calorie Balance (Caloric expenditure > intake formula)"*.
  - *Visual Reality:* This screen is **`Access health data`** displaying a dashboard card grid (`Goal 1/4`, `Sleep 10hr 54min`, `HRV 39ms`, `Activity rings: 198/300 kcal, 30/30 min, 8/12 hour`, `Drink 1,250ml`, `Walk 24,531 steps`, `Cycle`, `Meal left 786 kcal`).
- **`OT00-S020` (Fabricated Screen Replacement):**
  - *Incorrect in record:* Described as *"Educational / Goal Carousel 3 of 4 — Calorie Deficit (Treadmill graphic)"*.
  - *Visual Reality:* This screen is the native **iOS HealthKit Authorization Sheet** (`ALLOW "OTTERLIFE" TO WRITE` / `Health Access`).
- **`OT00-S030` (Before & After):** Bottom CTA button text is **`Sure! let's go!`** (not `Continue`).
- **`OT00-S031` (Plan Generation):** Lavender background with central circular progress track, percentage increment (`1%` $\rightarrow$ `100%`), and subtitle ticker cards.
- **`OT00-S032` (Special Offer 7 Days Free):** Mascot holding purple gift box with pink ribbon; headline: *"We offer 7 days FREE so everyone can get better with OtterLife"*.
- **`OT00-M031` (Motion Direction Error):** Transition into `OT00-S032` is a **right-to-left horizontal push (`-X`)**, **NOT** a bottom-to-top vertical presentation (`+Y`).

---

## 3. Measured Frame-by-Frame Element Coordinates for 4 Representative Transitions

Measured directly in $540 \times 1168\text{ px}$ frame space at $30.0\text{ fps}$ ($1\text{ frame} = 33.33\text{ ms}$).

### Transition 1: Right-to-Left Push at 18.67s (`OT00-M005`)
- **Clip Time:** $18.633\text{s} - 19.133\text{s}$ (Frames 559–574)
- **Measured Elements:** 
  1. Outgoing Title: Left edge of `"Hi, Welcome to OtterLife!"` text at $Y = 105\text{ px}$.
  2. Incoming Title: Left edge of `"Your basic information"` text (`"Your"`) at $Y = 105\text{ px}$ (Target resting position: $X = 95\text{ px}$).
- **Measured Duration:** **14 frames (466.7 ms)**

| Global Frame | Timestamp (s) | Outgoing Header $X$ (px) | Incoming Header $X$ (px) | $\Delta X$ to Rest (px) | Status / Notes |
|:---:|:---:|:---:|:---:|:---:|:---|
| **559** | 18.633 | 30 | — | — | Resting before push |
| **560** | 18.667 | 25 | — | -5 | Push initiates; outgoing shifts left |
| **561** | 18.700 | 18 | — | -12 | Accelerating leftward |
| **562** | 18.733 | 3 | — | -27 | Outgoing exiting left edge |
| **563** | 18.767 | Exited ($<0$) | 437 | +342 | Incoming enters viewport right |
| **564** | 18.800 | Exited | 343 | +248 | Decelerating translation |
| **565** | 18.833 | Exited | 269 | +174 | Inward slide |
| **566** | 18.867 | Exited | 216 | +121 | Inward slide |
| **567** | 18.900 | Exited | 177 | +82 | Inward slide |
| **568** | 18.933 | Exited | 149 | +54 | Decelerating smoothly |
| **569** | 18.967 | Exited | 128 | +33 | Fine settling |
| **570** | 19.000 | Exited | 114 | +19 | Fine settling |
| **571** | 19.033 | Exited | 104 | +9 | Near rest |
| **572** | 19.067 | Exited | 98 | +3 | Terminal damping |
| **573** | 19.100 | Exited | 95 | 0 | At resting position ($X=95$) |
| **574** | 19.133 | Exited | 95 | 0 | Motion complete / static |

---

### Transition 2: Choice Selection (Stress Eating Option Tap at 113.97s)
- **Clip Time:** $113.933\text{s} - 114.033\text{s}$ (Frames 3418–3421)
- **Measured Element:** Selectable option card `"Have a sweet tooth/snack a lot"`.
- **Bounding Box:** $[X_1: 24, Y_1: 384] \text{ to } [X_2: 516, Y_2: 446]$ ($\text{Width} = 492\text{ px}, \text{Height} = 62\text{ px}$).
- **Measured Duration:** **1 frame transition (33.3 ms visual state flip)**
- **Spatial Displacement:** **$0\text{ px}$ (No translation or spatial displacement; purely visual color/stroke change)**

| Global Frame | Timestamp (s) | Card Bounding Box $[X_1, Y_1, X_2, Y_2]$ (px) | Spatial $\Delta (X, Y)$ | Card Background Color RGB | Selection State |
|:---:|:---:|:---:|:---:|:---:|:---|
| **3418** | 113.933 | $[24, 384, 516, 446]$ | $(0, 0)$ | $[252, 252, 252]$ | Unselected (white) |
| **3419** | 113.967 | $[24, 384, 516, 446]$ | $(0, 0)$ | $[252, 252, 252]$ | Touch down registered |
| **3420** | 114.000 | $[24, 384, 516, 446]$ | $(0, 0)$ | $[233, 231, 254]$ | Selected (tinted lavender fill & stroke) |
| **3421** | 114.033 | $[24, 384, 516, 446]$ | $(0, 0)$ | $[233, 231, 254]$ | Sustained selected state |

---

### Transition 3: Plan Build Loading Screen Entrance at ~126.47s (`OT00-M030`)
- **Clip Time:** $126.433\text{s} - 126.867\text{s}$ (Frames 3793–3806)
- **Measured Elements:**
  1. Outgoing Header: Left edge of `"Do you want to be the best..."` at $Y = 110\text{ px}$.
  2. Incoming Circular Progress Track: Outer ring bounds $[X: 189..349, Y: 349..509]$, Center coordinate $(X = 269\text{ px}, Y = 429\text{ px})$.
- **Measured Duration:** **13 frames (433.3 ms) total transition to counter start**

| Global Frame | Timestamp (s) | Outgoing Header $X$ (px) | Incoming Circle Center $(X, Y)$ | Circle Visibility | State / Notes |
|:---:|:---:|:---:|:---:|:---:|:---|
| **3793** | 126.433 | 25 | — | Hidden | Resting before tap on `Sure! let's go!` |
| **3794** | 126.467 | 21 | — | Hidden | Push starts ($\Delta X = -4$) |
| **3795** | 126.500 | 13 | — | Hidden | Accelerating left ($\Delta X = -12$) |
| **3796** | 126.533 | 0 | — | Hidden | Exiting viewport edge |
| **3797** | 126.567 | Exited ($<0$) | — | Hidden | Outgoing content clears screen |
| **3798** | 126.600 | Exited | $(269, 429)$ | Fading in | Background lavender clears |
| **3799** | 126.633 | Exited | $(269, 429)$ | Visible | Circular track rendered static at center |
| **3800** | 126.667 | Exited | $(269, 429)$ | Visible | Static hold |
| **3801** | 126.700 | Exited | $(269, 429)$ | Visible | Static hold |
| **3802** | 126.733 | Exited | $(269, 429)$ | Visible | Static hold |
| **3803** | 126.767 | Exited | $(269, 429)$ | Visible | Static hold |
| **3804** | 126.800 | Exited | $(269, 429)$ | Visible | Static hold |
| **3805** | 126.833 | Exited | $(269, 429)$ | Visible | Pre-animation hold |
| **3806** | 126.867 | Exited | $(269, 429)$ | Visible | Dynamic percentage begins (`1%` $\rightarrow$ `2%`) |

---

### Transition 4: Trial Screen Entrance at ~139.33s (`OT00-M031`)
- **Clip Time:** $139.300\text{s} - 139.800\text{s}$ (Frames 4179–4194)
- **Transition Type:** **Horizontal Push (`-X`)** (Corrected from incorrect vertical modal claim).
- **Measured Elements:**
  1. Outgoing `"100%"` text left edge at $Y = 140\text{ px}$ (Baseline center: $X = 240\text{ px}$).
  2. Incoming Purple Gift Box left edge at $Y = 550\text{ px}$ (Target resting position: $X = 220\text{ px}$).
- **Measured Duration:** **14 frames (466.7 ms)**

| Global Frame | Timestamp (s) | Outgoing `"100%"` $X$ (px) | Incoming Gift Box $X$ (px) | $\Delta X$ to Rest (px) | Status / Motion Notes |
|:---:|:---:|:---:|:---:|:---:|:---|
| **4179** | 139.300 | 240 | — | — | Static hold at 100% completion |
| **4180** | 139.333 | 233 | — | -7 | Push initiates; outgoing slides left |
| **4181** | 139.367 | 222 | — | -18 | Outgoing accelerates left |
| **4182** | 139.400 | 202 | — | -38 | Leftward translation |
| **4183** | 139.433 | 177 | — | -63 | Leftward translation |
| **4184** | 139.467 | 157 | 428 | +208 | Gift box enters from right viewport edge |
| **4185** | 139.500 | 130 | 364 | +144 | Rapid translation across screen |
| **4186** | 139.533 | Exited ($<0$) | 320 | +100 | Outgoing clears; incoming decelerating |
| **4187** | 139.567 | Exited | 286 | +66 | Smooth deceleration |
| **4188** | 139.600 | Exited | 262 | +42 | Smooth deceleration |
| **4189** | 139.633 | Exited | 246 | +26 | Deceleration |
| **4190** | 139.667 | Exited | 233 | +13 | Fine settling |
| **4191** | 139.700 | Exited | 226 | +6 | Near rest |
| **4192** | 139.733 | Exited | 221 | +1 | Damping |
| **4193** | 139.767 | Exited | 221 | +1 | Damping |
| **4194** | 139.800 | Exited | 220 | 0 | Resting locked ($X=220$) |

---

## 4. Key Takeaways & Observation Status

1. **Retractions Enforced:** All 40 normalized per-frame difference profiles, invented cubic-bezier equations, and framework internal curves are revoked.
2. **Visual Truth Established:** Backgrounds are pale lavender (`#EDEBFD` / `#F4F3FA`) / white (`#FFFFFF`), primary buttons are purple (`#5C5EE6` / `#605DEC`), Apple Sign-In is black (`#000000`), back navigation is a floating circular button in the bottom row, and fabricated carousel screens (`OT00-S018`–`S020`) are corrected to their true visual states.
3. **No File Changes:** Project files have been left completely untouched in accordance with instructions.
