# T12 — Local notifications

## Steps

1. `expo-notifications` (already in the manifest); permission asked at T3 as designed; OS-level toggle only.
2. Three ids: `trial_ending` (2 days before, from Adapty `expiresAt`), `open_to_unlock` (Always denied and a
   target rule was met while closed — fires on the next wake that discovers it), `shield_open` (enqueued only
   by the ShieldAction extension; deep link to Home or the relevant ceremony). The walk-lease warning is
   deleted with the lease.
3. Push entitlement present; no token registration, no remote notification code path (B50).
4. Tap landing: `excerlock://home`, `excerlock://unlock/propped`, `excerlock://paywall`.

## Tests first

- Scheduler is pure over `ClockPort`; a test per id; no push registration (grep guard).

## Acceptance

- [ ] Device: each notification fires and lands on the right screen; none fire when the OS toggle is off.
