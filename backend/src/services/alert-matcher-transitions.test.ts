import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Prisma, type Deal, type PriceAlert } from "@prisma/client";

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal",
    title: "Gaming laptop",
    cleanTitle: null,
    brand: null,
    titleProcessedAt: null,
    description: "A laptop deal",
    originalPrice: null,
    dealPrice: new Prisma.Decimal(499),
    discountPercent: null,
    productUrl: "https://www.amazon.in/dp/B012345678?tag=test",
    imageUrl: null,
    store: "Amazon",
    storeKey: "amazon",
    source: "REDDIT",
    region: "INDIA",
    currency: "INR",
    redditPostId: "post",
    redditScore: 0,
    categoryId: "electronics",
    submittedById: null,
    clickCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    commentCount: 0,
    status: "ACTIVE",
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

type AlertWithUser = PriceAlert & {
  user: {
    id: string;
    name: string;
    email: string;
    preferences: { emailNotifications: boolean };
  };
};

function makeAlert(overrides: Partial<PriceAlert> = {}): AlertWithUser {
  return {
    id: "alert",
    userId: "user",
    mode: "KEYWORD",
    keywords: "gaming laptop",
    watchUrl: null,
    watchUrlNormalized: null,
    maxPrice: null,
    categoryId: null,
    region: null,
    isActive: true,
    lastTriggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    user: {
      id: overrides.userId ?? "user",
      name: "Test user",
      email: "user@example.test",
      preferences: { emailNotifications: true },
    },
  };
}

let alerts: ReturnType<typeof makeAlert>[];
const findAlerts = mock(async () => alerts.filter((alert) => alert.isActive));
const notify = mock(async (_args: { data: { userId: string } }) => ({}));
const trigger = mock(async (_args: unknown) => ({ count: 1 }));
const email = mock(async (_args: unknown) => true);
mock.module("../lib/prisma", () => ({
  default: {
    priceAlert: { findMany: findAlerts, updateMany: trigger },
    notification: { create: notify },
  },
}));
mock.module("./notification/email", () => ({
  sendEmail: email,
  generatePriceAlertEmail: () => "test-only email body",
}));
mock.module("../lib/logger", () => ({ default: { info() {}, error() {} } }));
const { matchDealsAgainstAlerts } = await import("./alert-matcher");

beforeEach(() => {
  alerts = [makeAlert()];
  findAlerts.mockClear();
  notify.mockReset().mockResolvedValue({});
  trigger.mockReset().mockResolvedValue({ count: 1 });
  email.mockReset().mockResolvedValue(true);
});

describe("alert matching and notification transitions", () => {
  test("an empty scrape performs no alert query or delivery", async () => {
    expect(await matchDealsAgainstAlerts([])).toBe(0);
    expect(findAlerts).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  test("multiple matching alerts notify once per user/deal within a batch", async () => {
    alerts.push(makeAlert({ id: "second", keywords: "laptop" }));
    const deal = makeDeal();
    expect(await matchDealsAgainstAlerts([deal, deal])).toBe(1);
    expect(findAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(notify).toHaveBeenCalledTimes(1);
    expect(email).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith({
      where: { id: { in: ["alert", "second"] } },
      data: { lastTriggeredAt: expect.any(Date) },
    });
  });

  test("URL mode matches the same product despite tracking parameters", async () => {
    alerts = [
      makeAlert({
        mode: "URL",
        keywords: "not in title",
        watchUrlNormalized: "amazon.in/dp/B012345678",
      }),
    ];
    expect(await matchDealsAgainstAlerts([makeDeal()])).toBe(1);
    expect(
      await matchDealsAgainstAlerts([
        makeDeal({ productUrl: "https://amazon.in/dp/B099999999" }),
      ]),
    ).toBe(0);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  const rejected: {
    name: string;
    alert: Partial<PriceAlert>;
    deal?: Partial<Deal>;
  }[] = [
    { name: "paused", alert: { isActive: false } },
    { name: "missing keyword", alert: { keywords: "gaming desktop" } },
    {
      name: "above price ceiling",
      alert: { maxPrice: new Prisma.Decimal(400) },
    },
    {
      name: "unknown price",
      alert: { maxPrice: new Prisma.Decimal(500) },
      deal: { dealPrice: null },
    },
    { name: "different category", alert: { categoryId: "fashion" } },
    { name: "different region", alert: { region: "CANADA" } },
    {
      name: "missing URL target",
      alert: { mode: "URL", watchUrlNormalized: null },
    },
  ];
  test.each(rejected)(
    "$name does not deliver or advance lastTriggeredAt",
    async ({ alert, deal }) => {
      alerts = [makeAlert(alert)];
      expect(await matchDealsAgainstAlerts([makeDeal(deal)])).toBe(0);
      expect(notify).not.toHaveBeenCalled();
      expect(email).not.toHaveBeenCalled();
      expect(trigger).not.toHaveBeenCalled();
    },
  );

  test("email opt-out still creates the in-app notification and updates the alert", async () => {
    alerts[0]!.user.preferences.emailNotifications = false;
    expect(await matchDealsAgainstAlerts([makeDeal()])).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(email).not.toHaveBeenCalled();
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  test("one user's notification failure does not stop delivery to another", async () => {
    alerts.push(makeAlert({ id: "other-alert", userId: "other-user" }));
    notify.mockImplementation(async ({ data }) => {
      if (data.userId === "user") throw new Error("test database failure");
      return {};
    });
    expect(await matchDealsAgainstAlerts([makeDeal()])).toBe(1);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["other-alert"] } },
      }),
    );
  });

  test("characterization: lastTriggeredAt does not suppress a later matching invocation", async () => {
    alerts[0]!.lastTriggeredAt = new Date();
    const deal = makeDeal();
    await matchDealsAgainstAlerts([deal]);
    await matchDealsAgainstAlerts([deal]);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  test("characterization: email false return does not prevent advancing lastTriggeredAt", async () => {
    email.mockResolvedValue(false);
    expect(await matchDealsAgainstAlerts([makeDeal()])).toBe(1);
    expect(trigger).toHaveBeenCalledTimes(1);
  });
});
