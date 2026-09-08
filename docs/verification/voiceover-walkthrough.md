# VoiceOver walkthrough — onboarding → setup → Home → ceremony

The acceptance for P2-T25 is a recorded VoiceOver pass over the four surfaces below. The automated
audits (`app-next/src/testing/__tests__/screens-a11y.test.tsx`, `screens-dynamic-type.test.tsx`) prove
every control has a role, a name and the `accessible` flag; this script checks what the audits cannot:
reading order, what the rotor lands on, and whether the announcements arrive at the right moment.

## Setup

1. Dev build on the simulator (`npm run ios` in `app-next/`), then load the fresh scenario:
   `xcrun simctl openurl booted "excerlock://dev?scenario=fresh-install"`.
2. The iOS Simulator has no VoiceOver. Use **Accessibility Inspector** (Xcode → Open Developer Tool →
   Accessibility Inspector), target the simulator, turn on *Speak* in the inspector's navigation pane
   and step elements with the ▶ arrows. For real gestures, repeat on a device: Settings → Accessibility
   → VoiceOver, triple-click the side button to toggle.
3. Record: `xcrun simctl io booted recordVideo --codec h264 ~/Desktop/voiceover-walkthrough.mp4`
   (stop with Ctrl-C). On a device, Control Center → Screen Recording.
4. Dynamic Type check afterwards: Settings → Accessibility → Display & Text Size → Larger Text, drag to
   the top accessibility size, then revisit Home, Conditions, Analytics, the builder summary and both
   ceremonies. Nothing clips, every row grows, the ceremony pills wrap.
5. Locale check: Settings → General → Date & Time → 24-Hour Time on. Home's status and every schedule
   read "09:00–21:00". Settings → General → Language & Region → Region Germany: "5.000" steps, week
   starts on Monday in the day picker; Region United States: "5,000", week starts on Sunday. The clock
   setting is read through Intl (`app-next/src/content/locale.ts`); if the 24-hour toggle alone does not
   change the labels while a 24-hour region does, that is the open item in P2-T25 and needs
   expo-localization's `uses24hourClock`.

## Route and what to expect

Step with the inspector or swipe right. "Reads" is the element description; "Announces" is an
unprompted announcement (the inspector shows these in its notifications log).

### Onboarding

| Stop | Reads | Pass when |
| --- | --- | --- |
| O01 | Header "Block apps. Exercise more.", the lock artwork as one image, then "Get started, button" | The artwork is one element, not one per tile; legal links read as two buttons |
| O02–O03 | Header, illustrative caption, "Get started" | The trend card is one described element |
| O04–O09 | Header, each answer as "radio, <label>" with the selected state, "Continue, button, dimmed" until an answer | Continue reads dimmed, not silent |
| O10 | Slider as "adjustable, <label>, <value>"; swipe up/down changes the value | Value speaks after each adjust |
| O11–O14 | Each scene's caption once; hidden layers are skipped | No duplicate captions from crossfading layers |
| O16–O18 | Habit-loop stage captions and centre label, current phase only | Captions of inactive phases are not read |
| O20 | "What exercise should unlock your apps?", four "radio" tiles named Walking, Gym, Running, Biking | Names match the picker vocabulary |
| W1–W3 | Place and mode radios, "Daily step goal, adjustable" | Adjustable exposes increment/decrement actions |
| S1 | Day picker as seven "checkbox" elements Mon…Sun (Sun…Sat with a Sunday-start region), "All day, switch", start and end time buttons | Time buttons read the device clock format |
| S3 | "Your plan is ready", rows Activity / Goal / Schedule each with a distinct "Edit <thing>" button | Edit buttons are not three identical "Edit"s |
| T1–T4, P | Trial timeline, "Enable reminders" and "Maybe later", paywall plans as "radio, Annual/Monthly", "Continue", Terms and Privacy as buttons | Price and renewal sentence are read |

### Setup

| Stop | Reads | Pass when |
| --- | --- | --- |
| X1 | "Choose apps to block" primer, "Lock list" row with its count | Row value (e.g. "3 apps") reads with the title |
| X2 | Screen Time primer, prompt buttons Allow / Don't allow in the fake prompt | Prompt is reachable first when it appears |
| X3a (gym) | "Pick your gym", search field as "search, Search for a gym" | Field is a labelled text input |
| X3b (walking) | "Let ExcerLock count your steps", permission row with status | Status ("Granted"/"Not yet") is part of the row name |
| X4 | Notifications primer | — |
| X5 | Checklist rows read title and status; a missing grant reads its "Fix" button | — |

### Home

| Stop | Reads | Pass when |
| --- | --- | --- |
| Heading | "Hi, <name>", today's date in the device locale, "<n> day streak" | Streak badge is a single element |
| Status card | "Apps are blocked" header, subtitle, schedule "Block from 9 AM to 9 PM until you walk 5,000 steps" | Reads 09:00–21:00 with 24-hour time on |
| Condition rows | Each row as one element with title, progress and status; the pills beneath as "Walk on a treadmill, button" etc. | Rows are not split into title / number / status fragments |
| Lock list, Analytics, History rows | "button, <title>, <value>" | — |
| Edit / Add, Add condition | Buttons | — |
| Hydration notice (only after a bad restore) | "alert" first in reading order, then "Dismiss, button" | — |

### Ceremony (treadmill and gym)

Open a pill on a locked Home (treadmill: scenario `home-walking-session`; gym: `unlock-gym-inside`,
whose presence control in the dev menu is set to inside).

| Stop | Reads / announces | Pass when |
| --- | --- | --- |
| Header | "Close unlock screen, button"; "Unlock preview" when opened from the dev menu | — |
| Ring | "Scan progress, progress bar, 0 percent" (treadmill) or "Presence check, progress bar" (gym) | The ring is focusable and its percentage rises while scanning / confirming |
| Detection | Announces "Exercise detected" (treadmill) or "Location detected at the gym" (gym) about half a second after the shackle lifts | Announcement arrives without moving focus |
| Unlock | About a second later announces the unlock body: "Unlocked while you walk", "Unlocked for the rest of today", or "Unlocked until 9 PM"; the ring now reads the detected title and body as its value | Both announcements arrive, in order |
| Done | "Done, button" | Focus can reach it without passing decorative elements |
| Lapsed (scenario `billing-issue`) | Unlock body reads "Your apps aren't blocked right now", "See plans, button" | — |

## Recording the result

Attach the video to the P2-T25 PR and note any stop that failed with the element description the
inspector showed. A failed stop is a bug: fix it inline or file it the same session
(`docs/agents/issue-tracker.md`).
