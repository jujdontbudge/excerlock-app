# fakes

Owns src/demo/fakes for the local Phase 1 app. Product behavior follows plans/rebuild; reference-app and real-service implementations remain outside this module.

SupportFake simulates submit latency and success/error/cancel. AuthFake deletion preserves all local stores and only returns the session to anonymous.

ReachabilityFake exposes the deterministic online flag controlled by `RuntimeControls`.

SyncFake is an in-memory server: whatever is pushed comes back from `pull`, nothing leaves the process and nothing survives a relaunch.
