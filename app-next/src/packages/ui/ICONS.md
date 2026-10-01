# Rounded solid glyphs

Authority: Johan’s September 7 white dumbbell crop and explicit request to normalize all icons supersede earlier multicolor/outline onboarding instructions. These are native SVG components, as requested; no generated raster assets.

## What makes the reference work

The dumbbell has five overlapping pieces: a short horizontal connector, two tall inner plates, and two shorter outer plates. Tall plates are about five times as tall as they are wide; their ends are semicircular. Outer plates are about three-fifths their height. The open space around the connector separates the weights. There are no seams, highlights, gradients, outlines, or backplate inside the symbol. White against orange provides the contrast; thickness provides readability. A slight upward tilt adds energy without changing the recognizable silhouette.

Our canonical gym glyph uses a 24-unit grid: 3-unit connector, 3.5 × 15 inner plates with 1.75-unit radii, 2.5 × 9 outer plates with 1.25-unit radii, and an 8-degree upward tilt. These pieces stay independent in the SVG group. Every gym use shares this exact group, including the welcome schedule, exercise goal, strength reason, activity tile, and rule cards.

## Adding or changing an icon

1. Search the semantic registry first. Similar meanings reuse a name; never paste a new dumbbell into a screen.
2. Start from a recognizable solid library silhouette when available. Keep provenance with the geometry. Simplify details that disappear at 24 points. The walking silhouette retains Font Awesome Free geometry in `activityLibrary.ts`; running/cycling silhouettes were removed with those activities.
3. Work on a 24-unit optical grid. Aim for a 20–22-unit visible footprint; compact shapes may need optical enlargement. Use a single filled silhouette, thick connecting parts, rounded ends, and smooth contour transitions. Keep necessary openings at least 2 units wide. No hairline outlines or multicolor parts.
4. Use `currentColor` only. Orange on white and white on orange are the onboarding states. Logos retain their official brand artwork. Navigation arrows, checks, plus/minus, and search use heavy round-ended strokes because their open geometry conveys the action.
5. Put geometry in `solidGlyphs.ts` or the attributed activity library. Expose the semantic name through `paths.ts`; render with `Icon`. Do not create screen-specific variants. Parent containers may animate the whole icon; selection changes color, never geometry.
6. Inspect at 24, 34, and 48 points on both backgrounds. Check negative spaces, equal visual weight, roundness, and clipping. Inspect a selected and unselected native row. Run icon and affected flow tests before committing.

The target is a friendly, substantial silhouette. Do not add a tilt to every icon: the gym reference supports one; hearts, lists, locks, and navigation controls remain stable and upright.
