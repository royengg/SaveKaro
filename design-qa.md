# Mobile back-button design QA

## Evidence

- Source visual truth:
  - `/tmp/paseo-attachments-U2Ytgf/06b6d81a0ccadb0c00ac1e33e730f63fc83728ebb8a6bd899f415cbfbdbb0951.png` (408 × 70 px), showing the full-width row to remove.
  - `/tmp/paseo-attachments-U2Ytgf/aa2a7d184e79dd8704e365e4018011491aa50d55a3b06a9fa794fd1db68e1705.png` (138 × 42 px), showing the compact pill to reuse.
  - `/tmp/paseo-attachments-U2Ytgf/c6ecaadc695a123fdd8e083de67b824c3cf94c9bfff12dbb29af7d8ea9f3bb87.png` (195 × 91 px), showing the Deal Detail contrast issue where the oval surface disappeared against white.
- Browser-rendered implementation: Paseo browser capture `f4d0c14a-5bc4-43ab-a2c1-d85675ae13d7` on `/deal/qa-mobile-back`, `/submit`, `/saved`, and `/settings`.
- Viewport: 390 × 844 CSS px at device scale factor 1.
- State: mobile, light theme; loaded Deal Detail, loaded Submit, empty Saved, and loaded Settings.
- Density normalization: source controls and implementation were compared at their native pixel density; the implementation control measured 76.7 × 36 CSS px after shortening the label to `Back`.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The full-width bordered Deal Detail row is absent in loading, error, and loaded markup. The loaded browser capture places the compact control directly inside the page content above the deal image.
- Submit, Saved, Settings, and Deal Detail all render the same shared 36 px-high rounded pill with the Lucide left-arrow icon and `Back` label.
- The corrected shared surface remains visibly white and oval on both the pure-white Deal Detail page and the softly tinted Submit, Saved, and Settings pages. It uses a subtle slate edge and soft shadow so its boundary does not disappear on white.

## Required fidelity surfaces

- Fonts and typography: the shared control preserves the existing 13 px medium-weight SaveKaro navigation type treatment. The label is exactly `Back` in every requested top-level control.
- Spacing and layout rhythm: the pill aligns to the 16 px mobile page gutter and leaves a 16 px gap before the first content surface. Removing the old strip also removes its border and fixed row height.
- Colors and visual tokens: the shared `surface-page-back` treatment uses a 94%-opaque white fill, a subtle slate border, and a soft two-layer shadow. Browser-computed styles confirmed the same treatment on the 36 px control while preserving the existing muted foreground, hover, and active behavior.
- Image quality and asset fidelity: no raster asset substitution was needed. The existing Lucide `ArrowLeft` icon is reused at 14 px, matching the established product control.
- Copy and content: all requested controls say `Back`; no `Back to Deals` or `Back to Home` remains in the affected top-level navigation controls.

## Interaction and responsive checks

- Settings `Back` was clicked in the browser and returned to the preceding Saved route.
- Deal Detail, Submit, and Saved controls retain their existing `/` destination and filter-reset callback.
- Submit, Saved, and Settings were verified at 390 × 844 without horizontal overflow or clipped navigation.
- Browser console was checked. The only errors were expected local-preview CORS failures against the production API before public response fixtures were installed; no component, React, accessibility, or routing errors were observed.

## Comparison history

- Initial implementation check: the shared pill rendered correctly, but production API CORS prevented the local Deal Detail loaded state from appearing.
- Verification adjustment: a public deal response was injected only into the browser preview, allowing the loaded state to be captured without changing application code.
- Post-adjustment evidence: the loaded Deal Detail capture shows the pill in content flow and no full-width back strip. Submit, Saved, and Settings captures show the same control and label.
- Contrast correction: the original translucent white `surface-liquid-chip` blended into Deal Detail's pure-white page. The shared control now has a dedicated white surface with a visible edge and shadow; fresh 390 × 844 captures of Deal Detail, Submit, Saved, and Settings confirm consistent oval treatment.

## Follow-up polish

- None required for this request.

final result: passed
