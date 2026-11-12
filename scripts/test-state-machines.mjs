import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const bun = process.env.BUN_BIN ? resolve(process.env.BUN_BIN) : "bun";
const preload = resolve(root, "tests/state-machines/no-network.ts");
const suites = [
  ["backend", "src/routes/auth-transitions.test.ts"],
  ["backend", "src/routes/auth-memory-transitions.test.ts"],
  ["backend", "src/routes/auth-redis.integration.test.ts"],
  ["backend", "src/lib/jwt-transitions.test.ts"],
  ["frontend", "src/store/auth-transitions.test.ts"],
  ["frontend", "src/lib/api-transitions.test.ts"],
  ["packages/api-client", "tests/transitions.test.ts"],
  ["backend", "src/services/notification/push-transitions.test.ts"],
  ["backend", "src/services/alert-matcher-transitions.test.ts"],
  ["backend", "src/services/scrape-alert-transitions.test.ts"],
  ["backend", "src/services/scraper-recovery.test.ts"],
  ["backend", "src/services/reddit/parser-recovery.test.ts"],
  ["backend", "src/services/reddit/client-recovery.test.ts"],
];
const failures = [];

for (const [directory, file] of suites) {
  const name = `${directory}/${file}`;
  console.log(`\nRunning ${name}`);
  // Bun module mocks are process-global: each suite gets a fresh process.
  // Do not load project .env files or pass inherited application credentials.
  const result = spawnSync(
    bun,
    [
      "--no-env-file",
      "test",
      "--preload",
      preload,
      `./${file}`,
      ...process.argv.slice(2),
    ],
    {
      cwd: resolve(root, directory),
      stdio: "inherit",
      timeout: 30_000,
      env: {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test",
        REDIS_URL: "redis://127.0.0.1:1",
        JWT_SECRET: "state-machine-test-only",
        REFRESH_SECRET: "state-machine-test-only-refresh",
        USE_QUEUE: "false",
        POSTHOG_ENABLED: "false",
        AUTH_TEST_REDIS_SOCKET: process.env.AUTH_TEST_REDIS_SOCKET,
      },
    },
  );
  if (result.error) {
    console.error(`Unable to finish ${name}: ${result.error.message}`);
    process.exitCode = 1;
    break;
  }
  if (result.status !== 0) failures.push(name);
}

if (failures.length) {
  console.error(
    `\nFailing suites (${failures.length}/${suites.length}):\n${failures.join("\n")}`,
  );
  process.exitCode = 1;
}
