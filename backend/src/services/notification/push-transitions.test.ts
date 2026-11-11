import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

process.env.EXPO_PUSH_ENABLED = "true";
process.env.EXPO_ACCESS_TOKEN = "";
const realFetch = globalThis.fetch;
const minute = 60_000;
let delivery: ReturnType<typeof makeDelivery>;
let leaseAvailable: boolean;
let status: number;
let response: unknown;
let updates: Record<string, unknown>[];
let requests: string[];
let disabledTokens: string[];
let now: number;

function makeDelivery() {
  return {
    id: "delivery",
    notificationId: "notification",
    installationId: "installation",
    ticketId: null as string | null,
    attempts: 0,
    createdAt: new Date(),
    completedAt: null as Date | null,
    nextAttemptAt: new Date(),
    notification: {
      userId: "owner",
      title: "Deal",
      message: "Price dropped",
      data: { dealId: "deal" },
      user: { preferences: { pushNotifications: true } },
    },
    installation: {
      userId: "owner",
      expoPushToken: "ExpoPushToken[test]",
      disabledAt: null as Date | null,
    },
  };
}

async function update({ data }: { data: Record<string, unknown> }) {
  updates.push(data);
  Object.assign(delivery, data);
  return delivery;
}

mock.module("../../lib/prisma", () => ({
  default: {
    // Fan-out is empty here: these tests start at the durable delivery stage.
    $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
      run({ $queryRaw: async () => [] }),
    pushDelivery: {
      findMany: async () =>
        delivery.completedAt === null &&
        delivery.nextAttemptAt.getTime() <= Date.now()
          ? [{ id: delivery.id }]
          : [],
      findUnique: async () => delivery,
      update,
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.attempts) {
          if (!leaseAvailable) return { count: 0 };
          delivery.attempts++;
          delivery.nextAttemptAt = data.nextAttemptAt as Date;
        } else await update({ data });
        return { count: 1 };
      },
      deleteMany: async () => ({ count: 0 }),
    },
    pushInstallation: {
      updateMany: async ({ where }: { where: { expoPushToken: string } }) => {
        disabledTokens.push(where.expoPushToken);
        return { count: 1 };
      },
    },
    mobileSession: { deleteMany: async () => ({ count: 0 }) },
  },
}));
mock.module("../../lib/logger", () => ({ default: { warn() {}, error() {} } }));
const { startMobileMaintenanceWorker } = await import("./push");

beforeEach(() => {
  now = Date.now();
  delivery = makeDelivery();
  leaseAvailable = true;
  status = 200;
  response = { data: [{ status: "ok", id: "ticket" }] };
  updates = [];
  requests = [];
  disabledTokens = [];
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    requests.push(String(input));
    return new Response(JSON.stringify(response), { status });
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function expectScheduled(delay: number) {
  // Bound relative time instead of sleeping or mutating the global clock.
  expect(delivery.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(now + delay);
  expect(delivery.nextAttemptAt.getTime()).toBeLessThanOrEqual(
    Date.now() + delay,
  );
}

describe("push dispatch / receipt / retry transitions", () => {
  test("send acceptance stores a ticket but does not mark receipt success", async () => {
    await startMobileMaintenanceWorker().close();
    expect(requests).toEqual(["https://exp.host/--/api/v2/push/send"]);
    expect(delivery.ticketId).toBe("ticket");
    expect(delivery.completedAt).toBeNull();
    expectScheduled(15 * minute);
    // A second worker respects the persisted due-time and does not immediately resend.
    await startMobileMaintenanceWorker().close();
    expect(requests).toHaveLength(1);
  });

  test("a successful receipt completes without another send", async () => {
    delivery.ticketId = "ticket";
    response = { data: { ticket: { status: "ok" } } };
    await startMobileMaintenanceWorker().close();
    expect(requests).toEqual(["https://exp.host/--/api/v2/push/getReceipts"]);
    expect(delivery.completedAt).toBeInstanceOf(Date);
    expect(disabledTokens).toEqual([]);
  });

  test("a missing receipt keeps the ticket and schedules another poll", async () => {
    delivery.ticketId = "ticket";
    response = { data: {} };
    await startMobileMaintenanceWorker().close();
    expect(delivery.completedAt).toBeNull();
    expect(delivery.ticketId).toBe("ticket");
    expectScheduled(15 * minute);
  });

  test("a rate-limited receipt clears the ticket so the next attempt resends", async () => {
    delivery.ticketId = "ticket";
    response = {
      data: {
        ticket: { status: "error", details: { error: "MessageRateExceeded" } },
      },
    };
    await startMobileMaintenanceWorker().close();
    expect(delivery.ticketId).toBeNull();
    expect(delivery.completedAt).toBeNull();
    expectScheduled(minute);
    expect(updates).toHaveLength(2);

    delivery.nextAttemptAt = new Date(0);
    response = { data: [{ status: "ok", id: "replacement-ticket" }] };
    await startMobileMaintenanceWorker().close();
    expect(requests[1]).toEndWith("/send");
    expect(delivery.ticketId).toBe("replacement-ticket");
  });

  test.each([1, 3, 5])(
    "transient failure at attempt %i backs off without completing",
    async (attempt) => {
      delivery.attempts = attempt - 1;
      status = 503;
      await startMobileMaintenanceWorker().close();
      expect(delivery.attempts).toBe(attempt);
      expect(delivery.completedAt).toBeNull();
      expectScheduled(2 ** (attempt - 1) * minute);
    },
  );

  test("the sixth failed attempt completes and later workers skip it", async () => {
    delivery.attempts = 5;
    status = 503;
    await startMobileMaintenanceWorker().close();
    expect(delivery.completedAt).toBeInstanceOf(Date);
    await startMobileMaintenanceWorker().close();
    expect(requests).toHaveLength(1);
  });

  test.each(["disabled", "different-owner", "opted-out", "stale"])(
    "%s delivery completes without sending",
    async (reason) => {
      if (reason === "disabled") delivery.installation.disabledAt = new Date();
      if (reason === "different-owner")
        delivery.installation.userId = "new-owner";
      if (reason === "opted-out")
        delivery.notification.user.preferences.pushNotifications = false;
      if (reason === "stale")
        delivery.createdAt = new Date(Date.now() - 25 * 60 * minute);
      await startMobileMaintenanceWorker().close();
      expect(requests).toHaveLength(0);
      expect(delivery.completedAt).toBeInstanceOf(Date);
      expect(disabledTokens).toEqual([]);
    },
  );

  test("losing a lease leaves the delivery untouched and never contacts Expo", async () => {
    leaseAvailable = false;
    await startMobileMaintenanceWorker().close();
    expect(requests).toHaveLength(0);
    expect(updates).toEqual([]);
    expect(delivery.attempts).toBe(0);
  });

  test("only DeviceNotRegistered disables the installation", async () => {
    response = {
      data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
    };
    await startMobileMaintenanceWorker().close();
    expect(disabledTokens).toEqual(["ExpoPushToken[test]"]);
    expect(delivery.completedAt).toBeInstanceOf(Date);
  });

  test("malformed Expo output is retryable rather than successful", async () => {
    response = { unexpected: true };
    await startMobileMaintenanceWorker().close();
    expect(delivery.completedAt).toBeNull();
    expect(delivery.ticketId).toBeNull();
    expectScheduled(minute);
  });
});
