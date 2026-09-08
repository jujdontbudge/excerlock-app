# Motion

Owns motion tokens, reduced-motion configuration, entry/exit presets, haptic feedback, staged content and gently animated feature art. UI components use these primitives; this folder knows no product state or services.

`bindHaptics` binds the Touch feedback preference to `setHapticsEnabled` for the life of the app; the runtime provider calls it once so a rehydrated `haptics: false` is applied before the first screen renders.

Shared values use `get`/`set` for React Compiler compatibility. Gesture worklets bridge to React through `scheduleOnRN`. Native haptics are disabled in tests and the simulator. Reanimated's upstream mock requires the Worklets mock in SDK 57; both are installed in jest.setup.ts.

`useSheetKeyboard` moves absolute sheets above the software keyboard and constrains their scroll area. Native frame events update a single target inset; Reanimated animates layout, and cleanup restores the keyboard/listeners.
