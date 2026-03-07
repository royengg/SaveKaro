import { Context, Next } from "hono";
import { verifyAccessToken, TokenPayload } from "../lib/jwt";
import prisma from "../lib/prisma";
import { AUTH_CACHE } from "../config/constants";

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

type AuthUser = NonNullable<Context["var"]["user"]>;

interface CachedAuthUser {
  user: AuthUser | null;
  validatedAt: number;
}

const AUTH_REVALIDATION_MS = Math.max(
  30_000,
  parseInt(
    process.env.AUTH_REVALIDATION_MS || `${AUTH_CACHE.USER_REVALIDATION_MS}`,
    10,
  ) || AUTH_CACHE.USER_REVALIDATION_MS,
);

const AUTH_CACHE_MAX_USERS = Math.max(
  500,
  parseInt(
    process.env.AUTH_CACHE_MAX_USERS || `${AUTH_CACHE.MAX_USERS}`,
    10,
  ) || AUTH_CACHE.MAX_USERS,
);

const authUserCache = new Map<string, CachedAuthUser>();
const authRevalidationInFlight = new Map<string, Promise<AuthUser | null>>();

function setAuthContext(c: Context, user: AuthUser | null) {
  c.set("user", user);
  c.set("userId", user?.id || null);
}

function setCachedAuthUser(userId: string, user: AuthUser | null) {
  // Prevent unbounded growth while preserving recency.
  if (!authUserCache.has(userId) && authUserCache.size >= AUTH_CACHE_MAX_USERS) {
    const oldestKey = authUserCache.keys().next().value as string | undefined;
    if (oldestKey) {
      authUserCache.delete(oldestKey);
    }
  }
  authUserCache.set(userId, { user, validatedAt: Date.now() });
}

function getTokenUser(payload: TokenPayload): AuthUser | null {
  if (typeof payload.isAdmin !== "boolean") {
    return null;
  }

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    isAdmin: payload.isAdmin,
  };
}

async function fetchUserFromDb(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      isAdmin: true,
    },
  });

  return user ?? null;
}

function revalidateUser(userId: string): Promise<AuthUser | null> {
  const existing = authRevalidationInFlight.get(userId);
  if (existing) {
    return existing;
  }

  const promise = fetchUserFromDb(userId)
    .then((user) => {
      setCachedAuthUser(userId, user);
      return user;
    })
    .catch(() => {
      return null;
    })
    .finally(() => {
      authRevalidationInFlight.delete(userId);
    });

  authRevalidationInFlight.set(userId, promise);
  return promise;
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

  const cacheEntry = authUserCache.get(payload.userId);
  const now = Date.now();
  const isCacheFresh =
    cacheEntry !== undefined &&
    now - cacheEntry.validatedAt < AUTH_REVALIDATION_MS;

  if (isCacheFresh) {
    setAuthContext(c, cacheEntry.user);
    return next();
  }

  const tokenUser = getTokenUser(payload);

  // Legacy tokens without full user claims still require a synchronous DB check.
  if (!tokenUser) {
    const dbUser = await revalidateUser(payload.userId);
    setAuthContext(c, dbUser);
    return next();
  }

  // Cold cache: validate once synchronously, then reuse cached user for subsequent requests.
  if (!cacheEntry) {
    try {
      const dbUser = await fetchUserFromDb(payload.userId);
      setCachedAuthUser(payload.userId, dbUser);
      setAuthContext(c, dbUser);
    } catch {
      // DB transient failure fallback: use signed token claims for this request.
      setAuthContext(c, tokenUser);
    }
    return next();
  }

  // Stale cache: use cached user immediately for low latency and refresh in background.
  setAuthContext(c, cacheEntry.user);

  void revalidateUser(payload.userId);

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
