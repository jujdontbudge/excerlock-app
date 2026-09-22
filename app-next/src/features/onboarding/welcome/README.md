# Welcome composition

O01 follows the approved `design/mockups/onboarding-orange/002-block-apps-preview.png`.
Every app tile, blocked badge, gym glyph, schedule card and timeline is a separate native/SVG component.
There is no screenshot background or flattened hero. Tile entry and idle motion are independent; Reduce Motion retains fades.
Copy lives in `src/content/welcome.ts`; composition geometry and illustration colors in `illustrationTokens.welcome` (`src/design-system/illustrationTokens.ts`).
The footer reuses the local sign-in and legal flows without advancing onboarding on dismissal.
