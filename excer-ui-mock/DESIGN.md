# ExcerLock UI mock: route, screen, state, and interaction matrix

## 1. Purpose and decision precedence

This document is the implementation-facing navigation contract for the standalone `excer-ui-mock/` Expo iOS prototype. It covers every required surface, every intentional visual state, every visible tap target, and every exit/return path. It is a looks-only product: all data, permission results, purchases, app selections, sessions, diagnostics, and sharing outcomes are local fake state.

When sources conflict, use this order:

1. the pasted looks-only build brief;
2. `design/mockups/nosparkle-v14-best.png`, `design/mockups/tabbar-4plain-v1.png`, `design/STYLE.md`, and `design/pillow-style-guide.md`;
3. `docs/PILLOW_SYNTHESIS.md` and the three detailed Pillow audits in `docs/`;
4. `docs/ARCHITECTURE.md`;
5. older PRD/build-spec details only when they do not conflict with the sources above.

Resolved conflicts and binding decisions:

- Build a fresh `excer-ui-mock/`; do not import from or modify `app/` or `prototype/`.
- Use four equal tabs: **Home, Manage, Analysis, Settings**. The old five-item Pillow-like tab bar in `nosparkle-v14-best.png` is superseded by `tabbar-4plain-v1.png`.
- The approved earn moment is the v18 **no-confetti**, in-place Home unlock. The old prototype's confetti/takeover behavior is superseded.
- A live **While walking** state keeps apps accessible while motion holds, but the balance still drains normally. Never ship the stale “Drain paused while active” copy visible in `card-state-live-v1.png`.
- Conditions, not presets, are the earn primitive. Do not add lifestyle/severity preset bundles.
- Apple Health is the only external fitness source shown in the v1-looking UI. Do not show Strava/Oura/Whoop/Polar connection rows.
- First purchase always passes through a simulated `/signup` screen before Home. It is a deterministic local identity fixture, not Clerk or any real account action.
- First Home is the true empty-start state with zero conditions. The user creates condition #1 from Home/Manage **Add**. This is the explicit tie-break against the older PRD sentence that placed the builder inside onboarding: the higher-priority pasted mission ends onboarding with its positive done moment and paywall, and lists the condition builder as a separate product flow.
- No real OS prompt, Screen Time picker, map, photo picker, StoreKit purchase, account action, export, browser, or share occurs. Native-looking surfaces are explicitly simulated and return deterministic local results.
- Every PNG or generated visual later required by these screens must follow `design/STYLE.md`; this matrix creates no assets.

## 2. Global interaction contract

### Navigation and presentation

- Core tabs keep their own scroll position.
- Full-screen flows: onboarding, paywall, simulated signup, Walk session, Gym check-in, analytic detail, lock moments.
- Branded sheets: condition builder, Home detail, Settings contextual panels, share preview. Every branded sheet has rounded top corners and a visible grabber.
- Focused choice sheets: wheel pickers, radio/single-choice lists, calendar/day details.
- Simulated native surfaces: OS permissions, Family Activity picker, purchase confirmation, signup/sign-in, review prompt, notification preview, iOS share sheet, browser, destructive alert. These are white/system-styled and must be labeled in code/content as demo state; they must never call a real API.
- Back pops one navigation level. X dismisses the whole modal/flow and returns to the recorded `returnTo`. A touched builder draft gets a discard alert before X can close it.
- Every screen and sheet has a non-destructive exit. Destructive actions require a second confirmation.

### Touch and motion

- Every visible button, row, chip, card, toggle, tab, close/back control, chart range control, badge, and calendar cell is pressable.
- Press feedback: scale to about `0.96–0.98` plus a slight opacity dip in 100–150 ms, then spring back.
- Minimum hit target: 44 pt.
- State changes animate inside stable geometry: row fill moves, bars grow, sheets spring, cards lift during reorder, and hero state changes in place.
- Success haptic occurs once on the Home lock's closed→open transition. No sound, popup, toast, confetti, or separate claim screen.
- Reduced Motion replaces spatial springs/matched geometry with short crossfades while preserving the same final states.

### Four-tab contract

| Tap | Destination | Reselect behavior | Pillow / anchor reference |
|---|---|---|---|
| Home | `/(tabs)/home` | Scroll to top; if already at top, no-op press feedback | ExcerLock `tabbar-4plain-v1.png`; Pillow `037–039` |
| Manage | `/(tabs)/manage` | Scroll to top | ExcerLock four-tab anchor; Pillow list/sheet grammar `057–060`, `078–100` |
| Analysis | `/(tabs)/analysis` | Scroll to Time Reclaimed hero; clear new-badge dot after shelf reveal | Pillow `173–177` |
| Settings | `/(tabs)/settings` | Scroll to pinned Permissions panel | Pillow `210–214` |

## 3. Canonical route tree

```text
app/
  _layout.tsx
  index.tsx                                  splash + first-run resolver
  onboarding/[step].tsx                     value, confession, mirror, privacy,
                                             permission primers, apps, allowance, done
  paywall.tsx                                offer + local purchase states
  signup.tsx                                 simulated required signup / sign-in recovery
  (tabs)/
    _layout.tsx
    home.tsx
    manage.tsx
    analysis.tsx
    settings.tsx
  condition-builder.tsx                     one modal; internal typed step state
  walk-session.tsx                          verifying / active / paused / ended
  gym-check-in.tsx                          ready / verifying / verified / failed
  locked-apps.tsx
  manage/rules.tsx                          complete economy/rules hub
  manage/base-allowance.tsx
  manage/rollover.tsx
  manage/streak-policy.tsx
  saved-gyms.tsx
  gym/[gymId].tsx                           simulated map/radius/mode editor
  weekly-rules.tsx
  analysis/trend/[metric].tsx
  analysis/day/[date].tsx                   modal day detail
  analysis/earning.tsx
  analysis/badge/[badgeId].tsx
  share-achievement.tsx                     milestone or recap modal
  lock-moment/[kind].tsx                    time-out; shield variants
  settings/[section].tsx                    data-driven detail adapter
  settings/permission/[permission].tsx
  support/[kind].tsx                        help/contact/bug/idea/diagnostics
  legal/[document].tsx                      local browser-styled Terms/Privacy
  notification-preview/[kind].tsx           local nudge / recap / last-call entry
  debug.tsx                                 hidden demo-state controller
```

Route files remain thin. `src/presentation` owns state and transitions; `src/features/*` owns composition; `src/content` owns copy/fake data; `src/design-system` owns all geometry and motion.

## 4. Required fake presentation state

The route matrix assumes one typed demo state, with no business logic in route files:

```ts
type DemoState = {
  firstRun: boolean;
  onboardingStep: OnboardingStep;
  privacyAccepted: boolean;
  permissionStates: Record<PermissionKey, "notAsked" | "granted" | "denied">;
  selectedLockedApps: string[];
  dailyAllowance: null | "unlimited" | number;
  rollover: { enabled: boolean; capMinutes: number | null };
  streakPolicy: "hardReset" | "autoCushion";
  savedGyms: DemoGym[];
  rules: DemoRules;
  paywallPlan: "annual" | "monthly";
  purchaseState: "idle" | "confirming" | "loading" | "success";
  identityState: "anonymous" | "signingUp" | "signedIn" | "signedOut";
  lockState: "locked" | "unlocked";
  accessMode: "balance" | "state" | "restOfDay" | "setPeriod" | "restDay" | "outsideLockWindow";
  accessSourceConditionId: string | null;
  accessUntil: string | null;
  balanceMinutes: number;
  homeNotice: null | "lowTime";
  conditions: DemoCondition[];
  builder: BuilderDraft;
  walkPhase: "ready" | "verifying" | "active" | "paused" | "grace" | "ended";
  gymPhase: "ready" | "verifying" | "verified" | "failed";
  analysisData: "empty" | "populated";
  analysisRange: "week" | "month" | "year";
  unlockedBadges: string[];
  newBadgeIds: string[];
  permissionHealth: "attention" | "healthy";
  subscriptionState: "trial" | "active" | "cancelled";
  installAgeDays: number;
  unlockMomentCount: number;
  lastShieldShownAt: string | null;
  reviewPromptState: "idle" | "eligible" | "presented" | "dismissed" | "rated" | "suppressed";
  reviewTrigger: null | "fifthUnlock" | "sevenDayStreak" | "thirtyDayStreak" | "manual";
  reviewPromptCount: 0 | 1 | 2 | 3;
  automaticReviewSuppressed: boolean;
  notificationEntry: null | "nudge" | "recap" | "lastCall";
  settings: DemoSettings;
  returnTo: string | null;
};
```

The default guided demo starts first-run, completes a fake annual purchase, completes simulated signup, and lands on the locked **empty Home with zero conditions**. Its large **Add your first way to earn** card is the natural entry to the separate builder flow and creates condition #1. The hidden debug controller can seed the approved Go to gym / While walking / Steps event-state-rate anchor trio without changing the default. Denied, failed, low-time, access-holiday, review-prompt, notification-entry, and alternative shield states are also available through debug so no required visual state is stranded.

---

## 5. Splash and onboarding matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-SPL-01` | `/` | Sparse launch: orange gradient, centered Family-A lock/mark, wordmark. Auto-resolves after a short fade. | No content taps. Resolver → `/onboarding/value` when `firstRun`; otherwise `/(tabs)/home`. | `001` | Copy Pillow's calm brand-only launch; orange/clay identity replaces Pillow mark. |
| `D-ONB-01` | `/onboarding/value` | **Earn your screen time.** Clay lock hero, one outcome sentence, white bottom **Next**. | Next → `/onboarding/confession`. | `010`, `143–145` | Copy one-benefit/one-action rhythm; sell freedom and exercise, never blocking or discipline. |
| `D-ONB-02` | `/onboarding/confession` | **How much time do you spend on your phone each day?** One 1–12+ h slider, hero rounded value, no preselection until touched; Back and Next (disabled initially). | Slider updates local hero; Back → value; Next → mirror once chosen. | `014–021`, `083–084`, `146–149` | Pillow provides focused picker grammar; the confession slider and value are ExcerLock-specific. It seeds Time Reclaimed fake math. |
| `D-ONB-03` | `/onboarding/mirror` | Quiet shock-math screen: daily choice × 365, hero **~76 days a year**, non-judgmental line, white **Take some back**. | Back → confession; CTA → privacy. | `143–145`, `158–160` | Copy spacious value framing and atmospheric transition; no guilt, red, or “wasted life” language. |
| `D-ONB-04` | `/onboarding/privacy` | Shield/lock chip, **Your activity stays yours**, concise on-device promise, **Learn more**, white **I accept**. Light long-form privacy sheet state. | Learn more → light detail sheet; X closes detail; I accept → Screen Time primer; Back → mirror. | `011–013` | Near-direct trust pattern; detail explicitly says the prototype uses local fake state. |
| `D-ONB-05` | `/onboarding/screen-time` | Required Screen Time primer: benefit-led title, one paragraph, violet consequence line, white **Continue**. Simulated native authorization alert states: not asked, allowed, denied/retry. | Back → privacy; Continue → simulated OS alert; Allow sets granted and routes to apps; Don’t Allow returns to primer with repair card; Try again reopens alert. | `022–023`, `025`, `215–218` | Copy value-before-system-prompt and foundational-permission clarity. No real FamilyControls call. |
| `D-ONB-06` | `/onboarding/apps` | Simulated Family Activity picker: system-light sheet, search, category/app rows, selected checks, selected count, Cancel/Done. Required empty and selected states. | Row toggles selection; search filters locally; Cancel → Screen Time primer without changes; Done (disabled at zero) → Motion primer. | `057–063`, `067`, `129–134` | Use Pillow selection/list density but visually yield to native iOS. App names are harmless fake fixtures. |
| `D-ONB-07` | `/onboarding/motion` | Motion & Fitness benefit primer for live walking, with sparse Family-A motion art. Optional **Not now**, white **Allow**; simulated prompt and denial state. | Back → apps; Not now sets denied and continues to Health; Allow → simulated prompt; prompt result → Health. | `025`, `027`, `215–218` | Pillow's feature-before-permission pattern; unlike Screen Time, this is optional because other conditions remain useful. |
| `D-ONB-08` | `/onboarding/health` | Apple Health primer: **Let workouts you already record earn time.** Skip/Allow; simulated permission sheet. | Back → Motion; Skip → Location; Allow → simulated prompt → Location. | `024`, `026`, `215–218` | Copy honest optionality; Apple Health is the only external fitness source shown. |
| `D-ONB-09` | `/onboarding/location` | Optional gym check-in primer. Two-tier copy: manual check-in works with while-in-use; auto-detect is a later hands-free upgrade. Skip/Allow; simulated prompt. | Back → Health; Skip → allowance; Allow → simulated prompt → allowance. | `027`, `102`, `257–259` | Transfer Pillow's operational coaching and recoverable permission language; no map/geofence API. |
| `D-ONB-10` | `/onboarding/allowance` | **Choose your daily free time.** Wheel/list: `0 · Full Lock` through `4 h` in 5-minute semantics plus `Unlimited`; starts blank. Derived sentence explains when apps lock. White **Done** disabled until choice. | Back → Location; picker changes derived copy; Done → setup review. | `014–020`, `021`, `083–086`, `146` | Copy one bounded choice plus live consequence. No app-chosen default. |
| `D-ONB-11` | `/onboarding/review` | Compact **Your setup** confirmation: locked-app count, allowance, permission summary, edit chevrons, white **Looks good**. | Each row jumps to its onboarding step and returns to review; Looks good → done. | `002`, `092`, `096`, `099` | Copy completed-form confirmation and parent summaries; this is not an admin settings page. |
| `D-ONB-12` | `/onboarding/done` | Completion ritual: low copy, warm signature gradient/photo or clay composition, **Your lock is ready to help**, one circular arrow/white **See plans**. | Back omitted; CTA → `/paywall`. | `029`, `158–160` | Copy black→gradient→emotional reveal. Celebrate setup before monetization; no confetti. |

Notification permission is intentionally absent from onboarding. Its first opt-in happens in Settings after a benefit primer, matching the current product decision while still satisfying the brief's permission-framing requirement through Screen Time, Motion, Health, and Location.

The condition builder is intentionally **not** an onboarding step. The pasted mission outranks the conflicting older PRD sentence: onboarding completes its allowance/review/done rhythm, then the hard paywall and simulated signup lead to empty Home. Creating condition #1 begins only when the user taps Home/Manage Add, which keeps the mission's separately named builder flow intact while honoring the PRD's zero-condition empty start.

## 6. Paywall matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-PAY-01` | `/paywall` | Scrollable orange paywall: Family-A hero, **ExcerLock Premium**, transparent trial timeline, annual/monthly plan cards, annual initially selected, restore/legal links, repeated CTA below social/feature proof. States: annual, monthly, top, lower scroll. | Plan card changes selection and CTA copy; **What’s included** → feature detail; Continue → simulated native purchase sheet; Restore → local restore sheet; Terms/Privacy → local browser route. Hard paywall has no dismiss X. | `003`, `030`, `033`, `247` | Copy Pillow's honest timeline, plan truth, repeated CTA, restore/legal access. Use annual/monthly and real-looking localized fixture strings, no fake countdown. |
| `D-PAY-02` | `/paywall` pushed detail | **What’s included**: long dark page with large glyph/title/body pairs for locked apps, conditions, Analysis, schedules, verification. | Back → paywall at prior scroll position. Feature rows are informational, not taps. | `031–032` | Near-direct feature-proof hierarchy with ExcerLock benefits and Family-B glyphs. |
| `D-PAY-03` | `/paywall` native overlay states | Simulated App Store sheet: product, selected plan, trial/renewal terms, account fixture, blue **Subscribe**. Then loading paywall CTA and native success alert. | Cancel → paywall idle; Subscribe → loading; fake completion → success alert; **Done** marks purchase complete and routes to required `/signup`. Repeat taps disabled while loading. | `034–036` | Preserve the native trust boundary and disabled processing. No StoreKit call; identity remains anonymous until the following simulated signup. |
| `D-PAY-04` | `/paywall` restore overlay | Simulated restore progress then either **Purchases restored** or **Nothing to restore** alert. | Cancel closes; OK on restored → required `/signup` when identity is anonymous, otherwise Home; OK on none → paywall. Hidden debug chooses result. | `034–036`, `247`, `252` | Pillow provides native acknowledgement and subscription truth; two deterministic demo outcomes ensure both states are inspectable while the identity gate remains consistent. |

## 6A. Simulated identity matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-AUTH-01` | `/signup`, full screen | Required post-purchase **Save your setup** identity screen plus signed-out **Sign back in** recovery mode. Warm dark surface, concise benefit copy, Continue with Apple and Email fixture rows, local email-entry/validation state, processing state, and compact success acknowledgement. It must visibly say **Demo account — nothing is sent**. | Post-purchase: Apple or valid Email → local processing → `identityState=signedIn` → first empty Home. Recovery: the same actions → signed-in Account detail. Back is disabled only in required post-purchase mode; recovery mode Back returns to signed-out Account. Legal links → local documents. | Form/progress `024`, `068–072`; native trust boundary `034–036`; account grouping `210–214` | Pillow supplies explain→identify→progress→acknowledge rhythm, but account creation is ExcerLock-specific. Simulate the required Clerk placement without network, credential storage, or a real Apple/Clerk action. |

## 7. Home matrix

The Home composition always follows the four-tab anchor: streak/goal context, lock hero, two-stat row, today's condition region, Edit and Analysis shortcuts, then the four plain tabs. First Home uses the empty condition region; after condition #1 is created it becomes the carousel. The shell stays stable across balance and access-holiday state changes.

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-HOME-01` | `/(tabs)/home` | **Locked populated anchor state** after condition #1 or debug seed: closed clay lock, goal bar, `Time Locked`, `Screen Time`, condition carousel, shortcut rows. Preserve exact orange palette and geometry of `tabbar-4plain-v1.png`. | Goal bar/thumb → streak block on Analysis; lock hero or Screen Time stat → Balance sheet; Time Locked stat → today's Analysis day detail; condition info/card body → Condition detail sheet; Edit → Manage; Analysis → Analysis tab; tab taps follow global contract. | `037–039`, `052`, `078–079`; ExcerLock anchors | Use Pillow's daily-hub shell but make the supplied ExcerLock mockup the geometry/color authority. This is the approved populated comparison state, not first-run seed data. |
| `D-HOME-02` | Same route/state | **Unlocked state**: open shackle, spendable balance, softened/open goal marker, completed event label. The rest of the page does not jump. | Same taps as locked. Open hero tap → Balance sheet. | `038–039`, `107–112`; approved v18 unlock reference | Success changes in place. No takeover, confetti, toast, claim button, or sound. |
| `D-HOME-03` | Same route/state | **Earn transition**: condition completion commits; button crossfades to `✓ Completed`; shackle performs v18 pop-up/drift-right/drop; balance and stats count upward; one haptic. Multiple pending earns aggregate into one transition. | During animation all unrelated taps remain live; completed button becomes disabled; after settle, normal unlocked interactions resume. | `029`, `037–039`, `108–112`; v18 ExcerLock motion anchor | Pillow supplies in-place state stability; motion geometry comes from the approved ExcerLock animation. |
| `D-HOME-04` | Same route/state | **Default first Home / empty conditions**: mature Home shell remains; condition area becomes one large dark add card with plus and supportive line **Add your first way to earn**. No hidden seed condition is present. | Plus/card → builder catalog with `returnTo=home`; Save creates condition #1 and returns to populated Home; Edit → Manage empty state. | `037–038`, `052`, `078` | Preserve architecture like Pillow empty states; add one sentence because the concept may be new. This resolves the zero-condition PRD requirement while keeping the builder separate from onboarding per the pasted mission. |
| `D-HOME-05` | Same route/card state | **Event condition card**: Family-C banner, bottom scrim, name, info, incomplete/ready/completed state. Anchor example **Go to gym / Complete**. After a rest-of-day or set-period payout it retains the completed source and shows the active access result/expiry. | Info/card body → Condition detail; Complete on gym event → `/gym-check-in`; Complete on already-detected non-location event → Home earn transition; completed button disabled; rest-of-day/set-period completion → `D-HOME-10`. | `007`, `079`, `107–112`, `115–122`, `236`; ExcerLock event anchor | Preserve the approved card exactly; condition semantics determine verification and reward. Explicit result copy prevents a non-balance reward from looking like ordinary banked minutes. |
| `D-HOME-06` | Same route/card state | **State condition card**: Walking banner, `ACTIVE` chip with pulse, **Apps stay open while you move**, small **Balance drains normally** status; inactive card shows **Start walking**. | Inactive Start/card → `/walk-session?phase=ready`; active card → active session; info → Condition detail. | `104–107`, `112`, `120–127`; `card-state-live-v1.png` for composition only | Copy Pillow live-state hierarchy. Deliberately replace stale “drain paused” with normal-drain truth. |
| `D-HOME-07` | Same route/card state | **Rate condition card**: Steps banner, friendly ratio, today's metric, banked total, thick rounded meter, no daily-cap label/control. | Card body → `/analysis/earning?condition=steps`; info → Condition detail; no claim button because credit is continuous. | `173–177`, `186–190`; `card-rate-meter-v1.png` for palette/content only | Use approved rate content but enforce the shared 20 pt card margin from other anchors; no cap and no chunk cliffs. |
| `D-HOME-08` | Home branded sheet | **Balance detail**: hero remaining time, allowance/earned/spent rows, one short explanation, cheapest active earning route. Empty and positive variants share geometry. | X/swipe → Home; cheapest route CTA → matching Walk/Gym/builder flow; **See trend** → Analysis trend. | `005`, `037–039`, `053–054`, `173–177` | Transfer Pillow summary→supporting-metrics hierarchy; no per-app breakdown because the locked group is opaque. |
| `D-HOME-09` | Home branded sheet | **Condition detail**: banner header, kind/status, exact rule, today progress/evidence, active window, and **Edit condition**. Rest-of-day/set-period variants name the completed source plus expiry; rest-day/outside-window variants name the neutral rule holiday and next active boundary. | X → Home; Edit → builder in edit mode; Start/Check in if applicable → session; Analysis → earning detail. During a rule holiday, action controls are read-only while Edit remains available. | `005`, `092`, `100`, `166–171` | Combine Pillow's compact status cards and requirement evidence; keep every access-holiday cause and expiry/next boundary factual and inspectable. |
| `D-HOME-10` | `/(tabs)/home`, event access-holiday state | **Rest of day / Set period** payout variants. The lock is open; the balance hero is replaced by **Unlocked for today** or **Unlocked until 8:30 PM**; no balance drain occurs; the source Event card is completed and names the reward. Set-period expiry returns to the balance-derived locked/unlocked state without changing layout. | Hero/status → Balance detail with reward source and expiry; source card → Condition detail; Edit/Analysis/tabs remain live; debug can expire the period immediately. | `038–039`, `107–112`, `173–177`, `236` | Pillow proves stable in-place state changes and conclusion-first duration summaries. ExcerLock adds explicit shield-holiday semantics because these Event rewards are not minutes in the shared balance. |
| `D-HOME-11` | `/(tabs)/home`, rule access-holiday state | **Rest day / Outside lock window** variants. The access pose is open/relaxed; hero copy is **No limits today** or **Limits start at 7:00 PM**; usage neither locks nor drains. Condition cards remain spatially present but desaturate and show `REST DAY` or `OUTSIDE WINDOW`; goal/streak copy explains the day is neutral. | Hero/status → Rules summary sheet; **Edit rules** → `/manage/rules`; a condition card still opens read-only detail; when the rest/window ends, Home returns to the balance-derived state. | `004`, `038–039`, `083–086`, `198–200`, `226–227` | Transfer Pillow's scheduled-state summaries while deliberately preserving Home geometry. Neutral open-access treatment distinguishes a rule holiday from earned time and avoids implying a balance payout. |

## 8. Condition-builder matrix

The builder is one modal route with internal typed steps. Create mode starts blank; edit mode is prefilled from the chosen condition. Back preserves the draft. X on a touched draft presents a native discard alert.

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-BLD-01` | `/condition-builder`, `step=catalog` | Large title **Choose a way to earn**; grouped human-named catalog: Gym, Walking, Running, Cycling, Swimming, Any activity. Available, taken, and conflict-disabled rows; disabled rows show one-line reason. | X → close/discard; available row → place/config branch; disabled row → explanatory popover; category chips/filter locally; Back absent on first step. | `009`, `057–059`, `061–063`, `115–119`, `129–134` | Transfer browse/filter/disabled-state grammar. Users never choose abstract State/Event/Rate labels. |
| `D-BLD-02` | Same modal, `step=place` | Gym-only place chooser: saved gyms as image/row cards, **Add a gym**, selected fill, and five-gym limit state. Add/Edit opens the shared simulated gym editor (`D-MAN-13`). Activity conditions skip this step because Apple Health is the only source. | Back → catalog; saved gym → configure; Add/Edit → `/gym/[gymId]?returnTo=builder`; Save place → chooser with fixture selected; at five gyms Add is disabled with inline explanation; Cancel → chooser. | `014–020`, `057–063`, `067`, `127`, `257–258` | Pillow supplies focused selection and capacity-state grammar. Reuse one honest simulated gym editor rather than inventing a builder-only map or a real location action. |
| `D-BLD-03` | Same modal, `step=configure` | Kind-specific configuration: **State** = grace period + optional active window; **Rate** = fixed quantum + required minutes wheel; **Event** = required threshold where applicable. Required values begin empty in create mode; Next disabled until complete. | Back → prior step; each row → wheel/choice sheet; toggles reveal dependent active-window controls; Next → event reward for Event, banner for State/Rate. | `080–100`, `123–125`, `146–157`, `237–246` | Copy progressive disclosure and wheel sheets. State has no drain setting; Rate has no cap control. |
| `D-BLD-04` | Same modal, `step=reward` | Event-only reward details: fixed chunk / rest of day / set period; repeatable; per-day cap; cooldown. Choice cards explain result in one line. | Back → configure; reward choice fills and reveals only its picker; toggle changes locally; Next → banner once required values chosen. | `086–099`, `146–157`, `226–227`, `237–246` | Transfer one-choice immediacy and dependent controls. Do not expose irrelevant settings. |
| `D-BLD-05` | Same modal, nested picker | Active-window and bounded-value pickers: native-feeling wheel, derived sentence, compact Done. | Wheel updates preview behind dim layer; Cancel reverts; Done commits and returns to configure/reward. | `014–020`, `083–085`, `123–125`, `243–246` | Temporary precision UI, never a bespoke full route for one value unless hero-scale consequence is needed. |
| `D-BLD-06` | Same modal, `step=banner` | Curated Family-C banner gallery, activity chips, 21-item conceptual library, selected tile/card, last row **Use your own photo**. A sensible banner is visually suggested, but user can continue or change it. | Back → configure/reward; tile selects; View all/filter changes list; Use your own photo → simulated native photo sheet then hardcoded demo crop; Next → exact preview. | `115–134`, `228–229`, `234–236` | Use Pillow's art-first selection and coherent variant family. All bundled art must follow STYLE Family C; no stock imagery. |
| `D-BLD-07` | Same modal, `step=preview` | Exact finished Home card inside a tactile preview surface. Variant is Event, State, or Rate with real chosen banner/copy; explanatory line says it will look identical on Home. | Back → banner; card info no-op press feedback; **Save condition** → persist fake condition and return to origin. | `007`, `079`, `122`, `236` | Pillow's preset-as-object and selected mini-player prove exact-preview value. No approximation or alternate preview component. |
| `D-BLD-08` | Same modal, edit mode | Existing-condition editor: name, enable, kind-appropriate values, banner, active window, destructive Delete, white Done. | Rows push to same pickers; Done commits and returns; Delete → native confirmation → remove and return; X with changes → discard alert. | `080–101`, `129–134`, `237–246` | Copy Pillow's editor and staged destructive flow. Kind is immutable in edit mode; create a second condition to change kind. |

## 9. Walk-session matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-WALK-01` | `/walk-session`, full screen | **Ready / instruction**: near-black warm register, simple motion/phone line art, concise requirements, Motion/Location status, white **Start walking**, secondary Cancel. | Start → verifying; permission row → permission detail; Cancel → `returnTo`; Always show toggle changes locally. | `102`, `104`, `215–218` | Copy Pillow's procedure coaching. Explain that apps remain accessible only while walking and balance still drains. |
| `D-WALK-02` | Same route | **Verifying**: one large animated ring/footstep glyph, **Finding your walking rhythm…**, cadence dots, Cancel. | Cancel → Home; deterministic timer → active. Debug may redirect to permission failure. | `008`, `104`, `120`, `257–259` | Transfer one-object live focus and loading without layout shift; no fake numeric precision. |
| `D-WALK-03` | Same route | **Active**: elapsed time/steps as hero, ACTIVE chip, normal-drain balance line, stop and pause circles, optional top condition row. | Pause → confirmation/action sheet; End → end confirmation; top row → condition summary sheet; background timer advances fake values. | `104–107`, `112`, `120–126` | Near-direct live/night grammar. Normal drain is explicit. |
| `D-WALK-04` | Same route + action sheet | **Paused / grace**: paused state uses violet attention button to Resume. Grace state says **Keep moving** with countdown and helpful copy. | Resume → active; End → ended; grace recovery → active; countdown expiry → ended with stopped cause and locked Home state. | `106–107`, `108`, `123–125` | Copy two-step pause safety and stable geometry; violet replaces Pillow orange attention role. |
| `D-WALK-05` | Same route | **Ended**: summary card (duration, steps, access time), neutral cause (`Ended by you` or `You stopped walking`), white **Done**, translucent **Start again**. | Done → Home; Start again → verifying; **Why did apps lock?** → short explainer sheet. | `109–114`, `159–160`, `259` | Transfer Pillow's ended/mood/failure hierarchy without asking for mood unless later scoped. No punitive language. |

## 10. Gym check-in matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-GYM-01` | `/gym-check-in`, full screen | **Ready**: selected gym banner/place, location health row, simple instruction, white **Check in**, secondary Cancel. | Check in → verifying; location row → permission detail; Cancel → Home. | `102`, `257–258` | Copy exact-scope diagnostic setup; no real location sample. |
| `D-GYM-02` | Same route | **Verifying**: compact ring, **Checking your location…**, gym name and radius summary, Cancel. | Cancel → ready; fake success timer → verified. Hidden debug can produce failed result. | `120`, `257–259` | One visible task; preserve selected context during verification. |
| `D-GYM-03` | Same route | **Verified**: green check/chip, **You're at the gym**, reward summary, white **Done**. | Done → Home and trigger the in-place aggregate unlock; View condition → Home condition detail. | `072`, `160`, `216`, `223`, `259` | Success is compact because the emotional reward happens on Home; no separate celebration takeover. |
| `D-GYM-04` | Same route | **Failed**: orange **Couldn't verify this check-in**, two plausible causes, green repair label, white **Instructions**, secondary **Try again** and Back. | Instructions → Location permission detail; Try again → ready/verifying; Back → Home; X → Home. | `051`, `068–072`, `114`, `257–259` | Near-direct recoverable-diagnostic hierarchy; never red full-screen or accusatory. |

## 11. Manage matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-MAN-01` | `/(tabs)/manage` | Three sections: **Conditions**, **Locked apps**, **Rules**. Populated condition rows wear their Family-C banners, show kind/status, enable switch, drag handle; empty state keeps section shells. Rules summarizes base allowance, rollover, streak policy, weekly schedule, and saved gyms. | Add → builder catalog; condition body → builder edit; switch toggles locally; drag enters reorder; swipe reveals Remove; Locked apps row → picker; Rules row → complete Rules hub; tabs global. | `006`, `057–060`, `078–082`, `129–134`, `210–214` | Combine Pillow reorder/edit list with the ExcerLock three-section IA. No preset section; global economy knobs stay under Manage rather than leaking into Settings. |
| `D-MAN-02` | Same route states | Reorder, swipe-delete, and delete-confirm states. Disable is non-destructive and retains history; delete is destructive. | Long press/drag reorders; swipe minus → confirmation; Cancel restores; Delete removes and collapses row; info label explains disabling. | `044–051`, `057–060`, `130–134` | Preserve object, count/context, and row collapse. Disable and delete must never be conflated. |
| `D-MAN-03` | `/locked-apps` | Simulated Family Activity picker with current selection, search/categories, selected count, Done. Empty and populated. | Row toggles; search filters; **What stays available?** opens explainer; Cancel discards; Done commits and returns Manage. | `057–063`, `067`, `129–134` | Native/system ownership is visually honest. Explain Phone/Messages/Maps/ExcerLock exemptions. |
| `D-MAN-04` | `/weekly-rules` | Week grid default Mon–Sat Active/Sun Rest; lock-window card; holiday/off-day list; current summary. | Day cell → day sheet; Lock window toggle reveals From/To rows; time row → wheel; Add date → calendar sheet; Done → Rules hub. | `004`, `083–086`, `198–200`, `226–227`, `243–246` | Copy direct time manipulation and single-choice rows. Weekly scheduling is one child of the complete Manage Rules hub, not the entire rules system and not a Settings concern. |
| `D-MAN-05` | Weekly-rules day sheet | **Active / Rest / Custom** selected-row list. Rest reveals **No locking / Allowance only**. Custom reveals allowance, condition-reward overrides, and lock-window controls. Reward override opens created conditions, then the existing kind-appropriate reward picker; untouched conditions retain normal rewards. | Choice fills row immediately; dependent controls spring open; allowance/window rows open wheels; reward row → condition list → reward picker; Done commits and returns week grid; Cancel reverts. | `086`, `097–100`, `146–157`, `226–227`, `237–246` | Immediate selection plus progressive disclosure. ExcerLock extends Pillow's day editor to the PRD's explicit Custom-day reward override without exposing irrelevant controls for every condition kind. |
| `D-MAN-06` | Weekly-rules time/calendar sheets | Native-like wheel and calendar. Holiday date becomes Rest without affecting streak; existing date can be removed. | Wheel live-previews time, Cancel/Done; calendar day toggles selection; Add commits; existing holiday swipe/remove → confirm. | `083–085`, `123–125`, `243–246`, `257–258` | Reuse one picker language for time/date. No real calendar integration. |
| `D-MAN-07` | Buried route from Rules detail | **Today needs a rest day** override: explanatory copy, required free-text reason and disabled **Use rest day** until non-empty; native confirm. | Back → rules; text updates count; Use rest day → confirm; Cancel → edit; Confirm updates today's state and returns Manage. | `024`, `068–072`, `248–249` | Uses Pillow's gated feedback/irreversible-action rhythm. Kept buried, not a root shortcut. |
| `D-MAN-08` | `/manage/rules` | Complete **Rules** hub with current-value rows for Base allowance, Rollover, Streak policy, Weekly schedule & lock window, Saved gyms, and the buried current-day override entry below secondary explanation. | Each row → its named child; current-day override → `D-MAN-07`; Back → Manage with summaries updated. | `092`, `096`, `099–100`, `210–214`, `237–246` | Transfer Pillow's parent-summary/child-specialization pattern. ExcerLock groups all global economy rules here so the “whole economy editor” claim is true and Settings remains administrative. |
| `D-MAN-09` | `/manage/base-allowance` | **Daily free allowance** editor: `0 · Full Lock` through `4 h` in five-minute steps plus `Unlimited`, current value selected, hero consequence sentence, compact Done. Existing users begin on their saved value; reset/debug may show unselected/disabled-Done state. | Wheel/list updates consequence; Done commits and returns Rules; Cancel/Back reverts. | `014–021`, `083–086`, `146–157`, `243–246` | Reuse the onboarding decision grammar for later edits. The app still chooses no economy value; it only reflects the user's explicit selection. |
| `D-MAN-10` | `/manage/rollover` | **Carry unused time forward**: Off / On. On reveals required cap wheel `30 min–4 h` in 30-minute steps and a plain-language next-day example. Off, On-incomplete, and On-configured states share geometry. | Choice updates locally; cap row → wheel; Done disabled until On has a cap; Done commits → Rules; Back/Cancel reverts. | `092–099`, `123–125`, `226–227`, `237–246` | Pillow supplies summarized dependent settings. ExcerLock adds a bounded carryover rule and shows its consequence rather than presenting an unexplained toggle. |
| `D-MAN-11` | `/manage/streak-policy` | **When I miss an active day** single-choice list: **Reset my streak** (default) or **Use one automatic cushion**. Cushion consequence is explicit: the first missed active day automatically becomes a logged rest day. Each row includes factual consequence copy and current selection. | Row commits immediately; Learn more → explainer sheet; Back → Rules with subtitle updated. | `097–099`, `143–160`, `226–227` | Copy Pillow's immediate choice plus consequence framing. The non-punitive copy explains ExcerLock's integrity rule without disguising the hard-reset default. |
| `D-MAN-12` | `/saved-gyms` | Saved-gym collection with empty, populated, and **5 of 5** capacity states. Rows show name, radius, Manual/Auto-detect mode, verified-POI or honor-system tag, and optional Wi-Fi confirmation. | Add → new `D-MAN-13`; row → edit; swipe Delete → confirmation; at five gyms Add is disabled with reason; Back → Rules. | `057–067`, `092`, `100–101`, `129–134`, `210–214` | Combine Pillow's collection/capacity/destructive grammar with ExcerLock's location objects. Make the platform cap visible before a failed Save. |
| `D-MAN-13` | `/gym/[gymId]` | New/edit simulated gym: fake map search/drop pin; radius circle starts at **100 m** and drags **50–200 m**; mode is **Manual check-in** or **Auto-detect**; optional Wi-Fi confirmation; verified-POI/honor-system explanation. Auto-detect has notAsked/granted/denied Always-location states; Manual remains usable in every state. | Search/pin/radius mutate local preview; mode selects; Auto-detect → benefit primer → simulated permission result; Wi-Fi row selects a fake network; Save returns to caller; Delete in edit mode → confirm; Cancel reverts. | `067`, `102`, `127`, `215–218`, `237–246`, `257–259` | Pillow provides system-utility and permission-repair hierarchy. ExcerLock simulates the complete two-tier gym setup without a real map, Wi-Fi read, geofence, or Settings deep link. |

## 12. Analysis matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-ANA-01` | `/(tabs)/analysis` | Populated overview, top to bottom: optional fresh weekly recap; hero **Time Reclaimed**; trend preview; streak current/longest + heat map; earning breakdown; 22-badge shelf. Empty state preserves all shells with placeholders. | Recap Share → share preview; hero/trend card → trend detail; range chips update preview; heat cell → day modal; earning card → earning detail; unlocked badge → badge detail/share; locked badge → progress detail; tabs global. | `173–177`, `208–209`; empty scaffolds `178–205`; challenge shelf/progress `135–143`, `164–171` | Pillow's conclusion-first metric stack is primary. Heat map, 22 badges, and Time Reclaimed formula are ExcerLock-specific. |
| `D-ANA-02` | `/analysis/trend/time-reclaimed` | Metric detail shell: Week/Month/Year, period arrows, fat rounded spent/earned/reclaimed marks, comparison row, extrema, average/distribution, explanatory content. Empty/populated/range states. | Back → Analysis; segment/range arrows replot locally; Compared with → sheet; summary cards press to explanatory subdetail if present. | `178–190`, `191–200` | Near-direct shared analytic scaffold. Use plain-language conclusion before chart. |
| `D-ANA-03` | Trend comparison sheet | Choices: None, Steps, Workout minutes, Conditions completed, Unlock time used, Blocked attempts. Selected row fill; no Done. | Row → set comparison, dismiss, animate second series/axis; X/swipe → no change. | `184–185` | Direct Pillow comparison behavior with ExcerLock correlations. |
| `D-ANA-04` | `/analysis/day/[date]`, modal | Heat-map day detail: date/status glyph, what first met streak, conditions that fired, minutes earned/spent, rest/missed explanation. Six states: event, rate, state, missed active, rest/override, blank. | X/swipe → Analysis; condition row → earning detail; **Start today** on unmet current day → cheapest session/condition. | `005`, `053–054`, `171`, `205–209` | Pillow supplies attributed detail and dignified Unknown/empty; six-cell semantics are an explicit ExcerLock design. Missed is neutral, never red/X. |
| `D-ANA-05` | `/analysis/earning` | Total banked minutes, ranked condition cards, source colors, optional Week/Month segment, per-hour distribution lower in scroll. | Back → Analysis/Home; condition row → condition detail; segment changes aggregate. | `006`, `053–056`, `176–177`, `201–204`, `208–209` | Copy total→ranked sources→methodology. No per-locked-app use breakdown. |
| `D-ANA-06` | `/analysis/badge/[badgeId]` | **Unlocked**: badge art, milestone name/number/month, progress history, Share. **Locked**: gray silhouette, threshold, current progress ring, **How to make progress**. **New**: scale-in/glint once. | Back → shelf; Share on unlocked → share preview; condition suggestion → Home/Manage; tapping New clears glint. | `135–143`, `164–172`, `176–177` | Challenge/progress grammar transfers; no XP, levels, mascot, or punitive locked styling. |
| `D-ANA-07` | `/share-achievement`, branded sheet | Milestone or recap card preview; `9:16 / 1:1` segment; safe aggregate-only content; branded output; white **Share**. | X/swipe → origin; segment swaps preview geometry; Share → simulated native share sheet; Save Image → local success alert only if shown. | Card composition: `176–177`, `181`; modal/native share: `064–066`, `162–171` | No Pillow screenshot contains a finished share card. ExcerLock composes one from Pillow mini-report hierarchy and hands it to native UI. No names, apps, gym/location, or health values. |
| `D-ANA-08` | Simulated native share sheet | White iOS share surface with achievement preview thumbnail, AirDrop/Messages/Mail actions and system list. | Any target → short local **Shared** acknowledgement then dismiss; Cancel → preview. | `066`, browser share chrome `262` | Preserve system trust boundary; no real external share. |

## 13. Lock-moment matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-LOCK-01` | Home overlay state | **10 minutes left** in-context translucent banner with one violet attention accent, cheapest earn suggestion, dismiss X. It never covers the hero. | Primary **Earn more** → cheapest available condition/session; X dismisses for current demo session; banner body → Balance sheet. | `038`, `052`, `112` | Copy Pillow's in-context banner and local attention color. No push notification or takeover. |
| `D-LOCK-02` | `/lock-moment/time-out`, full screen | In-app time-out: warm near-black/orange register, closed clay lock, **Time’s up—for now**, cheapest genuine unlock path, white/brand CTA, secondary Home. | Primary → matching Walk/Gym/Home condition; **See all ways to earn** → Home conditions/Manage; Close/Home → locked Home. | `008`, `108–114`, `259` | One hero, one recovery action, calm diagnosis. No red/scolding. |
| `D-LOCK-03` | `/lock-moment/[kind]`, shield-like surface | **Blocked-app moment** on the required light ivory blur with Family-A closed lock. Four local variants: `balance-empty`, `full-lock`, `walk-ended`, `schedule`. Copy uses offer numbers only. | Balance/Full Lock: **Open ExcerLock** → matching time-out/Home surface; secondary Close → local dismissed state. Walk ended: **Keep walking** → Walk verifying; Close. Schedule: single **OK** → dismissed state. | Structural refs `008`, `104–114`, `257–259`; ExcerLock shield specification is authoritative | Deliberate departure from Pillow night surfaces: ivory blur is required. Never show stale balance/streak/spent counters on a shield. |

## 14. Settings root and permission matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-SET-01` | `/(tabs)/settings` | Long grouped root. Pinned **Permissions health** summary, then Account, Subscription, Notifications, General, Data & Connections, Support, About, version/build footer. Rows have leading Family-B chips, subtitle/value, chevron or immediate toggle. | Permission panel → health; every chevron → named detail; reversible switches toggle locally; version tapped 7× → hidden debug; tabs global. | `210–214` | Transfers almost one-for-one. Remove Pillow profile/AI/newsletter/cross-sells; order follows the brief. |
| `D-SET-02` | `/settings/permissions` | Diagnostic list: Screen Time, Location, Motion & Fitness, Apple Health, Notifications. States: attention (one or more repair rows) and all healthy (green checks). **About permissions** first. | About → long explainer sheet; permission row → its detail; Back → Settings. | `215–218` | Direct transfer with ExcerLock permissions and live-looking fake status. |
| `D-SET-03` | `/settings/permission/[permission]` | Per-permission benefit/data-use detail plus status and fix route. Denied state shows **Open Settings** simulated action; granted state shows green status and optional demo reset. | Back → health; Open Settings → simulated iOS settings sheet then local status update; About data → long text sheet; Retry diagnostics where applicable. | `217–218`, `237–239`, `257–259` | Explain what is read, why, and what still works without it. No fake claim of opening real Settings. |

## 15. Settings detail matrix

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-SET-04` | `/settings/account` | Fake account profile in signed-in and signed-out states. Signed in: email fixture, Sign out, Delete account. Signed out: short **Sign in to restore your setup** card and local-only warning. Sign-out/delete confirmations explain consequences without executing them. | Back; Sign out → native confirm → signed-out state; signed-out **Sign in** → `/signup?mode=recovery&returnTo=account`; successful simulated sign-in → signed-in Account; Delete → typed `DELETE`/native confirm → local deleted/signed-out state; Cancel preserves. | Root grammar `210–214`; identity/progress `024`, `068–072`; destructive staging `046`, `073`, `101`, `255–256` | Pillow has no direct account page in these refs; reuse trusted grouped, progress, and destructive patterns. The recovery action closes the signed-out dead end while remaining a deterministic fake account flow. |
| `D-SET-05` | `/settings/subscription` | Trial/active/cancelled account truth, plan, date, Restore, Redeem, Manage. Optional cancellation-reason and honest win-back states. | Restore → simulated progress; Change/cancel → reason list; reason enables Continue; Continue → honest no-countdown offer; accept → fake purchase; decline → native cancel confirm; cancelled screen offers Subscribe. | `247–252`, main purchase `030–036` | Near-direct subscription lifecycle. Remove Pillow's fake countdown; use a genuine lower-price fixture if win-back is shown. |
| `D-SET-06` | `/settings/notifications` | Three toggles, all default off: afternoon nudge, weekly recap, streak last-call. Nudge-time row only appears when nudge is on. First-ever toggle opens one-line benefit primer then simulated OS permission. | Toggle with notAsked → primer → Continue opens prompt; Allow commits; Not now leaves off. Enabled toggle changes immediately. Nudge time → wheel sheet. Back → root updated. | `022–023`, `237–246` | Value-before-permission; no notification prompt in onboarding. No low-time or earn-verified push toggles. |
| `D-SET-07` | `/settings/appearance` | Auto / Light / Dark selected-row or segment; immediate whole-screen token crossfade. | Choice changes locally; Back commits. | `230–235` | Direct theme-state proof. The orange theme remains identity; dark is warm near-black, light is warm ivory. |
| `D-SET-08` | `/settings/general` | General hub: Appearance, Language, Day boundary, Start week on, Units, Siri & Shortcuts, Haptics, Sounds. Current values in subtitles. | Row pushes detail; Language → simulated iOS per-app settings; Haptics/Sounds toggle; Back persists. | `210–214`, `226–227`, `237–246` | Parent summary / child specialization. |
| `D-SET-09` | `/settings/day-boundary` | Off (midnight) or Custom. Custom reveals time wheel. Consequence copy explains reset timing. | Selection updates; custom time → wheel; Done commits; Back when clean. | `021`, `083–086`, `237–246` | Explanation-first immediate choice plus temporary precision picker. |
| `D-SET-10` | `/settings/start-week` | Use device setting / Sunday / Monday, selected row fill, no Save. | Row commits immediately; Back → General with subtitle. | `226–227` | Direct transfer. Analysis heat-map columns update with the setting. |
| `D-SET-11` | `/settings/units` | Miles / Kilometers immediate-choice list with short downstream explanation. | Choice commits; Back updates General. | `226–227`, `237–242` | Same setting lifecycle; no unit wheel because the decision is binary. |
| `D-SET-12` | `/settings/connections` | Apple Health and Siri & Shortcuts only. Rows show connected/not connected, last fake refresh, and purpose. No vendor marketplace. | Apple Health → detail; Siri → shortcuts hub; Disconnect → confirm; Back. | `215–225` | Copy branded hub → native handoff → surgical green status update. Direct vendors are omitted. |
| `D-SET-13` | `/settings/apple-health` | What is read, per-signal fake last-sample statuses, reconnect/permission path, transparent manual-entry rule. | Permission row → permission detail; **Run diagnostics** → diagnostics flow; Back. | `215–219`, `257–259` | Pillow's status-led health detail with ExcerLock signal language and no health values. |
| `D-SET-14` | `/settings/shortcuts` | Hub: **Check balance**, **Start walking**, **Check in at the gym** with Add/Added states and a simulated native Siri confirmation sheet. | Row → detail; Add → simulated native sheet; Done → row changes to green Added; Remove → confirm/local reset. | `220–225` | Near-direct connection lifecycle with ExcerLock outcomes. |
| `D-SET-15` | `/settings/data` | Export activity ledger, Export conditions, Reset demo data, Delete all local data. Every row has consequence/format subtitle. | Export → simulated native share sheet; Reset/Delete → native confirmation then local success; Back. | `255–256`, share `066` | Transparent action inventory; do not imply a real file was created. |
| `D-SET-16` | `/support/help` | Light support hub: search, suggested articles for locked apps, earning, permissions, gym verification, subscription; Contact support. | Search filters fixtures; article → browser-styled article; Contact → composer; X/Back → Settings. | `253–254` | Branded hub to honest document handoff. |
| `D-SET-17` | `/support/contact`, `/support/bug`, `/support/idea` | Shared composer with mode-specific title, text, optional fake screenshot attachment for bug, visible diagnostic fields, character count, Send disabled until body exists. | Back with text → discard alert; attachment → simulated photo sheet; Send → loading → native/local thank-you alert → Support. | `024`, `068–072`, `248–249` | Copy explain→identify→send→progress→gratitude. No external message is sent. |
| `D-SET-18` | `/support/diagnostics` | Diagnostic wizard: scope/date if relevant, status-only bundle preview, Check/Prepare, success or **No data found** recovery. Never display health values, app names, or coordinates. | Check → loading → success/failure; Instructions → permission detail; Share bundle → simulated share sheet; Back. | `257–259` | Direct diagnostic hierarchy and semantic colors. Failure offers repair, not blame. |
| `D-SET-19` | `/settings/about` | What's new, Rate, Share ExcerLock, Follow us, Credits, Terms, Privacy; version/build footer. | Each row pushes its screen/system simulation; **Rate ExcerLock** sets automatic review prompting permanently suppressed, then presents `D-SET-25` manually; footer 7 taps → debug; Back. | `214`, `260–262` | Pillow's concrete About directory is trimmed to real ExcerLock rows. Manual Rate is an intentional user action and therefore permanently replaces future automatic asks. |
| `D-SET-20` | `/settings/whats-new` | Branded release-notes cards, latest first, optional Family-C/Family-A art only where meaningful. | Back → About; card expands/collapses or scrolls; no external fetch. | `038`, `136–139`, `162–163`, `214` | Editorial card hierarchy with local fixture JSON. |
| `D-SET-21` | `/settings/follow` | TikTok and Instagram large link rows only. | Row → simulated external-app acknowledgement; Back. | `261` | Direct row pattern, reduced to approved networks. |
| `D-SET-22` | `/legal/terms`, `/legal/privacy` | Local browser-styled white/dark legal document with native-looking Done/Reader/share chrome. | Done → About/paywall origin; Share → simulated share sheet; Reader toggles local typography. | `011–013`, `254`, `262` | Honest long-document handoff. Copy must not pretend an unpublished hosted policy exists. |
| `D-SET-23` | `/settings/credits` | Calm legal/asset provenance page for user-relevant acknowledgements only. | Links → simulated browser acknowledgement; Back. | `260` | Generated-asset prompts/validation stay in FOUNDRY manifests, not this user-facing page. |
| `D-SET-24` | `/debug`, hidden | Dev/TestFlight-only state controller: reset onboarding/signup; jump Home empty or seed the event/state/rate anchor trio; Home locked/unlocked/low and all six access modes; Walk phases; Gym outcomes; Analysis empty/populated/new badge; permission health; subscription/identity states; review prompt eligible/presented/dismissed/rated/suppressed for every trigger; notification previews; all shield variants. | Each row mutates local demo state and routes to target; notification rows open `D-NOT-01…03`; review rows open `D-SET-25`; **Reset all** → confirm → splash. Close → Settings. | Hidden-entry precedent is product-specific; grouped setting grammar `210–214`, destructive confirm `101` | Required so every hardcoded visual state is reachable without polluting production UI. Anchor seed data is debug-only; no debug entry appears as a normal Settings row. |
| `D-SET-25` | Simulated native review prompt overlay | Local facsimile of the iOS review request with eligible, presented, rated, dismissed, and permanently suppressed states. Automatic eligibility sequence: dismissal of the 5th unlock with install age ≥3 days, then first 7-day streak, then 30-day streak; suppress within 30 minutes of any shield; stop after three presentations or immediately after manual Rate. `reviewTrigger` records which candidate caused the visible fixture, independently of the permanent automatic-suppression flag. | Automatic eligible event presents only when suppression rules pass; star/submit → local rated acknowledgement and permanent stop; Not now/dismiss → increment prompt count and return to prior surface; manual Rate first sets `automaticReviewSuppressed=true`, then opens one manual fixture without clearing that flag; debug can enter each trigger/state combination. | Native acknowledgement/progress `034–036`; Settings/About entry `210–214`, `260–262` | No audited Pillow screen defines StoreKit review UI, so only its native trust boundary and return behavior transfer. Trigger timing is the decided ExcerLock lifecycle; the mock never calls StoreKit or records a real rating. |

## 15A. Notification deep-link ledger

No notification is scheduled or delivered. Each row is a debug-triggered local preview of the notification plus the exact navigation/state mutation its tap must simulate.

| DESIGN ID | Route / presentation | Screen and required states | Every visible tap → result | Exact Pillow refs | Transfer and deliberate ExcerLock change |
|---|---|---|---|---|---|
| `D-NOT-01` | `/notification-preview/nudge`, simulated native banner/lock-screen card | Afternoon nudge fixture using the approved payoff-first copy. Preview state records `notificationEntry=nudge`; unopened and tapped variants are inspectable. | Tap notification → `/(tabs)/home?entry=nudge`, scroll/focus the cheapest available condition; if Home is empty, focus **Add your first way to earn**. Dismiss → debug without mutation. | Permission/native boundary `022–023`; Home entry `037–039`, `052` | Pillow supplies the native-notification trust boundary and Home attention hierarchy. ExcerLock adds a deterministic local deep link; no notification API, guilt copy, or fake delivery is used. |
| `D-NOT-02` | `/notification-preview/recap`, simulated native banner/lock-screen card | Weekly recap fixture with a reclaimed-time number. Preview/tapped variants preserve the fresh recap fixture. | Tap notification → `/(tabs)/analysis?entry=recap`, scroll to the fresh recap card; its **Share** action → `/share-achievement?type=recap`; dismiss → debug. | Permission/native boundary `022–023`; recap/report `173–177`; share handoff `064–066`, `176–177` | Transfer Pillow's conclusion-first report entry and native handoff. ExcerLock deep-links to the real recap/share path rather than opening an unreferenced promo screen. |
| `D-NOT-03` | `/notification-preview/last-call`, simulated native banner/lock-screen card | Opt-in streak last-call fixture with current streak and supportive remaining-time copy. Preview/tapped variants are inspectable even though real eligibility is not computed. | Tap notification → `/(tabs)/home?entry=lastCall`, focus goal progress and cheapest qualifying condition; primary condition action starts its normal flow; dismiss → debug. | Permission/native boundary `022–023`; goal/Home `037–039`, `052`, `112` | Pillow's local attention pattern transfers, while ExcerLock uses a payoff-led streak message and a deterministic Home target. No scolding, red takeover, or real scheduling. |

## 16. Complete tap-path graph

### First-run happy path

```text
Splash
  → Value
  → Confession
  → Mirror
  → Privacy (optional detail)
  → Screen Time primer → simulated Allow
  → Locked-app picker → Done
  → Motion (Allow or Skip)
  → Apple Health (Allow or Skip)
  → Location (Allow or Skip)
  → Daily allowance
  → Setup review (rows can loop back and return)
  → Done moment
  → Paywall (features/legal/restore branches return here)
  → simulated Subscribe → loading → success
  → required simulated Signup
  → Empty Home (zero conditions)
  → Add your first way to earn → Builder → Save condition #1 → Populated Home
```

### Core product loops

```text
Home event Complete → Gym ready → Verifying → Verified → Home unlock-in-place
Home walking card → Walk ready → Verifying → Active → Pause/Resume or End → Summary → Home
Home Edit → Manage → Add condition → Catalog → Configure → Banner → Preview → Save → Manage/Home
Manage condition → Builder edit → Done/Delete → Manage
Manage Locked apps → system-like picker → Done → Manage
Manage Rules → Allowance/Rollover/Streak/Schedule/Saved gyms → Done/Back → Rules → Manage
Home/Tab Analysis → Overview → Trend/Day/Earning/Badge → Back
Unlocked badge or recap → Share preview → simulated iOS share → Preview/Analysis
Settings row → Detail → immediate choice or focused picker → Back with parent subtitle updated
Signed-out Account → simulated Sign in → signed-in Account
Automatic review trigger or manual Rate → simulated native prompt → return to prior surface
```

### Lock and repair loops

```text
Home low-time banner → cheapest condition/session → Home
Time-out → Walk/Gym/condition → verified earn → Home unlock-in-place
Blocked balance/full-lock shield → Open ExcerLock → matching Home/time-out surface
Blocked walk-ended shield → Keep walking → Walk verifying
Blocked schedule shield → OK → dismiss
Gym/Walk failed → Instructions → Permission detail → local repair → Retry → success
Permission attention → detail → simulated Open Settings → healthy list
Event rest-of-day/set-period reward → Home access holiday → expiry/day boundary → balance state
Rest day/outside lock window → neutral open Home → rule/window end → balance state
Debug notification preview → Nudge/Last-call Home or Recap Analysis → normal product flow
```

No route above is a dead end: every pushed detail has Back, every sheet has X/swipe or an explicit Done, every simulated native surface has Cancel/Done, every error has Retry/Instructions/Back, and every destructive action has Cancel.

## 17. State reachability and QA matrix

| Required state | Natural path | Hidden debug path |
|---|---|---|
| Onboarding start/completion | Splash first run → flow | Reset onboarding |
| Paywall annual/monthly/loading/success | Plan taps → Continue | Purchase state rows |
| Signup post-purchase/recovery/processing/success | Purchase Done; signed-out Account Sign in | Identity/signup rows |
| Home empty/low-time | First Home is empty; low-balance demo transition | Empty / Low time rows |
| Home locked/unlocked | Create condition #1; verified event → unlock | Home state rows |
| Rest-of-day/set-period/rest-day/outside-window | Event reward; weekly rule/window transition | Six access-mode rows |
| Event/State/Rate cards | Create in builder / swipe populated carousel | Seed anchor trio row |
| Walk verifying/active/paused/grace/ended | Start walking and controls | Walk phase rows |
| Gym verified/failed | Check in defaults success; retry loop after failure | Gym outcome rows |
| Manage empty/populated/reorder/delete | Add plus explicit Move/Remove taps | Seed/clear conditions |
| Analysis empty/populated | Reset history / seeded fixture | Analysis data rows |
| New/locked/unlocked badge | Shelf and fake milestone transition | Badge state rows |
| Permissions attention/healthy | Simulated repair | Permission state rows |
| Subscription trial/active/cancelled | Fake purchase/cancel flow | Subscription rows |
| Review eligible/presented/dismissed/rated/suppressed | 5th unlock, 7-day/30-day streak, or manual Rate | Review lifecycle rows |
| Nudge/recap/last-call deep-link entry | No delivery in looks-only build | Three notification preview rows |
| All four shield variants | Time-out/walk/schedule conditions where practical | Shield-kind rows |

## 18. Implementation evidence ledger

This is the acceptance ledger for the 98 unique `DESIGN ID`s in sections 5–15A. It records the route/owner that exists in `src`, the interaction path exercised by that implementation, the original Pillow references, and the strongest QA evidence currently available. The full behavioral requirement remains in the earlier matrix; this ledger does not silently narrow it.

Evidence keys:

- **Complete** — the named interaction/state requirement is represented. In the
  table below, every status cell without a **Partial** marker is Complete; this
  does not imply that an individual visual capture exists.
- **E2E** — one or more rendered Router integration suites pressed through the named surface or fixture route.
- **Unit** — a reducer or component test directly covers the named state/interaction seam.
- **Static** — route adapter, feature owner, callbacks, and local-only disclosure were inspected in source; this is not a claim of per-state screenshot approval.
- **Native** — manually inspected in the iOS Simulator. The six representative
  captures under `/Users/johansardar/ExcerLock/work/runtime-qa` are working QA
  evidence, not committed per-ID goldens.
- **Intentional deviation** — interaction is Complete through an accepted looks-only substitution: tap actions replace drag/swipe, transactional choices/steppers replace slider/wheel mechanics, or a local `AccessibleModal` replaces a native/form sheet.
- **Partial** — a route/feature family exists, but the named matrix requirement is not fully represented; the gap is stated so it cannot be mistaken for acceptance.

No per-ID golden screenshot suite is committed. Unless a row explicitly says
**Native**, its per-ID visual status is **manual capture pending**, even when
automated interaction evidence exists. Rendered tests, static inspection/export,
and representative native captures are intentionally reported separately.

### Launch, onboarding, paywall, and identity (18 IDs)

| DESIGN ID | Implemented route · feature owner | Pillow references | Actual interaction evidence | QA / status |
|---|---|---|---|---|
| `D-SPL-01` | `/` · `src/app/index.tsx` | `001` | A 650 ms local resolver selects the current onboarding step, paywall, signup, builder, or Home from presentation state; no content tap exists. | **Static:** first/non-first-run destinations implemented; manual capture pending. |
| `D-ONB-01` | `/onboarding/value` · `features/onboarding` | `010`, `143–145` | **Next** dispatches the progression transition and pushes confession. | **E2E + Native:** rendered/clicked in Router test; `native-onboarding.png` is the representative simulator capture. |
| `D-ONB-02` | `/onboarding/confession` · `features/onboarding` | `014–021`, `083–084`, `146–149` | An accessible 1–12+ hour stepper starts unselected, updates the hero value, and gates **Next**; Back/Next use presentation state. | **Unit + E2E + Intentional deviation:** the deterministic adjustable stepper replaces the specified continuous slider without removing a choice; manual capture pending. |
| `D-ONB-03` | `/onboarding/mirror` · `features/onboarding` | `143–145`, `158–160` | The chosen daily hours derive the annual days/hours copy; Back returns to confession and **Take some back** advances. | **Unit + E2E:** derived values and route progression are covered; manual capture pending. |
| `D-ONB-04` | `/onboarding/privacy` · `features/onboarding` | `011–013` | **Learn more** opens/closes a local privacy modal; **I accept** advances; Back returns. | **E2E + Static:** progression exercised and modal handlers inspected; manual capture pending. |
| `D-ONB-05` | `/onboarding/screen-time` · `features/onboarding` | `022–023`, `025`, `215–218` | **Continue** opens a labeled local permission modal; Not now returns to a repair card and Retry reopens it; Allowed advances to Apps. | **E2E + Static:** allow/deny/repair callbacks exist with no permission API; manual capture pending. |
| `D-ONB-06` | `/onboarding/apps` · `features/onboarding` | `057–063`, `067`, `129–134` | Search/category filters, staged checks/count, zero-selection gating, discard confirmation, and commit-to-Motion are implemented. | **E2E + Unit:** rendered transactional selection/discard/commit paths covered; manual capture pending. |
| `D-ONB-07` | `/onboarding/motion` · `features/onboarding` | `025`, `027`, `215–218` | **Allow** opens the local permission choice; **Not now** or modal denial persists the Motion outcome before continuing without an OS call. | **Unit + E2E:** allowed/denied presentation state is retained and tested; manual capture pending. |
| `D-ONB-08` | `/onboarding/health` · `features/onboarding` | `024`, `026`, `215–218` | **Allow** opens the labeled local prompt; **Skip** and the prompt result advance to Location. | **E2E + Static:** optional local-only branch implemented; manual capture pending. |
| `D-ONB-09` | `/onboarding/location` · `features/onboarding` | `027`, `102`, `257–259` | Manual-versus-auto consequence copy, Skip, and labeled local Allow prompt all advance to allowance without a location API. | **E2E + Static:** optional two-tier primer implemented; manual capture pending. |
| `D-ONB-10` | `/onboarding/allowance` · `features/onboarding` | `014–021`, `083–086`, `146` | An unselected 0–240 minute stepper uses 5-minute increments, plus Unlimited; a required choice gates **Done**. | **E2E + Unit + Intentional deviation:** complete range uses a deterministic stepper rather than an inertial wheel; manual capture pending. |
| `D-ONB-11` | `/onboarding/review` · `features/onboarding` | `002`, `092`, `096`, `099` | Current app count, allowance, and all four permission outcomes derive from state; rows jump to edit with `returnTo=review`; **Looks good** advances. | **Unit + E2E:** derived review values, edit-return loop, and completion route are covered; manual capture pending. |
| `D-ONB-12` | `/onboarding/done` · `features/onboarding` | `029`, `158–160` | **See plans** pushes `/paywall`; no Back control is rendered. | **E2E + Static:** route transition exercised; manual capture pending. |
| `D-PAY-01` | `/paywall` · `features/paywall` | `003`, `030`, `033`, `247` | Annual/monthly plans update CTA terms; top/lower CTAs, include/legal links, Restore, and purchase preview all have local callbacks. | **E2E + Static + Native:** repeated CTA/loading guards are covered; `native-paywall-annual.png` is the representative annual-plan capture. |
| `D-PAY-02` | `/paywall` include overlay · `features/paywall` | `031–032` | **What’s included** opens the full local feature list; Done restores the still-mounted paywall and scroll position. | **Static + Intentional deviation:** an accessible branded sheet replaces the proposed pushed page; manual capture pending. |
| `D-PAY-03` | `/paywall` purchase overlay · `features/paywall` | `034–036` | Subscribe enters disabled loading, timer reveals success, and **Done** routes to `/signup`; Cancel closes. | **E2E + Static:** purchase-success path exercised; no StoreKit call; manual capture pending. |
| `D-PAY-04` | `/paywall` restore overlay · `features/paywall` | `034–036`, `247`, `252` | Restore choice → loading → restored/none outcomes; restored exits through Signup when anonymous or Home when signed in. | **E2E:** both outcomes and identity gate covered; no billing API; manual capture pending. |
| `D-AUTH-01` | `/signup` · `features/identity` | `024`, `068–072`, `034–036`, `210–214` | Post-purchase/recovery Apple and email paths expose validation, processing, success, and debug failure; success reaches Home or Account as appropriate. | **E2E + Static:** required and recovery routes exercised/inspected; no network or credentials; manual capture pending. |

### Settings and notification entry (28 IDs)

| DESIGN ID | Implemented route · feature owner | Pillow references | Actual interaction evidence | QA / status |
|---|---|---|---|---|
| `D-SET-01` | `/(tabs)/settings` · `features/settings` | `210–214` | Pinned permission-health panel plus Account, Subscription, Notifications, General, Connections, Data, Support, and About rows route locally; switches mutate demo state. | **E2E + Static:** tab root rendered; route map inspected; manual capture pending. |
| `D-SET-02` | `/settings/permissions` · `features/settings` | `215–218` | Five permission rows open typed detail; About opens local rationale; Back returns. | **Static:** health list implemented; manual capture pending. |
| `D-SET-03` | `/settings/permission/[permission]` · `features/settings` | `217–218`, `237–239`, `257–259` | Typed benefit/status detail opens About or a distinct labeled iOS Settings preview; Allow updates only local health and Retry reruns diagnostics. | **E2E + Static:** simulated Settings boundary and repair callback covered; manual capture pending. |
| `D-SET-04` | `/settings/account` and `/signup?mode=recovery` · `features/settings` / `features/identity` | `210–214`, `024`, `068–072`, `046`, `073`, `101`, `255–256` | Sign out uses confirmation; Delete requires typed `DELETE`; signed-out Sign in uses recovery Signup and returns to Account. | **E2E + Static:** destructive staging and recovery route implemented; manual capture pending. |
| `D-SET-05` | `/settings/subscription` · `features/settings` | `247–252`, `030–036` | Trial/active/cancelled truth, restore outcomes, cancellation reason, win-back, confirmation, cancelled state, and re-subscribe flow are local overlays. | **E2E:** cancellation and restore lifecycle covered without billing APIs; manual capture pending. |
| `D-SET-06` | `/settings/notifications` · `features/settings` | `022–023`, `237–246` | First enable opens benefit primer and simulated prompt; Allow commits, Not now stays off; enabled toggles and the selected nudge time persist in presentation state. | **E2E + Static:** primer/deny/toggles and 3:00→4:00 PM child-route persistence are covered; manual capture pending. |
| `D-SET-07` | `/settings/appearance` · `features/settings` | `230–235` | Auto/Light/Dark commit to reducer state; the entire detail surface crossfades between warm-dark and ivory tokens/status bar while the preview updates. | **E2E + Static:** whole-detail theme transition and parent summary persistence are covered; manual capture pending. |
| `D-SET-08` | `/settings/general` · `features/settings` | `210–214`, `226–227`, `237–246` | Appearance, day boundary, week start, units, shortcuts, Haptics, and Sounds persist; Language opens a distinct labeled per-app iOS Settings simulation. | **E2E + Static + Intentional deviation:** reducer persistence and the local `AccessibleModal` Settings sheet are covered; no system Settings API; manual capture pending. |
| `D-SET-09` | `/settings/day-boundary` · `features/settings` | `021`, `083–086`, `237–246` | Off commits immediately; Custom opens a temporary 2–5 AM choice with consequence copy, Cancel, and Save-to-reducer. | **E2E + Static + Intentional deviation:** transactional choice list replaces an inertial wheel; manual capture pending. |
| `D-SET-10` | `/settings/start-week` · `features/settings` | `226–227` | Device/Sunday/Monday rows commit local selected state; Back returns General. | **Static:** immediate-choice interaction implemented; manual capture pending. |
| `D-SET-11` | `/settings/units` · `features/settings` | `226–227`, `237–242` | Miles/Kilometers rows commit local selected state; Back returns. | **Static:** immediate-choice interaction implemented; manual capture pending. |
| `D-SET-12` | `/settings/connections` · `features/settings` | `215–225` | Apple Health and Siri show reducer-owned summaries and route to their hubs; Health detail stages Disconnect with confirmation. | **E2E + Static:** connection lifecycle and parent summary implemented; manual capture pending. |
| `D-SET-13` | `/settings/apple-health` · `features/settings` | `215–219`, `257–259` | Signal health, diagnostics result, permission-health route, confirmed disconnect, and reconnect preview update local state independently. | **E2E + Static:** disconnect/reconnect/diagnostic paths covered; manual capture pending. |
| `D-SET-14` | `/settings/shortcuts` · `features/settings` | `220–225` | Each shortcut opens labeled Add-to-Siri preview; Done sets Added, and Remove requires confirmation before local reset. | **E2E + Static:** Add/Added/Remove lifecycle covered; manual capture pending. |
| `D-SET-15` | `/settings/data` · `features/settings` | `255–256`, `066` | Exports open local share-ready previews; Reset/Delete stage consequence confirmation and labeled local outcomes before mutation. | **E2E + Static:** export and destructive paths covered; no file/share API; manual capture pending. |
| `D-SET-16` | `/support/help` · `features/settings` | `253–254` | Search filters local article fixtures with no-results state; articles and Contact route locally; Back returns. | **Static:** search/article/composer callbacks inspected; manual capture pending. |
| `D-SET-17` | `/support/contact`, `/support/bug`, `/support/idea` · `features/settings` | `024`, `068–072`, `248–249` | Text/count gates Send; dirty Back confirms discard; bug attachment uses labeled photo preview; Send shows loading then thanks. | **Static:** all local composer phases/callbacks inspected; no message/photo API; manual capture pending. |
| `D-SET-18` | `/support/diagnostics` · `features/settings` | `257–259` | Prepare exposes loading then success/no-data fixture, Instructions routes to permission repair, and Share is a labeled local preview. | **Static:** success/failure/recovery branches inspected; manual capture pending. |
| `D-SET-19` | `/settings/about` · `features/settings` | `214`, `260–262` | What’s New, Rate, Share, Follow, Credits, Terms, and Privacy route or emit local previews; seven footer taps open Debug. | **Static:** directory and hidden entry implemented; manual capture pending. |
| `D-SET-20` | `/settings/whats-new` · `features/settings` | `038`, `136–139`, `162–163`, `214` | Latest-first local release cards remain fully readable through the supported scroll path and emit no external fetch. | **Static:** the matrix permits scroll instead of expand/collapse; manual capture pending. |
| `D-SET-21` | `/settings/follow` · `features/settings` | `261` | TikTok/Instagram rows emit a local external-app-preview notice; Back returns. | **Static:** two approved networks only; manual capture pending. |
| `D-SET-22` | `/legal/terms`, `/legal/privacy` · `features/settings` | `011–013`, `254`, `262` | Done returns origin, Reader changes local typography, and Share opens a local document-share acknowledgement. | **Static:** browser-styled local documents implemented; manual capture pending. |
| `D-SET-23` | `/settings/credits` · `features/settings` | `260` | Visual provenance and Pillow reference rows render and emit local-only notices. | **Static:** calm provenance detail implemented; manual capture pending. |
| `D-SET-24` | `/debug` · route-owned local controller | `210–214`, `101` | Confirmed reset; purchase/signup; Home/card/access modes; all Walk/Gym phases; Analysis; permission/subscription/identity; every review trigger/state; notifications; and shields route from grouped fixtures. | **E2E + Native:** required fixture rows and reset confirmation are rendered/pressed; `native-debug-controller.png` is the representative controller capture. |
| `D-SET-25` | `/settings/review` / `/settings/rate` · `features/settings` + `presentation` | `034–036`, `210–214`, `260–262` | Automatic order models install age + fifth unlock, first 7/30-day active streaks, a live 30-minute post-shield clock, and three-show stop; manual Rate suppresses future automatic asks. | **Unit + E2E:** trigger order, clocked suppression, dismissal/rating, permanent manual suppression, and debug states are covered; no StoreKit call; manual capture pending. |
| `D-NOT-01` | `/notification-preview/nudge` · `features/notification-entry` | `022–023`, `037–039`, `052` | Unopened/tapped fixture dismisses to Debug or routes `home?entry=nudge`; Home highlights/announces the cheapest condition or empty Add action. | **Unit + E2E:** exact destination and empty/populated focus covered; no delivery API; manual capture pending. |
| `D-NOT-02` | `/notification-preview/recap` · `features/notification-entry` | `022–023`, `173–177`, `064–066`, `176–177` | Tap routes `analysis?entry=recap`, forces the fresh recap even when history is empty, and uses canonical `share-achievement?type=recap`. | **Unit + E2E:** exact recap/share destination covered; no delivery API; manual capture pending. |
| `D-NOT-03` | `/notification-preview/last-call` · `features/notification-entry` | `022–023`, `037–039`, `052`, `112` | Tap routes `home?entry=lastCall`; Home highlights/announces goal progress and the cheapest condition; Dismiss returns Debug. | **Unit + E2E:** exact target/focus covered; no scheduling API; manual capture pending. |

### Analysis and lock moments (11 IDs)

| DESIGN ID | Implemented route · feature owner | Pillow references | Actual interaction evidence | QA / status |
|---|---|---|---|---|
| `D-ANA-01` | `/(tabs)/analysis` · `features/analysis` | `173–177`, `208–209`, `178–205`, `135–143`, `164–171` | Natural activity chooses truthful empty/sparse/populated content; Week/Month/Year replot labels, series, period, and conclusion; heat-map dates, earning, badges, recap/share, and Start today route locally. | **Unit + E2E + Native:** range/content behavior and empty root are covered; `native-analysis-showcase.png` is the representative empty-state capture. |
| `D-ANA-02` | `/analysis/trend/[metric]` · `features/analysis` | `178–190`, `191–200` | Explicit showcase mode replots Week/Month/Year with bounded period arrows, earned/spent/reclaimed series, comparison, and summaries; natural mode instead shows the reducer's true Time Locked/activity totals or an honest no-data period without fabricated series. | **E2E + Static:** the natural-empty shell and explicit showcase composition are covered/inspected; manual capture pending. |
| `D-ANA-03` | trend comparison sheet · `features/analysis` | `184–185` | The full None/Steps/Workout/Conditions/Unlock/Blocked list selects and dismisses; a non-None choice fades in a second sample series. | **Static + Intentional deviation:** accessible choice sheet replaces a native form sheet; manual capture pending. |
| `D-ANA-04` | `/analysis/day/[date]` · `features/analysis` | `005`, `053–054`, `171`, `205–209` | The ISO route date derives the exact header and natural recorded kind/content; six fixture states remain available; fired-condition rows and primary actions open exact earning/recovery destinations. | **Unit + E2E + Static:** exact-date resolution and condition-query routing are covered; manual capture pending. |
| `D-ANA-05` | `/analysis/earning` · `features/analysis` | `006`, `053–056`, `176–177`, `201–204`, `208–209` | Explicit showcase Week/Month updates sample totals/ranks; natural mode derives its total and rows from local Home/activity state and renders an honest empty shell when no qualifying activity exists. Saved rows open exact Home condition detail; fixture-only rows use an in-place fallback. | **Unit + E2E + Static:** natural-empty truth plus exact and fixture-only detail paths are covered; manual capture pending. |
| `D-ANA-06` | `/analysis/badge/[badgeId]` · `features/analysis` | `135–143`, `164–172`, `176–177` | The route ID selects badge-specific art, name, threshold, progress, unlock month/new state, suggestion, and milestone-share identity. | **Unit + E2E + Static:** locked/unlocked/new and selected-badge share identity are covered; manual capture pending. |
| `D-ANA-07` | `/share-achievement` · `features/analysis` | `176–177`, `181`, `064–066`, `162–171` | Recap/milestone copy, 9:16/1:1 control, close, Share preview, and Save preview all stay local. | **Static:** aggregate-only preview implemented; manual capture pending. |
| `D-ANA-08` | local modal inside `/share-achievement` · `features/analysis` | `066`, `262` | Share opens the selected achievement thumbnail plus AirDrop/Messages/Mail and Copy/Save to Files/Print; Save preview, acknowledgement, Cancel/request-close, and Done stay local. | **E2E + Static + Intentional deviation:** complete simulated-native share behavior uses `AccessibleModal`; no external share occurs; manual capture pending. |
| `D-LOCK-01` | low Home notice · `features/home` / `features/lock-moments` | `038`, `052`, `112` | `home.mode=low` renders the 10-minute notice with Earn more, balance detail, and dismiss-for-session callbacks. | **Unit + Static:** low state and action boundaries implemented; manual capture pending. |
| `D-LOCK-02` | `/lock-moment/time-out` · `features/lock-moments` | `008`, `108–114`, `259` | With an eligible candidate, primary chooses the cheapest currently executable Walk/Gym/condition and See all opens its exact Home detail. With none, a single **Review Home** recovery distinguishes zero enabled conditions from conditions temporarily ineligible under current rules; neither fallback advertises a false offer. | **E2E + Static:** exact eligible routing plus zero-setup and temporarily-ineligible fallbacks are covered; manual capture pending. |
| `D-LOCK-03` | `/lock-moment/[kind]` · `features/lock-moments` | `008`, `104–114`, `257–259`; ExcerLock shield spec | Balance-empty and Full Lock inherit the same execution-aware candidate or truthful zero/ineligible subtitle before routing through Time Out; walk-ended resumes verification, schedule dismisses, and all four variants are Debug-reachable. | **E2E + Static:** exact local shield destinations and fallback truth are covered with no system call; manual capture pending. |

### Walk, gym, and Manage (22 IDs)

| DESIGN ID | Implemented route · feature owner | Pillow references | Actual interaction evidence | QA / status |
|---|---|---|---|---|
| `D-WALK-01` | `/walk-session`, ready · `features/sessions` | `102`, `104`, `215–218` | The requested condition/rule stays visible; **Start walking** enters verifying; Cancel returns Home; Motion/Location rows open exact repair details; reducer-owned **Always show** persists. | **Unit + Static:** ready controls and selected-condition identity are covered; manual capture pending. |
| `D-WALK-02` | same route, verifying · `features/sessions` | `008`, `104`, `120`, `257–259` | Verifying ring renders around the selected condition; a 700 ms local timer dispatches active; Cancel resets the session and replaces Home; debug can hold the phase. | **Unit + E2E + Static:** timer and exact Cancel destination are covered; manual capture pending. |
| `D-WALK-03` | same route, active · `features/sessions` | `104–107`, `112`, `120–126` | Canonical elapsed/step/balance metrics advance locally; Pause and End confirm; the pressable selected-condition row opens its exact summary sheet. | **Unit + Static:** metrics, confirmation, and summary sheet are covered; manual capture pending. |
| `D-WALK-04` | same route, paused/grace · `features/sessions` | `106–108`, `123–125` | Paused remains distinct; grace renders the selected condition's configured countdown (42 seconds only as fallback); Resume recovers, End confirms, and expiry dispatches stopped-end. | **Unit + Static:** configured recovery/expiry transition covered; manual capture pending. |
| `D-WALK-05` | same route, ended · `features/sessions` | `109–114`, `159–160`, `259` | Cause-specific summary, Session details, Why-locked explainer/lock-moment route, Done, and Start again are live. | **Unit + Static:** both ended causes and actions covered; manual capture pending. |
| `D-GYM-01` | `/gym-check-in`, ready · `features/sessions` | `102`, `257–258` | The requested condition resolves its selected gym/banner/radius; Location-health detail, Check in, disclosure, and Back are implemented; ready-phase Cancel replaces Home. | **Unit + E2E + Static:** ready identity, controls, and exact Cancel destination are covered; manual capture pending. |
| `D-GYM-02` | same route, verifying · `features/sessions` | `120`, `257–259` | Selected condition, gym name, radius, and labeled local ring stay visible while a 700 ms timer enters verified; verifying-phase Cancel resets to ready on the same route; debug holds verifying/failed. | **Unit + E2E + Static:** exact gym/radius continuity and phase-specific Cancel behavior are covered; manual capture pending. |
| `D-GYM-03` | same route, verified · `features/sessions` | `072`, `160`, `216`, `223`, `259` | Done completes the selected event, records unlock review, and returns Home; **View condition** returns Home with that ID and auto-opens its detail. | **Unit + E2E + Static:** exact post-verification condition destination is covered; manual capture pending. |
| `D-GYM-04` | same route, failed · `features/sessions` | `051`, `068–072`, `114`, `257–259` | Failed is debug-reachable; Try again verifies, Instructions opens Location permission detail, and Back returns Home. | **Unit + E2E + Static:** failure/retry/repair routes covered; manual capture pending. |
| `D-MAN-01` | `/(tabs)/manage` · `features/manage` | `006`, `057–060`, `078–082`, `129–134`, `210–214` | Add, Edit, enable switches, Locked apps, and Rules all have callback routes; empty/populated derive from conditions. | **E2E + Static:** tab root rendered in Router flow; deeper actions source-inspected; manual capture pending. |
| `D-MAN-02` | same route, row actions · `features/manage` | `044–051`, `057–060`, `130–134` | Enable persists; **Move** offers up/down/cancel; **Remove** stages consequence confirmation then collapses reducer state. | **Static + Intentional deviation:** explicit tap reorder/delete replaces drag/swipe while preserving confirmation and history distinction; manual capture pending. |
| `D-MAN-03` | `/locked-apps` · `features/manage` | `057–063`, `067`, `129–134` | Search/categories filter, selected count/checks stage locally, explainer opens, Cancel/discard reverts, and Done commits. | **Static:** transactional picker implemented with fake apps only; manual capture pending. |
| `D-MAN-04` | `/weekly-rules` · `features/manage` | `004`, `083–086`, `198–200`, `226–227`, `243–246` | Day cells, lock-window toggle, From/To choices, September calendar, planned-date remove confirmation, Done, and dirty-back discard are live. | **Static + Intentional deviation:** time uses a transactional choice list rather than an inertial wheel; manual capture pending. |
| `D-MAN-05` | `/weekly-rules?day=…` · `features/manage` | `086`, `097–100`, `146–157`, `226–227`, `237–246` | Active/Rest/Custom progressively reveals rest behavior, allowance/window choices, and Event/State/Rate overrides; Off makes any kind non-executable that weekday, while a fixed Rate override changes its credited Home value. Done stages into the weekly draft and Cancel reverts. | **Unit + Static + Intentional deviation:** deterministic choices replace wheels; transaction and execution for State/Rate Off plus fixed Rate are covered; manual capture pending. |
| `D-MAN-06` | weekly-rules local sheets · `features/manage` | `083–085`, `123–125`, `243–246`, `257–258` | Time choice and full local calendar sheets have Cancel/Done; duplicate date disables Add; existing date removal confirms. | **Unit + Static + Intentional deviation:** local accessible sheet/choice list replaces native wheel/form sheet; manual capture pending. |
| `D-MAN-07` | `/weekly-rules?mode=today` · `features/manage` | `024`, `068–072`, `248–249` | Required free-text reason/count gates **Use a rest day**; second confirmation persists today reason and returns Manage. | **Static:** staged override and parent summary implemented; manual capture pending. |
| `D-MAN-08` | `/manage/rules` · `features/manage` | `092`, `096`, `099–100`, `210–214`, `237–246` | Allowance, Rollover, Streak, Weekly, Gyms, and today override rows route to named children with reducer summaries. | **Static:** complete hub routing implemented; manual capture pending. |
| `D-MAN-09` | `/manage/base-allowance` · `features/manage` | `014–021`, `083–086`, `146–157`, `243–246` | All 0–240 values in 5-minute increments plus Unlimited update a draft/consequence; Done commits and dirty Back/Cancel confirms revert. | **Static + Intentional deviation:** complete deterministic list replaces an inertial wheel; manual capture pending. |
| `D-MAN-10` | `/manage/rollover` · `features/manage` | `092–099`, `123–125`, `226–227`, `237–246` | Off/On draft reveals a required 30–240 minute cap; modal choice has Cancel/Done, parent Done commits, and dirty Back reverts. | **Static + Intentional deviation:** transactional choices replace an inertial wheel; manual capture pending. |
| `D-MAN-11` | `/manage/streak-policy` · `features/manage` | `097–099`, `143–160`, `226–227` | Choice commits reducer policy; Learn more opens a local Help article; Back returns summary. | **Static:** required immediate-choice path implemented; manual capture pending. |
| `D-MAN-12` | `/saved-gyms` · `features/manage` | `057–067`, `092`, `100–101`, `129–134`, `210–214` | Empty/populated/5-of-5 states are naturally reachable with unique IDs; Add/edit work, Remove confirms, and full capacity disables Add with reason. | **Static + Intentional deviation:** confirmed tap Remove replaces swipe delete; manual capture pending. |
| `D-MAN-13` | `/gym/[gymId]` · `features/manage` | `067`, `102`, `127`, `215–218`, `237–246`, `257–259` | Fake search/pin, name/type/radius/mode/Wi-Fi editors, manual/auto states, local Always-Location prompt/repair, Save/Delete, and dirty Cancel are implemented. | **Static + Intentional deviation:** bounded choices and local sheets replace drag radius/native form sheets; no map/Wi-Fi/location API; manual capture pending. |

### Home and condition builder (19 IDs)

| DESIGN ID | Implemented route · feature owner | Pillow references | Actual interaction evidence | QA / status |
|---|---|---|---|---|
| `D-HOME-01` | `/(tabs)/home` · `features/home` | `037–039`, `052`, `078–079`; approved Home/tab anchors | Populated conditions render closed lock, goal, truthful stats, cards, Edit, Analysis, and four tabs; focused-tab reselect scrolls to top and unseen Analysis milestones expose the tab dot. | **Static + Native:** callbacks/reselect/dot inspected; `native-home-showcase.png` is the representative populated capture. |
| `D-HOME-02` | same route · `features/home` + `presentation` | `038–039`, `107–112`; v18 unlock anchor | `home.mode=unlocked` selects the open `HeroLock`, spendable balance copy, and stable Home geometry. | **Unit + Static:** reducer/model state covered; manual capture pending. |
| `D-HOME-03` | same route · `features/home` + `presentation` | `029`, `037–039`, `108–112`; v18 motion anchor | Pending event earns aggregate; card enters crediting/completed, lock and balance animate in place, then settle. The route emits one Light impact on transition start when Haptics is enabled. | **Unit + Static:** aggregate/count-up/settle covered; this one local haptic is the sole physical-feedback exception; no sound/confetti/takeover; manual capture pending. |
| `D-HOME-04` | same route · `features/home` | `037–038`, `052`, `078` | Zero conditions show **Add your first way to earn**; the button enters builder and Save returns with condition #1. | **E2E + Static:** empty Home, builder entry, save, and populated return are exercised; per-ID manual capture pending. |
| `D-HOME-05` | same route · `ConditionCard` event variant | `007`, `079`, `107–112`, `115–122`, `236` | Gym Complete enters check-in, non-location Complete enters earn transition, and completed/crediting disable repeat; rest-of-day/set-period cards and detail show OPEN TIME, source, hold, and exact expiry. | **Unit + Static:** event routing plus access-result/expiry continuity are covered; manual capture pending. |
| `D-HOME-06` | same route · `ConditionCard` state variant | `104–107`, `112`, `120–127` | Inactive executable action opens Walk; active state is status-only and says balance drains normally. A Custom-weekday Off State remains visible as **OFF TODAY**, explains the rule, and exposes no execution action on card or detail. | **Unit + Static:** active no-claim and State-Off execution seams are covered; manual capture pending. |
| `D-HOME-07` | same route · `ConditionCard` rate variant | `173–177`, `186–190` | The rate card preserves catalog source/unit and has no Claim/cap action. A fixed Custom-day override replaces its ratio and credited Home value; Off remains visible as **OFF TODAY**/**No credit today** and suppresses earning navigation. | **Unit + Static:** catalog identity, fixed credit, Rate-Off execution, and absence of a claim action are covered; manual capture pending. |
| `D-HOME-08` | Home branded balance sheet · `features/home` | `005`, `037–039`, `053–054`, `173–177` | Hero/stat opens a local sheet with remaining/access state, allowance/earn/spend summary, cheapest earning CTA, direct trend action, and Done. | **Unit + Static + Intentional deviation:** branded `AccessibleModal` replaces a native/form sheet; manual capture pending. |
| `D-HOME-09` | Home condition sheet · `features/home` | `005`, `092`, `100`, `166–171` | Card/info opens selected banner/kind/status, exact rule, Today evidence/progress, active window, effective override, and access result; applicable Check in/Complete/Start/View analysis actions appear only while executable, while Off/unavailable states explain why and omit execution. Edit and Done remain live. | **Unit + Static:** Event/State/Rate detail content, execution gating, and exact actions are covered; manual capture pending. |
| `D-HOME-10` | `/(tabs)/home`, access-holiday modes · `features/home` + `presentation` | `038–039`, `107–112`, `173–177`, `236` | Rest-of-day/set-period keep stable open geometry, hold balance, and expose a detail sheet naming completed-event source and midnight/8:30 PM expiry. | **Unit + Static:** both modes and sheet text implemented; debug can switch/expire state; manual capture pending. |
| `D-HOME-11` | `/(tabs)/home`, rule-holiday modes · `features/home` + `presentation` | `004`, `038–039`, `083–086`, `198–200`, `226–227` | Rest-day no-locking, allowance-only, Custom All-day, and outside-window execution retain truthful neutral/read-only cards, exact allowance, Rules summary, and **Edit rules** route. | **Unit + Static:** execution-policy modes and stable-shell actions are covered; manual capture pending. |
| `D-BLD-01` | `/condition-builder`, catalog · `features/condition-builder` | `009`, `057–059`, `061–063`, `115–119`, `129–134` | Human catalog is grouped/filterable; existing catalog entries disable with inline reason; available rows choose typed path; touched X confirms discard. | **E2E + Static + Native:** catalog path/conflicts are covered; `native-builder-catalog.png` is the representative builder capture. |
| `D-BLD-02` | same route, place · `features/condition-builder` | `014–020`, `057–063`, `067`, `127`, `257–258` | Empty/populated saved gyms select and gate Next; zero gyms exposes **Add sample gym** recovery; Add/Edit reuse the gym editor and 5-of-5 disables Add with reason. | **E2E + Static:** truthful empty recovery and shared editor return path are implemented; manual capture pending. |
| `D-BLD-03` | same route, configure · `features/condition-builder` | `080–100`, `123–125`, `146–157`, `237–246` | Event threshold, State grace/active window, and Rate quantum/active window start required values blank and gate Next by kind; clock controls adjust by one minute. | **E2E + Unit + Intentional deviation:** deterministic steppers/choices replace wheels while preserving every clock time; manual capture pending. |
| `D-BLD-04` | same route, reward · `features/condition-builder` | `086–099`, `146–157`, `226–227`, `237–246` | Fixed/rest-of-day/set-period plus amount, daily cap, cooldown, repeat, and active-window values gate the Event path. | **E2E + Unit + Static:** reward dependencies implemented; manual capture pending. |
| `D-BLD-05` | configure/reward precision controls · `features/condition-builder` | `014–020`, `083–085`, `123–125`, `243–246` | Bounded values and one-minute clock adjustments update reducer-owned previews; builder Back preserves and X/discard reverts the draft. | **Static + Intentional deviation:** inline deterministic controls replace nested inertial wheels while preserving full value coverage and commit/discard; manual capture pending. |
| `D-BLD-06` | same route, banner · `features/condition-builder` | `115–134`, `228–229`, `234–236` | All 21 GPT Image 2 override banners filter/select and gate Next; **Choose a sample photo** opens the local library, hardcoded crop, and selects its bundled result. | **Unit + E2E + Static:** picker→crop→banner path and accepted local asset library are covered; manual capture pending. |
| `D-BLD-07` | same route, preview · `features/condition-builder` | `007`, `079`, `122`, `236` | Typed Event/State/Rate card preview renders; **Save condition** persists local state and returns Home. | **E2E + Unit:** first event preview/save path and explicit-choice gating are covered; manual capture pending. |
| `D-BLD-08` | `/condition-builder?conditionId=…` · `features/condition-builder` | `080–101`, `129–134`, `237–246` | Query hydrates catalog identity plus all kind-specific thresholds, reward/cap/cooldown/repeat/window/name/enabled/banner values; Done replaces in place, monotonic IDs avoid collisions, dirty X reverts, and Remove confirms. | **Unit + Static:** typed hydration/persistence, unique allocation, replacement, and destructive boundaries are covered; manual capture pending. |

### Ledger summary

- Ledger rows: **98 / 98 unique IDs**.
- Route ownership: the 98 IDs intentionally share **31 product routes** (plus two Router layout files) and deep feature owners; a visual-state ID is not forced into a duplicate route.
- Implementation status: **98 Complete / 0 Partial**. Completion here means the named state and interaction are represented with the evidence listed in its row; it is not a per-ID visual-approval claim.
- Automated interaction evidence: the latest verified baseline is **33 Jest suites / 267 tests**, plus passing TypeScript. Rendered suites cover first run, all four tabs, builder, debug reachability, transactional selection, paywall/restore, Settings, phase-specific sessions, natural Analysis routes, notification destinations, execution-aware lock routing, and the VTracer SVG dock/asset seam; unit/component suites cover presentation/execution policy (including State/Rate Off and fixed Rate overrides), Home, sessions, Analysis, Manage, content, and cards.
- Packaging evidence: Expo Doctor passed **20/20**; `expo install --check` reported dependencies up to date; the iOS static export bundled 1,759 modules and 102 assets into one 4.3 MB Hermes bundle (**104 files / 71 MB**).
- Native evidence: the Expo SDK 57 app-specific build installed/launched as `com.johansardar.excerlock.uimock` on the `ExcerLock-Demo` iOS 26.4 Simulator with zero errors/two warnings and loaded the explicit Metro bundle at `127.0.0.1:8090`; OCR found expected copy and no red-box signature.
- Visual evidence boundary: six representative captures are retained under `/Users/johansardar/ExcerLock/work/runtime-qa`—onboarding, annual paywall, populated Home, builder catalog, empty Analysis, and Debug controller. They are working QA artifacts, not a 98-ID capture set; native inspection is claimed only on rows explicitly marked **Native**.
- Accepted looks-only deviations: explicit Move/Remove taps replace drag/swipe; deterministic choices/steppers (including one-minute clock adjustment) replace continuous slider/inertial wheel mechanics; and local branded `AccessibleModal` sheets replace native/form-sheet APIs. Zero-gym recovery uses **Add sample gym**. These are complete seams, not gaps.
- Asset override: all 21 condition banners use the approved GPT Image 2 override; the accepted weights-floor replacement and exact provenance remain in `assets/banners/FOUNDRY.md`.
- Physical-feedback boundary: `D-HOME-03` may emit one local Light haptic when the Home lock changes closed→open and Haptics is enabled. It is the sole physical-feedback exception; all other system-like effects remain simulated.
- Simulation boundary: permission, purchase, account, workout, location, notification, share, review, and app-locking outcomes are local simulated-native surfaces; no real service API runs.

## 19. Definition of complete for the implementation handoff

The UI mock is route-complete only when:

- every `DESIGN ID` above is implemented or explicitly marked not-applicable with a reason in `DESIGN.md`;
- every visible control has press feedback and the destination/state mutation listed here;
- first-run onboarding reaches the paywall, fake purchase requires simulated signup, and signup reaches zero-condition empty Home;
- the four tabs remain reachable from every normal tab state;
- Home/Manage Add creates condition #1; condition create/edit/delete, app selection, and every Rules child return with parent summaries updated;
- Manage exposes base allowance, rollover/cap, streak policy, weekly/custom-day rules including reward overrides, and complete saved-gym/manual-vs-auto setup;
- Walk and Gym success/failure states are both inspectable;
- locked/unlocked, Event/State/Rate, low-time, time-out, rest-of-day, set-period, rest-day, outside-window, and all shield variants are inspectable;
- Analysis has empty/populated parity, heat-map day details, locked/unlocked badges, and share preview/native share simulation;
- Settings contains the pinned permission panel, signed-out sign-in recovery, simulated review lifecycle, and every required group/detail path;
- nudge, recap, and last-call notification previews deep-link to their exact documented Home/Analysis/share destinations;
- simulated system surfaces never invoke external state;
- Home matches the approved anchors, shared screens match their Pillow reference sets, and intentional differences are recorded in `DESIGN.md`;
- no visual asset exists outside a STYLE family and its nearest `FOUNDRY.md` manifest.
