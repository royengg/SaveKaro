# State-machine transition tests

The original tests were committed on `test/state-machine-transitions`, followed
by auth fixes on `fix/auth-and-scraper-transitions` and scraper recovery fixes on
`fix/scraper-checkpoint-recovery`. Tests and verification tooling target
`development`; only production changes are promoted into `main`. No UI changes,
database migrations, new dependencies, or environment variables are required.

## Run

With Node and Bun installed, from the repository root:

```sh
node scripts/test-state-machines.mjs
```

On this workspace, use the existing private toolchain (no install required):

```sh
BUN_BIN=.preview/toolchain/node_modules/.bin/bun \
  /home/paseo-agent/remote-ai/runtime/node/bin/node scripts/test-state-machines.mjs
```

The runner executes each file in a separate process because Bun module mocks
are process-global. It disables automatic `.env` loading, passes test-only
configuration rather than inherited service credentials, and preloads a
fail-closed `fetch` stub. Prisma, Redis, BullMQ and email are replaced where used.
Mocked Redis route tests replace JWT generation; the dedicated JWT and non-queue
route tests exercise real signing/verification with test-only keys. The default
run needs no services and skips the four opt-in real-Redis tests.

To include those four integration cases, start a **dedicated** Redis instance
with TCP disabled (`--port 0`), persistence disabled and a private Unix socket,
then supply only that test socket:

```sh
AUTH_TEST_REDIS_SOCKET=/absolute/path/to/dedicated/redis.sock \
  node scripts/test-state-machines.mjs
```

This is a test-runner option, not a new production environment variable. The
integration suite uses real Redis commands and JWTs, but mocked Prisma, Google,
email and analytics. It deletes only its own generated keys; it never flushes
the database. Never point it at a shared or production Redis instance.
Ordinary test-name filters can be passed through to Bun, for example:

```sh
node scripts/test-state-machines.mjs --test-name-pattern '\[regression\]' --pass-with-no-tests
```

For filtered runs only, `--pass-with-no-tests` lets unrelated files with no
matching test names be skipped. The default full run deliberately omits this
option so an empty/missing suite cannot silently pass.

## Scope and findings

| Area                | Covered transitions                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend web auth    | One-time exchange, missing/deleted user, refresh rotation, logout revocation, concurrent code consumption and refresh                                        |
| Web auth store      | Guest boot, single-flight restoration, refused restoration/retry, offline logout, login/restore completing after logout                                      |
| Web auth transport  | Token-generation fencing, stale failures, cookie response ordering, newer login/refresh coordination, old-request replay suppression                         |
| Refresh JWTs        | Unique tokens within one second, expiry, legacy token compatibility, invalid token rejection                                                                 |
| Shared Axios client | Independent cancellation during shared refresh, token-wait cancellation, refresh failure recovery, one-replay limit, public requests, non-auth HTTP failures |
| Push delivery       | Send → ticket → receipt, missing receipt, rate-limited receipt → resend, retry backoff/exhaustion, eligibility changes, lease loss, malformed output         |
| Alert matching      | Matching guards, per-batch deduplication, URL normalization, email opt-out, per-user failure isolation, current cross-run/email-failure behavior             |
| Scraper integration | In-process dispatch, queued dispatch parity, save failure, no-new-deal guard                                                                                 |
| Scraper recovery    | Checkpoint ordering, partial writes, parser/comment failures, durable queue snapshots, changed listings and fresh repeat jobs                                |

Initial result against application commit `f3363c9`: **50 passing, 5 failing**
across 55 tests in six files. Failures assert the intended invariant, rather
than asserting that the current bug is acceptable. They are not skipped or
marked as expected failures. With the fixes and expanded coverage, the current
result is **107 passing, zero failures across twelve unit-test files**, plus
**4 passing real-Redis integration tests** when opted in. Both commands return
exit code zero; the service-free default explicitly skips the integration suite.

The eight pre-existing local test files were also run in separate processes:
47 passing, zero failures. Those include native session rotation/reuse,
identity verification, push registration, comments/notifications, rate limiting,
voice utilities and the existing shared-client tests. They remain local and
are not included in this branch or the transition runner. They were rerun after
the fixes with the same 47-pass result.

The five original `[regression]` tests reproduced these issues and now pass:

1. Two concurrent exchanges can both consume one Redis-backed OAuth code.
2. Two concurrent refreshes can both rotate one web refresh token.
3. A web session restoration can re-authenticate the store after logout.
4. A web login can re-authenticate the store after logout.
5. Queued scraping saves deals without invoking alert matching, unlike the
   in-process path.

## Fixes and operational behavior

- Code consumption uses one Redis Lua operation to read and delete, so it works
  atomically without requiring Redis's newer GETDEL command.
- Refresh rotation claims the parent with `SET ... NX EX`; only the winner
  issues a replacement. A losing request does not delete the winner's cookie.
- Redis-backed auth fails closed with HTTP 503 on storage failures rather than
  falling back to a per-process map that cannot enforce a distributed claim.
  Non-queue mode retains its synchronous in-memory consume/revoke path, with
  additional tests for one-winner concurrency, code expiry and logout.
- Each newly issued refresh JWT has a unique `jti`; otherwise rapid rotation
  could produce the same already-revoked token. Existing tokens remain valid.
- Web store and API generations reject stale successes and failures. Logout
  clears local identity immediately, waits for prior cookie-setting requests
  before remote cleanup, and coordinates later login/refresh requests so stale
  responses cannot overwrite a newer session or clear its single-flight latch.
- Queued scraping invokes alert matching after a successful save using the
  persisted deals. Both scraper paths scope the read to the job's region.

Verification: backend typecheck and Bun API/worker builds pass; frontend
TypeScript and Vite production build pass; the new frontend/shared test files
also pass a separate strict TypeScript check. The full test run comprises
111 transition/integration tests plus 47 pre-existing local tests, all passing.

Real Redis verification passed against a fresh Redis 6.0.16 process with TCP
disabled and a private Unix socket. Thirty concurrent code exchanges and thirty
concurrent refreshes each had exactly one winner; TTLs, expired codes, immediate
child-token rotation and repeat-safe logout also passed. Production databases,
queues, scraper jobs, providers and notifications were not exercised.

The original session blocked Git writes and networking. After access was
restored, the backend, frontend and scraper fixes were committed separately,
with their tests. Tests remain on `development`, outside production-only releases.

## Scraper failure recovery

The recovery regression suite initially reproduced seven failures. The scheduler
now saves the entire parsed batch successfully before advancing its cursor;
partial database failures and parser failures leave the old cursor intact.
Checkpoint-write failures can replay idempotent deal upserts. Deliberately
filtered batches still advance, even when they contain no deals.

Both ingestion paths reject a nonzero saver `errorCount` before alert matching.
The parser propagates processing failures instead of silently returning an
incomplete batch. Comment-fetch network, JSON, authentication, rate-limit and
server failures propagate too; unavailable-comment HTTP 403/404 responses retain
the existing empty-comments fallback.

Queue jobs save their fetched listing with BullMQ `updateData` before processing.
Retries reuse that listing, even if the live feed changes. The snapshot is bound
to the job ID so subsequent repeat jobs always fetch fresh data. Snapshot-write
failure prevents parsing and database writes. The new coverage exercises the
real scheduler, queue processor, saver, parser and client with fake external
boundaries; it does not send production traffic.

This is not an exactly-once notification/outbox redesign. Existing retry limits,
feed page limits and cross-run alert behavior are unchanged. No unbounded outage
recovery or guarantee against permanently malformed posts is implied.

The concurrency tests use barriers/deferred promises, not sleeps, to force
specific interleavings through the real route/store/client implementation.
Push tests execute the real maintenance worker with fake durable records and
check both persistence and transport calls.

Two passing tests are explicitly labeled `characterization`: alert matching
currently has no cross-run suppression based on `lastTriggeredAt`, and an
email service `false` return still permits that timestamp to advance. These
describe existing behavior; they do not prescribe the desired product policy.
Likewise push `completedAt` tests establish terminal behavior but cannot infer
successful delivery from the timestamp alone.

## Limits

This is focused regression coverage for the audit's high-risk transitions,
not exhaustive tests for all 116 inventoried families. It does not prove
PostgreSQL locking, Redis failover/cluster behavior, provider OAuth integration, Expo's
delivery guarantees, browser component behavior, or device rendering. The
queued scraper test invokes the real job processor with a fake BullMQ worker;
it does not run a real queue server. Native session and visual/device testing
remain separate from this suite.

Tests are normally ignored by this repository. Only these specifically named
test files were force-added on the test branch; unrelated local tests and
preview artifacts remain untracked. New regression/integration files are
explicitly tracked on the fix branch; test ignore rules remain unchanged.
