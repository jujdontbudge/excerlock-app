---
name: excerlock-visual-design
description: Use for every substantive ExcerLock visual-design task: app screens, onboarding, website sections, App Store assets, illustrations, empty states, cards, or interactive visual prototypes. Automatically explores visual enrichment with GPT Image 2.5 Sunburst at low quality while keeping exact product UI code-native and truthful.
---

# ExcerLock visual design

Load this skill before designing or materially revising any ExcerLock visual surface.

## Default visual-enrichment pass

For every substantive visual-design task, automatically consider and, when an image asset can materially improve the result, run at least one fast exploration pass with GPT Image 2.5 Sunburst at `low` quality. Do not wait for the user to repeat this preference.

Use low-quality Sunburst drafts for backgrounds, characters, decorative scenes, textures, environmental plates, and other visual accents. Generate a small bounded set of useful alternatives, select the strongest against the actual screen or page, and integrate only assets that improve hierarchy, clarity, or delight. Keep prompts and generation provenance beside project-bound assets.

Do not spend image-generation calls on copy-only edits, spacing adjustments, deterministic diagrams, or a task where existing approved assets already solve the visual need.

## Fidelity boundaries

- Build actual app and website UI, text, controls, charts, icons, and layout in native code, HTML/CSS, SVG, or the existing component system.
- Never generate fake product UI, fake screenshots, realistic phone hardware, status bars, Dynamic Islands, legal text, ratings, testimonials, user counts, or unsupported product behavior.
- Use approved App Store and product screenshots as the source of truth. Generated art may frame or support them but must not redraw or contradict them.
- Match ExcerLock's approved orange illustrated world, soft white rounded interface-card language, and project design tokens. Read `design/STYLE.md` and `design/UI-STYLE.md` when present.
- Preserve accessibility, responsive behavior, honest claims, and exact text supplied by the user.

## Iteration and quality

Start with `low` quality for rapid exploration. Do not silently raise image quality or broaden the generation batch. Use a higher-quality final only after the user selects or explicitly approves a direction, or when the task's accepted instructions already authorize final production rendering.

Place chosen assets in the project, wire them into the real surface, and inspect the rendered result at its target viewport. Capture screenshots for review. An attractive standalone image is not success if the composed screen or page is worse.
