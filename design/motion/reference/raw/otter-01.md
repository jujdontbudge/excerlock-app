I have launched the frame extraction and OCR analysis for `seg-01.mp4` across the entire 180-second duration to build the inventory of screens and motion events. I will continue the detailed frame-by-frame analysis once the extraction finishes.
Waiting for the background frame extraction and OCR analysis to complete.
I will wait for the extraction task to finish processing.
Waiting for the task to complete.
I will wait for the background task to complete.
Waiting for task-12 to finish.
I will wait for the extraction to finish.
Waiting for OCR extraction to complete.
Waiting for background OCR processing.
# Otter App Screen Recording Analysis — Segment 01 (`seg-01.mp4`)

- **Video Path:** `/Users/johansardar/ExcerLock/design/research/otter-replay/segments/seg-01.mp4`
- **Clip Framerate:** 30.0 fps (33.33 ms / frame)
- **Total Duration:** 180.00 seconds (5400 frames, local `00:00.00` to `03:00.00`)
- **Global Offset:** Starts at Global second 180.00 (`03:00.00` global timestamp)

---

## 1. SCREEN & STATE INVENTORY

### OT01-S001: Initial Paywall / Pricing Comparison Screen
- **Timestamps:** Local `0.00s` – `1.20s` | Global `180.00s` – `181.20s` (Frames `0` – `36`)
- **Header / Navigation:** Status bar (`11:21`, cellular, Wi-Fi, battery); Navigation header with back chevron `<` left, title `Reviews from users • Purchase`, and close `✕` right.
- **Top-to-Bottom Layout Regions:**
  1. *Header:* Navigation bar with review counter indicator.
  2. *Hero Testimonial Card:* Otter avatar badge, quote headline `"OtterLife Keeps Me Exercising"`, review text excerpt, star rating.
  3. *Price Comparison Table / Value Anchor Card:*
     - Left column (Coffee cup illustration): `"Coffee $2.70/cup"`
     - Right column (OtterLife mascot badge): `"OtterLife Only $2.25/mo ($26.99/year)"`
     - Subtitle copy: `"Think the price is a bit high? ☕️ = 1 month of OtterLife membership. Get the professional version at early bird pricing, with daily health reports to help you develop healthy habits."`
  4. *Call to Action:* Full-width primary capsule button `"Free 3-day trial"` anchored at bottom.
- **Component Types:** Top navigation bar, card containers, typography headers, comparative matrix card, primary action button.
- **Fixed vs Scrolling:** Entire view layout fits without scrolling; CTA pinned to bottom safe area.
- **Tabs / Settings:** No tab bar; no settings rows.

---

### OT01-S002: Apple Store In-App Purchase Confirmation Sheet Overlay
- **Timestamps:** Local `1.50s` – `2.60s` | Global `181.50s` – `182.60s` (Frames `45` – `78`)
- **Header / Navigation:** Dimmed modal backdrop behind native iOS StoreKit modal sheet.
- **Top-to-Bottom Layout Regions:**
  1. *StoreKit Modal Card (Bottom Sheet):*
     - App Icon (`OtterLife`) and subtitle.
     - Price details: `$26.99/year after 3-day trial`.
     - Face ID glyph / animated checkmark circle.
     - Confirmation copy: `"You're all set. Your purchase was successful."`
     - Done button / automatic dismiss timer.
- **Component Types:** Native iOS System StoreKit modal sheet, vector animated checkmark icon.
- **Fixed vs Scrolling:** Fixed overlay sheet.
- **Tabs / Settings:** None.

---

### OT01-S003: OtterLife Member Welcome Modal / Purchase Success Dialog
- **Timestamps:** Local `3.00s` – `5.60s` | Global `183.00s` – `185.60s` (Frames `90` – `168`)
- **Header / Navigation:** Dimmed background over base screen.
- **Top-to-Bottom Layout Regions:**
  1. *Centered Modal Pop-up Card:*
     - Floating celebration Otter graphic / ribbon.
     - Title: `"Thank you for becoming OtterLife member"`
     - Body copy: `"Thank you for your support, now you have made the best investment in your health! All premium features have been enabled for you, let's start our health journey, cultivate good habits, and embrace a more energetic life!"`
     - Action Button: Full-width yellow capsule button `"Confirm"`.
- **Component Types:** Centered modal card, vector illustration, capsule button.
- **Fixed vs Scrolling:** Fixed modal.
- **Tabs / Settings:** None.

---

### OT01-S004: Free Trial Timeline / Value Proposition Screen
- **Timestamps:** Local `6.00s` – `8.80s` | Global `186.00s` – `188.80s` (Frames `180` – `264`)
- **Header / Navigation:** Status bar (`11:21`), top navigation bar with back arrow `<` and `"Restore Purchase"` link top-right.
- **Top-to-Bottom Layout Regions:**
  1. *Header & Value Proposition List:*
     - Title: `"Daily exclusive member rewards"`
     - Feature check items: `• Detailed historical health data`, `• Unlock 100+ fitness training analyses`, `• Skip today's goal, let your body rest`, `• Future premium features will be free`.
  2. *Trial Timeline Card:*
     - Headline: `"How your free trial works"`
     - Step 1 (Day 1): `"Today: Get Access"` (Otter icon)
     - Step 2 (Day 5): `"Day 5: Trial Reminder"` (Notification bell icon)
     - Step 3 (Day 7): `"Day 7: Trial Ends"` (Calendar / lock icon)
  3. *Action Button:* Yellow capsule button `"Start my free trial"`.
- **Component Types:** List group with checkmarks, timeline progression card, bottom pinned button.
- **Fixed vs Scrolling:** Fixed single-screen layout.
- **Tabs / Settings:** None.

---

### OT01-S005: Health Goals Selection Screen
- **Timestamps:** Local `9.00s` – `14.00s` | Global `189.00s` – `194.00s` (Frames `270` – `420`)
- **Header / Navigation:** Status bar (`11:21`); progress indicator bar at top (step 1 of onboarding).
- **Top-to-Bottom Layout Regions:**
  1. *Title Section:*
     - Headline: `"Choose a few simple healthy goal"`
  2. *Goal Selection Cards (Vertical Stack):*
     - Card 1: `"Sleep duration reached 8 hours"` (Bed icon + checkmark circle)
     - Card 2: `"Exercise at least once a week"` (Running sneaker icon + checkmark circle)
     - Card 3: `"Always have breakfast"` (Egg/toast icon + checkmark circle)
     - Card 4: `"Drink eight glasses of water"` (Water glass icon + checkmark circle)
     - Card 5: `"No phone use before bed"` (Phone prohibition icon + checkmark circle)
     - Card 6: `"Drink a glass of milk before bed"` (Milk carton icon + checkmark circle)
  3. *Bottom Action Button:* Primary button `"Continue"`.
- **Component Types:** Multi-select list cards, toggle selection circles, bottom action button.
- **Fixed vs Scrolling:** Vertical scroll container for cards; bottom button fixed.
- **Tabs / Settings:** None.

---

### OT01-S006: Streak Challenge Configuration Screen
- **Timestamps:** Local `14.33s` – `18.00s` | Global `194.33s` – `198.00s` (Frames `430` – `540`)
- **Header / Navigation:** Status bar (`11:21`); back arrow `<` top-left.
- **Top-to-Bottom Layout Regions:**
  1. *Header Section:*
     - Title: `"Start Streak!"`
     - Subtitle: `"Start the winning streak challenge and achieve your daily exercise calorie goal."`
  2. *Streak Day Selection Carousel / Grid:*
     - Target number pill cards: `1`, `3`, `5`, `7` days. (Selected: `3`).
  3. *Goal Detail Indicator:*
     - Target badge: `"100kcal - 30min"`
     - Flame / workout progress graphic.
  4. *Bottom Action Button:* Pinned button `"Continue"`.
- **Component Types:** Horizontal option pill selector, metric pill chip, illustration container, primary button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S007: Otter Wellness Companion Introduction Screen 1
- **Timestamps:** Local `18.33s` – `21.80s` | Global `198.33s` – `201.80s` (Frames `550` – `654`)
- **Header / Navigation:** Status bar (`11:21`); top navigation `<`.
- **Top-to-Bottom Layout Regions:**
  1. *Header:*
     - Title: `"Meet Your Otter Baby"`
     - Subtitle copy: `"In OtterLife, an adorable otter serves as your wellness companion. It will accompany you during workouts, encourage earlier bedtimes, and remind you to eat healthier. Follow along and achieve every health goal together!"`
  2. *Hero Mascot Area:*
     - Full illustration of baby otter floating on back holding a shell.
     - Interactive speech bubble overlay: `"From today, you can ask me any health-related questions!"`
  3. *Bottom Action Button:* Yellow capsule button `"Continue"`.
- **Component Types:** Illustration hero, chat speech bubble with tail, pinned bottom action button.
- **Fixed vs Scrolling:** Fixed single screen.
- **Tabs / Settings:** None.

---

### OT01-S008: Otter Level-Up / Task Goal Explanation Screen 2
- **Timestamps:** Local `22.00s` – `24.00s` | Global `202.00s` – `204.00s` (Frames `660` – `720`)
- **Header / Navigation:** Status bar (`11:21`); top navigation `<`.
- **Top-to-Bottom Layout Regions:**
  1. *Header:*
     - Title: `"Complete the goal and raise a baby otter"`
     - Subtitle copy: `"Completing health tasks not only improves your well-being but also nurtures your pet otter, helping it level up."`
  2. *Task Card Badges (Floating / Cascading Cards):*
     - Card: `"Walk the puppy"`
     - Card: `"Bike 10 kilometers"`
     - Card: `"Drinking 8 glasses of water"`
     - Card: `"Burn 500 KCAL (318/500 KCAL)"`
     - Card: `"Sleep duration"`
  3. *Otter Pet Visual:* Mascot sitting with bowl and feeding level bar.
  4. *Bottom Action Button:* Primary button `"Continue"`.
- **Component Types:** Staggered task cards, progress metric badge, mascot graphic, bottom action button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S009: Pet Customization Screen (Default State)
- **Timestamps:** Local `24.33s` – `33.33s` | Global `204.33s` – `213.33s` (Frames `730` – `1000`)
- **Header / Navigation:** Status bar (`11:21`); top navigation `<` and title `"Custom Pet Companion"`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Character & Name Input:*
     - Otter mascot avatar badge.
     - Editable Pet Name text input pill (default value: `"TATA"` with edit pencil icon).
  2. *Settings / Profile Group:*
     - Row 1: `• Call me` | Value: `"owner >"`
     - Row 2: `Gender` | Value: `"Private >"`
     - Section Header: `Pet Setting`
     - Pet Role Card: `"Role: Gentle and tolerant, a good listener and offering unconditional support and growing along"`
  3. *Footer Action Buttons:*
     - Text link: `"Maybe later"`
     - Primary button: `"Claim Pet Partner"`
- **Component Types:** Text field input pill, grouped list rows with disclosure chevrons, informational card, secondary link, primary button.
- **Fixed vs Scrolling:** Fixed content.
- **Tabs / Settings:** Settings Group visible with `Call me`, `Gender`, and `Pet Setting` rows.

---

### OT01-S010: Pet Customization Screen (Name Input with Keyboard)
- **Timestamps:** Local `33.33s` – `37.43s` | Global `213.33s` – `217.43s` (Frames `1000` – `1123`)
- **Header / Navigation:** Status bar (`11:22`); navigation header `"Custom Pet Companion"`.
- **Top-to-Bottom Layout Regions:**
  1. *Active Input Region:* Name input card focused with blinking cursor and character counter `3/15`. Name edited from `"TATA"` to `"moon"`.
  2. *Keyboard Accessory Bar:* `"Done"` button on keyboard toolbar.
  3. *Native iOS Virtual Keyboard:* Lower 40% of screen occupied by QWERTY keyboard.
- **Component Types:** Focused text input with clear button `✕`, character counter, iOS software keyboard.
- **Fixed vs Scrolling:** Keyboard push shifts content upwards.
- **Tabs / Settings:** Same settings rows behind keyboard.

---

### OT01-S011: Pet Customization Screen ("Call me" Bottom Sheet Open)
- **Timestamps:** Local `37.43s` – `42.40s` | Global `217.43s` – `222.40s` (Frames `1123` – `1272`)
- **Header / Navigation:** Dimmed parent screen background.
- **Top-to-Bottom Layout Regions:**
  1. *Bottom Action Sheet Card:*
     - Title: `"Call me"`
     - Preset options list: `"owner"`, `"mom"`, `"dad"`
     - Custom input field: `"Custom name..."` with counter `3/15`
     - Action button: `"Done"`
- **Component Types:** Modal bottom sheet, selectable list rows with checkmarks, inline text field.
- **Fixed vs Scrolling:** Fixed sheet container.
- **Tabs / Settings:** Sub-modal for `Call me` setting.

---

### OT01-S012: Pet Customization Screen ("Gender" Selection Bottom Sheet Open)
- **Timestamps:** Local `42.40s` – `46.00s` | Global `222.40s` – `226.00s` (Frames `1272` – `1380`)
- **Header / Navigation:** Dimmed parent screen background.
- **Top-to-Bottom Layout Regions:**
  1. *Bottom Action Sheet Card:*
     - Title: `"Gender"`
     - Options list: `"Female"`, `"Male"`, `"Private"`
     - Selected option checked: `"Female"`.
- **Component Types:** Bottom sheet modal, single-select radio list rows.
- **Fixed vs Scrolling:** Fixed sheet container.
- **Tabs / Settings:** Sub-modal for `Gender` setting.

---

### OT01-S013: Pet Customization Screen (Configured State)
- **Timestamps:** Local `46.00s` – `50.37s` | Global `226.00s` – `230.37s` (Frames `1380` – `1511`)
- **Header / Navigation:** Status bar (`11:22`), `< Custom Pet Companion`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Character & Updated Name:* Name field displays `"moon"`.
  2. *Settings Group:*
     - `• Call me` | Value: `"mom >"`
     - `Gender` | Value: `"Female >"`
     - `Pet Setting` | `"Role: Gentle and tolerant..."`
  3. *Footer Actions:* `"Maybe later"`, `"Claim Pet Partner"` (highlighted/ready).
- **Component Types:** Form summary, primary action button.
- **Fixed vs Scrolling:** Fixed screen.
- **Tabs / Settings:** Full settings group populated.

---

### OT01-S014: Privacy & Health Data Security Screen
- **Timestamps:** Local `50.67s` – `52.57s` | Global `230.67s` – `232.57s` (Frames `1520` – `1577`)
- **Header / Navigation:** Status bar (`11:22`), back arrow `<`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Security Icon:* Large green shield with padlock glyph and otter face badge.
  2. *Headline:* `"Your personal data is safe"`
  3. *Bullet Points List:*
     - `• Health data stored locally only`
     - `• Encrypted data, maximum privacy`
     - `• Used for personalized health tips`
  4. *Bottom Action Button:* Primary capsule button `"Continue"`.
- **Component Types:** Icon illustration hero, security feature bullet list, primary action button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S015: Weekly Review Screen (Tab 1: Overview / Title Card)
- **Timestamps:** Local `53.00s` – `54.63s` | Global `233.00s` – `234.63s` (Frames `1590` – `1639`)
- **Header / Navigation:** Status bar (`11:22`), Header title `"Weekly Review"`, top-right `"Share"` icon button.
- **Top-to-Bottom Layout Regions:**
  1. *User Badge & Title Bar:* User avatar, handle `"julia"`, date range `"Nov 10 - Nov 16 Overview"`.
  2. *Weekly Title Card:*
     - Title: `"Weekly Title"`
     - Award badge: `"Water Newbie"` with water droplet otter graphic.
     - Description: `"You completed 85% of your hydration targets this week!"`
  3. *Horizontal Carousel Indicator:* Page dots at bottom (`• ○ ○`).
- **Component Types:** Navigation header, user profile chip, horizontal card carousel, page dots indicator, share action button.
- **Fixed vs Scrolling:** Horizontal swiping carousel.
- **Tabs / Settings:** None (Carousel view).

---

### OT01-S016: Weekly Review Screen (Tab 2: Activity Summary Card)
- **Timestamps:** Local `55.00s` – `56.37s` | Global `235.00s` – `236.37s` (Frames `1650` – `1691`)
- **Header / Navigation:** Status bar (`11:22`), Header title `"Weekly Review"`, top-right `"Share"` button.
- **Top-to-Bottom Layout Regions:**
  1. *User Badge:* `"julia"`, `"Nov 10 - Nov 16 Activity Summary"`.
  2. *Activity Metric Summary Card:*
     - Daily bar charts for Mon–Sun (Calories burned, active minutes).
     - Best day callout: `"SAT: 420 kcal"`.
  3. *Carousel Indicator:* Page dot 2 active (`○ • ○`).
- **Component Types:** Chart card, bar graph component, carousel page indicator.
- **Fixed vs Scrolling:** Horizontal swiping carousel.
- **Tabs / Settings:** None.

---

### OT01-S017: Weekly Review Screen (Tab 3: Drink Summary Bar Chart)
- **Timestamps:** Local `57.00s` – `58.30s` | Global `237.00s` – `238.30s` (Frames `1710` – `1749`)
- **Header / Navigation:** Status bar (`11:22`), Header title `"Weekly Review"`, top-right `"Share"` button.
- **Top-to-Bottom Layout Regions:**
  1. *User Badge:* `"julia"`, `"Nov 10 - Nov 16 Drink Summary"`.
  2. *Hydration Chart Card:*
     - 7-day bar chart with horizontal dashed reference line `"Target Line: 2,000 ml"`.
     - Stat callout: `"Daily Avg: 1,800 ml"`.
     - Daily bars: Mon–Sun with achieved status pills.
  3. *Carousel Indicator:* Page dot 3 active (`○ ○ •`).
- **Component Types:** Bar chart with target guide lines, status pills, carousel indicator.
- **Fixed vs Scrolling:** Horizontal swiping carousel.
- **Tabs / Settings:** None.

---

### OT01-S018: Weekly Review Share Card Preview Screen
- **Timestamps:** Local `58.67s` – `62.60s` | Global `238.67s` – `242.60s` (Frames `1760` – `1878`)
- **Header / Navigation:** Status bar (`11:22`), navigation bar `< Share`.
- **Top-to-Bottom Layout Regions:**
  1. *Framed Share Graphic Card (Export Preview):*
     - Branding: `"OtterLife"` top-left.
     - User tag: `"julia | Nov 10 - Nov 16 Drink Summary"`.
     - Complete Drink Summary bar chart graphic with mascot illustration and QR code watermark.
  2. *Footer Share Actions:*
     - Secondary button: `"Save Image"` (Download icon).
     - Primary button: `"Share"` (Share arrow icon).
- **Component Types:** Card export canvas preview, dual action button row.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S019: iOS Photo Library Access Permission Alert Modal
- **Timestamps:** Local `62.60s` – `64.00s` | Global `242.60s` – `244.00s` (Frames `1878` – `1920`)
- **Header / Navigation:** Dimmed system backdrop over share screen.
- **Top-to-Bottom Layout Regions:**
  1. *Native iOS Permission Dialog:*
     - Title: `“OtterLife” Would Like to Access Your Photo Library`
     - Subtitle: `“OtterLife needs access to your photo album to save pictures”`
     - Options list:
       - `[Select Photos...]`
       - `[Allow Access to All Photos]`
       - `[Don't Allow]`
- **Component Types:** Native iOS system permission dialog (`UIAlertController`).
- **Fixed vs Scrolling:** Fixed system alert.
- **Tabs / Settings:** System permission modal.

---

### OT01-S020: iOS Native Share Sheet Overlay
- **Timestamps:** Local `69.03s` – `72.60s` | Global `249.03s` – `252.60s` (Frames `2071` – `2178`)
- **Header / Navigation:** Dimmed dimmed background behind half-modal sheet.
- **Top-to-Bottom Layout Regions:**
  1. *Native iOS Share Sheet (UIActivityViewController):*
     - File metadata header: Thumbnail + `"Plain Text and 1 Document"`.
     - Horizontal row: AirDrop, Messages, Mail contact suggestions.
     - Action list rows: `"Copy"`, `"Save to Files"`, `"Save to Pinterest"`, `"Edit Actions..."`.
- **Component Types:** Native iOS Share Sheet (`UIActivityViewController`).
- **Fixed vs Scrolling:** Fixed modal bottom sheet.
- **Tabs / Settings:** None.

---

### OT01-S021: Today Dashboard Screen (Initial State - 0% Progress)
- **Timestamps:** Local `75.00s` – `80.33s` | Global `255.00s` – `260.33s` (Frames `2250` – `2410`)
- **Header / Navigation:** Status bar (`11:22`), Large navigation title `"Today"`, calendar date header.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Progress Card:*
     - Headline: `"Ready to Start (0%)"` with info icon `ⓘ`.
     - Circular progress ring with sleeping otter mascot graphic.
  2. *Integration Banner Card:*
     - Headline: `"Add phone/watch widget now"`
     - Subtitle: `"Track your body changes instantly"` with right arrow `>`.
  3. *Daily Metric Cards (2-Column Grid):*
     - Left card: `"Sleep"` (`0h 0m`)
     - Right card: `"Burn"` (`0/500 kcal`)
  4. *Bottom Tab Bar:*
     - Tab 1: `"Today"` (Active / highlighted icon)
     - Tab 2: `"Analysis"` (Chart icon)
     - Tab 3: `"Otter"` (Otter head icon)
     - Tab 4: `"Mine"` (User profile icon)
- **Component Types:** Large title header, hero progress ring card, callout banner, metric stat cards, bottom 4-tab bar navigation.
- **Fixed vs Scrolling:** Scrollable dashboard body; bottom tab bar fixed.
- **Tabs / Settings:** 4 bottom tabs present: `Today`, `Analysis`, `Otter`, `Mine`.

---

### OT01-S022: Partner Setup Re-entry Screen ("Customize Partner")
- **Timestamps:** Local `80.67s` – `86.60s` | Global `260.67s` – `266.60s` (Frames `2420` – `2598`)
- **Header / Navigation:** Status bar (`11:22`), `< Customize Partner`.
- **Top-to-Bottom Layout Regions:**
  1. *Partner Identity Card:*
     - Otter mascot centered.
     - Name field: `"moon"`.
     - `• Call me` | `"mom >"`
     - `Gender` | `"Female >"`
     - `Pet Setting` | `"Role: Gentle and tolerant..."`
  2. *Action Footer:* Pinned yellow capsule button `"Confirm"` / `"Start"`.
- **Component Types:** Character preview card, settings group, primary button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** Settings rows present (`Call me`, `Gender`, `Pet Setting`). Tab bar hidden.

---

### OT01-S023: AI Partner Generation Full-Screen Loading State
- **Timestamps:** Local `86.60s` – `91.50s` | Global `266.60s` – `271.60s` (Frames `2598` – `2745`)
- **Header / Navigation:** Status bar (`11:22`), back arrow `<` top-left.
- **Top-to-Bottom Layout Regions:**
  1. *Central Loading Animation:*
     - Glowing pulsing ring around Otter mascot silhouette.
     - Main Status Title: `"Generating Partner"`
  2. *Step-by-step Generation Checklist:*
     - Item 1: `* Generating AI Personality` (Checkmark active / green)
     - Item 2: `* Syncing Personalized Settings` (Spinner -> Checkmark active)
     - Item 3: `- Linking with You` (Pending -> Spinner -> Checkmark active)
- **Component Types:** Animated pulsing spinner/ring, multi-step checklist status component.
- **Fixed vs Scrolling:** Fixed full screen.
- **Tabs / Settings:** None.

---

### OT01-S024: Interactive Otter Partner Dialogue Screen (Message 1)
- **Timestamps:** Local `92.00s` – `97.67s` | Global `272.00s` – `277.67s` (Frames `2760` – `2930`)
- **Header / Navigation:** Status bar (`11:23`), Header Title `"moon"`, top-right settings gear / pencil icon.
- **Top-to-Bottom Layout Regions:**
  1. *Interactive Otter Avatar Area:*
     - Animated 3D/vector Otter mascot with animated eyes, ears, and breathing motion.
  2. *Speech Bubble Container (Bottom-pinned / rising):*
     - Message 1: `"Hi, owner! I'm TATA! I'm here for you, all bright and curious about everything! I wanna be your bestest friend!"`
- **Component Types:** Character animation stage, chat bubble with typing reveal effect, top bar action icon.
- **Fixed vs Scrolling:** Fixed interactive stage.
- **Tabs / Settings:** None (Chat mode).

---

### OT01-S025: Interactive Otter Partner Dialogue Screen (Message 2)
- **Timestamps:** Local `98.00s` – `103.00s` | Global `278.00s` – `283.00s` (Frames `2940` – `3090`)
- **Header / Navigation:** Status bar (`11:23`), `< moon`.
- **Top-to-Bottom Layout Regions:**
  1. *Otter Avatar Stage:* Mascot reacting with nodding motion.
  2. *Speech Bubble Container:*
     - Message 2: `"I can help you learn about being healthy - like what to eat, how to sleep well, and how to not be so stressed. I can listen to all your thoughts and be your special confidant. I'm here to chat and be your friend! I'll always be here for you, owner!"`
- **Component Types:** Character stage, expanding chat bubble.
- **Fixed vs Scrolling:** Fixed stage.
- **Tabs / Settings:** None.

---

### OT01-S026: Interactive Otter Partner Dialogue Screen (Message 3)
- **Timestamps:** Local `103.33s` – `107.63s` | Global `283.33s` – `287.63s` (Frames `3100` – `3229`)
- **Header / Navigation:** Status bar (`11:23`), `< moon`.
- **Top-to-Bottom Layout Regions:**
  1. *Otter Avatar Stage:* Mascot with heart eye expression / happy wave.
  2. *Speech Bubble Container:*
     - Message 3: `"Hi Momma! I'm Moon, your silly, clingy little Moon! I wuv you!"`
- **Component Types:** Character stage, speech bubble.
- **Fixed vs Scrolling:** Fixed stage.
- **Tabs / Settings:** None.

---

### OT01-S027: Partner Chat Overlay Settings Sheet ("Customize Partner")
- **Timestamps:** Local `107.93s` – `110.00s` | Global `287.93s` – `290.00s` (Frames `3238` – `3300`)
- **Header / Navigation:** Dimmed chat backdrop behind half-modal sheet.
- **Top-to-Bottom Layout Regions:**
  1. *Modal Sheet Content:*
     - Header: `"Customize Partner"`
     - Name field: `"moon"`
     - Row 1: `• Call me` | `"mom >"`
     - Row 2: `Gender` | `"Female >"`
     - Row 3: `Pet Setting` | `"Role: Gentle and tolerant..."`
- **Component Types:** Half-screen modal sheet, settings list rows.
- **Fixed vs Scrolling:** Fixed sheet.
- **Tabs / Settings:** Settings rows present (`Call me`, `Gender`, `Pet Setting`).

---

### OT01-S028: Today Dashboard Screen (Post-Partner Initialization)
- **Timestamps:** Local `111.00s` – `114.10s` | Global `291.00s` – `294.10s` (Frames `3330` – `3423`)
- **Header / Navigation:** Status bar (`11:23`), Large title `"Today"`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Progress Card:* `"Ready to Start (0%)"`, updated active otter illustration.
  2. *Integration Banner:* `"Add phone/watch widget now - Track your body changes instantly"`.
  3. *Metric Cards:* `"Sleep"`, `"Burn"`.
  4. *Bottom Tab Bar:* 4 tabs (`Today` active, `Analysis`, `Otter`, `Mine`).
- **Component Types:** Dashboard cards, 4-tab bar navigation.
- **Fixed vs Scrolling:** Scrollable body, fixed tab bar.
- **Tabs / Settings:** 4 tabs present.

---

### OT01-S029: Widget Selection & Integration Screen ("Add Widgets")
- **Timestamps:** Local `114.47s` – `116.33s` | Global `294.47s` – `296.33s` (Frames `3434` – `3490`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Add Widgets`.
- **Top-to-Bottom Layout Regions:**
  1. *Device Category Segmented Control (Top Tabs):*
     - Segment 1: `"Lock Screen"`
     - Segment 2: `"Apple Watch"` (Selected / highlighted)
     - Segment 3: `"Home Screen"`
  2. *Apple Watch Widget Hero Preview:*
     - High-fidelity Apple Watch bezel graphic displaying the Otter HRV watch face (`FRI 23`, `10:09`, HRV `82`).
     - Sub-caption: `"HRV Watch Face"`.
  3. *Bottom Action Button:* Primary button `"Customize"`.
- **Component Types:** Segmented tabs control, hardware mockup preview container, primary action button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** Top segmented tabs (`Lock Screen`, `Apple Watch`, `Home Screen`). Tab bar hidden.

---

### OT01-S030: Watch Face Customization & My Theme Dashboard
- **Timestamps:** Local `116.67s` – `118.63s` | Global `296.67s` – `298.63s` (Frames `3500` – `3559`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Customize`.
- **Top-to-Bottom Layout Regions:**
  1. *Discovery Banner:*
     - Header: `"Explore more watch faces"` with right arrow `>`.
  2. *Theme Creation Card:*
     - Large dashed square button with plus glyph `+` (`"Create New Theme"`).
  3. *Section Header:* `"My Theme"`
  4. *Horizontal Theme Card Carousel:*
     - Card 1: `"Sea Otter Cute Loopy"`
     - Card 2: `"Fortune God"`
- **Component Types:** Link header banner, create action card, horizontal theme card carousel.
- **Fixed vs Scrolling:** Vertical container with embedded horizontal carousel.
- **Tabs / Settings:** None.

---

### OT01-S031: Watch Face Theme Gallery / Catalog Screen ("Theme")
- **Timestamps:** Local `120.00s` – `123.57s` | Global `300.00s` – `303.57s` (Frames `3600` – `3707`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Theme`, top-right text link `"Agreement"`.
- **Top-to-Bottom Layout Regions:**
  1. *Theme Filter Category Chips:* Horizontal tag pills: `"All"`, `"Relaxed"`, `"Energetic"`, `"Cute"`.
  2. *2-Column Theme Grid:*
     - Card 1: `"Relaxed - Sea Otter"` (Watch bezel preview).
     - Card 2: `"Cute Loopy"` (Pink Loopy beaver-otter watch face preview).
     - Card 3: `"Fortune God"` (Red celebratory otter watch face).
     - Card 4: `"Chill Breeze"` (Blue watercolor otter theme).
     - Card 5: `"Easy Living"` (Green foliage theme).
- **Component Types:** Filter pill chips, 2-column grid cards, top header link.
- **Fixed vs Scrolling:** Vertically scrollable grid view.
- **Tabs / Settings:** Top category chips; top right `"Agreement"` navigation link.

---

### OT01-S032: "Cute Loopy" Watch Face Detail Screen
- **Timestamps:** Local `124.00s` – `126.60s` | Global `304.00s` – `306.60s` (Frames `3720` – `3798`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Cute Loopy`, share icon top right.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Apple Watch Mockup:*
     - Animated pink Loopy character watch face (`FRI 23`, `9:41`, HRV `82`, `10:09`, status `"Relaxed"`).
  2. *Creator Attribution Card:*
     - Avatar chip: `"Creator: Hope"`.
  3. *Theme Description / Feature Tags:*
     - Chips: `"HRV Monitor"`, `"Animated GIF"`, `"Custom Complication"`.
  4. *Bottom Action Button:* Pinned capsule button `"Install to Watch"`.
- **Component Types:** Watch hardware preview canvas, creator profile chip, feature tags, primary pinned action button.
- **Fixed vs Scrolling:** Fixed screen layout.
- **Tabs / Settings:** None.

---

### OT01-S033: Watch App Installation Instruction Bottom Sheet ("Add Step")
- **Timestamps:** Local `126.83s` – `128.43s` | Global `306.83s` – `308.43s` (Frames `3805` – `3853`)
- **Header / Navigation:** Dimmed background over watch face detail screen.
- **Top-to-Bottom Layout Regions:**
  1. *Modal Bottom Sheet Content:*
     - Sheet drag indicator pill.
     - Title: `"Add Step"`
     - Step 1: `"1. Please open the OtterLife App on your watch to continue"`
     - Sub-action: `"Or click the button below"` -> Secondary button `[Open OtterLife Watch App]`.
     - Step 2: `"2. Keep the watch screen on, then click the button below to sync."`
     - Primary Button: `"Sync Watch Face"`.
- **Component Types:** Half-screen instructional modal bottom sheet, step list, action buttons.
- **Fixed vs Scrolling:** Fixed modal sheet.
- **Tabs / Settings:** None.

---

### OT01-S034: User Submission Legal Agreement Screen
- **Timestamps:** Local `136.93s` – `143.83s` | Global `316.93s` – `323.83s` (Frames `4108` – `4315`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< OtterLife User Submission Agreement`.
- **Top-to-Bottom Layout Regions:**
  1. *Scrollable Legal Document Body:*
     - Preamble: `"To use the OtterLife user submission service (referred to as 'the Service'), you should read and comply with the 'User Submission Agreement'..."`
     - Section 1: `"1. Service Description & Acceptance"`
     - Section 2: `"2. User Content Standards: 2.1 You are not allowed to engage in any activities, including but not limited to the following: (a) Disseminate obscene, pornographic, gambling, violent, murderous, terroristic, or criminal content. (b) Actions that insult or slander others, infringing upon their legal rights and interests. (c) Actions that infringe upon intellectual property, trade secrets..."`
     - Section 3: `"3. Intellectual Property Rights & Licensing..."`
- **Component Types:** Long-form legal scroll view, section headers, alphanumeric clause paragraphs.
- **Fixed vs Scrolling:** Fully vertically scrollable text container.
- **Tabs / Settings:** Legal document screen.

---

### OT01-S035: "Fortune God" Watch Face Detail Screen
- **Timestamps:** Local `146.00s` – `148.83s` | Global `326.00s` – `328.83s` (Frames `4380` – `4465`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Fortune God`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Apple Watch Mockup:*
     - Festive red Fortune God otter watch face graphic (`FRI 23`, `9:41`, HRV `82`, `10:09`, HRV metric `164 ms`, status `"Relaxed"`).
  2. *Redemption & Pricing Card:*
     - Card button: `"Theme Redemption Code"` with ticket icon.
  3. *Bottom Action Button:* Primary capsule button `"Apply to Watch"`.
- **Component Types:** Mockup canvas, action card row, primary button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S036: Fun Sticker Complication Feature Explanation Screen
- **Timestamps:** Local `151.33s` – `154.00s` | Global `331.33s` – `334.00s` (Frames `4540` – `4620`)
- **Header / Navigation:** Status bar (`11:23`), navigation bar `< Fun Sticker Complication Feature`.
- **Top-to-Bottom Layout Regions:**
  1. *Hero Graphic Section:*
     - Animated stickers popping onto a watch complication slot.
  2. *Informational Text Body:*
     - Headline: `"What is sticker complication?"`
     - Description: `"A sticker complication allows you to create your own watch stickers and display dynamic mood and status on your Apple Watch face."`
  3. *Bottom Action Button:* Primary capsule button `"Set up or replace the sticker complication"`.
- **Component Types:** Feature illustration, typography explainer block, primary action button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S037: Sticker Complication Slot Wireframe Selector Screen
- **Timestamps:** Local `154.67s` – `156.00s` | Global `334.67s` – `336.00s` (Frames `4640` – `4680`)
- **Header / Navigation:** Status bar (`11:24`), navigation bar `< Set up or replace the sticker complication`.
- **Top-to-Bottom Layout Regions:**
  1. *Watch Complication Wireframe Canvas:*
     - Apple Watch face wireframe showing time (`10:09`), date (`FRI 23`), status (`Relaxed 144ms`).
     - Slot 1: Highlighted active target outline `"Fun Sticker (Top Left)"`.
     - Slot 2: `"Top Right"`.
     - Slot 3: `"Bottom Left"`.
     - Slot 4: `"Bottom Right"`.
  2. *Bottom Action Button:* Button `"Done"` / `"Select Slot"`.
- **Component Types:** Interactive wireframe complication slot picker, action button.
- **Fixed vs Scrolling:** Fixed screen.
- **Tabs / Settings:** Complication slot selection interface.

---

### OT01-S038: Top Left Sticker Slot Customization Screen
- **Timestamps:** Local `156.33s` – `159.03s` | Global `336.33s` – `339.03s` (Frames `4690` – `4771`)
- **Header / Navigation:** Status bar (`11:24`), navigation bar `< Fun Sticker (Top Left)`.
- **Top-to-Bottom Layout Regions:**
  1. *Sticker Category Grid:*
     - Grid of selectable expressive Otter sticker icons (Eating, Sleeping, Exercising, Meditating, Party Otter).
  2. *Bottom Action Button:* Pinned primary button `"Done"`.
- **Component Types:** Multi-item icon selection grid, bottom action button.
- **Fixed vs Scrolling:** Fixed layout.
- **Tabs / Settings:** None.

---

### OT01-S039: Watch Connection Failure Alert Modal
- **Timestamps:** Local `159.33s` – `162.00s` | Global `339.33s` – `342.00s` (Frames `4780` – `4860`)
- **Header / Navigation:** Dimmed background over sticker slot screen.
- **Top-to-Bottom Layout Regions:**
  1. *Error Dialog Modal Card:*
     - Error exclamation glyph icon.
     - Title: `"Failed"`
     - Body copy: `"Please continue the operation after opening the OtterLife App on your watch. During the operation, please keep the watch screen lit up and maintain the connection with your iPhone."`
     - Action button: Yellow capsule button `"OK"`.
- **Component Types:** Centered error alert dialog card, single action dismiss button.
- **Fixed vs Scrolling:** Fixed modal.
- **Tabs / Settings:** Error alert.

---

### OT01-S040: Custom Theme Builder Screen (Blank / Default State)
- **Timestamps:** Local `165.63s` – `171.20s` | Global `345.63s` – `351.20s` (Frames `4969` – `5136`)
- **Header / Navigation:** Status bar (`11:24`), navigation bar `< Create New`, disabled top-right text button `"Save"`.
- **Top-to-Bottom Layout Regions:**
  1. *Section 1: Theme Title Form:*
     - Section Header: `"Theme Title"`
     - Single-line text input field with placeholder: `"Please enter the theme title"`.
  2. *Section 2: Theme with Image (Status Mappings):*
     - Section Header: `"Theme with Image"`
     - State Card 1: `"Relaxed Status"` (Dashed box with `+` image upload glyph).
     - State Card 2: `"Stable Status"` (Dashed box with `+` image upload glyph).
     - State Card 3: `"Stressed Status"` (Dashed box with `+` image upload glyph).
- **Component Types:** Form input field, status asset upload slots with plus glyphs, top navigation action.
- **Fixed vs Scrolling:** Vertically scrollable form view.
- **Tabs / Settings:** Theme builder form.

---

### OT01-S041: Custom Theme Builder Screen (Title Input Active with Keyboard)
- **Timestamps:** Local `171.30s` – `176.13s` | Global `351.30s` – `356.13s` (Frames `5139` – `5284`)
- **Header / Navigation:** Status bar (`11:24`), navigation bar `< Create New`.
- **Top-to-Bottom Layout Regions:**
  1. *Active Input Region:* Theme Title field focused with text string `"Summer"` and cursor active.
  2. *Native iOS Keyboard:* Lower half occupied by system keyboard.
- **Component Types:** Focused input field, virtual keyboard.
- **Fixed vs Scrolling:** Content shifted up by keyboard height.
- **Tabs / Settings:** Form state.

---

### OT01-S042: iOS System Photo Picker Modal Overlay
- **Timestamps:** Local `176.67s` – `178.77s` | Global `356.67s` – `358.77s` (Frames `5300` – `5363`)
- **Header / Navigation:** Modal navigation bar: `"Photos"`, Segment tabs `[Photos | Collections]`, `"Cancel"` button right.
- **Top-to-Bottom Layout Regions:**
  1. *Header & Search Bar:* Search field `"Search your library..."`.
  2. *Photo Grid Canvas:* 3-column / 4-column photo thumbnail asset grid.
- **Component Types:** Native iOS `PHPickerViewController` sheet modal.
- **Fixed vs Scrolling:** Scrollable photo grid inside modal sheet.
- **Tabs / Settings:** System photo picker.

---

### OT01-S043: Custom Theme Builder Screen (Completed Title State)
- **Timestamps:** Local `179.17s` – `180.00s` | Global `359.17s` – `360.00s` (Frames `5375` – `5400`)
- **Header / Navigation:** Status bar (`11:24`), navigation bar `< Create New`.
- **Top-to-Bottom Layout Regions:**
  1. *Form State:* Theme Title populated with `"Summer"`.
  2. *Status Upload Slots:* Focus returned to `"Relaxed Status"` `+` image card.
- **Component Types:** Theme builder form.
- **Fixed vs Scrolling:** Fixed view state.
- **Tabs / Settings:** Theme builder form.

---

## 2. MOTION & MICRO-INTERACTION INVENTORY

```
Displacement Profile Notation:
- Frames [F_start -> F_end]: measured per-frame pixel displacement (Δpx) or mean absolute difference (MAD).
- Easing Character: Curve shape extracted from frame velocity delta.
```

### OT01-M001: Apple In-App Purchase Sheet Presentation (Slide Up)
- **Local Timestamp:** `1.20s` – `1.60s` | **Global:** `181.20s` – `181.60s`
- **Elements & Properties:** Native StoreKit modal sheet container `translateY` (bottom `+1168px` -> resting `0px`), backdrop dimming `opacity` (`0.0` -> `0.5`).
- **Direction:** Bottom to Top (Vertical).
- **Start / End Frames:** Frame `36` to `48` (12 frames, **400.0 ms**).
- **Measured Frame Displacement (MAD):**
  `[F36: 0.17] -> [F37: 2.24] -> [F38: 6.71] -> [F39: 6.77] -> [F40: 4.86] -> [F41: 2.83] -> [F42: 1.23] -> [F43: 1.35] -> [F44: 0.59] -> [F45: 0.24] -> [F46: 0.11] -> [F47: 0.50]`
- **Easing Character:** Apple standard decelerating modal sheet curve (`cubic-bezier(0.16, 1, 0.3, 1)`). Fast initial rise with extended deceleration tail over final 4 frames.
- **Overshoot / Sibling Stagger:** No overshoot (hard floor snap); no sibling stagger.
- **Trigger Type:** Tap on primary CTA `"Free 3-day trial"` (Observed tap coordinate centered on button).
- **Classification:** Direct visual observation.

---

### OT01-M002: Apple IAP Success Checkmark Morph & Dismissal
- **Local Timestamp:** `2.53s` – `2.97s` | **Global:** `182.53s` – `182.97s`
- **Elements & Properties:** Face ID glyph stroke path morphs into circular checkmark, then StoreKit sheet `translateY` downwards (`0px` -> `+1168px`).
- **Direction:** Top to Bottom (Dismiss).
- **Start / End Frames:** Frame `76` to `89` (13 frames, **433.3 ms**).
- **Easing Character:** Accelerating exit curve (`cubic-bezier(0.4, 0, 1, 1)`).
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Automatic system callback following purchase completion.
- **Classification:** Direct visual observation.

---

### OT01-M003: Member Welcome Dialog Presentation (Scale + Fade In)
- **Local Timestamp:** `2.97s` – `3.20s` | **Global:** `182.97s` – `183.20s`
- **Elements & Properties:** Centered modal container `scale` (`0.85` -> `1.00`), `opacity` (`0.0` -> `1.0`), backdrop dark overlay `opacity` (`0.0` -> `0.6`).
- **Direction:** Centered scale expansion.
- **Start / End Frames:** Frame `89` to `96` (7 frames, **233.3 ms**).
- **Measured Frame Displacement (MAD):**
  `[F89: 1.70] -> [F90: 6.80] -> [F91: 5.20] -> [F92: 3.10] -> [F93: 1.80] -> [F94: 0.90] -> [F95: 0.40] -> [F96: 0.10]`
- **Easing Character:** Spring ease-out with subtle 2% scale settling.
- **Overshoot / Sibling Stagger:** Minor 1-frame overshoot on modal border.
- **Trigger Type:** System event triggered by purchase completion.
- **Classification:** Direct visual observation.

---

### OT01-M004: Member Welcome Modal Dismissal
- **Local Timestamp:** `5.60s` – `6.00s` | **Global:** `185.60s` – `186.00s`
- **Elements & Properties:** Modal card `scale` (`1.0` -> `0.92`), `opacity` (`1.0` -> `0.0`).
- **Direction:** Centered scale contraction.
- **Start / End Frames:** Frame `168` to `180` (12 frames, **400.0 ms**).
- **Easing Character:** Standard ease-in (`cubic-bezier(0.4, 0, 1, 1)`).
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Confirm"` button.
- **Classification:** Direct visual observation.

---

### OT01-M005: Free Trial Screen Navigation Push to Goals Selection
- **Local Timestamp:** `8.80s` – `9.07s` | **Global:** `188.80s` – `189.07s`
- **Elements & Properties:** Full screen horizontal transition: outgoing screen `translateX` (`0` -> `-540px`), incoming Goal Selection screen `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left (Horizontal push).
- **Start / End Frames:** Frame `264` to `272` (8 frames, **266.7 ms**).
- **Easing Character:** Native iOS `UINavigationController` push ease-in-out curve.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Start my free trial"` button.
- **Classification:** Direct visual observation.

---

### OT01-M006: Goal List Item Selection Toggle Micro-Interactions
- **Local Timestamp:** `10.30s` – `13.50s` | **Global:** `190.30s` – `193.50s`
- **Elements & Properties:** Checkmark circle fill `color` (gray outline `#E5E5EA` -> filled yellow `#FFD21E`), icon glyph scale bounce (`1.0` -> `1.2` -> `1.0`).
- **Direction:** In-place scale and color tint shift.
- **Start / End Frames:** Frame `309` to `405` (multiple bursts, each ~3-5 frames, **100.0 - 166.7 ms**).
- **Easing Character:** Snappy spring pop.
- **Overshoot / Sibling Stagger:** ~15% icon scale overshoot.
- **Trigger Type:** Taps on individual goal rows (Card 1, Card 2, Card 4).
- **Classification:** Direct visual observation.

---

### OT01-M007: Goal Screen Navigation Push to Streak Challenge
- **Local Timestamp:** `14.00s` – `14.57s` | **Global:** `194.00s` – `194.57s`
- **Elements & Properties:** Navigation stack push: outgoing Goals screen slides left, incoming `"Start Streak!"` screen slides in from right.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `420` to `437` (17 frames, **566.7 ms**).
- **Measured Frame Displacement (MAD):**
  `[F420-424: 1.1] -> [F425: 4.8] -> [F428: 11.1] -> [F431: 8.4] -> [F434: 3.2] -> [F437: 0.4]`
- **Easing Character:** Standard smooth ease-out push curve.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on bottom `"Continue"` button.
- **Classification:** Direct visual observation.

---

### OT01-M008: Streak Day Pill Selection Switch (1 Day -> 3 Days)
- **Local Timestamp:** `16.50s` – `17.20s` | **Global:** `196.50s` – `197.20s`
- **Elements & Properties:** Pill active highlight indicator sliding from index `0` (`1`) to index `1` (`3`), pill background scale and color transition.
- **Direction:** Horizontal slide within selector bar.
- **Start / End Frames:** Frame `495` to `516` (21 frames, **700.0 ms**).
- **Easing Character:** Smooth spring slide.
- **Overshoot / Sibling Stagger:** Minor 2px bounce on target card bounds.
- **Trigger Type:** Tap on `"3"` day pill card.
- **Classification:** Direct visual observation.

---

### OT01-M009: Streak Screen Navigation Push to "Meet Your Otter Baby"
- **Local Timestamp:** `18.00s` – `18.53s` | **Global:** `198.00s` – `198.53s`
- **Elements & Properties:** Navigation push: horizontal transition `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `540` to `556` (16 frames, **533.3 ms**).
- **Easing Character:** Standard iOS push ease-out.
- **Overshoot / Sibling Stagger:** Mascot artwork fades in 1 frame ahead of bottom copy.
- **Trigger Type:** Tap on `"Continue"` button.
- **Classification:** Direct visual observation.

---

### OT01-M010: Speech Bubble Floating Pulse on Mascot
- **Local Timestamp:** `19.20s` – `21.50s` | **Global:** `199.20s` – `201.50s`
- **Elements & Properties:** Speech bubble container subtle vertical float `translateY` (`±3px` sinusoidal oscillation), otter mascot breathing scale (`1.0` -> `1.02` -> `1.0`).
- **Direction:** Vertical looping float.
- **Start / End Frames:** Frame `576` to `645` (69 frames, continuous loop).
- **Easing Character:** Continuous sine wave / ease-in-out loop.
- **Overshoot / Sibling Stagger:** Bubble motion slightly offset from otter body motion by ~4 frames.
- **Trigger Type:** Automatic continuous idle animation.
- **Classification:** Direct visual observation.

---

### OT01-M011: Push Transition to "Complete Goal & Raise Baby Otter"
- **Local Timestamp:** `21.80s` – `22.23s` | **Global:** `201.80s` – `202.23s`
- **Elements & Properties:** Screen sliding left, incoming screen elements staggering horizontally.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `654` to `667` (13 frames, **433.3 ms**).
- **Easing Character:** Standard ease-out push.
- **Overshoot / Sibling Stagger:** Staggered entrance: top headline enters at F655, middle task cards enter at F658, bottom CTA enters at F660.
- **Trigger Type:** Tap on `"Continue"` button.
- **Classification:** Direct visual observation.

---

### OT01-M012: Task Cards Cascade / Level-Up Bar Animation
- **Local Timestamp:** `22.50s` – `23.80s` | **Global:** `202.50s` – `203.80s`
- **Elements & Properties:** Calorie progress fill bar expands horizontally (`0%` -> `63.6%`, `318/500 KCAL`).
- **Direction:** Left to Right bar fill.
- **Start / End Frames:** Frame `675` to `714` (39 frames, **1300.0 ms**).
- **Easing Character:** Ease-out cubic bar fill.
- **Overshoot / Sibling Stagger:** Number counter counts up synchronously with bar fill.
- **Trigger Type:** Screen entrance trigger.
- **Classification:** Direct visual observation.

---

### OT01-M013: Push Transition to "Custom Pet Companion"
- **Local Timestamp:** `24.00s` – `24.57s` | **Global:** `204.00s` – `204.57s`
- **Elements & Properties:** Screen slide push `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `720` to `737` (17 frames, **566.7 ms**).
- **Easing Character:** Standard navigation push.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Continue"` button.
- **Classification:** Direct visual observation.

---

### OT01-M014: Virtual Keyboard Appearance on Name Edit
- **Local Timestamp:** `33.33s` – `33.50s` | **Global:** `213.33s` – `213.50s`
- **Elements & Properties:** iOS virtual keyboard `translateY` (`+400px` -> `0`), main form container `translateY` (`0` -> `-80px`).
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `1000` to `1005` (5 frames, **166.7 ms**).
- **Measured Frame Displacement (MAD):**
  `[F1000: 21.27] -> [F1001: 17.81] -> [F1002: 15.01] -> [F1003: 9.90] -> [F1004: 3.13] -> [F1005: 0.05]`
- **Easing Character:** Native iOS keyboard spring curve (`UIKeyboardWillShowNotification`).
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"TATA"` name field.
- **Classification:** Direct visual observation.

---

### OT01-M015: Name Field Text Editing Micro-Interactions ("moon")
- **Local Timestamp:** `34.00s` – `36.50s` | **Global:** `214.00s` – `216.50s`
- **Elements & Properties:** Backspacing `"TATA"`, sequential character insertion: `"m"` -> `"mo"` -> `"moo"` -> `"moon"`, character counter updates `1/15` -> `4/15`, cursor blinking at 1.0 Hz.
- **Direction:** Left-to-right character append.
- **Start / End Frames:** Frame `1020` to `1095` (75 frames, **2500.0 ms**).
- **Easing Character:** Instant character insert per key stroke.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Keyboard key taps.
- **Classification:** Direct visual observation.

---

### OT01-M016: "Call me" Bottom Sheet Slide Up
- **Local Timestamp:** `37.43s` – `37.60s` | **Global:** `217.43s` – `217.60s`
- **Elements & Properties:** Bottom sheet container `translateY` (`+600px` -> `0`), backdrop dimming `opacity` (`0.0` -> `0.4`).
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `1123` to `1128` (5 frames, **166.7 ms**).
- **Easing Character:** Apple standard modal sheet spring curve.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"• Call me"` row.
- **Classification:** Direct visual observation.

---

### OT01-M017: "Call me" Option Selection ("mom") & Sheet Dismissal
- **Local Timestamp:** `38.83s` – `39.13s` | **Global:** `218.83s` – `219.13s`
- **Elements & Properties:** Checkmark icon appears on `"mom"` row, sheet slides down `translateY` (`0` -> `+600px`), parent form row value updates to `"mom >"`.
- **Direction:** Top to Bottom (Dismiss).
- **Start / End Frames:** Frame `1165` to `1174` (9 frames, **300.0 ms**).
- **Easing Character:** Accelerating sheet dismiss.
- **Overshoot / Sibling Stagger:** Row label update completes 1 frame before sheet clears bottom edge.
- **Trigger Type:** Tap on `"mom"` row in sheet.
- **Classification:** Direct visual observation.

---

### OT01-M018: "Gender" Bottom Sheet Slide Up
- **Local Timestamp:** `42.40s` – `42.60s` | **Global:** `222.40s` – `222.60s`
- **Elements & Properties:** Bottom sheet container `translateY` (`+500px` -> `0`).
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `1272` to `1278` (6 frames, **200.0 ms**).
- **Easing Character:** Decelerating sheet spring.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Gender"` row.
- **Classification:** Direct visual observation.

---

### OT01-M019: "Gender" Selection ("Female") & Sheet Dismissal
- **Local Timestamp:** `45.63s` – `46.13s` | **Global:** `225.63s` – `226.13s`
- **Elements & Properties:** Radio select dot moves to `"Female"`, sheet dismisses downwards `translateY` (`0` -> `+500px`), parent row updates to `"Female >"`.
- **Direction:** Top to Bottom.
- **Start / End Frames:** Frame `1369` to `1384` (15 frames, **500.0 ms**).
- **Easing Character:** Ease-in sheet exit.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Female"` list row.
- **Classification:** Direct visual observation.

---

### OT01-M020: Navigation Push to Privacy & Health Data Screen
- **Local Timestamp:** `50.37s` – `50.80s` | **Global:** `230.37s` – `230.80s`
- **Elements & Properties:** Screen horizontal slide `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `1511` to `1524` (13 frames, **433.3 ms**).
- **Easing Character:** Standard navigation ease-out push.
- **Overshoot / Sibling Stagger:** Shield icon scales from `0.9` -> `1.0` during transition.
- **Trigger Type:** Tap on `"Claim Pet Partner"` button.
- **Classification:** Direct visual observation.

---

### OT01-M021: Privacy Screen Dismissal / Transition to Weekly Review
- **Local Timestamp:** `52.57s` – `52.90s` | **Global:** `232.57s` – `232.90s`
- **Elements & Properties:** Full screen cross-dissolve and horizontal slide transition.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `1577` to `1587` (10 frames, **333.3 ms**).
- **Easing Character:** Ease-in-out crossfade.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Continue"` button.
- **Classification:** Direct visual observation.

---

### OT01-M022: Weekly Review Carousel Swipe 1 (Overview -> Activity Summary)
- **Local Timestamp:** `54.63s` – `55.13s` | **Global:** `234.63s` – `235.13s`
- **Elements & Properties:** Horizontal carousel track `translateX` (`0` -> `-540px`), card 1 exits left, card 2 enters right, page dot 1 transitions to dot 2.
- **Direction:** Right to Left (Horizontal swipe).
- **Start / End Frames:** Frame `1639` to `1654` (15 frames, **500.0 ms**).
- **Easing Character:** Gesture drag with inertial release decelerating curve.
- **Overshoot / Sibling Stagger:** Minor 4px carousel edge rebound settling.
- **Trigger Type:** Touch swipe gesture.
- **Classification:** Direct visual observation.

---

### OT01-M023: Weekly Review Carousel Swipe 2 (Activity -> Drink Summary)
- **Local Timestamp:** `56.37s` – `56.97s` | **Global:** `236.37s` – `236.97s`
- **Elements & Properties:** Horizontal carousel track `translateX` (`-540px` -> `-1080px`), card 2 exits left, card 3 (Drink bar chart) enters right, page dot 3 activates.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `1691` to `1709` (18 frames, **600.0 ms**).
- **Easing Character:** Inertial swipe deceleration.
- **Overshoot / Sibling Stagger:** Chart bars grow vertically from 0 upon settling into viewport.
- **Trigger Type:** Touch swipe gesture.
- **Classification:** Direct visual observation.

---

### OT01-M024: Navigation Push to Share Preview Card Screen
- **Local Timestamp:** `58.30s` – `58.77s` | **Global:** `238.30s` – `238.77s`
- **Elements & Properties:** Outgoing review screen slides left, incoming share canvas card slides in from right.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `1749` to `1763` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation push ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on top-right `"Share"` icon button.
- **Classification:** Direct visual observation.

---

### OT01-M025: iOS System Photo Permission Alert Presentation (Pop In)
- **Local Timestamp:** `62.60s` – `62.90s` | **Global:** `242.60s` – `242.90s`
- **Elements & Properties:** iOS system alert dialog `scale` (`1.15` -> `1.0`), `opacity` (`0.0` -> `1.0`), background dimming `opacity` (`0.0` -> `0.4`).
- **Direction:** Centered spring pop.
- **Start / End Frames:** Frame `1878` to `1887` (9 frames, **300.0 ms**).
- **Easing Character:** Native iOS `UIAlertController` spring bounce.
- **Overshoot / Sibling Stagger:** 2% scale rebound before settling.
- **Trigger Type:** Tap on `"Save Image"` button.
- **Classification:** Direct visual observation.

---

### OT01-M026: Photo Permission Dialog Dismissal
- **Local Timestamp:** `64.00s` – `64.30s` | **Global:** `244.00s` – `244.30s`
- **Elements & Properties:** Alert container `opacity` (`1.0` -> `0.0`), background un-dims.
- **Direction:** Centered fade.
- **Start / End Frames:** Frame `1920` to `1929` (9 frames, **300.0 ms**).
- **Easing Character:** Fast ease-in fade.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `[Allow Access to All Photos]` button.
- **Classification:** Direct visual observation.

---

### OT01-M027: Native iOS Share Sheet Slide Up
- **Local Timestamp:** `69.03s` – `69.47s` | **Global:** `249.03s` – `249.47s`
- **Elements & Properties:** Native `UIActivityViewController` sheet `translateY` (`+1168px` -> `0`), backdrop dimming.
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `2071` to `2084` (13 frames, **433.3 ms**).
- **Measured Frame Displacement (MAD):**
  `[F2071: 6.93] -> [F2072: 7.93] -> [F2073: 9.63] -> [F2074: 11.60] -> [F2075: 8.73] -> [F2076: 10.64] -> [F2077: 9.06] -> [F2078: 6.80] -> [F2079: 5.36] -> [F2080: 3.38] -> [F2081: 2.18] -> [F2082: 1.31] -> [F2083: 0.88]`
- **Easing Character:** Smooth Apple sheet deceleration curve.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Share"` button.
- **Classification:** Direct visual observation.

---

### OT01-M028: iOS Share Sheet Dismissal (Slide Down)
- **Local Timestamp:** `72.60s` – `72.83s` | **Global:** `252.60s` – `252.83s`
- **Elements & Properties:** Sheet container `translateY` (`0` -> `+1168px`).
- **Direction:** Top to Bottom.
- **Start / End Frames:** Frame `2178` to `2185` (7 frames, **233.3 ms**).
- **Easing Character:** Accelerating dismiss curve.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Drag gesture downwards on sheet header / tap outside sheet.
- **Classification:** Direct visual observation.

---

### OT01-M029: Navigation Pop from Share Screen Back to Dashboard
- **Local Timestamp:** `74.33s` – `74.80s` | **Global:** `254.33s` – `254.80s`
- **Elements & Properties:** Navigation stack pop: current share screen slides right `translateX` (`0` -> `+540px`), underlying Today Dashboard revealed.
- **Direction:** Left to Right (Pop reverse).
- **Start / End Frames:** Frame `2230` to `2244` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation pop ease-in-out.
- **Overshoot / Sibling Stagger:** Bottom tab bar fades in synchronously with pop completion.
- **Trigger Type:** Tap on top `<` back button.
- **Classification:** Direct visual observation.

---

### OT01-M030: Re-entry Navigation Push to Partner Setup
- **Local Timestamp:** `80.33s` – `80.80s` | **Global:** `260.33s` – `260.80s`
- **Elements & Properties:** Screen horizontal slide `translateX` (`+540px` -> `0`), bottom tab bar slides down and disappears.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `2410` to `2424` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation push.
- **Overshoot / Sibling Stagger:** Tab bar hides 2 frames before push reaches midpoint.
- **Trigger Type:** Tap on hero partner banner on Today dashboard.
- **Classification:** Direct visual observation.

---

### OT01-M031: AI Partner Generation Loading Transition
- **Local Timestamp:** `86.60s` – `91.50s` | **Global:** `266.60s` – `271.60s`
- **Elements & Properties:**
  1. Mascot glowing aura rotation and radial pulse (`scale 1.0` -> `1.08` -> `1.0` repeating every 1.2s).
  2. Checklist item 1 (`Generating AI Personality`): Spinner turns to green checkmark at F2615.
  3. Checklist item 2 (`Syncing Personalized Settings`): Spinner turns to green checkmark at F2690.
  4. Checklist item 3 (`Linking with You`): Checkmark completes at F2743.
- **Direction:** Sequential vertical progression + radial pulsing.
- **Start / End Frames:** Frame `2598` to `2745` (147 frames, **4900.0 ms**).
- **Easing Character:** Stepwise delayed sequence with continuous rotating loading glyphs.
- **Overshoot / Sibling Stagger:** Each checklist item staggers by ~1.5 seconds.
- **Trigger Type:** Tap on `"Confirm"` button on Customize Partner screen.
- **Classification:** Direct visual observation.

---

### OT01-M032: Interactive Otter Partner Entrance & Speech Bubble 1 Reveal
- **Local Timestamp:** `91.77s` – `93.50s` | **Global:** `271.77s` – `273.50s`
- **Elements & Properties:** Otter mascot floats into center stage with celebratory scale bounce; speech bubble expands upwards (`scale 0.5` -> `1.0`, `translateY +40px` -> `0`), text streams in.
- **Direction:** Bottom to Top expansion.
- **Start / End Frames:** Frame `2753` to `2805` (52 frames, **1733.3 ms**).
- **Easing Character:** Bouncy spring entrance (`overshoot ~8%`).
- **Overshoot / Sibling Stagger:** Text begins streaming 5 frames after speech bubble border reaches resting size.
- **Trigger Type:** Automatic progression after loading completion.
- **Classification:** Direct visual observation.

---

### OT01-M033: Speech Bubble 2 Transition (Health Advice & Guidance)
- **Local Timestamp:** `97.67s` – `98.13s` | **Global:** `277.67s` – `278.13s`
- **Elements & Properties:** Speech bubble card 1 scrolls upwards / fades out, bubble card 2 expands with updated advice text.
- **Direction:** Bottom to Top push.
- **Start / End Frames:** Frame `2930` to `2944` (14 frames, **466.7 ms**).
- **Easing Character:** Smooth vertical slide-fade.
- **Overshoot / Sibling Stagger:** Mascot eye blink triggers synchronously on bubble flip.
- **Trigger Type:** Screen tap anywhere to advance dialogue.
- **Classification:** Direct visual observation.

---

### OT01-M034: Speech Bubble 3 Transition (Clingy Persona & Heart Eyes)
- **Local Timestamp:** `103.00s` – `103.60s` | **Global:** `283.00s` – `283.60s`
- **Elements & Properties:** Mascot expression morphs to heart-eyes with head tilt; speech bubble morphs with exclamation: `"Hi Momma! I'm Moon, your silly, clingy little Moon! I wuv you!"`.
- **Direction:** Scale bounce and character morph.
- **Start / End Frames:** Frame `3090` to `3108` (18 frames, **600.0 ms**).
- **Easing Character:** Spring bounce with character ear wiggle.
- **Overshoot / Sibling Stagger:** Floating heart particles emit upwards from mascot head.
- **Trigger Type:** Screen tap to advance dialogue.
- **Classification:** Direct visual observation.

---

### OT01-M035: Partner Settings Overlay Sheet Slide Up
- **Local Timestamp:** `107.63s` – `108.10s` | **Global:** `287.63s` – `288.10s`
- **Elements & Properties:** Half-modal settings sheet `translateY` (`+600px` -> `0`).
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `3229` to `3243` (14 frames, **466.7 ms**).
- **Easing Character:** Standard modal sheet deceleration.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on settings/pencil icon in top-right corner.
- **Classification:** Direct visual observation.

---

### OT01-M036: Partner Settings Sheet Dismissal to Today Dashboard
- **Local Timestamp:** `110.00s` – `110.47s` | **Global:** `290.00s` – `290.47s`
- **Elements & Properties:** Modal sheet slides down `translateY` (`0` -> `+600px`), full screen crossfades back to Today Dashboard.
- **Direction:** Top to Bottom.
- **Start / End Frames:** Frame `3300` to `3314` (14 frames, **466.7 ms**).
- **Easing Character:** Accelerating dismiss curve.
- **Overshoot / Sibling Stagger:** Bottom tab bar fades in upon sheet exit.
- **Trigger Type:** Tap outside modal sheet / back navigation tap.
- **Classification:** Direct visual observation.

---

### OT01-M037: Navigation Push to "Add Widgets" Screen
- **Local Timestamp:** `114.00s` – `114.53s` | **Global:** `294.00s` – `294.53s`
- **Elements & Properties:** Today screen slides left, incoming `"Add Widgets"` screen slides in from right; bottom tab bar hides.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `3420` to `3436` (16 frames, **533.3 ms**).
- **Measured Frame Displacement (MAD):**
  `[F3420: 1.2] -> [F3423: 44.2] -> [F3426: 38.1] -> [F3429: 22.4] -> [F3432: 9.8] -> [F3436: 0.5]`
- **Easing Character:** Standard iOS push deceleration.
- **Overshoot / Sibling Stagger:** Watch hardware mockup scales into place.
- **Trigger Type:** Tap on `"Add phone/watch widget now"` banner card.
- **Classification:** Direct visual observation.

---

### OT01-M038: Navigation Push to Watch Face "Customize" Screen
- **Local Timestamp:** `116.33s` – `116.80s` | **Global:** `296.33s` – `296.80s`
- **Elements & Properties:** Screen horizontal slide `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `3490` to `3504` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation push ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on bottom `"Customize"` button.
- **Classification:** Direct visual observation.

---

### OT01-M039: Navigation Push to Theme Gallery Catalog ("Theme")
- **Local Timestamp:** `118.63s` – `119.13s` | **Global:** `298.63s` – `299.13s`
- **Elements & Properties:** Screen slide `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `3559` to `3574` (15 frames, **500.0 ms**).
- **Easing Character:** Standard navigation push.
- **Overshoot / Sibling Stagger:** Category chips enter 2 frames ahead of theme grid.
- **Trigger Type:** Tap on `"Explore more watch faces"` header banner.
- **Classification:** Direct visual observation.

---

### OT01-M040: Navigation Push to "Cute Loopy" Watch Face Detail
- **Local Timestamp:** `123.57s` – `124.07s` | **Global:** `303.57s` – `304.07s`
- **Elements & Properties:** 2-column theme grid slides left; Cute Loopy watch face canvas slides in from right.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `3707` to `3722` (15 frames, **500.0 ms**).
- **Easing Character:** Standard navigation ease-out.
- **Overshoot / Sibling Stagger:** Watch screen complication elements animate into resting positions.
- **Trigger Type:** Tap on `"Cute Loopy"` grid card.
- **Classification:** Direct visual observation.

---

### OT01-M041: "Add Step" Watch Installation Bottom Sheet Presentation
- **Local Timestamp:** `126.60s` – `126.83s` | **Global:** `306.60s` – `306.83s`
- **Elements & Properties:** Instructional bottom sheet `translateY` (`+650px` -> `0`), background dimming `opacity` (`0.0` -> `0.45`).
- **Direction:** Bottom to Top.
- **Start / End Frames:** Frame `3798` to `3805` (7 frames, **233.3 ms**).
- **Easing Character:** Apple standard sheet spring deceleration.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Install to Watch"` button.
- **Classification:** Direct visual observation.

---

### OT01-M042: "Add Step" Sheet Dismissal
- **Local Timestamp:** `128.43s` – `128.80s` | **Global:** `308.43s` – `308.80s`
- **Elements & Properties:** Modal sheet `translateY` (`0` -> `+650px`).
- **Direction:** Top to Bottom.
- **Start / End Frames:** Frame `3853` to `3864` (11 frames, **366.7 ms**).
- **Easing Character:** Accelerating dismiss exit.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on close button `✕` / drag downwards.
- **Classification:** Direct visual observation.

---

### OT01-M043: Navigation Pop from Cute Loopy Detail Back to Theme Catalog
- **Local Timestamp:** `132.00s` – `132.80s` | **Global:** `312.00s` – `312.80s`
- **Elements & Properties:** Detail screen slides right `translateX` (`0` -> `+540px`), underlying theme grid revealed.
- **Direction:** Left to Right (Reverse pop).
- **Start / End Frames:** Frame `3960` to `3984` (24 frames, **800.0 ms**).
- **Measured Frame Displacement (MAD):**
  `[F3966: 45.02] -> [F3967: 53.01] -> [F3968: 44.20] -> [F3969: 47.42] -> [F3970: 42.33] -> [F3971: 31.28] -> [F3972: 19.46] -> [F3973: 11.94] -> [F3974: 8.09] -> [F3975: 5.92] -> [F3976: 4.24] -> [F3977: 3.33] -> [F3978: 2.25] -> [F3979: 2.05] -> [F3980: 0.88]`
- **Easing Character:** Interactive edge swipe gesture release with smooth deceleration tail.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Edge swipe gesture from left bezel.
- **Classification:** Direct visual observation.

---

### OT01-M044: Navigation Push to User Submission Agreement
- **Local Timestamp:** `133.97s` – `134.00s` (trigger) -> `136.60s` – `136.93s` (push) | **Global:** `313.97s` – `316.93s`
- **Elements & Properties:** Full page navigation push `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `4098` to `4108` (10 frames, **333.3 ms**).
- **Easing Character:** Standard navigation push ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Agreement"` link in top-right navigation bar.
- **Classification:** Direct visual observation.

---

### OT01-M045: Legal Agreement Document Vertical Scroll Drag & Momentum
- **Local Timestamp:** `141.47s` – `143.60s` | **Global:** `321.47s` – `323.60s`
- **Elements & Properties:** Scroll container `translateY` (`0px` -> `-780px`), scrollbar indicator appears on right edge, moves downward proportionally.
- **Direction:** Vertical upward scroll (Finger dragging upward).
- **Start / End Frames:** Frame `4244` to `4308` (64 frames, **2133.3 ms**).
- **Measured Frame Displacement (MAD):** Continuous active scroll variance peaking at `~23.1 MAD` around F4262 with gradual exponential decay to F4308.
- **Easing Character:** iOS standard scroll physics (cubic touch drag followed by exponential momentum decay).
- **Overshoot / Sibling Stagger:** Subtle rubber-band bounce at scroll velocity apex.
- **Trigger Type:** Vertical drag touch gesture.
- **Classification:** Direct visual observation.

---

### OT01-M046: Navigation Pop from Agreement Back to Theme Catalog
- **Local Timestamp:** `143.83s` – `144.27s` | **Global:** `323.83s` – `324.27s`
- **Elements & Properties:** Agreement screen slides right `translateX` (`0` -> `+540px`).
- **Direction:** Left to Right (Pop reverse).
- **Start / End Frames:** Frame `4315` to `4328` (13 frames, **433.3 ms**).
- **Easing Character:** Standard navigation pop ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on top `<` back chevron.
- **Classification:** Direct visual observation.

---

### OT01-M047: Navigation Push to "Fortune God" Watch Face Detail
- **Local Timestamp:** `145.80s` – `146.27s` | **Global:** `325.80s` – `326.27s`
- **Elements & Properties:** Screen slide `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `4374` to `4388` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation push ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Fortune God"` card in theme catalog.
- **Classification:** Direct visual observation.

---

### OT01-M048: Navigation Pop from Fortune God Back to Customize
- **Local Timestamp:** `148.83s` – `149.30s` | **Global:** `328.83s` – `329.30s`
- **Elements & Properties:** Detail screen slides right `translateX` (`0` -> `+540px`).
- **Direction:** Left to Right.
- **Start / End Frames:** Frame `4465` to `4479` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation pop.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on top `<` back chevron.
- **Classification:** Direct visual observation.

---

### OT01-M049: Navigation Push to Fun Sticker Complication Feature Explainer
- **Local Timestamp:** `150.90s` – `151.37s` | **Global:** `330.90s` – `331.37s`
- **Elements & Properties:** Screen slide `translateX` (`+540px` -> `0`).
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `4527` to `4541` (14 frames, **466.7 ms**).
- **Easing Character:** Standard navigation push.
- **Overshoot / Sibling Stagger:** Animated stickers pop in with staggered spring scales.
- **Trigger Type:** Tap on `"Fun Sticker Complication Feature"` card.
- **Classification:** Direct visual observation.

---

### OT01-M050: Navigation Push to Sticker Slot Wireframe Selector
- **Local Timestamp:** `155.00s` – `155.70s` | **Global:** `335.00s` – `335.70s`
- **Elements & Properties:** Explainer screen slides left; complication slot wireframe layout slides in from right.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `4650` to `4671` (21 frames, **700.0 ms**).
- **Easing Character:** Standard navigation push.
- **Overshoot / Sibling Stagger:** Wireframe complication slots highlight in clockwise order upon entrance.
- **Trigger Type:** Tap on `"Set up or replace the sticker complication"` button.
- **Classification:** Direct visual observation.

---

### OT01-M051: Sticker Slot Selection Push to "Fun Sticker (Top Left)"
- **Local Timestamp:** `156.10s` – `156.50s` | **Global:** `336.10s` – `336.50s`
- **Elements & Properties:** Wireframe slot highlights with glowing yellow border, then screen transitions to slot customization grid.
- **Direction:** Right to Left push.
- **Start / End Frames:** Frame `4683` to `4695` (12 frames, **400.0 ms**).
- **Easing Character:** Ease-out navigation push.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on Top Left slot target outline.
- **Classification:** Direct visual observation.

---

### OT01-M052: Watch Sync Failure Alert Modal Presentation (Pop In)
- **Local Timestamp:** `159.03s` – `159.70s` | **Global:** `339.03s` – `339.70s`
- **Elements & Properties:** Centered modal alert card `scale` (`0.85` -> `1.0`), `opacity` (`0.0` -> `1.0`), backdrop dark overlay `opacity` (`0.0` -> `0.5`).
- **Direction:** Centered scale expansion.
- **Start / End Frames:** Frame `4771` to `4791` (20 frames, **666.7 ms**).
- **Measured Frame Displacement (MAD):**
  `[F4771: 4.5] -> [F4774: 13.2] -> [F4778: 8.1] -> [F4782: 4.2] -> [F4786: 1.8] -> [F4791: 0.2]`
- **Easing Character:** Bouncy spring modal pop (`overshoot ~6%`).
- **Overshoot / Sibling Stagger:** Exclamation glyph bounces once inside badge.
- **Trigger Type:** Tap on bottom `"Done"` button attempting watch sync.
- **Classification:** Direct visual observation.

---

### OT01-M053: Failure Alert Dismissal & Pop Back to Customize
- **Local Timestamp:** `162.00s` – `164.80s` | **Global:** `342.00s` – `344.80s`
- **Elements & Properties:**
  1. Alert modal fades out `opacity` (`1.0` -> `0.0`) from F4860 to F4878 (**600.0 ms**).
  2. Sequential navigation pop: screen slides right `translateX` (`0` -> `+540px`) from F4911 to F4944 (**1100.0 ms**), returning to Customize dashboard.
- **Direction:** Centered fade + Left-to-Right pop.
- **Start / End Frames:** Frame `4860` to `4944` (84 frames total).
- **Easing Character:** Ease-in fade followed by smooth navigation pop ease-out.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"OK"` button on modal, then tap top `<` back button.
- **Classification:** Direct visual observation.

---

### OT01-M054: Navigation Push to "Create New" Custom Theme Builder
- **Local Timestamp:** `165.00s` – `165.63s` | **Global:** `345.00s` – `345.63s`
- **Elements & Properties:** Customize dashboard slides left, `"Create New"` theme builder form slides in from right.
- **Direction:** Right to Left.
- **Start / End Frames:** Frame `4950` to `4969` (19 frames, **633.3 ms**).
- **Easing Character:** Standard navigation push ease-out.
- **Overshoot / Sibling Stagger:** Status image upload slots stagger upward into resting position.
- **Trigger Type:** Tap on large `+` card on Customize dashboard.
- **Classification:** Direct visual observation.

---

### OT01-M055: Theme Title Typing Micro-Interactions ("Summer")
- **Local Timestamp:** `171.20s` – `176.00s` | **Global:** `351.20s` – `356.00s`
- **Elements & Properties:** Virtual keyboard slides up (F5136–F5139), characters appended sequentially into text field: `"S"` -> `"Su"` -> `"Sum"` -> `"Summ"` -> `"Summe"` -> `"Summer"`, cursor active and blinking at 1.0 Hz.
- **Direction:** Bottom-to-top keyboard push + horizontal character stream.
- **Start / End Frames:** Frame `5136` to `5280` (144 frames, **4800.0 ms**).
- **Easing Character:** Immediate keypress text insertion.
- **Overshoot / Sibling Stagger:** None.
- **Trigger Type:** Tap on `"Theme Title"` field + software keyboard taps.
- **Classification:** Direct visual observation.

---

### OT01-M056: Native iOS Photo Picker Modal Sheet Presentation & Dismissal
- **Local Timestamp:** `176.00s` – `179.30s` | **Global:** `356.00s` – `359.30s`
- **Elements & Properties:**
  1. *Presentation:* Native `PHPickerViewController` sheet modal slides up `translateY` (`+1168px` -> `0`) from F5280 to F5304 (**800.0 ms**).
  2. *Dismissal:* Sheet slides down `translateY` (`0` -> `+1168px`) from F5363 to F5379 (**533.3 ms**), returning to Create New theme form with `"Summer"` title intact.
- **Direction:** Bottom to Top (Open), then Top to Bottom (Dismiss).
- **Start / End Frames:** Frame `5280` to `5379` (99 frames total).
- **Measured Frame Displacement (MAD):**
  - Opening peak at F5289 (`50.8 MAD`).
  - Dismissing peak at F5365 (`54.7 MAD`).
- **Easing Character:** Apple standard modal sheet spring on entrance; accelerating gravity exit on dismiss.
- **Overshoot / Sibling Stagger:** Photo thumbnail grid fades in 3 frames after sheet borders settle.
- **Trigger Type:** Tap on `"Relaxed Status"` `+` upload card, then tap `"Cancel"` button top-right of photo picker.
- **Classification:** Direct visual observation.

---

## 3. UNREADABLE / MISSING COVERAGE DISCLOSURE

- **Haptic Feedback:** Not discernible from video recording (no haptic telemetry in MP4 stream).
- **Physical Apple Watch Screen State:** The actual physical Apple Watch screen behavior is not visible; only the iPhone simulator/device UI interactions and error responses (`"Failed: please open OtterLife App on your watch"`) are captured.
- **Bottom Tab 2 & 3 Full Views:** During this 180s segment, the user navigates directly into the widget customization flow and onboarding rather than switching to the full independent `Analysis`, `Otter`, or `Mine` main tabs.

---

## 4. SCREEN & MOTION TIMINGS JSON

```json
{
  "screens": [
    {
      "id": "OT01-S001",
      "time_seconds": 0.0,
      "title": "Reviews from users • Purchase"
    },
    {
      "id": "OT01-S002",
      "time_seconds": 1.5,
      "title": "Apple StoreKit In-App Purchase Sheet"
    },
    {
      "id": "OT01-S003",
      "time_seconds": 3.0,
      "title": "Thank you for becoming OtterLife member"
    },
    {
      "id": "OT01-S004",
      "time_seconds": 6.0,
      "title": "Daily exclusive member rewards"
    },
    {
      "id": "OT01-S005",
      "time_seconds": 9.0,
      "title": "Choose a few simple healthy goal"
    },
    {
      "id": "OT01-S006",
      "time_seconds": 14.33,
      "title": "Start Streak!"
    },
    {
      "id": "OT01-S007",
      "time_seconds": 18.33,
      "title": "Meet Your Otter Baby"
    },
    {
      "id": "OT01-S008",
      "time_seconds": 22.0,
      "title": "Complete the goal and raise a baby otter"
    },
    {
      "id": "OT01-S009",
      "time_seconds": 24.33,
      "title": "Custom Pet Companion (Default State)"
    },
    {
      "id": "OT01-S010",
      "time_seconds": 33.33,
      "title": "Custom Pet Companion (Name Input Active)"
    },
    {
      "id": "OT01-S011",
      "time_seconds": 37.43,
      "title": "Call me Action Sheet"
    },
    {
      "id": "OT01-S012",
      "time_seconds": 42.4,
      "title": "Gender Selection Sheet"
    },
    {
      "id": "OT01-S013",
      "time_seconds": 46.0,
      "title": "Custom Pet Companion (Configured State)"
    },
    {
      "id": "OT01-S014",
      "time_seconds": 50.67,
      "title": "Your personal data is safe"
    },
    {
      "id": "OT01-S015",
      "time_seconds": 53.0,
      "title": "Weekly Review - Overview"
    },
    {
      "id": "OT01-S016",
      "time_seconds": 55.0,
      "title": "Weekly Review - Activity Summary"
    },
    {
      "id": "OT01-S017",
      "time_seconds": 57.0,
      "title": "Weekly Review - Drink Summary"
    },
    {
      "id": "OT01-S018",
      "time_seconds": 58.67,
      "title": "Share Review Card Preview"
    },
    {
      "id": "OT01-S019",
      "time_seconds": 62.6,
      "title": "Photo Library Access Permission Dialog"
    },
    {
      "id": "OT01-S020",
      "time_seconds": 69.03,
      "title": "iOS Native Share Sheet"
    },
    {
      "id": "OT01-S021",
      "time_seconds": 75.0,
      "title": "Today Dashboard (Initial State)"
    },
    {
      "id": "OT01-S022",
      "time_seconds": 80.67,
      "title": "Customize Partner (Re-entry)"
    },
    {
      "id": "OT01-S023",
      "time_seconds": 86.6,
      "title": "Generating Partner (AI Loading)"
    },
    {
      "id": "OT01-S024",
      "time_seconds": 92.0,
      "title": "Interactive Partner Chat (Message 1)"
    },
    {
      "id": "OT01-S025",
      "time_seconds": 98.0,
      "title": "Interactive Partner Chat (Message 2)"
    },
    {
      "id": "OT01-S026",
      "time_seconds": 103.33,
      "title": "Interactive Partner Chat (Message 3)"
    },
    {
      "id": "OT01-S027",
      "time_seconds": 107.93,
      "title": "Customize Partner Sheet Overlay"
    },
    {
      "id": "OT01-S028",
      "time_seconds": 111.0,
      "title": "Today Dashboard (Post-Partner Initialization)"
    },
    {
      "id": "OT01-S029",
      "time_seconds": 114.47,
      "title": "Add Widgets (Apple Watch)"
    },
    {
      "id": "OT01-S030",
      "time_seconds": 116.67,
      "title": "Customize (My Theme Dashboard)"
    },
    {
      "id": "OT01-S031",
      "time_seconds": 120.0,
      "title": "Watch Face Theme Gallery"
    },
    {
      "id": "OT01-S032",
      "time_seconds": 124.0,
      "title": "Cute Loopy Watch Face Detail"
    },
    {
      "id": "OT01-S033",
      "time_seconds": 126.83,
      "title": "Add Step Instruction Sheet"
    },
    {
      "id": "OT01-S034",
      "time_seconds": 136.93,
      "title": "OtterLife User Submission Agreement"
    },
    {
      "id": "OT01-S035",
      "time_seconds": 146.0,
      "title": "Fortune God Watch Face Detail"
    },
    {
      "id": "OT01-S036",
      "time_seconds": 151.33,
      "title": "Fun Sticker Complication Feature"
    },
    {
      "id": "OT01-S037",
      "time_seconds": 154.67,
      "title": "Set up or replace the sticker complication"
    },
    {
      "id": "OT01-S038",
      "time_seconds": 156.33,
      "title": "Fun Sticker (Top Left)"
    },
    {
      "id": "OT01-S039",
      "time_seconds": 159.33,
      "title": "Watch Connection Failure Alert"
    },
    {
      "id": "OT01-S040",
      "time_seconds": 165.63,
      "title": "Create New Custom Theme Builder (Blank)"
    },
    {
      "id": "OT01-S041",
      "time_seconds": 171.3,
      "title": "Create New Custom Theme Builder (Typing Summer)"
    },
    {
      "id": "OT01-S042",
      "time_seconds": 176.67,
      "title": "iOS System Photo Picker Modal"
    },
    {
      "id": "OT01-S043",
      "time_seconds": 179.17,
      "title": "Create New Custom Theme Builder (Title Set)"
    }
  ],
  "motions": [
    {
      "id": "OT01-M001",
      "time_seconds": 1.2,
      "duration_ms": 400.0,
      "description": "Apple In-App Purchase Sheet presentation sliding up from bottom"
    },
    {
      "id": "OT01-M002",
      "time_seconds": 2.53,
      "duration_ms": 433.3,
      "description": "Apple StoreKit purchase success checkmark animation and sheet dismissal"
    },
    {
      "id": "OT01-M003",
      "time_seconds": 2.97,
      "duration_ms": 233.3,
      "description": "Member welcome celebration modal pop-in and scale expansion"
    },
    {
      "id": "OT01-M004",
      "time_seconds": 5.6,
      "duration_ms": 400.0,
      "description": "Member welcome modal scale contraction and dismissal on Confirm tap"
    },
    {
      "id": "OT01-M005",
      "time_seconds": 8.8,
      "duration_ms": 266.7,
      "description": "Horizontal push transition from Free Trial screen to Goals Selection"
    },
    {
      "id": "OT01-M006",
      "time_seconds": 10.3,
      "duration_ms": 133.3,
      "description": "Health goal list item selection toggle checkmark scale bounce"
    },
    {
      "id": "OT01-M007",
      "time_seconds": 14.0,
      "duration_ms": 566.7,
      "description": "Navigation stack push transition to Start Streak challenge screen"
    },
    {
      "id": "OT01-M008",
      "time_seconds": 16.5,
      "duration_ms": 700.0,
      "description": "Streak day selector pill sliding transition from 1 to 3 days"
    },
    {
      "id": "OT01-M009",
      "time_seconds": 18.0,
      "duration_ms": 533.3,
      "description": "Navigation push to Meet Your Otter Baby intro screen"
    },
    {
      "id": "OT01-M010",
      "time_seconds": 19.2,
      "duration_ms": 2300.0,
      "description": "Continuous mascot floating pulse and speech bubble oscillation loop"
    },
    {
      "id": "OT01-M011",
      "time_seconds": 21.8,
      "duration_ms": 433.3,
      "description": "Push transition to Complete Goal and Raise Otter screen with staggered entrance"
    },
    {
      "id": "OT01-M012",
      "time_seconds": 22.5,
      "duration_ms": 1300.0,
      "description": "Calorie goal progress bar fill and number count-up animation"
    },
    {
      "id": "OT01-M013",
      "time_seconds": 24.0,
      "duration_ms": 566.7,
      "description": "Navigation push to Custom Pet Companion screen"
    },
    {
      "id": "OT01-M014",
      "time_seconds": 33.33,
      "duration_ms": 166.7,
      "description": "iOS virtual keyboard slide up on pet name field focus"
    },
    {
      "id": "OT01-M015",
      "time_seconds": 34.0,
      "duration_ms": 2500.0,
      "description": "Pet name text field backspace and character typing sequence for 'moon'"
    },
    {
      "id": "OT01-M016",
      "time_seconds": 37.43,
      "duration_ms": 166.7,
      "description": "Call me preset bottom sheet slide up"
    },
    {
      "id": "OT01-M017",
      "time_seconds": 38.83,
      "duration_ms": 300.0,
      "description": "Selection of 'mom' in Call me sheet and sheet dismissal"
    },
    {
      "id": "OT01-M018",
      "time_seconds": 42.4,
      "duration_ms": 200.0,
      "description": "Gender selection bottom sheet presentation slide up"
    },
    {
      "id": "OT01-M019",
      "time_seconds": 45.63,
      "duration_ms": 500.0,
      "description": "Selection of 'Female' gender radio row and sheet dismiss downwards"
    },
    {
      "id": "OT01-M020",
      "time_seconds": 50.37,
      "duration_ms": 433.3,
      "description": "Navigation push to Your Personal Data is Safe privacy screen"
    },
    {
      "id": "OT01-M021",
      "time_seconds": 52.57,
      "duration_ms": 333.3,
      "description": "Privacy screen crossfade transition to Weekly Review dashboard"
    },
    {
      "id": "OT01-M022",
      "time_seconds": 54.63,
      "duration_ms": 500.0,
      "description": "Weekly review horizontal carousel swipe from Overview to Activity Summary"
    },
    {
      "id": "OT01-M023",
      "time_seconds": 56.37,
      "duration_ms": 600.0,
      "description": "Weekly review horizontal carousel swipe from Activity to Drink Summary"
    },
    {
      "id": "OT01-M024",
      "time_seconds": 58.3,
      "duration_ms": 466.7,
      "description": "Navigation push to Share review card preview canvas"
    },
    {
      "id": "OT01-M025",
      "time_seconds": 62.6,
      "duration_ms": 300.0,
      "description": "Native iOS Photo Library permission alert spring pop-in"
    },
    {
      "id": "OT01-M026",
      "time_seconds": 64.0,
      "duration_ms": 300.0,
      "description": "Photo Library permission alert dismissal on Allow Access tap"
    },
    {
      "id": "OT01-M027",
      "time_seconds": 69.03,
      "duration_ms": 433.3,
      "description": "Native iOS Share Sheet slide up presentation"
    },
    {
      "id": "OT01-M028",
      "time_seconds": 72.6,
      "duration_ms": 233.3,
      "description": "Native iOS Share Sheet downward dismissal"
    },
    {
      "id": "OT01-M029",
      "time_seconds": 74.33,
      "duration_ms": 466.7,
      "description": "Navigation stack pop back from Share screen to Today dashboard"
    },
    {
      "id": "OT01-M030",
      "time_seconds": 80.33,
      "duration_ms": 466.7,
      "description": "Navigation push to re-enter Customize Partner setup flow"
    },
    {
      "id": "OT01-M031",
      "time_seconds": 86.6,
      "duration_ms": 4900.0,
      "description": "AI Partner generation full-screen rotating pulse and 3-step checklist sequence"
    },
    {
      "id": "OT01-M032",
      "time_seconds": 91.77,
      "duration_ms": 1733.3,
      "description": "Otter partner mascot stage entrance and speech bubble 1 typing reveal"
    },
    {
      "id": "OT01-M033",
      "time_seconds": 97.67,
      "duration_ms": 466.7,
      "description": "Speech bubble 2 transition on tap with mascot eye blink reaction"
    },
    {
      "id": "OT01-M034",
      "time_seconds": 103.0,
      "duration_ms": 600.0,
      "description": "Speech bubble 3 transition with heart eye expression and particle animation"
    },
    {
      "id": "OT01-M035",
      "time_seconds": 107.63,
      "duration_ms": 466.7,
      "description": "Partner settings sheet overlay presentation from top-right gear icon"
    },
    {
      "id": "OT01-M036",
      "time_seconds": 110.0,
      "duration_ms": 466.7,
      "description": "Partner settings sheet downward dismiss and return to Today dashboard"
    },
    {
      "id": "OT01-M037",
      "time_seconds": 114.0,
      "duration_ms": 533.3,
      "description": "Navigation push from Today banner to Add Widgets Apple Watch screen"
    },
    {
      "id": "OT01-M038",
      "time_seconds": 116.33,
      "duration_ms": 466.7,
      "description": "Navigation push to Customize watch face dashboard"
    },
    {
      "id": "OT01-M039",
      "time_seconds": 118.63,
      "duration_ms": 500.0,
      "description": "Navigation push to Theme gallery catalog screen"
    },
    {
      "id": "OT01-M040",
      "time_seconds": 123.57,
      "duration_ms": 500.0,
      "description": "Navigation push to Cute Loopy watch face detail canvas"
    },
    {
      "id": "OT01-M041",
      "time_seconds": 126.6,
      "duration_ms": 233.3,
      "description": "Add Step watch installation instruction bottom sheet slide up"
    },
    {
      "id": "OT01-M042",
      "time_seconds": 128.43,
      "duration_ms": 366.7,
      "description": "Add Step instruction bottom sheet dismissal"
    },
    {
      "id": "OT01-M043",
      "time_seconds": 132.0,
      "duration_ms": 800.0,
      "description": "Interactive edge swipe navigation pop back to Theme catalog"
    },
    {
      "id": "OT01-M044",
      "time_seconds": 136.6,
      "duration_ms": 333.3,
      "description": "Navigation push to OtterLife User Submission Agreement legal screen"
    },
    {
      "id": "OT01-M045",
      "time_seconds": 141.47,
      "duration_ms": 2133.3,
      "description": "Vertical touch drag and inertial momentum scroll through legal agreement document"
    },
    {
      "id": "OT01-M046",
      "time_seconds": 143.83,
      "duration_ms": 433.3,
      "description": "Navigation pop back from User Submission Agreement to Theme catalog"
    },
    {
      "id": "OT01-M047",
      "time_seconds": 145.8,
      "duration_ms": 466.7,
      "description": "Navigation push to Fortune God watch face detail canvas"
    },
    {
      "id": "OT01-M048",
      "time_seconds": 148.83,
      "duration_ms": 466.7,
      "description": "Navigation pop back from Fortune God detail to Customize screen"
    },
    {
      "id": "OT01-M049",
      "time_seconds": 150.9,
      "duration_ms": 466.7,
      "description": "Navigation push to Fun Sticker Complication Feature explainer"
    },
    {
      "id": "OT01-M050",
      "time_seconds": 155.0,
      "duration_ms": 700.0,
      "description": "Navigation push to sticker complication slot wireframe selector layout"
    },
    {
      "id": "OT01-M051",
      "time_seconds": 156.1,
      "duration_ms": 400.0,
      "description": "Top Left complication wireframe slot selection and push to slot customization"
    },
    {
      "id": "OT01-M052",
      "time_seconds": 159.03,
      "duration_ms": 666.7,
      "description": "Watch sync failed error alert modal scale pop-in"
    },
    {
      "id": "OT01-M053",
      "time_seconds": 162.0,
      "duration_ms": 1700.0,
      "description": "Failed alert dismiss on OK tap and sequential navigation pop back to Customize"
    },
    {
      "id": "OT01-M054",
      "time_seconds": 165.0,
      "duration_ms": 633.3,
      "description": "Navigation push to Create New custom theme builder form"
    },
    {
      "id": "OT01-M055",
      "time_seconds": 171.2,
      "duration_ms": 4800.0,
      "description": "Keyboard slide up and typing sequence for 'Summer' theme title"
    },
    {
      "id": "OT01-M056",
      "time_seconds": 176.0,
      "duration_ms": 3300.0,
      "description": "Native iOS Photo Picker sheet modal presentation on image upload tap and cancel dismissal"
    }
  ]
}
```
