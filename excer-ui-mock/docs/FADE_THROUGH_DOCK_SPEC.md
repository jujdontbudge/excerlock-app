---
status: accepted
date: 2026-08-12
supersedes: earlier ExcerLock dock/fade descriptions
architectural-source: /Users/johansardar/reform/docs/adr/0011-dock-transparent-content-mask.md
geometry-source: physical Quitter iPhone study, 2026-08-12
---

# ExcerLock continuous canvas and transparent content-mask dock

This is the combined ExcerLock visual specification. It incorporates the user's
completed dock discussion, the decisions in ADR 0011, the updated
`fade-through-dock` skill, and a frame-by-frame study of Quitter running on a
physical iPhone. ADR 0011 controls the layer architecture. The newer physical
reference controls the exact fade geometry.

## 1. Decision

ExcerLock uses one live, full-screen orange gradient. The dock floats over that
gradient and paints no substitute background. It draws only:

- four vector tab icons; and
- the selected-tab highlight pill.

Scrollable screen content owns its disappearance near the dock. A content-only
alpha mask starts above the icons, continues through the icon row, and reaches
zero at the icon row's bottom edge. Only the safe-area sliver below the icon row
is completely hidden.

The live background is outside the mask and is never faded, hidden, recolored, or
repainted. The dock therefore reveals the real screen gradient, including every
live visual sublayer, rather than a sampled imitation of it.

## 2. Precedence and resolved conflicts

ADR 0011 is the governing architecture and visual behavior.

The following earlier ideas are explicitly superseded:

1. **No per-icon fade geometry.** The mask boundary is derived from the dock
   rectangle, not the selected icon's white-pixel bounds.
2. **No dead gap above the icons.** Content is still partially visible behind the
   icon row and reaches alpha zero only at the row's bottom edge. The fully hidden
   block is the safe-area sliver below the icons—not the complete dock footprint.
3. **The selected-tab highlight pill is allowed and required.** “No pill of any
   kind” is no longer a requirement. The forbidden object is an opaque outer dock
   panel or background pill.
4. **The dock does not paint a fade.** It has no sampled-gradient fill, fade lip,
   scrim, blur, or lookalike background. The content mask alone creates the fade.

All compatible requirements from the earlier discussion remain: one continuous
gradient, icon-only tabs, SVG icons, transparent chrome, no hard seam, full-bleed
content, and no render loop.

## 3. Desired visual result

The screen should read as one uninterrupted orange field. Content scrolls toward
the dock, starts dissolving a little above the icons, continues fading behind
them, and is gone at their bottom edge. The dock icons and selected highlight
appear to float on the real gradient. There is no separate taskbar surface and no
mismatch between the dock region and the rest of the screen.

The user must never perceive:

- a solid brown taskbar;
- a dark bottom panel;
- a copied gradient inside the dock;
- a horizontal cutoff line;
- content colliding with or showing through the icons;
- a large blank layout reservation above the physical bottom; or
- a black/dark top caused by route or safe-area chrome.

## 4. Continuous screen background

### 4.1 Required gradient

Every app-owned route uses the exact Home heat gradient as its live full-screen
background:

| Location | Color |
|---:|---|
| 0% | `#F98529` |
| 15% | `#F97A22` |
| 30% | `#F76D1C` |
| 44% | `#F45C11` |
| 60% | `#F44D09` |
| 72% | `#F04205` |
| 100% | `#EB2E02` |

The gradient covers the physical screen behind:

- the status area and Dynamic Island;
- navigation headers and back controls;
- Home, Manage, Analysis, and Settings;
- pushed detail routes such as Permissions;
- onboarding, paywall, session, lock, and support routes;
- the dock row; and
- the home-indicator safe area.

### 4.2 Background rules

- The background is anchored once to the viewport.
- It does not restart inside a route, ScrollView, safe-area view, header, footer,
  card, or dock.
- Safe areas add spacing only; they do not paint a color.
- No app-owned root screen paints black, dark brown, or flat orange over it.
- Local cards and imagery may draw their own surfaces, but every exposed page
  canvas shows the same live gradient.
- The live background sits behind both the masked content and unmasked chrome.
- The background must never be a child of the content mask.

## 5. Dock visual contract

### 5.1 Tabs and icons

- Four tabs: Home, Manage, Analysis, Settings.
- The dock is visually icon-only. Labels exist for accessibility, not display.
- Icons are crisp vector SVG paths, not PNGs, HTML, emoji, or font substitutes.
- Icons use one coherent white-line style and consistent optical weight.
- The row spans the screen width with four equal interactive regions.
- Reference icon size is 25 points.
- Each tab has a minimum 44-by-44-point hit target.
- Unselected icons may use reduced white opacity.
- The selected icon may use scale, opacity, and the selected highlight pill.
- A restrained selection haptic is allowed.

### 5.2 Selected-tab highlight pill

The selected highlight is chrome, not a dock background.

- It belongs only to the selected tab's local region.
- It moves with the selected icon.
- It may use the intended brand/contrast treatment.
- It must not expand into a full-width or inset outer dock container.
- It must not be mistaken for a solid taskbar.
- It does not replace or repaint the live background outside its own small selected
  target.

### 5.3 What the dock may and may not paint

The dock may paint:

- icons;
- the selected-tab highlight pill; and
- an optional small milestone indicator.

The dock may not paint:

- a canvas gradient;
- a sampled copy of the screen gradient;
- a fade-lip gradient;
- a full-width fill or scrim;
- a blur material;
- a border or divider;
- a shadow or elevation; or
- a rounded outer panel.

All dock containers remain transparent. The orange visible around the permitted
chrome must be the actual screen background.

## 6. Content-mask geometry

### 6.1 Physical reference

The governing reference was captured from Quitter's Library screen on a physical
iPhone 13:

- viewport: 390 × 844 points (1170 × 2532 pixels at 3×);
- icon row: approximately y=761–810;
- safe-area sliver: approximately y=810–844;
- reference fade band: 90 points, approximately y=720–810;
- fade begins 41 points above the icon row;
- content is about 54% opaque at the icon row's top; and
- content reaches 0% at the icon row's bottom.

Multiple screenshots and a continuous scroll recording showed the same textured
background pixels remaining stationary while cards, text, and controls changed
opacity independently. That proves the effect is a content mask, not a black or
color-matched overlay.

### 6.2 Coordinate definitions

Use viewport coordinates where `y` increases downward:

- `R` = the top edge of the icon row;
- `B` = the bottom edge of the icon row;
- `P` = the physical bottom edge of the screen;
- `S = P - B` = the bottom safe-area sliver;
- `H = P - R` = the complete dock footprint;
- `L = 90` = the reference content-fade length ending at `B`; and
- `F = B - L` = the fade's start coordinate.

On the reference device, the 49-point icon row occupies the lower 49 points of
the 90-point fade. The fully transparent hidden block has height `S` only. It must
never use `H` or include any portion of the icon row.

### 6.3 Required alpha behavior

The content mask is:

```text
content alpha = 1                  above the fade band
content alpha smoothly falls 1→0  from F through B
content alpha ≈ 0.54               at R, the icon row's top
content alpha = 0                  at B and throughout the safe-area sliver
```

A reference continuous curve is:

```text
t = clamp((y - F) / L, 0, 1)
A(y) = 1 - t                        for y < B
A(y) = 0                            for y >= B
```

This simple continuous alpha ramp is the current Quitter-matched reference. An
equivalent monotonic curve is acceptable only if moving content remains partially
readable behind the icons and no point in the transition reads as a hard line.

### 6.4 Meaning of the boundary

- Content remains fully opaque above the fade band.
- It begins dissolving as it approaches the dock's y-band.
- It remains partially visible behind the icon row.
- It reaches zero exactly at the icon row's bottom edge.
- It is genuinely absent throughout the safe-area sliver, rather than covered by
  an opaque dock paint.
- Scrolling the content upward restores it normally.
- The selected icon's shape or scale does not change the mask geometry.

This is deliberately dock-rect-based. Earlier instructions that tied the fade to
the selected icon's top/bottom white pixels do not apply after this merge.

## 7. No hard line or painted seam

The dissolve must be a content-alpha operation only. A hard line includes any
visible boundary caused by:

- an opaque dock background;
- a sampled-gradient repaint;
- a separate fade lip;
- two color layers drifting apart;
- an abrupt mask stop;
- a stacked mask join whose opacity is discontinuous;
- `overflow: hidden` clipping at the wrong y-coordinate;
- the ScrollView ending before the dock; or
- an opaque footer occupying the dock footprint.

At `B`, content reaches zero continuously. The transition into the fully hidden
safe-area sliver therefore cannot reveal a clipped object edge. The unmasked live
gradient remains continuous across the same coordinate.

## 8. Full-bleed overlay layout

- The dock is absolutely overlaid at the physical bottom.
- It consumes no normal-flow height and does not push the page upward.
- Screen content extends behind the complete dock footprint.
- Scrollable content receives sufficient bottom content inset to bring its final
  actionable item completely above the fade when the user scrolls to the end.
- The inset provides scroll range, not a permanently painted or visible panel.
- The icon row is never clipped by a parent.
- The home-indicator safe area remains part of the transparent dock footprint and
  shows the live background.

## 9. Transparent top chrome

The top follows the same background/chrome separation:

- The status area and page header paint no root background.
- The live Home heat gradient continues behind them.
- Back arrows, titles, actions, and status indicators remain crisp, unmasked
  chrome.
- If scrolling content passes beneath top chrome, a content-only alpha mask may
  dissolve it before collision.
- That mask must not alter the screen background or introduce a cutoff line.
- No black header strip, dark safe-area fill, blur plate, or divider is allowed.

ADR 0011 specifically governs the bottom dock. This top behavior is a compatible
extension of its core rule: fade content, never repaint the background.

## 10. Layering contract

From back to front, every docked screen renders:

1. **Live background** — one full-viewport Home heat gradient and any approved
   background-only sublayers.
2. **Masked content** — screen content and its ScrollView, fading to zero before
   entering the dock rectangle.
3. **Unmasked chrome** — top controls, dock icons, selected-tab pill, and optional
   milestone indicator.

Load-bearing prohibitions:

- Do not put the live background inside `MaskedView`.
- Do not put dock chrome inside the content mask.
- Do not place the dock below the content in normal flex flow.
- Do not approximate the background inside the dock.

## 11. Interaction and stability

- A tab tap changes selection once.
- Tab reselection may trigger the app's defined behavior without recreating the
  background or causing a navigation loop.
- The content mask may respond to viewport, safe area, and dock-rectangle changes,
  but it must not repeatedly set React state from its own layout measurement.
- Launch, tab changes, scrolling, pushed routes, orientation, and app resume must
  never produce “Maximum update depth exceeded.”
- Reduced Motion may remove icon spring animation while preserving the same final
  chrome and mask geometry.
- The four equal-width tab targets own interaction throughout the icon row.
  Interactive content underneath them must not receive taps.

## 12. Acceptance scenes

Acceptance requires real content, not an empty placeholder arranged to hide
problems. Capture and inspect:

1. Home with a real row/card entering the fade band above the dock.
2. Manage with real text dissolving completely before the dock rectangle.
3. Analysis with a chart/card approaching the selected Analysis chrome.
4. Settings with a real settings row approaching the selected Settings chrome.
5. A pushed Permissions/detail route showing the same gradient behind status and
   header areas.
6. A long page while scrolling content through the complete fade band.
7. Return to Home after visiting all tabs, with no warning or render loop.

### 12.1 Pixel and layer checks

For each docked tab:

- Identify `R` and `B` from the actual rendered icon row.
- Verify content remains partially visible at `R`.
- Verify content alpha is 0 at `B` and every sampled row below it.
- Verify content alpha is monotonic through the fade band from `F` to `B`.
- Verify no adjacent sampled rows expose a discontinuous opacity jump.
- Hide the content layer and compare background pixels across the dock region;
  they must not change. This proves the dock is not repainting the canvas.
- Verify content beneath the dock is not accessible or pressable.
- Verify the selected highlight remains local to the selected tab.

### 12.2 Visual checks

- No visible tab words.
- Four crisp SVG icons.
- Selected icon and highlight pill are clear.
- No full-width dock fill, card, blur, gradient, border, or shadow.
- Content fades behind the icon row and is gone at its bottom edge.
- No hard line at the start or end of the fade.
- No mismatch between the gradient above and behind the dock.
- No black/dark top on any app-owned screen.
- One continuous visual field from physical top to physical bottom.

## 13. Explicitly rejected outcomes

The implementation fails if any of these appear:

- solid brown taskbar;
- visible dock labels;
- PNG, HTML, emoji, or font-substitute tab icons;
- full-width/inset outer dock pill;
- dock canvas gradient or sampled background copy;
- fade-lip overlay owned by the dock;
- blur, scrim, border, shadow, or elevation behind the dock;
- a fully blank dead gap above the icon row;
- content already at zero opacity at the icon row's top;
- content abruptly clipped rather than dissolved through the icon row;
- hard horizontal mask line;
- large blank lower-screen layout reservation;
- black/dark-brown route top;
- different root canvases between routes;
- masked or recolored screen background; or
- maximum-update-depth/navigation loop.

## 14. Out of scope

This decision does not redesign page copy, cards, charts, condition rules,
Settings information architecture, or imagery. It defines the shared canvas,
transparent dock, permitted dock chrome, content-mask behavior, top chrome
extension, layering, interaction boundary, and acceptance criteria.

## 15. Plain-language description

The app is one live orange gradient. The dock does not fake or cover that
background. It draws only its four vector icons and the small selected-tab
highlight. Page content begins fading a little above the icons, continues
dissolving behind them, and reaches zero at their bottom edge. The gradient remains
untouched and visible through the entire bottom of the screen. The result should
look like content naturally passing through transparent chrome—not like a taskbar
hiding it and not like a hard clipping line.
