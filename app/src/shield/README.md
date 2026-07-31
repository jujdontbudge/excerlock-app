# Shield (historical placeholder)

Ticket #44 established the live `ScreenTimeModule` seam under
`app/src/screentime`, superseding the earlier `ShieldController` sketch that
used to live here. The real `react-native-device-activity` writer is now
`app/src/screentime/native`; app callers reach it only through
`getScreenTimeModule()`.

This directory does not own native scheduling or package imports. Ticket #80
may use it for shield-content policy, but that policy must still reconcile
through the ScreenTime seam.
