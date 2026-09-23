# SaveKaro mobile

The Expo app lives in `mobile/` and uses the existing API and database. The web
frontend remains in `frontend/`. Administration stays on the website.

## Development

Install workspace dependencies with Bun from the repository root. Start the API
with `bun run dev:api` and the Expo development server with `bun run dev:mobile`.
Use a development build for native Google and Apple sign-in. Expo Go cannot load
the Google sign-in native module.

Mobile environment variables are public configuration. Configure the API URL and
OAuth client IDs using `mobile/.env.example`. Database credentials, provider
secrets and JWT signing keys belong only in the backend environment.

Before testing native sign-in:

- Register Android and iOS applications in your Google Cloud project. Include
  both development and Play signing certificate fingerprints for Android.
- Set the Google web client ID requested by the native SDK in the backend's
  `GOOGLE_MOBILE_CLIENT_IDS` allowlist. Include your native Google client IDs
  when Google identifies them as the token's authorized party (`azp`). Accepted
  client IDs are comma-separated; never include IDs from another project.
- Enable Sign in with Apple for the iOS bundle identifier and include that
  identifier in `APPLE_CLIENT_IDS`.
- Generate Prisma Client and apply the three additive mobile migrations to a
  development database first. They add provider identities, rotating sessions,
  push installations and delivery tracking. Existing Google identities are
  preserved. Production migration is a separate deployment step.

## Shared code

`packages/contracts` owns validation schemas and public API types.
`packages/api-client` owns Axios HTTP requests and accepts platform-specific session
callbacks. These packages must not import server code, Prisma, browser globals,
or native modules.

The mobile client uses `/api/v1`. Existing web routes remain available under
`/api`. API changes must remain compatible with already installed app versions.

Native sessions use access tokens in memory and refresh tokens in SecureStore.
The backend stores refresh-token hashes and rotates the token on refresh. Web
login continues using its existing HttpOnly refresh cookie.

## App notifications

The app configuration links to EAS project
`785bc7ee-814f-41bd-99b8-ca7197d51344`. `EXPO_PUBLIC_EAS_PROJECT_ID` is an optional
override for a separate project; this project identifier is public, not a secret.
Run EAS commands from `mobile/`, not the repository root. Linking the project
does not create signing credentials, configure OAuth or start a cloud build.

Enable `EXPO_PUSH_ENABLED=true`
on the backend worker only after native device testing. Set `EXPO_ACCESS_TOKEN`
on the worker if enhanced Expo push security is enabled. Push delivery runs in
the existing worker, checks user preferences, processes receipts and disables
expired device tokens. No separate queue or service is required.

Delivery is at least once: ambiguous network failures may cause a duplicate.
Notifications created before the migration are not sent to new installations.

## Offline behavior

Previously loaded content can be read offline. Changes such as posting, saving,
voting and editing preferences require a connection. Mutations are not queued for
later replay. User-specific cached content must be removed when signing out or
switching accounts.

## Builds

Run web and backend checks from the root:

```sh
bun run build:web
bun run check:api
bun run build:api
bun run check:mobile
docker compose build backend frontend
```

To check native JavaScript bundles without signing, run `bun run export` in
`mobile/`. On ARM64 Linux, the bundled Hermes compiler may be an x86 executable;
`bunx expo export --platform ios --platform android --no-bytecode` verifies the
JavaScript and assets only. Generate and verify release bytecode on the native
build runner. An export is not a substitute for an installed-device test.

Docker builds now use the repository root as their context so that shared
packages are available. For standalone Coolify Dockerfile builds, select the
repository root as the build context and `backend/Dockerfile` or
`frontend/Dockerfile` as the Dockerfile. The Expo app is distributed separately
through native builds; it is not a Coolify service.

Store-ready signing requires the project's Apple, Google and EAS configuration.
Universal links additionally require domain association files containing the
real Apple team identifier and Android signing fingerprints. Those values must
come from the project's accounts, not sample identifiers.

## Release verification still required

TypeScript and JavaScript bundle checks do not verify native SDK integration.
Before shipping, test Google/Apple sign-in, logout while offline, cached reading,
account switching, push delivery and cold-start notification links on physical
Android and iOS devices. Verify migrations and session concurrency against a
development PostgreSQL database before deploying them to production.

Store release also needs an account-deletion flow with Apple credential
revocation, user-content reporting/blocking, final app identifiers, signing and
domain associations. These are not implemented or configured by the scaffold.
The app has no administration screens. Legal/informational pages open the
existing website; buying guides are bundled for offline reading.
