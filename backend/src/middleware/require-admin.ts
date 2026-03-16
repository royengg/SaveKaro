import { Context, Next } from "hono";

export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  if (!user.isAdmin) {
    return c.json({ success: false, error: "Admin access required" }, 403);
  }

  return next();
}
