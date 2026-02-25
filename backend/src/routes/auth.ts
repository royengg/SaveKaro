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

// In-memory store for one-time auth codes (short-lived, replaced by Redis if available)
// Each code maps to { userId, email, expiresAt }
const authCodes = new Map<
  string,
  { userId: string; email: string; expiresAt: number }
>();

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes) {
    if (data.expiresAt < now) authCodes.delete(code);
  }
}, 60 * 1000); // Every minute

// Track revoked refresh tokens (in production, use Redis)
let revokedTokens: Set<string> | null = null;
async function getRevokedTokens(): Promise<Set<string>> {
  if (revokedTokens) return revokedTokens;
  // For now, use an in-memory set. In production with USE_QUEUE=true, this should use Redis.
  revokedTokens = new Set();
  return revokedTokens;
}

// Helper to set refresh token cookie
function setRefreshCookie(c: any, token: string) {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  c.header(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Path=/api/auth; Max-Age=${maxAge}; SameSite=Lax${IS_PRODUCTION ? "; Secure" : ""}`,
  );
}

// Helper to clear refresh token cookie
function clearRefreshCookie(c: any) {
  c.header(
    "Set-Cookie",
    `refresh_token=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax${IS_PRODUCTION ? "; Secure" : ""}`,
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
  const cookieFlags = `HttpOnly; Path=/; Max-Age=600; SameSite=Lax${IS_PRODUCTION ? "; Secure" : ""}`;
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
    authCodes.set(authCode, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 60 * 1000, // 1 minute
    });

    // Clear OAuth cookies
    const clearFlags = `HttpOnly; Path=/; Max-Age=0; SameSite=Lax${IS_PRODUCTION ? "; Secure" : ""}`;
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

  const authData = authCodes.get(code);

  if (!authData) {
    return c.json(
      { success: false, error: "Invalid or expired auth code" },
      401,
    );
  }

  // Delete the code (one-time use)
  authCodes.delete(code);

  // Check expiry
  if (authData.expiresAt < Date.now()) {
    return c.json({ success: false, error: "Auth code expired" }, 401);
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
  const revoked = await getRevokedTokens();
  if (revoked.has(refreshToken)) {
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
    // Add to revoked set
    const revoked = await getRevokedTokens();
    revoked.add(refreshToken);
  }

  clearRefreshCookie(c);

  return c.json({ success: true, message: "Logged out successfully" });
});

export default auth;
