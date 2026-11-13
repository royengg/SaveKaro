---
name: SaveKaro carousel refresh
colors:
  primary: "oklch(0.145 0 0)"
  neutral: "oklch(1 0 0)"
  secondary: "oklch(0.97 0 0)"
  muted: "oklch(0.556 0 0)"
  deal: "#be123c"
typography:
  heading:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 600
    letterSpacing: -0.025em
  body:
    fontFamily: Inter
    fontSize: 14px
    lineHeight: 1.4
rounded:
  card: 20px
  control: 10px
spacing:
  small: 8px
  medium: 16px
  large: 24px
components:
  carousel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.card}"
  merchant-link:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.control}"
---

## Overview

Scope: homepage deal carousels and deal cards. Quiet, product-first cards that make the
offer easy to read without decorative effects. Preserve each carousel's
existing position, source, selection rules and merchant actions.

## Colors

Use flat semantic surfaces. No gradients, blurred backdrops or image scrims.
Reserve the rose accent for discount labels, not the entire card. Respect the
existing dark theme through the application's semantic colors.

## Typography

Use the existing Inter stack. Titles are semibold, prices use tabular numbers,
and dates are secondary. Product information never sits over photography.

## Layout

Amazon keeps its two-product grouping. Myntra remains beside the walkthrough
on desktop and after Amazon on mobile. Featured and coupon carousels remain
below. Keep images contained, never crop a product to fill decorative space.

## Elevation & Depth

Use a restrained neutral shadow and a transparent border for forced colors.
Separate controls with a subtle structural divider.

## Shapes

20px carousel corners, 14px gallery card corners. Merchant actions use a
raised charcoal pill with a fine upper highlight and a small lower shadow.
No gradients, glow, animated texture or simulated wear. Pressing lowers the
button and compresses its shadow; reduced motion disables displacement.

## Components

Share the carousel presentation and interaction layer across all four sections.
Move each slide as one unit, without delayed copy, media or tint layers. Keep
keyboard changes instant; disable automatic motion under reduced motion.
Use centered dots as the only visible carousel controls. Pause rotation on
hover, focus, touch and hidden tabs, and respect reduced motion.

## Do's and Don'ts

Keep product details and merchant links distinct. Preserve tracking. Provide
missing-image and loading states, never invent a price or an offer. Do not
change the walkthrough video as part of this refresh. The feed uses an
image-led masonry gallery (four columns on wide screens, one on phones).
Keep titles, prices and actions visible without hover; preserve image aspect
ratios without cropping products. Save/cart remain accessible on touch.
