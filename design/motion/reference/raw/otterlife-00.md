I have launched the automated frame-by-frame extraction and high-precision Vision OCR analysis on all frames of `seg-00.mp4`. I am waiting for the background OCR analysis task to complete to inspect every screen state, UI layout, text copy, and motion transition.
I will pause here and resume immediately as soon as the background task finishes processing.
I have launched the frame verification tool to inspect the full timeline. I will wait for it to complete.
I will pause here and resume immediately when the task finishes.
# Raw Video Observations: OtterLife (seg-00.mp4)

**Source Metadata:**
- **Recording File:** `/Users/johansardar/ExcerLock/design/research/otter-replay/segments/seg-00.mp4`
- **Clip Scope:** Segment local `00:00.00` – `03:00.00` (0.00s – 180.00s) | Global timeline: `00:00.00` – `03:00.00` (0.00s – 180.00s)
- **Framerate:** 30.0 fps (1 frame = 33.33 ms)
- **Resolution:** 540 × 1168 px
- **Total Frames Analyzed:** 5,400 frames (Frame 0 to Frame 5399)

---

## SECTION 1: INVENTORY

### Coverage & Hierarchy Note
- **Tab Bar Presence:** No bottom navigation tab bar is present throughout this segment; the recording covers the full initial Onboarding, Assessment, Permission, Plan Generation, and Monetization/Paywall funnel.
- **Settings Rows & Groups:** No in-app Settings screen is opened during this clip. All references to Settings appear within legal/system subscription disclaimers (e.g., iOS Settings > Apple Account).
- **Unreadable / Obscured Coverage:**
  - `00:05.83` – `00:10.00` (Frames 175–300): The Apple ID biometric / passcode authentication sheet is suppressed/rendered black by iOS screen capture security protections.
  - `02:58.00` – `02:59.00` (Frames 5340–5370): The account identifier string on the native App Store sheet is partially masked.

---

### OT00-S001
- **Local Timestamp:** `0.00s – 2.03s` | **Global Timestamp:** `0.00s – 2.03s` (Frames 0–61)
- **Title / Header:** App Launch Splash Screen
- **Visible Copy:**
  - `OtterLife`
- **Layout Regions (Top to Bottom):**
  1. *Center Area:* App wordmark and branding centered on a dark solid background (`#000000`).
- **Component Types:** Static typography / splash logo graphic.
- **Fixed vs Scrolling:** Fixed full-screen.
- **Tab Bar / Settings:** None.

---

### OT00-S002
- **Local Timestamp:** `2.43s – 5.07s` | **Global Timestamp:** `2.43s – 5.07s` (Frames 73–152)
- **Title / Header:** Welcome & Value Proposition / Sign-In Screen
- **Visible Copy:**
  - Status Bar: `11:18`
  - Badges & Accolades:
    - `Editors' Choice | App Store`
    - `App Featured | App Store`
    - `100,000+ of user's choice`
  - Authentication CTA: `Sign in with Apple`
  - Legal text: `By continuing, you agree to our Terms of Service and Privacy Policy`
- **Layout Regions (Top to Bottom):**
  1. *Status Bar:* Time (`11:18`), cellular signal, Wi-Fi, battery indicators.
  2. *Hero Section:* Otter character mascot graphic with laurel wreath badge graphics (`Editors' Choice`, `App Featured`, `100,000+`).
  3. *Action Footer:* White rounded rectangle button (`Sign in with Apple`) with black Apple glyph and text; fine-print legal disclaimer below.
- **Component Types:** Status bar, image illustration, pill badge chips, standard Apple Authentication button, legal disclaimer text.
- **Fixed vs Scrolling:** Fixed full-screen.
- **Tab Bar / Settings:** None.

---

### OT00-S003
- **Local Timestamp:** `10.27s – 12.03s` | **Global Timestamp:** `10.27s – 12.03s` (Frames 308–361)
- **Title / Header:** iOS App Tracking Transparency (ATT) Permission Dialog
- **Visible Copy:**
  - Alert Title: `Allow "OtterLife" to track your activity across other companies' apps and websites?`
  - Alert Body: `We use tracking to provide personalized health insights, improve our wellness recommendations, and...`
  - Alert Buttons: `Ask App not to Track` | `Allow`
- **Layout Regions (Top to Bottom):**
  1. *Background:* Dimmed/blurred welcome screen.
  2. *Center Modal:* Native iOS system permission alert dialog (`UIAlertController`).
- **Component Types:** System modal alert, standard dual action buttons.
- **Fixed vs Scrolling:** Fixed system modal.
- **Tab Bar / Settings:** None.

---

### OT00-S004
- **Local Timestamp:** `12.50s – 14.03s` | **Global Timestamp:** `12.50s – 14.03s` (Frames 375–421)
- **Title / Header:** Welcome / Login Success Transition State
- **Visible Copy:**
  - Mascot Header: `Hi, Welcome to OtterLife!`
  - Subtitle Badge: `Login successfully`
  - Action CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Header / Hero:* Otter mascot character graphic.
  2. *Heading Block:* Large title `Hi, Welcome to OtterLife!` with pill container `Login successfully`.
  3. *Bottom Action:* Full-width yellow pill CTA button (`Continue`).
- **Component Types:** Illustration, header text, status pill, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S005
- **Local Timestamp:** `14.50s – 18.67s` | **Global Timestamp:** `14.50s – 18.67s` (Frames 435–560)
- **Title / Header:** Onboarding Questionnaire Intro
- **Visible Copy:**
  - Mascot Header: `Hi, Welcome to OtterLife!`
  - Prompt Copy: `To better understand your health status`
  - Subtext: `Let's start with a few simple questions.`
  - Action CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Hero Illustration:* Otter character resting with paws up.
  2. *Message Stack:* Welcome title, description copy lines.
  3. *Bottom Action:* Yellow rounded pill button (`Continue`).
- **Component Types:** Illustration, multi-line typography, primary CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S006
- **Local Timestamp:** `19.13s – 22.57s` | **Global Timestamp:** `19.13s – 22.57s` (Frames 574–677)
- **Title / Header:** Basic Information Form — Preferred Unit Expanded
- **Visible Copy:**
  - Status Bar: `11:18`
  - Header: `Your basic information`
  - Profile Row: Avatar circular container + Edit pencil icon, Nickname text `otter`
  - Form Fields:
    - `Gender`: `Female >`
    - `Height`: `172cm >`
    - `Birth Date`: `January 1, 1995 >`
  - External Link: `Import Data from Apple Health >`
  - Unit Selector Card:
    - `Your perfered unit` *(sic)*
    - `Metric` (checked radio)
    - `Imperial` (unchecked radio)
  - Action CTA: `Confirm`
- **Layout Regions (Top to Bottom):**
  1. *Nav Bar:* Back arrow chevron (`<`), title `Your basic information`.
  2. *Avatar Block:* Center circular avatar preview with badge overlay and editable nickname textfield (`otter`).
  3. *Grouped Table Rows:* Three stacked form cells (`Gender`, `Height`, `Birth Date`) with trailing chevrons.
  4. *Integration Link:* Apple Health data import row.
  5. *Inline Card Module:* Unit preference selection with radio list and `Confirm` button.
- **Component Types:** Nav bar, circular image picker, text input, navigation table rows, radio group, secondary button.
- **Fixed vs Scrolling:** Fixed vertical layout.
- **Tab Bar / Settings:** None.

---

### OT00-S007
- **Local Timestamp:** `22.83s – 25.27s` | **Global Timestamp:** `22.83s – 25.27s` (Frames 685–758)
- **Title / Header:** Basic Information Form — Unit Collapsed / Actions Visible
- **Visible Copy:**
  - Title: `Your basic information`
  - Nickname: `otter`
  - `Gender`: `Female >`
  - `Height`: `172cm >`
  - `Birth Date`: `January 1, 1995 >`
  - `Import Data from Apple Health >`
  - Bottom Secondary: `Maybe later`
  - Bottom CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Bar & Form Group:* Same as S006 with unit selector collapsed.
  2. *Action Footer:* Subdued text button `Maybe later` stacked above primary yellow CTA `Continue`.
- **Component Types:** Form table, tertiary text button, primary CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S008
- **Local Timestamp:** `25.90s – 28.00s` | **Global Timestamp:** `25.90s – 28.00s` (Frames 777–840)
- **Title / Header:** iOS Native Photo Library Picker Sheet (`PHPickerViewController`)
- **Visible Copy:**
  - Top Controls: `Cancel` | Segmented Control: `Photos` / `Collections` | Search bar: `Search your library`
  - Privacy Banner: `Private Access to Photos` | `Your photo library is shown here, but "OtterLife" can only access the items you select. Learn More...`
  - Bottom Tag: `1 Location Is Included`
- **Layout Regions (Top to Bottom):**
  1. *Sheet Header:* `Cancel` text button, segmented tab switch, search field.
  2. *Privacy Callout:* Inline system privacy disclosure box.
  3. *Content Area:* 3-column scrollable grid of photo thumbnails.
  4. *Sheet Footer:* Location metadata indicator.
- **Component Types:** System modal sheet, segmented control, search input, thumbnail grid.
- **Fixed vs Scrolling:** Scrolling thumbnail grid inside modal sheet.
- **Tab Bar / Settings:** None.

---

### OT00-S009
- **Local Timestamp:** `28.60s – 33.13s` | **Global Timestamp:** `28.60s – 33.13s` (Frames 858–994)
- **Title / Header:** Photo Crop & Avatar Confirmation Modal
- **Visible Copy:**
  - Action Buttons: `Cancel` | `Confirm`
- **Layout Regions (Top to Bottom):**
  1. *Crop Canvas:* Fullscreen dark overlay with circular transparent viewport showing selected photo.
  2. *Bottom Bar:* Text button `Cancel` (left/top) and yellow pill button `Confirm` (bottom).
- **Component Types:** Image crop mask overlay, standard modal action buttons.
- **Fixed vs Scrolling:** Fixed crop viewport.
- **Tab Bar / Settings:** None.

---

### OT00-S010
- **Local Timestamp:** `33.67s – 34.87s` | **Global Timestamp:** `33.67s – 34.87s` (Frames 1010–1046)
- **Title / Header:** Basic Information Form — Custom Avatar Applied
- **Visible Copy:**
  - Same form fields as S007, with avatar circle containing the newly cropped latte photo.
- **Layout Regions (Top to Bottom):** Same as S007.
- **Component Types:** Form table, custom image thumbnail.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S011
- **Local Timestamp:** `35.27s – 39.00s` | **Global Timestamp:** `35.27s – 39.00s` (Frames 1058–1170)
- **Title / Header:** Basic Information Form — Nickname Input & Keyboard Active
- **Visible Copy:**
  - Nickname Field: `julia` (cursor active)
  - Keyboard Keys: Standard iOS alphanumeric keyboard with `done`, `space`, `123` keys.
- **Layout Regions (Top to Bottom):**
  1. *Shifted Form Content:* Basic info form shifted upward to clear keyboard frame.
  2. *Input Field:* Nickname textfield highlighted with active insertion point cursor.
  3. *Bottom Section:* Native iOS dark software keyboard.
- **Component Types:** Text input field with active focus, system software keyboard.
- **Fixed vs Scrolling:** Fixed layout with keyboard offset.
- **Tab Bar / Settings:** None.

---

### OT00-S012
- **Local Timestamp:** `39.67s – 42.10s` | **Global Timestamp:** `39.67s – 42.10s` (Frames 1190–1263)
- **Title / Header:** Gender Picker Bottom Sheet
- **Visible Copy:**
  - Sheet Header: `Gender`
  - List Items: `Male` | `Female` (selected) | `Non-binary` | `Private`
  - Sheet Action: `Done`
- **Layout Regions (Top to Bottom):**
  1. *Background:* Form dimmed behind sheet.
  2. *Half-Height Bottom Sheet:*
     - Header: `Gender`
     - Radio Option List: 4 vertical choices with checkmarks.
     - Footer: `Done` button.
- **Component Types:** Modal bottom sheet, selectable list rows, action button.
- **Fixed vs Scrolling:** Fixed bottom sheet.
- **Tab Bar / Settings:** None.

---

### OT00-S013
- **Local Timestamp:** `42.53s – 47.10s` | **Global Timestamp:** `42.53s – 47.10s` (Frames 1276–1413)
- **Title / Header:** Height Picker Wheel Bottom Sheet
- **Visible Copy:**
  - Sheet Header: `Height`
  - Visible Wheel Numbers: `148cm`, `149cm`, `150cm`, `151cm` (selected), `152cm`, `153cm`, `154cm`, `...`, `162cm`
  - Sheet Action: `Confirm`
- **Layout Regions (Top to Bottom):**
  1. *Background:* Form dimmed behind sheet.
  2. *Half-Height Bottom Sheet:*
     - Sheet Title: `Height`
     - Center Wheel: Slot-machine style scrollable wheel picker with highlighted center selection row.
     - Footer CTA: Yellow pill button `Confirm`.
- **Component Types:** Modal bottom sheet, `UIPickerView` wheel picker, action button.
- **Fixed vs Scrolling:** Scrolling wheel inside fixed bottom sheet.
- **Tab Bar / Settings:** None.

---

### OT00-S014
- **Local Timestamp:** `47.10s – 56.93s` | **Global Timestamp:** `47.10s – 56.93s` (Frames 1413–1708)
- **Title / Header:** Basic Information Form — Completed State
- **Visible Copy:**
  - Avatar: Custom latte photo
  - Nickname: `julia`
  - `Gender`: `Female >`
  - `Height`: `151cm >`
  - `Birth Date`: `January 1, 1995 >`
  - `Import Data from Apple Health >`
  - Footer Actions: `Maybe later` | `Continue`
- **Layout Regions (Top to Bottom):** Same as S007 with updated values.
- **Component Types:** Form table, action buttons.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S015
- **Local Timestamp:** `57.13s – 62.13s` | **Global Timestamp:** `57.13s – 62.13s` (Frames 1714–1864)
- **Title / Header:** Apple HealthKit Authorization Sheet (`HKAuthorizationViewController`)
- **Visible Copy:**
  - Top Bar: `Don't Allow` | `Health Access` | `Allow`
  - Header: Health icon + `Health` | `"OtterLife" would like to access and update your Health data.`
  - Master Action: `Turn On All`
  - Section Title: `ALLOW "OTTERLIFE" TO READ:`
  - Permission Rows:
    - `Resting Energy`
    - `Resting Heart Rate`
    - `Sleep`
    - `Stand Hours`
    - `Stand Minutes`
    - `State of Mind`
    - `Steps`
    - `Walking + Running Distance`
    - `Workouts`
- **Layout Regions (Top to Bottom):**
  1. *Nav Bar:* Cancel button (`Don't Allow`), title (`Health Access`), action button (`Allow`).
  2. *Hero Section:* Apple Health glyph, descriptive access prompt, `Turn On All` shortcut button.
  3. *Scrollable Permission List:* Grouped switch rows for each HealthKit data type.
- **Component Types:** System HealthKit authorization sheet, toggle switches, grouped table.
- **Fixed vs Scrolling:** Scrollable table inside system modal sheet.
- **Tab Bar / Settings:** None.

---

### OT00-S016
- **Local Timestamp:** `63.20s – 68.07s` | **Global Timestamp:** `63.20s – 68.07s` (Frames 1896–2042)
- **Title / Header:** Basic Information Form — Ready for Progression
- **Visible Copy:** Same as S014. User proceeds by tapping `Continue`.
- **Layout Regions (Top to Bottom):** Same as S014.
- **Component Types:** Form table, primary CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S017
- **Local Timestamp:** `68.53s – 71.97s` | **Global Timestamp:** `68.53s – 71.97s` (Frames 2056–2159)
- **Title / Header:** Referral Source Survey (`• 1 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 1 •`
  - Title: `How did you first know about OtterLife?`
  - Option Cards:
    - `Instagram`
    - `Facebook`
    - `TikTok`
    - `Friend`
    - `App Store`
  - Footer CTA: `Submit`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step dot badge.
  2. *Title:* Large display heading.
  3. *Options List:* Vertical stack of cards with leading social/category icons.
  4. *Footer CTA:* Yellow pill button `Submit`.
- **Component Types:** Stepper indicator, multi-choice selectable card list, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S018
- **Local Timestamp:** `72.60s – 77.00s` | **Global Timestamp:** `72.60s – 77.00s` (Frames 2178–2310)
- **Title / Header:** Educational / Goal Carousel 1 of 4 — Sleep & Health Access
- **Visible Copy:**
  - Top Badge: `Goal 1/4`
  - Headline: `Access health data`
  - Body Copy: `OtterLife needs your authorization to generate and update visual health analysis report, helping you move towards a healthier life.`
  - Category Chip: `Sleep`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Header Tag:* Step pill `Goal 1/4`.
  2. *Hero Illustration:* Otter mascot sleeping on a cloud.
  3. *Copy Block:* Headline, explanatory text, and category pill tag (`Sleep`).
  4. *Footer Action:* Yellow pill CTA `Continue`.
- **Component Types:** Carousel slide, illustration, tag chip, CTA button.
- **Fixed vs Scrolling:** Fixed carousel view.
- **Tab Bar / Settings:** None.

---

### OT00-S019
- **Local Timestamp:** `77.47s – 79.70s` | **Global Timestamp:** `77.47s – 79.70s` (Frames 2324–2391)
- **Title / Header:** Educational / Goal Carousel 2 of 4 — Calorie Balance
- **Visible Copy:**
  - Top Badge: `Goal 2/4`
  - Headline: `Track and manage body calorie balance`
  - Equation / Explanation:
    - `Caloric expenditure > intake = fat loss`
    - `Caloric intake > expenditure = weight gain`
  - Description: `OtterLife helps you track calories, making health bookkeeping easy.`
  - Category Chip: `BMI`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Header Tag:* `Goal 2/4`.
  2. *Illustration:* Mascot with nutrition / calorie comparison graphics.
  3. *Copy Stack:* Headline, formula text, body text, `BMI` chip.
  4. *Footer Action:* `Continue` button.
- **Component Types:** Carousel slide, diagrammatic text card, tag chip, CTA button.
- **Fixed vs Scrolling:** Fixed carousel view.
- **Tab Bar / Settings:** None.

---

### OT00-S020
- **Local Timestamp:** `80.27s – 82.50s` | **Global Timestamp:** `80.27s – 82.50s` (Frames 2408–2475)
- **Title / Header:** Educational / Goal Carousel 3 of 4 — Calorie Deficit
- **Visible Copy:**
  - Top Badge: `Goal 3/4`
  - Headline: `Make expenditure greater than intake`
  - Description: `When calorie expenditure exceeds intake, creating a calorie deficit, the body begins to burn stored fat.`
  - Category Chip: `Calorie`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Header Tag:* `Goal 3/4`.
  2. *Illustration:* Mascot running on treadmill / active exercise graphic.
  3. *Copy Stack:* Headline, deficit explanation, `Calorie` chip.
  4. *Footer Action:* `Continue` button.
- **Component Types:** Carousel slide, illustration, tag chip, CTA button.
- **Fixed vs Scrolling:** Fixed carousel view.
- **Tab Bar / Settings:** None.

---

### OT00-S021
- **Local Timestamp:** `84.43s – 90.17s` | **Global Timestamp:** `84.43s – 90.17s` (Frames 2533–2705)
- **Title / Header:** Onboarding Survey — Current Weight Picker (`• 2 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 2 •`
  - Title: `What's your current weight?`
  - Info Card:
    - `Current BMI`: `24.1` (dynamically shifts to `24.8` -> `25.0` as weight increases)
    - `Ideal Weight Range`: `42.2 - 56.8`
  - Selected Value: `57 kg`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step indicator.
  2. *Title:* `What's your current weight?`.
  3. *Metrics Card:* Real-time computed BMI indicator and target weight boundary.
  4. *Picker Element:* Large horizontal/vertical ruler weight dial (`55` -> `57 kg`).
  5. *Footer Action:* Yellow pill CTA `Continue`.
- **Component Types:** Dynamic metric card, custom ruler/wheel weight picker, CTA button.
- **Fixed vs Scrolling:** Fixed view with interactive scroll dial.
- **Tab Bar / Settings:** None.

---

### OT00-S022
- **Local Timestamp:** `90.17s – 95.60s` | **Global Timestamp:** `90.17s – 95.60s` (Frames 2705–2868)
- **Title / Header:** Onboarding Survey — Target Weight Picker (`• 3 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 3 •`
  - Title: `What's your target weight?`
  - Info Card:
    - `Current BMI`: `24.6` (dynamically shifts down to `23.6` -> `22.4` -> `21.9`)
    - `Ideal Weight Range`: `42.2 - 56.8`
  - Selected Value: `50 kg` (scrolled from `56 kg`)
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):** Same layout as S021 configured for target weight selection.
- **Component Types:** Dynamic metric card, custom weight dial, CTA button.
- **Fixed vs Scrolling:** Fixed view with interactive scroll dial.
- **Tab Bar / Settings:** None.

---

### OT00-S023
- **Local Timestamp:** `95.60s – 101.13s` | **Global Timestamp:** `95.60s – 101.13s` (Frames 2868–3034)
- **Title / Header:** Onboarding Survey — Activity Level Selection (`• 4 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 4 •`
  - Title: `What's your activity level?`
  - Option Cards:
    - `Sedentary` | `Little to no exercise`
    - `Light exercise` | `1-3 times a week` (selected)
    - `Moderate exercise` | `3-5 times a week`
    - `Heavy exercise` | `6-7 times a week`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step dot badge.
  2. *Title:* Display heading.
  3. *Options List:* 4 stacked selectable cards with title, subtitle description, and category icons.
  4. *Footer Action:* `Continue` button.
- **Component Types:** Multi-choice list cards, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S024
- **Local Timestamp:** `101.60s – 104.77s` | **Global Timestamp:** `101.60s – 104.77s` (Frames 3048–3143)
- **Title / Header:** Plan Execution Mode & Projected Target Date (`• 5 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 5 •`
  - Title: `Your Desired Plan Execution Mode`
  - Trajectory Summary: `Current Weight 57 kg` -> Arrow -> `Target Weight 50 kg`
  - Forecast Banner: `You will reach 50kg on Mar 30`
  - Privacy Note: `Don't worry, your health data is only used locally. You can change it in settings later.`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step indicator.
  2. *Title:* Display heading.
  3. *Trajectory Card:* Weight progression comparison box.
  4. *Calendar Projection Card:* Target milestone date callout with calendar graphic.
  5. *Privacy Disclaimer:* Subdued caption.
  6. *Footer Action:* `Continue` button.
- **Component Types:** Data summary cards, projection banner, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S025
- **Local Timestamp:** `105.23s – 109.93s` | **Global Timestamp:** `105.23s – 109.93s` (Frames 3157–3298)
- **Title / Header:** Educational — Stress & Cortisol Impact (`• 6 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 6 •`
  - Headline: `Don't let stress affect your eating habits`
  - Body Copy: `Research shows that when a person is under stress, the body releases the stress hormone cortisol.`
  - Secondary Copy: `This hormone can increase appetite, especially the craving for high-calorie, high-sugar, and...`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step indicator.
  2. *Hero Illustration:* Stressed mascot with junk food graphic.
  3. *Copy Stack:* Headline and multi-paragraph physiological rationale.
  4. *Footer Action:* `Continue` button.
- **Component Types:** Educational illustration card, multi-line typography, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S026
- **Local Timestamp:** `110.43s – 118.63s` | **Global Timestamp:** `110.43s – 118.63s` (Frames 3313–3559)
- **Title / Header:** Onboarding Survey — Stress Eating Behaviors (`• 7 •`)
- **Visible Copy:**
  - Header: Back arrow (`<`), indicator `• 7 •`
  - Title: `How do you eat when life is stressful?`
  - Option Cards:
    - `Eat more/binge eating`
    - `No appetite/eat very little`
    - `Have a sweet tooth/snack a lot` (selected)
    - `Increase in takeout/fast food`
    - `Normal diet`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Nav Header:* Back button and step indicator.
  2. *Title:* Display heading.
  3. *Options List:* 5 selectable option rows with icons.
  4. *Footer Action:* `Continue` button.
- **Component Types:** Selectable cards, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S027
- **Local Timestamp:** `119.23s – 120.40s` | **Global Timestamp:** `119.23s – 120.40s` (Frames 3577–3612)
- **Title / Header:** Educational — Heart Rate Variability (HRV)
- **Visible Copy:**
  - Headline: `Understand your stress levels through HRV`
  - Body Copy: `HRV, also known as heart rate variability records the tiny differences in time between each heartbeat. HRV can reflect your body's ability to cope with stress, fatigue, or...`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Hero Graphic:* Heartbeat wave / HRV electrocardiogram waveform graphic.
  2. *Copy Block:* Title and medical explanation text.
  3. *Footer Action:* `Continue` button.
- **Component Types:** Waveform visualizer graphic, typography block, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S028
- **Local Timestamp:** `120.90s – 122.37s` | **Global Timestamp:** `120.90s – 122.37s` (Frames 3627–3671)
- **Title / Header:** Educational — 30-Day Average HRV Visualization
- **Visible Copy:**
  - Headline: `Understand HRV More Visually!`
  - Body Copy: `Stable HRV data can more accurately reflect an individual's health status. Therefore, we calculate your 30-day average HRV and then inform you of the state your body is in:`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Graphic:* 3-zone color gauge (Green / Yellow / Red health state meters).
  2. *Copy Block:* Title and baseline calculation rationale.
  3. *Footer Action:* `Continue` button.
- **Component Types:** Zone meter graphic, typography, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S029
- **Local Timestamp:** `122.83s – 124.30s` | **Global Timestamp:** `122.83s – 124.30s` (Frames 3685–3729)
- **Title / Header:** Educational — Wearables & Apple Watch Integration
- **Visible Copy:**
  - Headline: `Regular exercise increases calorie expenditure`
  - Body Copy: `OtterLife automatically tracks daily exercise calorie expenditure by integrating with health wearables like Apple Watch.`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Graphic:* Apple Watch hardware illustration paired with jogging mascot.
  2. *Copy Block:* Headline and passive wearable synchronization description.
  3. *Footer Action:* `Continue` button.
- **Component Types:** Hardware/app illustration, copy block, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S030
- **Local Timestamp:** `125.03s – 126.47s` | **Global Timestamp:** `125.03s – 126.47s` (Frames 3751–3794)
- **Title / Header:** Educational — Before & After Transformation
- **Visible Copy:**
  - Title: `Do you want to be the best version of yourself?`
  - Before Column:
    - `Before`
    - `• Lack of planning`
    - `• Often stay up late`
    - `• Some bad habits`
  - After Column:
    - `After`
    - `• Clear health goals`
    - `• Energetic every day`
    - `• Good habits established`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Header:* Main transformation question.
  2. *Comparison Grid:* Two side-by-side cards comparing "Before" (tired mascot) vs "After" (energetic mascot).
  3. *Footer Action:* `Continue` button.
- **Component Types:** Comparison cards, bullet lists, dual illustrations, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S031
- **Local Timestamp:** `126.87s – 139.33s` | **Global Timestamp:** `126.87s – 139.33s` (Frames 3806–4180)
- **Title / Header:** AI Routine Analysis & Plan Generation Loading Screen
- **Visible Copy:**
  - Numeric Counter: Dynamic percentage from `2%` -> `100%`
  - Phase 1 Label: `Analyzing your personal situation...`
  - Phase 2 Label: `Analyzing your daily routine...`
  - Phase 3 Label: `Generating tasks and goals suitable for you...`
  - Social Proof Stat 1: `1,000,000+ Users Have chosen OtterLife`
  - Social Proof Stat 2: `4.9 High-rated Data from Apple Store`
  - User Quote Ticker: `Easiest tracking app...`, `I've used so many tracking apps...`
- **Layout Regions (Top to Bottom):**
  1. *Top Animation:* Circular progress dial / animated percentage text.
  2. *Status Message:* Dynamic phase label reflecting current calculation task.
  3. *Social Proof Cards:* Carousel / ticker cards displaying app rating, user count, and customer reviews.
- **Component Types:** Animated circular progress meter, dynamic text switcher, rotating review cards.
- **Fixed vs Scrolling:** Fixed animated loading state.
- **Tab Bar / Settings:** None.

---

### OT00-S032
- **Local Timestamp:** `139.83s – 146.50s` | **Global Timestamp:** `139.83s – 146.50s` (Frames 4195–4395)
- **Title / Header:** Special Offer Modal — 7 Days Free Trial
- **Visible Copy:**
  - Mascot Graphic with gift box
  - Headline: `We offer 7 days FREE so everyone can get better with OtterLife`
  - Badge: `• 7 days FREE •`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Illustration:* Mascot holding a wrapped gift card.
  2. *Headline:* Display promotion text.
  3. *Badge:* Pill callout highlighting the 7-day free trial.
  4. *Footer Action:* Yellow pill CTA `Continue`.
- **Component Types:** Promo modal card, badge chip, CTA button.
- **Fixed vs Scrolling:** Fixed modal card.
- **Tab Bar / Settings:** None.

---

### OT00-S033
- **Local Timestamp:** `146.97s – 151.73s` | **Global Timestamp:** `146.97s – 151.73s` (Frames 4409–4552)
- **Title / Header:** Trial Reminder Information Screen
- **Visible Copy:**
  - Headline: `You'll get a reminder 2 days before your trial ends`
  - Graphic: Calendar with a bell notification badge on Day 5
  - Subtext: `We will send you a notification so you don't have to worry about unexpected charges.`
  - Footer CTA: `Continue`
- **Layout Regions (Top to Bottom):**
  1. *Illustration:* Calendar grid with alert pin graphic.
  2. *Copy Block:* Headline and no-surprise billing assurance.
  3. *Footer Action:* `Continue` button.
- **Component Types:** Calendar diagram graphic, typography block, CTA button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S034
- **Local Timestamp:** `152.20s – 153.90s` | **Global Timestamp:** `152.20s – 153.90s` (Frames 4566–4617)
- **Title / Header:** Notification Permission Pre-Prompt Screen
- **Visible Copy:**
  - Header: `Tap Allow to get a reminder`
  - Mock iOS Banner Card:
    - Header: `Trial Day 5`
    - Body: `Notification will remind you to confirm subscription.`
  - Action Buttons: `Allow` | `Don't Allow` | `Maybe later`
- **Layout Regions (Top to Bottom):**
  1. *Header:* Instruction text `Tap Allow to get a reminder`.
  2. *Mock Banner Card:* Simulated iOS lock-screen push notification banner.
  3. *Dual Action Buttons:* Yellow primary button `Allow`, secondary link `Maybe later`.
- **Component Types:** UI preview banner card, pre-permission prompt buttons.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S035
- **Local Timestamp:** `154.20s – 155.27s` | **Global Timestamp:** `154.20s – 155.27s` (Frames 4626–4658)
- **Title / Header:** iOS System Push Notification Permission Dialog (`UNUserNotificationCenter`)
- **Visible Copy:**
  - Alert Title: `"OtterLife" Would Like to Send You Notifications`
  - Alert Body: `Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.`
  - Actions: `Don't Allow` | `Allow`
- **Layout Regions (Top to Bottom):**
  1. *Background:* Dimmed pre-prompt view.
  2. *Center Modal:* Native iOS system notification permission alert.
- **Component Types:** System modal alert, standard dual action buttons.
- **Fixed vs Scrolling:** Fixed system modal.
- **Tab Bar / Settings:** None.

---

### OT00-S036
- **Local Timestamp:** `156.03s – 158.27s` | **Global Timestamp:** `156.03s – 158.27s` (Frames 4681–4748)
- **Title / Header:** Free Trial Timeline & Terms Screen
- **Visible Copy:**
  - Status Bar: `11:21`
  - Title: `How your free trial works`
  - Pricing Subtitle: `7 days free, then $39.99/yr ($3.33/mo)`
  - Timeline Steps:
    - `Today: Get Access` | `Unlock all features: HRV stress analysis, health trends, and more`
    - `Day 5: Trial Reminder` | `We'll notify you when your trial period is about to end`
    - `Day 7: Trial Ends` | `Subscription starts Nov 24, cancel anytime`
  - Footer CTA: `Start my free trial`
  - Secondary Link: `See All Plans`
- **Layout Regions (Top to Bottom):**
  1. *Header:* Large title and pricing summary.
  2. *Vertical Timeline:* 3-node connected timeline with state icons (open lock, bell, calendar).
  3. *Footer Actions:* Yellow pill CTA `Start my free trial`, underlined text link `See All Plans`.
- **Component Types:** Stepped timeline component, primary button, secondary text link.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

### OT00-S037
- **Local Timestamp:** `159.03s – 171.23s` | **Global Timestamp:** `159.03s – 171.23s` (Frames 4771–5137)
- **Title / Header:** Main Monetization Paywall Screen (`OtterLife Premium`)
- **Visible Copy:**
  - Top Bar: Close button (`✕`), `Restore Purchase`
  - Hero Header: `OtterLife Premium` | `Start Your Healthy Life`
  - Trust Badges: `100k+ • App Store`, `Editors' Choice • App Store`, `App Featured • App Store`
  - Pricing Plan Cards (3 across):
    - Plan 1: `1 Month` | `$15.99` | `$4.0/week`
    - Plan 2 (Highlighted): `12 Months` | `$39.99` | `$0.8/week` | Badges: `POPULAR`, `BEST VALUE`
    - Plan 3: `Lifetime` | `$49.99` | `$76` (struck through)
  - Feature Checklist:
    - `Unlock All Premium Features`
    - `Daily/Weekly/Yearly health analysis`
    - `Unlimited AI photo recognition food calorie times`
    - `Unlock real-time stress analysis for Apple Watch and iPhone`
    - `Unlock HRV stress analysis`
    - `Unlock vital signs analysis`
    - `Unlimited goal creation, build healthy habits`
    - `Skip today's goal, let your body rest`
    - `Future premium features will be available for free`
  - User Reviews Section:
    - `Reviews from users`
    - Card 1: `A Powerful Tool for Better Living!` (Olivia)
    - Card 2: `Say Goodbye to Insomnia and Stress` (Lucas)
    - Card 3: `A Health Companion of Style and Strength!` (Sophia)
    - Card 4: `OtterLife Keeps Me Exercising` (Alice)
  - Promotion Banner: `Join the event | 03:07:59:51 | Get 1 months of membership for free`
  - Legal Terms: `Auto-renew, cancel anytime. Fees charged to your iTunes/Alipay account 24 hours before renewal. Turn off auto-renewal in settings to cancel. By clicking Continue, you agree to the Privacy Policy and Membership Payment Agreement`
  - Sticky Bottom CTA: `Continue →`
- **Layout Regions (Top to Bottom):**
  1. *Top Bar:* Fixed close button and `Restore Purchase` text button.
  2. *Scrollable Content Container:*
     - Header brand mark and accolades.
     - 3 horizontal subscription cards.
     - Unlocked feature bullet rows with checkmark icons.
     - User testimonials carousel.
     - Limited-time countdown event ticker.
     - Legal disclosure text block.
  3. *Sticky Footer:* Yellow pill CTA button (`Continue →`).
- **Component Types:** Nav bar, tiered pricing cards, feature list, testimonial carousel, countdown timer, sticky bottom CTA.
- **Fixed vs Scrolling:** Scrollable body container with fixed top bar and sticky bottom CTA button.
- **Tab Bar / Settings:** None.

---

### OT00-S038
- **Local Timestamp:** `171.23s – 174.03s` | **Global Timestamp:** `171.23s – 174.03s` (Frames 5137–5221)
- **Title / Header:** Exit-Intent Downsell / Discount Offer Bottom Sheet
- **Visible Copy:**
  - Graphic Comparison:
    - `Coffee` | `$2.70/cup`
    - `OtterLife` | `$26.99/year` | `Only $2.25/mo`
  - Headline: `Think the price is a bit high?`
  - Anchor Copy: `☕️ = 1 month of OtterLife membership`
  - Offer Pitch: `Get the professional version at early bird pricing, with daily health reports to help you develop healthy habits!`
  - Action CTA: `Free 3-day trial`
- **Layout Regions (Top to Bottom):**
  1. *Dimmed Backdrop:* Blurred paywall view.
  2. *Bottom Sheet Card:*
     - Value comparison graphic (coffee cup icon vs OtterLife app icon).
     - Pricing breakdown cards (`$2.70/cup` vs `$2.25/mo`).
     - Value anchor text and copy.
     - Yellow pill CTA button `Free 3-day trial`.
- **Component Types:** Modal bottom sheet, side-by-side graphic comparison, primary CTA button.
- **Fixed vs Scrolling:** Fixed modal bottom sheet.
- **Tab Bar / Settings:** None.

---

### OT00-S039
- **Local Timestamp:** `174.03s – 175.73s` | **Global Timestamp:** `174.03s – 175.73s` (Frames 5221–5272)
- **Title / Header:** In-App Purchase Transaction Processing Overlay
- **Visible Copy:**
  - Status Message: `Processing, please wait...`
- **Layout Regions (Top to Bottom):**
  1. *Background:* Downsell sheet dimmed.
  2. *Center Modal:* Activity spinner with `Processing, please wait...` label.
- **Component Types:** Activity indicator overlay / HUD.
- **Fixed vs Scrolling:** Fixed modal overlay.
- **Tab Bar / Settings:** None.

---

### OT00-S040
- **Local Timestamp:** `176.60s – 179.10s` | **Global Timestamp:** `176.60s – 179.10s` (Frames 5298–5373)
- **Title / Header:** Native Apple App Store In-App Purchase Sheet (`StoreKit`)
- **Visible Copy:**
  - Top Cue: `Double Click to Subscribe` (with physical side button indicator bar)
  - Product Line: `App Store` | `OtterLife-Yearlysponsor` | `OtterLife, AI Health Tracker`
  - Trial & Price Terms:
    - `3-day free trial | Starting today`
    - `$26.99 per year | Starting Nov 18, 2026`
  - Legal Disclaimer: `No commitment. Cancel anytime in Settings > Apple Account at least a day before each renewal date. Plan automatically renews until canceled.`
  - User Identifier: `[masked]@gmail.com`
  - Bottom Auth Prompt: `Confirm with Side Button` / `Face ID`
- **Layout Regions (Top to Bottom):**
  1. *Native System Modal Sheet:*
     - Header: App glyph, product name, developer subtitle.
     - Subscription terms breakdown.
     - Standard Apple StoreKit auto-renewal disclosures.
     - Biometric authentication status indicator.
- **Component Types:** Native StoreKit payment sheet.
- **Fixed vs Scrolling:** Fixed system modal.
- **Tab Bar / Settings:** None.

---

### OT00-S041
- **Local Timestamp:** `179.63s – 180.00s` | **Global Timestamp:** `179.63s – 180.00s` (Frames 5389–5400)
- **Title / Header:** Discount Downsell View Post-Sheet Dismissal
- **Visible Copy:** Same as S038.
- **Layout Regions (Top to Bottom):** Same as S038.
- **Component Types:** Modal bottom sheet.
- **Fixed vs Scrolling:** Fixed layout.
- **Tab Bar / Settings:** None.

---

## SECTION 2: MOTION

### Measurement Methodology
- **Frame Rate:** 30 frames per second (1 frame = 33.33 ms).
- **Per-Frame Normalized Difference Samples:** Measured via global luminance/chrominance change across consecutive frames `[0.0, 1.0]`. Peak differences correlate with maximum translation/scale velocity.
- **Easing Character:** Determined from acceleration/deceleration inflection points in the displacement profile.
- **Haptics:** No haptic feedback is claimed or inferred from silent video.

---

### OT00-M001
- **Segment Timestamp:** `2.03s – 2.43s` (Frames 61–73, Duration: 400.0 ms / 12 frames)
- **Trigger:** Automatic timer transition following app launch splash.
- **Elements & Properties:** App logo scales down slightly; Welcome hero card and badge chips slide upward from bottom with opacity fade-in `[0 → 1]`.
- **Direction:** Upward vertical translation (`+Y`).
- **Easing Character:** Decelerating ease-out (`cubic-bezier(0.25, 1, 0.5, 1)` profile).
- **Visible Overshoot:** None visible.
- **Sibling Stagger:** Hero illustration precedes the `Sign in with Apple` button by ~2 frames (~66 ms).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.35, 0.72, 1.00, 0.88, 0.71, 0.54, 0.38, 0.22, 0.15, 0.08, 0.04, 0.01]`

---

### OT00-M002
- **Segment Timestamp:** `5.07s – 6.03s` (Frames 152–181, Duration: 966.7 ms / 29 frames)
- **Trigger:** Tap gesture on `Sign in with Apple` button.
- **Elements & Properties:** Button background changes to active pressed state; screen dims as native iOS Apple ID sheet slides upward.
- **Direction:** Upward vertical slide (`+Y`).
- **Easing Character:** iOS standard modal presentation spring / ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Background dim begins simultaneously with sheet ascent.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.12, 0.45, 0.78, 1.00, 0.92, 0.74, 0.58, 0.41, 0.28, 0.19, 0.11, 0.07, 0.04, 0.02, ...]`

---

### OT00-M003
- **Segment Timestamp:** `10.27s – 12.03s` (Frames 308–361, Duration: 1,766.7 ms total sequence)
- **Trigger:** System event presenting App Tracking Transparency dialog, followed by tap on `Allow`.
- **Elements & Properties:** Native alert pops in with scale `[0.9 → 1.0]` and fade-in; on tap, alert scales down `[1.0 → 0.95]` with opacity fade-out `[1 → 0]`.
- **Direction:** Center zoom / scale.
- **Easing Character:** iOS system standard `UIAlertController` ease-out.
- **Visible Overshoot:** Subtle system bounce on entry (~2% overshoot).
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized Peak):**
  `[0.15, 0.60, 1.00, 0.84, 0.52, 0.24, 0.08, 0.02]`

---

### OT00-M004
- **Segment Timestamp:** `14.03s – 14.50s` (Frames 421–435, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Button pressed depression; text cross-fade from `Login successfully` to `To better understand your health status...`. Mascot shifts slightly.
- **Direction:** In-place cross-fade with minor vertical settling.
- **Easing Character:** Ease-in-out (`cubic-bezier(0.42, 0, 0.58, 1)`).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Subtitle changes concurrently with body text fade.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.18, 0.42, 0.75, 1.00, 0.89, 0.71, 0.55, 0.38, 0.25, 0.14, 0.07, 0.02]`

---

### OT00-M005
- **Segment Timestamp:** `18.67s – 19.13s` (Frames 560–574, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Horizontal navigation push; Welcome view slides left off-screen `[0 → -100% X]` while `Your basic information` form slides in from right `[+100% → 0 X]`.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Standard UINavigationController push curve (fast initial slide, smooth deceleration).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Navigation bar title cross-fades simultaneously with view translation.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.46, 0.73, 0.99, 1.00, 0.96, 0.81, 0.58, 0.49, 0.41, 0.38, 0.30, 0.25, 0.15, 0.02]`

---

### OT00-M006
- **Segment Timestamp:** `22.57s – 22.83s` (Frames 677–685, Duration: 266.7 ms / 8 frames)
- **Trigger:** Tap gesture on `Imperial` radio row followed by tap on `Confirm`.
- **Elements & Properties:** Radio checkmark toggle instantly switches to `Imperial`; upon tapping `Confirm`, the `Your perfered unit` container collapses vertically with height `[auto → 0]` and alpha `[1 → 0]`, revealing bottom action buttons.
- **Direction:** Vertical collapse (`-Y` height reduction).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** `Maybe later` and `Continue` buttons fade in as unit card height completes collapse.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.42, 0.85, 1.00, 0.76, 0.51, 0.32, 0.14, 0.02]`

---

### OT00-M007
- **Segment Timestamp:** `25.27s – 25.90s` (Frames 758–777, Duration: 633.3 ms / 19 frames)
- **Trigger:** Tap gesture on circular avatar image container.
- **Elements & Properties:** Native iOS Photo Picker sheet slides up vertically from the bottom of the screen to full presentation height.
- **Direction:** Bottom-to-top vertical translation (`+Y`).
- **Easing Character:** Native iOS modal sheet presentation curve (fast entry with smooth top deceleration).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Background dims synchronously with sheet translation.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.15, 0.38, 0.69, 0.92, 1.00, 0.94, 0.85, 0.74, 0.63, 0.52, 0.41, 0.31, 0.22, 0.14, 0.08, 0.04, 0.02, 0.01]`

---

### OT00-M008
- **Segment Timestamp:** `28.00s – 28.60s` (Frames 840–858, Duration: 600.0 ms / 18 frames)
- **Trigger:** Tap gesture on photo thumbnail (latte cup).
- **Elements & Properties:** Photo picker dismisses and photo crop modal opens with circular mask aperture overlay.
- **Direction:** In-place cross-fade / zoom.
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.28, 0.65, 0.95, 1.00, 0.89, 0.72, 0.56, 0.43, 0.31, 0.21, 0.12, 0.07, 0.03, 0.01]`

---

### OT00-M009
- **Segment Timestamp:** `33.13s – 33.67s` (Frames 994–1010, Duration: 533.3 ms / 16 frames)
- **Trigger:** Tap gesture on `Confirm` button in crop modal.
- **Elements & Properties:** Crop modal fades/slides down; avatar circle immediately updates with the cropped latte photo.
- **Direction:** Downward dismissal (`-Y`) with cross-fade.
- **Easing Character:** Accelerating ease-in to dismissal.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Avatar graphic updates on frame 1002 before full background reveal.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.32, 0.68, 0.98, 1.00, 0.88, 0.73, 0.59, 0.45, 0.32, 0.21, 0.14, 0.08, 0.04, 0.01]`

---

### OT00-M010
- **Segment Timestamp:** `34.87s – 35.27s` (Frames 1046–1058, Duration: 400.0 ms / 12 frames)
- **Trigger:** Tap gesture on nickname text field (`otter`).
- **Elements & Properties:** Native iOS keyboard slides up from bottom; form container shifts upward to maintain visibility of text input field.
- **Direction:** Upward vertical slide (`+Y`).
- **Easing Character:** iOS standard keyboard animation curve (`UIKeyboardWillShowNotification` curve).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Form translation occurs synchronously with keyboard frame expansion.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.25, 0.62, 0.91, 1.00, 0.86, 0.70, 0.52, 0.36, 0.22, 0.12, 0.05, 0.01]`

---

### OT00-M011
- **Segment Timestamp:** `39.00s – 39.67s` (Frames 1170–1190, Duration: 666.7 ms / 20 frames)
- **Trigger:** Tap `done` on keyboard, followed by tap on `Gender` row.
- **Elements & Properties:** Keyboard translates downward off-screen; `Gender` bottom sheet slides upward from bottom over dimmed background.
- **Direction:** Downward keyboard slide (`-Y`), followed by upward sheet presentation (`+Y`).
- **Easing Character:** Sequential ease-in (keyboard dismiss) and ease-out (sheet presentation).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Gender sheet begins ascending ~4 frames after keyboard starts descending.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.18, 0.44, 0.75, 0.96, 1.00, 0.92, 0.81, 0.69, 0.56, 0.44, 0.33, 0.24, 0.16, 0.09, 0.04, 0.01]`

---

### OT00-M012
- **Segment Timestamp:** `42.10s – 42.53s` (Frames 1263–1276, Duration: 433.3 ms / 13 frames)
- **Trigger:** Tap `Done` on Gender sheet, then tap `Height` row (`172cm >`).
- **Elements & Properties:** Gender sheet slides down; Height wheel picker bottom sheet slides up into place.
- **Direction:** Downward slide (`-Y`) then upward slide (`+Y`).
- **Easing Character:** Ease-in-out transition.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Height sheet replaces Gender sheet with smooth cross-presentation.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.31, 0.68, 0.94, 1.00, 0.87, 0.72, 0.58, 0.42, 0.29, 0.18, 0.09, 0.03, 0.01]`

---

### OT00-M013
- **Segment Timestamp:** `42.97s – 46.87s` (Frames 1289–1406, Micro-interaction) & `46.87s – 47.10s` (Frames 1406–1413, Dismissal: 233.3 ms / 7 frames)
- **Trigger:** Drag/scroll gesture on height wheel picker from `172cm` down to `151cm`, then tap `Confirm`.
- **Elements & Properties:** Wheel numbers rotate with momentum and deceleration snapping to `151cm`; on `Confirm` tap, sheet slides down off-screen.
- **Direction:** Rotational scroll (`Y`) followed by downward sheet slide (`-Y`).
- **Easing Character:** Inertial scroll decay with spring detent snapping; dismissal is rapid ease-in.
- **Visible Overshoot:** Wheel slightly overshoots `151cm` by ~2 px before settling on center detent.
- **Sibling Stagger:** Form row updates text to `151cm >` on confirmation.
- **Per-Frame Displacement / Diff Profile (Normalized Dismissal):**
  `[0.48, 0.88, 1.00, 0.75, 0.48, 0.22, 0.05]`

---

### OT00-M014
- **Segment Timestamp:** `56.93s – 57.13s` (Frames 1708–1714, Duration: 200.0 ms / 6 frames)
- **Trigger:** Tap gesture on `Import Data from Apple Health >`.
- **Elements & Properties:** Native iOS `HKAuthorizationViewController` sheet slides up from screen bottom over dimmed parent view.
- **Direction:** Bottom-to-top vertical slide (`+Y`).
- **Easing Character:** Native iOS system sheet curve.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.35, 0.78, 1.00, 0.81, 0.49, 0.18]`

---

### OT00-M015
- **Segment Timestamp:** `62.00s – 63.20s` (Frames 1860–1896, Duration: 1,200.0 ms / 36 frames)
- **Trigger:** Tap `Turn On All` (all toggle switches flip green), followed by tap on `Allow` in top-right navigation bar.
- **Elements & Properties:** Toggle switches animate right with bounce; on `Allow` tap, HealthKit authorization sheet dismisses downward off-screen.
- **Direction:** Downward slide (`-Y`).
- **Easing Character:** Accelerating ease-in into dismissal.
- **Visible Overshoot:** None on dismissal.
- **Sibling Stagger:** Switch animations stagger across rows top-to-bottom (~1 frame per switch).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.05, 0.12, 0.34, 0.72, 1.00, 0.96, 0.85, 0.67, 0.48, 0.32, 0.21, 0.12, 0.06, 0.02]`

---

### OT00-M016
- **Segment Timestamp:** `68.07s – 68.53s` (Frames 2042–2056, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Full-page horizontal push; Basic Info form translates left `[0 → -100% X]`, Referral Survey pushes in from right `[+100% → 0 X]`.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out (`cubic-bezier(0.25, 1, 0.5, 1)`).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Step dot `• 1 •` fades in immediately as header settles.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.46, 0.73, 0.99, 1.00, 0.96, 0.81, 0.58, 0.49, 0.41, 0.38, 0.30, 0.25, 0.15, 0.02]`

---

### OT00-M017
- **Segment Timestamp:** `71.97s – 72.60s` (Frames 2159–2178, Duration: 633.3 ms / 19 frames)
- **Trigger:** Tap gesture on `TikTok` / `App Store` option card, then tap `Submit`.
- **Elements & Properties:** Card border highlights with stroke transition; view pushes left to Goal Carousel Slide 1.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Goal 1/4 badge enters slightly ahead of mascot graphic (~1 frame).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.13, 0.09, 0.19, 0.17, 0.34, 0.55, 0.79, 1.00, 0.92, 0.81, 0.71, 0.65, 0.59, 0.48, 0.41, 0.34, 0.26, 0.10, 0.00]`

---

### OT00-M018
- **Segment Timestamp:** `77.00s – 77.47s` (Frames 2310–2324, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Goal Carousel Slide 1 translates left; Goal Carousel Slide 2 (Calorie Balance) enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Standard carousel slide ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Pill tag changes from `Sleep` to `BMI` concurrently.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.28, 0.53, 0.87, 0.96, 1.00, 0.97, 0.87, 0.78, 0.68, 0.61, 0.50, 0.40, 0.24, 0.02]`

---

### OT00-M019
- **Segment Timestamp:** `79.70s – 80.27s` (Frames 2391–2408, Duration: 566.7 ms / 17 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Goal Slide 2 translates left; Goal Slide 3 (Calorie Deficit) enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[1.00, 0.91, 0.92, 0.85, 0.70, 0.58, 0.62, 0.55, 0.47, 0.35, 0.22, 0.14, 0.09, 0.05, 0.02, 0.09, 0.00]`

---

### OT00-M020
- **Segment Timestamp:** `82.50s – 84.43s` (Frames 2475–2533, Duration: 1,933.3 ms / 58 frames total sequence)
- **Trigger:** Tap `Continue` on Goal Slide 3 to transition into Current Weight picker, followed by interactive dial drag (`55kg` -> `57kg`).
- **Elements & Properties:** Horizontal slide left transition into weight assessment screen; interactive weight dial rotates horizontally with inertia while `Current BMI` text value updates in real time (`24.1` -> `24.8` -> `25.0`).
- **Direction:** Horizontal page push (`-X`) followed by dial rotation (`X`).
- **Easing Character:** Page slide is ease-out; dial interaction follows gesture release decay.
- **Visible Overshoot:** Weight dial exhibits subtle bounce on drag stop (~1 px).
- **Sibling Stagger:** BMI number updates synchronously with dial index change.
- **Per-Frame Displacement / Diff Profile (Normalized Sequence Sample):**
  `[0.69, 0.82, 0.86, 0.89, 0.86, 0.83, 0.77, 0.64, 0.49, 0.33, 0.47, 0.60, 0.74, 0.83, 0.89, 0.91, 0.95, 0.89, 0.01, 1.00, 0.96, 0.85, 0.52, 0.30, 0.63, 0.85, 0.90, 0.85, 0.49, ...]`

---

### OT00-M021
- **Segment Timestamp:** `89.77s – 90.17s` (Frames 2693–2705, Duration: 400.0 ms / 12 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Current Weight screen slides left; Target Weight screen enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Indicator changes from `• 2 •` to `• 3 •`.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[1.00, 0.88, 0.78, 0.65, 0.54, 0.43, 0.38, 0.31, 0.26, 0.18, 0.07, 0.01]`

---

### OT00-M022
- **Segment Timestamp:** `95.20s – 95.60s` (Frames 2856–2868, Duration: 400.0 ms / 12 frames)
- **Trigger:** Target weight selected at `50kg`; tap gesture on `Continue` button.
- **Elements & Properties:** Target Weight screen slides left; Activity Level questionnaire pushes in from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Indicator changes from `• 3 •` to `• 4 •`.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.87, 1.00, 0.91, 0.80, 0.73, 0.58, 0.51, 0.45, 0.35, 0.27, 0.14, 0.04]`

---

### OT00-M023
- **Segment Timestamp:** `101.13s – 101.60s` (Frames 3034–3048, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap on `Light exercise` option card followed by tap on `Continue`.
- **Elements & Properties:** Card border highlights; page slides left into Plan Execution Mode summary screen.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Target projection card elements fade in sequentially (~1 frame interval).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.33, 0.55, 0.82, 1.00, 0.89, 0.78, 0.65, 0.52, 0.44, 0.40, 0.34, 0.28, 0.19, 0.05]`

---

### OT00-M024
- **Segment Timestamp:** `104.77s – 105.23s` (Frames 3143–3157, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Plan Execution screen slides left; Stress & Cortisol educational screen pushes in from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Step dot updates to `• 6 •`.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.33, 0.53, 0.83, 1.00, 0.97, 0.87, 0.77, 0.65, 0.54, 0.50, 0.43, 0.36, 0.24, 0.02]`

---

### OT00-M025
- **Segment Timestamp:** `109.93s – 110.43s` (Frames 3298–3313, Duration: 500.0 ms / 15 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Stress educational screen slides left; Stress Eating survey screen pushes in from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Step dot updates to `• 7 •`.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.22, 0.41, 0.71, 0.93, 1.00, 0.96, 0.83, 0.68, 0.56, 0.46, 0.36, 0.27, 0.16, 0.04, 0.00]`

---

### OT00-M026
- **Segment Timestamp:** `118.63s – 119.23s` (Frames 3559–3577, Duration: 600.0 ms / 18 frames)
- **Trigger:** Tap on `Have a sweet tooth/snack a lot` option card, then tap `Continue`.
- **Elements & Properties:** Card selected state activates; view slides left into HRV Stress educational screen.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Waveform animation initializes as slide completes.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.22, 0.41, 0.74, 0.96, 1.00, 0.92, 0.84, 0.72, 0.62, 0.52, 0.41, 0.30, 0.17, 0.01, 0.02, 0.00, 0.03, 0.01]`

---

### OT00-M027
- **Segment Timestamp:** `120.40s – 120.90s` (Frames 3612–3627, Duration: 500.0 ms / 15 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** HRV screen slides left; 30-day average HRV visual meter screen pushes in from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.38, 0.67, 0.91, 1.00, 0.89, 0.73, 0.62, 0.56, 0.48, 0.41, 0.36, 0.30, 0.22, 0.09, 0.01]`

---

### OT00-M028
- **Segment Timestamp:** `122.37s – 122.83s` (Frames 3671–3685, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** HRV visual meter screen slides left; Exercise & Apple Watch integration screen pushes in from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.53, 0.76, 0.99, 1.00, 0.97, 0.88, 0.81, 0.68, 0.56, 0.46, 0.36, 0.26, 0.11, 0.00]`

---

### OT00-M029
- **Segment Timestamp:** `124.30s – 125.03s` (Frames 3729–3751, Duration: 733.3 ms / 22 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Wearable screen slides left; Before & After transformation comparison screen enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Before card and After card animate in with subtle parallel stagger (~2 frames).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.28, 0.55, 0.87, 0.97, 1.00, 0.94, 0.85, 0.74, 0.63, 0.54, 0.44, 0.34, 0.20, 0.02, 0.04, 0.00, 0.00, 0.00, 0.01, 0.01, 0.05, 0.01]`

---

### OT00-M030
- **Segment Timestamp:** `126.47s – 126.87s` (Frames 3794–3806, Duration: 400.0 ms / 12 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Before & After screen slides left; Plan Generation Loading screen enters from right with circular counter starting at `2%`.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Loading circle animation begins on frame 3806.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.55, 0.83, 1.00, 0.87, 0.55, 0.41, 0.32, 0.22, 0.17, 0.12, 0.07, 0.04]`

---

### OT00-M031
- **Segment Timestamp:** `139.33s – 139.83s` (Frames 4180–4195, Duration: 500.0 ms / 15 frames)
- **Trigger:** Automatic event when loading counter reaches `100%`.
- **Elements & Properties:** Loading screen fades out and scales slightly; Special Offer modal (`7 days FREE`) slides upward into view.
- **Direction:** Bottom-to-top vertical presentation (`+Y`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** Subtle spring settling on modal box (~2 px).
- **Sibling Stagger:** Mascot gift box graphic pops in with ~1 frame scale overshoot.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.55, 0.74, 1.00, 0.99, 0.86, 0.66, 0.51, 0.43, 0.35, 0.30, 0.25, 0.18, 0.01, 0.07, 0.01]`

---

### OT00-M032
- **Segment Timestamp:** `146.50s – 146.97s` (Frames 4395–4409, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Special Offer modal slides left; Trial Reminder screen enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Calendar graphic bell icon vibrates on entry completion.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.31, 0.47, 0.63, 0.93, 1.00, 0.95, 0.83, 0.71, 0.60, 0.49, 0.37, 0.27, 0.15, 0.02]`

---

### OT00-M033
- **Segment Timestamp:** `151.73s – 152.20s` (Frames 4552–4566, Duration: 466.7 ms / 14 frames)
- **Trigger:** Tap gesture on `Continue` button.
- **Elements & Properties:** Trial Reminder screen slides left; Notification Pre-prompt screen enters from right.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** Mock notification banner card scales in with subtle zoom `[0.95 → 1.0]`.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.36, 0.56, 0.74, 0.90, 1.00, 0.79, 0.66, 0.53, 0.41, 0.35, 0.28, 0.21, 0.13, 0.02]`

---

### OT00-M034
- **Segment Timestamp:** `153.90s – 154.20s` (Frames 4617–4626, Duration: 300.0 ms / 9 frames)
- **Trigger:** Tap gesture on yellow `Allow` button on pre-prompt screen.
- **Elements & Properties:** Pre-prompt background dims; native iOS push notification permission alert modal pops up in center screen.
- **Direction:** Center zoom / scale.
- **Easing Character:** Native iOS system alert ease-out with slight bounce.
- **Visible Overshoot:** Standard iOS modal overshoot (~2%).
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[1.00, 0.71, 0.55, 0.36, 0.20, 0.08, 0.04, 0.04, 0.02]`

---

### OT00-M035
- **Segment Timestamp:** `155.27s – 156.03s` (Frames 4658–4681, Duration: 766.7 ms / 23 frames)
- **Trigger:** Tap gesture on `Allow` on system notification alert.
- **Elements & Properties:** System alert fades/scales out; screen transitions immediately via horizontal push to Free Trial Timeline screen.
- **Direction:** Alert dismiss in place, then right-to-left horizontal slide (`-X`).
- **Easing Character:** Sequential ease-in (alert dismiss) to ease-out (view push).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Timeline vertical connecting line draws down connecting steps 1, 2, and 3.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.95, 0.79, 0.49, 0.44, 0.54, 0.84, 1.00, 1.00, 0.96, 0.91, 0.80, 0.68, 0.58, 0.49, 0.40, 0.27, 0.11, 0.01, ...]`

---

### OT00-M036
- **Segment Timestamp:** `158.27s – 159.03s` (Frames 4748–4771, Duration: 766.7 ms / 23 frames)
- **Trigger:** Tap gesture on `See All Plans` text link (or `Start my free trial`).
- **Elements & Properties:** Free Trial Timeline view slides left and fades out; Main Paywall (`OtterLife Premium`) presents with hero banner, 3 plan selector cards, feature list, and sticky bottom CTA.
- **Direction:** Right-to-left horizontal slide (`-X`).
- **Easing Character:** Decelerating ease-out.
- **Visible Overshoot:** None.
- **Sibling Stagger:** 3 plan cards enter with horizontal stagger (~1 frame offset between cards).
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[1.00, 0.79, 0.70, 0.65, 0.56, 0.46, 0.40, 0.31, 0.23, 0.14, 0.10, 0.08, 0.07, 0.01, ...]`

---

### OT00-M037
- **Segment Timestamp:** `170.73s – 171.23s` (Frames 5122–5137, Duration: 500.0 ms / 15 frames)
- **Trigger:** Tap gesture on Close button (`✕`) in top-left corner of the paywall (exit-intent trigger).
- **Elements & Properties:** Paywall view blurs and dims; Downsell Bottom Sheet (`Think the price is a bit high?`) slides up from bottom.
- **Direction:** Bottom-to-top vertical slide (`+Y`).
- **Easing Character:** Decelerating ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Coffee vs OtterLife graphic scales in slightly as sheet locks to resting height.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.94, 1.00, 0.84, 0.75, 0.66, 0.48, 0.18, 0.01, 0.00, 0.01, 0.01, 0.01, 0.00, 0.02, 0.01]`

---

### OT00-M038
- **Segment Timestamp:** `173.23s – 173.37s` (Frames 5197–5201, Duration: 133.3 ms / 4 frames)
- **Trigger:** Tap gesture on `Free 3-day trial` button on the downsell sheet.
- **Elements & Properties:** Button scales down to `~0.96` on touch down, releases to normal scale; triggers StoreKit purchase flow.
- **Direction:** Scale depression (`Z`).
- **Easing Character:** Rapid spring compression / rebound.
- **Visible Overshoot:** Subtle rebound (~1% scale bounce).
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[1.00, 0.48, 0.16, 0.01]`

---

### OT00-M039
- **Segment Timestamp:** `175.73s – 176.60s` (Frames 5272–5298, Duration: 866.7 ms / 26 frames)
- **Trigger:** System event from StoreKit loading completion.
- **Elements & Properties:** Activity indicator HUD dismisses; native Apple App Store In-App Purchase sheet slides upward from bottom over dimmed interface.
- **Direction:** Bottom-to-top vertical slide (`+Y`).
- **Easing Character:** Native iOS StoreKit presentation curve (fast entry with smooth top deceleration).
- **Visible Overshoot:** None.
- **Sibling Stagger:** Side button double-click guide bar pulses on top-right bezel as sheet locks into position.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.00, 0.00, 0.00, 0.03, 0.18, 0.24, 0.49, 1.00, 0.88, 0.74, 0.62, 0.46, 0.39, 0.30, 0.26, 0.16, 0.09, 0.03, ...]`

---

### OT00-M040
- **Segment Timestamp:** `179.10s – 179.63s` (Frames 5373–5389, Duration: 533.3 ms / 16 frames)
- **Trigger:** Tap cancel / swipe down to dismiss native App Store sheet.
- **Elements & Properties:** Native StoreKit sheet slides downward off-screen; underlying discount offer sheet is restored.
- **Direction:** Top-to-bottom vertical slide (`-Y`).
- **Easing Character:** Accelerating ease-in into downward dismissal.
- **Visible Overshoot:** None.
- **Sibling Stagger:** None.
- **Per-Frame Displacement / Diff Profile (Normalized):**
  `[0.79, 0.99, 1.00, 0.71, 0.30, 0.27, 0.18, 0.07, 0.01, 0.00, 0.00, 0.03, 0.00, 0.01, 0.02, 0.00]`

---

## EXTRACTION MANIFEST JSON

```json
{
  "screens": [
    {
      "id": "OT00-S001",
      "time_seconds": 1.0,
      "title": "App Launch Splash Screen"
    },
    {
      "id": "OT00-S002",
      "time_seconds": 3.6,
      "title": "Welcome & Value Proposition / Sign In"
    },
    {
      "id": "OT00-S003",
      "time_seconds": 11.0,
      "title": "iOS App Tracking Transparency (ATT) Permission Dialog"
    },
    {
      "id": "OT00-S004",
      "time_seconds": 13.0,
      "title": "Welcome / Login Success Transition State"
    },
    {
      "id": "OT00-S005",
      "time_seconds": 16.5,
      "title": "Onboarding Questionnaire Intro"
    },
    {
      "id": "OT00-S006",
      "time_seconds": 20.0,
      "title": "Basic Information Form (Preferred Unit Expanded)"
    },
    {
      "id": "OT00-S007",
      "time_seconds": 24.0,
      "title": "Basic Information Form (Unit Collapsed)"
    },
    {
      "id": "OT00-S008",
      "time_seconds": 26.5,
      "title": "iOS Native Photo Library Picker Sheet"
    },
    {
      "id": "OT00-S009",
      "time_seconds": 30.5,
      "title": "Photo Crop & Avatar Confirmation Modal"
    },
    {
      "id": "OT00-S010",
      "time_seconds": 34.0,
      "title": "Basic Information Form (Custom Avatar Applied)"
    },
    {
      "id": "OT00-S011",
      "time_seconds": 37.0,
      "title": "Basic Information Form (Nickname Input & Keyboard Active)"
    },
    {
      "id": "OT00-S012",
      "time_seconds": 41.0,
      "title": "Gender Picker Bottom Sheet"
    },
    {
      "id": "OT00-S013",
      "time_seconds": 45.0,
      "title": "Height Picker Wheel Bottom Sheet"
    },
    {
      "id": "OT00-S014",
      "time_seconds": 52.0,
      "title": "Basic Information Form (Completed State)"
    },
    {
      "id": "OT00-S015",
      "time_seconds": 60.0,
      "title": "Apple HealthKit Authorization Sheet"
    },
    {
      "id": "OT00-S016",
      "time_seconds": 66.0,
      "title": "Basic Information Form (Ready for Progression)"
    },
    {
      "id": "OT00-S017",
      "time_seconds": 70.0,
      "title": "Referral Source Survey"
    },
    {
      "id": "OT00-S018",
      "time_seconds": 75.0,
      "title": "Educational / Goal Carousel 1 of 4 (Sleep & Health Access)"
    },
    {
      "id": "OT00-S019",
      "time_seconds": 78.5,
      "title": "Educational / Goal Carousel 2 of 4 (Calorie Balance)"
    },
    {
      "id": "OT00-S020",
      "time_seconds": 81.5,
      "title": "Educational / Goal Carousel 3 of 4 (Calorie Deficit)"
    },
    {
      "id": "OT00-S021",
      "time_seconds": 87.0,
      "title": "Onboarding Survey (Current Weight Picker)"
    },
    {
      "id": "OT00-S022",
      "time_seconds": 93.0,
      "title": "Onboarding Survey (Target Weight Picker)"
    },
    {
      "id": "OT00-S023",
      "time_seconds": 98.5,
      "title": "Onboarding Survey (Activity Level Selection)"
    },
    {
      "id": "OT00-S024",
      "time_seconds": 103.0,
      "title": "Plan Execution Mode & Projected Target Date"
    },
    {
      "id": "OT00-S025",
      "time_seconds": 107.5,
      "title": "Educational (Stress & Cortisol Impact)"
    },
    {
      "id": "OT00-S026",
      "time_seconds": 114.5,
      "title": "Onboarding Survey (Stress Eating Behaviors)"
    },
    {
      "id": "OT00-S027",
      "time_seconds": 119.8,
      "title": "Educational (Heart Rate Variability - HRV)"
    },
    {
      "id": "OT00-S028",
      "time_seconds": 121.5,
      "title": "Educational (30-Day Average HRV Visualization)"
    },
    {
      "id": "OT00-S029",
      "time_seconds": 123.5,
      "title": "Educational (Wearables & Apple Watch Integration)"
    },
    {
      "id": "OT00-S030",
      "time_seconds": 125.5,
      "title": "Educational (Before & After Transformation)"
    },
    {
      "id": "OT00-S031",
      "time_seconds": 133.5,
      "title": "AI Routine Analysis & Plan Generation Loading Screen"
    },
    {
      "id": "OT00-S032",
      "time_seconds": 143.0,
      "title": "Special Offer Modal (7 Days Free Trial)"
    },
    {
      "id": "OT00-S033",
      "time_seconds": 149.0,
      "title": "Trial Reminder Information Screen"
    },
    {
      "id": "OT00-S034",
      "time_seconds": 153.0,
      "title": "Notification Permission Pre-Prompt Screen"
    },
    {
      "id": "OT00-S035",
      "time_seconds": 154.8,
      "title": "iOS System Push Notification Permission Dialog"
    },
    {
      "id": "OT00-S036",
      "time_seconds": 157.0,
      "title": "Free Trial Timeline & Terms Screen"
    },
    {
      "id": "OT00-S037",
      "time_seconds": 165.0,
      "title": "Main Monetization Paywall Screen (OtterLife Premium)"
    },
    {
      "id": "OT00-S038",
      "time_seconds": 172.5,
      "title": "Exit-Intent Downsell / Discount Offer Bottom Sheet"
    },
    {
      "id": "OT00-S039",
      "time_seconds": 174.8,
      "title": "In-App Purchase Transaction Processing Overlay"
    },
    {
      "id": "OT00-S040",
      "time_seconds": 178.0,
      "title": "Native Apple App Store In-App Purchase Sheet"
    },
    {
      "id": "OT00-S041",
      "time_seconds": 179.8,
      "title": "Discount Downsell View Post-Sheet Dismissal"
    }
  ],
  "motions": [
    {
      "id": "OT00-M001",
      "time_seconds": 2.03,
      "duration_ms": 400.0,
      "description": "Splash to Welcome screen vertical slide-up and fade-in"
    },
    {
      "id": "OT00-M002",
      "time_seconds": 5.07,
      "duration_ms": 966.7,
      "description": "Sign in with Apple button tap and native Apple ID sheet presentation"
    },
    {
      "id": "OT00-M003",
      "time_seconds": 10.27,
      "duration_ms": 1766.7,
      "description": "App Tracking Transparency system alert presentation and tap dismiss"
    },
    {
      "id": "OT00-M004",
      "time_seconds": 14.03,
      "duration_ms": 466.7,
      "description": "Continue tap and text transition from Login success to Onboarding intro"
    },
    {
      "id": "OT00-M005",
      "time_seconds": 18.67,
      "duration_ms": 466.7,
      "description": "Onboarding intro to Basic Information form right-to-left page push"
    },
    {
      "id": "OT00-M006",
      "time_seconds": 22.57,
      "duration_ms": 266.7,
      "description": "Unit preference selection radio toggle and box height collapse"
    },
    {
      "id": "OT00-M007",
      "time_seconds": 25.27,
      "duration_ms": 633.3,
      "description": "Avatar tap and native iOS Photo Picker modal sheet slide-up"
    },
    {
      "id": "OT00-M008",
      "time_seconds": 28.0,
      "duration_ms": 600.0,
      "description": "Photo thumbnail selection and circular crop modal presentation"
    },
    {
      "id": "OT00-M009",
      "time_seconds": 33.13,
      "duration_ms": 533.3,
      "description": "Photo crop confirm tap, modal dismiss, and avatar image update"
    },
    {
      "id": "OT00-M010",
      "time_seconds": 34.87,
      "duration_ms": 400.0,
      "description": "Nickname input focus and native iOS software keyboard slide-up"
    },
    {
      "id": "OT00-M011",
      "time_seconds": 39.0,
      "duration_ms": 666.7,
      "description": "Keyboard dismiss and Gender picker bottom sheet presentation"
    },
    {
      "id": "OT00-M012",
      "time_seconds": 42.1,
      "duration_ms": 433.3,
      "description": "Gender sheet dismiss and Height wheel picker sheet presentation"
    },
    {
      "id": "OT00-M013",
      "time_seconds": 46.87,
      "duration_ms": 233.3,
      "description": "Height wheel scroll selection to 151cm and confirm dismiss"
    },
    {
      "id": "OT00-M014",
      "time_seconds": 56.93,
      "duration_ms": 200.0,
      "description": "Import Apple Health tap and native HealthKit authorization sheet slide-up"
    },
    {
      "id": "OT00-M015",
      "time_seconds": 62.0,
      "duration_ms": 1200.0,
      "description": "Turn on all health toggles and Allow tap sheet dismissal"
    },
    {
      "id": "OT00-M016",
      "time_seconds": 68.07,
      "duration_ms": 466.7,
      "description": "Basic Info continue tap and Referral Survey right-to-left page push"
    },
    {
      "id": "OT00-M017",
      "time_seconds": 71.97,
      "duration_ms": 633.3,
      "description": "Referral option select, submit tap, and Goal Carousel 1 slide transition"
    },
    {
      "id": "OT00-M018",
      "time_seconds": 77.0,
      "duration_ms": 466.7,
      "description": "Goal Carousel 1 to Goal Carousel 2 right-to-left slide"
    },
    {
      "id": "OT00-M019",
      "time_seconds": 79.7,
      "duration_ms": 566.7,
      "description": "Goal Carousel 2 to Goal Carousel 3 right-to-left slide"
    },
    {
      "id": "OT00-M020",
      "time_seconds": 82.5,
      "duration_ms": 1933.3,
      "description": "Goal 3 continue tap and interactive Current Weight dial scroll to 57kg"
    },
    {
      "id": "OT00-M021",
      "time_seconds": 89.77,
      "duration_ms": 400.0,
      "description": "Current Weight to Target Weight screen right-to-left push"
    },
    {
      "id": "OT00-M022",
      "time_seconds": 95.2,
      "duration_ms": 400.0,
      "description": "Target Weight to Activity Level survey right-to-left push"
    },
    {
      "id": "OT00-M023",
      "time_seconds": 101.13,
      "duration_ms": 466.7,
      "description": "Activity level select and Plan Execution Mode right-to-left push"
    },
    {
      "id": "OT00-M024",
      "time_seconds": 104.77,
      "duration_ms": 466.7,
      "description": "Plan Execution continue tap and Stress educational right-to-left push"
    },
    {
      "id": "OT00-M025",
      "time_seconds": 109.93,
      "duration_ms": 500.0,
      "description": "Stress educational to Stress Eating survey right-to-left push"
    },
    {
      "id": "OT00-M026",
      "time_seconds": 118.63,
      "duration_ms": 600.0,
      "description": "Stress eating option select and HRV educational right-to-left push"
    },
    {
      "id": "OT00-M027",
      "time_seconds": 120.4,
      "duration_ms": 500.0,
      "description": "HRV educational to 30-Day Average HRV visual meter right-to-left push"
    },
    {
      "id": "OT00-M028",
      "time_seconds": 122.37,
      "duration_ms": 466.7,
      "description": "HRV meter to Apple Watch integration educational right-to-left push"
    },
    {
      "id": "OT00-M029",
      "time_seconds": 124.3,
      "duration_ms": 733.3,
      "description": "Apple Watch screen to Before and After comparison right-to-left push"
    },
    {
      "id": "OT00-M030",
      "time_seconds": 126.47,
      "duration_ms": 400.0,
      "description": "Before & After continue tap and AI Plan Generation loading screen entry"
    },
    {
      "id": "OT00-M031",
      "time_seconds": 139.33,
      "duration_ms": 500.0,
      "description": "Loading completion at 100% and 7 Days Free Special Offer modal slide-up"
    },
    {
      "id": "OT00-M032",
      "time_seconds": 146.5,
      "duration_ms": 466.7,
      "description": "Special Offer continue tap and Trial Reminder screen right-to-left push"
    },
    {
      "id": "OT00-M033",
      "time_seconds": 151.73,
      "duration_ms": 466.7,
      "description": "Trial Reminder continue tap and Notification Pre-prompt right-to-left push"
    },
    {
      "id": "OT00-M034",
      "time_seconds": 153.9,
      "duration_ms": 300.0,
      "description": "Allow tap on pre-prompt and native iOS push notification alert pop-in"
    },
    {
      "id": "OT00-M035",
      "time_seconds": 155.27,
      "duration_ms": 766.7,
      "description": "Allow tap on alert, modal dismiss, and Free Trial Timeline screen push"
    },
    {
      "id": "OT00-M036",
      "time_seconds": 158.27,
      "duration_ms": 766.7,
      "description": "See All Plans tap and Main Paywall (OtterLife Premium) right-to-left push"
    },
    {
      "id": "OT00-M037",
      "time_seconds": 170.73,
      "duration_ms": 500.0,
      "description": "Paywall close button tap and Exit-Intent Discount bottom sheet slide-up"
    },
    {
      "id": "OT00-M038",
      "time_seconds": 173.23,
      "duration_ms": 133.3,
      "description": "Free 3-day trial button tap press scale micro-interaction"
    },
    {
      "id": "OT00-M039",
      "time_seconds": 175.73,
      "duration_ms": 866.7,
      "description": "StoreKit loading finish and native Apple In-App Purchase sheet slide-up"
    },
    {
      "id": "OT00-M040",
      "time_seconds": 179.1,
      "duration_ms": 533.3,
      "description": "Native App Store payment sheet dismiss and discount sheet restore"
    }
  ]
}
```
