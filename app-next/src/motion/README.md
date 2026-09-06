# Motion

Owns motion tokens, reduced-motion configuration, entry/exit presets, haptic feedback, staged content and gently animated feature art. UI components use these primitives; this folder knows no product state or services.

Shared values use `get`/`set` for React Compiler compatibility. Gesture worklets bridge to React through `scheduleOnRN`. Native haptics are disabled in tests and the simulator. Reanimated's upstream mock requires the Worklets mock in SDK 57; both are installed in jest.setup.ts.
