# Motion implementation and performance limits

Reanimated drives entering/exiting/layout presets, shared-value transforms, progress, SVG chart growth, animated text props and CSS hero loops on the UI thread. There are no React Native JS-driver Animated imports or requestAnimationFrame render loops. JS triggers semantic state changes, formats labels, advances fake sensor/clock facts, and sequences the three plan-building checks; it does not interpolate animation frames.

Tokens: press 100 ms; value fade 180 ms; standard opacity/layout 240 ms; content entry 320 ms / 16 pt; chart reveal 600 ms with 40 ms stagger; number tick 900 ms; hero breathing 3600 ms / 4 pt. Sheets use the shared spring (mass 1, stiffness 250, damping 28). Reduce Motion suppresses spatial/scale/loop motion and explicitly retains opacity fades. Native modal presentation also fades.

The Home unlock strip at approximately 121–123 seconds shows the icon/text crossfade, continuous progress fill and settled layout. This is simulator recording evidence, not a measured GPU frame-rate guarantee. The build is a Debug development client. No Instruments trace or physical-device sustained-frame-rate measurement is claimed; independent Gemini smoothness grading is deferred. Review observations and timestamps for the remaining flows are in `self-review.md`.
