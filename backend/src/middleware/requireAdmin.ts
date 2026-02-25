import { Context, Next } from "hono";
import prisma from "../lib/prisma";

/**
 * Middleware that requires the user to be an admin.
 * Must be used AFTER requireAuth middleware.
 */
export async function requireAdmin(c: Context, next: Next) {
  const userId = c.get("userId");

  if (!userId) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  return next();
}
