# PostHog production setup for SaveKaro

The code is safe to deploy before PostHog is configured. Both SDKs remain
disabled unless `POSTHOG_ENABLED=true` and a project token is supplied.

## 1. Create the projects

1. Create a PostHog Cloud account and select the data region that matches your
   privacy requirements.
2. Create two projects: `SaveKaro Production` and `SaveKaro Development`.
3. In the production project, copy the **Project API key** (it starts with
   `phc_`). Do not use a personal API key.
4. Set project retention and restrict session replay access to the smallest
   necessary team.

Regional defaults:

| Region | Ingestion host | UI host |
| --- | --- | --- |
| US | `https://us.i.posthog.com` | `https://us.posthog.com` |
| EU | `https://eu.i.posthog.com` | `https://eu.posthog.com` |

## 2. Configure a first-party ingestion domain

Before the final production rollout, create a neutral subdomain such as
`e.savekaro.online` using PostHog's managed reverse proxy setup. Avoid names
such as `analytics`, `tracking`, `posthog`, or `ph`.

1. Open the PostHog project settings and start the managed reverse proxy setup.
2. Enter `e.savekaro.online`.
3. Add the CNAME record PostHog provides to the SaveKaro DNS zone.
4. Wait for PostHog to verify TLS and the domain.
5. Use `https://e.savekaro.online` as `VITE_POSTHOG_HOST`; keep the regional
   PostHog UI host in `VITE_POSTHOG_UI_HOST`.

The backend may continue sending directly to the regional ingestion host using
`POSTHOG_HOST`.

## 3. Set production environment variables

Add these values to the root `.env` consumed by Docker Compose or to the
equivalent production environment settings:

```dotenv
POSTHOG_ENABLED=true
POSTHOG_PROJECT_TOKEN=phc_replace_with_production_project_key
POSTHOG_HOST=https://us.i.posthog.com

VITE_POSTHOG_HOST=https://e.savekaro.online
VITE_POSTHOG_UI_HOST=https://us.posthog.com
VITE_POSTHOG_REQUIRE_CONSENT=true
VITE_POSTHOG_SESSION_REPLAY_ENABLED=false

APP_ENV=production
APP_VERSION=replace_with_git_sha_or_release_name

# Keep this true for the 7-14 day comparison period, then change it to false.
VITE_UMAMI_ENABLED=true
VITE_UMAMI_SCRIPT_URL=https://umami.cooldash.xyz/script.js
VITE_UMAMI_WEBSITE_ID=d74b89a0-1e26-40bd-b27a-25b04103a8e3
```

Use the EU hosts instead if the project was created in the EU region. Vite
variables are embedded during the frontend build, so changing them requires a
frontend rebuild.

## 4. First deployment: events only

Leave replay disabled for the first deployment:

```bash
docker compose build frontend backend
docker compose up -d
```

Then verify in PostHog's Live Events view:

1. No request is sent before a visitor chooses “Allow analytics”.
2. A hard load emits one `$pageview`.
3. Client-side navigation emits one `$pageview` per route.
4. Search, presets, filters, impressions, deal details, Explore, and cart
   events appear with no raw query text or form content.
5. Login identifies the person by the SaveKaro database user ID, not email.
6. Logout creates a new anonymous identity.
7. A merchant click creates one `deal:merchant_click` event and increments the
   database `clickCount`.
8. Saves, votes, alerts, comments, and submissions appear only after successful
   backend writes.
9. Declining or disabling analytics stops both PostHog and Umami events.

Test this once as a guest and once as an authenticated user on desktop and
mobile.

## 5. Enable session replay carefully

After the event payload review is complete:

1. In PostHog, set the initial recording sample rate to 10%.
2. Keep network request/response bodies, request headers, console capture, and
   canvas capture disabled.
3. Confirm `/auth/*`, `/settings`, `/notifications`, `/alerts`, `/submit`,
   `/saved`, and `/admin` are absent or blocked in test recordings.
4. Set `VITE_POSTHOG_SESSION_REPLAY_ENABLED=true` and rebuild the frontend.

All inputs are masked locally and query strings are removed before replay data
is sent. The private routes above also carry `ph-no-capture`.

## 6. Create the initial insights

Create these saved insights and pin them to the named dashboards.

### Product health

- Weekly unique users performing any of `deal:merchant_click`,
  `deal:save_change` with `saved=true`, or `alert:create`.
- DAU and WAU.
- New-user activation: `auth:login_complete` with `is_new_user=true` followed
  by a value event within seven days.
- Weekly retention using the same value events.

### Discovery

- Funnel: `$pageview` on `/` → `deal:impression` → `deal:detail_view` →
  `deal:merchant_click`.
- Search usage and zero-result rate from `discovery:search_results`.
- Merchant-click rate broken down by `store`, `region`, `category_id`, and
  `placement` where available.
- Preset and filter adoption.

### Explore

- Unique users viewing `deal:impression` with `placement=explore`.
- `explore:deal_advance` per session, split by `input_method`.
- Explore detail-open and merchant-click conversion.

### Data quality

- Events where `app_environment` is not `production`.
- Duplicate `$pageview` checks by session and route.
- Weekly comparison of `deal:merchant_click` against the database
  `Deal.clickCount` delta.
- Frontend and backend exception volume.

## 7. Finish the Umami migration

Run Umami and PostHog together for 7-14 days after consent-gated PostHog goes
live. Compare total consented pageviews, landing pages, and device splits. Some
difference is expected because of blockers and timing.

When PostHog is stable, set `VITE_UMAMI_ENABLED=false`, rebuild the frontend,
and retain the old Umami data read-only for historical comparison.
