# State-machine transition tests

These tests live on `test/state-machine-transitions`. No application fixes, UI
changes, database migrations, new dependencies, or production configuration
changes are included. Do not merge this test branch into `main` without approval.

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
fail-closed `fetch` stub. Prisma, Redis, JWT generation, BullMQ and
email are replaced where used. No live services or network access are needed.
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
| Shared Axios client | Independent cancellation during shared refresh, token-wait cancellation, refresh failure recovery, one-replay limit, public requests, non-auth HTTP failures |
| Push delivery       | Send → ticket → receipt, missing receipt, rate-limited receipt → resend, retry backoff/exhaustion, eligibility changes, lease loss, malformed output         |
| Alert matching      | Matching guards, per-batch deduplication, URL normalization, email opt-out, per-user failure isolation, current cross-run/email-failure behavior             |
| Scraper integration | In-process dispatch, queued dispatch parity, save failure, no-new-deal guard                                                                                 |

Initial result against application commit `f3363c9`: **50 passing, 5 failing**
across 55 tests in six files. Failures assert the intended invariant, rather
than asserting that the current bug is acceptable. They are not skipped or
marked as expected failures; the full command must return a nonzero exit code.

The eight pre-existing local test files were also run in separate processes:
47 passing, zero failures. Those include native session rotation/reuse,
identity verification, push registration, comments/notifications, rate limiting,
voice utilities and the existing shared-client tests. They remain local and
are not included in this branch or the six-file runner.

The five `[regression]` failures reproduce:

1. Two concurrent exchanges can both consume one Redis-backed OAuth code.
2. Two concurrent refreshes can both rotate one web refresh token.
3. A web session restoration can re-authenticate the store after logout.
4. A web login can re-authenticate the store after logout.
5. Queued scraping saves deals without invoking alert matching, unlike the
   in-process path.

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
PostgreSQL locking, Redis server semantics, OAuth/JWT cryptography, Expo's
delivery guarantees, browser component behavior, or device rendering. The
queued scraper test invokes the real job processor with a fake BullMQ worker;
it does not run a real queue server. Native session and visual/device testing
remain separate from this suite.

Tests are normally ignored by this repository. Only these specifically named
test files were force-added on the test branch; unrelated local tests and
preview artifacts remain untracked. No push, PR, or merge is part of this task.
