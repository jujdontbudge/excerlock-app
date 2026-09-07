# Sessions and shield preview

`HomeSheets` retains outdoor walking sessions. Gym check-in and treadmill walking-state entry now use the full-screen unlock ceremonies in `features/unlock`. The former `CheckInSheet` was removed; its presence and arrival-credit coverage lives in the unlock tests.

`ShieldPreview` consumes the pure `domain/shieldContent` contract. It is reachable from the developer menu. All scripts, placement, gym presence and progress are local; Phase 2 mounts the native adapters behind these ports.
