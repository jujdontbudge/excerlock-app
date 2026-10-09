# Handoff: 2026-10-09, from the MacBook Pro session to the MacBook Air

Start here. Read `AGENTS.md`, then this file, then `docs/agents/memory/MEMORY.md`.

## Moving to a new machine

1. Clone `JohanSardar/excerlock-app`, run `npm ci` at the root.
2. Agent memory: copy `docs/agents/memory/*.md` into your agent's memory folder. For Claude Code that is `~/.claude/projects/<repo path with / replaced by ->/memory/`. The notes hold no secret values, only where secrets live.
3. Secrets are not in git. The new machine needs these, each set up there:
   - `~/.excerlock/env` (copy it from the old Mac over SSH; never print it).
   - `~/.ssh/google_compute_engine` for `deploy/deploy.sh` (`DEPLOY_HOST=johansardar@34.134.201.129`).
   - Logins: `eas login`, `gcloud auth login` (project `excerlock`), `gh auth login`, `sentry auth login` (org `edge-ix`, project `excerlock-mobile`), PostHog, `supabase login`, `asc`. Check each with its status command before relying on it (`docs/agents/services.md`).
4. Simulator work needs Xcode with the iOS 26.4 runtime, `idb`/`idb_companion` and `simslim`. Build once (`./excer --help`, `~/.local/share/agent-ios/GUIDE.md` on the old Mac), then create `ExcerLock-Next` and confirm `./excer check` and `./excer prove launch --proof every-tab-opens`.
5. The owner's treadmill clips are not in git (privacy). They are on the old Mac in `~/Movies/treadmill-clips/` (`raw-session-one/` originals, `session-one/` renamed copies, `review-session-one/` mapping and comparison). Copy them over SSH if gait work continues.

## Release state

- App Store build 17, runtime 4. Ship JS changes only through `./excer ota --message "..." --publish` (ADR 0068): it refuses unless bundle inputs are committed and HEAD is `origin/main`, then runs `excer check`, the release bundle and three launch proofs.
- An OTA applies on cold start only (ADR 0071). Tell the owner to swipe the app away and open it twice.
- The owner has authorised OTA pushes for this work in each request; pushing, merging to main, deploying, TestFlight and App Review still need their go-ahead in the current conversation (`AGENTS.md`, Authority).
- OTAs published 2026-10-09, oldest first (tags `ota-runtime4-20261009-*`): `53fd5b6c` launch-crash fix and OTA gate; `92094cc5` filming timings; `ccb3b0e1` builder back arrow, gym re-add resets the day, cold-start OTA; `5b6762d7` instant walking (ADR 0072); `1148a767` watchdog leak and keep-alive (ADR 0073); `765c01a5` smooth gym check-in that waits for the unlock; `16ea8df4` treadmill windowed gait detector (ADR 0074).

## What changed today and why

- **Walking is instant for every account (ADR 0072).** `FAST_WALKING_DETECTION = true` in `activity/filmingModeStore.ts`; `FILMING_STEPS.stopMs` is 1 s. Replay: unlock 0.6–0.8 s, lock 0.9–1.0 s. Turn it off before real users: shaking counts as walking and short pauses lock.
- **Background walking (ADR 0073).** From the owner's PostHog (`shields_applied`/`shields_lifted` carry `app_state`) and Sentry ("monitoring excessive activities"): each unlock-then-relock leaked one 15-minute DeviceActivity watchdog because native `publish` drops the committed watchdog without stopping it. `EnforcementHost` now cancels it before a lock/open publish. The keep-alive moved to 100 m with no distance filter, re-applied on each hydrate, because iOS 16.4+ may suspend coarse filtered background location. Residency still needs Location set to Always; the owner has not confirmed theirs.
- **Gym check-in.** 3 s confirm (ADR 0069), credit only from the Condition's creation (ADR 0071). The check-in screen now waits up to 5 s for the runtime's unlock instead of judging once, and the fill is time-driven with a memoised map.
- **Treadmill (ADR 0074).** GPT-6-Astra rebuilt the camera detector on session one (18 clips; owner-confirmed labels in `tools/gait-eval/SESSION-ONE.md`). Not-walking clips: 0/10 pass (the old one passed 7). Walking: 5/6 pass, four in about 4.5 s; slow walk (3.25 s clip) is shorter than the 4.5 s minimum. One person, one session: sessions two and three and other people are still needed.

## Open items

1. Owner to test background walking on the new OTA and report; confirm Location is Always. Re-pull PostHog events for account `06035ee9-1f8e-4eb7-a209-5445093e5e97` (the phone is on US Central time) and Sentry to compare.
2. Next binary: fix the native `publish` watchdog leak itself; consider starting the keep-alive from the foreground or a `CLBackgroundActivitySession`; the suspended-expiry fix (#164); treadmill subject association, lower-body and camera-motion evidence, capture timing (ADR 0074).
3. Treadmill: the scan is one-shot, so stopping on the treadmill does not relock. Record sessions two and three (`tools/gait-fixture-extractor/RECORDING.md`), ideally with a second person, saying the take number aloud at the start of each clip.
4. Before real users: `FAST_WALKING_DETECTION` off, `PRESENCE_CONFIRM_MS` back up from 3 s, and remove or disclose the hidden owner switches (filming mode ADR 0064, showcase data ADR 0067) before the next App Review.
5. The gym unlock relocked about 45 s after leaving the check-in screen on 2026-10-09; likely manual presence ending without Always location. Not investigated.
6. Unanswered owner questions from earlier: the "Too many blocking times" toast when a schedule crosses midnight; an `AppRuntimeProvider` startup deadline and a `getAuthContext` timeout.
7. Pre-existing failing proofs: `gym/arrival-condition-home` (background-location sheet covers Home) and `gym/arrival-while-open` (off-centre "Center on gym" button).

## Working rules that bit today

- Commit with a pathspec when others have work in the tree; this commit took everything at the owner's request.
- `detached-methods` ratchet: wrap callbacks such as `.catch((e) => report(e))`, never `.catch(obj.method)`.
- No code comments (ADR 0045); put the reasoning in an ADR.
- Workers get their own worktree, simulator in `~/.local/share/excer/worker-simulators`, and Metro port; delete the simulator when they finish.
