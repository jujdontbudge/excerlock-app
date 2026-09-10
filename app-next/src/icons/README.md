# icons

Canonical icon registry. No navigation or state ownership. See [STYLE.md](STYLE.md).

`Icon` is the only renderer for generic symbols. `solidGlyphs.ts` holds the rounded silhouettes and `paths.ts` names and utility paths. A semantic name always renders identical geometry across onboarding, cards, tabs, and settings; variant flags never substitute artwork. Gym, goal exercise, strength, and the welcome card all use `gym`. Activity introduction tiles use the same walking/gym registry as the rest of the app. Brand logos remain their official artwork.

Onboarding defaults to orange. Selected rows explicitly request white. Other surfaces retain their text tint or explicit tint. Geometry never contains a baked-in color.
