import { Hono } from "hono";
import { Google } from "arctic";
import prisma from "../lib/prisma";
import { generateToken } from "../lib/jwt";
import { authRateLimiter } from "../middleware/rateLimiter";
import logger from "../lib/logger";

const auth = new Hono();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

// Initiate Google OAuth
auth.get("/google", authRateLimiter, async (c) => {
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID();
  
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);

  // In production, store state and codeVerifier in a cookie or session
  // For now, we'll use URL params (simplified for development)
  const redirectUrl = new URL(url);
  
  // Store codeVerifier in a cookie for the callback
  c.header("Set-Cookie", `oauth_code_verifier=${codeVerifier}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`);
  c.header("Set-Cookie", `oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`, { append: true });

  return c.redirect(redirectUrl.toString());
});

// Google OAuth callback
auth.get("/google/callback", authRateLimiter, async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.redirect(`${FRONTEND_URL}/auth/error?message=No authorization code`);
  }

  try {
    // Get code verifier from cookie
    const cookies = c.req.header("Cookie") || "";
    const codeVerifierMatch = cookies.match(/oauth_code_verifier=([^;]+)/);
    const codeVerifier = codeVerifierMatch ? codeVerifierMatch[1] : "";

    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const googleUser = await userInfoResponse.json() as {
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
      // Check if email already exists (user might have signed up differently before)
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: googleUser.id,
            avatarUrl: googleUser.picture,
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
            avatarUrl: googleUser.picture,
            preferences: {
              create: {}, // Create default preferences
            },
          },
        });
      }
    } else {
      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
        },
      });
    }

    // Generate JWT
    const token = generateToken({ userId: user.id, email: user.email });

    // Redirect to frontend with token
    return c.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    logger.error({ error }, "Google OAuth error");
    return c.redirect(`${FRONTEND_URL}/auth/error?message=Authentication failed`);
  }
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

// Logout (invalidate token - for now just return success, client should delete token)
auth.post("/logout", async (c) => {
  // In a more complete implementation, you'd add the token to a blacklist
  return c.json({ success: true, message: "Logged out successfully" });
});

export default auth;
