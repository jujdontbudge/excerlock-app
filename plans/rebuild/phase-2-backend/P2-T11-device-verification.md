# P2-T11 — Physical-device verification

A passing simulator test proves nothing about enforcement (handoff). This is the checklist Johan and Codex run
on Johan's iPhone (dev-client build via `npx expo run:ios --device <device-udid>`), with evidence in
`evidence/P2-T11/` (screen recordings from the phone, diagnostics log exports).

1. Fresh install → onboarding (walking, step goal) → sandbox trial purchase via the Builder paywall → setup:
   real Screen Time prompt (grant), real `FamilyActivityPicker` (pick two real apps), Motion prompt.
2. Home shows `beforeWindow` or `locked` correctly for the real clock; set a window that starts in 2 minutes;
   at window start the picked apps show the **ExcerLock shield** with the right copy and buttons; "Open
   ExcerLock" deep-links home.
3. Walk until the step goal is met with the app open → Home flips to `unlockedMet`, shields lift; kill the app;
   shields stay lifted; next day's window (simulate by editing the schedule to start in 2 minutes on the next
   day, or wait) re-shields.
4. Deny paths: reinstall, deny Screen Time → Home `permissionNeeded`, Fix opens Settings; deny Motion → step
   rule shows the needed-permission state.
5. State mode: create a while-walking rule; start a walking session; walk → shields lift; stop → grace → lease
   expiry re-shields; walk-lease warning arrives 30 s before. Treadmill: prop the phone, framing view finds the
   head, session verifies (harness run exported).
6. Gym: save a real gym via search; manual check-in inside the radius → met; enable auto-detect (Always
   prompt) → arrive at the gym with the app closed → met recorded when the app next opens or the geofence
   wakes the task.
7. Running: record a run with the Watch or a Health-writing app → run rule progresses/meets from Health.
8. Trial reminder scheduled (pending list); Sentry test crash; PostHog events for the session.
9. Restore on a second device or after reinstall via sign-in (P2-T08).
10. Usage monitor: use a locked app for 10 minutes after unlocking → Analytics shows ~10 minutes the next
    day (5-minute resolution).

Every item gets pass/fail, date, iOS version, device, and a note. Failures become GitHub issues on
`JohanSardar/excerlock-app` the same session (repo rule), and cross-app pitfalls go to the ledger via
`log-pitfall`.

## Audit amendments (2026-09-07; see `fix-plan.md`) — rows added to the checklist

11. Two overlapping windows with the app killed stay shielded past the first window's end.
12. Five daily rules register within the monitor budget; diagnostics log shows the plan and coverage.
13. Sandbox cancel/expiry clears shields within one app run; Settings and both ceremonies stay reachable behind
    the paywall modal.
14. Clock set back an hour keeps the apps locked (watermark).
15. `lockWindow` shield shows its own subtitle; the third notification tap-throughs to Home.
16. A 30-minute merged interval registers and its end clears the shield.
17. Propped treadmill scan books minutes; a duration rule reaches met on the belt; the lease warning fires and a
    re-scan renews.
18. Gym: arrive with the app killed, stay an hour, open the app → the full interval is credited; the arrival
    ceremony unlocks at the 30-second confirmation.
19. A walking-lease renewal across an hour on hardware.
20. Measured: how often the Shield extension refreshes published content (open question from P2-T04).
