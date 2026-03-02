import { Hono } from "hono";
import { Google } from "arctic";
import prisma from "../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from "../lib/jwt";
import { authRateLimiter } from "../middleware/rateLimiter";
import logger from "../lib/logger";
import { getRedisConnection } from "../lib/redis";

const auth = new Hono();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3001/api/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Cookie options
const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "Lax" as const,
  path: "/",
};

const google = new Google(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);

// --- Auth code storage (Redis if available, in-memory fallback) ---
const USE_REDIS = process.env.USE_QUEUE === "true";

// In-memory fallback
const _authCodesMap = new Map<
  string,
  { userId: string; email: string; expiresAt: number }
>();
const _revokedTokensSet = new Set<string>();

// Clean up expired in-memory codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of _authCodesMap) {
    if (data.expiresAt < now) _authCodesMap.delete(code);
  }
}, 60 * 1000);

async function storeAuthCode(
  code: string,
  data: { userId: string; email: string },
): Promise<void> {
  if (USE_REDIS) {
    try {
      const redis = getRedisConnection();
      await redis.set(
        `authcode:${code}`,
        JSON.stringify(data),
        "EX",
        60, // 1 minute TTL
      );
      return;
    } catch (err) {
      logger.warn({ err }, "Redis auth code store failed, using in-memory");
    }
  }
  _authCodesMap.set(code, { ...data, expiresAt: Date.now() + 60 * 1000 });
}

async function consumeAuthCode(
  code: string,
): Promise<{ userId: string; email: string } | null> {
  if (USE_REDIS) {
    try {
      const redis = getRedisConnection();
      const raw = await redis.get(`authcode:${code}`);
      if (!raw) return null;
      await redis.del(`authcode:${code}`); // one-time use
      return JSON.parse(raw);
    } catch (err) {
      logger.warn({ err }, "Redis auth code consume failed, trying in-memory");
    }
  }
  const data = _authCodesMap.get(code);
  if (!data) return null;
  _authCodesMap.delete(code);
  if (data.expiresAt < Date.now()) return null;
  return { userId: data.userId, email: data.email };
}

async function revokeRefreshToken(token: string): Promise<void> {
  if (USE_REDIS) {
    try {
      const redis = getRedisConnection();
      await redis.set(
        `revoked:${token}`,
        "1",
        "EX",
        7 * 24 * 60 * 60, // 7 days — matches refresh token lifetime
      );
      return;
    } catch (err) {
      logger.warn({ err }, "Redis revoke failed, using in-memory");
    }
  }
  _revokedTokensSet.add(token);
}

async function isTokenRevoked(token: string): Promise<boolean> {
  if (USE_REDIS) {
    try {
      const redis = getRedisConnection();
      const result = await redis.get(`revoked:${token}`);
      return result !== null;
    } catch (err) {
      logger.warn({ err }, "Redis revoke check failed, checking in-memory");
    }
  }
  return _revokedTokensSet.has(token);
}

// Helper to set refresh token cookie
function setRefreshCookie(c: any, token: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const domainPart = IS_PRODUCTION ? "; Domain=.savekaro.site" : "";
  const securePart = IS_PRODUCTION
    ? "; Secure; SameSite=None"
    : "; SameSite=Lax";
  c.header(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Path=/api/auth; Max-Age=${maxAge}${domainPart}${securePart}`,
  );
}

// Helper to clear refresh token cookie
function clearRefreshCookie(c: any) {
  const domainPart = IS_PRODUCTION ? "; Domain=.savekaro.site" : "";
  const securePart = IS_PRODUCTION
    ? "; Secure; SameSite=None"
    : "; SameSite=Lax";
  c.header(
    "Set-Cookie",
    `refresh_token=; HttpOnly; Path=/api/auth; Max-Age=0${domainPart}${securePart}`,
  );
}

// Helper to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [key, ...rest] = cookie.trim().split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  });
  return cookies;
}

// --- Routes ---

// Initiate Google OAuth
auth.get("/google", authRateLimiter, async (c) => {
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  const redirectUrl = new URL(url);

  // Store state and codeVerifier in cookies
  const cookieFlags = `HttpOnly; Path=/; Max-Age=600${IS_PRODUCTION ? "; Secure; SameSite=None; Domain=.savekaro.site" : "; SameSite=Lax"}`;
  c.header("Set-Cookie", `oauth_code_verifier=${codeVerifier}; ${cookieFlags}`);
  c.header("Set-Cookie", `oauth_state=${state}; ${cookieFlags}`, {
    append: true,
  });

  return c.redirect(redirectUrl.toString());
});

// Google OAuth callback
auth.get("/google/callback", authRateLimiter, async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.redirect(
      `${FRONTEND_URL}/auth/error?message=No authorization code`,
    );
  }

  try {
    // Parse cookies
    const cookies = parseCookies(c.req.header("Cookie") || "");
    const codeVerifier = cookies["oauth_code_verifier"] || "";
    const storedState = cookies["oauth_state"] || "";

    // Validate OAuth state to prevent CSRF
    if (!state || !storedState || state !== storedState) {
      logger.warn(
        { state, storedState },
        "OAuth state mismatch — possible CSRF",
      );
      return c.redirect(
        `${FRONTEND_URL}/auth/error?message=Invalid OAuth state. Please try again.`,
      );
    }

    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const googleUser = (await userInfoResponse.json()) as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.id },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: googleUser.id,
            avatarUrl: googleUser.picture,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
            avatarUrl: googleUser.picture,
            preferences: {
              create: {},
            },
          },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
        },
      });
    }

    // Generate a short-lived one-time auth code instead of putting JWT in URL
    const authCode = crypto.randomUUID();
    await storeAuthCode(authCode, {
      userId: user.id,
      email: user.email,
    });

    // Clear OAuth cookies
    const clearFlags = `HttpOnly; Path=/; Max-Age=0${IS_PRODUCTION ? "; Secure; SameSite=None; Domain=.savekaro.site" : "; SameSite=Lax"}`;
    c.header("Set-Cookie", `oauth_code_verifier=; ${clearFlags}`);
    c.header("Set-Cookie", `oauth_state=; ${clearFlags}`, { append: true });

    // Redirect with one-time code (NOT the JWT)
    return c.redirect(`${FRONTEND_URL}/auth/callback?code=${authCode}`);
  } catch (error) {
    logger.error({ error }, "Google OAuth error");
    return c.redirect(
      `${FRONTEND_URL}/auth/error?message=Authentication failed`,
    );
  }
});

// Exchange one-time auth code for access + refresh tokens
auth.post("/token", authRateLimiter, async (c) => {
  const body = await c.req.json<{ code: string }>().catch(() => ({ code: "" }));
  const { code } = body;

  if (!code) {
    return c.json({ success: false, error: "No auth code provided" }, 400);
  }

  const authData = await consumeAuthCode(code);

  if (!authData) {
    return c.json(
      { success: false, error: "Invalid or expired auth code" },
      401,
    );
  }

  // Generate tokens
  const accessTokenJwt = generateAccessToken({
    userId: authData.userId,
    email: authData.email,
  });
  const refreshTokenJwt = generateRefreshToken({
    userId: authData.userId,
    email: authData.email,
  });

  // Set refresh token as httpOnly cookie
  setRefreshCookie(c, refreshTokenJwt);

  return c.json({
    success: true,
    data: {
      accessToken: accessTokenJwt,
      expiresIn: 900, // 15 minutes in seconds
    },
  });
});

// Refresh access token using refresh token cookie
auth.post("/refresh", async (c) => {
  const cookies = parseCookies(c.req.header("Cookie") || "");
  const refreshToken = cookies["refresh_token"];

  if (!refreshToken) {
    return c.json({ success: false, error: "No refresh token" }, 401);
  }

  // Check if token is revoked
  if (await isTokenRevoked(refreshToken)) {
    clearRefreshCookie(c);
    return c.json({ success: false, error: "Token revoked" }, 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    clearRefreshCookie(c);
    return c.json(
      { success: false, error: "Invalid or expired refresh token" },
      401,
    );
  }

  // Verify user still exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    clearRefreshCookie(c);
    return c.json({ success: false, error: "User not found" }, 401);
  }

  // Generate new access token
  const accessTokenJwt = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  return c.json({
    success: true,
    data: {
      accessToken: accessTokenJwt,
      expiresIn: 900,
    },
  });
});

// Get current user
auth.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "No token provided" }, 401);
  }

  const user = c.get("user");

  if (!user) {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  // Get full user with preferences
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      preferences: true,
      _count: {
        select: {
          savedDeals: true,
          submittedDeals: true,
          comments: true,
        },
      },
    },
  });

  return c.json({ success: true, data: fullUser });
});

// Logout — revoke refresh token and clear cookie
auth.post("/logout", async (c) => {
  const cookies = parseCookies(c.req.header("Cookie") || "");
  const refreshToken = cookies["refresh_token"];

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  clearRefreshCookie(c);

  return c.json({ success: true, message: "Logged out successfully" });
});

export default auth;
