---
name: SaveKaro mobile parity
colors:
  foreground: "#171717"
  muted: "#737373"
  border: "#e5e5e5"
  accent: "#e60023"
  primary: "#171717"
  button: "#181818"
  surface: "#ffffff"
typography:
  page-title:
    fontFamily: Inter
    fontSize: 25.6px
    fontWeight: 700
    lineHeight: 38.4px
    letterSpacing: -0.768px
rounded:
  hero: 28px
  icon-chip: 16px
spacing:
  page-horizontal: 16px
  page-top: 20px
  hero-padding: 16px
  hero-gap: 12px
---

## Overview

The existing frontend at phone widths is the visual authority. This document
records measured source values, not a new design direction. Native safe areas,
keyboard handling and accessible touch targets may adapt to the platform without
changing the visual hierarchy. Do not add explanatory copy removed from the web.

## Colors

Source: the final `:root` overrides in `frontend/src/index.css`, confirmed in
rendered screenshots. Foreground and muted text use neutral grays. Red accents
identify page icons; near-black identifies navigation selection. Earlier purple
HSL declarations are overridden and must not be used as the effective palette.
Primary action pills use their own near-black background, not the text token.

## Typography

Source: `frontend/src/pages/SavedDeals.tsx`. The standard phone hero title uses
1.6rem, bold, with -0.03em tracking. Inter is the web font declaration; actual
rendered font loading must be checked before claiming native font parity.

## Layout

The Saved Deals reference uses 16px page gutters, 20px top spacing, a Back pill,
then a hero separated by 16px. Its icon is 40px square, its title group is 12px
away, and metadata pills sit 10px below the title. Saved deals use two masonry
columns on phones. Do not replace that layout with a one-column native list.

## Elevation & Depth

Liquid surfaces use translucent white, soft shadows and local pink/amber radial
highlights. A diagonal three-colour gradient is not an equivalent rendering.
Use the web CSS as the reference when implementing native surface layers.

## Shapes

Standard hero corners are 28px; icon-chip corners are 16px. Back controls are
36px-high pills with 13px labels and 14px arrow icons. Expand native hit areas
without unnecessarily enlarging the visible controls.

## Components

Mobile bottom navigation mirrors Home, Explore, Submit, Saved and Settings.
Shared headers, cards, chips, buttons and modal surfaces should be implemented
once and reused. Screen-specific designs must still be compared individually.

## Do's and Don'ts

- Compare matching data, viewport width and UI state in rendered screenshots.
- Check populated, empty, loading, error and signed-out states where applicable.
- Preserve reduced motion and text scaling; keep native integrations gated in Expo Go.
- Browser previews can verify layout, but cannot prove iOS/Android touch,
  keyboard, safe-area or animation behaviour. Record that distinction explicitly.
- Do not mark a screen verified based only on compilation or source inspection.
