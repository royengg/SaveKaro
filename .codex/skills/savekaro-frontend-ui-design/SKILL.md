---
name: savekaro-frontend-ui-design
description: SaveKaro frontend UI, interaction, and design-judgment guidance for home feed surfaces, navigation, cards, filters, carousels, motion, hierarchy, and restraint. Use when adding, redesigning, or polishing frontend UI in this product, or when deciding whether a UI idea is good enough to implement, so layouts, spacing, motion, and interaction quality stay consistent, deliberate, and high taste.
---

# SaveKaro Frontend UI Design

Preserve SaveKaro's existing visual language unless the user explicitly asks for a redesign. Favor evolutionary improvements over wholesale restyling.

Read [references/component-map.md](references/component-map.md) before changing a major UI surface. Use it to find the current implementation rather than guessing.
Read [references/taste-and-motion.md](references/taste-and-motion.md) before making a major layout, hierarchy, or motion decision. Use it as the design bar before writing code.

## Workflow

1. Identify the surface first.
   Read the exact component, nearby layout wrapper, and any shared styling utilities it depends on before editing. Name the primary user goal on that screen before changing visuals.

2. Apply the taste gate before coding.
   Decide what deserves emphasis, what can be removed, what should stay quiet, and whether motion will explain anything. If the idea adds noise, simplify it before implementation.

3. Preserve the current product language.
   Keep the current white-first canvas, bold black text, red brand moments, soft borders, rounded cards, and pill controls.

4. Design mobile first.
   Treat iPhone 13 class viewports as the baseline. Then confirm the change still makes sense on desktop and tablet widths.

5. Reuse existing motion and component patterns.
   If the interaction already exists elsewhere, match it. If a motion pattern will be reused in 3 or more places, add a shared utility in `frontend/src/index.css` instead of inventing one-off timings in a single component.

6. Protect stable placements.
   Do not move the desktop icon rail, bottom nav, home discovery structure, or other established anchors unless the user explicitly asks for a placement change.

7. Validate.
   Run `npm run build` in `frontend` after UI changes. If you cannot visually test, say so clearly.

## Taste Rules

- Borrow Apple's design discipline, not Apple's visuals.
- Prefer clarity over cleverness and restraint over accumulation.
- Give each viewport region one clear focal point. Do not let multiple accents compete.
- Remove one weak idea before adding a new one.
- Make the primary action obvious in under 3 seconds.
- Use fewer, stronger signals: spacing, scale, contrast, and position before extra decoration.
- Keep interactive things visibly interactive. Do not hide affordance in the name of minimalism.
- If an embellishment does not improve comprehension, hierarchy, trust, or delight, cut it.
- Treat usability failures as aesthetic failures. A beautiful but confusing screen is still bad UI.
- Follow platform conventions unless there is a clear product reason not to.

## Visual Rules

### Layout

- Keep pages airy and clean. Prefer breathing room over density.
- Prefer a small number of strong containers over many nested boxes.
- Use rounded corners generously. Current UI favors `rounded-xl` through `rounded-[30px]`.
- Keep separators subtle. Avoid stacked borders that visually double in thickness.
- Respect safe areas on mobile, especially around bottom nav, floating CTAs, and drawers.

### Color

- Preserve the existing palette direction:
  - white and off-white base surfaces
  - black or near-black emphasis text
  - brand red for primary identity and cart moments
  - soft amber, rose, sky, emerald tints for section accents and pills
- Let red stay special. Do not spread brand emphasis across too many secondary controls.
- Prefer tinted backgrounds and borders over heavy solid fills for secondary states.

### Typography

- Keep headlines bold, compact, and direct.
- Keep section labels small, uppercase, and muted when used as overlines.
- Tighten hierarchy before adding ornament. Scale, weight, and spacing should explain structure on their own.
- Preserve the existing font stack unless the user explicitly asks for a typography change.

### Controls

- Pills, chips, and filter controls should feel tactile: rounded, lightly elevated, clear active state.
- Active state should combine color + surface change + subtle motion, not color alone.
- Pressed states should usually scale slightly down.
- Avoid control overload. Do not place multiple primary-weight actions in the same local cluster.

## Motion Rules

- Motion must explain state change, spatial continuity, emphasis, or feedback.
- Prefer transform and opacity changes.
- Keep most motion between `140ms` and `240ms`.
- Larger route or panel transitions can extend up to `320ms` if they still feel responsive.
- Use the shared motion tokens and utility classes in `frontend/src/index.css`.
- Respect `prefers-reduced-motion`.
- Keep motion interruptible and lightweight.
- Preserve direction and origin. Elements should appear to come from somewhere and return somewhere.
- Avoid perpetual loops, bounce spam, or decorative motion that competes with scrolling.
- Motion should clarify state changes:
  - route entry
  - active tab/chip selection
  - drawer open/close
  - CTA updates
  - save/upvote/cart feedback

## Surface Rules

### Navigation

- Mobile bottom nav is the expressive navigation surface.
- Desktop icon rail should stay structurally simple and stable. Do not shift icon placement or convert it into a new visual metaphor unless requested.

### Home Feed

- Keep the `Discover` strip and category row feeling light and scrollable.
- Discovery actions should remain in this order unless asked otherwise:
  - `Today's picks`
  - `Trending stores`
  - `Big drops`
  - `Because you liked this`
- Keep home separators thin and visually even.

### Carousels

- Preserve the distinct roles of each carousel.
- Featured and coupon carousels can use large editorial presentation.
- Amazon carousel should remain a 2-up split layout on mobile unless the user explicitly asks to change that.
- On mobile, make sure text width and image allocation are both protected; never let the image collapse into a tiny afterthought.

### Deal Cards

- Keep cards image-first and easy to scan.
- Quick actions should stay compact and tactile.
- Do not overload the card footer with too many competing actions.

### Filters

- Mobile filters should behave like a polished bottom sheet, not a raw modal.
- Chips should animate cleanly, keep readable tap targets, and remain scroll-safe on small devices.
- Desktop sidebar filters should feel consistent with mobile chips, but quieter.

### Menus and Popovers

- Fit small screens first.
- Use `visualViewport`-aware sizing and leave room for mobile browser chrome when relevant.
- Internal scrolling should not accidentally drag the page underneath.

## Implementation Preferences

- Use `cn(...)` for conditional class composition.
- Keep Tailwind classes close to the component unless the pattern becomes shared.
- Put reusable motion utilities in `frontend/src/index.css`.
- Prefer editing existing surfaces over introducing parallel versions of the same UI.
- Favor subtraction over adding more wrappers, badges, shadows, and labels.
- When a change affects both mobile and desktop, check both code paths explicitly.

## Reference Use

Read [references/component-map.md](references/component-map.md) for the current map of:

- global motion utilities
- route transitions
- home discovery and category surfaces
- mobile and desktop navigation
- floating cart CTA
- category menu
- carousels
- deal cards
- filter UIs

Read [references/taste-and-motion.md](references/taste-and-motion.md) when:

- a change affects layout hierarchy or screen composition
- you are tempted to add a new visual metaphor or animation
- a screen looks fine but still feels noisy, generic, or low-confidence
- you need a design review checklist before implementation

## Done Criteria

Before finishing:

- Confirm the screen has a clear primary action and focal point.
- Confirm the design got simpler or clearer, not just more styled.
- Confirm the change matches nearby UI patterns.
- Confirm mobile behavior was considered first.
- Confirm motion clarifies state instead of decorating it.
- Confirm stable placements were not changed unintentionally.
- Run `npm run build` in `frontend`.
- Tell the user if the result was code-verified only or also visually verified.
