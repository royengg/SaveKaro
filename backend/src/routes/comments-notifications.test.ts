import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";

test("comments notify the correct recipient inside their transaction", async () => {
  let owner: string | null = "owner";
  let parent = { userId: "parent-author", dealId: "deal" };
  let failNotification = false;
  const notifications: Array<{ userId: string; type: string; data: { dealId: string } }> = [];
  let commits = 0;
  const tx = {
    comment: { create: async () => ({ id: "comment", content: "A useful reply", user: { name: "Author" } }) },
    deal: { update: async () => ({}) },
    notification: { create: async ({ data }: { data: (typeof notifications)[number] }) => {
      if (failNotification) throw new Error("notification unavailable");
      notifications.push(data);
    } },
  };
  globalThis.prisma = {
    deal: { findUnique: async () => ({ id: "deal", submittedById: owner }) },
    comment: { findUnique: async () => parent },
    $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
      const result = await work(tx);
      commits++;
      return result;
    },
  } as unknown as PrismaClient;
  const { default: routes } = await import("./comments");
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("userId", "author");
    c.set("user", { id: "author", email: "test@example.test", name: "Author", avatarUrl: null, isAdmin: false });
    await next();
  });
  app.onError(() => new Response("Failed", { status: 500 }));
  app.route("/comments", routes);
  let requestNumber = 0;
  const create = (reply = false) => app.request("/comments/deal/deal", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `fixture-${++requestNumber}` },
    body: JSON.stringify({ content: "A useful reply", ...(reply ? { parentId: "cm123456789012345678901234" } : {}) }),
  });
  assert.equal((await create()).status, 201);
  assert.equal(notifications[0].userId, "owner");
  assert.equal(notifications[0].type, "COMMENT_REPLY");
  assert.equal(notifications[0].data.dealId, "deal");
  assert.equal((await create(true)).status, 201);
  assert.equal(notifications[1].userId, "parent-author");
  owner = "author";
  await create();
  parent = { userId: "author", dealId: "deal" };
  await create(true);
  owner = null;
  await create();
  assert.equal(notifications.length, 2, "no self or ownerless notification");
  parent = { userId: "parent-author", dealId: "another-deal" };
  assert.equal((await create(true)).status, 404);
  assert.equal(commits, 5);
  owner = "owner";
  failNotification = true;
  assert.equal((await create()).status, 500);
  assert.equal(commits, 5, "a failed notification cannot commit a successful comment");
});
