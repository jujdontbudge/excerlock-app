# `app/src/lock` — the shield & lock surface

Screen Time permission, the locked app group, what is shielded right now, and Full Lock.

The route is thin by ARCHITECTURE.md §1: `app/app/locked-apps.tsx` is two lines that re-export
`LockScreen`. It is reachable as Manage's "Locked apps" section (PRD §3.15, tab 2) once that tab
is built.

## The one rule

**Everything goes through `app/src/screentime`.** No file here imports `MockScreenTimeModule`, and
none may: `getScreenTimeModule()` is the single Phase-3 swap point, so replacing the mock with
FamilyControls / ManagedSettings / DeviceActivity changes nothing in this module.

Two consequences worth naming, because they look like missing features until you know why:

- **The module never sees an app name or a bundle ID.** A selection is an opaque handle. The only
  description of it that exists is `describeSelection`'s `ScreenTimeSelectionSummary`, whose
  `displayName` the *adapter* composes from counts. `LockedAppsCard` prints that line and nothing
  else — see the opaque-handle law in `app/src/screentime/README.md`.
- **The module never decides whether shields are up.** `@excerlock/ledger`'s `desiredOsState` says
  what the OS *should* do; the boundary's observable says what it *is* doing. The lock-state
  surface renders the second and reconciles the first.

## Layout

| File | Responsibility |
| --- | --- |
| `screens/LockScreen.tsx` | Composes the five cards. Owns no state of its own. |
| `controller/lockController.ts` | The module's one conversation with the OS — reference-counted screen lifetimes, one immutable `LockSnapshot` |
| `controller/ledgerSource.ts` | The visible wiring seam: reads/subscribes to Home's journal, ledger config and allowance |
| `controller/lockPolicy.ts` | Composes Ledger's balance/ladder with the pure precedence decision |
| `controller/scheduleRegistration.ts` | Reconciles only recurrence-owned concrete ScreenTime registrations |
| `hooks/useLockSnapshot.ts` | Binds a mounted screen to the controller's observable |
| `model/lockStatus.ts` | The current-lock-state view model — what, why, when it flips |
| `model/lockPrecedence.ts` | The one pure balance × window × Full Lock × walking decision |
| `model/recurringLockWindow.ts` | Recurring definition validation, canonical days, and overlap rejection |
| `model/windowOccurrences.ts` | Expands weekly rules into ScreenTime's concrete local-wall-clock intervals |
| `model/permissionCopy.ts` | The permissions primer copy, per authorization state |
| `model/fullLockCopy.ts` | The confirmation sheet's copy, written from the allowance |
| `model/wallClock.ts` | The one place a lock-window timestamp becomes "7:00 AM" |
| `store/lockScheduleStore.ts` | The persisted owner of recurring lock-window definitions |
| `components/` | Presentational only — every one renders a model and computes nothing |
| `testing/fakeScreenTime.ts` | An in-memory `ScreenTimeModule` for this module's tests |

## Full Lock is a number

PRD §3.2 folds "lock my phone until I exercise" into a base allowance of zero rather than a mode,
so there is no Full Lock flag anywhere here either — only `baseAllowanceMinutes === 0`. Entering
remembers the allowance it replaced so exit restores it instead of inventing one, and both
directions confirm: turning it on gives up the day's screen time, turning it off gives up the
day's floor.

## One precedence function

`resolveLockPrecedence()` is the only place that settles the four requested inputs. Its order is:

1. verified walking opens the apps (and still drains while balance remains whenever the scheduled
   economy applies);
2. outside every configured lock window, apps are open and balance does not drain;
3. remaining balance opens the apps inside a window, or all day when no windows exist;
4. with no remaining balance, Full Lock is the cause before an active window; otherwise the active
   window or empty balance is the cause.

That makes every conflict explicit: walking beats Full Lock and active windows; earned balance beats
Full Lock and an active window; and an inactive schedule beats Full Lock because PRD §3.10 says
there is no locking outside chosen hours. `LockController` reconciles this decision and
`lockStatus.ts` renders its `cause`, so precedence cannot change with component/render order.

## Recurring lock windows

The persisted row is `{ id, days, startMinute, endMinute }`; `days` are the local weekdays on which
the interval **starts**. An end earlier than its start crosses midnight. Definitions remain in
`LockScheduleStore`; `LockController` materializes a rolling set of concrete `[startsAtMs, endsAtMs)`
registrations for the existing ScreenTime boundary on launch and after every edit.

Overlap handling is **reject, with an inline error**. It applies across midnight and the weekly
Sunday/Monday seam. Half-open adjacency is allowed (09:00–10:00 beside 10:00–11:00). Rejecting
instead of merging preserves each row's chosen days and prevents an edit from silently rewriting a
different row.

PRD §3.10's “no minimum length” means a one-minute window is valid. Equal start and end is rejected
as an empty, ambiguous interval; the UI does not guess between zero-time and all-day. Times live in
the app-wide local-wall-clock millisecond domain, where days are uniform 24-hour values. The device
offset is folded in once at the edge, so both spring-forward and fall-back tests keep the user's
chosen wall times unchanged.

## Phase-2 boundaries

- **The allowance has one owner: Home's persisted `ledgerConfig`.** Its Full Lock memory lives beside
  it in the same store. This module keeps no allowance store or copy:
  `controller/ledgerSource.ts` is the visible seam that reads the value, invokes the owner's Full
  Lock transition, and subscribes a running controller. Manage starts that controller for the
  screen's lifetime, so a picker change reconciles the persisted Screen Time selection immediately.
  Start/stop ownership is reference-counted because the tab and pushed lock route can overlap.
- **Recurring definitions stay here; concrete intervals go through ScreenTime.** The controller uses
  only the existing `scheduleLockWindow`, `cancelLockWindow`, and `getLockWindows` surface, so no
  ScreenTime accessor or implementation changed.
- **The onboarding primer reads `PERMISSION_COPY.notDetermined`.** It primes before the ask, so the
  real authorization call itself remains Phase 3 work without duplicating these words.
- **The shield screen itself is not this module.** PRD §3.15 surface 1 (what a *blocked app* shows)
  is a native Shield extension. This is the in-app surface that explains and controls it.

## Tests

`npm run test:app`. Screen tests inject a `LockController` over `testing/fakeScreenTime.ts` and a
fixed `now`, so nothing depends on the wall clock or on the persistent mock.

The trap `app/src/home/README.md` names applies here too, doubled: **`render` and `fireEvent.press`
are both async in RNTL 14 and both must be awaited.** An un-awaited `render` returns a promise
whose queries do not exist yet; an un-awaited press silently drops every state update after it.
