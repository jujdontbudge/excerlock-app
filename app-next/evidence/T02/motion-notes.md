# T02 motion notes

Observed sources: otter-OT00-M015.png (native sheet dismissal), otter-OT01-M029.png (weekly recap dismissal over an already-laid-out Home), and otter-OT00-M005.png (push continuity), in design/motion/reference/strips. The corrected raw observations retract invented curves; no invented source measurement is used here.

Taken from the strips: keep the underlying page stable through sheet dismissal, let sheets follow the finger, preserve the navigation surface, and stage the arrival of content. Our layout, palette and animation implementation are authored for ExcerLock.

Controls compress to 0.97 in 100 ms; selections transition over 240 ms. Row reveals stagger by 40 ms. Charts reveal in 600 ms. Freestanding hero icons float only 4 pt over 3.6 seconds. Sheet settling uses the specified mass 1 / stiffness 250 / damping 28 spring. Reduced Motion removes the spatial entrance and hero float; state changes remain visible.

Live evidence: sheet-drag.mp4 exercises a short pull that settles back, a full dismiss, and reopening. The gallery captures every component/variant at normal and accessibility-large text sizes. Development refresh overlays are discarded and recaptured after a cold launch.

Gemini review is deferred under Johan's latest instruction. These observations and the live inspection are Codex's, not Gemini PASS grades.
