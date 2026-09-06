# ExcerLock unified UI system

This document replaces screen-by-screen styling decisions with one app-wide
contract. It applies to onboarding, tabs, detail routes, sessions, builders,
settings, full-screen decisions, and simulated system surfaces.

## Sources

- Apple Human Interface Guidelines: Layout, Typography, Color, Accessibility,
  Buttons, and Motion.
- Expo Router native Stack guidance.
- Software Mansion Reanimated 4 transitions, timing, and reduced-motion
  guidance.
- `ceorkm/mobile-app-ui-design`: 4/8-point layout rhythm, constrained type
  hierarchy, intentional color roles, 44-point controls, thumb-zone actions,
  consistent iconography, and purposeful motion.
- The user-approved ExcerLock blue-violet gradient, GO Club selection controls,
  Pillow-derived icon family, and transparent fade-through dock.

## Audit baseline

The August 14 audit found a nominal token layer but multiple visual systems in
practice:

- buttons used 44, 48, 50, 52, 56, and 58-point heights;
- selection controls mixed full pills, rounded rectangles, plain rows, and
  card-like bubbles;
- headers were independently implemented in five feature families, with
  different arrow sizes, title sizes, and vertical offsets;
- page insets alternated between 16, 20, 24, and local numeric values;
- navigation mostly faded, while in-screen state changes used a mix of no
  transition, springs, and timing curves;
- white, translucent white, and hard-coded RGBA values competed for the same
  semantic roles;
- feature files contained one-off radii, typography, spacing, and animation
  values that bypassed the token contract.

## Canonical visual language

### Canvas and color

- Every product screen is full-bleed on the same dark-violet-to-electric-blue
  vertical gradient. The background never changes to black or a flat block at
  a safe area, dock, footer, or modal boundary.
- White is the confident foreground color for titles, body copy, icons, rows,
  and separators. Hierarchy comes from size, weight, grouping, and space—not
  low-contrast gray copy.
- Translucent white surfaces are reserved for controls that need a boundary.
  Most content rests directly on the gradient.
- Selected choices invert to white with blue copy. Destructive actions use red;
  success uses green. No other accent competes with the blue-violet brand.

### Layout rhythm

- Base grid: 4 points. Preferred increments: 8, 12, 16, 24, 32, 48, 64.
- Standard page inset: 24 points. Compact inset: 16 points only for dense data
  visualizations or edge-to-edge media.
- Related text: 8 points. Related controls: 12 points. Content groups: 24
  points. Major sections: 32 points. Hero-to-content: 40–48 points.
- All controls have at least a 44-by-44-point hit target. Standard controls are
  56 points tall; compact controls are 48 points tall.
- Primary navigation/action rows use one 60-point rhythm. List groups use a
  dotted white separator instead of boxed cards.
- Screen actions stay in the bottom thumb zone as floating controls; content
  receives enough scroll inset to pass behind them without a hard cutoff.

### Shape

- Selection and secondary controls: 18-point rounded rectangle.
- Standard cards: 20 points. Feature/hero cards: 24 points.
- Circular controls are truly circular. A 999-point pill is reserved for the
  primary floating CTA, compact status chips, switches, and progress tracks.
- The same semantic component keeps the same shape at every width.

### Typography

- System/SF family only, with two working weights: regular and semibold/bold.
- Four core content sizes: 32-point screen hero, 22-point section or important
  metric, 17-point row/control, and 16-point body. A 13-point label and
  12-point caption are allowed only when the information cannot be removed.
- Titles use sentence case and confident white. Metrics use tabular numerals.
- A surface uses no more than three type sizes. Repeated explanatory subtext is
  removed rather than miniaturized.

### Motion

- Press feedback: 100 ms, scale to 0.97, opacity no lower than 0.90.
- Selection/state transition: 180 ms.
- Content entrance/layout transition: 240 ms.
- Navigation: native horizontal push/pop, approximately 300 ms. Tabs change in
  place; tab content does not cross-fade through black.
- Standard easing: `cubic-bezier(0.16, 1, 0.30, 1)`. Exit easing:
  `cubic-bezier(0.40, 0, 1, 1)`.
- Springs are reserved for direct manipulation and celebration. Routine
  buttons, rows, toggles, and navigation do not bounce.
- Reduce Motion removes scale and spatial entrance movement and retains only an
  immediate or short opacity change.

## Component law

1. Build every page from the shared gradient scaffold.
2. Use one shared navigation-header geometry: 44-point actions, 56-point row,
   centered route titles, and left-aligned question titles below the action
   row.
3. Use `PillButton` only for actions, `SelectableBubble` for choices,
   `SettingsRow` for navigation/value rows, and `PillowCard` only when a group
   truly needs a surface.
4. Do not add raw colors, radii, control heights, font sizes, or animation
   durations in a feature file. Add a semantic token or improve the shared
   component instead.
5. Icons use the shared optical-size scale and a normalized square view box.
6. Full-screen decisions are pages, not partial sheets. Their content starts at
   the top and their primary action stays at the bottom.
7. Verify representative screens at compact and current iPhone sizes, with
   large text and Reduce Motion, before treating a visual migration as done.
