# Component Map

Use this map to find the current source of truth before changing UI.

## Global

- `frontend/src/index.css`
  - shared motion tokens and animation utilities
  - global utility classes used across nav, cart, menus, filters, and carousels

- `frontend/src/App.tsx`
  - route entry transitions
  - global app layout structure

## Navigation

- `frontend/src/components/layout/BottomNav.tsx`
  - mobile bottom nav
  - active tab indicator and mobile-only nav behavior

- `frontend/src/components/layout/IconRail.tsx`
  - desktop left rail
  - keep placement stable unless user requests otherwise

## Home Surfaces

- `frontend/src/pages/Home.tsx`
  - header/search area
  - `Discover` strip
  - category row
  - home feed composition

- `frontend/src/components/home/CategoryMoreMenu.tsx`
  - mobile/compact category menu
  - viewport-aware sizing and placement

- `frontend/src/components/cart/FloatingCartButton.tsx`
  - floating cart CTA
  - cart entry/pulse/count motion

## Carousels

- `frontend/src/components/home/FeaturedDealsCarousel.tsx`
  - large editorial featured carousel

- `frontend/src/components/home/CouponDealsCarousel.tsx`
  - coupon-focused hero carousel

- `frontend/src/components/home/AmazonDealsSplitCarousel.tsx`
  - 2-up Amazon carousel
  - keep split mobile layout unless user explicitly asks to change it

## Deals

- `frontend/src/components/deals/DealCard.tsx`
  - masonry/feed card
  - save/upvote/cart micro-interactions
  - hover overlay actions

- `frontend/src/pages/DealDetail.tsx`
  - expanded deal interaction model
  - save, vote, cart, share, visit-store actions

## Filters

- `frontend/src/components/filters/MobileFilters.tsx`
  - mobile bottom-sheet filter UI
  - active chips shown below the trigger

- `frontend/src/components/filters/FilterDialog.tsx`
  - top-nav store/platform filter dialog

- `frontend/src/components/layout/Sidebar.tsx`
  - desktop filter sidebar

## Practical Rules

- If editing motion used in more than one surface, update `frontend/src/index.css` instead of duplicating timings.
- If editing a home surface, read `Home.tsx` plus the child component it renders.
- If editing a filter interaction, check both `MobileFilters.tsx` and desktop filter surfaces.
- If editing navigation, verify whether the change is mobile-only, desktop-only, or both.
