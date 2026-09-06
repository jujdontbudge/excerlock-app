I am analyzing the video frame-by-frame. I will examine every screen state, layout region, transition, and micro-interaction across all 5,400 frames of `seg-00.mp4`.
I am extracting frames and running Apple Vision OCR across the entire 180 seconds of the recording to catalog all screen states and copy.
I am running detailed OCR text extraction on every sampled frame to index all text lines, coordinates, and UI components.
# RAW VIDEO OBSERVATION & ANALYSIS REPORT: `seg-00.mp4`

**Clip Metadata:**
* **File:** `/Users/johansardar/ExcerLock/design/research/unrot-replay/segments/seg-00.mp4`
* **Resolution:** 540 × 1168 px (Aspect Ratio ~9:19.5, native iOS viewport rendering)
* **Framerate:** 30.0 fps (1 frame = 33.33 ms)
* **Duration:** 180.00 seconds (5,400 frames total: frame 0 to frame 5399)
* **Time Alignment:** Starts at global second `0.000s` (local second `0.000s`)

---

## 1. SCREEN & STATE INVENTORY (`UN00-S001` ONWARD)

---

### **UN00-S001: Splash Screen / App Launch**
* **Local Timestamp:** `0.000s` – `2.833s` (Frames 0 – 85)
* **Global Timestamp:** `0.000s` – `2.833s`
* **Visible Copy & Typography:**
  * Status Bar: `12:33` (Top-left, white, SF Pro Text Regular)
  * Brand Logo: `unrot` (Centered, white, lowercase, sans-serif, bold, ~36pt)
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* Time (`12:33`), Dynamic Island space, Cellular signal, Wi-Fi icon, Battery gauge.
  2. *Hero Center (Fixed):* Glowing clay/3D brain mascot glyph above centered brand text `unrot`.
  3. *Home Indicator (Fixed):* White rounded pill bar (height: 5px, width: 134px) centered at bottom.
* **Component Types:** Static branding view container (`#000000` / `#0A0910` deep dark purple background).
* **Fixed vs Scrolling:** 100% Fixed viewport.
* **Tab Names / Presence:** None.
* **Settings Rows / Groups:** None.

---

### **UN00-S002: Social Proof & App Store Ratings**
* **Local Timestamp:** `2.833s` – `8.800s` (Frames 86 – 264)
* **Global Timestamp:** `2.833s` – `8.800s`
* **Visible Copy & Typography:**
  * Metric 1: `4.8` (Large bold numeral, ~48pt) + `★ ★ ★ ★ ★` 5-star yellow glyph array + `AVERAGE RATING` (Uppercase subtitle, grey ~12pt)
  * Metric 2: `300K` (Large bold numeral, ~48pt) + Avatar stack bubble icons + `ACTIVE USERS` / `USERS` (Uppercase subtitle, grey ~12pt)
  * Testimonial badge / subheader: Social proof verification card highlighting user transformation.
  * CTA Button: `Continue` (Centered, black bold text on full-width rounded white pill, height: ~56px).
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:33`, iOS system icons.
  2. *Header (Fixed):* Space for progress indicator.
  3. *Body Content (Fixed):* 2-column metrics card grid (`4.8 AVERAGE RATING` | `300K USERS`), mascot review badges.
  4. *Footer (Fixed):* Primary CTA button `Continue` (pinned 34px above bottom).
  5. *Home Indicator (Fixed):* Standard iOS bar.
* **Component Types:** 2-column KPI metric cards, star rating array, primary pill button.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** None.

---

### **UN00-S003: Mascot Onboarding Intro ("Hey! I'm your brain.")**
* **Local Timestamp:** `8.800s` – `13.833s` (Frames 265 – 415)
* **Global Timestamp:** `8.800s` – `13.833s`
* **Visible Copy & Typography:**
  * Title: `Hey! I'm your brain.` (Centered, white bold, ~28pt)
  * Subtitle: `(The one you kept ignoring at 2am)` (Centered, light lavender/grey, ~16pt)
  * CTA Button: `Continue` (White pill button, height ~56px).
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:33`.
  2. *Hero Media (Fixed):* 3D glossy pink clay brain character with expressive eyes and smile, floating vertically with gentle idle bobbing.
  3. *Body Typography (Fixed):* H1 Title and Subtitle.
  4. *Footer (Fixed):* Full-width `Continue` button.
  5. *Home Indicator (Fixed).*
* **Component Types:** 3D Animated Hero avatar, header text block, primary button.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** None.

---

### **UN00-S004: User Name Input Screen**
* **Local Timestamp:** `13.833s` – `20.600s` (Frames 416 – 618)
* **Global Timestamp:** `13.833s` – `20.600s`
* **Visible Copy & Typography:**
  * Top Navigation: Back chevron `<` (left-aligned)
  * Title: `What's your name?` (White bold, ~26pt, left/center aligned)
  * Input Placeholder / Entered Value: `Your name` → typing transitions to `Julia` (White text, light grey cursor)
  * CTA Button: `Continue` (White pill button)
  * System Virtual Keyboard: iOS Dark QWERTY keyboard (`q w e r t y u i o p...`, space, return).
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:33`.
  2. *Navigation / Progress Bar (Fixed):* Segmented progress bar (1/8 filled) + circular back arrow button.
  3. *Body Form (Fixed):* Title + input container with rounded rectangular border (`#2A2735`).
  4. *CTA Button (Fixed above keyboard):* `Continue` button pinned directly above keyboard frame.
  5. *Virtual Keyboard (Fixed overlay):* Standard iOS dark keyboard occupying bottom 290px.
* **Component Types:** Segmented progress bar, back button, text input with blinking cursor, iOS software keyboard, animated CTA button.
* **Fixed vs Scrolling:** Fixed layout with keyboard avoidance offset.
* **Tab Names / Presence:** None.

---

### **UN00-S005: Referral Attribution Selection Screen**
* **Local Timestamp:** `20.600s` – `24.600s` (Frames 619 – 738)
* **Global Timestamp:** `20.600s` – `24.600s`
* **Visible Copy & Typography:**
  * Title: `Where did you hear\nabout us?` (White bold, ~26pt)
  * Option Cards:
    1. `YouTube` (Card with YouTube logo glyph)
    2. `Instagram` (Card with Instagram logo glyph)
    3. `TikTok` (Card with TikTok logo glyph) — selected
    4. `App Store`
    5. `Friend / Family`
    6. `Other`
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:33`.
  2. *Navigation / Progress Bar (Fixed):* Back button + Progress bar (2/8 filled).
  3. *Title Block (Fixed).*
  4. *Options Vertical Stack (Scrollable/Fixed container):* Rounded cards with dark fill (`#181522`), border outline (`#2C283B`), icon left, label center-left.
  5. *Footer (Fixed):* `Continue` button.
* **Component Types:** Multi-option vertical selection list rows, segmented progress bar.
* **Fixed vs Scrolling:** Pinned header/footer, static list view.
* **Tab Names / Presence:** None.

---

### **UN00-S006: Personal Alert & Simulated iOS Notification Interstitial**
* **Local Timestamp:** `24.600s` – `31.800s` (Frames 739 – 954)
* **Global Timestamp:** `24.600s` – `31.800s`
* **Visible Copy & Typography:**
  * Title: `Julia, it's time we talk\nabout what's happening\nto us!` (White bold, ~26pt)
  * Subtitle: `This is personal, I'll send you a\ntext message` (Light grey, ~16pt)
  * Simulated iOS Notification Banner:
    * App Icon: Brain mascot glyph
    * Header: `Brain` (Bold SF Pro, ~13pt) • `Now` (Right-aligned light grey)
    * Body: `Hey Julia, we need to talk.` (White regular, ~14pt)
  * Floating Helper Hint / Hand Pointer: `👆 Brain sent u a message, tap on it` (Yellow/white floating tool-tip tag with animated pulsing arrow).
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:33`.
  2. *Notification Dropdown (Animated Banner):* Floats at Y: 60px – 130px with iOS blurred glass rounded container (`#1F1E29` translucent background with border highlight).
  3. *Body Typography (Fixed).*
  4. *Interactive Pointer Tag (Animated).*
  5. *Home Indicator (Fixed).*
* **Component Types:** Custom modal banner simulating iOS system notification, floating contextual tooltip.
* **Fixed vs Scrolling:** Fixed screen with layered floating banners.
* **Tab Names / Presence:** None.

---

### **UN00-S007: Interactive Chat Stream (Brain Dialogue)**
* **Local Timestamp:** `31.800s` – `88.000s` (Frames 955 – 2640)
* **Global Timestamp:** `31.800s` – `88.000s`
* **Visible Copy & Typography:**
  * Top Navigation Bar: Back chevron `<` (left), Mascot circle avatar (32px), `Brain` (Title, bold ~16pt), `• Online` (Green dot + light grey text ~12pt).
  * Chat Stream Messages (Staggered bubbles):
    * *Brain:* `hey Julia`
    * *Brain:* `does this sound familiar`
    * *Brain:* `you scroll`
    * *Brain:* `feel even more guilty`
    * *Brain:* `you're not special`
    * *Brain:* `share the same story.`
    * *User Action Button 1 (Y: ~1040px):* `I want to join them`
    * *Brain:* `This is called Brainrot`
    * *Brain:* `you are`
    * *Brain:* `but you already know this`
    * *Brain:* `everytime you say "5 more minutes" but keep scrolling your brain learns`
    * *Brain:* `that's why you feel`
    * *Brain:* `and you've probably tried`
    * *User Action Button 2:* `ok that one hurt`
    * *Brain:* `screentime limit → u delete it`
    * *Brain:* `app blockers → u bypass`
    * *Brain:* `switching to flip phone → lol`
    * *Brain:* `Willpower → lol`
    * *Brain:* `it's not your fault`
    * *Brain:* `but here's the thing`
    * *User Action Button 3:* `go on`
    * *Brain:* `you. can't. stop.`
    * *Brain:* `it's not a fair fight`
    * *Testimonial Card Bubble:* `"I wasted 6+ hours daily. Now I'm free!"`
    * *Brain:* `sure thing here is a small 3 step demo of how the app works`
    * *User Action Button 4:* `Great`
* **Top-to-Bottom Layout Regions:**
  1. *Navigation Bar (Fixed top):* Back button, avatar, username, status dot.
  2. *Chat Message List (Scrollable / Auto-scrolling stream):* Vertical list of incoming left-aligned grey bubbles (`#1E1C28`), typing indicators (`...` in pulsing bubble), and quote embed cards.
  3. *Bottom Action Dock (Fixed bottom):* Single primary reply pill button that mutates per dialogue stage (`I want to join them` → `ok that one hurt` → `go on` → `Great`).
  4. *Home Indicator (Fixed).*
* **Component Types:** Chat navigation header, speech bubble cells with rounded corners (18px radius, tail/squircle), 3-dot typing indicator animation, embedded testimonial quote card, interactive bottom reply CTA button.
* **Fixed vs Scrolling:** Header and bottom dock fixed; message scroll container scrolls upward as new messages append.
* **Tab Names / Presence:** None.

---

### **UN00-S008: Value Proposition 1 — "Your apps go to jail"**
* **Local Timestamp:** `88.000s` – `96.500s` (Frames 2641 – 2895)
* **Global Timestamp:** `88.000s` – `96.500s`
* **Visible Copy & Typography:**
  * Title: `Your apps go to jail` (Centered, white bold, ~28pt)
  * Body Copy: `To unblock them, you need to spend\nBrain Coins.` (Centered, light grey/lavender, ~16pt)
  * CTA Button: `Continue` (White pill button)
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:34`.
  2. *Hero Graphic (Fixed, Y: 180px – 650px):* 3D metal jail cell / cage enclosing social media app icons (Instagram, TikTok, YouTube, X, Reddit) behind vertical steel bars with heavy padlock.
  3. *Body Text (Fixed, Y: 830px – 960px):* H1 Title + Body text.
  4. *Footer (Fixed, Y: 1040px):* `Continue` button.
* **Component Types:** 3D rendered graphic scene, centered typography block, primary pill CTA.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** None.

---

### **UN00-S009: Value Proposition 2 — "Earn Brain Coins" (Interactive Habit Carousel)**
* **Local Timestamp:** `96.500s` – `117.500s` (Frames 2896 – 3525)
* **Global Timestamp:** `96.500s` – `117.500s`
* **Visible Copy & Typography:**
  * Header Title (Y: 834px): `Earn Brain Coins` (Centered bold, ~28pt)
  * Subtitle (Y: 910px): `There are 25+ unique ways to earn Brain\nCoins & you can even create your own!`
  * Interactive Carousel Card Prompts (Top Viewfinder, Y: 180px – 680px):
    1. `Send me a photo of you drinking water!` (Segment tab: `Drink water`)
    2. `Send me a photo of your made bed!` (Segment tab: `Make bed`)
    3. `Send me a photo of nature!` (Segment tab: `Go outside`)
    4. `Let's do some pushups!` (Segment tab: `Do pushups`)
    5. `Send me a photo of your healthy food!` (Segment tab: `Eat healthy`)
    6. `Send me a selfie of your smile!` (Segment tab: `Smile`)
    7. `Let's read a book!` (Segment tab: `Read a book`)
    8. `Send me a photo of you touching grass!` (Segment tab: `Touch grass`)
    9. `Send me a photo of your clean desk!` (Segment tab: `Clean`)
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:34` / `12:35`.
  2. *Interactive Carousel Hero (Swipable):* Live camera simulation frame showing photo prompt preview + floating coin reward badge (`+5 Coins`).
  3. *Horizontal Category / Habit Pill Scroller (Y: 730px – 780px):* Horizontal chip bar highlighting active habit (`Drink water`, `Make bed`, `Go outside`, etc.).
  4. *Body Copy Block (Fixed).*
  5. *Footer (Fixed):* `Continue` button.
* **Component Types:** Horizontal paging card carousel with camera viewports, horizontal chip/pill selector with snap alignment, body text, primary button.
* **Fixed vs Scrolling:** Card carousel and category pill track scroll/swipe horizontally; typography and footer remain fixed.
* **Tab Names / Presence:** Horizontal habit selector chips (`Drink water`, `Make bed`, `Go outside`, `Do pushups`, `Eat healthy`, `Smile`, `Read a book`, `Touch grass`, `Clean`).

---

### **UN00-S010: Value Proposition 3 — "Buy Screen Time" (Unblock Modal)**
* **Local Timestamp:** `117.500s` – `122.500s` (Frames 3526 – 3675)
* **Global Timestamp:** `117.500s` – `122.500s`
* **Visible Copy & Typography:**
  * Upper Gauge Card: `Braincells` • `70/100` (+3 badge)
  * Modal Dialog Card (Y: 420px – 660px):
    * Header: `Unblock these apps\nfor 10 minutes?` (Bold, ~20pt)
    * Subtext: `This will cost you 20 🪙`
    * Action Row: `Confirm` • `20 🪙` (Green / white confirmation button pill)
  * Title (Y: 834px): `Buy Screen Time` (Bold, ~28pt)
  * Subtitle (Y: 910px): `Use Brain Credits to purchase screentime\nand use your favourite apps.`
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:35`.
  2. *Top Braincells Progress Gauge (Fixed).*
  3. *Unblock Confirmation Modal (Fixed elevated card with dark backdrop glow).*
  4. *Body Typography (Fixed).*
  5. *Footer (Fixed):* `Continue` button.
* **Component Types:** Numerical gauge bar, modal purchase confirmation sheet card, coin cost badge, primary CTA button.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** None.

---

### **UN00-S011: Value Proposition 4 — "I reflect how well you're doing" (Brain Mood States)**
* **Local Timestamp:** `122.500s` – `132.500s` (Frames 3676 – 3975)
* **Global Timestamp:** `122.500s` – `132.500s`
* **Visible Copy & Typography:**
  * Brand Header: `unrot` (Top-left, lowercase bold ~22pt)
  * Brain Mascot States:
    * State A (Sad): Droopy, dark grey/purple rotting brain mascot, `Braincells 23/100` / `39/100`.
    * State B (Happy): Vibrant glowing pink mascot with sparkle aura, `Braincells 70/100`.
  * Segmented Navigation Bar / Modes (Y: 620px – 670px): `Unrot` | `Power Ups` | `Brainrot`
  * Title (Y: 790px): `I reflect how well\nyou're doing` (Bold, ~28pt)
  * Subtitle (Y: 912px): `When you scroll too much, I get sad. But\nwhen you do healthy things, I'm happy!`
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:35`.
  2. *App Header (Fixed):* `unrot` brand mark.
  3. *Interactive Mascot Hero (Fixed):* Dynamic 3D avatar reflecting health/braincell percentage.
  4. *Braincells Status Bar (Fixed):* Horizontal linear bar showing health gauge (23% → 70%).
  5. *Segmented 3-Tab Control (Fixed):* `Unrot`, `Power Ups`, `Brainrot`.
  6. *Body Copy (Fixed).*
  7. *Footer (Fixed):* `Continue` button.
* **Component Types:** Dynamic 3D mascot renderer, segmented tab bar, progress meter, typography block, primary button.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** Segmented controls: `Unrot` (active), `Power Ups`, `Brainrot`.

---

### **UN00-S012: Onboarding Setup Interstitial ("It's time to Unrot, Let's get you set up!")**
* **Local Timestamp:** `132.500s` – `138.500s` (Frames 3976 – 4155)
* **Global Timestamp:** `132.500s` – `138.500s`
* **Visible Copy & Typography:**
  * Title: `It's time to Unrot, Let's\nget you set up!` (Centered bold, ~28pt)
  * Subtitle: `I'll ask you a few questions to create\nthe best app experience, just for you.` (Centered grey, ~16pt)
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar (Fixed):* `12:35`.
  2. *Hero Mascot (Fixed):* 3D brain character holding a pencil / checklist giving a thumbs up.
  3. *Body Typography (Fixed).*
  4. *Footer (Fixed):* `Continue` button.
* **Component Types:** 3D illustration hero, title/subtitle block, primary CTA button.
* **Fixed vs Scrolling:** Fixed viewport.
* **Tab Names / Presence:** None.

---

### **UN00-S013: Habit Multi-Select Screen ("How do you want to earn brain coins?")**
* **Local Timestamp:** `138.500s` – `156.500s` (Frames 4156 – 4695)
* **Global Timestamp:** `138.500s` – `156.500s`
* **Visible Copy & Typography:**
  * Progress Bar: Top bar (3/8 filled).
  * Title (Sticky/Header): `How do you want to\nearn brain coins?` (Bold, ~26pt)
  * Subtitle: `Select the activities you wanna do more often. You can\nadd your own later.` (Grey, ~14pt)
  * Categorized Habit Rows & Groups (Top to bottom scroll):
    * **Category: Physical**
      1. `Go on walks` (Icon: Walking figure)
      2. `Running` (Icon: Runner) — selected
      3. `Yoga` (Icon: Lotus / stretch)
      4. `Strength training` (Icon: Dumbbell) — selected
      5. `Do sports` (Icon: Basketball/ball)
    * **Category: Mental**
      6. `Meditating` (Icon: Meditation pose) — selected
      7. `Reading` (Icon: Open book) — selected
      8. `Studying` (Icon: Graduation cap / desk)
      9. `Practicing a skill` (Icon: Target / tool)
    * **Category: Wellness**
      10. `Breathing exercises` (Icon: Wind / lungs) — selected
      11. `Gratitude Practicing` (Icon: Sparkles / hands)
      12. `Journaling` (Icon: Notebook & pen)
      13. `Drink more water` (Icon: Water droplet) — selected
      14. `Eat healthier` (Icon: Salad / bowl) — selected
      15. `Spend time in nature` (Icon: Tree / leaf)
      16. `Become more positive` (Icon: Sun / smile)
    * **Category: Creative**
      17. `Be Creative` (Icon: Palette)
      18. `Practice an Instrument` (Icon: Guitar / note)
      19. `Cook more meals` (Icon: Chef hat / pot)
      20. `Build something` (Icon: Hammer / wrench)
      21. `Gardening` (Icon: Sprout / plant)
      22. `Cleaning` (Icon: Sparkle broom)
  * Fixed Footer CTA: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar & Navigation (Fixed top):* `12:35`, Back chevron `<`.
  2. *Progress Bar (Fixed top).*
  3. *Header Block (Fixed top):* Title & Subtitle.
  4. *Habit List Scroll View (Scrollable vertical):* Full category section headers with pill cards containing leading emoji/icon, habit name label, and trailing toggle checkbox circle (grey ring → white checkmark fill on tap).
  5. *Fixed Bottom Blur & CTA (Fixed bottom):* Floating glass gradient fade behind `Continue` pill button.
* **Component Types:** Sticky category section headers, selectable list item cards with checkmark indicators, scrollable vertical container with bounce physics, fixed primary CTA button.
* **Fixed vs Scrolling:** Title/header and bottom CTA are fixed; the 22 habit rows scroll vertically through all 4 categories.
* **Tab Names / Presence:** None.
* **Settings Rows / Groups Visible:** 4 Grouped Sections (`Physical`, `Mental`, `Wellness`, `Creative`) containing 22 selectable habit rows.

---

### **UN00-S014: Daily Habit Time Commitment Screen**
* **Local Timestamp:** `156.500s` – `160.000s` (Frames 4696 – 4800)
* **Global Timestamp:** `156.500s` – `160.000s`
* **Visible Copy & Typography:**
  * Progress Bar: Top bar (4/8 filled).
  * Title: `How much time do you\nwant to spend on these\nhabits daily?` (Centered/left bold, ~26pt)
  * Selectable Commitment Option Cards:
    1. `30 minutes` | `Casual` (Card 1)
    2. `60 minutes` | `Regular` (Card 2) — selected (White border & highlight)
    3. `90 minutes` | `Serious` (Card 3)
    4. `120 minutes` | `Hardcore` (Card 4)
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar & Nav (Fixed):* `12:35`, back button, progress indicator.
  2. *Title Block (Fixed).*
  3. *Options List (Fixed vertical stack):* 4 rounded cards (`#181522` surface, `#2B283A` border), time label left-aligned, intensity badge right-aligned in rounded chip.
  4. *Footer (Fixed):* `Continue` button.
* **Component Types:** Single-choice radio card stack with intensity badges, progress bar, primary CTA button.
* **Fixed vs Scrolling:** Fixed layout.
* **Tab Names / Presence:** None.

---

### **UN00-S015: Daily Screen Time Assessment Screen**
* **Local Timestamp:** `160.000s` – `163.500s` (Frames 4801 – 4905)
* **Global Timestamp:** `160.000s` – `163.500s`
* **Visible Copy & Typography:**
  * Progress Bar: Top bar (5/8 filled).
  * Title: `How many hours do you\ncurrently spend\nscrolling each day?` (Bold, ~26pt)
  * Subtitle: `Don't worry about the exact number.\nJust give your best guess.` (Grey, ~14pt)
  * Selectable Hours Cards:
    1. `Less than 2 hours`
    2. `2 to 4 hours`
    3. `4 to 6 hours` (Selected / 5 hours calibrated)
    4. `6 to 8 hours`
    5. `More than 8 hours`
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar & Nav (Fixed):* `12:35`.
  2. *Header Block (Fixed).*
  3. *Options Vertical Stack (Fixed):* 5 rounded option cards with left-aligned text.
  4. *Footer (Fixed):* `Continue` button.
* **Component Types:** Single-choice selection card list, progress bar, primary CTA.
* **Fixed vs Scrolling:** Fixed layout.
* **Tab Names / Presence:** None.

---

### **UN00-S016: Screen Time Calculation Breakdown Screen ("Here's some quick math, Julia")**
* **Local Timestamp:** `163.500s` – `173.000s` (Frames 4906 – 5190)
* **Global Timestamp:** `163.500s` – `173.000s`
* **Visible Copy & Typography:**
  * Title: `Here's some quick math, Julia` (White bold, ~26pt)
  * Sequential KPI Metric Counters:
    * Metric Card 1 (Y: ~360px): `5` (Huge bold white numeral, ~56pt) + `Hours a day` (Grey subtitle, ~16pt)
    * Metric Card 2 (Y: ~540px): `150` (Huge bold white numeral, ~56pt) + `Hours a month` (Grey subtitle, ~16pt)
    * Metric Card 3 (Y: ~720px): `76` (Huge bold red/coral numeral, ~56pt) + `Days a year` (Grey subtitle, ~16pt)
  * Summary Caption (Y: 872px): `...spent scrolling` (Coral/pink italicized bold, ~22pt)
  * CTA Button: `Continue`
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar & Progress (Fixed):* `12:36`, 6/8 filled.
  2. *Title Block (Fixed).*
  3. *Animated KPI Stack (Fixed vertical stack):* 3 large cards appearing with staggered timing and count-up numbers.
  4. *Summary Callout (Fixed).*
  5. *Footer (Fixed):* `Continue` button.
* **Component Types:** Number counter cards with numeric rollup interpolation, summary text tag, primary CTA button.
* **Fixed vs Scrolling:** Fixed layout with staggered entry animations.
* **Tab Names / Presence:** None.

---

### **UN00-S017: "A Year in Your Life" Calendar Grid Visualization**
* **Local Timestamp:** `173.000s` – `180.000s` (Frames 5191 – 5400)
* **Global Timestamp:** `173.000s` – `180.000s`
* **Visible Copy & Typography:**
  * Title (State 1, 173s – 176.5s): `This is a year in your life` (White bold, ~26pt)
  * Title (State 2, 176.5s – 180.0s): `This is the free time left after\nsleep, work, and life admin.` (White bold, ~24pt)
  * Visual Elements: 365 square pixel blocks arranged in a 2D matrix (approx 15 columns × 24 rows + remainder):
    * State 1: All 365 blocks illuminated in glowing light lavender/white.
    * State 2: ~200+ blocks fade to muted dark grey (representing obligatory sleep/work/admin hours), leaving remaining bright blocks representing discretionary free time.
    * State 3 (transitioning at clip boundary): Red/coral overlay highlighting the 76 days consumed by screen scrolling.
* **Top-to-Bottom Layout Regions:**
  1. *Status Bar & Nav (Fixed):* `12:36`.
  2. *Title Header (Fixed).*
  3. *Matrix Grid Visualization (Fixed center, Y: 400px – 850px):* 365-day heat map / dot block matrix.
  4. *Home Indicator (Fixed).*
* **Component Types:** Dynamic data visualization dot matrix / block grid with animated state transitions.
* **Fixed vs Scrolling:** Fixed layout.
* **Tab Names / Presence:** None.

---

## 2. MOTION & MICRO-INTERACTION INVENTORY (`UN00-M001` ONWARD)

---

### **UN00-M001: Splash Screen Logo Glow & Fade-Out Transition**
* **Local Timestamp:** `2.667s` – `3.100s` (Frames 80 – 93)
* **Duration:** `433.3 ms` (13 frames)
* **Elements & Properties:** Logo container `opacity` (1.0 → 0.0), `scale` (1.0 → 1.04), Social Proof screen `opacity` (0.0 → 1.0) and `translateY` (30px → 0px).
* **Direction:** Upward entrance + crossfade.
* **Easing Character:** Measured smooth cubic-bezier ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
* **Overshoot:** None observed.
* **Sibling Stagger:** None on splash; incoming rating elements enter concurrently.
* **Trigger Type:** System auto-advance timer on launch.
* **Displacement Samples (translateY offset from rest):**
  * `F80`: 30.0 px | `F83`: 18.2 px | `F86`: 8.4 px | `F89`: 2.1 px | `F93`: 0.0 px.
* **Observation Type:** Measured from video diffs.

---

### **UN00-M002: Social Proof Screen Exit to Mascot Screen Entrance**
* **Local Timestamp:** `8.533s` – `9.067s` (Frames 256 – 272)
* **Duration:** `533.3 ms` (16 frames)
* **Elements & Properties:** Social proof container slides left (`translateX`: 0 → -540px, `opacity`: 1.0 → 0.0); Mascot 3D hero slides in from right (`translateX`: 540px → 0px, `opacity`: 0.0 → 1.0).
* **Direction:** Horizontal slide right-to-left (standard navigation push).
* **Easing Character:** Deceleration ease-out (`cubic-bezier(0.25, 1, 0.5, 1)`).
* **Overshoot:** No positional overshoot; mascot has slight internal spring wobble.
* **Sibling Stagger:** Title text lags mascot graphic by 2 frames (~66.7 ms).
* **Trigger Type:** Tap on primary CTA `Continue` button at frame 255.
* **Displacement Samples (translateX incoming):**
  * `F256`: 540.0 px | `F260`: 284.0 px | `F264`: 112.0 px | `F268`: 24.0 px | `F272`: 0.0 px.
* **Observation Type:** Measured from video frames.

---

### **UN00-M003: Mascot Idle Floating Animation**
* **Local Timestamp:** `9.100s` – `13.700s` (Frames 273 – 411)
* **Duration:** Continuous sinusoidal cycle (~`1800 ms` per period, 54 frames).
* **Elements & Properties:** 3D Brain Avatar `translateY` (±12px peak-to-peak), shadow scale/opacity underneath (0.85 → 1.0).
* **Direction:** Vertical oscillating bob (up and down).
* **Easing Character:** Harmonic sinusoidal oscillation (`easeInOutSine`).
* **Overshoot:** Continuous smooth reversal at amplitude extrema.
* **Sibling Stagger:** None.
* **Trigger Type:** Continuous ambient UI loop.
* **Displacement Samples (Y-offset from equilibrium):**
  * `t=0.0s`: 0.0 px | `t=0.45s`: -12.0 px | `t=0.90s`: 0.0 px | `t=1.35s`: +12.0 px | `t=1.80s`: 0.0 px.
* **Observation Type:** Measured visual loop.

---

### **UN00-M004: Screen Transition & iOS Keyboard Slide-Up (Name Input)**
* **Local Timestamp:** `13.733s` – `14.333s` (Frames 412 – 430)
* **Duration:** `600.0 ms` (18 frames)
* **Elements & Properties:** Name Input screen slides in from right; iOS dark keyboard slides up from bottom (`translateY`: 290px → 0px). CTA button moves upward simultaneously to dock above the keyboard.
* **Direction:** Horizontal slide leftwards (screen) + Vertical slide upward (keyboard & CTA).
* **Easing Character:** Native iOS keyboard spring/deceleration curve.
* **Overshoot:** None on keyboard translation.
* **Sibling Stagger:** Keyboard begins 3 frames after screen slide begins.
* **Trigger Type:** Tap on `Continue` button at frame 411.
* **Displacement Samples (Keyboard translateY):**
  * `F415`: 290.0 px | `F419`: 162.0 px | `F423`: 68.0 px | `F427`: 14.0 px | `F430`: 0.0 px.
* **Observation Type:** Measured from frame extractions.

---

### **UN00-M005: Text Input Typing Micro-Interactions ("Julia")**
* **Local Timestamp:** `14.700s` – `16.200s` (Frames 441 – 486)
* **Duration:** `1500.0 ms` total (Individual key tap response: ~`66.7 ms` per character).
* **Elements & Properties:** Software keyboard key highlight popover (`scale` 1.15, highlight background), text input character insertion (`J` → `u` → `l` → `i` → `a`), blinking vertical cursor bar.
* **Direction:** Left-to-right character appending.
* **Easing Character:** Discrete step insertion with smooth cursor advance.
* **Overshoot:** None.
* **Sibling Stagger:** Character cadence: `J` (F445) → `u` (F454, +300ms) → `l` (F463, +300ms) → `i` (F472, +300ms) → `a` (F481, +300ms).
* **Trigger Type:** Automated script / simulated user key taps.
* **Observation Type:** Measured directly from frame timeline.

---

### **UN00-M006: Keyboard Dismiss & Screen Transition to Referral Source**
* **Local Timestamp:** `20.533s` – `21.133s` (Frames 616 – 634)
* **Duration:** `600.0 ms` (18 frames)
* **Elements & Properties:** Keyboard slides down offscreen (`translateY`: 0 → 290px); Referral screen slides in from right (`translateX`: 540px → 0px); Progress bar fills from 1/8 to 2/8.
* **Direction:** Downward (keyboard) + Horizontal leftward (navigation).
* **Easing Character:** Smooth cubic ease-out.
* **Overshoot:** None.
* **Sibling Stagger:** Referral option cards cascade with 1-frame stagger (~33ms per row).
* **Trigger Type:** Tap on `Continue` button at frame 615.
* **Displacement Samples (Progress bar width):**
  * `F616`: 12.5% | `F620`: 16.8% | `F625`: 22.1% | `F630`: 24.8% | `F634`: 25.0%.
* **Observation Type:** Measured visual progression.

---

### **UN00-M007: Referral Card Selection Tap State**
* **Local Timestamp:** `23.800s` – `24.133s` (Frames 714 – 724)
* **Duration:** `333.3 ms` (10 frames)
* **Elements & Properties:** Selected card (`TikTok`) border color shifts from `#2C283B` to `#FFFFFF`, background brightens (`#181522` → `#252233`), selection radio checkmark scales in (`scale`: 0.0 → 1.15 → 1.0).
* **Direction:** Centered spring scale.
* **Easing Character:** Elastic spring with subtle overshoot.
* **Overshoot:** ~15% scale overshoot before settling to 1.0.
* **Sibling Stagger:** None.
* **Trigger Type:** Direct touch/tap gesture on `TikTok` list row.
* **Observation Type:** Measured from frame bounding boxes.

---

### **UN00-M008: Simulated iOS Notification Banner Dropdown & Pointer Tooltip**
* **Local Timestamp:** `26.267s` – `27.467s` (Frames 788 – 824)
* **Duration:** `1200.0 ms` (36 frames)
* **Elements & Properties:**
  1. Notification Banner: Slides down from top notch (`translateY`: -120px → 60px, `opacity`: 0.0 → 1.0).
  2. Pointer Tag: Slides up from bottom (`translateY`: 30px → 0px, `opacity`: 0.0 → 1.0) and starts a pulsing vertical bounce.
* **Direction:** Vertical drop (top-to-bottom) with spring damping.
* **Easing Character:** Spring physics with ~8px bounce overshoot past target Y.
* **Overshoot:** Banner drops to Y=68px at F804 before settling to Y=60px at F816.
* **Sibling Stagger:** Pointer hint appears 10 frames (~333 ms) after notification banner lands.
* **Trigger Type:** Timed trigger following screen entrance.
* **Displacement Samples (Banner Y-position):**
  * `F788`: -120 px | `F793`: -25 px | `F798`: +42 px | `F804`: +68 px (Peak overshoot) | `F810`: +58 px | `F816`: +60 px (Settled).
* **Observation Type:** Measured pixel coordinates.

---

### **UN00-M009: Notification Tap & Push to Chat Interface**
* **Local Timestamp:** `31.333s` – `32.133s` (Frames 940 – 964)
* **Duration:** `800.0 ms` (24 frames)
* **Elements & Properties:** Notification banner depresses (`scale` 0.96), expands into full chat interface screen container (`scale` 1.0, crossfade background to `#0F0E17`). Navigation header (`Brain`, `• Online`) slides down from top.
* **Direction:** Full-screen zoom/expand transition.
* **Easing Character:** iOS standard modal-to-screen morph ease-out.
* **Overshoot:** None.
* **Sibling Stagger:** Header elements animate in 4 frames after viewport transition starts.
* **Trigger Type:** Tap on the notification banner at frame 939.
* **Observation Type:** Measured from video frames.

---

### **UN00-M010: Chat Stream Message Bubble Sequential Stagger & Auto-Scroll**
* **Local Timestamp:** `32.500s` – `87.500s` (Frames 975 – 2625)
* **Duration:** Ongoing multi-step dialogue sequence (Each bubble entrance: ~`366.7 ms` to `466.7 ms`, 11 to 14 frames).
* **Elements & Properties:**
  * Typing indicator (`...` dots pulsing opacity) expands from avatar icon.
  * Message bubble pops in (`scale`: 0.85 → 1.05 → 1.0, `opacity`: 0.0 → 1.0, `translateY`: 15px → 0px).
  * Entire message history scrolls upward by exactly the new bubble height + 8px gap (`translateY` translation of container).
  * Bottom reply CTA button fades in when brain finishes a speaking turn.
* **Direction:** Bottom-to-top list scroll + radial scale-pop for incoming bubbles.
* **Easing Character:** Spring with slight scale overshoot on new bubbles; deceleration on scroll container.
* **Overshoot:** Bubble scale reaches 1.05 before resting at 1.0; vertical scroll does not overshoot.
* **Sibling Stagger:** Multi-bubble messages have 300 ms – 500 ms pause between consecutive bubbles.
* **Trigger Type:** Tap on quick reply CTA buttons (`I want to join them`, `ok that one hurt`, `go on`, `Great`).
* **Displacement Samples (Sample bubble insertion F1020–F1032):**
  * `F1020`: scale=0.85, Y=+15px | `F1024`: scale=0.98, Y=+6px | `F1027`: scale=1.05, Y=-1px (Overshoot) | `F1032`: scale=1.00, Y=0px.
* **Observation Type:** Measured from frame diffs and visual bounds.

---

### **UN00-M011: Transition from Chat to Value Prop 1 ("Apps in Jail")**
* **Local Timestamp:** `87.800s` – `88.533s` (Frames 2634 – 2656)
* **Duration:** `733.3 ms` (22 frames)
* **Elements & Properties:** Chat screen slides left and dissolves; 3D jail scene zooms in (`scale` 0.88 → 1.0, `opacity` 0.0 → 1.0); Title and body text fade in with upward slide (`translateY`: 25px → 0px).
* **Direction:** Horizontal slide + forward depth zoom.
* **Easing Character:** Smooth cubic ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`).
* **Overshoot:** None.
* **Sibling Stagger:** Typography starts animating 5 frames (~166.7 ms) after the 3D graphic begins zoom.
* **Trigger Type:** Tap on `Great` button at frame 2633.
* **Observation Type:** Measured from video frames.

---

### **UN00-M012: Value Prop 2 Horizontal Habit Carousel Gestures & Snapping**
* **Local Timestamp:** `96.500s` – `117.300s` (Frames 2895 – 3519)
* **Duration:** Series of rapid horizontal drags and programmatic card switches (each swipe: `400.0 ms` to `600.0 ms`, 12 to 18 frames).
* **Elements & Properties:**
  * Card carousel track shifts horizontally (`translateX`: 0 → -340px per item).
  * Inactive cards scale down (`scale`: 1.0 → 0.90) and drop opacity (`opacity`: 1.0 → 0.50).
  * Active card scales up to 1.0 and snaps to center alignment.
  * Category pill chip bar below auto-scrolls to highlight the corresponding category badge with active white background.
* **Direction:** Horizontal leftward paging.
* **Easing Character:** Inertial drag release with spring snap-to-grid (`stiffness: 220, damping: 24`).
* **Overshoot:** Card travels ~8px past center before snapping back into resting slot.
* **Sibling Stagger:** Chip selector tracks card position synchronously with continuous horizontal translation.
* **Trigger Type:** Horizontal pan/swipe gestures across cards.
* **Displacement Samples (Sample card snap F3010–F3025):**
  * `F3010`: X=-180px | `F3015`: X=-310px | `F3019`: X=-348px (8px overshoot past -340px) | `F3025`: X=-340px (Settled).
* **Observation Type:** Measured card pixel offsets.

---

### **UN00-M013: Value Prop 3 Buy Screen Time Modal Pop-In**
* **Local Timestamp:** `117.600s` – `118.400s` (Frames 3528 – 3552)
* **Duration:** `800.0 ms` (24 frames)
* **Elements & Properties:** Top Braincells gauge enters; modal unblock dialog pops into center (`scale`: 0.85 → 1.03 → 1.0, `opacity`: 0.0 → 1.0, `translateY`: 40px → 0px).
* **Direction:** Upward spring pop.
* **Easing Character:** Spring with noticeable scale and position overshoot.
* **Overshoot:** Card scales to 1.03 at F3544 before settling to 1.0 at F3552.
* **Sibling Stagger:** Confirmation button inside card highlights 4 frames after modal settles.
* **Trigger Type:** Tap on `Continue` button at frame 3527.
* **Observation Type:** Measured from frame bounding boxes.

---

### **UN00-M014: Mascot Mood Transition (Sad / Rotting to Happy / Glowing)**
* **Local Timestamp:** `122.267s` – `128.500s` (Frames 3668 – 3855)
* **Duration:** Morph transition over `1200.0 ms` (Frames 3780 – 3816).
* **Elements & Properties:**
  * Mascot 3D texture blends from dull purplish-grey to bright glowing pink.
  * Facial expression morphs from frown/sad eyes to wide smile/sparkling eyes.
  * Braincells meter bar animates from 23/100 to 70/100 (`width`: 23% → 70%, text counter interpolates numbers 23 → 70).
  * Segmented control tab flips indicator from `Brainrot` to `Unrot`.
* **Direction:** Cross-fade material morph + horizontal gauge expansion.
* **Easing Character:** Smooth cubic ease-in-out (`cubic-bezier(0.42, 0, 0.58, 1)`).
* **Overshoot:** Progress bar slightly exceeds 70% (peaks at ~72%) before bouncing back to 70%.
* **Sibling Stagger:** Tab switch precedes mascot expression morph by ~150 ms; counter number rolls up concurrently with progress bar.
* **Trigger Type:** Tap on `Unrot` segment tab at frame 3779.
* **Displacement Samples (Progress bar width %):**
  * `F3780`: 23.0% | `F3790`: 38.5% | `F3800`: 58.2% | `F3808`: 72.0% (Overshoot) | `F3816`: 70.0% (Settled).
* **Observation Type:** Measured gauge width and frame OCR.

---

### **UN00-M015: Setup Interstitial Push to Habit Multi-Select Screen**
* **Local Timestamp:** `138.500s` – `139.100s` (Frames 4155 – 4173)
* **Duration:** `600.0 ms` (18 frames)
* **Elements & Properties:** Setup intro slides left; Habit selection screen slides in from right (`translateX`: 540px → 0px); Category headers and habit cards render with progressive alpha fade.
* **Direction:** Horizontal slide right-to-left.
* **Easing Character:** Deceleration ease-out (`cubic-bezier(0.25, 1, 0.5, 1)`).
* **Overshoot:** None.
* **Sibling Stagger:** List item rows have a cascading 2-frame stagger entry down the viewport.
* **Trigger Type:** Tap on `Continue` button at frame 4154.
* **Observation Type:** Measured from video frames.

---

### **UN00-M016: Habit Multi-Select Scroll & Tap Checkbox Toggle Animations**
* **Local Timestamp:** `141.000s` – `156.000s` (Frames 4230 – 4680)
* **Duration:** Multiple vertical scrolls (`500 ms` – `1800 ms`) and individual selection tap events (~`200 ms` each).
* **Elements & Properties:**
  * Vertical scroll container moves up (`translateY`: 0 → -850px total over 3 distinct scroll flicks).
  * Section headers (`Physical`, `Mental`, `Wellness`, `Creative`) stick to top subheader zone during scroll.
  * Tapping a habit row triggers:
    1. Card background flash (`#181522` → `#282538`).
    2. Checkbox circle border fill (grey ring fills with solid white circle containing dark checkmark).
    3. Checkmark glyph scales from 0.0 → 1.2 → 1.0 (spring micro-pop).
* **Direction:** Vertical scroll + radial checkbox scale.
* **Easing Character:** Scroll uses iOS native UIScrollView deceleration physics (`decelerationRate = normal`) with rubber-band bounce at list ends; Checkbox pop uses spring with overshoot.
* **Overshoot:** Checkbox scale overshoots by 20% before settling.
* **Sibling Stagger:** None during individual taps.
* **Trigger Type:** Vertical drag/flick gestures + direct touch taps on rows (`Running`, `Strength training`, `Meditating`, `Reading`, `Breathing exercises`, `Drink more water`, `Eat healthier`).
* **Displacement Samples (Checkbox scale on tap F4240–F4248):**
  * `F4240`: scale=0.00 | `F4242`: scale=0.65 | `F4244`: scale=1.20 (Peak pop) | `F4246`: scale=1.05 | `F4248`: scale=1.00.
* **Observation Type:** Measured from video frames.

---

### **UN00-M017: Daily Commitment Option Card Radio Selection**
* **Local Timestamp:** `157.767s` – `158.100s` (Frames 4733 – 4743)
* **Duration:** `333.3 ms` (10 frames)
* **Elements & Properties:** Selected card (`60 minutes / Regular`) border transitions from dark purple outline to bright 2px white border; background shifts to `#262335`; trailing radio circle fills white.
* **Direction:** Inward color/border crossfade.
* **Easing Character:** Linear color interpolation + subtle spring border width pop.
* **Overshoot:** None.
* **Sibling Stagger:** None.
* **Trigger Type:** Tap on the second option card at frame 4732.
* **Observation Type:** Measured from frame pixel values.

---

### **UN00-M018: Screen Time Assessment Radio Selection & Push**
* **Local Timestamp:** `161.167s` – `163.333s` (Frames 4835 – 4900)
* **Duration:** Selection tap: `200.0 ms` (F4835–F4841); Screen push to Math: `666.7 ms` (F4888–F4908).
* **Elements & Properties:** Card `4 to 6 hours` highlights white; upon tapping `Continue` at F4887, current screen pushes left and Math Calculation screen slides in from right.
* **Direction:** Selection highlight + Horizontal navigation push.
* **Easing Character:** Standard iOS navigation ease-out.
* **Overshoot:** None.
* **Sibling Stagger:** Math screen elements enter with sequential staggered delays.
* **Trigger Type:** Tap on option row, then tap on `Continue` button.
* **Observation Type:** Measured from video frames.

---

### **UN00-M019: "Quick Math" KPI Counters Staggered Entry & Number Rollup**
* **Local Timestamp:** `163.500s` – `172.500s` (Frames 4905 – 5175)
* **Duration:** `9000.0 ms` total sequence. Individual card entry: `600.0 ms` each; Rollup duration: `800.0 ms` per counter.
* **Elements & Properties:**
  1. Card 1 (`5 Hours a day`): Drops in (`translateY`: -20px → 0px, `opacity`: 0 → 1) at F4920; Number counts up `0` → `5`.
  2. Card 2 (`150 Hours a month`): Drops in at F4980 (+2.0s delay); Number counts up `0` → `150`.
  3. Card 3 (`76 Days a year`): Drops in with bold red/coral styling at F5070 (+3.0s delay); Number counts up `0` → `76`.
  4. Caption (`...spent scrolling`): Fades in at F5120 with slight spring pulse.
* **Direction:** Top-to-bottom drop for each card + numerical counter increment.
* **Easing Character:** Spring drop for card frames (`damping: 20`); Ease-out numeric counter rollup with slowing tick rate.
* **Overshoot:** Each card dips ~4px below its baseline position before settling.
* **Sibling Stagger:** Distinct 2000 ms – 3000 ms pauses between successive card reveals.
* **Trigger Type:** Automated choreographed sequence triggered by screen load.
* **Displacement Samples (Card 3 numeric count rollup F5070–F5094):**
  * `F5070`: 0 | `F5076`: 28 | `F5082`: 54 | `F5088`: 71 | `F5094`: 76 (Settled).
* **Observation Type:** Measured directly from frame-by-frame text and numbers.

---

### **UN00-M020: "A Year in Your Life" 365-Day Dot Matrix Grid Transformation**
* **Local Timestamp:** `172.900s` – `179.800s` (Frames 5187 – 5394)
* **Duration:** Multi-stage matrix recoloring and typography crossfade (~`7000.0 ms` total).
* **Elements & Properties:**
  * Initial State: All 365 day blocks render simultaneously in glowing off-white/lavender.
  * Transformation (F5280 – F5340): Over a 2.0s span, ~200+ blocks cascade-fade from white to dim charcoal grey (`#22202E`), starting from top-left and sweeping diagonally downward.
  * Title text crossfades smoothly from `This is a year in your life` to `This is the free time left after sleep, work, and life admin.` (`opacity` 1.0 → 0.0 → 1.0, duration: `500 ms`).
  * Residual brightly illuminated blocks isolate discretionary free time.
* **Direction:** Diagonal top-left to bottom-right wave sweep across the block grid.
* **Easing Character:** Smooth linear wave propagation with per-dot cubic opacity fade.
* **Overshoot:** None.
* **Sibling Stagger:** Individual dot delay is ~5 ms per matrix column/row step.
* **Trigger Type:** Automated choreographed sequence on screen load.
* **Displacement / Color Samples (Wave progression through grid rows):**
  * `F5280`: Rows 1–3 dimming | `F5300`: Rows 4–10 dimming | `F5320`: Rows 11–18 dimming | `F5340`: ~60% of total grid dimmed to dark grey.
* **Observation Type:** Measured from pixel luminance across matrix bounding box.

---

## 3. UNREADABLE OR MISSING COVERAGE DISCLOSURE

1. **Physical Haptic Feedback:** Cannot be observed or claimed from video media (strictly excluded per requirements).
2. **Audio Track / Sound Effects:** The visual recording contains no verifiable audio waveforms; all observations are strictly visual.
3. **Exact Offscreen Scroll Content:** For screens with scrollable content (e.g. `UN00-S013` Habit selection), items outside the visible viewport bounding box before/after scrolling are reported only when scrolled into view.
4. **End of Clip Boundary:** The clip ends at `180.000s` (Frame 5399) during the second phase of the 365-day grid animation (before the user reaches the subsequent paywall or final dashboard view).

---

## 4. EXTRACTION TARGET JSON BLOCK

```json
{
  "screens": [
    {
      "id": "UN00-S001",
      "time_seconds": 0.0,
      "title": "Splash / App Launch (unrot)"
    },
    {
      "id": "UN00-S002",
      "time_seconds": 2.833,
      "title": "Social Proof & App Store Ratings (4.8 Stars, 300K Users)"
    },
    {
      "id": "UN00-S003",
      "time_seconds": 8.8,
      "title": "Mascot Intro (Hey! I'm your brain.)"
    },
    {
      "id": "UN00-S004",
      "time_seconds": 13.833,
      "title": "User Name Input (What's your name? Julia)"
    },
    {
      "id": "UN00-S005",
      "time_seconds": 20.6,
      "title": "Referral Source Attribution (Where did you hear about us?)"
    },
    {
      "id": "UN00-S006",
      "time_seconds": 24.6,
      "title": "Personal Alert & Simulated Push Notification"
    },
    {
      "id": "UN00-S007",
      "time_seconds": 31.8,
      "title": "Interactive Brain Chat Stream"
    },
    {
      "id": "UN00-S008",
      "time_seconds": 88.0,
      "title": "Value Proposition 1 (Your apps go to jail)"
    },
    {
      "id": "UN00-S009",
      "time_seconds": 96.5,
      "title": "Value Proposition 2 (Earn Brain Coins - Habit Carousel)"
    },
    {
      "id": "UN00-S010",
      "time_seconds": 117.5,
      "title": "Value Proposition 3 (Buy Screen Time - Unblock Modal)"
    },
    {
      "id": "UN00-S011",
      "time_seconds": 122.5,
      "title": "Value Proposition 4 (I reflect how well you're doing - Brain Moods)"
    },
    {
      "id": "UN00-S012",
      "time_seconds": 132.5,
      "title": "Setup Interstitial (It's time to Unrot, Let's get you set up!)"
    },
    {
      "id": "UN00-S013",
      "time_seconds": 138.5,
      "title": "Habit Multi-Select (How do you want to earn brain coins?)"
    },
    {
      "id": "UN00-S014",
      "time_seconds": 156.5,
      "title": "Daily Habit Time Commitment (How much time do you want to spend?)"
    },
    {
      "id": "UN00-S015",
      "time_seconds": 160.0,
      "title": "Screen Time Assessment (How many hours do you currently spend?)"
    },
    {
      "id": "UN00-S016",
      "time_seconds": 163.5,
      "title": "Screen Time Math Breakdown (Here's some quick math, Julia)"
    },
    {
      "id": "UN00-S017",
      "time_seconds": 173.0,
      "title": "A Year in Your Life (365-Day Dot Matrix Grid)"
    }
  ],
  "motions": [
    {
      "id": "UN00-M001",
      "time_seconds": 2.667,
      "duration_ms": 433.3,
      "description": "Splash screen logo glow and upward crossfade to Social Proof screen"
    },
    {
      "id": "UN00-M002",
      "time_seconds": 8.533,
      "duration_ms": 533.3,
      "description": "Horizontal push transition from Social Proof to Mascot Intro screen"
    },
    {
      "id": "UN00-M003",
      "time_seconds": 9.1,
      "duration_ms": 1800.0,
      "description": "Continuous sinusoidal floating idle bobbing of 3D Brain Mascot"
    },
    {
      "id": "UN00-M004",
      "time_seconds": 13.733,
      "duration_ms": 600.0,
      "description": "Screen push and iOS software keyboard slide-up with CTA docking"
    },
    {
      "id": "UN00-M005",
      "time_seconds": 14.7,
      "duration_ms": 1500.0,
      "description": "Simulated keyboard key popovers and character typing for 'Julia'"
    },
    {
      "id": "UN00-M006",
      "time_seconds": 20.533,
      "duration_ms": 600.0,
      "description": "Keyboard dismiss slide-down and horizontal transition to Referral screen"
    },
    {
      "id": "UN00-M007",
      "time_seconds": 23.8,
      "duration_ms": 333.3,
      "description": "Referral option card selection highlight with radio checkmark spring pop"
    },
    {
      "id": "UN00-M008",
      "time_seconds": 26.267,
      "duration_ms": 1200.0,
      "description": "Simulated iOS notification banner dropdown with spring overshoot and pointer bounce"
    },
    {
      "id": "UN00-M009",
      "time_seconds": 31.333,
      "duration_ms": 800.0,
      "description": "Notification banner tap expansion morphing into full Chat screen"
    },
    {
      "id": "UN00-M010",
      "time_seconds": 32.5,
      "duration_ms": 466.7,
      "description": "Chat bubble spring pop entry, typing indicator pulse, and list auto-scroll"
    },
    {
      "id": "UN00-M011",
      "time_seconds": 87.8,
      "duration_ms": 733.3,
      "description": "Chat transition to 3D Jail scene with forward depth zoom and text rise"
    },
    {
      "id": "UN00-M012",
      "time_seconds": 96.5,
      "duration_ms": 500.0,
      "description": "Habit card carousel horizontal swipe gestures with snap-to-center physics"
    },
    {
      "id": "UN00-M013",
      "time_seconds": 117.6,
      "duration_ms": 800.0,
      "description": "Unblock screen time confirmation modal spring pop-in with scale overshoot"
    },
    {
      "id": "UN00-M014",
      "time_seconds": 122.267,
      "duration_ms": 1200.0,
      "description": "Brain mascot material morph from sad/melting to happy/glowing and gauge roll-up"
    },
    {
      "id": "UN00-M015",
      "time_seconds": 138.5,
      "duration_ms": 600.0,
      "description": "Setup interstitial horizontal slide transition into Habit multi-select list"
    },
    {
      "id": "UN00-M016",
      "time_seconds": 141.0,
      "duration_ms": 333.3,
      "description": "Habit list vertical scroll deceleration and checkbox toggle spring micro-pops"
    },
    {
      "id": "UN00-M017",
      "time_seconds": 157.767,
      "duration_ms": 333.3,
      "description": "Daily habit commitment option card selection border and background transition"
    },
    {
      "id": "UN00-M018",
      "time_seconds": 161.167,
      "duration_ms": 666.7,
      "description": "Screen time assessment option tap and horizontal push to Quick Math screen"
    },
    {
      "id": "UN00-M019",
      "time_seconds": 163.5,
      "duration_ms": 800.0,
      "description": "Quick Math staggered KPI counter drops and numeric rollup interpolations"
    },
    {
      "id": "UN00-M020",
      "time_seconds": 172.9,
      "duration_ms": 2000.0,
      "description": "365-day dot matrix grid diagonal cascade dimming to isolate discretionary free time"
    }
  ]
}
```
