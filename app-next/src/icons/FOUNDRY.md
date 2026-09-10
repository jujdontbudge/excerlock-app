# Native glyph provenance

Flame correction, September 7: rejected the original authored flame because its teardrop body and pinched tips did not read clearly as fire. Replaced with Font Awesome Free 6.7.2 `fire.svg` (Fonticons, Inc., CC BY 4.0), unchanged path in `flameLibrary.ts`: https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/solid/fire.svg. The wider two-tip contour and inner flame cutout remain readable in both orange and white. No generated raster reference was needed.

September 7: user explicitly requested independently composed native icons, library reuse, then a unified rounded solid style anchored to their white dumbbell crop (`clipboard-2026-09-07-105921-BA3815F4.png`). No image-generation prompts or keyed raster outputs were used.

`solidGlyphs.ts`: original SVG geometry following that reference; gym is five rounded rectangles in a shared tilted group. Other semantic silhouettes use the same render-time tint and weight. `paths.ts`: original round-ended utility geometry. `activityLibrary.ts`: Font Awesome Free 6.x person-walking; Fonticons, Inc., CC BY 4.0, https://fontawesome.com/license/free. The person-running and person-biking paths were removed with the running/biking activities; the native HealthKit capability stays compiled so they can return over the air. Brand logos are separate and retain their existing attribution.

Validation: native O09 selected/unselected inspection; tint/geometry parity tests ensure utility and illustration callers receive identical glyphs. No baked-in color, no raster corners/chroma to validate. Canonical gym replaces the previous three alternatives.
