# Section 7 acceptance run — 2026-07-27

- [x] `npx expo start --web --port 8081` serves the app in Chrome at
  `http://localhost:8081`; no simulator was used.
- [x] The tested frame is exactly `393×852`; aspect ratio `393/852 = 0.4612676`.
- [x] Locked-state side-by-side is saved as `side-by-side.png`. The left reference
  removes the Mobbin footer artifact; the right is the real Chrome frame. There
  is no cursor and no footer in the app.
- [x] Chrome real-pointer tests reached Info, Edit, Analysis, Alarm, Music, Home,
  Mountain, and Chart placeholder screens. The Back control returned to the
  dashboard.
- [x] Every pressable uses the shared 100 ms scale/opacity feedback component.
  The progress thumb and both stat chips are also real no-op buttons.
- [x] The corrected reference move was re-inspected at 10 fps from 1.8–3.4 s;
  the 16-frame contact sheet is `reference-unlock-1.8-3.4-10fps.png`.
- [ ] Re-capture the corrected animation with a real browser pointer once the
  browser-control backend is available. The existing animation screenshots are
  from the superseded rotation implementation and are not acceptance evidence.
- [x] The shackle is one animated layer with translations only. Its 450–750 ms
  pop rises 75 pt (30 pt of socket insertion plus a 45 pt air gap), its
  550–950 ms drift moves the measured 72.5 pt socket spacing, and its
  750–1100 ms drop returns to `translateY: 0`. There is no shackle rotation,
  counter-rotation, nested settle layer, or scale transform.
- [x] `npm run verify:shackle` rejects the deleted rotation/settle mechanism and
  asserts the corrected three-phase timing and measured final translation.
- [x] The completed button is permanently blocked (`pointer-events: none` plus
  the React `completed` guard); the bar remains at 50%; confetti has cleared.
- [x] The success haptic call exists at 80 ms and is guarded by
  `Platform.OS !== 'web'`.
- [x] All foundry finals are `1024×1024 RGBA`, four-corner alpha is zero, and
  residual magenta count is zero. Per-file metrics and exact prompts are in
  `../assets/icons/FOUNDRY.md`.
- [x] `npx tsc --noEmit` and `npx expo export --platform web` pass.
- [x] Nothing under `design/` or `docs/` was modified.
