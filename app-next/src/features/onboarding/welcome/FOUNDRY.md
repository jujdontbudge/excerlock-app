# O01 component artwork

Reference: `design/mockups/onboarding-orange/002-block-apps-preview.png`, with its original `FOUNDRY-002.md` record.
Johan requested matching that composition on September 7, then explicitly required independent components and library logos.

The four paths in `brandPaths.ts` are copied verbatim from the [Simple Icons library](https://github.com/simple-icons/simple-icons), retrieved September 7, 2026:

- https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/instagram.svg
- https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/youtube.svg
- https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/whatsapp.svg
- https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/tiktok.svg

Upstream [license](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md) and [brand disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) apply. These are library assets, not AI-generated brand recreations. SVG path geometry is unchanged; fill, size and TikTok accent offsets are applied at render time. The initial hand-authored brand paths were rejected and replaced.

App tiles, gradient backgrounds, hourglass badges, native schedule text/card, gym glyph and timeline remain independent components. This implements the explicitly approved onboarding mockup composition; no raster image or whole-screen screenshot is used by the app. No image-generation prompt was used. Geometry/colors are recorded in `welcomeTokens.ts`.

Validation: native rendering at the target iPhone size, motion recording, local sign-in/legal interactions, large-text and Reduced Motion checks are recorded in `app-next/evidence/O01-reference/`.
