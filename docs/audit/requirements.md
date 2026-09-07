# ExcerLock — Requirements Catalog (what the product promises the user)

Read-only audit. Every entry below is traced to a line in one of the six authorised sources. Nothing
here is inferred from code; where a source is silent the entry says so.

## Source aliases (absolute paths)

| Alias | Absolute path | Lines |
| --- | --- | --- |
| `PRD` | `/Users/johansardar/ExcerLock/excerlock-app-prd.md` | 572 |
| `DEC` | `/Users/johansardar/ExcerLock/plans/rebuild/00-decisions.md` | 85 |
| `MODEL` | `/Users/johansardar/ExcerLock/plans/rebuild/01-product-model.md` | 222 |
| `SCREENS` | `/Users/johansardar/ExcerLock/plans/rebuild/02-screen-inventory.md` | 205 |
| `AHA` | `/Users/johansardar/ExcerLock/docs/specs/aha-unlock-screens.md` | 289 |
| `TREAD` | `/Users/johansardar/ExcerLock/docs/specs/treadmill-mode.md` | 201 |

Citations are `ALIAS:line`, e.g. `DEC:23`.

## How to read `status-in-spec`

- **decided** — binding for the app being shipped (`app-next`). The decision register (`DEC`) and the
  two rebuild plan files are the top of the hierarchy; `AHA` is the newest source (2026-09-07) and
  explicitly supersedes parts of both `DEC` and `PRD`.
- **open** — the source itself marks it unresolved (an `E`-row in `DEC`, or an *assumed* / "Open items"
  line in `AHA`).
- **cut-for-v1** — the source explicitly kills it. Listed here so later audit stages do **not** raise it
  as a missing feature.
- **superseded** — the `PRD` promises it, but a later binding source replaced the promise with a
  different one. Also listed so later stages do not chase it.

**Hierarchy note (applies to every `superseded` row):** `PRD` is dated 2026-06/07/08 and describes the
*time-bank* product (balance, allowance, earn/spend, rate conditions, vendor connections). `DEC:22`
(B1) removes the time bank and `DEC:78-85` (section F) lists everything downstream of it as out of v1.
`PRD` is therefore a historical spec for large stretches; its still-live promises are marked *decided*
below and are usually re-stated by `MODEL`/`SCREENS`.

---

# 1. condition-types

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-001 | A "condition" (internally: rule) is one exercise requirement that carries its own schedule; the user's first one is created in onboarding and more are added in the Conditions tab. | `MODEL:11` | decided | User-facing word is **condition**; the code word is **rule** (`MODEL:11`). |
| REQ-002 | Exactly three rule kinds exist: **target** (step goal, minutes at gym, run/bike minutes or distance), **event** (arrive at gym), **state** (while walking). | `DEC:25` | decided | The **rate** kind is gone (`DEC:25`). |
| REQ-003 | Exactly four activities exist: **Walking, Gym, Running, Biking**. | `DEC:31` | decided | Swimming, calories, active minutes, "any workout" and every vendor condition are gone (`DEC:31`). |
| REQ-004 | Walking · step target: "walk N steps today" unlocks the apps. | `MODEL:34`, `MODEL:156` | decided | Goal 500–30,000 in steps of 500, default 5,000 (`MODEL:82`). Met when `progress >= goal` (`MODEL:156`). |
| REQ-005 | Walking · state: "unlocked only while walking" — apps open while a verified walking session is live, and re-lock when it lapses. | `DEC:24`, `MODEL:35` | decided | A state rule is **never** "met" (`MODEL:157`); it only opens apps live. |
| REQ-006 | A walking rule carries a **place**: `outside`, `treadmill` or `either`. | `MODEL:44` | decided | Onboarding W1 offers "Outside (Recommended) · Treadmill · Either" (`SCREENS:57`). |
| REQ-007 | Gym · event: "arrive at the gym" unlocks the apps on the first arrival today. | `MODEL:36`, `MODEL:158` | decided | Met on **first arrival today** — repeat arrivals do not re-fire (`MODEL:158`). |
| REQ-008 | Gym · target: "spend N minutes at the gym" unlocks the apps. | `MODEL:37`, `MODEL:159` | decided | Goal 10–180 minutes, default 30 (`MODEL:83`); presets 30/45/60 (`SCREENS:66`). |
| REQ-009 | Running · target by minutes, or by distance with a km/mi unit. | `MODEL:38-39` | decided | Minutes 5–300 default 20; distance 0.5–50 km / 0.25–30 mi, default 2 mi / 3 km (`MODEL:83-84`). |
| REQ-010 | Biking · target by minutes, or by distance with a km/mi unit. | `MODEL:40-41` | decided | Minutes 5–300 default 30; distance 1–200 km / 1–120 mi, default 5 mi / 8 km (`MODEL:83-85`). |
| REQ-011 | A rule can be paused with a toggle; a paused rule never locks and never counts. | `DEC:30`, `MODEL:29` | decided | Pausing removes the rule from every lock-resolution branch immediately (`MODEL:139`). |
| REQ-012 | Goal fields are validated against fixed ranges and steps; out-of-range shows an error. | `MODEL:82-85`, `SCREENS:59` | decided | W3 has an "invalid range error" state (`SCREENS:59`). |
| REQ-013 | Multiple rules may exist at once and may overlap in days, times and activities; there is **no** conflict validation beyond completeness. | `DEC:26` | decided | Explicitly no uniqueness or overlap verdicts (`MODEL:217-218` calls the old ones obsolete). |
| REQ-014 | Rules are created and edited through one builder that reuses the onboarding branch screens (activity → branch → schedule → summary with Save). | `SCREENS:142-144` | decided | Edit mode opens at the summary with Edit links; Cancel confirms if dirty (`SCREENS:143-144`). |
| REQ-015 | ~~Rate conditions (metric → screen-time exchange, continuous pro-rata crediting)~~ | `PRD:55`, `DEC:25`, `DEC:79` | cut-for-v1 | Do not flag as missing. |
| REQ-016 | ~~Condition uniqueness key (kind+signal+source+place), event×rate exclusion, picker grey-outs with inline reason~~ | `PRD:57-61` | superseded | Replaced by "no conflict validation" (`DEC:26`). |
| REQ-017 | ~~Per-condition **active window** (start/end time on the condition itself)~~ | `PRD:79` | superseded | Replaced by per-rule `Schedule` (`MODEL:47-53`); functionally similar but the field name and semantics are the rebuild's. |
| REQ-018 | ~~Condition banners: 21-image curated library + own-photo, full-bleed card artwork, per-gym cycling~~ | `PRD:68`, `PRD:258-262` | superseded | `SCREENS` describes `RuleCard` as icon + text + switch (`SCREENS:137`); no banner system anywhere in the rebuild plan. |
| REQ-019 | ~~Catalog-first builder with human-named catalog entries grouped by activity, five steps incl. data-source pick~~ | `PRD:63-68` | superseded | Replaced by the 2×2 activity grid + branch screens (`SCREENS:44`, `SCREENS:142`). |
| REQ-020 | ~~Swimming, active-calorie, active-minute, "finish any workout of ≥N min" conditions~~ | `PRD:75-76`, `DEC:31` | cut-for-v1 | Do not flag as missing. |
| REQ-021 | ~~Vendor-sourced conditions (Strava / Oura / Whoop / Polar / Hevy / Concept2) and per-condition data-source picking~~ | `PRD:135-139`, `DEC:31`, `DEC:65` | cut-for-v1 | `PRD:139` "zero direct vendor integrations"; `DEC:65` deletes the server routes too. **Contradiction:** `PRD:358` still says all four Tier-1 vendors "ship in v1 with webhooks" — that line was never reconciled with the 2026-08-01 cut banner at `PRD:135`. |

---

# 2. schedule

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-022 | Each rule carries its **own** days-of-week and time window (or all-day). | `DEC:30`, `MODEL:47-53` | decided | `days` must be non-empty (`MODEL:81`). |
| REQ-023 | A time window is either `allDay` or a `range` of minutes-after-local-midnight. | `MODEL:49-52` | decided | `startMinute === endMinute` is invalid; a range must be ≥15 minutes long (`MODEL:52`, `MODEL:81`). |
| REQ-024 | A window whose end is at or before its start crosses midnight and ends the next day. | `MODEL:51` | decided | "A window 20:00–02:00 met at 23:30 → open through 02:00 and until the next window start (tomorrow 20:00)" (`MODEL:137`). |
| REQ-025 | A rule produces one **window instance** per scheduled weekday; the instance belongs to the local date it *starts* on, and "met" is recorded against that date. | `MODEL:145-148` | decided | "A window 20:00–02:00 not met, at 01:00 the next day → locked; the active instance is yesterday's" (`MODEL:138`). |
| REQ-026 | Onboarding recommends **Mon–Fri, 9:00 AM–9:00 PM**, pre-selected but editable. | `MODEL:86-87`, `SCREENS:87` | decided | Live summary line "Mon–Fri · 9 AM–9 PM"; errors: no days selected, window < 15 min; plus an "All day" switch (`SCREENS:87`). |
| REQ-027 | A "day" is a local calendar day, midnight to midnight, in the device's current timezone. | `MODEL:17` | decided | No user-set day boundary exists in the rebuild. |
| REQ-028 | ~~Global schedule layer: rest days, holiday dates, one-day overrides, global lock windows~~ | `DEC:30`, `DEC:79` | cut-for-v1 | Explicitly cut. Do not flag `PRD:206-214` as missing. |
| REQ-029 | ~~Active / Rest / Custom day types and the default week Mon–Sat Active + Sunday Rest~~ | `PRD:206-207` | cut-for-v1 | Superseded by per-rule `days` (`DEC:30`). |
| REQ-030 | ~~Sick-day override (buried, unlimited, type-a-reason, preserves streak, logged)~~ | `PRD:211` | cut-for-v1 | Part of the cut global schedule layer (`DEC:30`). **Contradiction:** the PRD's own diagnostics field list still asks for "vacation mode, sick tokens remaining" (`PRD:393`) although both were cut (`PRD:212`, `PRD:378`). |
| REQ-031 | ~~Vacation mode~~ | `PRD:212` | cut-for-v1 | Cut in the PRD itself 2026-07-28. |
| REQ-032 | ~~Presets / named starting configurations~~ | `PRD:216` | cut-for-v1 | "No preset concept in v1". |
| REQ-033 | ~~User-set day boundary (opt-in, any time) and *Start week on* setting~~ | `PRD:376`, `PRD:288` | superseded | `MODEL:17` fixes the day at local midnight; `SCREENS:166` lists no such preference rows. |

---

# 3. lock-decision

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-034 | One pure function `resolveLock` decides the lock state from now, timezone, rules, today's/yesterday's rule-days and the walking session. | `MODEL:92-110` | decided | Phase 1 drives it from the fake store; Phase 2 hands its output to the Screen Time adapter (`MODEL:92-93`). |
| REQ-035 | Six lock states exist: `noRulesToday`, `beforeWindow`, `locked`, `unlockedMet`, `unlockedWalking`, `afterWindow`. | `MODEL:96-102` | decided | Each carries its own payload (next lock time, active rule ids + hint, relock time, lease). |
| REQ-036 | **Priority 1 — a live walking session wins over everything**, including an unmet target rule in the same window. | `MODEL:115-117` | decided | Requires: state rule enabled, scheduled now, session in phase `walking` or `grace`, `leaseUntil > now`. |
| REQ-037 | **Priority 2 — met wins**: if any enabled non-state rule is met for the current window instance's day, the apps are open. | `MODEL:118-121`, `DEC:23` | decided | "A met rule unlocks the apps for the rest of the blocking window and the rest of the day, no matter what" (`DEC:23`). |
| REQ-038 | `relockAt` is the start of the next window instance of **any** enabled rule that begins on a **later day** than the met instance's day. | `MODEL:119-120` | decided | Consequence: a *second* rule's later window **today** does not re-lock the apps (`MODEL:132-134`). |
| REQ-039 | **Priority 3 — locked**: at least one enabled non-state rule is active now and nothing above applies; every active rule is listed. | `MODEL:122-124` | decided | A state rule active now with no live session also contributes to `locked` (`MODEL:123`). |
| REQ-040 | **Priority 4 — beforeWindow**: no rule active now but one starts later today; report the earliest start. | `MODEL:125-126` | decided | |
| REQ-041 | **Priority 5 — afterWindow / noRulesToday**. | `MODEL:127-128` | decided | |
| REQ-042 | Progress is measured from **local midnight of the instance day**, not from the window start — activity done before the window counts. | `DEC:29`, `MODEL:152` | decided | "5,000 steps at 8 AM satisfy a 9 AM–9 PM rule and the apps never lock that day" (`DEC:29`). |
| REQ-043 | Inside a rule's window there are **no free minutes** — the apps are locked until a rule is met. | `DEC:28` | decided | |
| REQ-044 | Once `met` is true for a day it stays true; deleting the underlying HealthKit sample does not un-meet it. | `MODEL:163` | decided | |
| REQ-045 | Pausing a rule removes it from every branch of lock resolution immediately. | `MODEL:139` | decided | |
| REQ-046 | On a timezone change `resolveLock` re-runs with the new zone; met flags recorded under the old zone's day key are **not** re-mapped. | `MODEL:140-141` | decided | Explicitly an accepted edge, not a bug. |
| REQ-047 | The locked state tells the user the **cheapest** next unlock: immediate actions rank first, then numeric remainders compared only within the same unit. | `MODEL:167-170` | decided | Copy examples demanded: "Walk 1,240 more steps", "Arrive at Gold's Gym", "Start a walk to unlock while you walk", "Run 12 more minutes" (`MODEL:169-170`). |
| REQ-048 | ~~Daily time balance that drains in real time as one shared pool, resets at a day boundary, and is topped up by earning~~ | `PRD:36-40`, `DEC:22` | cut-for-v1 | The time bank is removed: no allowance, earned minutes, drain ladder, rollover, reward amount or per-step rate (`DEC:22`). |
| REQ-049 | ~~Base allowance picker and "Full Lock" (allowance = 0)~~ | `PRD:43-44` | cut-for-v1 | Downstream of the time bank (`DEC:22`, `DEC:78`). |
| REQ-050 | ~~Reward payout menu: fixed chunk / rest of day / set period, with repeatable + per-day cap~~ | `PRD:54`, `PRD:364` | cut-for-v1 | Replaced by the single fixed consequence in `DEC:23`. |
| REQ-051 | ~~Rollover of unused balance~~ | `PRD:364` | cut-for-v1 | |

---

# 4. stacking-multiple-conditions

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-052 | There is **one global set of locked apps**, not one per rule. | `DEC:27` | decided | |
| REQ-053 | Any met rule overrules any unmet rule: if any rule is met today, the apps are open. | `DEC:27`, `MODEL:118` | decided | |
| REQ-054 | Overlapping rules must be tested: A (Mon–Fri 9–12) met at 10:00 + B (daily 18–22) unmet → at 19:00 the apps are open; relock is B's next start on a later day, unless A's window tomorrow starts first. | `MODEL:132-134` | decided | Named as a required test case. |
| REQ-055 | A state rule and a target rule on the same days must be tested: before the goal the apps open only during a walking session; after the goal they are open for the rest of the day. | `MODEL:135-136` | decided | Named as a required test case. |
| REQ-056 | The Home progress list shows one card per enabled rule scheduled today. | `SCREENS:127` | decided | |
| REQ-057 | If both a treadmill-eligible walking rule and a gym rule are active, two entry pills stack inside the Home lock, gym first. | `AHA:34-35` | open | Marked *assumed* in the spec (`AHA:35`). |
| REQ-058 | ~~One shared balance fed by any number of conditions, with per-condition caps and cooldowns on top and no global cap~~ | `PRD:81` | cut-for-v1 | Downstream of the time bank. |

---

# 5. cooldowns-and-timers

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-059 | A walking session's unlock is granted as a renewable **15-minute lease**; a lapsed lease ends the session and re-locks the apps. | `MODEL:76-79`, `DEC:24` | decided | 15 min is Apple's DeviceActivity monitoring floor (`TREAD:45`, `PRD:128`); app-fixed, never user-set (`PRD:128`). |
| REQ-060 | The gym check-in ring runs a fixed **30-second** presence confirmation before the reward books. | `AHA:189-192`, `PRD:186` | decided | App-fixed engine constant, a debounce and not a "stay this long" rule (`PRD:186`). If presence flips to outside during the 30 s the ring drains, copy returns to the outside state, button hides — **no partial credit** (`AHA:191-192`). |
| REQ-061 | The walking **stop grace period** is user-set, 30 s–5 min, and is exposed in Settings. | `PRD:118`, `PRD:373`, `SCREENS:166` | decided | Floor is 30 s because that is iOS's own stop-detection lag (`PRD:373`); "so red lights and tying a shoe don't punish" (`PRD:118`). |
| REQ-062 | The treadmill timer table is fixed: camera scan adaptive with a 5 s cap · propped lease 15 min · pre-expiry warning 30 s before · pickup→cadence grace 20 s · put-down handoff 60 s · exit grace 30 s–5 min (the only user-configurable one). | `TREAD:106-115` | decided | The 60 s handoff is explicitly "a technical handoff window, not a preference" (`TREAD:97-98`). |
| REQ-063 | Setting the phone down **pauses** the condition's exit-grace countdown rather than racing it. | `TREAD:99-101` | decided | Without this, a 30-second exit grace would kill the session before the handoff completes (`TREAD:100-101`). |
| REQ-064 | A successful motion (handheld) verification **resets** the 15-minute propped lease. | `TREAD:91-92` | decided | "Users who handle their phone periodically are interrupted far less often." |
| REQ-065 | The gait scan has a 5-second attempt window (`GAIT_SCAN_TIMEOUT_MS`) and a 30-second framing grace (`GAIT_FAILURE_GRACE_MS`), both kept as built and both invisible to the user. | `AHA:130-132` | decided | "There is no separate 5-second countdown visible to the user" (`AHA:130-131`). |
| REQ-066 | ~~Per-condition same-source cooldown (Off or 15 min–8 h)~~ | `PRD:364` | cut-for-v1 | Downstream of the time bank / reward engine. |
| REQ-067 | ~~Per-condition per-day cap (1–10× or unlimited)~~ | `PRD:364` | cut-for-v1 | |
| REQ-068 | ~~5-minute per-vendor client-side polling cooldown~~ | `PRD:174` | cut-for-v1 | Vendors are gone (`DEC:31`, `DEC:65`). |

---

# 6. walking

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-069 | Walking step goals read the **phone pedometer (Core Motion)** — not HealthKit. | `DEC:32`, `MODEL:156` | decided | `CMPedometer.queryPedometerData` from day start plus live updates (`MODEL:156`). |
| REQ-070 | A walking session is verified by cadence **and** activity classification; standing/swaying must not qualify. | `MODEL:157`, `PRD:123` | decided | Qualifying condition = "classified as walking AND cadence above threshold, sustained" (`PRD:123`). |
| REQ-071 | The cadence threshold is **app-fixed**, never a user setting. | `PRD:123`, `PRD:373` | decided | PRD says "starting around ~60–70 steps/min" tuned on device (`PRD:123`); `TREAD:9` states the built threshold as **65 steps/min across two consecutive samples**. "A user-tunable one is just a cheat dial" (`PRD:123`). |
| REQ-072 | Treadmill and indoor walking qualify for handheld walking verification — no attempt is made to require "outdoors". | `PRD:123`, `TREAD:7-8` | decided | Same honor-system spirit as home gyms (`PRD:123`). |
| REQ-073 | The walking session sheet runs Start → verifying (cadence) → walking (lease countdown) → grace → ended. | `SCREENS:182`, `MODEL:79` | decided | Phase names in the model: `verifying · walking · grace · ended` (`MODEL:79`). |
| REQ-074 | Home shows a live walking state: "Unlocked while you walk", a lease countdown, and a **Stop** button. | `SCREENS:122` | decided | Exact heading copy quoted in the source. |
| REQ-075 | A state rule's Home card offers "Start a walk"; a target rule's card shows progress and remaining. | `SCREENS:127` | decided | Copy example "1,240 / 5,000 steps" (`SCREENS:127`). |
| REQ-076 | State-mode-only days count toward the streak only if a walking session of **≥ 10 minutes** happened — an app-fixed integrity constant. | `MODEL:175-176`, `PRD:219` | decided | Deliberately not user-settable (`PRD:219`). |
| REQ-077 | Walking onboarding branch: W1 place → W2 "How should walking unlock apps?" (Reach a step goal (Recommended) · Unlock while walking) → W3 step goal. | `SCREENS:57-59` | decided | Each W2 row carries one support line; "Earn time per step" was **removed** (`SCREENS:58`, `DEC:53`). W3 helper: "About N minutes of walking" (`SCREENS:59`). |
| REQ-078 | ~~Walk sessions are always full price (usage drains the balance at the normal rate; the balance clamps at zero)~~ | `PRD:119` | cut-for-v1 | No balance exists (`DEC:22`). The surviving half — walking grants access while nothing else does — is REQ-036. |
| REQ-079 | ~~"Walking beats everything": a session lifts shields through Full Lock and lock windows alike~~ | `PRD:120` | superseded | Survives in spirit as lock-resolution priority 1 (`MODEL:115-117`); Full Lock and lock windows no longer exist. |
| REQ-080 | ~~No per-day session cap — walking always works, unlimited times a day~~ | `PRD:120`, `PRD:373` | decided | Still true by omission: neither `MODEL` nor `SCREENS` defines any session cap. |
| REQ-081 | Walking sessions are explicitly started, never ambient. | `PRD:117`, `TREAD:50-53` | decided | The user starts a session from the app (or, in the old design, from the shield button). |

---

# 7. treadmill

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-082 | Treadmill / camera (gait-vision) verification stays in v1, together with placement classification, walking session/lease logic and the on-device test harness — **ported from the old app, not rewritten**. | `DEC:33` | decided | Phase 2 work (`DEC:33`, `AHA:277-279`). |
| REQ-083 | The problem being solved: the phone **propped on the console/desk** while the user walks reports zero steps, so the session dies although the user is genuinely exercising. | `TREAD:11-16` | decided | Phone-in-hand treadmill walking already works and stays unchanged (`TREAD:51-53`). |
| REQ-084 | Propped mode must be **explicitly started in the app**; that deliberate act is what authorises the camera path. There is no per-condition setting and no card toggle. | `TREAD:49-55` | decided | |
| REQ-085 | Treadmill mode **earns nothing** — it is purely an access gate. | `TREAD:23-26` | decided | Written against the old ledger ("states never bank"); under `DEC:22` nothing banks at all, so the promise survives unchanged. |
| REQ-086 | `SCANNING`: the front camera runs Vision body-pose detection looking for vertical oscillation of shoulder and hip landmarks in the 1.2–3 Hz band. | `TREAD:60-72` | decided | |
| REQ-087 | The scan is adaptive with a 5-second cap — released as soon as 4–5 clean strides are seen (typically 3–4 s), with a live progress ring, auto-dismiss on success and **no tap required**. | `TREAD:66-68` | decided | |
| REQ-088 | The camera session is torn down the instant confidence is reached. | `TREAD:69`, `AHA:135` | decided | |
| REQ-089 | `PROPPED`: no re-verification while propped; the treadmill is assumed to still be running; a 15-minute lease runs from the scan and at expiry the shield returns and a new scan is required. | `TREAD:73-79` | decided | |
| REQ-090 | 30 seconds before lease expiry a notification warns the user, so they can pick the phone up and be verified by motion instead. | `TREAD:78-79`, `DEC:35` | decided | This is one of only two notifications in v1 (`DEC:35`). |
| REQ-091 | `HANDHELD`: pickup is detected from returning micro-tremor and a changing gravity vector within about a second; a 20-second handoff grace keeps the session unlocked while the pedometer settles. | `TREAD:81-90` | decided | No cadence by the end of the grace → normal exit-grace rules apply (`TREAD:93`). |
| REQ-092 | `HANDOFF`: setting the phone down opens a fixed 60-second window; at its end a fresh camera scan is required, which means shielding so the user can reach the app UI. | `TREAD:95-104` | decided | |
| REQ-093 | Never shield silently on a failed scan. | `TREAD:131` | decided | Binding rule for all failure paths. |
| REQ-094 | Framing failure (no person, too dark, aimed at the ceiling) shows **"Can't see you — step into frame"** with a live preview and allows 30 seconds before shielding. | `TREAD:133-134` | decided | The `AHA` copy splits it: heading **"Can't see you"**, body **"Step into frame."** (`AHA:113`, `AHA:225`). |
| REQ-095 | Camera permission denied → propped mode is unavailable and the app falls back to ordinary handheld step verification. | `TREAD:135-136` | decided | `AHA:139-142` gives the exact screen: heading **"Camera access is off"**, body "Keep your phone with you. Walk & Scroll will verify your steps instead.", button **"Continue with phone in hand"**. |
| REQ-096 | Camera permission is requested the first time propped mode is started, **never** at onboarding. | `TREAD:137`, `AHA:121-122` | decided | |
| REQ-097 | Privacy promise: frames are processed in memory only, nothing written to disk, nothing transmitted; no recording, no frame retention, no face recognition — body-pose landmarks only; stated plainly on the scan screen. | `TREAD:139-143` | decided | On-screen copy: "Processed on this iPhone. Nothing is recorded or sent." (`AHA:117`, `AHA:226`). |
| REQ-098 | Efficiency budget: front camera 640×480 at 15 fps, pose on every other frame, session never outliving the check, target under 4 s; drop to 320×240 before extending duration. | `TREAD:123-126` | decided | |
| REQ-099 | With multiple people in frame, track the largest, most central body only. | `TREAD:127` | decided | Accepted residual: pointing the phone at another walking person is not defeated (`TREAD:190`). |
| REQ-100 | Known cheat vectors are accepted with named residuals: verify-then-step-off (≤15 min unearned), pick-up-and-step-off (~20 s), phantom steps while sitting (unknown until tested). | `TREAD:184-191` | decided | The phantom-step case is flagged "must be verified by test" (`TREAD:189`). |
| REQ-101 | The treadmill unlock is a **full-screen ceremony** entered from a white pill inside the Home lock labelled **"I'm using a treadmill"**. | `AHA:33`, `AHA:44` | decided | Applies **only** to `{kind:'state', activity:'walking', place:'treadmill'|'either'}` (`AHA:34`). Step-target walking, running, biking and outdoor walks get no ceremony (`AHA:43-45`). |
| REQ-102 | The scan **auto-starts** on the first qualifying stride; there is no Start button. | `AHA:118`, `AHA:128-130` | decided | Johan: "scan begins automatically once the gait is passing" (`AHA:118`). |
| REQ-103 | Treadmill screen headings by state: idle **"Prop your phone and walk"** / "Set it upright facing you. The scan starts on its own once you're walking."; scanning **"Reading your stride"** / "Keep walking. A few seconds."; framing **"Can't see you"** / "Step into frame."; success **"Exercise detected"** / "Unlocked while you walk". | `AHA:108-116`, `AHA:222-231` | decided | Exact strings are given in the copy block (`AHA:221-231`). |
| REQ-104 | On success the preview freezes on its last frame under a 20% orange tint "so the lifted lock still reads as the app, not a camera". | `AHA:136-137` | decided | |
| REQ-105 | On the 30-second framing grace expiring, the session stops and the screen pops back to Home with the existing "Walk complete" state — **never a silent shield**. | `AHA:138-139` | decided | |
| REQ-106 | Backgrounding during the scan stops the camera and returns to idle on foreground; the propped session is **not** stopped. | `AHA:143-144` | decided | |
| REQ-107 | Done returns to Home showing `unlockedWalking` with the lease clock (copy example "12:40 until renewal"). | `AHA:145-147` | decided | |
| REQ-108 | Out of scope for v1 but named as future upgrades: treadmill frame vibration, FTMS over Bluetooth, headphone motion, Apple Watch companion. | `TREAD:193-201` | cut-for-v1 | Tracked on issue #111. |
| REQ-109 | Whether "I'm using a treadmill" also appears for `place: 'either'` rules. | `AHA:286` | open | Assumed **yes**. |

---

# 8. gym

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-110 | Gym presence is confirmed by location: geofence auto-detect is **promoted**, manual check-in is **kept**, and gyms are saved by **map search and pin**. | `DEC:32` | decided | |
| REQ-111 | The user may save up to **5 gyms**. | `PRD:86`, `PRD:376`, `SCREENS:173` | decided | iOS caps monitored regions at 20 per app; 5 leaves headroom (`PRD:86`). Settings sub-screen `settings/gyms` states "max 5" (`SCREENS:173`). |
| REQ-112 | Each gym has an arrival radius. | `PRD:86` | **contradiction** | `PRD:86`/`PRD:376`: circle **starts at 100 m and drags 50–200 m**. `SCREENS:180`: "radius **fixed 100 m**". The rebuild source wins for `app-next`, but the two must be reconciled. |
| REQ-113 | Presence must survive GPS glitches and quick in-and-out: an app-fixed **30-second** presence-confirmation cooldown runs before a visit counts. There is **no dwell requirement**. | `PRD:186` | decided | "A momentary blip doesn't count; actually being there does" (`PRD:186`). |
| REQ-114 | **Instant relief on arrival, always on, no setting**: shields lift the moment arrival is detected while the reward only books after the 30 s confirmation; if confirmation fails, shields simply return — no punishment. | `PRD:191`, `AHA:190-192` | decided | |
| REQ-115 | Two-tier unlock: manual check-in on "while using" location is a complete product on its own; background auto-detect on "always" location is an opt-in **upgrade**, never a requirement. | `PRD:187-190` | decided | This is also the App Review story (`PRD:190`). |
| REQ-116 | Leave detection is best-effort by design; the app never builds a punishment on top of fuzzy exit timing (it never cancels a confirmed visit because of a late exit event). | `PRD:194-196` | decided | |
| REQ-117 | Home pinned as a "gym" is allowed (home gyms are real) — honor-system, not worth fighting; GPS spoofing is out of scope. | `PRD:201-202` | decided | |
| REQ-118 | The gym unlock is a full-screen ceremony entered from a white pill inside the Home lock labelled **"I'm at the gym"**, applying to both `event` and `target` gym rules. | `AHA:33-34` | decided | Replaces `CheckInSheet`, which is deleted (`AHA:50`). **Contradiction:** `SCREENS:181` still lists the `SH-checkin` manual check-in sheet ("You're at Gold's Gym?" confirm, distance hint, result). |
| REQ-119 | The gym screen's lock body is a **live Apple map** centred on the user, following until the user pans. | `AHA:38`, `AHA:161` | decided | |
| REQ-120 | Inside a saved gym's radius the map draws that gym's radius circle and pin; outside, neither is drawn at rest. | `AHA:162-167` | decided | Colour/geometry specified: `brand.primary` at 18% fill, 1.5 pt ring (`AHA:164`). |
| REQ-121 | Two floating map controls: **Center on me** and **Center on gym** (hidden when no gym is saved); "Center on gym" animates to the nearest saved gym and draws its circle and pin. | `AHA:168-172` | decided | Copy: `centerMe: 'Center on me'`, `centerGym: 'Center on gym'` (`AHA:238`). |
| REQ-122 | Gym screen headings by state: inside **"Location detected at the gym"** / "You're at {gym}."; outside **"Not at the gym yet"** / "You're {distance} from {nearest gym}."; confirming **"Confirming you're here"** / "Stay put for a moment."; no gym **"Save a gym first"** + button "Choose a gym"; denied **"Location access is off"** / "Allow location while using ExcerLock to check in." + "Open Settings". | `AHA:173-183`, `AHA:233-245` | decided | Distance is live, rounded to 10 m under 1 km, else 0.1 km (`AHA:176-177`). |
| REQ-123 | The **Unlock** button appears only when the user is inside; after tapping it becomes disabled/loading while the 30-second ring fills; after the lift it becomes **Done**. | `AHA:181-183` | decided | Button colour is *assumed* orange (`AHA:181-182`, `AHA:288-289`) — see REQ-124. |
| REQ-124 | Unlock-button colour on the gym screen (white per Johan's sketch vs orange per decision C1). | `AHA:288-289` | open | Assumed orange on the canvas, white pills only inside the orange lock. |
| REQ-125 | Success message differs by rule kind: event rules get **"Unlocked until {window end}"**, time-target rules get **"Your gym time is counting"** (arrival credit only starts the clock). | `AHA:194-196` | decided | |
| REQ-126 | Presence comes from `runtime.gym.observePresence` plus a foreground location sample on mount, so the first render is correct without waiting for a geofence event; with overlapping radii the **nearest gym wins**. | `AHA:186-188` | decided | |
| REQ-127 | If auto-detect already credited the arrival in the background, opening the gym screen shows the lifted state directly — no ring, no confetti. | `AHA:197-199` | open | Marked *assumed*; "Johan can flip this to a full replay later". |
| REQ-128 | The gym picker sheet offers map search, a results list, a map with a pin, a name field and Save; Phase 1 uses fake results and a static map image, Phase 2 MapKit search. | `SCREENS:180` | decided | Reachable from X3, Settings › Gyms and the gym rule's progress card (`SCREENS:180`). |
| REQ-129 | Gym target progress is geofence dwell time today (auto-detect) or checked-in time today (manual). | `MODEL:159` | decided | |
| REQ-130 | The Home gym card shows "Check in" (manual) and "Auto-detect on". | `SCREENS:127` | decided | Also, the former status line "Your next visit counts · Auto-detect off" moves under the entry pill (`AHA:39-41`). |
| REQ-131 | ~~Optional Wi-Fi-network confirmation of gym presence; map-POI "verified gym" vs "honor system" tags~~ | `PRD:86`, `PRD:401` | open | PRD lists Wi-Fi confirmation feasibility as an unresolved open item (`PRD:401`); no rebuild source mentions either feature. |

---

# 9. running-biking

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-132 | Running and biking read **HealthKit workouts only** — there is no in-app GPS tracker. | `DEC:32`, `MODEL:160-161`, `DEC:80` | decided | "In-app GPS run tracker" is on the out-of-v1 list (`DEC:80`). |
| REQ-133 | Running progress = HealthKit workouts of type running **started today**, summed duration or distance. | `MODEL:160` | decided | Met when `progress >= goal`. |
| REQ-134 | Biking progress = HealthKit workouts of type cycling started today. | `MODEL:161` | decided | |
| REQ-135 | Distance rules carry a km/mi unit; the units preference defaults from device locale and is editable in Settings. | `MODEL:39`, `MODEL:199`, `SCREENS:166` | decided | |
| REQ-136 | Running onboarding branch: R1 "What counts as a run?" (Run for a set time (Recommended) · Run a set distance) → R2 minutes (default 20, presets 15/20/30) or D distance. | `SCREENS:72-74` | decided | |
| REQ-137 | Biking onboarding branch: B1 "What counts as a bike ride?" (time recommended · distance) → B2 minutes (default 30, presets 20/30/45) or D distance. | `SCREENS:80-81` | decided | |
| REQ-138 | The distance screen `D` is one shared component for running and biking with different defaults (`NumberField` + km/mi unit dropdown). | `SCREENS:74` | decided | |
| REQ-139 | Only device-recorded activity counts; manually-typed Apple Health entries are silently ignored (filtered on the entry-source flag). | `PRD:102`, `PRD:192`, `PRD:203` | decided | "One filter, no fraud-detection system — earning means you actually did it" (`PRD:102`). No rebuild source repeats this filter; it is the only anti-cheat the PRD leaves for HealthKit data. |
| REQ-140 | Detection is honest, not instant: a goal is detected when Apple Health hands the data over — reliably when the user opens the app, best-effort in the background. **No instant hands-free unlock is promised.** | `PRD:105`, `PRD:339` | decided | iOS background delivery lags 15 min–1 hr+ and stops on force-quit (`PRD:339`). |
| REQ-141 | ~~Garmin users are detected and coached to enable Apple Health sync in Garmin Connect~~ | `PRD:109`, `PRD:397` | open | Listed as an unresolved onboarding open item in the PRD; absent from every rebuild source. |
| REQ-142 | ~~Fitbit, Coros, Samsung coverage~~ | `PRD:110` | cut-for-v1 | Known gap, revisit post-launch. |
| REQ-143 | ~~Swimming distance goals / exchanges~~ | `PRD:75`, `DEC:31` | cut-for-v1 | |

---

# 10. screen-time-enforcement

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-144 | Blocking is done by applying shields to a user-selected app group through Screen Time / ManagedSettings; the apps are **opaque tokens** to us (we never see names or bundle ids). | `PRD:179`, `MODEL:56-60` | decided | `LockedApps.handle` "never contains app names or bundle ids" (`MODEL:57`). |
| REQ-145 | Shields are OS-enforced: they survive force-quit, restart and reboot. | `PRD:180` | decided | |
| REQ-146 | One locked group in v1; per-app and per-category budgets, and per-location budgets, are out of scope. | `PRD:181`, `DEC:27` | decided | |
| REQ-147 | The UI shows the selection as "N apps · M categories". | `MODEL:58-59`, `SCREENS:105`, `SCREENS:128` | decided | Exact format quoted in both screens sources. |
| REQ-148 | Phone, Messages, Maps, ExcerLock itself and anything Apple exempts (emergency features) are **always exempt**. | `PRD:182` | decided | No rebuild source repeats this; it is a user-facing safety promise. |
| REQ-149 | The app keeps a **usage monitor on the locked apps** so Analytics can chart locked-app minutes per day and compute Time Reclaimed. | `DEC:36` | decided | Named as "the one native risk in Analytics" (Phase 2). |
| REQ-150 | Unlock windows are granted through DeviceActivity schedules that auto-re-shield when they lapse, so force-quitting the app caps any exploit at one 15-minute increment. | `PRD:128` | decided | Apple's official 15-minute minimum is used as-is; the community backdated-`intervalStart` hack is **explicitly rejected** (`PRD:128`). |
| REQ-151 | App selections **cannot** sync across devices (Apple ties Screen Time tokens to the device). | `DEC:64` | decided | |
| REQ-152 | Shipping requires Apple's FamilyControls **distribution** entitlement per bundle id and per extension; building/testing on device does not. | `PRD:340`, `PRD:398` | decided | Named as a launch blocker, not a build blocker. |
| REQ-153 | Fuzzy signals may end access early-but-gracefully; they never produce a punishment beyond shields simply returning. | `PRD:129`, `PRD:196` | decided | Binding design rule across geofence, motion and camera paths. |

---

# 11. shield-screen

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-154 | The blocked-app screen is rendered by a `ShieldConfiguration` extension: white blur, lock icon, **"Blocked by ExcerLock"**, subtitle = the unlock hint, primary **"Open ExcerLock"**, secondary **"Keep walking"** (state rule) or **"OK"**. | `SCREENS:189-190` | decided | Exact copy quoted in the source. |
| REQ-155 | Phase 1 ships a `ShieldPreview` screen in the dev menu rendering the same content model, so copy and layout are approved before the Swift is ported. | `SCREENS:190-192` | decided | |
| REQ-156 | The shield sells, never scolds. | `PRD:312` | decided | Binding voice rule; "no guilt copy" on the secondary button (`PRD:380`). |
| REQ-157 | ~~Four cause-keyed shield variants (balance empty · Full Lock · Walk & Scroll ended · lock window) with their exact 4-set copy, light-ivory blur, soft-clay lock, orange primary~~ | `PRD:312`, `PRD:380` | superseded | Two of the four causes (balance empty, Full Lock) no longer exist (`DEC:22`); `SCREENS:189` defines a single shield content model. The surviving copy ideas: subtitle = the user's cheapest real unlock path, **offer numbers only, never spent-time/streak/balance countdowns** (`PRD:380`). |
| REQ-158 | ~~Remotely overridable shield copy via the PostHog flag rail~~ | `PRD:380`, `PRD:469` | superseded | Not repeated in any rebuild source. |
| REQ-159 | The shield is the only way to reach the app's UI from inside a blocked app — an app cannot bring itself to the foreground and there are no cross-app overlays. | `TREAD:33-38` | decided | Load-bearing platform constraint behind the treadmill design. |

---

# 12. onboarding

Screen ids are the plan's own (`SCREENS:11-108`). Copy in bold is the approved heading, quoted from the source.

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-160 | Launch shows a native splash (white, centered running-lock logo) held while state hydrates; no invented intro. | `SCREENS:14-15` | decided | Phase 2 budget: 3 s for entitlement + session (`SCREENS:15`). |
| REQ-161 | The boot gate routes: onboarding incomplete → O01; complete + entitled → Home; complete + not entitled → paywall with a reason. | `SCREENS:15` | decided | |
| REQ-162 | All onboarding screens share an `OnboardingHeader` (back + progress) except O01–O03; O01 has no back. | `SCREENS:19` | decided | |
| REQ-163 | The progress fraction counts the user's **actual** branch-aware path length. | `SCREENS:19-20` | decided | |
| REQ-164 | Continue is always the pinned footer CTA, and answers persist immediately so killing the app resumes at the same step. | `SCREENS:20-21` | decided | |
| REQ-165 | O01 **"Block apps. Exercise more."** — a schedule-widget hero showing blocked 12 PM–8 PM until arrival at the gym. | `SCREENS:25` | decided | |
| REQ-166 | O02 **"See your progress"** — trend hero: screen time down, exercise up. | `SCREENS:26` | decided | |
| REQ-167 | O03 **"Stay in control"** — lock + rule tiles hero. | `SCREENS:27` | decided | |
| REQ-168 | O04 **"What should we call you?"** — text field, keyboard up on entry, CTA rides the keyboard. | `SCREENS:28` | decided | States: empty (CTA disabled) · valid · **>30 chars error** (`SCREENS:28`). |
| REQ-169 | O05 **"How did you hear about us?"** — TikTok, Instagram, YouTube, App Store, Friend, Other. | `SCREENS:29` | decided | CTA disabled until one is selected. |
| REQ-170 | O06 **"How old are you?"** — Under 18, 18–24, 25–34, 35–44, 45–54, 55+. | `SCREENS:30` | decided | |
| REQ-171 | O07 **"What do you do?"** — Student, Employed, Self-employed, Parent at home, Between jobs, Retired, Other. | `SCREENS:31` | decided | |
| REQ-172 | O08 **"What do you want to improve first?"** — More exercise · Less screen time · Overall wellness. | `SCREENS:32` | decided | Helper copy: "Pick one. You can change it later." |
| REQ-173 | O09 **"What's the main reason you want to make a change?"** — 5–6 options reworded into ExcerLock voice. | `SCREENS:33` | decided | Options adapted from a reference board; rewording is required, not optional. |
| REQ-174 | O10 **"How many hours do you currently spend scrolling each day?"** — slider 1–12 h in 30-minute steps with a big live number; persists `estimatedDailyMinutes`. | `SCREENS:34` | decided | Haptic ticks on value change (`SCREENS:34`). Self-report by design — iOS never exposes the real Screen Time total (`PRD:314`). |
| REQ-175 | O11 **"Here's some quick math"** — hours/day → hours/month → days/year, numbers ticking up in sequence. | `SCREENS:35` | decided | |
| REQ-176 | O12 **"This is a year in your life"** — a 365-dot grid, all neutral. | `SCREENS:36` | decided | |
| REQ-177 | O13 **"This is the free time left"** — the free-time subset fills, unit labelled "after sleep and work, roughly N hours a day". | `SCREENS:37` | decided | |
| REQ-178 | O14 **"This is how much time you spend scrolling"** — the scrolling subset fills in orange, using the O10 number. | `SCREENS:38` | decided | |
| REQ-179 | O15 **"Less scrolling. More moving."** — a trend line chart, explicitly labelled **"illustrative"**. | `SCREENS:39` | decided | The label is mandatory (no implied real data). |
| REQ-180 | O16–O18 are one component with three states (**"Stuck in the scroll loop?"** → **"Let's break the loop."** → **"Make moving the habit."**); the heading crossfades and the diagram animates in place rather than pushing a new route. | `SCREENS:40-42`, `SCREENS:46-47` | decided | Loop content: urge → scroll → reward → repeat; then the logo enters the gap; then want to scroll → move → unlock → enjoy. |
| REQ-181 | O19 **"Built around small, repeatable habits"** — three principle rows with icons, **no institution logos**. | `SCREENS:43` | decided | The no-logos rule is explicit (no borrowed credibility). |
| REQ-182 | O20 **"What exercise should unlock your apps?"** — a 2×2 grid: Walking, Gym, Running, Biking, with multicolor icons. | `SCREENS:44` | decided | Helper "Pick the one you will really do."; selected card lifts. |
| REQ-183 | Gym branch: G1 **"What counts at the gym?"** (Spend time at the gym (Recommended) · Arrive at the gym) → G2 **"How long at the gym?"**. | `SCREENS:65-66` | decided | G1 support line: "You'll pick your gym after setup." |
| REQ-184 | S1 **"When should blocking be active?"** — day picker + time-range row + All-day switch + a live summary line. | `SCREENS:87` | decided | Error states: no days · window < 15 min. The old "reward" screens are removed. |
| REQ-185 | S2 **"Setting up your plan…"** — an animating checklist (Exercise ✓ · Unlock rule ✓ · Days and times ✓) that auto-advances in ≈1.5 s, with **no fake countdown**. | `SCREENS:88` | decided | |
| REQ-186 | S3 **"Your plan is ready"** — a plan-summary card computed from the answers (activity + mode + goal, days, times, and the consequence line "Unlocks your apps for the rest of the day" or "while you walk"); each row has Edit that jumps to that screen and returns; CTA "Use this plan". | `SCREENS:89` | decided | The consequence copy is the user-facing statement of `DEC:23`/`DEC:24`. |
| REQ-187 | S4 **"Help us make ExcerLock better"** — five star targets, CTA "Continue", secondary "Not now", **no fake reviews**; this is a warm-up only, the real StoreReview call is a Phase 2 policy decision. | `SCREENS:90` | decided | |
| REQ-188 | Back walks the actual path taken through the branch, not a fixed sequence. | `SCREENS:51` | decided | |
| REQ-189 | The user's onboarding answers that are not rules are stored in a `Profile`: name, referral source, age band, occupation, improve-first, main reason, `estimatedDailyMinutes`, units. | `MODEL:190-201` | decided | `estimatedDailyMinutes` is **permanent** — never editable after onboarding (`MODEL:198`, `MODEL:180-181`). |
| REQ-190 | ~~The PRD's six-entry FLOW array (value-prop → confession → mirror → permissions-primer → pick-apps → paywall)~~ | `PRD:314` | superseded | Replaced by the ~30-screen flow in `SCREENS:17-98` and by C8's post-paywall setup (`DEC:54`). |
| REQ-191 | ~~Time-bank onboarding screens: "How much screen time?" (reward minutes) and the walking "earn time per step" option~~ | `DEC:53` | cut-for-v1 | Explicitly removed; "unlock while walking" stays. |
| REQ-192 | ~~Remotely re-orderable onboarding driven by a FLOW array with per-screen funnel instrumentation~~ | `PRD:314`, `PRD:455-460` | superseded | No rebuild source carries the FLOW-array rail; `DEC:63` keeps PostHog but says nothing about remote re-ordering. |

---

# 13. setup (post-purchase sequence)

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-193 | App picking and permissions happen **after** the paywall, as a short setup sequence: Screen Time permission → pick apps → the branch's permission → optional sign-in → Home. | `DEC:54`, `SCREENS:100-108` | decided | |
| REQ-194 | X1 **"Let ExcerLock block your apps"** — a Screen Time primer with shield icon and three bullets (what it does, what we can't see, how to change later), CTA "Allow Screen Time". | `SCREENS:104` | decided | Denied → "Open Settings" + "Continue anyway"; the app then shows a permission-needed status on Home (`SCREENS:104`). |
| REQ-195 | X2 **"Pick the apps to block"** — opens the picker and then shows "N apps · M categories". | `SCREENS:105` | decided | Cannot continue with zero selected (hard requirement) **but** can "Skip for now", after which Home nags (`SCREENS:105`). |
| REQ-196 | X3 is the branch permission screen: Walking → **"Let ExcerLock count your steps"** (Motion); Gym → **"Find your gym"** (map search + pin, then Location); Running/Biking → **"Read your workouts from Apple Health"**. | `SCREENS:106` | decided | Gym asks When-in-use first; **Always** is offered as the auto-detect upgrade toggle with an explanation (`SCREENS:106`). |
| REQ-197 | X4 **"Save your progress"** — Sign in with Apple · Continue with Google · Continue with email (email → OTP code screen), secondary **"Skip for now"**. | `SCREENS:107` | decided | States: idle · submitting · error · code entry. |
| REQ-198 | X5 **"You're all set"** — a checklist of what is on (Blocking ✓ · Apps ✓ · branch signal ✓ · Reminder if granted), CTA "Go to Home". | `SCREENS:108` | decided | |
| REQ-199 | Phase 1 fakes every system permission sheet with an iOS-alert lookalike whose result is chosen by the dev-menu scenario. | `SCREENS:185` | decided | Used at X1, X3 and T3. |

---

# 14. trial-paywall

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-200 | **Hard paywall**: there is no way into the main app without starting the trial (or restoring). | `DEC:34`, `MODEL:212` | decided | The main tabs are reachable only when the entitlement is `trial` or `active` (`MODEL:212`). |
| REQ-201 | **Restore purchases** works on the paywall. | `DEC:34`, `SCREENS:95` | decided | |
| REQ-202 | The paywall is a **remote Adapty Paywall Builder** screen; Phase 1 renders a clearly-labelled stand-in with plan options, CTA, restore link and a terms line. | `DEC:52`, `SCREENS:95` | decided | Phase 1 stand-in is labelled a placeholder in the dev menu (`SCREENS:95`). |
| REQ-203 | Paywall states: loading · products · purchasing · restored · error · dismissed — and dismissing a hard paywall returns to the paywall with a "you need a plan" message. | `SCREENS:95` | decided | No swipe-to-dismiss (`SCREENS:200`). |
| REQ-204 | If the entitlement later becomes `expired` or `billingIssue`, the paywall is shown again above the tabs with the matching message (placement `in_app`). | `SCREENS:97-98`, `MODEL:212-213` | decided | |
| REQ-205 | `unknown` entitlement shows the splash until resolved, with a 3-second budget, then is treated as `none` with a retry on the paywall. | `MODEL:213-214` | decided | |
| REQ-206 | T1 **"Try ExcerLock free"** — trial offer with a benefits list and a "7-day free trial" placeholder label. | `SCREENS:91` | decided | The label comes from Adapty in Phase 2 (`SCREENS:91`). |
| REQ-207 | T2 **"We'll remind you before it ends"** — bell icon, "2 days before your trial ends". | `SCREENS:92` | decided | |
| REQ-208 | T3 **"Want a trial reminder?"** — CTA "Enable reminders", secondary "Maybe later"; both granted and denied continue. | `SCREENS:93` | decided | This is where the notification permission is asked; never earlier (`PRD:239` states the same law). |
| REQ-209 | T4 **"How your free trial works"** — a timeline: Today (full access) · Day 5 (reminder) · Day 7 (billing starts). | `SCREENS:94` | decided | |
| REQ-210 | The trial-offer, reminder, notification and "how the trial works" screens before the paywall are **custom-built** (not Adapty). | `DEC:52` | decided | |
| REQ-211 | Real prices, trial length and offer come from the Adapty dashboard; the 7-day trial in the mockups is a design example only. | `DEC:74` | open | E4 — blocks Phase 2. |
| REQ-212 | ~~Annual $59.99 + Monthly $9.99, 7-day trial on annual only, "7 DAYS FREE · SAVE 50%" badge, $29.99 win-back SKU, first A/B test $59.99 vs $79.99~~ | `PRD:383` | superseded | Starting hypotheses only; `DEC:74` puts the real numbers in Adapty. |
| REQ-213 | Win-back / decline offers must be genuinely cheaper real SKUs — never fake scarcity or fake countdowns. | `PRD:333`, `PRD:442` | decided | Named cautionary precedent: an app pulled from the App Store for exactly that (`PRD:442`). |
| REQ-214 | The paywall renders whatever the Adapty placement returns (plan count, order, badges), so copy/design/price change without an app release. | `PRD:437`, `PRD:440` | decided | Consistent with `DEC:52`. |
| REQ-215 | Fallback paywalls are bundled in the binary so a first launch offline still shows a working paywall. | `PRD:443` | decided | Not repeated in a rebuild source, but not contradicted either. |

---

# 15. account

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-216 | Sign-in methods are **Apple, Google and email**. | `DEC:39`, `MODEL:207` | decided | |
| REQ-217 | An **anonymous session** exists from the first onboarding screen. | `DEC:39` | decided | |
| REQ-218 | Sign-in is offered after purchase and later in Settings, and is **never required** to use the app (local-first law). | `DEC:39` | decided | X4 has "Skip for now" (`SCREENS:107`). |
| REQ-219 | Auth is **Supabase** (new project), used for auth only; **Clerk is removed entirely**. | `DEC:60` | decided | |
| REQ-220 | Delete account exists in Settings with a confirmation carrying a five-point explanation. | `SCREENS:170` | decided | Carried over from the old `AccountSettingsCard`. In-app deletion is an App Store requirement once accounts exist (`PRD:282`). |
| REQ-221 | Rules and daily results sync to the VPS database so they come back on a new phone. | `DEC:64` | decided | App selections cannot sync (REQ-151). |
| REQ-222 | ~~Clerk sign-up placed after the paywall and **required**~~ | `PRD:314`, `PRD:431` | superseded | Directly contradicted by `DEC:39` ("never required") and `DEC:60` (Clerk removed). |
| REQ-223 | The identity spine is one id across auth, payments, analytics and Postgres; the Adapty customer id becomes the Supabase user id. | `DEC:62`, `PRD:429` | decided | |

---

# 16. settings

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-224 | Settings shows a **profile header**: name and sign-in state ("Signed in with Apple" · "Not signed in → Sign in"). | `SCREENS:163` | decided | |
| REQ-225 | Subscription section: plan and renewal date from the entitlement, Manage subscription (App Store), Restore purchases. | `SCREENS:164` | decided | |
| REQ-226 | A permissions section lists Screen Time, Motion, Location, Health, **Camera** and Notifications, each with a Fix / Open Settings action. | `SCREENS:165` | decided | Camera is new versus the PRD list — it exists for the treadmill scan. |
| REQ-227 | Preferences: Units (km/mi), Walk & Scroll stop grace (30 s–5 min), Gym auto-detect (Always location) with explanation, Haptics on/off. | `SCREENS:166` | decided | These four are the **only** economy/behaviour knobs left. |
| REQ-228 | A Locked-apps shortcut row. | `SCREENS:167` | decided | |
| REQ-229 | Support: **Contact support** (composer with category, message, send state), Rate ExcerLock, Share ExcerLock. | `SCREENS:168`, `DEC:38` | decided | Support form only; feature-request voting is cut (`DEC:38`). |
| REQ-230 | Legal: Terms of Use and Privacy Policy as in-app document screens. | `SCREENS:169` | decided | |
| REQ-231 | Account: Sign in / Sign out, Delete account. | `SCREENS:170` | decided | |
| REQ-232 | Footer shows version + build; **7 taps** opens the dev menu (Phase 1 always, Phase 2 dev builds only). | `SCREENS:171` | decided | |
| REQ-233 | Settings sub-screens: `settings/support`, `settings/legal/[doc]`, `settings/permission/[name]`, `settings/account`, `settings/gyms` (max 5, add via the gym picker). | `SCREENS:173` | decided | |
| REQ-234 | Settings grouping and order follow OtterLife's settings screen. | `SCREENS:161`, `DEC:49` | open | The exact OtterLife layout has not been extracted (`DEC:73`, E3). |
| REQ-235 | ~~PRD Settings rows with no rebuild equivalent: Appearance (auto/light/dark), Language deep link, Day boundary, Start week on, Siri & Shortcuts / App Intents, Sounds toggle, Apple Health data panel, Connected apps, Export my data, Help & FAQ page, Report a bug, Request a feature, Send diagnostics bundle, What's new, Follow us, hidden debug menu contents~~ | `PRD:280-306` | superseded | None appear in `SCREENS:163-173`. Siri/App Intents and widgets are additionally on the cut list (`DEC:80-81`). Treat their absence as intended, not as a gap. |
| REQ-236 | ~~Alternate app icons row; Face ID app gate~~ | `PRD:389-390` | cut-for-v1 | Cut in the PRD itself. |
| REQ-237 | ~~Review-prompt trigger ladder (5th unlock moment ≥3 days after install, first 7-day streak, 30-day streak; suppressed within 30 min of a shield)~~ | `PRD:388` | superseded | `SCREENS:90` makes the onboarding stars a warm-up only and defers the real StoreReview policy to Phase 2. |

---

# 17. analytics-history-streaks

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-238 | The Analytics tab has a Week · Month · Year segmented control with ‹ › date navigation. | `SCREENS:148` | decided | |
| REQ-239 | **Time Reclaimed hero** with a "measured on N of M days" line and a delta versus the previous period. | `SCREENS:149` | decided | The measured-days line is mandatory honesty about missing measurements. |
| REQ-240 | Time reclaimed for a day = `max(0, estimatedDailyMinutes − lockedAppUsageMinutes)`; days without a measurement are **excluded**. | `MODEL:179-182` | decided | **Contradiction:** `PRD:223` says every calendar day since install counts, rest days included. The rebuild excludes unmeasured days and surfaces the count. |
| REQ-241 | `estimatedDailyMinutes` is the onboarding scrolling answer and is never editable afterwards. | `MODEL:180-181`, `PRD:223` | decided | Rationale (PRD): "tuning it would turn the hero number into a vanity dial". |
| REQ-242 | A locked-app minutes chart with the estimate line drawn on it. | `SCREENS:150` | decided | |
| REQ-243 | An exercise chart: per-day bars per activity, or a steps line for walking-only users. | `SCREENS:151` | decided | |
| REQ-244 | Three stat tiles: days met ("5 of 5 scheduled"), current streak and longest streak. | `SCREENS:152` | decided | Exact ratio copy quoted. |
| REQ-245 | A **scheduled day** is a day on which at least one enabled rule has a window instance. | `MODEL:174` | decided | |
| REQ-246 | A **met day** is a scheduled day with at least one rule met; a state-mode-only day counts as met if a walking session of ≥10 minutes happened. | `MODEL:175-176` | decided | The 10-minute floor is an app-fixed integrity constant. |
| REQ-247 | **Streak** = consecutive met days over scheduled days only; unscheduled days are transparent (they neither extend nor break it). | `MODEL:177-178` | decided | |
| REQ-248 | A **weekly recap card** appears on the Week view with rows: time reclaimed this week vs last, days met "N of M scheduled", total activity per activity type, current streak. | `SCREENS:153`, `MODEL:183-184` | decided | `DEC:37` keeps streaks and the weekly recap card. |
| REQ-249 | Analytics empty states: day zero ("Your first week starts today"), no measurement yet (usage monitor unavailable), no rules. | `SCREENS:154` | decided | |
| REQ-250 | Charts are SVG, animate on period change, and **never show placeholder data outside the dev-menu scenarios**. | `SCREENS:156-157` | decided | Binding anti-fake-data rule. |
| REQ-251 | ~~Badges / milestone shelf (22 badges, three rows, progress rings, unlock moment) and share cards (milestone + recap templates, 9:16 and 1:1, privacy floor)~~ | `DEC:37` | cut-for-v1 | Explicitly cut. Do not flag `PRD:225-227`, `PRD:275`, `PRD:382` as missing. |
| REQ-252 | ~~Calendar heat map with six cell states and kind glyphs, tap-for-day-detail popover~~ | `PRD:273` | superseded | Absent from the rebuild Analytics list (`SCREENS:146-157`). |
| REQ-253 | ~~"Activity" definition (one qualifying condition-day, counted once per condition per day) and the activity-count milestone ladder~~ | `PRD:224` | superseded | Milestones are cut; the recap now counts "total activity per activity type" (`MODEL:184`). |
| REQ-254 | ~~Streak policy setting (hard reset vs auto-cushion); no paid streak freezes~~ | `PRD:220` | superseded | No streak-policy setting appears in `SCREENS:166`; the sick-day override that fed it is cut. |
| REQ-255 | ~~Earning breakdown ("banked minutes per condition"), spent-vs-earned trend bars~~ | `PRD:272`, `PRD:274` | cut-for-v1 | Downstream of the time bank. |
| REQ-256 | Per-app usage breakdown inside the locked group is excluded (apps are opaque tokens). | `PRD:276` | cut-for-v1 | |

---

# 18. notifications

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-257 | Exactly **two** notifications exist in v1, both **local**: the trial-ending reminder and the walk-lease warning that state mode needs. | `DEC:35` | decided | Implementation is Codex's call in Phase 2 (`DEC:35`). |
| REQ-258 | The walk-lease warning fires **30 seconds before** the propped lease expires so the user can pick the phone up and be verified by motion instead. | `TREAD:78-79` | decided | |
| REQ-259 | The trial reminder is introduced by T2/T3 and lands "2 days before your trial ends" / Day 5 of a 7-day trial. | `SCREENS:92`, `SCREENS:94` | decided | |
| REQ-260 | There is **no push infrastructure** and no engagement notifications (no afternoon nudge, no weekly recap push, no streak last-call). | `DEC:35`, `DEC:80` | cut-for-v1 | Do not flag `PRD:232-240` as missing. |
| REQ-261 | The notification permission is asked only when the user opts in — at T3 — never earlier in onboarding. | `SCREENS:93`, `PRD:239` | decided | |
| REQ-262 | ~~Delivery rules: 1 engagement push/day (target 0), ≤5 per rolling 7 days, quiet hours 22:00–07:00, go-quiet-on-openers, deep-link map, "sells-not-scolds" copy voice with ≤35-char titles~~ | `PRD:238-240` | cut-for-v1 | Moot once engagement pushes are cut; the *voice* rule (never scold) survives as a product-wide law (`PRD:312`). |

---

# 19. permissions

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-263 | Six permissions are modelled: Screen Time, Motion, Location, Health, Camera, Notifications. | `MODEL:209`, `SCREENS:165` | decided | Location has its own union: `notDetermined · whenInUse · always · denied` (`MODEL:209`); the others use `notDetermined · granted · denied · restricted` (`MODEL:208`). |
| REQ-264 | Screen Time permission is requested at X1 with a primer explaining what it does, what we cannot see, and how to change it later. | `SCREENS:104` | decided | |
| REQ-265 | Denying Screen Time still lets the user continue; Home then shows a permission-needed status. | `SCREENS:104`, `SCREENS:125` | decided | Home copy: "Screen Time access needed" with an inline fix action, overriding the normal subtitle (`SCREENS:125`). |
| REQ-266 | The branch's own permission is requested at X3: Motion for walking, Location for gym, Health for running/biking. | `SCREENS:106` | decided | |
| REQ-267 | Location is asked **When in use first**; **Always** is offered separately as the auto-detect upgrade with an explanation. | `SCREENS:106`, `SCREENS:166`, `PRD:189-190` | decided | "Always" is never a requirement (`PRD:190`). |
| REQ-268 | Camera permission is requested the first time the user starts the treadmill scan — never during onboarding. | `TREAD:137`, `AHA:121-122` | decided | |
| REQ-269 | Every permission has a Settings row with a live status and a Fix / Open Settings action, plus a `settings/permission/[name]` detail screen with status and instructions. | `SCREENS:165`, `SCREENS:173` | decided | PRD frames this as "the #1 support-ticket killer" and demands the panel be pinned at the top (`PRD:280`). |
| REQ-270 | A denied permission never dead-ends the user: each denial path offers an alternative (Continue anyway, handheld walking, Open Settings). | `SCREENS:104`, `AHA:139-142`, `AHA:179-180` | decided | |
| REQ-271 | Motion & Fitness plus while-in-use location are what a walking session needs; the continuous-location start is what keeps the app alive in the background (standard blue indicator). | `PRD:124` | decided | Battery cost is real but bounded to the session (`PRD:124`). |

---

# 20. offline-sync

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-272 | Local-first is a standing law: the app is fully usable without an account. | `DEC:39` | decided | |
| REQ-273 | Rules and daily results sync to the VPS Postgres so they return on a new phone and are visible server-side. | `DEC:64` | decided | |
| REQ-274 | App selections cannot sync — Apple ties Screen Time tokens to the device. | `DEC:64` | decided | User-visible consequence: apps must be re-picked on a new phone. |
| REQ-275 | Earning/lock logic runs **on-device**; the server never computes screen-time balances. | `PRD:424`, `PRD:339` | decided | |
| REQ-276 | Phase 1 runs the whole product on a **fake local data layer**; Phase 2 wires real signals and the backend. | `DEC:12`, `MODEL:3-5` | decided | |
| REQ-277 | The backend keeps its own Postgres and API (Fastify + Drizzle, `api.excerlock.com`) and verifies Supabase JWTs. | `DEC:61` | decided | |
| REQ-278 | ~~Vendor OAuth token-exchange proxy and webhook receivers~~ | `DEC:65` | cut-for-v1 | Routes and tables are deleted from the new stack. |
| REQ-279 | Adapty stays (same app, `premium` access level, product ids, webhook to the VPS); PostHog stays for product analytics; Sentry stays for crashes. | `DEC:62-63` | decided | |

---

# 21. edge-case-copy (user-facing strings and honesty rules the sources demand verbatim)

| id | statement | source | status | edge cases / copy the source demands |
| --- | --- | --- | --- | --- |
| REQ-280 | Home `locked` state: lock icon, **"Apps are blocked"**, subtitle = the unlock hint, "until you …". | `SCREENS:120` | decided | |
| REQ-281 | Home `unlockedMet`: open lock, **"Unlocked for the rest of today"**, subtitle **"Blocking resumes tomorrow at 9:00 AM"** computed from `relockAt`. | `SCREENS:121` | decided | |
| REQ-282 | Home `unlockedWalking`: **"Unlocked while you walk"** with a lease countdown and a Stop button. | `SCREENS:122` | decided | |
| REQ-283 | Home `beforeWindow`: **"Blocking starts at 9:00 AM"**, subtitle **"Get ahead: walk 5,000 steps now"**. | `SCREENS:123` | decided | |
| REQ-284 | Home `afterWindow` / `noRulesToday`: **"No blocking right now"**, subtitle = next scheduled start or **"Add a condition"**. | `SCREENS:124` | decided | |
| REQ-285 | The simple v1 unlock moment: on transition into `unlockedMet` the lock glyph crossfades to the open glyph with a pop spring on scale and **one success haptic. Nothing else.** | `SCREENS:126`, `DEC:40` | decided | Superseded **only** for the two ceremony screens (`DEC:41`, `AHA:1-8`). |
| REQ-286 | The two ceremony screens deliberately reverse the PRD's "no takeover, no confetti" earn-moment rule — lock-shaped frame, progress ring, shackle lift, **confetti**, detected message. | `DEC:41`, `AHA:9-13` | decided | **Contradiction with `PRD:313`** ("there is no full-screen claim/celebration takeover… no popup, no toast, no interstitial"), resolved in favour of `AHA`/B20 for these two entries only. |
| REQ-287 | Ceremony timing is fixed: ring flash at 0 ms · body settle 0–180 ms · shackle lift 180–560 ms with a success haptic at 180 ms · confetti at 420 ms · message at 520 ms · Done button at 1500 ms. | `AHA:82-90` | decided | |
| REQ-288 | Reduce Motion: no ring ticks, shackle crossfades closed→open, **no confetti**, message fades in, one success haptic, same total duration. | `AHA:92-94`, `AHA:213` | decided | |
| REQ-289 | Ring progress ticks fire a selection haptic every 0.25 of progress, skipped under Reduce Motion. | `AHA:79-80` | decided | |
| REQ-290 | Accessibility: the ring is a `progressbar` with value 0–100 labelled "Scan progress" / "Presence check"; success is announced; the camera preview is not accessible; the map is labelled "Map of your location"; at Dynamic Type XL headings wrap under the frame and the frame never shrinks below 260 pt. | `AHA:249-254` | decided | |
| REQ-291 | Conditions tab empty state: illustration, **"No conditions yet"**, CTA. | `SCREENS:140` | decided | |
| REQ-292 | Rule rows read like "Walk 5,000 steps" / "Mon–Fri · 9 AM–9 PM" with a switch; tap edits, swipe deletes with a confirm sheet. | `SCREENS:137-138`, `SCREENS:184` | decided | |
| REQ-293 | Manual gym check-in confirm copy: "You're at Gold's Gym?" with a distance hint and a result. | `SCREENS:181` | decided | **Contradiction:** `AHA:50` deletes `CheckInSheet` in favour of `/unlock/gym`. |
| REQ-294 | Unlock ceremony copy is centralised in `src/content/unlock.ts` with the exact strings listed in the spec. | `AHA:220-247` | decided | Includes `done: 'Done'`, and both treadmill and gym string sets. |
| REQ-295 | Home entry pill copy lives in `src/content/home.ts`: `treadmillEntry: "I'm using a treadmill"`, `gymEntry: "I'm at the gym"`. | `AHA:44-45` | decided | Pills show **only** while the rule's window is active and the decision is `locked`; outside the window the row reverts to the status text, and the lock's height must not change (`AHA:33-43`). |
| REQ-296 | No fake data anywhere the user can see it: no fake countdown on the plan-building screen, no fake reviews on the rating screen, charts labelled "illustrative", no placeholder chart data outside dev scenarios, no institution logos. | `SCREENS:88`, `SCREENS:90`, `SCREENS:39`, `SCREENS:156-157`, `SCREENS:43` | decided | |
| REQ-297 | Honest timing is a promise, not a hedge: geofence exits, HealthKit background delivery and motion state changes all lag, and the product never promises an instant hands-free unlock nor punishes on a fuzzy signal. | `PRD:105`, `PRD:125`, `PRD:195-196` | decided | |
| REQ-298 | The product is for self-managing adults and is **not** a parental-control app. | `PRD:17` | decided | Also the App Review story (`PRD:385`). |
| REQ-299 | Analytics/telemetry must never carry activity type, workout metrics or coordinates; health, location, motion and screen-time data never leave the device. | `PRD:385` | decided | Binds the `AnalyticsPort` event list at `AHA:257-260`. |
| REQ-300 | Named unlock analytics events: `unlock_screen_opened {kind}`, `treadmill_scan_started`, `treadmill_scan_verified {ms}`, `treadmill_scan_failed {reason}`, `gym_unlock_tapped {distance}`, `gym_unlock_confirmed`, `gym_unlock_lost`, `unlock_ceremony_done {kind}`. | `AHA:257-260` | decided | |

---

# 22. Contradictions and unreconciled lines (for the later stages)

| # | Contradiction | Sources | Resolution the audit assumes |
| --- | --- | --- | --- |
| X-1 | Gym radius: draggable 50–200 m starting at 100 m vs **fixed 100 m**. | `PRD:86`, `PRD:376` vs `SCREENS:180` | Rebuild source wins for `app-next`: fixed 100 m in Phase 1. Needs an explicit call before Phase 2. |
| X-2 | Manual gym check-in sheet exists vs `CheckInSheet` is deleted and replaced by `/unlock/gym`. | `SCREENS:181` vs `AHA:50` | `AHA` is newer (2026-09-07) and explicitly supersedes; `SCREENS` is stale here. |
| X-3 | Walking sheet: `SH-walk` is the state-rule surface vs "`WalkingSheet` stays only for outdoor state rules". | `SCREENS:182` vs `AHA:50-51` | Both survive: treadmill/either → ceremony screen, outside → sheet. |
| X-4 | Earn moment: "there is no full-screen claim/celebration takeover, no confetti" vs the two confetti ceremonies. | `PRD:312`, `PRD:380` vs `DEC:41`, `AHA:9-13` | Reversed for the two entry-driven unlocks only; background/auto-detect unlocks keep the quiet in-place moment (`DEC:40`, `SCREENS:126`). |
| X-5 | Vendor connections: cut banner vs a §7 line still saying all four Tier-1 vendors ship in v1. | `PRD:135-139` vs `PRD:358` | Cut. `DEC:31` and `DEC:65` remove them from the stack entirely. |
| X-6 | Diagnostics field list still asks for "vacation mode, sick tokens remaining" although both were cut. | `PRD:393` vs `PRD:212`, `PRD:378` | Dead text in the PRD; the whole diagnostics bundle is absent from the rebuild Settings (REQ-235). |
| X-7 | Time Reclaimed denominator: every calendar day since install (rest days included) vs measured days only, with the count surfaced. | `PRD:223` vs `MODEL:179-182`, `SCREENS:149` | Rebuild wins: unmeasured days are excluded and the hero says "measured on N of M days". |
| X-8 | Weekly recap contents: five rows with a share button vs four rows and no share card. | `PRD:226` vs `MODEL:183-184`, `DEC:37` | Rebuild wins; share cards are cut. |
| X-9 | Sign-up: "after the paywall, required" vs "never required to use the app". | `PRD:314`, `PRD:431` vs `DEC:39` | `DEC:39` wins; X4 offers "Skip for now". |
| X-10 | Auth vendor: Clerk everywhere in the PRD vs Clerk removed, Supabase for auth only. | `PRD:428-431`, `PRD:282` vs `DEC:60` | `DEC:60` wins. |
| X-11 | Cadence threshold stated as "~60–70 steps/min, to be tuned" vs an already-built 65 steps/min over two consecutive samples. | `PRD:123`, `PRD:373` vs `TREAD:8-9`, `TREAD:155` | Not a conflict in value; the PRD's "to be tuned" is stale — the constant already exists in the old app and is ported (`DEC:33`). |
| X-12 | Build status: `AHA:3` says the ceremony screens are built (2026-09-07) while `TREAD:3` says "spec, not built". | `AHA:3` vs `TREAD:3` | `TREAD` describes the Phase 2 native path, which remains unbuilt; the Phase 1 ceremony UI exists. Device validation still blocks TestFlight (`AHA:279-281`). |
| X-13 | Treadmill spec is written against the **old** domain (`packages/ledger`, `packages/condition-model` `walking-state`, `exitGraceMs`, "states never bank"). | `TREAD:19-26`, `TREAD:145-163` | superseded structurally by `DEC:22`/`DEC:25`; the *behaviour* (timers, state machine, failure copy, privacy) is what ports (`DEC:33`). |
| X-14 | Settings surface: the PRD's full-stack settings list (~25 rows) vs the rebuild's ten. | `PRD:280-306` vs `SCREENS:163-173` | Rebuild wins; see REQ-235 for the full list of dropped rows so they are not flagged as gaps. |
| X-15 | Onboarding: PRD's 6-screen FLOW array vs the rebuild's ~30 screens with branch machine. | `PRD:314` vs `SCREENS:17-98` | Rebuild wins. |

---

# 23. Open items carried by the sources (not gaps — unresolved by design)

| id | item | source | blocks |
| --- | --- | --- | --- |
| REQ-301 | AppBlock and Unrot replay videos are not on disk; only OtterLife's replay is. | `DEC:72` (E2) | Phase 1 T00 |
| REQ-302 | The exact OtterLife main-app layout (tabs, Home, Settings order) has not been extracted. | `DEC:73` (E3) | Phase 1 T09–T12 — makes REQ-234 and Home component order provisional. |
| REQ-303 | Real prices, trial length and offer come from the Adapty dashboard. | `DEC:74` (E4) | Phase 2 |
| REQ-304 | Whether the current app has any real Adapty-linked customers. | `DEC:75` (E5) | Phase 2 |
| REQ-305 | Whether the Home in-place unlock should replay the confetti ceremony on next foreground. | `AHA:285-286` | assumed no |
| REQ-306 | Whether "I'm using a treadmill" appears for `place: 'either'` rules. | `AHA:286` | assumed yes |
| REQ-307 | Gym Unlock button colour (white vs orange). | `AHA:288-289` | assumed orange |
| REQ-308 | Two entry pills stacking order when both a treadmill and a gym rule are active. | `AHA:35` | assumed gym first |
| REQ-309 | Phantom-step cheat (sitting still, shaking the phone) — mitigation unverified. | `TREAD:189` | "must be verified by test" |
| REQ-310 | Wi-Fi-network presence confirmation feasibility on current iOS. | `PRD:401` | never carried into a rebuild source |

---

# 24. The full cut list, verbatim (so later stages never flag these)

`DEC:78-85` (section F) — out of v1: time bank and everything downstream of it · rate conditions ·
per-rule app sets · global schedules and lock windows · badges and share cards · feature voting ·
engagement notifications · push notifications · vendor integrations · swimming/calorie/active-minute
conditions · in-app GPS run tracker · widgets · Live Activities · Siri/App Intents · iPad · Android ·
localization (English only) · the old Pillow, blue-violet and orange-gradient visual systems · the old
"Manage"/"Analysis" tab names · the old 98-state prototype matrix · the old dashboard build spec.

`PRD:352-360` (§7, still-valid subset) — Android · Web · macOS · Apple Watch standalone app ·
per-app/per-category budgets · per-location budgets · accountability partners / social / leaderboards ·
in-app workout content / coaching · AI anything · retroactive visit claims · vacation mode · presets ·
attribution SDK · session replay · remote push · server-side computation of earning/balances.

`TREAD:193-201` — treadmill frame vibration · FTMS over Bluetooth · headphone motion ·
Apple Watch companion (all future upgrades on issue #111).

`PRD:389-390` — alternate app icons · Face ID app gate.
