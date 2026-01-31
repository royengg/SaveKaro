import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const notifications = new Hono();

// Get user's notifications
notifications.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const unreadOnly = c.req.query("unread") === "true";
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notificationsList, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return c.json({
    success: true,
    data: notificationsList,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Mark notification as read
notifications.put("/:id/read", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const notification = await prisma.notification.findUnique({ where: { id } });
  
  if (!notification) {
    return c.json({ success: false, error: "Notification not found" }, 404);
  }

  if (notification.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return c.json({ success: true, data: updated });
});

// Mark all notifications as read
notifications.put("/read-all", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return c.json({ success: true, message: "All notifications marked as read" });
});

// Delete a notification
notifications.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const notification = await prisma.notification.findUnique({ where: { id } });
  
  if (!notification) {
    return c.json({ success: false, error: "Notification not found" }, 404);
  }

  if (notification.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await prisma.notification.delete({ where: { id } });

  return c.json({ success: true, message: "Notification deleted" });
});

// Delete all read notifications
notifications.delete("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  await prisma.notification.deleteMany({
    where: { userId, isRead: true },
  });

  return c.json({ success: true, message: "Read notifications deleted" });
});

export default notifications;
