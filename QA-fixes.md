# Accessibility and reliability fixes

Branch: `fix/accessibility-and-reliability`, based on local `main` at `bcc83d3`.
Privacy copy is unchanged.

Follow-up: removed global Enter/Space navigation from Explore entirely. These keys now retain
native link/button behavior even when focus returns to the page after a popup or removed control.
The earlier interactive-target guard alone still allowed page-level navigation. Frontend build
and zero-warning lint passed again. Browser verification remains pending: Snap Chromium cannot
launch under the service's permissions; approval was requested for a project-local browser.

Implemented: native Explore links and keyboard guards; Radix mobile filter focus management;
field-linked validation with first-error focus and destructive text color; named switches and
reply controls; pressed states; reduced Explore motion; cart/alert deletion confirmations;
transactional comment notifications with self-notification suppression; contextual Home and
comment loading errors with retry; lint cleanup; Redis fallback logs and health diagnostics;
simpler Submit Deal layout and deduplicated deal facts; explicit control transitions.

Verification on 2026-09-05:

- Frontend production build passed.
- Frontend ESLint passed with zero errors and zero warnings.
- Backend TypeScript check passed (Hono 4.12.2, as recorded in the existing Bun lockfile).
- Three backend regression tests passed: comment recipient/transaction rules, quota enforcement,
  and propagation of application errors instead of incorrectly returning 429.
- Tunnel `/health` reports the Neon database healthy; the deals API returned data.
- Browser automation could not run: the shared service has a 384-thread/process cap,
  and the installed Chromium also requires its Snap runtime. No mobile browser pass is claimed.

Remaining manual checks at 320px and 390px: filter Tab/Shift+Tab trapping and focus return;
Explore Enter on Visit Store and Space on Save; reduced-motion navigation; Submit Deal first-error
focus and error announcements; cancel/confirm cart and alert deletion; comments error/retry.

The preview uses loopback ports 4317 (frontend) and 4318 (backend), with a Cloudflare quick tunnel.
The database URL is in ignored `backend/.env` with mode 0600. Scrapers, analytics, queue workers,
and startup category bootstrapping are disabled. No migrations, seeds, or test writes were run
against Neon. Google login needs OAuth credentials and an authorized redirect URI; these were
not supplied. No authentication bypass was added.

Preview support changes allow same-origin API URLs, optional backend HOST/SKIP_BOOTSTRAP,
and avoid loading queue connections or constructing Resend when those integrations are disabled.

Lint exceptions remain narrowly documented for the category-menu exit lifecycle, two asynchronous
API loaders, and the existing public button/badge variant exports. Other reported state effects,
untyped values, unused bindings, mixed cricket-animation exports, and stale cleanup refs were fixed.
