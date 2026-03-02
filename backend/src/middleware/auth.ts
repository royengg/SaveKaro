import { Context, Next } from "hono";
import { verifyAccessToken, TokenPayload } from "../lib/jwt";
import prisma from "../lib/prisma";

// Extend Hono's context to include user
declare module "hono" {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      isAdmin: boolean;
    } | null;
    userId: string | null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    c.set("user", null);
    c.set("userId", null);
    return next();
  }

  const token = authHeader.substring(7);
  const payload = verifyAccessToken(token);

  if (!payload) {
    c.set("user", null);
    c.set("userId", null);
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isAdmin: true,
      },
    });

    c.set("user", user);
    c.set("userId", user?.id || null);
  } catch {
    c.set("user", null);
    c.set("userId", null);
  }

  return next();
}

// Middleware that requires authentication
export async function requireAuth(c: Context, next: Next) {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401,
    );
  }

  return next();
}
