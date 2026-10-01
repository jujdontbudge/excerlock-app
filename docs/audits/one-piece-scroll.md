# One-piece screen scroll audit

Date: 2026-09-30

This audit records the page frame used by every route and the chrome that was pinned before ADR 0054. “Header” means the back, close, progress or title row passed to `ScreenShell`; “footer” means the action area passed to it. Before this change `ScreenShell` rendered both outside its `ScrollView`. It now renders the header, content and footer in one always-bouncing scroll view. The only persistent dock is the bottom tab bar.

## `ScreenShell` directly

| Screen or route | Before | One-piece result |
|---|---|---|
| Home (`/(tabs)/home`) | The title and content already shared the page; the bottom tab bar was pinned. | The full page scrolls and rubber-bands; `dock` keeps its last content clear of the pinned tab bar. |
| Conditions (`/(tabs)/conditions`) | The title, cards and Add condition action already shared the page; the tab bar was pinned. | The full page scrolls and rubber-bands above the tab bar. |
| Analytics (`/(tabs)/analytics`) | The title, range control, charts and history already shared the page; the tab bar was pinned. | The full page scrolls and rubber-bands above the tab bar. Horizontal chart strips remain horizontal scrollers inside it. |
| Settings (`/(tabs)/settings`) | The title and settings groups already shared the page; the tab bar was pinned. | The full page scrolls and rubber-bands above the tab bar. |
| Paywall (`/paywall`, `/sample-paywall`) | Already opted into the approved one-piece header, hero, plans and purchase action; async plan sizing reset it to the top. | It uses the new default and keeps `scrollResetKey` for loading-to-plans resizing. |
| Sign in (`/sign-in`) | Options, email and code controls were page content. The setup variant additionally had a separately pinned Setup close row. | Each phase moves as one page. Focused email and code fields still use shared keyboard avoidance and focused-field scrolling. |
| Gym picker (`/gym-picker`) | Search/back title row was pinned on the find step; back/close was pinned on the place step; Save was pinned low on the place step. | Search/back or back/close, search/results or place fields, and Save move together. `scrollResetKey` returns each stage to the top; focused search/name fields remain visible above the keyboard. |
| Shield preview | Shield actions were pinned low while the preview content scrolled. | Cause control, preview and both actions move together. |
| Startup retry (`/index`, when startup fails) | Retry content used the shared page with no separate chrome. | The page rubber-bands as one unit. |
| Empty setup/loading states | Empty content used the shared page. | The empty page keeps the same safe-area behavior and can rubber-band. |

The development-only Dev menu, preview gallery, preview demo and sensor diagnostics also inherit the one-piece default. The research-only linked trace screen inherits it without changing its internal controls.

## `SettingsPage`

`SettingsPage` previously pinned its Back button above the scroll view and, when present, pinned its action buttons below it. All of these now share the page with their title and content:

- Account (`/settings/account`) and the Account section reached from recovery.
- Preferences (`/settings/preferences`).
- Saved gyms (`/settings/gyms`).
- Units (`/settings/units`).
- Subscription (`/settings/subscription`).
- Legal hub (`/settings/legal`) plus Terms and Privacy (`/settings/legal/[doc]`).
- Permission detail (`/settings/permission/[name]`).
- Account and help (`/recovery`) and its nested Account, feedback and legal sections.
- Feedback (`/settings/feedback`) and Report a problem (`/settings/report`), including their sent states and bottom actions.

Feedback and report forms retain `scrollToEndOnKeyboard`, so their focused fields and send actions remain reachable when the keyboard is open. Recovery’s data-export `BottomSheet` remains a pinned overlay by design.

## `onboarding/lib/OnboardingShell`

The welcome and question steps `O01`, `O02`, `O03`, `O04`, `O05`, `O06`, `O07`, `O08`, `O10`, `O11`, `O12`, `O13`, `O14`, `O15`, `O16`, `O17`, `O18`, `O20`, `O22`, `O23` and `O24`, plus plan steps `S1`, `S2`, `S3`, `S3b`, `S3c` and `S3d`, previously placed the progress/back row above the scroller and Continue/Start/Use my plan below it. They now place those controls in the same scroll view as each question, story, Schedule, plan summary, condition demo, trial preview or reminder.

The Schedule step `S1` no longer disables vertical scrolling, so a page that fits can still rubber-band. Every step retains `scrollResetKey={step}`; this is particularly important for the measured condition demo phone and animated plan scenes. `TimeSheet` and plan celebration overlays remain outside the page.

## Setup presentation and setup flow

`SetupPresentation` changes typography and selection emphasis but does not own layout. The frames that use it now all inherit one-piece scrolling:

- Post-paywall Setup (`/setup/[step]`): the account/sign-in step’s close row, identity controls and keyboard fields move together.
- Permission Setup and later permission repair (`/setup/[step]`, `/permissions/[step]`): close/Not now, title, permission artwork or system-alert guide anchor, and the action move together. `scrollResetKey` returns each Setup need to the top.
- Onboarding profile questions and trial preview: their surrounding `OnboardingShell` owns the one-piece page.
- Condition editing: its `ConditionBuilder` frame is described below.

System-alert guides (`PermissionGuide`/`SystemAlert`) remain pinned overlays because they represent the iOS popup over the page.

## `ConditionBuilder`

Create and edit Condition (`/builder`) previously pinned the back/close/progress header and Continue or Save footer while the activity, goal, Schedule, gym and summary steps scrolled between them. The header, active step and action now move together. `scrollResetKey={step}` prevents animated or measured steps from opening partway down. `TimeSheet` and discard `ConfirmSheet` remain pinned overlays.

The gym sub-step uses `GymPickerScreen`, audited above.

## `unlock/lib/UnlockLayout`

Gym unlock (`/unlock/gym`) and treadmill unlock (`/unlock/treadmill`) previously pinned Preview/Close above the scroller and their check-in or scan action below it. Header, map/camera/progress content and action now move together with bottom safe-area space. Their detected result is a transient full-screen overlay and remains over the page.

## Absolute-position and overlay review

No shipping screen has an independent absolute-positioned page title or ordinary bottom action outside these shared frames. The remaining absolute-positioned elements are intentionally local artwork or controls (chart marks, onboarding illustrations, the miniature condition-demo phone, map pins and map buttons, progress rings), accessibility-only text, or approved overlays.

The pinned exceptions are:

- `TabBar`: the Home, Conditions, Analytics and Settings dock.
- `BottomSheet`, `ConfirmSheet` and `TimeSheet`.
- `SystemAlert` and its permission guide.
- `Notice`.
- Transient celebration and detected-result overlays.

These exceptions slide or float over an otherwise single scrolling page; none lets ordinary page content move underneath a separately pinned page title or action.
