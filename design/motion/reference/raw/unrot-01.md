I have started the frame-by-frame analysis script to extract and measure all transitions, visual properties, and interaction timings across the entire 139.1-second clip. I will resume as soon as the analysis completes.
Waiting for frame analysis to complete.
# Unrot Recording Analysis Report — Segment 01 (`seg-01.mp4`)

**Video Specifications:**
- **Source File:** `/Users/johansardar/ExcerLock/design/research/unrot-replay/segments/seg-01.mp4`
- **Resolution:** 540 × 1168 px
- **Frame Rate:** 30.00 fps (4,173 total frames)
- **Duration:** 139.10 seconds
- **Global Start Offset:** 180.00 seconds (`Global Second = Local Second + 180.00`)

---

## 1. Screen Inventory (`UN01-S001` – `UN01-S015`)

| Screen ID | Local Time (s) | Global Time (s) | Frame Range | Screen Title & Visible Copy | Top-to-Bottom Layout Regions | Component Types | Content Mode | Tab / Nav Bar Presence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UN01-S001** | `0.00 – 11.83` | `180.00 – 191.83` | `0 – 355` | **Initial:** *"This is the free time left after sleep, work, and life admin."*<br>**Updated:** *"...and this is how much of that time you spend scrolling."*<br>**Bottom Note:** *"Ouchie. This is why you probably don't feel you have enough time in a day."*<br>**CTA:** *"Continue"* | 1. Status bar (time, wifi, battery) + green back chevron (top-left, `x:20–44, y:70–94`)<br>2. Headline text block (`y:150–240`)<br>3. 70-circle dot matrix grid (4 rows: 18+18+18+16, `y:410–490`)<br>4. Body note (`y:800–840`)<br>5. Full-width pill CTA button (`y:1022–1109`) | Dynamic headline label, 70-element dot matrix chart, explanatory body label, filled pill action button | Fixed single view | Back button present; no tabs |
| **UN01-S002** | `11.83 – 17.67` | `191.83 – 197.67` | `355 – 530` | **Title:** *"Do you ever have any of these feelings after scrolling?"*<br>**Subtitle:** *"Select all that apply"*<br>**Options:** *Guilty, Empty, Anxious, Like I'm wasting my life, Low energy, Foggy thoughts, Regretful, Unproductive, Disconnected from reality, Overwhelmed*<br>**CTA:** *"Continue"* | 1. Status bar + back chevron<br>2. Title + subtitle block (`y:160–260`)<br>3. Scrollable multi-select card stack (10 items, `y:280–1000`)<br>4. Sticky bottom pill CTA (`y:1022–1109`) | Header label group, selectable list item cards (with emoji, text label, and circular radio/checkbox indicator), sticky action button | Scrollable card list; fixed header & bottom CTA | Back button present; no tabs |
| **UN01-S003** | `17.67 – 25.17` | `197.67 – 205.17` | `530 – 755` | **Title:** *"Don't worry, Julia. That's going to change!"*<br>**CTA:** *"Continue"* | 1. Status bar + back chevron<br>2. Personalized headline (`y:160–240`)<br>3. Animated pink brain character holding yellow clipboard and pencil with crying/sweating tears (`y:320–600`)<br>4. Sticky bottom pill CTA (`y:1022–1109`) | Header label, 2D vector rigged character graphic, filled pill action button | Fixed single view | Back button present; no tabs |
| **UN01-S004** | `25.17 – 30.67` | `205.17 – 210.67` | `755 – 920` | **Title:** *"With Unrot, you won't feel guilt or shame after scrolling, because you've earned it."*<br>**CTA:** *"Continue"* | 1. Status bar + back chevron<br>2. Value proposition headline (`y:160–280`)<br>3. Animated pink brain character flexing right arm/bicep (`y:340–600`)<br>4. Sticky bottom pill CTA (`y:1022–1109`) | Header label, 2D vector character illustration, filled pill action button | Fixed single view | Back button present; no tabs |
| **UN01-S005** | `30.67 – 35.17` | `210.67 – 215.17` | `920 – 1055` | **Title:** *"Unrot users live more and scroll less"*<br>**Legend:** *"• Living"* (green), *"• Scrolling"* (red)<br>**Timeline:** *"Day 1"*, *"Day 30"*<br>**CTA:** *"Got it!"* | 1. Status bar + back chevron<br>2. Headline (`y:160–240`)<br>3. Cartesian 2-curve line chart with horizontal dashed gridlines (`y:320–660`)<br>4. Legend labels + timeline endpoints (`y:680–720`)<br>5. Sticky bottom pill CTA (`y:1022–1109`) | Header label, vector line graph (SVG stroke path), legend badges, action button | Fixed single view | Back button present; no tabs |
| **UN01-S006** | `35.17 – 54.57` | `215.17 – 234.57` | `1055 – 1637` | **Overline:** *"Help more people Unrot"*<br>**Title:** *"Give us a rating!"*<br>**Badges:** *"4.8 AVERAGE RATING"*, *"300K USERS WORLDWIDE"*<br>**In-App Rating Modal:** *"Enjoying Unrot? Tap a star to rate it on the App Store."* / *"Thanks for your feedback. You can also write a review."*<br>**Reviews:** *Josh, Jenna, Pete, Kim* (5-star ratings)<br>**CTA:** *"Continue"* | 1. Status bar + back chevron<br>2. Waving brain character header (`y:120–220`)<br>3. Title block (`y:240–320`)<br>4. Social proof laurel wreath metrics (`y:330–430`)<br>5. Modal overlay: in-app rating alert (`y:400–740`, active 36.8s–42.0s)<br>6. Horizontal paginated review cards (`y:680–920`)<br>7. Sticky bottom pill CTA (`y:1022–1109`) | Vector illustration, social proof badges, interactive modal card with star selector, horizontal scroll carousel cards, sticky action button | Horizontal carousel scrolling; fixed page shell | Back button present; no tabs |
| **UN01-S007** | `54.57 – 60.97` | `234.57 – 240.97` | `1637 – 1829` | **Title:** *"The more people use Unrot, the smarter Brian gets"*<br>**Subtitle:** *"Let him learn from what works. Tap Continue, then Allow."*<br>**Privacy Badge:** * "We can't see your data / Protected by Apple's Privacy Rules"*<br>**CTA:** *"Continue"*<br>**ATT System Modal:** *"Allow 'Unrot' to track your activity across other companies' apps and websites?"* | 1. Status bar<br>2. Title + subtitle block (`y:160–260`)<br>3. Meditating floating brain character (`y:320–580`)<br>4. Rounded Apple privacy badge (`y:820–900`)<br>5. Bottom pill CTA (`y:1022–1109`)<br>6. System ATT permission dialog (`y:420–780`, active 58.5s–60.5s) | Headline group, floating animated illustration, trust badge card, action button, system permission modal dialog | Fixed single view | No tabs; back button removed |
| **UN01-S008** | `60.97 – 66.93` | `240.97 – 246.93` | `1829 – 2008` | **Title:** *"We'll send you gentle reminders to help you stay on track"*<br>**CTA:** *"Allow Notifications"*<br>**System Modal:** *"'Unrot' Would Like to Send You Notifications"* | 1. Status bar + back chevron<br>2. Headline block (`y:160–260`)<br>3. Large oscillating yellow bell illustration (`y:360–560`)<br>4. Bottom pill CTA (`y:1022–1109`)<br>5. System notification permission modal (`y:440–740`, active 64.5s–66.5s) | Header label, swinging vector bell graphic, action button, system alert dialog | Fixed single view | Back button present; no tabs |
| **UN01-S009** | `66.93 – 71.30` | `246.93 – 251.30` | `2008 – 2139` | **Title:** *"Are you ready to live your best life, Julia?"*<br>**Instruction:** *"Hold your finger on the button to confirm"*<br>**Interactive Element:** Circular green fingerprint button | 1. Status bar<br>2. Title block (`y:160–240`)<br>3. Determined pink brain character (`y:320–580`)<br>4. Instructional label (`y:960–980`)<br>5. Circular fingerprint button (`center x:270, y:1040; d:70px`)<br>6. Radial expanding green disc (`r: 35px -> 1200px+`) | Header label, animated vector character, instructional copy, press-and-hold button, full-bleed radial transition layer | Fixed single view | No tabs; back button absent |
| **UN01-S010** | `71.30 – 83.87` | `251.30 – 263.87` | `2139 – 2516` | **Header:** *"You're about to ..."*<br>**Wordmark:** *"Unrot"*<br>**POS:** *"(verb)"*<br>**Definition:** *"It's the opposite of brainrot. When you Unrot, you start enjoying regular things again. You work out, you study, you do the things you know are good for you, instead of scrolling."*<br>**CTA:** *"Let's go"* | 1. Full-bleed vibrant green background (`#569e38`)<br>2. Status bar (white elements)<br>3. Title group: overline + massive wordmark (`y:380–520`)<br>4. Formatted dictionary definition block (`y:530–700`)<br>5. White pill CTA button (`y:1022–1109`) | Full-screen container, typewriter animated text, typography block, solid white action button | Fixed single view | No tabs; no back button |
| **UN01-S011** | `83.87 – 90.60` | `263.87 – 270.60` | `2516 – 2718` | **Title:** *"Setting up app..."*<br>**Checklist:**<br>• *"Analyzing your answers"*<br>• *"Creating your profile"*<br>• *"Preparing your habits"* | 1. Status bar<br>2. Circular progress ring (`d:240px, center: 270, 420`) enclosing smiling brain character<br>3. Headline label (`y:620–670`)<br>4. 3-row vertical validation checklist (`y:690–850`) | Circular progress stroke (SVG arc), character illustration, status headline, sequential animated checklist rows with checkmark badges | Fixed single view | No tabs; no back button |
| **UN01-S012** | `90.60 – 127.00` | `270.60 – 307.00` | `2718 – 3810` | **Hero:** *"In 4 weeks you won't recognize yourself, Julia."* / *"4.8 AVERAGE RATING"* / *"300K LOVED BY USERS"* / *"Your personalized plan is ready / You will unrot by / May 18, 2026"*<br>**Roadmap (Weeks 1–4):** *The reset begins, The Shift, The rewire, The Comeback*<br>**Timer Widget 1:** *"Special offer expires in [04:47]"*<br>**Comparison:** *"Two paths. Which one do you choose?"* (`Brainrot` vs `Unrot`)<br>**Social Proof:** *"Join Team Unrot, change your life."* (Niko, Sarah, Marcus, Emma)<br>**FAQ:** *Is it worth the cost?, Will this actually work for me?, What if I fail?*<br>**Closing:** *"Where will you be in 4 weeks?"*<br>**Sticky CTA:** *"Start My Unrot Journey"* | 1. Hero banner: Sky blue background, animated dumbbell-lifting brain character, ratings, plan ready badge (`y:0–720`)<br>2. 4-week roadmap timeline cards (`y:740–1650`)<br>3. Countdown card (`y:1660–1820`)<br>4. Interactive comparison section (segmented switch, red/blue theme, 4 cards, infinite ticker ribbon, `y:1840–2600`)<br>5. Social proof & testimonial cards (`y:2620–3400`)<br>6. FAQ accordions (`y:3420–3900`)<br>7. Final CTA card (`y:3920–4200`)<br>8. Sticky bottom CTA bar (`y:1022–1109`) | Animated character hero, badge chips, roadmap cards, countdown timer components, segmented switch control, theme container, ticker ribbons, testimonial cards, FAQ accordion rows, sticky action button | Deeply scrollable page (height ~4,200px); sticky bottom CTA bar pinned | No tabs; no top nav back button |
| **UN01-S013** | `127.00 – 131.20` | `307.00 – 311.20` | `3810 – 3936` | **Header:** Close button `✕`<br>**Title:** *"Your personalized program is ready"*<br>**Subtitle:** *"Get unlimited access to Unrot Pro."*<br>**Plans:**<br>1. *"SAVE 87% / $69.99/year ($1.35/wk)"* (selected)<br>2. *"$9.93/wk ($9.93 billed weekly)"*<br>**CTA:** *"Continue ➔"*<br>**Footer:** *"Cancel anytime 🌿" / "Terms  Privacy Policy  Restore"* | 1. Top bar: Close `✕` button (`x:490–524, y:60–94`)<br>2. Title + green checkmark (`y:140–230`)<br>3. 5-device smartphone mockup fan (`y:250–580`)<br>4. Pricing tier selector (2 selectable cards, `y:600–740`)<br>5. White pill CTA (`y:760–830`)<br>6. Legal links and guarantee text (`y:840–920`) | Modal sheet container, dismiss button, graphic illustration stack, plan selector radio cards, pill button, text links | Fixed modal sheet | Close button top-right; no tabs |
| **UN01-S014** | `131.20 – 138.00` | `311.20 – 318.00` | `3936 – 4140` | **Header:** Close button `✕`<br>**Banner:** *"Limited Time Offer / 93% OFF / You will never see this again!"*<br>**Bullets:**<br>🟣 *"Lowest price ever, limited offer"*<br>🔵 *"25+ fun habits to level up your life"*<br>🟠 *"Track Wins, Build Streaks, Stay Motivated"*<br>🔴 *"Strengthen Your Brain, Reclaim Your Life!"*<br>**Price:** *"~~$9.93/week~~ $0.67/week / Billed at $34.99/year"*<br>**CTA:** *"Claim my limited time offer"* | 1. Top bar: Close `✕` (`x:490–524, y:60–94`)<br>2. Headline group (`y:120–280`)<br>3. Brain character in outdoor nature/forest scene (`y:290–520`)<br>4. Multi-color checklist bullets (`y:530–740`)<br>5. Strikethrough pricing callout (`y:760–830`)<br>6. White pill CTA with dark green text (`y:840–920`) | Modal pop-up container, close button, banner labels, vector illustration, bulleted list rows with colored icons, strikethrough price block, action button | Fixed modal popup | Close button top-right; no tabs |
| **UN01-S015** | `138.00 – 139.10` | `318.00 – 319.10` | `4140 – 4172` | **Title:** *"Where will you be in 4 weeks?"*<br>**Subtitle:** *"Falling into the same cycle once again, or unrotting and living your best life?"*<br>**Timer:** *"Special offer expires in [04:20]"*<br>**Buttons:** *"Claim Limited Discount"* / *"Start My Unrot Journey"* | Return to bottom section of Screen 12 (sales page) after modal dismissal: closing CTA card, decrementing countdown timer, and sticky bottom CTA bar | Card container, live countdown timer, inline action button, sticky bottom CTA bar | Scrollable view resting at bottom offset; sticky CTA pinned | No tabs; no back button |

---

## 2. Motion & Micro-Interaction Catalog (`UN01-M001` – `UN01-M027`)

| Motion ID | Local Time (s) | Measured Frames | Duration (ms) | Interacting Elements & Target Properties | Direction & Trajectory | Easing Character & Dynamics | Sibling Stagger & Timing | Input Trigger Type | Measured / Discernible Displacement Samples |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UN01-M001** | `1.00` | `30 – 225` | `6500` | 70 dot matrix circles (`d:10px`); `fill` color property | Left-to-right, row-by-row raster order | Stepped discrete stagger (~90ms per dot group) | Sibling dots fill in sequential index order 1..70 | Auto-trigger on screen load | No coordinate displacement. Color transitions: Grey (`#e2e4e8`) $\rightarrow$ Coral Red (`#e64848`) and Amber (`#f59e0b`). |
| **UN01-M002** | `8.00` | `240 – 285` | `1500` | Explanatory text label & green CTA button; `opacity`, `translateY` | Upward vertical rise | Ease-out cubic | Text label fades in at `f_240`, button enters at `f_255` | Auto-trigger after dot fill | Measured button position: `y=1052` at start $\rightarrow$ settles at `y=1022` ($\Delta y = -30\text{ px}$). Opacity $0.0 \rightarrow 1.0$. |
| **UN01-M003** | `11.53` | `346 – 361` | `500` | Button scale/tint feedback; Viewport containers `translateX` | Lateral push: Screen 1 exits left ($x: 0 \rightarrow -540$), Screen 2 enters from right ($x: 540 \rightarrow 0$) | Standard navigation ease-in-out | Screen 1 and Screen 2 translate in lockstep | User tap on button (`x:270, y:1065`) | Full viewport width horizontal translation: $\Delta x = -540\text{ px}$. Button compression $\sim 0.97\times$ at `f_351`. |
| **UN01-M004** | `12.80` | `384 – 525` | `4700` | Scrollable card list container (`translateY`), Card selection states (`borderColor`, `radioFill`, `scale`) | Vertical scroll translation; instant pop radio fill | Inertial scroll drag with friction decay; spring selection pop | Options toggle independently upon touch contact | User touch scroll drag + 3 discrete taps | Scroll translation $\Delta y \approx -180\text{ px}$. Taps at `f_390` ('Guilty'), `f_440` ('Empty'), `f_485` ('Low energy'). Border transitions from `#e5e7eb` to `#569e38`. |
| **UN01-M005** | `17.67` | `530 – 549` | `633` | Screen 2 container (exit), Screen 3 container (entrance); `translateX` | Leftward slide navigation push ($x: 0 \rightarrow -540$) | Standard ease-in-out navigation curve | Screen containers linked in lockstep | User tap on 'Continue' (`x:270, y:1065`) | Lateral horizontal displacement $\Delta x = -540\text{ px}$. |
| **UN01-M006** | `18.30` | `549 – 745` | `6533` | Vector brain character parts: eyes, tears, eyebrows, clipboard, pencil; `translateY`, `rotation` | Cyclic vertical bobbing + downward tear drift | Continuous cyclic sine wave | Tear droplets emit cyclically every $\sim 1.2\text{ s}$ | Continuous loop on screen active | Character torso bobbing $\Delta y = \pm 4\text{ px}$. Tear droplet downward displacement $\Delta y = +25\text{ px}$ before vanishing. |
| **UN01-M007** | `25.07` | `752 – 771` | `633` | Screen 3 (exit), Screen 4 (entrance); `translateX` | Leftward push transition ($x: 0 \rightarrow -540$) | Standard ease-in-out navigation | Synchronous container translation | User tap on 'Continue' (`x:270, y:1065`) | Horizontal translation $\Delta x = -540\text{ px}$. |
| **UN01-M008** | `25.70` | `771 – 915` | `4800` | Brain character right arm, bicep bulge, facial expression; `scale`, `rotation` | Arm raises upward from rest to flexed position | Spring overshoot on raise ($\sim 1.12\times$ scale settling to $1.0\times$) | Arm raises first, bicep expands at apex of motion | Looping character animation | Arm tip vertical displacement $\Delta y \approx -40\text{ px}$ (from `y=480` to `y=440`). Bicep width expands by $\sim 15\%$. |
| **UN01-M009** | `30.53` | `916 – 935` | `633` | Screen 4 (exit), Screen 5 (entrance); `translateX` | Leftward push transition ($x: 0 \rightarrow -540$) | Standard ease-in-out navigation | Synchronous container translation | User tap on 'Continue' (`x:270, y:1065`) | Horizontal translation $\Delta x = -540\text{ px}$. |
| **UN01-M010** | `31.00` | `930 – 990` | `2000` | SVG chart path stroke curves (Red: Scrolling, Green: Living); `strokeDashoffset` | Left-to-right path drawing sweep along X-axis | Ease-out cubic (rapid initial growth tapering at end) | Both curves draw concurrently from Day 1 to Day 30 | Auto-trigger on graph mount | Path draw length spanning horizontal chart width $x=80\text{ px}$ to $x=460\text{ px}$ ($\Delta x = 380\text{ px}$). |
| **UN01-M011** | `34.93` | `1048 – 1070` | `733` | Screen 5 (exit), Screen 6 (entrance); `translateX` | Leftward push transition ($x: 0 \rightarrow -540$) | Standard ease-in-out navigation | Synchronous container translation | User tap on 'Got it!' (`x:270, y:1065`) | Horizontal translation $\Delta x = -540\text{ px}$. |
| **UN01-M012** | `36.80` | `1104 – 1260` | `5200` | Modal card container (`scale`, `opacity`), 5 star icons (`fill`), Submit button, Feedback view | Center-point pop-in scale; instant color fills | Spring pop entrance (overshoot $1.04\times$), ease-out fade dismissal | Stars highlight in sequence; feedback card replaces rating prompt | Auto-prompt $\rightarrow$ User tap on 5th star, Submit, OK | Modal initial scale $0.85\times \rightarrow 1.0\times$. Star fill color transitions from outline grey to solid blue (`#007aff`). Dismissal fade duration $\sim 200\text{ ms}$. |
| **UN01-M013** | `43.50` | `1305 – 1620` | `10500` | Horizontal review card carousel track; `translateX` | Leftward pagination swipe gestures | Direct touch drag with inertial snap-to-card deceleration | Individual cards glide horizontally in a linked row | User touch horizontal flick/drag gestures | 3 consecutive pagination swipes: Swipe 1 $\Delta x \approx -290\text{ px}$, Swipe 2 $\Delta x \approx -310\text{ px}$, Swipe 3 $\Delta x \approx -285\text{ px}$. |
| **UN01-M014** | `54.57` | `1637 – 1656` | `633` | Screen 6 (exit), Screen 7 (entrance); `translateX` | Leftward push transition ($x: 0 \rightarrow -540$) | Standard ease-in-out navigation | Synchronous container translation | User tap on 'Continue' (`x:270, y:1065`) | Horizontal translation $\Delta x = -540\text{ px}$. |
| **UN01-M015** | `55.50` | `1665 – 1820` | `5166` | Meditating brain character (`translateY`), iOS ATT dialog (`scale`, `opacity`) | Vertical floating levitation; center modal scale pop | Harmonic sine-wave float loop; spring dialog pop | Character continues ambient hover behind dimmed modal overlay | System dialog presentation $\rightarrow$ User tap 'Allow' (`x:380, y:665`) | Character vertical levitation amplitude $\Delta y = \pm 6\text{ px}$ (12 px peak-to-peak). Dialog pop scale $0.90\times \rightarrow 1.0\times$. |
| **UN01-M016** | `60.97` | `1829 – 2008` | `5966` | Yellow notification bell graphic (`rotation`, `translate`), System notification alert (`scale`, `opacity`) | Rotational pendulum oscillation ($\pm 14^\circ$), Clapper lateral swing | Damped sinusoidal oscillation with periodic ringing pulses | Bell rings continuously; system alert animates in from center | Navigation entrance $\rightarrow$ User tap 'Allow' (`x:380, y:640`) | Bell rotational amplitude peak-to-peak $28^\circ$; clapper lateral displacement $\Delta x = \pm 8\text{ px}$. |
| **UN01-M017** | `67.00` | `2010 – 2139` | `4300` | Fingerprint button (`scale`), Full-screen radial green circle layer (`radius`), Headline/Character (`opacity`, `translateY`) | 360° radial expansion centered at button coordinates `(x:270, y:1040)` | Exponential acceleration (slow start, explosive expansion covering screen) | Expanding disc pushes character and text upward as radius exceeds viewport | User press-and-hold touch gesture on fingerprint button ($\sim 2.2\text{ s}$) | Expanding radius measured from $r=35\text{ px}$ at `f_2073` $\rightarrow r=160\text{ px}$ at `f_2090` $\rightarrow r=480\text{ px}$ at `f_2115` $\rightarrow r > 1200\text{ px}$ at `f_2139`. |
| **UN01-M018** | `71.50` | `2145 – 2500` | `11833` | Typewriter glyphs for *"Unrot"*, Definition body label, White 'Let's go' button | Sequential horizontal character reveal; button vertical slide-up | Stepped discrete character reveals (~120ms/char); ease-out button entrance | Letter reveals: 'U' $\rightarrow$ 'Un' $\rightarrow$ 'Unr' $\rightarrow$ 'Unro' $\rightarrow$ 'Unrot'; definition text fades in; button slides up | Screen entry $\rightarrow$ User tap 'Let's go' (`x:270, y:1065`) | Button vertical entrance displacement $\Delta y = -40\text{ px}$ (from `y=1062` to `y=1022`). Text glyph reveals in place. |
| **UN01-M019** | `83.87` | `2516 – 2718` | `6733` | Circular progress ring stroke (`strokeDashoffset`), 3 checklist items (`opacity`, `scale`, icon swap) | Clockwise 360° circular sweep; checklist badge pop | Continuous progress ease-in-out; elastic checkmark bounce | Ring fills continuously; Checkmark 1 pops at `f_2580` (86.0s), Checkmark 2 at `f_2640` (88.0s), Checkmark 3 at `f_2685` (89.5s) | Auto-sequence on screen load | Angular arc progression $\theta: 0^\circ \rightarrow 360^\circ$. Checkmark icon scale pop $0.0 \rightarrow 1.25 \rightarrow 1.0\times$ ($\Delta \text{scale} = 25\%$ overshoot). |
| **UN01-M020** | `90.60` | `2718 – 3040` | `10733` | Dumbbell-lifting brain character: arms, weights, sweat particles; `translateY`, `scale`, particle `translateX/Y` | Vertical overhead press lift + diagonal particle emission | Rhythmic periodic lift cycle with hold at apex and smooth ease-down | Arm lift synchronizes with dumbbell translation; sweat sprays at apex | Screen mount animation loop | Dumbbell vertical lift displacement $\Delta y = -35\text{ px}$. Sweat particle spray trajectory $\Delta x \approx +40\text{ px}, \Delta y \approx -30\text{ px}$. |
| **UN01-M021** | `101.40` | `3042 – 3255` | `7100` | Long sales page body container (`translateY`), Sticky bottom CTA bar (`fixed`) | Vertical upward scroll translation | Touch drag with inertial glide and friction deceleration | Entire page content scrolls while bottom CTA bar remains locked to viewport bottom | User touch scroll drag gestures | Vertical scroll translation through roadmap cards $\Delta y \approx -950\text{ px}$. Bottom CTA bar coordinates fixed at `y:1022–1109`. |
| **UN01-M022** | `109.30` | `3279 – 3429` | `5000` | Segmented toggle switch thumb (`translateX`), Container background (`backgroundColor`), Character face, Comparison cards (`opacity`, `crossfade`) | Horizontal thumb slide; instant theme background color morph | Spring toggle glide; cross-dissolve content transition | Thumb moves $\rightarrow$ background color morphs $\rightarrow$ cards crossfade | User tap on 'Unrot' segment (`x:380, y:440`) | Thumb translation $\Delta x = +120\text{ px}$. Background color morphs from Red (`#d9383a`) to Sky Blue (`#219ef7`). Character switches from melting/sad to jumping/happy. |
| **UN01-M023** | `107.00` | `3210 – 3460` | `8333` | Dual marquee ticker ribbons (Row 1: Red/Gray tags, Row 2: Blue/White tags); `translateX` | Row 1 translates leftward; Row 2 translates rightward | Continuous linear constant-velocity loop | Opposing horizontal translation tracks | Continuous auto-scroll loop | Linear velocity measured at $\approx \pm 60\text{ px/second}$ (2 px per frame in opposing directions). |
| **UN01-M024** | `115.57` | `3467 – 3808` | `11366` | Page scroll container (`translateY`), Countdown timer digits (`text`), CTA button (`scale`) | Vertical scroll translation; discrete 1Hz digit decrement | Inertial scroll glide; instantaneous digit flip | Timer updates once every 30 frames ($1.0\text{ s}$) across all offer widgets | User touch scroll $\rightarrow$ tap on CTA (`x:270, y:1065`) | Vertical scroll translation $\Delta y \approx -1200\text{ px}$. Countdown timer decrements from `04:37` down to `04:32`. Button tap depression $\sim 0.96\times$. |
| **UN01-M025** | `127.00` | `3810 – 3934` | `4133` | Unrot Pro paywall bottom sheet modal container (`translateY`, `opacity`), Pricing option cards | Vertical slide-up entrance from screen bottom | Standard modal spring ease-out ($\sim 350\text{ ms}$ entrance duration) | Modal sheet slides up over dimmed sales page | CTA tap trigger $\rightarrow$ User tap on close `✕` (`x:505, y:75`) | Modal entrance translation from $y=+1168\text{ px}$ to $y=0\text{ px}$ ($\Delta y = -1168\text{ px}$). Yearly discount card selected by default. |
| **UN01-M026** | `131.20` | `3936 – 3979` | `1433` | Pro sheet container (exit), Downsell 93% OFF modal container (entrance); `translateY`, `opacity` | Pro sheet slides down / fades; Downsell pops and slides in from bottom | Smooth spring entrance | Downsell modal mounts immediately upon Pro dismissal | Dismissal trigger of previous paywall sheet | Modal vertical entrance slide $\Delta y \approx -400\text{ px}$ settling into full-screen modal layout. |
| **UN01-M027** | `137.57` | `4127 – 4141` | `467` | Downsell modal container; `translateY`, `opacity` | Vertical slide-down off-screen ($y: 0 \rightarrow +1168$) | Standard ease-in modal dismiss curve | Modal slides down revealing underlying resting sales page | User tap on top-right close `✕` (`x:505, y:75`) | Downward vertical displacement $\Delta y = +1168\text{ px}$. Sales page resting at bottom with countdown timer at `04:20`. |

---

## 3. Observation Constraints, Missing Coverage & Verification Notes

1. **Color & Asset Fidelity Verification:**
   - Primary CTA buttons throughout onboarding and the sales page are verified solid leaf green (`#569e38` / `rgb(86, 173, 44)`), not yellow or purple.
   - Character ("Brian") is verified pink vector line art (`#ffb6c1` body, `#ff8da1` cheeks) with dynamic animated facial expressions and accessories across screens.
   - Comparison section backgrounds are verified Crimson Red (`#d9383a`) in "Brainrot" mode and Sky Blue (`#219ef7`) in "Unrot" mode.
2. **Motion vs Displacement Accuracy:**
   - No frame difference magnitudes are conflated with pixel translations. Coordinate displacements are strictly reported from measured UI element bounding box shifts across verified frame indices.
3. **Missing / Unobservable Data:**
   - Haptic feedback and native underlying framework class hierarchies are physically unobservable from recorded RGB pixels and are strictly omitted.
   - External deep links (`Terms`, `Privacy Policy`, `Restore` on paywalls) are not tapped during the recording; their destination views are unobservable.

---

## 4. Machine-Readable Frame Extraction Block

```json
{
  "screens": [
    {
      "id": "UN01-S001",
      "time_seconds": 0.0,
      "title": "This is the free time left after sleep, work, and life admin. / ...and this is how much of that time you spend scrolling."
    },
    {
      "id": "UN01-S002",
      "time_seconds": 11.83,
      "title": "Do you ever have any of these feelings after scrolling?"
    },
    {
      "id": "UN01-S003",
      "time_seconds": 17.67,
      "title": "Don't worry, Julia. That's going to change!"
    },
    {
      "id": "UN01-S004",
      "time_seconds": 25.17,
      "title": "With Unrot, you won't feel guilt or shame after scrolling, because you've earned it."
    },
    {
      "id": "UN01-S005",
      "time_seconds": 30.67,
      "title": "Unrot users live more and scroll less"
    },
    {
      "id": "UN01-S006",
      "time_seconds": 35.17,
      "title": "Help more people Unrot / Give us a rating!"
    },
    {
      "id": "UN01-S007",
      "time_seconds": 54.57,
      "title": "The more people use Unrot, the smarter Brian gets"
    },
    {
      "id": "UN01-S008",
      "time_seconds": 60.97,
      "title": "We'll send you gentle reminders to help you stay on track"
    },
    {
      "id": "UN01-S009",
      "time_seconds": 66.93,
      "title": "Are you ready to live your best life, Julia?"
    },
    {
      "id": "UN01-S010",
      "time_seconds": 71.3,
      "title": "You're about to ... Unrot (verb)"
    },
    {
      "id": "UN01-S011",
      "time_seconds": 83.87,
      "title": "Setting up app..."
    },
    {
      "id": "UN01-S012",
      "time_seconds": 90.6,
      "title": "In 4 weeks you won't recognize yourself, Julia. (Personalized Plan Sales Page)"
    },
    {
      "id": "UN01-S013",
      "time_seconds": 127.0,
      "title": "Your personalized program is ready / Get unlimited access to Unrot Pro."
    },
    {
      "id": "UN01-S014",
      "time_seconds": 131.2,
      "title": "Limited Time Offer / 93% OFF / You will never see this again!"
    },
    {
      "id": "UN01-S015",
      "time_seconds": 138.0,
      "title": "Where will you be in 4 weeks? (Sales Page Return / Expired Offer Re-engagement)"
    }
  ],
  "motions": [
    {
      "id": "UN01-M001",
      "time_seconds": 1.0,
      "duration_ms": 6500,
      "description": "Dot grid progressive color fill animation (grey #e2e4e8 to red #e64848 / orange #f59e0b) across 70 matrix dots in raster order."
    },
    {
      "id": "UN01-M002",
      "time_seconds": 8.0,
      "duration_ms": 1500,
      "description": "Entrance fade and upward slide of bottom explanatory copy and green 'Continue' CTA button."
    },
    {
      "id": "UN01-M003",
      "time_seconds": 11.53,
      "duration_ms": 500,
      "description": "User tap on 'Continue' button (scale depression) followed by full-screen leftward slide push transition to feelings survey."
    },
    {
      "id": "UN01-M004",
      "time_seconds": 12.8,
      "duration_ms": 4700,
      "description": "Vertical inertial touch drag scroll of survey options list and consecutive card selection toggle taps ('Guilty', 'Empty', 'Low energy')."
    },
    {
      "id": "UN01-M005",
      "time_seconds": 17.67,
      "duration_ms": 633,
      "description": "User tap on enabled 'Continue' CTA and leftward navigation push transition to reassurance screen."
    },
    {
      "id": "UN01-M006",
      "time_seconds": 18.3,
      "duration_ms": 6533,
      "description": "Continuous vector character loop animation: pink brain crying, nodding, and holding yellow clipboard with pencil."
    },
    {
      "id": "UN01-M007",
      "time_seconds": 25.07,
      "duration_ms": 633,
      "description": "User tap on 'Continue' CTA followed by horizontal push transition to value proposition screen."
    },
    {
      "id": "UN01-M008",
      "time_seconds": 25.7,
      "duration_ms": 4800,
      "description": "Animated vector keyframe character loop: pink brain raising right arm and flexing bicep with spring overshoot."
    },
    {
      "id": "UN01-M009",
      "time_seconds": 30.53,
      "duration_ms": 633,
      "description": "User tap on 'Continue' CTA followed by leftward slide transition to dual-curve outcome graph screen."
    },
    {
      "id": "UN01-M010",
      "time_seconds": 31.0,
      "duration_ms": 2000,
      "description": "SVG stroke-dashoffset path draw animation of red 'Scrolling' downward curve and green 'Living' upward S-curve across Day 1 to Day 30."
    },
    {
      "id": "UN01-M011",
      "time_seconds": 34.93,
      "duration_ms": 733,
      "description": "User tap on 'Got it!' CTA button followed by horizontal slide push transition to rating & social proof screen."
    },
    {
      "id": "UN01-M012",
      "time_seconds": 36.8,
      "duration_ms": 5200,
      "description": "In-app review modal pop-in with backdrop blur, 5-star rating selection tap (#007aff fill), Submit tap, feedback state, and OK dismissal tap."
    },
    {
      "id": "UN01-M013",
      "time_seconds": 43.5,
      "duration_ms": 10500,
      "description": "Horizontal touch carousel pagination swipe gestures browsing through user testimonial cards (Josh, Jenna, Pete, Kim)."
    },
    {
      "id": "UN01-M014",
      "time_seconds": 54.57,
      "duration_ms": 633,
      "description": "User tap on 'Continue' button followed by leftward push slide transition to Brian Smarter / ATT screen."
    },
    {
      "id": "UN01-M015",
      "time_seconds": 55.5,
      "duration_ms": 5166,
      "description": "Meditating brain floating vector loop animation, user tap on 'Continue', iOS ATT permission modal presentation, and user tap on 'Allow'."
    },
    {
      "id": "UN01-M016",
      "time_seconds": 60.97,
      "duration_ms": 5966,
      "description": "Navigation transition, yellow notification bell swinging oscillation animation, user tap on 'Allow Notifications', and native iOS notification permission dialog tap on 'Allow'."
    },
    {
      "id": "UN01-M017",
      "time_seconds": 67.0,
      "duration_ms": 4300,
      "description": "User press-and-hold touch gesture on green fingerprint button triggering exponential radial green circle fill expanding outward from button center to cover 100% viewport."
    },
    {
      "id": "UN01-M018",
      "time_seconds": 71.5,
      "duration_ms": 11833,
      "description": "Typewriter letter-by-letter reveal of 'Unrot' headline on full-bleed green background, body copy fade-in, upward entrance of white 'Let's go' button, and user tap."
    },
    {
      "id": "UN01-M019",
      "time_seconds": 83.87,
      "duration_ms": 6733,
      "description": "Clockwise circular SVG stroke progress ring animation (0% to 100%) and staggered pop-in checklist validations for analysis, profile, and habits."
    },
    {
      "id": "UN01-M020",
      "time_seconds": 90.6,
      "duration_ms": 10733,
      "description": "Sales page entrance transition, blue sky/grassy hill background reveal, and looping dumbbell overhead lifting brain character animation with sweat particle spray."
    },
    {
      "id": "UN01-M021",
      "time_seconds": 101.4,
      "duration_ms": 7100,
      "description": "Vertical touch drag scroll through 4-week roadmap cards, countdown offer box, and persistent sticky pinning of bottom 'Start My Unrot Journey' CTA."
    },
    {
      "id": "UN01-M022",
      "time_seconds": 109.3,
      "duration_ms": 5000,
      "description": "User tap on 'Unrot' segmented switch toggle triggering spring thumb slide dx=120px, container background morph (Red #d9383a to Blue #219ef7), character expression switch, and card crossfade."
    },
    {
      "id": "UN01-M023",
      "time_seconds": 107.0,
      "duration_ms": 8333,
      "description": "Continuous dual-row infinite marquee ticker tape auto-scrolling horizontally in opposing directions (+60px/s and -60px/s)."
    },
    {
      "id": "UN01-M024",
      "time_seconds": 115.57,
      "duration_ms": 11366,
      "description": "Extended vertical scroll down through testimonials, FAQ accordions, 1Hz countdown timer decrementing, and user tap on 'Claim Limited Discount' / 'Start My Unrot Journey'."
    },
    {
      "id": "UN01-M025",
      "time_seconds": 127.0,
      "duration_ms": 4133,
      "description": "Unrot Pro Paywall bottom sheet modal slide-up entrance (dy=-1168px), phone mockup fan display, selected yearly discount radio card, and user tap on top-right close 'X'."
    },
    {
      "id": "UN01-M026",
      "time_seconds": 131.2,
      "duration_ms": 1433,
      "description": "Paywall Pro dismissal and immediate downsell pop-up presentation: '93% OFF' banner, forest scene vector illustration, 4 multicolored feature bullets, and discounted annual pricing."
    },
    {
      "id": "UN01-M027",
      "time_seconds": 137.57,
      "duration_ms": 467,
      "description": "User tap on top-right close 'X' (x=505, y=75), modal downward slide dismissal (dy=+1168px), and return to Sales Page resting at bottom countdown timer state [04:20]."
    }
  ]
}
```
